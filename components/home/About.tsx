export function About() {
  return (
    <section id="about" className="section">
      <div className="container">
        <div className="section-head reveal in">
          <span className="section-eyebrow">About me</span>
          <h2 className="section-title">
            A frontend engineer who{' '}
            <span className="grad">thinks like a platform architect</span>
          </h2>
          <p className="section-subtitle">
            Based in Bangalore, India. I started as a UI/UX designer and grew into a frontend
            architect who today builds AI-native product experiences and the platforms that make
            them possible at scale.
          </p>
        </div>

        <div className="expertise-grid">
          <div className="exp-card exp-card--featured reveal in">
            <span className="exp-flag">Primary focus</span>
            <div className="exp-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                <path d="M2 12h20" />
              </svg>
            </div>
            <h3>AI &amp; Agentic Systems</h3>
            <p>
              Building <strong>agent skills</strong>, <strong>subagents</strong>,{' '}
              <strong>MCP servers</strong> and multi-agent orchestrations on AWS Bedrock, OpenAI
              &amp; Anthropic — with streaming generative UI woven into production frontends.
            </p>
            <div className="exp-tags">
              <span>Agent Skills</span>
              <span>Subagents</span>
              <span>MCP Servers</span>
              <span>Bedrock</span>
              <span>LangGraph</span>
              <span>RAG</span>
            </div>
          </div>

          <div className="exp-card reveal in delay-1">
            <div className="exp-icon">
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
            </div>
            <h3>Frontend Architecture</h3>
            <p>
              Scaling Angular &amp; React platforms — micro-frontends, module federation,
              performance budgets and frontend governance for multi-team enterprises.
            </p>
            <div className="exp-tags">
              <span>Angular 2 → 21</span>
              <span>React</span>
              <span>Nx Monorepo</span>
              <span>Module Federation</span>
            </div>
          </div>

          <div className="exp-card reveal in delay-2">
            <div className="exp-icon">
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
            </div>
            <h3>Design Systems &amp; Platform</h3>
            <p>
              Design-systems strategy and frontend platform engineering — tokens, primitives,
              framework-agnostic components, tooling and DX that compounds product velocity.
            </p>
            <div className="exp-tags">
              <span>Design Tokens</span>
              <span>Storybook</span>
              <span>Web Components</span>
              <span>Figma → Code</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
