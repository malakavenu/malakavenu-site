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
      aria-describedby="contact-form-status"
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
          <label htmlFor="name">
            Name
            <span className="sr-only"> (required)</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="Your name"
            required
            aria-required="true"
            autoComplete="name"
          />
        </div>
        <div className="form-field">
          <label htmlFor="email">
            Email
            <span className="sr-only"> (required)</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@company.com"
            required
            aria-required="true"
            autoComplete="email"
            inputMode="email"
          />
        </div>
      </div>
      <div className="form-field">
        <label htmlFor="subject">Subject</label>
        <input
          id="subject"
          name="subject"
          type="text"
          placeholder="What's this about?"
          autoComplete="off"
        />
      </div>
      <div className="form-field">
        <label htmlFor="message">
          Message
          <span className="sr-only"> (required)</span>
        </label>
        <textarea
          id="message"
          name="message"
          placeholder="Tell me about the role, project, or idea…"
          required
          aria-required="true"
        />
      </div>
      {/* Honeypot — visually hidden, off-screen, and invisible to AT. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        hidden
        aria-hidden="true"
      />
      <input type="hidden" name="_attr" defaultValue="" aria-hidden="true" />
      <button
        type="submit"
        className="btn btn-primary"
        style={{ width: '100%' }}
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? 'Sending…' : 'Send message'}
        <svg
          className="btn-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
      {/* Live region: success uses polite, error uses assertive. */}
      <div
        id="contact-form-status"
        className="form-success"
        style={{
          display: status ? 'block' : 'none',
          color: status?.ok ? undefined : '#fca5a5',
          background: status?.ok ? undefined : 'rgba(239, 68, 68, 0.1)',
          borderColor: status?.ok ? undefined : 'rgba(239, 68, 68, 0.35)',
        }}
        role={status?.ok === false ? 'alert' : 'status'}
        aria-live={status?.ok === false ? 'assertive' : 'polite'}
        aria-atomic="true"
      >
        {status?.message}
      </div>
    </form>
  );
}
