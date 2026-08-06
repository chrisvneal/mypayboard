type BillRow = {
  name: string
  amount: string
  done?: boolean
}

export type PayCardData = {
  variant: 1 | 2 | 3 | 4
  avatar: string
  source: string
  amount: string
  rows: BillRow[]
  remaining: string
}

export function PayCard({ variant, avatar, source, amount, rows, remaining }: PayCardData) {
  return (
    <div className={`paycard fan-${variant}`}>
      <div className={`head card-${variant}`}>
        <div className="src">
          <span className="avatar">{avatar}</span>
          {source}
        </div>
        <div className="amt">{amount}</div>
        <div className="lbl">Pay amount</div>
      </div>
      <div className="body">
        {rows.map((row) => (
          <div className="row" key={row.name}>
            <span className="name">
              <span className={`chk${row.done ? ' done' : ''}`} />
              {row.name}
            </span>
            <span className="amount">{row.amount}</span>
          </div>
        ))}
        <div className="remaining">
          <span className="lbl2">Remaining</span>
          <span className="val">{remaining}</span>
        </div>
      </div>
    </div>
  )
}
