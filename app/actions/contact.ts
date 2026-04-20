'use server';

import { SITE } from '@/lib/site';
import type { Attribution } from '@/lib/attribution';

type Result = { ok: boolean; message: string };

function safeAttribution(raw: string): Attribution | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Attribution>;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      referrer_host: parsed.referrer_host ?? null,
      utm_source: parsed.utm_source ?? null,
      utm_medium: parsed.utm_medium ?? null,
      utm_campaign: parsed.utm_campaign ?? null,
      utm_term: parsed.utm_term ?? null,
      utm_content: parsed.utm_content ?? null,
      landing_path: parsed.landing_path ?? null,
      source: parsed.source ?? null,
      first_seen: parsed.first_seen ?? '',
    };
  } catch {
    return null;
  }
}

function formatAttribution(a: Attribution | null): string {
  if (!a) return 'Attribution: (none — direct visit or DNT)';

  const parts: string[] = [];
  if (a.source) parts.push(`short-link=${a.source}`);
  if (a.utm_source) parts.push(`utm_source=${a.utm_source}`);
  if (a.utm_medium) parts.push(`utm_medium=${a.utm_medium}`);
  if (a.utm_campaign) parts.push(`utm_campaign=${a.utm_campaign}`);
  if (a.utm_term) parts.push(`utm_term=${a.utm_term}`);
  if (a.utm_content) parts.push(`utm_content=${a.utm_content}`);
  if (a.referrer_host) parts.push(`referrer=${a.referrer_host}`);
  if (a.landing_path) parts.push(`landing=${a.landing_path}`);
  if (a.first_seen) parts.push(`first_seen=${a.first_seen}`);

  if (parts.length === 0) return 'Attribution: (direct visit)';
  return `Attribution:\n  ${parts.join('\n  ')}`;
}

export async function sendContactMessage(formData: FormData): Promise<Result> {
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const subject = String(formData.get('subject') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();
  const honeypot = String(formData.get('website') ?? '').trim();
  const attribution = safeAttribution(String(formData.get('_attr') ?? ''));

  if (honeypot) {
    return { ok: true, message: 'Thanks — your message has been received.' };
  }

  if (!name || !email || !message) {
    return { ok: false, message: 'Please fill in name, email and a short message.' };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: 'Please enter a valid email address.' };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_INBOX ?? SITE.email;

  if (!apiKey) {
    return {
      ok: true,
      message:
        'Thanks for reaching out. Email isn’t wired up in this preview — please email me directly at ' +
        SITE.email +
        '.',
    };
  }

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);

    const subjectLine = subject
      ? `[malakavenu.com] ${subject}`
      : `[malakavenu.com] New message from ${name}`;

    const body = [
      `From: ${name} <${email}>`,
      `Subject: ${subject || '(no subject)'}`,
      '',
      message,
      '',
      '---',
      formatAttribution(attribution),
    ].join('\n');

    const { error } = await resend.emails.send({
      from: process.env.CONTACT_FROM ?? 'malakavenu.com <onboarding@resend.dev>',
      to: [to],
      replyTo: email,
      subject: subjectLine,
      text: body,
    });

    if (error) {
      return {
        ok: false,
        message: 'Could not send right now — please email me directly at ' + SITE.email + '.',
      };
    }

    return { ok: true, message: 'Thanks — your message is on its way. I respond within 24 hours.' };
  } catch {
    return {
      ok: false,
      message: 'Could not send right now — please email me directly at ' + SITE.email + '.',
    };
  }
}
