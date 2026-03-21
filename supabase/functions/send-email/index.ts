import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@4.0.0';
import { corsHeaders } from '../_shared/cors.ts';
import { getEmailSubject, getResendTemplateId } from './templates.ts';
import { renderEmailHtml } from './templates-html.ts';
import type {
  SendEmailRequest,
  SendEmailResponse,
  EmailTemplate,
} from './types.ts';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse and validate request
    const body: SendEmailRequest = await req.json();
    const { template, to, data, entity_type, entity_id, user_id } = body;

    // Validate required fields
    if (!template || !to || !data) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: template, to, or data',
        } as SendEmailResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Resend client
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY environment variable not set');
    }
    const resend = new Resend(resendApiKey);

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables not set');
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's preferred language if user_id is provided
    let userLanguage: 'en' | 'fr' | 'ar' = 'en';
    if (user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferred_language')
        .eq('id', user_id)
        .maybeSingle();
      
      if (profile?.preferred_language && ['en', 'fr', 'ar'].includes(profile.preferred_language)) {
        userLanguage = profile.preferred_language as 'en' | 'fr' | 'ar';
      }
    }

    // Get email configuration
    const fromAddress = Deno.env.get('EMAIL_FROM_ADDRESS') || 'no-reply@okeyo.com';
    const fromName = Deno.env.get('EMAIL_FROM_NAME') || 'Okeyo Experience';
    const subject = getEmailSubject(template as EmailTemplate, data, userLanguage);

    // Check if using Resend templates or custom HTML
    const useResendTemplates = Deno.env.get('USE_RESEND_TEMPLATES') === 'true';

    let emailResult;

    if (useResendTemplates) {
      // Send using Resend dashboard templates
      const templateId = getResendTemplateId(template as EmailTemplate);

      emailResult = await resend.emails.send({
        from: `${fromName} <${fromAddress}>`,
        to,
        subject,
        // @ts-ignore - Resend types may not include template fields yet
        template: templateId,
        template_data: data,
        tags: [
          { name: 'template', value: template },
          { name: 'entity_type', value: entity_type || 'none' },
        ],
      });
    } else {
      // Render inline HTML template (fallback when not using Resend hosted templates)
      const html = renderEmailHtml(template as EmailTemplate, data);

      emailResult = await resend.emails.send({
        from: `${fromName} <${fromAddress}>`,
        to,
        subject,
        html,
        tags: [
          { name: 'template', value: template },
          { name: 'entity_type', value: entity_type || 'none' },
        ],
      });
    }

    // Check for errors
    if (emailResult.error) {
      throw new Error(`Resend API error: ${emailResult.error.message}`);
    }

    // Log to database
    const { error: logError } = await supabase.from('email_logs').insert({
      template_id: template,
      recipient_email: to,
      recipient_user_id: user_id || null,
      resend_email_id: emailResult.data?.id || null,
      subject,
      template_data: data,
      entity_type: entity_type || null,
      entity_id: entity_id || null,
      sent_at: new Date().toISOString(),
      resend_status: 'sent',
    });

    if (logError) {
      console.error('Failed to log email:', logError);
      // Don't throw - email was sent successfully
    }

    return new Response(
      JSON.stringify({
        success: true,
        email_id: emailResult.data?.id,
      } as SendEmailResponse),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Email send error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      } as SendEmailResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
