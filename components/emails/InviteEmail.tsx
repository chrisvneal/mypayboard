interface InviteEmailProps {
  inviterName: string
  householdName?: string
  joinUrl: string
}

/** Plain inline-styled markup — email clients don't load Tailwind. */
export function InviteEmail({ inviterName, householdName, joinUrl }: InviteEmailProps) {
  return (
    <div style={{ fontFamily: 'Helvetica, Arial, sans-serif', backgroundColor: '#f4f6f8', padding: '40px 0' }}>
      <div
        style={{
          maxWidth: 480,
          margin: '0 auto',
          backgroundColor: '#ffffff',
          borderRadius: 8,
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ backgroundColor: '#185FA5', padding: '24px 32px' }}>
          <span style={{ color: '#ffffff', fontSize: 18, fontWeight: 700 }}>MyPayBoard</span>
        </div>
        <div style={{ padding: '32px' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: '0 0 12px' }}>
            {inviterName} invited you to {householdName ? `join ${householdName}` : 'join their household'}
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: '#475569', margin: '0 0 24px' }}>
            MyPayBoard is a shared paycheck planning board for couples and household partners.
            Accept the invite to start planning bills together.
          </p>
          <a
            href={joinUrl}
            style={{
              display: 'inline-block',
              backgroundColor: '#185FA5',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              padding: '12px 24px',
              borderRadius: 6,
            }}
          >
            Accept invitation
          </a>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '24px 0 0' }}>
            This invitation expires in 7 days. If you weren&apos;t expecting this, you can ignore this email.
          </p>
        </div>
      </div>
    </div>
  )
}
