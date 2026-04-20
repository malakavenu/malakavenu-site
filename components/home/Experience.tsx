type Job = {
  badge?: string;
  date: string;
  title: string;
  company: string;
  description: React.ReactNode;
  stack: string[];
};

const JOBS: Job[] = [
  {
    badge: 'Now',
    date: '2022 — Present',
    title: 'Frontend Architect — AI & Agentic Systems',
    company: 'Enterprise Product Engineering',
    description: (
      <>
        Lead frontend architecture for multi-team, multi-product Angular &amp; React platforms. Run
        a continuous Angular upgrade program — shipped every major from{' '}
        <strong>v2 through v21</strong> on the 6-month cadence, keeping platforms always on the
        latest LTS. Drive AI &amp; agentic feature delivery on AWS Bedrock and MCP, design
        multi-agent orchestrations, and own the design-systems &amp; frontend platform strategy.
      </>
    ),
    stack: [
      'Angular 2 → 21',
      'React',
      'AWS Bedrock',
      'MCP',
      'LangGraph',
      'Nx',
      'Module Federation',
    ],
  },
  {
    date: 'Dec 2016 — 2022',
    title: 'Senior Front End Developer',
    company: 'Ford — via Cognizant Technology Solutions',
    description:
      'Built customer-facing web platforms for Ford. Led component library work, performance hardening, and onboarded multiple feature teams to a shared frontend foundation.',
    stack: ['Angular 2 → 14', 'RxJS', 'NgRx', 'SCSS', 'D3', 'Storybook'],
  },
  {
    date: 'May 2015 — Dec 2016',
    title: 'Web Developer',
    company: 'Pearson Tutor Services — Cognizant',
    description:
      'Delivered learner-facing tutoring experiences with deep focus on accessibility, theming and internationalization for global student audiences.',
    stack: ['JavaScript', 'jQuery', 'Handlebars', 'Bootstrap', 'PHP'],
  },
  {
    date: 'Dec 2014 — May 2015',
    title: 'UX/UI Designer',
    company: 'Cognizant Technology Solutions',
    description:
      'Started my career designing and prototyping enterprise interfaces — the design DNA that still informs every architectural decision I make today.',
    stack: ['Photoshop', 'Wireframing', 'Prototyping', 'HTML / CSS'],
  },
];

export function Experience() {
  return (
    <section id="experience" className="section">
      <div className="container">
        <div className="section-head reveal in">
          <span className="section-eyebrow">Experience</span>
          <h2 className="section-title">
            Over a decade across <span className="grad">design</span>,{' '}
            <span className="grad">platform</span> &amp; <span className="grad">AI</span>
          </h2>
        </div>

        <div className="timeline">
          {JOBS.map((job) => (
            <div key={job.title} className="tl-item reveal in">
              <div className="tl-card">
                <div className="tl-meta">
                  {job.badge && <span className="badge">{job.badge}</span>}
                  <span>{job.date}</span>
                </div>
                <h3>{job.title}</h3>
                <div className="company">{job.company}</div>
                <p>{job.description}</p>
                <div className="tl-stack">
                  {job.stack.map((s) => (
                    <span key={s}>{s}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
