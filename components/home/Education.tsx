export function Education() {
  return (
    <section id="education" className="section" style={{ paddingTop: 0 }}>
      <div className="container">
        <div className="section-head reveal in">
          <span className="section-eyebrow">Education</span>
          <h2 className="section-title">Foundations</h2>
        </div>

        <div className="edu-grid">
          <div className="edu-card reveal in">
            <div className="yr">2010 — 2014</div>
            <h3>Bachelor of Technology</h3>
            <p>JNTU Anantapur · Computer Science</p>
          </div>
          <div className="edu-card reveal in delay-1">
            <div className="yr">Always</div>
            <h3>Continuous learning</h3>
            <p>
              Tracking the AI / agentic frontier — papers, MCP server building, weekend agent
              demos.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
