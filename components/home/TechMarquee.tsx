const ITEMS = [
  'Angular',
  'React',
  'TypeScript',
  'AWS Bedrock',
  'Model Context Protocol',
  'LangChain · LangGraph',
  'Multi-Agent Orchestration',
  'Design Systems',
  'Storybook',
  'Nx · Module Federation',
  'Micro-Frontends',
  'Next.js',
];

export function TechMarquee() {
  const items = [...ITEMS, ...ITEMS];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {items.map((label, i) => (
          <span key={i} className="marquee-item">
            {label}
            <span className="dot"></span>
          </span>
        ))}
      </div>
    </div>
  );
}
