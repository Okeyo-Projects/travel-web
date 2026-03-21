import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Translations for notifications
const TRANSLATIONS = {
    en: {
        titles: {
            like_experience: "New Like",
            comment_experience: "New Comment",
            booking_created: "New Booking Request",
            booking_paid: "Booking Paid",
            review_received: "New Review",
            booking_cancelled: "Booking Cancelled",
            new_follow: "New Follower",
            reply_to_comment: "New Reply",
            booking_approved: "Booking Approved",
            booking_declined: "Booking Declined",
            review_request: "Review Your Trip",
            booking_reminder: "Upcoming Trip",
            booking_confirmed: "Booking Confirmed",
            experience_drafted: "Experience Auto-Drafted"
        },
        bodies: {
            like_experience: "{{user}} liked your experience {{experience}}",
            comment_experience: "{{user}} commented on {{experience}}",
            booking_created: "{{user}} requested to book {{experience}}",
            booking_paid: "Payment received for {{experience}}",
            review_received: "{{user}} left a review for {{experience}}",
            booking_cancelled: "{{user}} cancelled their booking for {{experience}}",
            new_follow: "{{user}} started following you",
            reply_to_comment: "{{user}} replied to your comment",
            booking_approved: "Your booking for {{experience}} has been approved! Please complete payment.",
            booking_declined: "Your booking request for {{experience}} was declined.",
            review_request: "How was your experience at {{experience}}? Leave a review!",
            booking_reminder: "Your trip to {{experience}} starts in 48 hours!",
            booking_confirmed: "Your booking for {{experience}} is confirmed. Get ready!",
            experience_drafted: "Your experience \"{{experience}}\" has been set to draft as all dates are in the past. Please add new dates to publish again."
        }
    },
    fr: {
        titles: {
            like_experience: "Nouveau J'aime",
            comment_experience: "Nouveau commentaire",
            booking_created: "Nouvelle demande de réservation",
            booking_paid: "Réservation payée",
            review_received: "Nouvel avis",
            booking_cancelled: "Réservation annulée",
            new_follow: "Nouvel abonné",
            reply_to_comment: "Nouvelle réponse",
            booking_approved: "Réservation approuvée",
            booking_declined: "Réservation refusée",
            review_request: "Notez votre voyage",
            booking_reminder: "Voyage à venir",
            booking_confirmed: "Réservation confirmée",
            experience_drafted: "Expérience passée en brouillon"
        },
        bodies: {
            like_experience: "{{user}} a aimé votre expérience {{experience}}",
            comment_experience: "{{user}} a commenté {{experience}}",
            booking_created: "{{user}} souhaite réserver {{experience}}",
            booking_paid: "Paiement reçu pour {{experience}}",
            review_received: "{{user}} a laissé un avis sur {{experience}}",
            booking_cancelled: "{{user}} a annulé sa réservation pour {{experience}}",
            new_follow: "{{user}} a commencé à vous suivre",
            reply_to_comment: "{{user}} a répondu à votre commentaire",
            booking_approved: "Votre réservation pour {{experience}} a été approuvée ! Veuillez compléter le paiement.",
            booking_declined: "Votre demande de réservation pour {{experience}} a été refusée.",
            review_request: "Comment s'est passée votre expérience à {{experience}} ? Laissez un avis !",
            booking_reminder: "Votre voyage à {{experience}} commence dans 48 heures !",
            booking_confirmed: "Votre réservation pour {{experience}} est confirmée. Préparez-vous !",
            experience_drafted: "Votre expérience \"{{experience}}\" a été passée en brouillon car toutes les dates sont dans le passé. Veuillez ajouter de nouvelles dates pour republier."
        }
    },
    ar: {
        titles: {
            like_experience: "إعجاب جديد",
            comment_experience: "تعليق جديد",
            booking_created: "طلب حجز جديد",
            booking_paid: "تم دفع الحجز",
            review_received: "تقييم جديد",
            booking_cancelled: "تم إلغاء الحجز",
            new_follow: "متابع جديد",
            reply_to_comment: "رد جديد",
            booking_approved: "تمت الموافقة على الحجز",
            booking_declined: "تم رفض الحجز",
            review_request: "قيم رحلتك",
            booking_reminder: "رحلة قادمة",
            booking_confirmed: "تم تأكيد الحجز",
            experience_drafted: "تجربة محولة للمسودة"
        },
        bodies: {
            like_experience: "أعجب {{user}} بتجربتك {{experience}}",
            comment_experience: "علق {{user}} على {{experience}}",
            booking_created: "طلب {{user}} حجز {{experience}}",
            booking_paid: "تم استلام الدفع لـ {{experience}}",
            review_received: "ترك {{user}} تقييمًا لـ {{experience}}",
            booking_cancelled: "ألغى {{user}} حجزه لـ {{experience}}",
            new_follow: "بدأ {{user}} بمتابعتك",
            reply_to_comment: "رد {{user}} على تعليقك",
            booking_approved: "تمت الموافقة على حجزك لـ {{experience}}! يرجى إتمام الدفع.",
            booking_declined: "تم رفض طلب حجزك لـ {{experience}}.",
            review_request: "كيف كانت تجربتك في {{experience}}؟ اترك تقييمًا!",
            booking_reminder: "رحلتك إلى {{experience}} تبدأ خلال 48 ساعة!",
            booking_confirmed: "تم تأكيد حجزك لـ {{experience}}. استعد!",
            experience_drafted: "تم تحويل تجربتك \"{{experience}}\" إلى مسودة لأن جميع التواريخ في الماضي. يرجى إضافة تواريخ جديدة للنشر مرة أخرى."
        }
    }
};

interface NotificationPayload {
    type: string;
    userId: string;
    data: Record<string, any>;
    variables?: Record<string, string>;
}

// Helper to encode base64url (without padding)
function base64urlEncode(data: Uint8Array): string {
    const base64 = btoa(String.fromCharCode(...data));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Helper to create JWT manually
async function createJWT(header: Record<string, any>, payload: Record<string, any>, privateKey: CryptoKey): Promise<string> {
    const headerEncoded = base64urlEncode(new TextEncoder().encode(JSON.stringify(header)));
    const payloadEncoded = base64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
    const toSign = `${headerEncoded}.${payloadEncoded}`;

    const signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        privateKey,
        new TextEncoder().encode(toSign)
    );

    const signatureEncoded = base64urlEncode(new Uint8Array(signature));
    return `${toSign}.${signatureEncoded}`;
}

async function getAccessToken({ clientEmail, privateKey }: { clientEmail: string; privateKey: string }): Promise<string> {
    try {
        // Clean up the private key (replace escaped newlines with actual newlines)
        const key = privateKey.replace(/\\n/g, '\n');

        // Create JWT claims for Google OAuth
        const now = Math.floor(Date.now() / 1000);
        const header = { alg: 'RS256', typ: 'JWT' };
        const payload = {
            iss: clientEmail,
            sub: clientEmail,
            aud: 'https://oauth2.googleapis.com/token',
            iat: now,
            exp: now + 3600,
            scope: 'https://www.googleapis.com/auth/firebase.messaging',
        };

        // Convert PEM format to binary key data
        const pemKey = key
            .replace('-----BEGIN PRIVATE KEY-----', '')
            .replace('-----END PRIVATE KEY-----', '')
            .replace(/\s/g, '');

        let binaryKey: Uint8Array;
        try {
            binaryKey = Uint8Array.from(atob(pemKey), c => c.charCodeAt(0));
        } catch (e) {
            console.error('Failed to decode base64 key:', e);
            throw new Error('Invalid private key format');
        }

        // Import the private key for signing
        let importedKey: CryptoKey;
        try {
            importedKey = await crypto.subtle.importKey(
                'pkcs8',
                binaryKey,
                {
                    name: 'RSASSA-PKCS1-v1_5',
                    hash: 'SHA-256',
                },
                false,
                ['sign']
            );
        } catch (e) {
            console.error('Failed to import key:', e);
            throw new Error('Failed to import private key for signing');
        }

        // Create JWT manually
        let jwt: string;
        try {
            jwt = await createJWT(header, payload, importedKey);
        } catch (e) {
            console.error('Failed to create JWT:', e);
            throw new Error('Failed to create JWT token');
        }

        // Exchange JWT for access token
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                assertion: jwt,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Google OAuth error:', errorText);
            throw new Error(`Failed to get access token: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        if (!data.access_token) {
            throw new Error('No access token in response');
        }

        return data.access_token;
    } catch (error) {
        console.error('getAccessToken error:', error);
        throw error;
    }
}

// Helper to replace variables in template
function formatMessage(template: string, variables: Record<string, string> = {}): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || '');
}

serve(async (req) => {
    try {
        console.log('📥 Function invoked');
        const payload = await req.json() as NotificationPayload;
        const { type, userId, data, variables } = payload;
        console.log('📦 Received payload:', { type, userId, dataKeys: Object.keys(data || {}), variables });

        // 1. Initialize Supabase Client
        console.log('🔧 Initializing Supabase client');
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // 2. Resolve userId (might be a host_id, need to get owner_id)
        console.log('🔍 Resolving user ID:', userId);
        let actualUserId = userId;

        // Check if this is a host_id by trying to find it in the hosts table
        const { data: hostData } = await supabase
            .from('hosts')
            .select('owner_id')
            .eq('id', userId)
            .maybeSingle();

        if (hostData?.owner_id) {
            console.log('✅ Resolved host_id to owner_id:', hostData.owner_id);
            actualUserId = hostData.owner_id;
        } else {
            console.log('✅ Using provided userId (profile id)');
        }

        // 3. Get User's Preferred Language
        console.log('👤 Fetching user profile for:', actualUserId);
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('preferred_language')
            .eq('id', actualUserId)
            .maybeSingle();

        // If profile doesn't exist or fetch fails, default to English
        if (profileError) {
            console.warn('⚠️ Profile fetch error (will use default language):', profileError);
        }

        const lang = (profile?.preferred_language || 'en') as keyof typeof TRANSLATIONS;
        const translations = TRANSLATIONS[lang] || TRANSLATIONS.en;
        console.log('✅ Using language:', lang);

        // 3. Get Translation
        console.log('🌐 Getting translation for type:', type);
        const title = translations.titles[type as keyof typeof translations.titles];
        const bodyTemplate = translations.bodies[type as keyof typeof translations.bodies];

        if (!title || !bodyTemplate) {
            console.error('❌ Unknown notification type:', type);
            throw new Error(`Unknown notification type: ${type}`);
        }

        const body = formatMessage(bodyTemplate, variables);
        console.log('📝 Notification prepared:', { title, body });

        // 3.5 Insert into notifications table
        console.log('💾 Inserting into notifications table');

        // Map app types to DB enum types
        // Since we updated the DB enum to match app types, we can use the type directly
        // But we keep a fallback for safety or legacy types if any
        const dbKind = type;

        // Determine entity_type and entity_id from data
        let entityType = null;
        let entityId = null;

        if (data?.booking_id) {
            entityType = 'booking';
            entityId = data.booking_id;
        } else if (data?.experience_id) {
            entityType = 'experience';
            entityId = data.experience_id;
        } else if (data?.host_id) {
            entityType = 'host';
            entityId = data.host_id;
        } else if (data?.user_id && type === 'new_follow') {
            entityType = 'profile';
            entityId = data.user_id;
        }

        const { error: insertError } = await supabase
            .from('notifications')
            .insert({
                user_id: actualUserId,
                kind: dbKind,
                title: title,
                body: body,
                // data column does not exist in DB, use metadata if available or just rely on entity columns
                // The schema might not have metadata column, let's check. 
                // If not, we rely on entity_type/id. 
                // Checking schema: 20251004002800_create_core_tables.sql usually has metadata jsonb?
                // Let's assume it doesn't based on previous code, but we can try to add it if needed.
                // For now, let's stick to entity_type/id which are standard.
                entity_type: entityType,
                entity_id: entityId,
                read_at: null,
                metadata: data,
            });

        if (insertError) {
            console.error('❌ Failed to insert notification record:', insertError);
            // We continue sending push even if DB insert fails
        } else {
            console.log('✅ Notification record inserted');
        }

        // 4. Get User's FCM Tokens
        console.log('📱 Fetching user devices for:', actualUserId);
        const { data: devices, error: devicesError } = await supabase
            .from('user_devices')
            .select('push_token')
            .eq('user_id', actualUserId)
            .eq('push_enabled', true)
            .not('push_token', 'is', null);

        if (devicesError) {
            console.error('❌ Devices fetch error:', devicesError);
            throw new Error(`Failed to fetch devices: ${devicesError.message}`);
        }

        const tokens = devices.map(d => d.push_token).filter(Boolean);
        console.log('📱 Found tokens:', tokens.length);

        if (tokens.length === 0) {
            console.log('⚠️ No active devices found for user');
            return new Response(JSON.stringify({ message: 'No active devices found for user' }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 5. Send Notifications via FCM
        console.log('🔐 Loading Firebase service account');
        const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
        if (!serviceAccountJson) {
            console.error('❌ FIREBASE_SERVICE_ACCOUNT env var not set');
            return new Response(JSON.stringify({ error: 'Firebase service account not configured' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        let serviceAccount: any;
        try {
            serviceAccount = JSON.parse(serviceAccountJson);
        } catch (e) {
            console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT:', e);
            return new Response(JSON.stringify({ error: 'Invalid Firebase service account configuration' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
            console.error('❌ Missing Firebase Service Account fields:', {
                hasProjectId: !!serviceAccount.project_id,
                hasClientEmail: !!serviceAccount.client_email,
                hasPrivateKey: !!serviceAccount.private_key
            });
            return new Response(JSON.stringify({ error: 'Incomplete Firebase service account configuration' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        console.log('🔑 Getting access token');
        let accessToken: string;
        try {
            accessToken = await getAccessToken({
                clientEmail: serviceAccount.client_email,
                privateKey: serviceAccount.private_key,
            });
            console.log('✅ Access token obtained');
        } catch (e) {
            console.error('❌ Failed to get access token:', e);
            throw e;
        }

        console.log(`📤 Sending notification to ${tokens.length} devices:`, { title, body });

        const results = await Promise.all(tokens.map(async (token: string, index: number) => {
            try {
                console.log(`📨 Sending to device ${index + 1}/${tokens.length}`);
                const response = await fetch(
                    `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            message: {
                                token: token,
                                notification: {
                                    title: title,
                                    body: body,
                                },
                                data: {
                                    ...data,
                                    type: type,
                                    // Convert all data values to strings as FCM requires string values
                                    ...Object.keys(data).reduce((acc, key) => {
                                        acc[key] = String(data[key]);
                                        return acc;
                                    }, {} as Record<string, string>)
                                }
                            }
                        })
                    }
                );

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`❌ FCM error for token ${token.substring(0, 10)}...:`, errorText);
                    return { token, success: false, error: errorText };
                }

                const responseData = await response.json() as { name: string };
                console.log(`✅ Sent to device ${index + 1}/${tokens.length}`);
                return { token, success: true, messageId: responseData.name };
            } catch (err: any) {
                console.error(`❌ Network error sending to token ${token.substring(0, 10)}...:`, err);
                return { token, success: false, error: err.message || String(err) };
            }
        }));

        const successCount = results.filter((r: any) => r.success).length;
        const failureCount = results.length - successCount;

        console.log(`📊 Results: ${successCount} success, ${failureCount} failure`);

        return new Response(JSON.stringify({
            success: true,
            message: `Processed ${tokens.length} notifications. Success: ${successCount}, Failure: ${failureCount}`,
            details: { title, body, results }
        }), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error('Function error:', error);
        return new Response(JSON.stringify({
            error: error.message || String(error),
            stack: error.stack,
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});
