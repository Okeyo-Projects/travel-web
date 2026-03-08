import type { EmailTemplate } from './types.ts';

type RenderOpts = {
  title: string;
  eyebrow?: string;
  greeting?: string;
  intro?: string;
  body?: string[];
  highlight?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  details?: Array<{ label: string; value: string | number | null | undefined }>;
  footerNote?: string;
  secondaryCtaLabel?: string;
  secondaryCtaUrl?: string;
};

const brand = {
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  accent: '#0ea5e9',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  text: '#0f172a',
  muted: '#475569',
  subtle: '#94a3b8',
  surface: '#f8fafc',
  card: '#ffffff',
  border: '#e2e8f0',
  shadow: '0 15px 45px rgba(15, 23, 42, 0.12)',
};

const fallbackUrl = 'https://okeyotravel.com';

function layout({
  title,
  eyebrow,
  greeting,
  intro,
  body = [],
  highlight,
  ctaLabel,
  ctaUrl,
  details = [],
  footerNote,
  secondaryCtaLabel,
  secondaryCtaUrl,
}: RenderOpts): string {
  const detailRows = details
    .filter((d) => d.value !== undefined && d.value !== null && d.value !== '')
    .map(
      (d) => `
        <tr>
          <td style="padding: 8px 12px; font-weight: 600; color: ${brand.text}; border-bottom: 1px solid ${brand.border}; width: 45%;">${d.label}</td>
          <td style="padding: 8px 12px; color: ${brand.text}; border-bottom: 1px solid ${brand.border};">${d.value}</td>
        </tr>`
    )
    .join('');

  const bodyBlocks = body
    .map((paragraph) => `<p style="margin: 0 0 12px 0; color: ${brand.text}; font-size: 15px; line-height: 22px;">${paragraph}</p>`)
    .join('');

  const accentBar = highlight
    ? `<div style="margin: 12px 0 18px 0; padding: 12px 14px; border-radius: 12px; background: rgba(37, 99, 235, 0.08); color: ${brand.text}; font-weight: 600; border: 1px solid ${brand.border};">
        ${highlight}
      </div>`
    : '';

  const ctaPrimary = ctaLabel
    ? `<a href="${ctaUrl || fallbackUrl}" style="display: inline-block; padding: 13px 20px; background: linear-gradient(135deg, ${brand.primary}, ${brand.primaryDark}); color: #ffffff; text-decoration: none; border-radius: 999px; font-weight: 800; letter-spacing: 0.2px; box-shadow: 0 10px 30px rgba(37, 99, 235, 0.25);">${ctaLabel}</a>`
    : '';

  const ctaSecondary = secondaryCtaLabel
    ? `<a href="${secondaryCtaUrl || fallbackUrl}" style="display: inline-block; padding: 12px 18px; color: ${brand.primary}; text-decoration: none; border-radius: 10px; font-weight: 700; border: 1px solid ${brand.border}; margin-left: 10px;">${secondaryCtaLabel}</a>`
    : '';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
      </head>
      <body style="margin:0; padding:0; background:${brand.surface}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:${brand.text};">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="padding: 32px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="640" align="center" style="background: ${brand.card}; border-radius: 18px; border: 1px solid ${brand.border}; box-shadow: ${brand.shadow}; overflow: hidden;">
                <tr>
                  <td style="padding: 26px 30px 18px 30px; background: linear-gradient(135deg, ${brand.primary}, ${brand.primaryDark}); color: #ffffff;">
                    ${eyebrow ? `<p style="margin: 0 0 6px 0; font-size: 12px; letter-spacing: 0.8px; text-transform: uppercase; opacity: 0.8;">${eyebrow}</p>` : ''}
                    <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.4px;">${title}</h1>
                    <p style="margin: 8px 0 0 0; font-size: 15px; opacity: 0.92;">Okeyo Experience</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 26px 30px 28px 30px;">
                    ${greeting ? `<p style="margin: 0 0 12px 0; font-weight: 800; font-size: 16px; color: ${brand.text}; letter-spacing: -0.2px;">Hi ${greeting},</p>` : ''}
                    ${intro ? `<p style="margin: 0 0 16px 0; color: ${brand.text}; font-size: 15px; line-height: 24px;">${intro}</p>` : ''}
                    ${accentBar}
                    ${bodyBlocks}
                    ${detailRows ? `
                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 18px 0 10px 0; border: 1px solid ${brand.border}; border-radius: 12px; overflow: hidden; background: #fff;">
                        ${detailRows}
                      </table>` : ''}
                    ${(ctaPrimary || ctaSecondary) ? `
                      <div style="margin: 22px 0 10px 0;">
                        ${ctaPrimary}
                        ${ctaSecondary}
                      </div>` : ''}
                    ${footerNote ? `<p style="margin: 16px 0 0 0; color: ${brand.muted}; font-size: 13px; line-height: 20px;">${footerNote}</p>` : ''}
                  </td>
                </tr>
              </table>
              <p style="text-align: center; color: ${brand.subtle}; font-size: 12px; margin: 16px 0 0 0;">&copy; ${new Date().getFullYear()} Okeyo Experience. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export function renderEmailHtml(template: EmailTemplate, data: Record<string, unknown>): string {
  const ctaUrl = (data.action_url as string) || fallbackUrl;
  const experienceTitle = (data.experience_title as string) || 'Your experience';
  const guestName = (data.guest_name as string) || (data.user_name as string) || '';
  const hostName = (data.host_name as string) || '';
  const bookingId = (data.booking_id as string) || '';
  const amount = data.amount as number | string | undefined;
  const currency = (data.currency as string) || '';
  const formattedAmount = amount ? `${amount}${currency ? ` ${currency}` : ''}` : undefined;
  const dateRange = (data.date_range as string) || '';

  switch (template) {
    case 'welcome':
      return layout({
        title: 'Welcome to Okeyo',
        eyebrow: 'Getting started',
        greeting: guestName || 'there',
        intro: 'Thanks for joining Okeyo Experience. Dive into curated stays, activities, and trips built for storytellers and travellers.',
        body: [
          'Browse immersive video-led experiences, message hosts, and secure your spot in a few taps.',
          'Complete your profile so hosts can confirm you faster and tailor your stay.',
        ],
        highlight: 'Tip: enable notifications to never miss booking updates.',
        ctaLabel: 'Open the app',
        ctaUrl,
      });

    case 'booking_request_host':
      return layout({
        title: 'New booking request',
        eyebrow: 'Action needed',
        greeting: hostName || 'Host',
        intro: `${guestName || 'A guest'} wants to book "${experienceTitle}". Please review and respond.`,
        details: [
          { label: 'Experience', value: experienceTitle },
          { label: 'Dates', value: dateRange },
          { label: 'Guests', value: data.guests as string },
          { label: 'Booking ID', value: bookingId },
        ],
        highlight: 'Respond quickly to keep a strong acceptance rate.',
        ctaLabel: 'Review request',
        ctaUrl,
        footerNote: 'Need to adjust? Message the guest from the app.',
      });

    case 'review_request':
      return layout({
        title: 'How was your experience?',
        eyebrow: 'We value your voice',
        greeting: guestName || 'there',
        intro: `Tell us about "${experienceTitle}". Your feedback helps hosts improve and other travellers decide.`,
        details: [
          { label: 'Experience', value: experienceTitle },
          { label: 'Dates', value: dateRange },
          { label: 'Booking ID', value: bookingId },
        ],
        ctaLabel: 'Leave a review',
        ctaUrl,
        footerNote: 'It only takes a minute and really helps the community.',
      });

    case 'review_received':
      return layout({
        title: 'New review received',
        eyebrow: 'Great news',
        greeting: hostName || 'Host',
        intro: `${guestName || 'A guest'} left a review for "${experienceTitle}".`,
        details: [
          { label: 'Experience', value: experienceTitle },
          { label: 'Dates', value: dateRange },
          { label: 'Booking ID', value: bookingId },
        ],
        ctaLabel: 'Read the review',
        ctaUrl,
        footerNote: 'Respond to keep guests engaged and improve future stays.',
      });

    case 'booking_reminder':
      return layout({
        title: 'Upcoming experience reminder',
        eyebrow: 'Heads up',
        greeting: guestName || 'there',
        intro: `Your experience "${experienceTitle}" is coming up.`,
        details: [
          { label: 'Dates', value: dateRange },
          { label: 'Booking ID', value: bookingId },
          { label: 'Location', value: (data.location as string) },
        ],
        ctaLabel: 'View booking',
        ctaUrl,
        footerNote: 'Check your arrival time, directions, and any host notes in the app.',
      });

    case 'payment_failed':
      return layout({
        title: 'Payment issue',
        eyebrow: 'Action needed',
        greeting: guestName || hostName || 'there',
        intro: 'We could not process your payment. Please update your payment method to avoid cancellation.',
        details: [
          { label: 'Experience', value: experienceTitle },
          { label: 'Amount', value: formattedAmount },
          { label: 'Booking ID', value: bookingId },
        ],
        ctaLabel: 'Fix payment',
        ctaUrl,
        footerNote: 'If you recently updated your card, retry the payment in the app.',
      });

    case 'payment_receipt_host':
      return layout({
        title: 'Guest payment received',
        eyebrow: 'Payment confirmed',
        greeting: hostName || 'Host',
        intro: `${guestName || 'Your guest'} completed payment for "${experienceTitle}".`,
        details: [
          { label: 'Amount', value: formattedAmount },
          { label: 'Booking ID', value: bookingId },
          { label: 'Dates', value: dateRange },
        ],
        ctaLabel: 'View booking',
        ctaUrl,
        footerNote: 'You can now finalize preparations and send any arrival notes.',
      });

    case 'payment_invoice':
      return layout({
        title: 'Your invoice',
        eyebrow: 'Payment record',
        greeting: guestName || 'there',
        intro: `Here is your invoice for "${experienceTitle}".`,
        details: [
          { label: 'Invoice ID', value: (data.invoice_id as string) },
          { label: 'Booking ID', value: bookingId },
          { label: 'Amount', value: formattedAmount },
          { label: 'Dates', value: dateRange },
        ],
        ctaLabel: 'View invoice',
        ctaUrl,
        secondaryCtaLabel: 'Download PDF',
        secondaryCtaUrl: ctaUrl,
      });

    default:
      return layout({
        title: 'Okeyo Update',
        greeting: guestName || hostName || 'there',
        intro: 'Here is an update from Okeyo Experience.',
        body: [JSON.stringify(data, null, 2)],
        ctaLabel: 'Open the app',
        ctaUrl,
      });
  }
}

