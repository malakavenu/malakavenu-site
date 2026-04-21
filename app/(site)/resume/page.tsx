import type { Metadata } from 'next';
import Image from 'next/image';
import { JsonLd } from '@/components/site/JsonLd';
import { breadcrumbLd, buildMetadata, profilePageLd } from '@/lib/seo';
import { SITE } from '@/lib/site';
import './resume.css';

export const metadata: Metadata = buildMetadata({
  title: 'Resume — Malaka Venugopal Reddy',
  description:
    'Resume of Malaka Venugopal Reddy — AI & Agentic Systems Engineer · Frontend Architect. 11+ years scaling Angular & React platforms.',
  path: '/resume',
  type: 'profile',
});

export default function ResumePage() {
  return (
    <>
      <JsonLd data={profilePageLd()} />
      <JsonLd
        data={breadcrumbLd([
          { name: 'Home', url: `${SITE.url}/` },
          { name: 'Resume', url: `${SITE.url}/resume` },
        ])}
      />

      <div className="resume-root">
        <div className="page">
          <aside className="sidebar">
            <div className="avatar-block">
              <div className="avatar-ring">
                <Image
                  src="/images/avatar.png"
                  alt="Malaka Venugopal Reddy"
                  width={156}
                  height={156}
                />
              </div>
            </div>
            <div className="name-block">
              <div className="label">Curriculum Vitae</div>
              <h1>
                Malaka <span className="grad">Venugopal</span> Reddy
              </h1>
              <span className="role-pill">AI &amp; Agentic Systems · Frontend Architect</span>
            </div>

            <div className="side-section">
              <h3>Contact</h3>
              <ul className="contact-list">
                <li>
                  <svg
                    className="ico"
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
                  <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
                </li>
                <li>
                  <svg
                    className="ico"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  {SITE.phone}
                </li>
                <li>
                  <svg
                    className="ico"
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
                  Bangalore, India
                </li>
                <li>
                  <svg className="ico" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                  <a href={SITE.socials.linkedin}>linkedin.com/in/venumalaka</a>
                </li>
                <li>
                  <svg className="ico" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  <a href={SITE.socials.github}>github.com/malakavenu</a>
                </li>
                <li>
                  <svg
                    className="ico"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                  <a href={SITE.url}>malakavenu.com</a>
                </li>
              </ul>
            </div>

            <div className="side-section">
              <h3>Core Skills</h3>

              <div className="skill-group">
                <div className="name">AI &amp; Agentic Systems</div>
                <div className="skill-pills">
                  <span className="hot">Agent Skills</span>
                  <span className="hot">Subagents</span>
                  <span className="hot">MCP Servers</span>
                  <span className="hot">Multi-Agent</span>
                  <span>AWS Bedrock</span>
                  <span>OpenAI · Anthropic</span>
                  <span>LangChain · LangGraph</span>
                  <span>RAG · Vector DBs</span>
                  <span>Generative &amp; Streaming UI</span>
                  <span>AI Evals · Traces</span>
                </div>
              </div>

              <div className="skill-group">
                <div className="name">Frontend Architecture</div>
                <div className="skill-pills">
                  <span className="hot">Angular 2 → 21</span>
                  <span className="hot">Every 6-mo release</span>
                  <span>React 18 / 19</span>
                  <span>Next.js</span>
                  <span>TypeScript</span>
                  <span>RxJS · NgRx · Signals</span>
                  <span>Micro-Frontends</span>
                  <span>Module Federation</span>
                  <span>Nx Monorepo</span>
                </div>
              </div>

              <div className="skill-group">
                <div className="name">Design Systems</div>
                <div className="skill-pills">
                  <span>Design Tokens</span>
                  <span>Storybook</span>
                  <span>Figma → Code</span>
                  <span>Web Components</span>
                  <span>Stencil · Lit</span>
                  <span>WCAG 2.2</span>
                </div>
              </div>

              <div className="skill-group">
                <div className="name">Platform &amp; Tooling</div>
                <div className="skill-pills">
                  <span>Node.js</span>
                  <span>Vite · Webpack</span>
                  <span>AWS · Lambda</span>
                  <span>Docker</span>
                  <span>GitHub Actions</span>
                  <span>Playwright</span>
                  <span>Jest · Cypress</span>
                </div>
              </div>

              <div className="skill-group">
                <div className="name">Core Web</div>
                <div className="skill-pills">
                  <span>HTML5</span>
                  <span>CSS3 · SCSS</span>
                  <span>Tailwind</span>
                  <span>JavaScript ES2024</span>
                  <span>D3.js</span>
                  <span>Material Design</span>
                </div>
              </div>
            </div>

            <div className="side-section">
              <h3>Languages</h3>
              <div className="lang-row">
                <span>English</span>
                <span>Professional</span>
              </div>
              <div className="lang-row">
                <span>Telugu</span>
                <span>Native</span>
              </div>
              <div className="lang-row">
                <span>Hindi</span>
                <span>Conversational</span>
              </div>
            </div>
          </aside>

          <main className="main">
            <div className="main-header">
              <div className="eyebrow">Profile</div>
              <h2>
                Shipping <span className="grad">AI agents</span> and the{' '}
                <span className="grad">intelligent frontends</span> they live in.
              </h2>
              <p>
                AI &amp; Agentic Systems Engineer building <strong>agent skills</strong>,{' '}
                <strong>subagents</strong> and <strong>MCP servers</strong> on AWS Bedrock, OpenAI
                &amp; Anthropic — woven into production frontends, generative UI and design systems.
                Backed by 11+ years scaling Angular (v2 → v21) &amp; React platforms for global
                enterprises and a UI/UX foundation that bridges product, design and infrastructure.
              </p>
            </div>

            <section className="block">
              <h3>
                <svg
                  className="ico"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                Areas of Expertise
              </h3>
              <div className="pillars">
                <div className="pillar">
                  <div className="pname">
                    <span className="dot"></span>AI &amp; Agentic Systems{' '}
                    <em
                      style={{
                        fontStyle: 'normal',
                        color: '#6b7a90',
                        fontWeight: 500,
                        fontSize: '0.85em',
                      }}
                    >
                      · primary focus
                    </em>
                  </div>
                  <p>
                    Agent skills · subagents · MCP servers · multi-agent orchestration · AWS
                    Bedrock · OpenAI · Anthropic · RAG · streaming generative UI · evals &amp;
                    traces.
                  </p>
                </div>
                <div className="pillar">
                  <div className="pname">
                    <span className="dot"></span>Frontend Architecture
                  </div>
                  <p>
                    Scalable Angular &amp; React platforms · micro-frontends · module federation
                    · performance budgets · governance.
                  </p>
                </div>
                <div className="pillar">
                  <div className="pname">
                    <span className="dot"></span>Design Systems &amp; Platform
                  </div>
                  <p>
                    Design tokens · Storybook · framework-agnostic primitives · DX tooling that
                    compounds product velocity.
                  </p>
                </div>
              </div>
            </section>

            <section className="block">
              <h3>
                <svg
                  className="ico"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
                Professional Experience
              </h3>

              <div className="co-block">
                <div className="co-block-head">
                  <div className="co-block-name">Epsilon India</div>
                  <div className="co-block-tenure">5+ yrs</div>
                </div>
                <div className="co-block-roles">
                  <div className="co-block-role co-block-role--connected">
                    <div className="co-block-dot"></div>
                    <div className="co-block-role-body">
                      <div className="exp-head">
                        <div className="exp-title">Lead Software Engineer</div>
                        <div className="exp-date">Mar 2023 — Present</div>
                      </div>
                      <p className="co-block-desc">
                        Supervisor + subagent architecture with portable Agent Skills and custom
                        MCP servers on AWS Bedrock — 12 subagents, 8 MCP servers, −40%
                        time-to-resolve. Angular v2 → v21 on the 6-month cadence. 60-component
                        design system, 95% adoption.
                      </p>
                    </div>
                  </div>
                  <div className="co-block-promoted">&#9650; Promoted</div>
                  <div className="co-block-role">
                    <div className="co-block-dot"></div>
                    <div className="co-block-role-body">
                      <div className="exp-head">
                        <div className="exp-title">Senior Software Engineer</div>
                        <div className="exp-date">Apr 2021 — Feb 2023</div>
                      </div>
                      <p className="co-block-desc">
                        Angular upgrade runway v10 → v14+, Nx feature libraries cutting
                        duplicated UI ~50%. Storybook + visual-regression pipeline. LCP 3.8 s →
                        1.4 s.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="exp-stack">
                  <span>Angular 2 → 21</span>
                  <span>React</span>
                  <span>AWS Bedrock</span>
                  <span>MCP</span>
                  <span>LangGraph</span>
                  <span>Nx</span>
                  <span>Storybook</span>
                </div>
              </div>

              <div className="co-block">
                <div className="co-block-head">
                  <div className="co-block-name">Accenture</div>
                  <div className="co-block-tenure">~3 yrs</div>
                </div>
                <div className="co-block-roles">
                  <div className="co-block-role co-block-role--connected">
                    <div className="co-block-dot"></div>
                    <div className="co-block-role-body">
                      <div className="exp-head">
                        <div className="exp-title">Application Development Team Lead</div>
                        <div className="exp-date">Dec 2019 — Apr 2021</div>
                      </div>
                      <p className="co-block-desc">
                        Architecture &amp; delivery for a customer-facing Angular platform.
                        Angular 8 → 11 upgrade — bundle size −35%, TTI −1.8 s. Test coverage
                        45% → 82%.
                      </p>
                    </div>
                  </div>
                  <div className="co-block-promoted">&#9650; Promoted</div>
                  <div className="co-block-role">
                    <div className="co-block-dot"></div>
                    <div className="co-block-role-body">
                      <div className="exp-head">
                        <div className="exp-title">Application Development Senior Analyst</div>
                        <div className="exp-date">Jun 2018 — Nov 2019</div>
                      </div>
                      <p className="co-block-desc">
                        Core modules, reusable UI components and real-time dashboards with RxJS
                        &amp; WebSockets for enterprise Angular SPAs.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="exp-stack">
                  <span>Angular 6 → 11</span>
                  <span>RxJS</span>
                  <span>NgRx</span>
                  <span>GraphQL</span>
                  <span>Cypress</span>
                  <span>Jenkins</span>
                </div>
              </div>

              <div className="co-block">
                <div className="co-block-head">
                  <div className="co-block-name">Cognizant Technology Solutions</div>
                  <div className="co-block-tenure">3 yrs 4 mo</div>
                </div>
                <div className="co-block-roles">
                  <div className="co-block-role">
                    <div className="co-block-dot"></div>
                    <div className="co-block-role-body">
                      <div className="exp-head">
                        <div className="exp-title">Programmer Analyst</div>
                        <div className="exp-date">Mar 2015 — Jun 2018</div>
                      </div>
                      <p className="co-block-desc">
                        Ford customer-facing Angular apps v2 → v14, D3.js analytics dashboards,
                        shared component library. Early UX/UI design on Pearson Tutor Services.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="exp-stack">
                  <span>Angular 2 → 14</span>
                  <span>RxJS</span>
                  <span>NgRx</span>
                  <span>D3.js</span>
                  <span>Storybook</span>
                  <span>SCSS</span>
                </div>
              </div>
            </section>

            <section className="block">
              <h3>
                <svg
                  className="ico"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c3 3 9 3 12 0v-5" />
                </svg>
                Education
              </h3>
              <div className="resume-edu-grid">
                <div className="resume-edu-item">
                  <div className="yr">2010 — 2014</div>
                  <h4>Bachelor of Technology (B.Tech.)</h4>
                  <p>JNTUA College of Engineering, Anantapur · ECE</p>
                </div>
                <div className="resume-edu-item">
                  <div className="yr">2008 — 2010</div>
                  <h4>Board of Secondary Education, MPC</h4>
                  <p>Sri Chaitanya Junior College, Tirupati</p>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </>
  );
}
