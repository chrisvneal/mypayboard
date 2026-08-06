import { PayCard, type PayCardData } from './PayCard'

const cards: PayCardData[] = [
  {
    variant: 1,
    avatar: 'A',
    source: 'Main Job · Jun 1',
    amount: '$1,850',
    rows: [
      { name: 'Rent', amount: '$900' },
      { name: 'Car insurance', amount: '$140', done: true },
    ],
    remaining: '$810',
  },
  {
    variant: 4,
    avatar: 'J',
    source: 'Birthday gift · Jun 18',
    amount: '$200',
    rows: [
      { name: 'New shoes', amount: '$60', done: true },
      { name: 'Dinner out', amount: '$40' },
    ],
    remaining: '$100',
  },
  {
    variant: 3,
    avatar: 'A',
    source: 'Side gig · Jun 12',
    amount: '$220',
    rows: [
      { name: 'Groceries', amount: '$120' },
      { name: 'Gas', amount: '$50' },
    ],
    remaining: '$50',
  },
  {
    variant: 2,
    avatar: 'J',
    source: 'Freelance client · Jun 5',
    amount: '$600',
    rows: [
      { name: 'Internet', amount: '$70', done: true },
      { name: 'Phone bill', amount: '$55' },
    ],
    remaining: '$475',
  },
]

export function CardFan() {
  return (
    <div className="fan-stage">
      {cards.map((card) => (
        <PayCard key={card.variant} {...card} />
      ))}
    </div>
  )
}
