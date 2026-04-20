'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { SocialIcons } from '@/components/site/SocialIcons';
import { GeoBadge } from '@/components/home/GeoBadge';
import { SITE } from '@/lib/site';
import { track } from '@/lib/track';

const ROLES = [
  'Agent Skills & Subagents',
  'MCP Server Architect',
  'Multi-Agent Orchestrator',
  'AI Frontend Architect',
  'Generative UI Engineer',
  'AWS Bedrock Builder',
  'Angular & React Architect',
  'Design Systems Strategist',
];

function useRoleRotator() {
  const [text, setText] = useState(ROLES[0]);
  useEffect(() => {
    let i = 0;
    let typed = ROLES[0];
    let phase: 'pause' | 'erase' | 'type' = 'pause';
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      if (phase === 'pause') {
        phase = 'erase';
        timer = setTimeout(tick, 1800);
        return;
      }
      if (phase === 'erase') {
        if (typed.length === 0) {
          phase = 'type';
          i = (i + 1) % ROLES.length;
          timer = setTimeout(tick, 80);
          return;
        }
        typed = typed.slice(0, -1);
        setText(typed);
        timer = setTimeout(tick, 24);
        return;
      }
      const target = ROLES[i];
      if (typed.length === target.length) {
        phase = 'pause';
        timer = setTimeout(tick, 1200);
        return;
      }
      typed = target.slice(0, typed.length + 1);
      setText(typed);
      timer = setTimeout(tick, 60);
    };

    timer = setTimeout(tick, 1500);
    return () => clearTimeout(timer);
  }, []);
  return text;
}

export function Hero() {
  const role = useRoleRotator();
  const [flipped, setFlipped] = useState(false);
  const [hasFlippedOnce, setHasFlippedOnce] = useState(false);
  const flipRef = useRef<HTMLDivElement>(null);

  const onFlip = () => {
    setFlipped((v) => {
      track('hero_flip', { state: v ? 'front' : 'back' });
      return !v;
    });
    setHasFlippedOnce(true);
  };

  return (
    <section id="home" className="hero">
      <div className="container">
        <div className="hero-grid">
          <div className="hero-text">
            <div className="hero-badges reveal in">
              <div className="hero-badge">
                <span className="pulse"></span>
                Currently shipping <strong>agent skills</strong>, <strong>subagents</strong> &amp;{' '}
                <strong>MCP servers</strong> in production frontends
              </div>
              <GeoBadge />
            </div>

            <h1 className="hero-title reveal in">
              Hi, I&apos;m <span className="grad">Malaka Venu</span>.<br />I ship{' '}
              <span className="grad">AI agents</span> and the
              <br />
              <span className="grad">intelligent frontends</span> they live in.
            </h1>

            <div className="hero-rotator reveal in delay-1">
              <span className="label">Currently exploring</span>
              <span className="role" id="roleRotator" aria-live="polite">
                {role}
              </span>
            </div>

            <p className="hero-desc reveal in delay-2">
              <strong>AI &amp; Agentic Systems Engineer</strong> with a deep frontend backbone — 11+
              years scaling Angular (v2 → v21) &amp; React platforms. Today I&apos;m building{' '}
              <strong>agent skills, subagents, MCP servers</strong> and multi-agent systems on AWS
              Bedrock, OpenAI &amp; Anthropic — woven into production frontends, generative UI and
              design systems.
            </p>

            <div className="hero-actions reveal in delay-2">
              <Link href="/#contact" className="btn btn-primary">
                Let&apos;s build something
                <svg
                  className="btn-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
              <Link href="/#portfolio" className="btn btn-ghost">
                <svg
                  className="btn-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                View my work
              </Link>
            </div>

            <div className="reveal in delay-3">
              <SocialIcons location="hero" />
            </div>

            <div className="hero-stats reveal in delay-3">
              <div className="stat">
                <div className="num">11+</div>
                <div className="lbl">Years experience</div>
              </div>
              <div className="stat">
                <div className="num">50+</div>
                <div className="lbl">Projects shipped</div>
              </div>
              <div className="stat">
                <div className="num">15+</div>
                <div className="lbl">Engineers mentored</div>
              </div>
            </div>
          </div>

          <div className="hero-visual reveal in">
            <div className="hero-photo-wrap">
              <div
                ref={flipRef}
                className={`hero-id-flip${flipped ? ' is-flipped' : ''}${
                  hasFlippedOnce ? ' has-flipped-once' : ''
                }`}
                onClick={onFlip}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onFlip()}
                role="button"
                tabIndex={0}
                aria-label="Flip identity card"
              >
                <div className="hero-id-face hero-id-front">
                  <div className="hero-glow"></div>
                  <div className="hero-photo">
                    <Image
                      src="/images/hero.jpg"
                      alt="Malaka Venugopal Reddy — Frontend Architect, AI & Agentic Systems Engineer, Bangalore"
                      width={900}
                      height={1200}
                      priority
                      sizes="(max-width: 1024px) 360px, 440px"
                    />
                  </div>

                  <div className="hero-id-meta" aria-hidden="true">
                    <div className="hero-id-name">
                      Malaka Venu
                      <svg
                        className="hero-id-verified"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3z" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                    </div>
                    <div className="hero-id-role">AI &amp; Frontend Architect · Bangalore</div>
                    <div className="hero-id-status">
                      <span className="hero-id-dot"></span>
                      Available · shipping agent skills
                    </div>
                    <div className="hero-id-tags">
                      <span>Agentic AI</span>
                      <span>MCP</span>
                      <span>Subagents</span>
                      <span>Gen UI</span>
                    </div>
                  </div>

                  <span className="hero-id-flip-hint" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                      <path d="M21 3v5h-5" />
                      <path d="M3 21v-5h5" />
                    </svg>
                    flip
                  </span>
                </div>

                <div className="hero-id-face hero-id-back" aria-hidden={!flipped}>
                  <p className="hero-id-bio">
                    I architect <strong>AI-driven web apps</strong> and agentic systems — currently
                    shipping Agent Skills, MCP servers and generative UI patterns from Bangalore.
                  </p>
                  <div className="hero-id-actions">
                    <a
                      href={SITE.resumePdf}
                      target="_blank"
                      rel="noopener"
                      className="hero-id-btn hero-id-btn--primary"
                      onClick={() => track('resume_download', { location: 'hero_card' })}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Resume
                    </a>
                    <Link href="/#contact" className="hero-id-btn hero-id-btn--ghost">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M22 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                      </svg>
                      Contact
                    </Link>
                  </div>
                  <span
                    className="hero-id-flip-hint hero-id-flip-hint--back"
                    aria-hidden="true"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="19" y1="12" x2="5" y2="12" />
                      <polyline points="12 19 5 12 12 5" />
                    </svg>
                    tap to flip back
                  </span>
                </div>
              </div>

              <div className="float-chip tl">
                <span className="icon-circle">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                </span>
                Angular &amp; React
              </div>

              <div className="float-chip br">
                <span className="icon-circle">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .39.32.71.71.71H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </span>
                AI · LLM · MCP
              </div>

              <div className="float-chip bl">
                <span className="icon-circle">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                </span>
                Design Systems
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
