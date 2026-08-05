import type { FeedbackCategory } from '@/lib/types'

interface FeedbackEmailProps {
  senderName: string
  senderEmail: string
  category: FeedbackCategory
  message: string
}

const CATEGORY_LABEL: Record<FeedbackCategory, string> = {
  bug: 'Bug report',
  feature: 'Feature request',
  general: 'General feedback',
}

/** Plain inline-styled markup — email clients don't load Tailwind. */
export function FeedbackEmail({ senderName, senderEmail, category, message }: FeedbackEmailProps) {
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
          <span style={{ color: '#ffffff', fontSize: 18, fontWeight: 700 }}>New feedback</span>
        </div>
        <div style={{ padding: '32px' }}>
          <p style={{ fontSize: 13, color: '#475569', margin: '0 0 4px' }}>
            <strong style={{ color: '#0f172a' }}>From:</strong> {senderName} ({senderEmail})
          </p>
          <p style={{ fontSize: 13, color: '#475569', margin: '0 0 20px' }}>
            <strong style={{ color: '#0f172a' }}>Category:</strong> {CATEGORY_LABEL[category]}
          </p>
          <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '0 0 20px' }} />
          <p style={{ fontSize: 14, lineHeight: 1.6, color: '#334155', whiteSpace: 'pre-wrap', margin: 0 }}>
            {message}
          </p>
        </div>
      </div>
    </div>
  )
}
