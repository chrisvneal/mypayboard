import { Reveal } from './Reveal'

export function CardShowcase() {
  return (
    <section className="showcase">
      <div className="wrap">
        <div className="section-head center">
          <div className="eyebrow" style={{ margin: '0 auto 18px', width: 'fit-content' }}>
            <span className="dot" />
            Inside a paycheck
          </div>
          <h2>Every bill, right where it&apos;s due.</h2>
          <p>
            Each card holds exactly what that paycheck needs to cover. Check bills off as you pay them and
            watch what&apos;s left update as you go.
          </p>
        </div>

        <Reveal className="showcase-stage">
          <div className="showcase-blob blob-gold" />
          <div className="showcase-blob blob-blue" />

          <div className="showcase-card-wrap">
            <div className="sc-callout callout-1">
              <span className="sc-callout-check">✓</span>
              Check off as you pay
            </div>
            <div className="sc-callout callout-2">Remaining updates instantly</div>

            <div className="showcase-card showcase-card-2">
              <div className="sc-head">
                <div className="sc-avatar">J</div>
                <div className="sc-title">
                  <div className="sc-name">Freelance client · Aug 5</div>
                  <div className="sc-owner">Jamie</div>
                </div>
                <div className="sc-amount">
                  <div className="sc-amt">$450.00</div>
                  <div className="sc-amt-lbl">Pay amount</div>
                </div>
              </div>

              <div className="sc-body">
                <div className="sc-tabs">
                  <span className="sc-tab">
                    Unpaid <em>0</em>
                  </span>
                  <span className="sc-tab active">
                    Paid <em>2</em>
                  </span>
                  <span className="sc-tab">Messages</span>
                </div>

                <div className="sc-cols">
                  <span>Bill name</span>
                  <span>Due date</span>
                  <span>Amount</span>
                </div>

                <div className="sc-rows">
                  <div className="sc-row paid">
                    <span className="sc-name-cell">
                      <i className="sc-chk checked" />
                      Groceries
                    </span>
                    <span className="sc-due">8/2</span>
                    <span className="sc-amt-cell">$85.00</span>
                  </div>
                  <div className="sc-row paid">
                    <span className="sc-name-cell">
                      <i className="sc-chk checked" />
                      Gas
                    </span>
                    <span className="sc-due">7/29</span>
                    <span className="sc-amt-cell">$40.00</span>
                  </div>
                </div>
              </div>

              <div className="sc-footer">
                <div>
                  <div className="sc-foot-val">$125.00</div>
                  <div className="sc-foot-lbl">Total expenses</div>
                </div>
                <div className="sc-foot-right">
                  <div className="sc-foot-val remaining">$325.00</div>
                  <div className="sc-foot-lbl">Remaining</div>
                </div>
              </div>
            </div>

            <div className="showcase-card">
              <div className="sc-head">
                <div className="sc-avatar">M</div>
                <div className="sc-title">
                  <div className="sc-name">Design Studio · Aug 1</div>
                  <div className="sc-owner">Mark</div>
                </div>
                <div className="sc-amount">
                  <div className="sc-amt">$1,000.00</div>
                  <div className="sc-amt-lbl">Pay amount</div>
                </div>
              </div>

              <div className="sc-body">
                <div className="sc-tabs">
                  <span className="sc-tab active">
                    Unpaid <em>5</em>
                  </span>
                  <span className="sc-tab">
                    Paid <em>0</em>
                  </span>
                  <span className="sc-tab">Messages</span>
                </div>

                <div className="sc-cols">
                  <span>Bill name</span>
                  <span>Due date</span>
                  <span>Amount</span>
                </div>

                <div className="sc-rows">
                  <div className="sc-row">
                    <span className="sc-name-cell">
                      <i className="sc-chk" />
                      Rent
                    </span>
                    <span className="sc-due">8/1</span>
                    <span className="sc-amt-cell">$650.00</span>
                  </div>
                  <div className="sc-row">
                    <span className="sc-name-cell">
                      <i className="sc-chk" />
                      Car insurance
                    </span>
                    <span className="sc-due">8/13</span>
                    <span className="sc-amt-cell">$85.00</span>
                  </div>
                  <div className="sc-row">
                    <span className="sc-name-cell">
                      <i className="sc-chk" />
                      Phone bill
                    </span>
                    <span className="sc-due">8/18</span>
                    <span className="sc-amt-cell">$65.00</span>
                  </div>
                  <div className="sc-row">
                    <span className="sc-name-cell">
                      <i className="sc-chk" />
                      Streaming
                    </span>
                    <span className="sc-due">8/26</span>
                    <span className="sc-amt-cell">$50.00</span>
                  </div>
                  <div className="sc-row">
                    <span className="sc-name-cell">
                      <i className="sc-chk" />
                      Groceries
                    </span>
                    <span className="sc-due sc-due-empty">ASAP</span>
                    <span className="sc-amt-cell">$150.00</span>
                  </div>
                </div>

                <div className="sc-add">+ Add bill</div>
              </div>

              <div className="sc-footer">
                <div>
                  <div className="sc-foot-val">$400.00</div>
                  <div className="sc-foot-lbl">Total expenses</div>
                </div>
                <div className="sc-foot-right">
                  <div className="sc-foot-val remaining">$600.00</div>
                  <div className="sc-foot-lbl">Remaining</div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
