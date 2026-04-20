import { SITE } from '@/lib/site';
import { ContactForm } from './ContactForm';

export function Contact() {
  return (
    <section id="contact" className="section">
      <div className="container">
        <div className="section-head reveal in">
          <span className="section-eyebrow">Contact</span>
          <h2 className="section-title">
            Let&apos;s build something <span className="grad">remarkable</span>
          </h2>
          <p className="section-subtitle">
            Always up for a deep conversation about{' '}
            <strong>agent skills, subagents, MCP servers</strong>, design systems, or anything where
            AI meets the frontend. Drop a line — I read every message.
          </p>
        </div>

        <div className="contact-grid">
          <div className="contact-info reveal in">
            <h3>Get in touch</h3>
            <p>I respond within 24 hours. The fastest paths are email or LinkedIn.</p>

            <div className="contact-item">
              <span className="ico">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </span>
              <div>
                <div className="lbl">Email</div>
                <a className="val" href={`mailto:${SITE.email}`}>
                  {SITE.email}
                </a>
              </div>
            </div>

            <div className="contact-item">
              <span className="ico">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </span>
              <div>
                <div className="lbl">Phone</div>
                <a className="val" href={`tel:${SITE.phone.replace(/[^+\d]/g, '')}`}>
                  {SITE.phone}
                </a>
              </div>
            </div>

            <div className="contact-item">
              <span className="ico">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              <div>
                <div className="lbl">Location</div>
                <span className="val">
                  {SITE.location.locality}, {SITE.location.country === 'IN' ? 'India' : SITE.location.country}
                </span>
              </div>
            </div>

            <div className="contact-item">
              <span className="ico">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </span>
              <div>
                <div className="lbl">LinkedIn</div>
                <a className="val" href={SITE.socials.linkedin} target="_blank" rel="noopener">
                  linkedin.com/in/venumalaka
                </a>
              </div>
            </div>
          </div>

          <ContactForm />
        </div>
      </div>
    </section>
  );
}
