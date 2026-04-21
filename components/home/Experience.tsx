type Role = {
  title: string;
  date: string;
  description: string;
  current?: boolean;
};

type Company = {
  name: string;
  tenure: string;
  roles: Role[];
  stack: string[];
};

const COMPANIES: Company[] = [
  {
    name: 'Epsilon India',
    tenure: 'Apr 2021 — Present · 5+ yrs',
    roles: [
      {
        title: 'Lead Software Engineer',
        date: 'Mar 2023 → Present',
        current: true,
        description:
          'Architecting the agentic layer between LLMs and enterprise products — a supervisor dispatching specialised subagents through portable Agent Skills and custom MCP servers on AWS Bedrock. Simultaneously keeping the Angular estate on the bleeding edge: every major from v2 → v21 shipped on cadence, plus a 60-component design system adopted by 8 product teams.',
      },
      {
        title: 'Senior Software Engineer',
        date: 'Apr 2021 → Feb 2023',
        description:
          'Took ownership of the Angular upgrade runway (v10 → v14+) and carved out reusable feature libraries on Nx that halved duplicated UI across four product teams. Stood up the first Storybook + visual-regression pipeline and pushed LCP from 3.8 s to 1.4 s.',
      },
    ],
    stack: ['Angular 2 → 21', 'React', 'AWS Bedrock', 'MCP', 'LangGraph', 'Nx', 'Module Federation', 'Storybook'],
  },
  {
    name: 'Accenture',
    tenure: 'Jun 2018 — Apr 2021 · ~3 yrs',
    roles: [
      {
        title: 'Application Development Team Lead',
        date: 'Dec 2019 → Apr 2021',
        description:
          'Ran architecture and sprint delivery for a customer-facing Angular platform. Drove the v8 → v11 migration that trimmed bundle size by ~35 % and TTI by nearly two seconds, while lifting test coverage from 45 % to 82 %.',
      },
      {
        title: 'Application Development Senior Analyst',
        date: 'Jun 2018 → Nov 2019',
        description:
          'Built the core module layer — routing, guards, interceptors, state — for enterprise Angular SPAs serving thousands. Shipped real-time dashboards with RxJS streams and WebSockets and owned the integration surface to REST + GraphQL APIs.',
      },
    ],
    stack: ['Angular 6 → 11', 'TypeScript', 'RxJS', 'NgRx', 'GraphQL', 'SCSS', 'Cypress', 'Jenkins'],
  },
  {
    name: 'Cognizant Technology Solutions',
    tenure: 'Mar 2015 — Jun 2018 · 3 yrs 4 mo',
    roles: [
      {
        title: 'Programmer Analyst',
        date: 'Mar 2015 → Jun 2018',
        description:
          'Where it all started — building Ford\'s customer-facing Angular apps from the v2 era onward, standing up D3.js analytics dashboards, and learning the craft of shared component libraries. A formative stint as UX/UI designer on Pearson Tutor Services planted the design DNA that still shapes how I think about frontends.',
      },
    ],
    stack: ['Angular 2 → 14', 'RxJS', 'NgRx', 'D3.js', 'Storybook', 'SCSS', 'jQuery'],
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

        <div className="company-timeline">
          {COMPANIES.map((co) => (
            <div key={co.name} className="co-card reveal in">
              <div className="co-header">
                <h3 className="co-name">{co.name}</h3>
                <span className="co-tenure">{co.tenure}</span>
              </div>

              <div className="co-roles">
                  {co.roles.map((role, i) => (
                    <div
                      key={`${role.title}-${role.date}`}
                      className={`co-role${role.current ? ' co-role--current' : ''}${i < co.roles.length - 1 ? ' co-role--connected' : ''}`}
                  >
                    <div className="co-role-dot" />
                    <div className="co-role-body">
                      <div className="co-role-head">
                        <span className="co-role-title">{role.title}</span>
                        {role.current && <span className="co-role-badge">Now</span>}
                        <span className="co-role-date">{role.date}</span>
                      </div>
                      {i < co.roles.length - 1 && (
                        <span className="co-promoted">&#9650; Promoted</span>
                      )}
                      <p>{role.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="co-stack">
                {co.stack.map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
