'use client';

import { useAssistant } from './AssistantContext';

/**
 * Marketing strip with sample prompts that, when clicked, open the global
 * assistant drawer with the prompt already submitted. Designed to drop into
 * the homepage between sections.
 */

const DEFAULT_PROMPTS: Array<{ label: string; query: string }> = [
  {
    label: 'How does Malaka build with Figma MCP?',
    query: 'How does Malaka build production UIs with Figma MCP and the Core UI design system?',
  },
  {
    label: 'Recommend an article for me',
    query:
      'I\'m a senior frontend engineer interested in AI agents. Which article should I read first?',
  },
  {
    label: 'What does Malaka work on day-to-day?',
    query:
      'What does Malaka actually do in his role as an AI engineer? Walk me through a typical week.',
  },
];

export function AssistantPrompts({
  prompts = DEFAULT_PROMPTS,
  heading = 'Talk to the AI guide',
  sub = 'Ask anything about Malaka’s work, articles, or experience. Powered by an AI grounded in this site.',
}: {
  prompts?: typeof DEFAULT_PROMPTS;
  heading?: string;
  sub?: string;
}) {
  const { open } = useAssistant();
  return (
    <>
      <style>{PROMPTS_CSS}</style>
      <section className="ap-section" aria-label="AI assistant sample prompts">
        <div className="ap-inner">
          <div className="ap-text">
            <span className="ap-eyebrow">AI assistant · ⌘K anywhere</span>
            <h2 className="ap-heading">{heading}</h2>
            <p className="ap-sub">{sub}</p>
          </div>
          <ul className="ap-grid" role="list">
            {prompts.map((p) => (
              <li key={p.label}>
                <button
                  type="button"
                  className="ap-card"
                  onClick={() =>
                    open({ scope: { kind: 'site' }, prefill: p.query, source: 'landing_card' })
                  }
                >
                  <span className="ap-card-label">{p.label}</span>
                  <span className="ap-card-arrow" aria-hidden="true">
                    →
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

const PROMPTS_CSS = `
.ap-section {
  padding: clamp(40px, 6vw, 72px) 0;
}
.ap-inner {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 clamp(16px, 4vw, 32px);
  display: grid;
  gap: 24px;
  grid-template-columns: 1fr;
}
.ap-text { max-width: 580px; }
.ap-eyebrow {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--brand-2, #22d3ee);
  margin-bottom: 10px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(34, 211, 238, 0.08);
  border: 1px solid rgba(34, 211, 238, 0.22);
}
.ap-heading {
  margin: 0 0 8px;
  font-size: clamp(24px, 3.4vw, 34px);
  font-weight: 700;
  line-height: 1.1;
  color: var(--text);
  font-family: var(--font-space-grotesk, var(--font-inter, sans-serif));
}
.ap-sub {
  margin: 0;
  font-size: 15px;
  line-height: 1.55;
  color: var(--text-muted);
}

.ap-grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
  grid-template-columns: 1fr;
}

.ap-card {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background:
    linear-gradient(135deg, rgba(124,92,255,0.06), rgba(34,211,238,0.04)),
    var(--bg-card, rgba(255,255,255,0.02));
  color: var(--text);
  text-align: left;
  font-size: 14.5px;
  font-weight: 500;
  cursor: pointer;
  transition:
    transform 200ms var(--ease, cubic-bezier(0.2, 0.8, 0.2, 1)),
    border-color 200ms var(--ease, cubic-bezier(0.2, 0.8, 0.2, 1)),
    background 200ms var(--ease, cubic-bezier(0.2, 0.8, 0.2, 1));
}
.ap-card:hover {
  transform: translateY(-1px);
  border-color: var(--brand-1, #7c5cff);
  background:
    linear-gradient(135deg, rgba(124,92,255,0.14), rgba(34,211,238,0.08)),
    var(--bg-card, rgba(255,255,255,0.02));
}
.ap-card:focus-visible {
  outline: 2px solid var(--brand-1, #7c5cff);
  outline-offset: 2px;
}
.ap-card-arrow {
  font-size: 18px;
  color: var(--brand-2, #22d3ee);
  transition: transform 200ms var(--ease);
}
.ap-card:hover .ap-card-arrow {
  transform: translateX(3px);
}

@media (min-width: 720px) {
  .ap-inner {
    grid-template-columns: 1fr 1.2fr;
    gap: clamp(28px, 4vw, 56px);
    align-items: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ap-card,
  .ap-card-arrow { transition: none; }
  .ap-card:hover { transform: none; }
  .ap-card:hover .ap-card-arrow { transform: none; }
}
`;
