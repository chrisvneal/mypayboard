import { Reveal } from './Reveal'

export function BuiltForTwo() {
  return (
    <section id="together">
      <div className="wrap together">
        <Reveal className="together-copy">
          <div className="eyebrow">
            <span className="dot" />
            Built for two
          </div>
          <h2>Finally, a budget your partner actually wants to open.</h2>
          <p className="lead">
            Most budgeting apps are built for one person to manage and another to be managed by. MyPayBoard
            is full visibility, both ways — no hidden accounts, no &quot;let me check and get back to
            you.&quot;
          </p>

          <div className="feature-list">
            <div className="feature-item">
              <div className="icon">
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2C7A48"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div className="txt">
                <h4>Leave a note on the paycheck</h4>
                <p>
                  Every board has its own thread — &quot;paid this early, we had the room&quot; beats a
                  confused text three days later.
                </p>
              </div>
            </div>
            <div className="feature-item">
              <div className="icon">
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2C7A48"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21v-1a7 7 0 0 1 14 0v1" />
                  <circle cx="19" cy="7" r="3" />
                </svg>
              </div>
              <div className="txt">
                <h4>Named cards, shared view</h4>
                <p>See whose paycheck funds what, without needing separate logins or accounts.</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="icon">
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2C7A48"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                </svg>
              </div>
              <div className="txt">
                <h4>Save a setup as a template</h4>
                <p>
                  Turn a board you&apos;ve built into a reusable template, so next month starts from where
                  you already are.
                </p>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal>
          <div className="mock-panel">
            <div className="mock-head">
              <div className="mock-title">Biweekly Payroll · Jun 1</div>
              <div className="avatar-stack">
                <div className="av av-c">A</div>
                <div className="av av-n">J</div>
              </div>
            </div>
            <div className="msg-thread">
              <div className="msg msg-theirs">
                <div className="msg-name">Jordan</div>
                Paid the electric bill early, we had the room
              </div>
              <div className="msg msg-mine">
                <div className="msg-name" style={{ opacity: 0.85 }}>
                  Alex
                </div>
                Nice — bumping the car payment up too then
              </div>
            </div>
            <div className="mock-input">
              <span>Leave a message…</span>
              <div className="send">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
