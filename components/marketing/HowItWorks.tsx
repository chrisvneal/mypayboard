import { Reveal } from './Reveal'

export function HowItWorks() {
  return (
    <section className="how" id="how">
      <div className="wrap">
        <div className="section-head center">
          <div className="eyebrow" style={{ margin: '0 auto 18px', width: 'fit-content' }}>
            <span className="dot" />
            Getting started
          </div>
          <h2>How a board comes together.</h2>
          <p>
            No accounts to link, no setup wizard to fight through — just boards built around whenever
            money&apos;s landing, paycheck or otherwise.
          </p>
        </div>
        <div className="steps">
          <Reveal className="step">
            <div className="step-head">
              <div className="icon-badge badge-gold">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div className="step-num num-gold">1</div>
            </div>
            <h3>Add your paycheck</h3>
            <p>
              Every paycheck starts a new planning card. Add any income you expect this month — from work,
              gifts, or anything else.
            </p>
          </Reveal>
          <Reveal className="step">
            <div className="step-head">
              <div className="icon-badge badge-green">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              </div>
              <div className="step-num num-green">2</div>
            </div>
            <h3>Cover what&apos;s due</h3>
            <p>Assign bills and expenses to the paycheck that will cover them before they&apos;re due.</p>
          </Reveal>
          <Reveal className="step">
            <div className="step-head">
              <div className="icon-badge badge-blue">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 1l4 4-4 4" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <path d="M7 23l-4-4 4-4" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
              </div>
              <div className="step-num num-blue">3</div>
            </div>
            <h3>You&apos;re ready for next month</h3>
            <p>
              Check off bills as you pay them and watch what&apos;s left update in real time. When the month
              wraps, save the board as a template so next month&apos;s is one click away.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
