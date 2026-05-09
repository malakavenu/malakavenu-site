'use client';

import { useState } from 'react';

type Cat = 'all' | 'ai' | 'design' | 'platform' | 'beyond';

const FILTERS: { id: Cat; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'ai', label: 'AI Systems' },
  { id: 'design', label: 'Design Systems' },
  { id: 'platform', label: 'Frontend Platform' },
  { id: 'beyond', label: 'Beyond Code' },
];

export function CaseStudies() {
  const [active, setActive] = useState<Cat>('all');

  const isVisible = (cat: Exclude<Cat, 'all'>) => active === 'all' || active === cat;

  return (
    <section id="portfolio" className="section">
      <div className="container">
        <div className="section-head reveal in">
          <span className="section-eyebrow">Case studies</span>
          <h2 className="section-title">
            Things I&apos;ve <span className="grad">architected</span> &amp;{' '}
            <span className="grad">shipped</span>
          </h2>
          <p className="section-subtitle">
            Selected platform &amp; AI engagements — illustrated. Filter by domain.
          </p>
        </div>

        <div
          className="port-filters reveal in"
          role="group"
          aria-label="Filter case studies by category"
        >
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`port-filter${active === f.id ? ' active' : ''}`}
              onClick={() => setActive(f.id)}
              data-filter={f.id}
              aria-pressed={active === f.id}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="case-grid">
          <article
            className={`case-card reveal in${isVisible('ai') ? '' : ' hidden'}`}
            data-cat="ai"
          >
            <div className="case-visual visual-agents" aria-hidden="true">
              <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <linearGradient id="ag-link" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#7c5cff" stopOpacity="0.1" />
                    <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#7c5cff" stopOpacity="0.1" />
                  </linearGradient>
                  <radialGradient id="ag-node" cx="0.5" cy="0.5" r="0.5">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#7c5cff" />
                  </radialGradient>
                </defs>
                <g
                  className="ag-links"
                  stroke="url(#ag-link)"
                  strokeWidth="1.4"
                  fill="none"
                  strokeLinecap="round"
                >
                  <path d="M160 90 L60 40" />
                  <path d="M160 90 L260 40" />
                  <path d="M160 90 L40 100" />
                  <path d="M160 90 L280 110" />
                  <path d="M160 90 L80 150" />
                  <path d="M160 90 L240 150" />
                </g>
                <g className="ag-nodes">
                  <circle cx="60" cy="40" r="9" fill="url(#ag-node)" />
                  <circle cx="260" cy="40" r="9" fill="url(#ag-node)" />
                  <circle cx="40" cy="100" r="9" fill="url(#ag-node)" />
                  <circle cx="280" cy="110" r="9" fill="url(#ag-node)" />
                  <circle cx="80" cy="150" r="9" fill="url(#ag-node)" />
                  <circle cx="240" cy="150" r="9" fill="url(#ag-node)" />
                </g>
                <circle
                  cx="160"
                  cy="90"
                  r="22"
                  fill="rgba(124,92,255,0.18)"
                  stroke="url(#ag-node)"
                  strokeWidth="1.6"
                />
                <text
                  x="160"
                  y="94"
                  textAnchor="middle"
                  fontFamily="Space Grotesk, sans-serif"
                  fontSize="10"
                  fontWeight="700"
                  fill="#fff"
                >
                  supervisor
                </text>
              </svg>
              <span className="case-tag">AI Systems</span>
            </div>
            <div className="case-body">
              <div className="case-meta">
                <span className="case-year">2024 — Present</span>
                <span className="case-role">Lead Architect</span>
              </div>
              <h3 className="case-title">Agentic Platform — Skills, Subagents &amp; MCP</h3>
              <p className="case-desc">
                A supervisor agent coordinates <strong>specialised subagents</strong> via portable{' '}
                <strong>agent skills</strong>, calling tools through custom{' '}
                <strong>MCP servers</strong> on AWS Bedrock — with streaming generative UI and
                per-agent traces for enterprise workflows.
              </p>
              <div className="case-stats">
                <div className="case-stat">
                  <span className="num">12</span>
                  <span className="lbl">Subagents</span>
                </div>
                <div className="case-stat">
                  <span className="num">8</span>
                  <span className="lbl">MCP servers</span>
                </div>
                <div className="case-stat">
                  <span className="num">↓40%</span>
                  <span className="lbl">Time to resolve</span>
                </div>
              </div>
              <div className="case-stack">
                <span>Agent Skills</span>
                <span>Subagents</span>
                <span>MCP Servers</span>
                <span>AWS Bedrock</span>
                <span>LangGraph</span>
              </div>
            </div>
          </article>

          <article
            className={`case-card reveal in${isVisible('design') ? '' : ' hidden'}`}
            data-cat="design"
          >
            <div className="case-visual visual-tokens" aria-hidden="true">
              <div className="ds-stage">
                <div className="ds-swatches">
                  <span style={{ ['--c' as string]: '#7c5cff' } as React.CSSProperties}></span>
                  <span style={{ ['--c' as string]: '#22d3ee' } as React.CSSProperties}></span>
                  <span style={{ ['--c' as string]: '#34d399' } as React.CSSProperties}></span>
                  <span style={{ ['--c' as string]: '#f59e0b' } as React.CSSProperties}></span>
                  <span style={{ ['--c' as string]: '#ef4444' } as React.CSSProperties}></span>
                  <span style={{ ['--c' as string]: '#a78bfa' } as React.CSSProperties}></span>
                </div>
                <div className="ds-radii">
                  <span style={{ ['--r' as string]: '4px' } as React.CSSProperties}></span>
                  <span style={{ ['--r' as string]: '8px' } as React.CSSProperties}></span>
                  <span style={{ ['--r' as string]: '14px' } as React.CSSProperties}></span>
                  <span style={{ ['--r' as string]: '22px' } as React.CSSProperties}></span>
                  <span style={{ ['--r' as string]: '50%' } as React.CSSProperties}></span>
                </div>
                <div className="ds-spacing">
                  <span style={{ ['--w' as string]: '8px' } as React.CSSProperties}></span>
                  <span style={{ ['--w' as string]: '16px' } as React.CSSProperties}></span>
                  <span style={{ ['--w' as string]: '24px' } as React.CSSProperties}></span>
                  <span style={{ ['--w' as string]: '36px' } as React.CSSProperties}></span>
                  <span style={{ ['--w' as string]: '52px' } as React.CSSProperties}></span>
                </div>
                <div className="ds-typescale">
                  <em style={{ fontSize: '8px' }}>aA</em>
                  <em style={{ fontSize: '11px' }}>aA</em>
                  <em style={{ fontSize: '14px' }}>aA</em>
                  <em style={{ fontSize: '18px' }}>aA</em>
                  <em style={{ fontSize: '24px' }}>aA</em>
                </div>
              </div>
              <span className="case-tag">Design Systems</span>
            </div>
            <div className="case-body">
              <div className="case-meta">
                <span className="case-year">2023 — Present</span>
                <span className="case-role">DS Lead</span>
              </div>
              <h3 className="case-title">Cross-Framework Design System</h3>
              <p className="case-desc">
                W3C tokens, framework-agnostic web components and a Figma → code pipeline shipping
                primitives across Angular, React and vanilla apps.
              </p>
              <div className="case-stats">
                <div className="case-stat">
                  <span className="num">60+</span>
                  <span className="lbl">Components</span>
                </div>
                <div className="case-stat">
                  <span className="num">8</span>
                  <span className="lbl">Product teams</span>
                </div>
                <div className="case-stat">
                  <span className="num">95%</span>
                  <span className="lbl">Adoption</span>
                </div>
              </div>
              <div className="case-stack">
                <span>Stencil</span>
                <span>Storybook</span>
                <span>W3C Tokens</span>
                <span>Figma</span>
              </div>
            </div>
          </article>

          <article
            className={`case-card reveal in${isVisible('platform') ? '' : ' hidden'}`}
            data-cat="platform"
          >
            <div className="case-visual visual-versions" aria-hidden="true">
              <div className="vt-track">
                <span className="vt-pill">v2</span>
                <span className="vt-pill">v6</span>
                <span className="vt-pill">v10</span>
                <span className="vt-pill">v14</span>
                <span className="vt-pill">v17</span>
                <span className="vt-pill">v19</span>
                <span className="vt-pill vt-now">v21</span>
              </div>
              <div className="vt-axis"></div>
              <div className="vt-cadence">Every 6 months · 0 days behind LTS</div>
              <span className="case-tag">Frontend Platform</span>
            </div>
            <div className="case-body">
              <div className="case-meta">
                <span className="case-year">2016 — Present</span>
                <span className="case-role">Upgrade Owner</span>
              </div>
              <h3 className="case-title">Continuous Angular Upgrade Program</h3>
              <p className="case-desc">
                Shipped every Angular major from v2 → v21 on the 6-month cadence — adopting Signals,
                control flow, standalone, deferred loading and SSR/Hydration as they landed.
              </p>
              <div className="case-stats">
                <div className="case-stat">
                  <span className="num">20</span>
                  <span className="lbl">Majors shipped</span>
                </div>
                <div className="case-stat">
                  <span className="num">0</span>
                  <span className="lbl">Days behind LTS</span>
                </div>
                <div className="case-stat">
                  <span className="num">↓30%</span>
                  <span className="lbl">CI duration</span>
                </div>
              </div>
              <div className="case-stack">
                <span>Angular 21</span>
                <span>Signals</span>
                <span>SSR</span>
                <span>Standalone</span>
              </div>
            </div>
          </article>

          <article
            className={`case-card reveal in${isVisible('platform') ? '' : ' hidden'}`}
            data-cat="platform"
          >
            <div className="case-visual visual-federation" aria-hidden="true">
              <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <linearGradient id="mf-line" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#7c5cff" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.85" />
                  </linearGradient>
                </defs>
                <g stroke="url(#mf-line)" strokeWidth="1.4" fill="none" strokeDasharray="4 3">
                  <line x1="160" y1="90" x2="60" y2="50" />
                  <line x1="160" y1="90" x2="160" y2="35" />
                  <line x1="160" y1="90" x2="260" y2="50" />
                  <line x1="160" y1="90" x2="60" y2="130" />
                  <line x1="160" y1="90" x2="160" y2="145" />
                  <line x1="160" y1="90" x2="260" y2="130" />
                </g>
                <g fontFamily="Space Grotesk, sans-serif" fontSize="9" fill="#cdd1de">
                  <g className="mf-team">
                    <rect x="22" y="35" width="76" height="30" rx="8" />
                    <text x="60" y="54" textAnchor="middle">team a</text>
                  </g>
                  <g className="mf-team">
                    <rect x="122" y="20" width="76" height="30" rx="8" />
                    <text x="160" y="39" textAnchor="middle">team b</text>
                  </g>
                  <g className="mf-team">
                    <rect x="222" y="35" width="76" height="30" rx="8" />
                    <text x="260" y="54" textAnchor="middle">team c</text>
                  </g>
                  <g className="mf-team">
                    <rect x="22" y="115" width="76" height="30" rx="8" />
                    <text x="60" y="134" textAnchor="middle">team d</text>
                  </g>
                  <g className="mf-team">
                    <rect x="122" y="130" width="76" height="30" rx="8" />
                    <text x="160" y="149" textAnchor="middle">team e</text>
                  </g>
                  <g className="mf-team">
                    <rect x="222" y="115" width="76" height="30" rx="8" />
                    <text x="260" y="134" textAnchor="middle">team f</text>
                  </g>
                </g>
                <rect
                  x="125"
                  y="74"
                  width="70"
                  height="32"
                  rx="10"
                  fill="rgba(124,92,255,0.20)"
                  stroke="url(#mf-line)"
                  strokeWidth="1.6"
                />
                <text
                  x="160"
                  y="94"
                  textAnchor="middle"
                  fontFamily="Space Grotesk, sans-serif"
                  fontSize="11"
                  fontWeight="700"
                  fill="#fff"
                >
                  shell
                </text>
              </svg>
              <span className="case-tag">Frontend Platform</span>
            </div>
            <div className="case-body">
              <div className="case-meta">
                <span className="case-year">2022 — Present</span>
                <span className="case-role">Platform Architect</span>
              </div>
              <h3 className="case-title">Micro-Frontend Platform on Module Federation</h3>
              <p className="case-desc">
                Nx monorepo + Webpack 5 federation — 6 product teams ship independently into a
                single shell with shared contracts, design tokens and runtime guards.
              </p>
              <div className="case-stats">
                <div className="case-stat">
                  <span className="num">6</span>
                  <span className="lbl">Teams</span>
                </div>
                <div className="case-stat">
                  <span className="num">1</span>
                  <span className="lbl">Shell</span>
                </div>
                <div className="case-stat">
                  <span className="num">∞</span>
                  <span className="lbl">Deploy cadence</span>
                </div>
              </div>
              <div className="case-stack">
                <span>Nx</span>
                <span>Module Federation</span>
                <span>Webpack 5</span>
                <span>Contracts</span>
              </div>
            </div>
          </article>

          <article
            className={`case-card reveal in${isVisible('ai') ? '' : ' hidden'}`}
            data-cat="ai"
          >
            <div className="case-visual visual-stream" aria-hidden="true">
              <div className="rag-mock">
                <div className="rag-prompt">
                  <span className="rag-prompt-icon">›</span>
                  <span className="rag-prompt-text">how do we onboard a new vendor?</span>
                </div>
                <div className="rag-answer">
                  <span className="rag-line w70"></span>
                  <span className="rag-line w90"></span>
                  <span className="rag-line w50"></span>
                  <div className="rag-cites">
                    <span className="rag-cite">[1]</span>
                    <span className="rag-cite">[2]</span>
                    <span className="rag-cite">[3]</span>
                  </div>
                </div>
                <span className="rag-cursor"></span>
              </div>
              <span className="case-tag">AI Systems</span>
            </div>
            <div className="case-body">
              <div className="case-meta">
                <span className="case-year">2024</span>
                <span className="case-role">Tech Lead</span>
              </div>
              <h3 className="case-title">AI-Native Search · Streaming RAG &amp; Generative UI</h3>
              <p className="case-desc">
                Streaming RAG experience with grounded citations, generative UI components and a
                reranker — packaged as a reusable <strong>agent skill</strong> consumable by every
                product surface.
              </p>
              <div className="case-stats">
                <div className="case-stat">
                  <span className="num">↑3.5×</span>
                  <span className="lbl">Engagement</span>
                </div>
                <div className="case-stat">
                  <span className="num">100%</span>
                  <span className="lbl">Grounded</span>
                </div>
                <div className="case-stat">
                  <span className="num">&lt;800ms</span>
                  <span className="lbl">First token</span>
                </div>
              </div>
              <div className="case-stack">
                <span>Agent Skill</span>
                <span>OpenAI</span>
                <span>Vector DB</span>
                <span>RAG</span>
                <span>Streaming UI</span>
              </div>
            </div>
          </article>

          <article
            className={`case-card reveal in${isVisible('platform') ? '' : ' hidden'}`}
            data-cat="platform"
          >
            <div className="case-visual visual-vitals" aria-hidden="true">
              <div className="cwv-row">
                <div className="cwv-ring">
                  <svg viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      stroke="rgba(255,255,255,0.08)"
                      strokeWidth="3"
                      fill="none"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      stroke="url(#cwv-g1)"
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray="100 100"
                      strokeDashoffset="8"
                      transform="rotate(-90 18 18)"
                    />
                    <defs>
                      <linearGradient id="cwv-g1" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#7c5cff" />
                        <stop offset="100%" stopColor="#22d3ee" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="cwv-label">
                    LCP
                    <br />
                    <b>1.1s</b>
                  </div>
                </div>
                <div className="cwv-ring">
                  <svg viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      stroke="rgba(255,255,255,0.08)"
                      strokeWidth="3"
                      fill="none"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      stroke="url(#cwv-g2)"
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray="100 100"
                      strokeDashoffset="3"
                      transform="rotate(-90 18 18)"
                    />
                    <defs>
                      <linearGradient id="cwv-g2" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#22d3ee" />
                        <stop offset="100%" stopColor="#34d399" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="cwv-label">
                    CLS
                    <br />
                    <b>0.01</b>
                  </div>
                </div>
                <div className="cwv-ring">
                  <svg viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      stroke="rgba(255,255,255,0.08)"
                      strokeWidth="3"
                      fill="none"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      stroke="url(#cwv-g3)"
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray="100 100"
                      strokeDashoffset="12"
                      transform="rotate(-90 18 18)"
                    />
                    <defs>
                      <linearGradient id="cwv-g3" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#a78bfa" />
                        <stop offset="100%" stopColor="#7c5cff" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="cwv-label">
                    INP
                    <br />
                    <b>120ms</b>
                  </div>
                </div>
              </div>
              <div className="cwv-bar">
                <span>Before</span>
                <span className="cwv-arrow">→</span>
                <span>After</span>
              </div>
              <span className="case-tag">Frontend Platform</span>
            </div>
            <div className="case-body">
              <div className="case-meta">
                <span className="case-year">2023</span>
                <span className="case-role">Performance Lead</span>
              </div>
              <h3 className="case-title">Web Vitals Turnaround</h3>
              <p className="case-desc">
                Critical CSS, route-level code splitting, edge-cached HTML, font subsetting and an
                INP audit — moved a flagship app firmly into the green.
              </p>
              <div className="case-stats">
                <div className="case-stat">
                  <span className="num">4.2 → 1.1s</span>
                  <span className="lbl">LCP</span>
                </div>
                <div className="case-stat">
                  <span className="num">0.18 → 0.01</span>
                  <span className="lbl">CLS</span>
                </div>
                <div className="case-stat">
                  <span className="num">+22%</span>
                  <span className="lbl">Conversions</span>
                </div>
              </div>
              <div className="case-stack">
                <span>Vite</span>
                <span>Critical CSS</span>
                <span>Edge cache</span>
                <span>INP audit</span>
              </div>
            </div>
          </article>

          <article
            className={`case-card case-card--wide reveal in${
              isVisible('beyond') ? '' : ' hidden'
            }`}
            data-cat="beyond"
          >
            <div className="case-visual visual-photo" aria-hidden="true">
              <div className="photo-mosaic">
                <span style={{ backgroundImage: "url('/images/portfolio/img6.jpg')" }}></span>
                <span style={{ backgroundImage: "url('/images/portfolio/img7.jpg')" }}></span>
                <span style={{ backgroundImage: "url('/images/portfolio/img8.jpg')" }}></span>
                <span style={{ backgroundImage: "url('/images/portfolio/img9.jpg')" }}></span>
              </div>
              <span className="case-tag">Beyond Code</span>
            </div>
            <div className="case-body">
              <div className="case-meta">
                <span className="case-year">Always</span>
                <span className="case-role">Curator</span>
              </div>
              <h3 className="case-title">Capture · Light &amp; Geometry</h3>
              <p className="case-desc">
                Off the keyboard I shoot — light, lines, and the small geometries of cities. The
                same eye for composition I bring to interfaces.
              </p>
              <div className="case-stats">
                <div className="case-stat">
                  <span className="num">∞</span>
                  <span className="lbl">Frames</span>
                </div>
                <div className="case-stat">
                  <span className="num">35mm</span>
                  <span className="lbl">Favourite</span>
                </div>
                <div className="case-stat">
                  <span className="num">RAW</span>
                  <span className="lbl">Always</span>
                </div>
              </div>
              <div className="case-stack">
                <span>Composition</span>
                <span>Color</span>
                <span>Light</span>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
