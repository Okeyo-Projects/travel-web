import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";
import { sha256Hex } from "../_shared/utils-crypto.ts";

serve(async (req) => {
    // CORS
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        // Payzone Service Config
        const PAYZONE_MERCHANT_ACCOUNT = Deno.env.get("PAYZONE_MERCHANT_ACCOUNT");
        const PAYZONE_PAYWALL_URL = Deno.env.get("PAYZONE_PAYWALL_URL");
        const PAYZONE_SECRET_KEY = Deno.env.get("PAYZONE_SECRET_KEY");
        const PAYZONE_CALLBACK_URL = Deno.env.get("PAYZONE_CALLBACK_URL");

        if (!PAYZONE_MERCHANT_ACCOUNT || !PAYZONE_PAYWALL_URL || !PAYZONE_SECRET_KEY || !PAYZONE_CALLBACK_URL) {
            throw new Error("Missing Payzone configuration");
        }

        // 1. Auth Check
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            console.error("Missing Authorization header");
            return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } },
        });

        // Debug log
        console.log("Validating user with token...");

        // Extract token (remove "Bearer " if present)
        const token = authHeader.replace(/^Bearer\s+/i, "");

        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError || !user) {
            console.error("Auth error:", userError);
            return new Response(JSON.stringify({ error: "Invalid User Token", details: userError }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        console.log("User validated:", user.id);

        // 2. Parse Body
        let body;
        try {
            body = await req.json();
        } catch {
            return new Response(JSON.stringify({ error: "Invalid JSON" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const { bookingId } = body;
        if (!bookingId) {
            return new Response(JSON.stringify({ error: "bookingId is required" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // 3. Fetch Booking & Validate Ownership
        // We use service key to fetch booking details including price, but verify user_id matched guest_id
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        const { data: booking, error: bookingError } = await supabaseAdmin
            .from("bookings")
            .select("*")
            .eq("id", bookingId)
            .single();

        if (bookingError || !booking) {
            console.error("Booking fetch error:", bookingError);
            return new Response(JSON.stringify({ error: "Booking not found" }), {
                status: 404,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        if (booking.guest_id !== user.id) {
            console.error("Ownership mismatch:", booking.guest_id, user.id);
            return new Response(JSON.stringify({ error: "Unauthorized access to booking" }), {
                status: 403,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // 4. Create/Update Payment Record
        // Check if a pending payment exists
        const { data: existingPayments } = await supabaseAdmin
            .from("payments")
            .select("*")
            .eq("booking_id", bookingId)
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(1);

        let paymentId;
        const amount = booking.price_total_cents / 100; // Convert cents to base unit
        const currency = booking.currency || "MAD";
        const description = `Booking ${bookingId}`; // Should probably be nicer, e.g. "Stay at Riad..."

        if (existingPayments && existingPayments.length > 0) {
            // Reuse existing pending payment? Or create new?
            // Usually reusing is fine if parameters haven't changed.
            // But creating new is safer for audit trail if multiple attempts.
            // Let's create new to be safe and avoid stale state issues.
            // logic: insert new
        }

        const { data: payment, error: paymentError } = await supabaseAdmin
            .from("payments")
            .insert({
                booking_id: bookingId,
                provider: "payzone",
                amount_cents: booking.price_total_cents,
                currency: currency,
                status: "pending",
                metadata: {
                    user_id: user.id, // helpful for debugging
                    initiated_at: new Date().toISOString()
                }
            })
            .select()
            .single();

        if (paymentError || !payment) {
            console.error("Payment creation error", paymentError);
            return new Response(JSON.stringify({ error: "Failed to initialize payment" }), { status: 500, headers: corsHeaders });
        }
        paymentId = payment.id;

        // 5. Construct Payzone Payload
        const timestamp = Math.floor(Date.now() / 1000);

        // Payzone Payload
        const payload = {
            merchantAccount: PAYZONE_MERCHANT_ACCOUNT,
            timestamp, // numeric timestamp

            customerId: user.id.substring(0, 50), // Payzone might have length limits
            customerCountry: "MA", // Defaulting to MA as per user guide context, could be from profile
            // customerLocale: "fr_FR", 

            paymentId: paymentId, // Using paymentId as chargeId
            orderId: paymentId,
            price: String(amount), // Send as string to match example
            currency: currency,
            description: description,

            mode: "DEEP_LINK",
            paymentMethod: "CREDIT_CARD",
            showPaymentProfiles: "false", // Sent as string in example
            skin: "vps-1-vue", // From example

            callbackUrl: PAYZONE_CALLBACK_URL,
            // Success/Fail URLs for redirect (optional if handling via deep link/webview state)
            // But Payzone might require them. User guide had them.
            successUrl: `https://okeyo.app/payzone/return?status=success&paymentId=${paymentId}`,
            failureUrl: `https://okeyo.app/payzone/return?status=failure&paymentId=${paymentId}`,
            cancelUrl: `https://okeyo.app/payzone/return?status=cancel&paymentId=${paymentId}`,
        };

        const jsonPayload = JSON.stringify(payload);

        // 6. Sign Payload
        const signature = await sha256Hex(PAYZONE_SECRET_KEY + jsonPayload);

        return new Response(JSON.stringify({
            paymentId: paymentId,
            paywallUrl: PAYZONE_PAYWALL_URL,
            payload: jsonPayload,
            signature: signature
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (err: any) {
        console.error("Function error:", err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
});
