type Skill = { label: string; hot?: boolean };
type Group = {
  title: string;
  variant: string;
  count: string;
  featured?: boolean;
  icon: React.ReactNode;
  skills: Skill[];
};

const GROUPS: Group[] = [
  {
    title: 'AI & Agentic Systems',
    variant: 'v2',
    count: '18 skills · primary focus',
    featured: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v6m0 10v6m11-11h-6M7 12H1m17.07-7.07l-4.24 4.24M9.17 14.83l-4.24 4.24m14.14 0l-4.24-4.24M9.17 9.17L4.93 4.93" />
      </svg>
    ),
    skills: [
      { label: 'Agent Skills', hot: true },
      { label: 'Subagents', hot: true },
      { label: 'MCP Servers (build & consume)', hot: true },
      { label: 'Multi-Agent Orchestration', hot: true },
      { label: 'AWS Bedrock' },
      { label: 'OpenAI · Anthropic · Claude' },
      { label: 'LangChain · LangGraph' },
      { label: 'Tool / Function Calling' },
      { label: 'RAG Pipelines' },
      { label: 'Vector Databases · Embeddings' },
      { label: 'Streaming · SSE · Token UI' },
      { label: 'Generative UI' },
      { label: 'Agent Memory · Context Engineering' },
      { label: 'AI Evals · Traces · Observability' },
      { label: 'Sandboxed Code Execution' },
      { label: 'Inference Routing' },
      { label: 'Prompt Engineering' },
      { label: 'LLM Guardrails' },
    ],
  },
  {
    title: 'Frontend Architecture',
    variant: 'v1',
    count: '12 skills',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    skills: [
      { label: 'Angular 2 → 21 (every release)', hot: true },
      { label: 'React 18 / 19' },
      { label: 'Next.js' },
      { label: 'TypeScript' },
      { label: 'RxJS' },
      { label: 'NgRx · Signals' },
      { label: 'Redux · Zustand' },
      { label: 'Micro-Frontends' },
      { label: 'Module Federation' },
      { label: 'Nx Monorepo' },
      { label: 'SSR / Hydration' },
      { label: 'Performance & Web Vitals' },
    ],
  },
  {
    title: 'Design Systems Strategy',
    variant: 'v3',
    count: '10 skills',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
    skills: [
      { label: 'Design Tokens (W3C)' },
      { label: 'Storybook' },
      { label: 'Stencil · Web Components' },
      { label: 'Framework-agnostic primitives' },
      { label: 'Figma → Code' },
      { label: 'Theming · Multi-brand' },
      { label: 'Accessibility (WCAG 2.2)' },
      { label: 'Visual Regression' },
      { label: 'Adoption & Governance' },
      { label: 'Material Design' },
    ],
  },
  {
    title: 'Frontend Platform Engineering',
    variant: 'v4',
    count: '10 skills',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="7.5 4.21 12 6.81 16.5 4.21" />
        <polyline points="7.5 19.79 7.5 14.6 3 12" />
        <polyline points="21 12 16.5 14.6 16.5 19.79" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    skills: [
      { label: 'Vite · Webpack · esbuild' },
      { label: 'Node.js · Express · Fastify' },
      { label: 'BFF / GraphQL' },
      { label: 'CI/CD · GitHub Actions' },
      { label: 'Docker' },
      { label: 'AWS (S3, CloudFront, Lambda)' },
      { label: 'Observability' },
      { label: 'Feature Flags' },
      { label: 'Testing (Jest · Playwright · Cypress)' },
      { label: 'Developer Experience' },
    ],
  },
  {
    title: 'Core Web & UI',
    variant: 'v5',
    count: '9 skills',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </svg>
    ),
    skills: [
      { label: 'HTML5' },
      { label: 'CSS3 · SCSS' },
      { label: 'Tailwind CSS' },
      { label: 'JavaScript (ES2024)' },
      { label: 'Responsive · Mobile-first' },
      { label: 'Animation · GSAP' },
      { label: 'D3.js · Charting' },
      { label: 'SEO & Core Web Vitals' },
      { label: 'PWA' },
    ],
  },
  {
    title: 'Leadership & Practice',
    variant: 'v6',
    count: '8 skills',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    skills: [
      { label: 'Tech Leadership' },
      { label: 'Architecture Reviews' },
      { label: 'Mentoring & Coaching' },
      { label: 'RFC / ADR Process' },
      { label: 'Roadmap & OKRs' },
      { label: 'Stakeholder Communication' },
      { label: 'Agile / Scrum' },
      { label: 'Hiring & Interviewing' },
    ],
  },
];

export function Skills() {
  return (
    <section id="skills" className="section" style={{ paddingTop: 0 }}>
      <div className="container">
        <div className="section-head reveal in">
          <span className="section-eyebrow">Skills</span>
          <h2 className="section-title">
            An <span className="grad">AI-first</span>, full-spectrum engineering stack
          </h2>
          <p className="section-subtitle">
            Curated around the AI &amp; agentic patterns that are reshaping product engineering —
            backed by a deep frontend &amp; design-systems foundation.
          </p>
        </div>

        <div className="skills-grid">
          {GROUPS.map((g, i) => (
            <div
              key={g.title}
              className={`skill-card ${g.variant}${g.featured ? ' skill-card--featured' : ''} reveal in${
                i % 2 === 1 ? ' delay-1' : ''
              }`}
            >
              <div className="skill-head">
                <span className="icon">{g.icon}</span>
                <h3>{g.title}</h3>
                <span className="count">{g.count}</span>
              </div>
              <div className="skill-list">
                {g.skills.map((s) => (
                  <span
                    key={s.label}
                    className={`skill-pill${s.hot ? ' hot' : ''}`}
                  >
                    <span className="dotc"></span>
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
