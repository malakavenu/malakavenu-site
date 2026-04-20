'use client';

import { useState, useTransition } from 'react';
import { sendContactMessage } from '@/app/actions/contact';
import { readClientAttribution } from '@/lib/attribution';
import { track } from '@/lib/track';

export function ContactForm() {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  return (
    <form
      className="contact-form reveal in delay-1"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const attr = readClientAttribution();
        const attrInput = form.querySelector<HTMLInputElement>('input[name="_attr"]');
        if (attrInput) attrInput.value = attr ? JSON.stringify(attr) : '';
        const formData = new FormData(form);
        startTransition(async () => {
          try {
            const result = await sendContactMessage(formData);
            setStatus(result);
            if (result.ok) {
              track('contact_submit', {
                attr_source: attr?.source ?? null,
                attr_utm_source: attr?.utm_source ?? null,
                attr_utm_medium: attr?.utm_medium ?? null,
                attr_utm_campaign: attr?.utm_campaign ?? null,
                attr_referrer_host: attr?.referrer_host ?? null,
                attr_landing_path: attr?.landing_path ?? null,
              });
              form.reset();
            } else {
              track('contact_fail', { reason: result.message.slice(0, 80) });
            }
          } catch {
            track('contact_fail', { reason: 'exception' });
            setStatus({
              ok: false,
              message: 'Could not send right now. Please email venu.malaka@gmail.com directly.',
            });
          }
        });
      }}
    >
      <div className="form-row">
        <div className="form-field">
          <label htmlFor="name">Name</label>
          <input id="name" name="name" type="text" placeholder="Your name" required />
        </div>
        <div className="form-field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" placeholder="you@company.com" required />
        </div>
      </div>
      <div className="form-field">
        <label htmlFor="subject">Subject</label>
        <input id="subject" name="subject" type="text" placeholder="What's this about?" />
      </div>
      <div className="form-field">
        <label htmlFor="message">Message</label>
        <textarea
          id="message"
          name="message"
          placeholder="Tell me about the role, project, or idea…"
          required
        />
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" hidden aria-hidden="true" />
      <input type="hidden" name="_attr" defaultValue="" aria-hidden="true" />
      <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={pending}>
        {pending ? 'Sending…' : 'Send message'}
        <svg
          className="btn-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
      {status && (
        <div
          className="form-success"
          style={{ display: 'block', color: status.ok ? undefined : '#ef4444' }}
          role="status"
        >
          {status.message}
        </div>
      )}
    </form>
  );
}
