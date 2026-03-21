import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

        // 1. Auth Check
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } },
        });

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

        // 2. Parse Body
        let body;
        try {
            body = await req.json();
        } catch {
            return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders });
        }

        const { paymentId } = body;
        if (!paymentId) {
            return new Response(JSON.stringify({ error: "paymentId is required" }), { status: 400, headers: corsHeaders });
        }

        // 3. Fetch Payment & Verify Ownership
        // We need to join with bookings to check guest_id
        const { data: payment, error } = await supabase
            .from("payments")
            .select("*, bookings!inner(guest_id)")
            .eq("id", paymentId)
            .eq("bookings.guest_id", user.id)
            .single();

        if (error || !payment) {
            // Could be not found or not owned by user
            return new Response(JSON.stringify({ error: "Payment not found" }), { status: 404, headers: corsHeaders });
        }

        return new Response(JSON.stringify({
            status: payment.status,
            payment: payment
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (err: any) {
        console.error("Function error:", err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
});
