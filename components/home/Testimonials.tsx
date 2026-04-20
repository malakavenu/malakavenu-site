type Quote = { initials: string; name: string; role: string; quote: string };

const QUOTES: Quote[] = [
  {
    initials: 'FL',
    name: 'Fritz Lamour',
    role: 'Founder · Media platform',
    quote:
      "Venu is simply amazing. The work he does is exceptional. Always professional, always in touch. He is on a higher level than other developers I've worked with — you can't go wrong hiring him.",
  },
  {
    initials: 'W',
    name: 'Woody',
    role: 'Owner · Local services platform',
    quote:
      "Venu is excellent. He continues to help me with the site. Professional, dedicated and trustworthy. I got lucky when I found him — he's the kind of engineer you want on every project.",
  },
  {
    initials: 'MB',
    name: 'Mitchell Bank',
    role: 'Founder · Travel commerce',
    quote:
      'Not only did Venu deliver a first-rate product, he was professional and friendly. I cannot sing his praises enough — a first-rate developer and a genuinely good person to work with.',
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="section" style={{ paddingTop: 0 }}>
      <div className="container">
        <div className="section-head reveal in">
          <span className="section-eyebrow">Testimonials</span>
          <h2 className="section-title">
            Words from people I&apos;ve <span className="grad">worked with</span>
          </h2>
        </div>

        <div className="t-grid">
          {QUOTES.map((q, i) => (
            <div key={q.name} className={`t-card reveal in${i ? ` delay-${i}` : ''}`}>
              <div className="quote">&ldquo;</div>
              <p>{q.quote}</p>
              <div className="t-author">
                <div className="t-avatar">{q.initials}</div>
                <div className="who">
                  <h5>{q.name}</h5>
                  <span>{q.role}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
