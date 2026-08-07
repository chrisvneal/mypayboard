import type { Metadata } from 'next'
import { LegalPageLayout } from '@/components/legal/LegalPageLayout'

export const metadata: Metadata = {
  title: 'Privacy Policy | MyPayBoard',
  description: 'MyPayBoard privacy practices and data handling',
}

const navyHeading = { color: '#185FA5' }

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      lastUpdated="August 2026"
      otherPageHref="/terms"
      otherPageLabel="Terms of Service"
    >
      <p>
        MyPayBoard (&ldquo;we,&rdquo; &ldquo;us,&rdquo; &ldquo;our,&rdquo; or &ldquo;Company&rdquo;) operates the
        MyPayBoard application and website (collectively, the &ldquo;Service&rdquo;). This Privacy Policy explains
        how we collect, use, disclose, and safeguard your information when you use our Service.
      </p>
      <p>
        Please read this Privacy Policy carefully. If you do not agree with our policies and practices, please do
        not use our Service.
      </p>

      <section>
        <h2 className="text-xl font-semibold" style={navyHeading}>
          1. Information We Collect
        </h2>
        <h3 className="mt-4 font-semibold text-gray-800">Information You Provide Directly</h3>
        <p className="mt-2">
          <strong>Account Information:</strong> When you create an account via Clerk authentication, we collect your
          email address, name, and any other information you choose to provide.
        </p>
        <p className="mt-4">
          <strong>Household Financial Data:</strong> MyPayBoard stores the financial information you enter into the
          Service, including:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>Bills and creditors you add</li>
          <li>Income sources and paycheck schedules</li>
          <li>Pay Date Cards and how you allocate paychecks</li>
          <li>Debt details (balances, minimum payments, interest rates)</li>
          <li>Notes and collaboration messages within your household</li>
          <li>Custom categories and templates you create</li>
        </ul>
        <p className="mt-4">
          <strong>Important:</strong> We do not collect or have access to your bank account credentials, transaction
          history, or real banking data. MyPayBoard is a planning and coordination tool — you manually enter the
          bills and income that matter to your household.
        </p>
        <p className="mt-4">
          <strong>UI and Preferences:</strong> We store your app preferences (theme selection, view state, sort
          preferences, etc.) to personalize your experience.
        </p>
        <h3 className="mt-4 font-semibold text-gray-800">Information Collected Automatically</h3>
        <p className="mt-2">
          <strong>Usage Data:</strong> We may collect limited usage analytics to understand how the Service is used
          and to improve functionality. This may include feature interactions, session duration, and error logs.
          You can opt out of analytics collection through your account preferences at any time (if enabled).
        </p>
        <p className="mt-4">
          <strong>Device Information:</strong> We collect information about your device (browser type, OS, IP
          address) for security and debugging purposes.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold" style={navyHeading}>
          2. How We Use Your Information
        </h2>
        <p className="mt-2">We use the information we collect to:</p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>Provide, maintain, and improve the Service</li>
          <li>Enable household collaboration and financial planning</li>
          <li>Send transactional emails (account confirmations, password resets, household invitations)</li>
          <li>Respond to your inquiries and provide customer support</li>
          <li>Debug technical issues and prevent fraud</li>
          <li>Comply with legal obligations</li>
        </ul>
        <p className="mt-4">
          <strong>We do not use your information for marketing, advertising, or selling to third parties.</strong>
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold" style={navyHeading}>
          3. Household Collaboration and Data Visibility
        </h2>
        <p className="mt-2">
          MyPayBoard is designed for collaborative household financial planning.{' '}
          <strong>
            By design, all financial data you enter into your household workspace is visible to every member of
            your household.
          </strong>{' '}
          This includes bills, incomes, debt details, notes, and custom templates.
        </p>
        <p className="mt-4">
          If you add a partner or family member to your household, they will have full visibility of this data. You
          are responsible for ensuring all household members consent to this shared visibility.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold" style={navyHeading}>
          4. How We Share Your Information
        </h2>
        <h3 className="mt-4 font-semibold text-gray-800">Third-Party Service Providers</h3>
        <p className="mt-2">We use the following third-party providers to operate the Service:</p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>
            <strong>Clerk:</strong> Authentication and account management
          </li>
          <li>
            <strong>Supabase:</strong> Database storage and backend infrastructure
          </li>
          <li>
            <strong>Vercel:</strong> Application hosting and deployment
          </li>
          <li>
            <strong>Resend:</strong> Email delivery for transactional messages
          </li>
        </ul>
        <p className="mt-4">
          These providers process your information only as needed to provide their services and are bound by
          confidentiality agreements. We do not control their privacy practices — review their privacy policies for
          details.
        </p>
        <h3 className="mt-4 font-semibold text-gray-800">Legal Requirements</h3>
        <p className="mt-2">
          We may disclose your information if required by law, court order, or other legal process, or if we
          believe in good faith that disclosure is necessary to protect our rights, your safety, or the safety of
          others.
        </p>
        <h3 className="mt-4 font-semibold text-gray-800">Business Transfers</h3>
        <p className="mt-2">
          If MyPayBoard is acquired, merged, or sold, your information may be transferred as part of that
          transaction. We will provide notice before your information becomes subject to a different privacy
          policy.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold" style={navyHeading}>
          5. Data Retention and Deletion
        </h2>
        <h3 className="mt-4 font-semibold text-gray-800">Account Deletion</h3>
        <p className="mt-2">
          <strong>Household Owner Deletion:</strong> If you are the owner of a household and you delete your
          account, the entire household workspace—including all bills, income entries, Pay Date Cards, and data for
          all members—will be permanently deleted. This action cannot be undone. We will issue a clear warning
          before you proceed with deletion to ensure you understand the impact on all household members.
        </p>
        <p className="mt-4">
          <strong>Household Member Deletion:</strong> If you are a member of a household (not the owner) and you
          delete your account, you will be removed from the household. Any notes, comments, or messages you
          authored will be deleted. However, household financial data (bills, income entries, Pay Date Cards) that
          you created or edited will remain in the household workspace for other members, as this data reflects
          shared household financial planning.
        </p>
        <p className="mt-4">
          <strong>Timeline:</strong> Account deletion requests are processed within 30 days. Your account
          information and associated data will be removed from our active systems.
        </p>
        <p className="mt-4">
          To request account deletion or have questions about data retention, contact us at support@mypayboard.com.
        </p>
        <h3 className="mt-4 font-semibold text-gray-800">Inactive Accounts</h3>
        <p className="mt-2">
          Household workspaces with no activity for 12 months may be archived or deleted at our discretion. We will
          attempt to notify you before doing so.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold" style={navyHeading}>
          6. Security
        </h2>
        <p className="mt-2">We take data security seriously. MyPayBoard uses the following security measures:</p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>
            <strong>Row-Level Security (RLS):</strong> Database access is restricted so each household can only
            access its own data
          </li>
          <li>
            <strong>Encryption in Transit:</strong> All data is transmitted over HTTPS/TLS
          </li>
          <li>
            <strong>Encryption at Rest:</strong> Data stored in Supabase is encrypted
          </li>
          <li>
            <strong>Access Control:</strong> Only authorized team members can access the backend; customer data is
            not shared with our team except as needed for support or debugging
          </li>
          <li>
            <strong>Authentication:</strong> Clerk handles secure authentication and session management
          </li>
        </ul>
        <p className="mt-4">
          However, no security system is perfect. We encourage you to use a strong, unique password and enable
          two-factor authentication (if available) on your Clerk account.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold" style={navyHeading}>
          7. Your Privacy Rights
        </h2>
        <p className="mt-2">Depending on your location, you may have the right to:</p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>Access the personal information we hold about you</li>
          <li>Request correction of inaccurate data</li>
          <li>Request deletion of your data (subject to legal retention requirements)</li>
          <li>Opt out of certain data processing</li>
        </ul>
        <p className="mt-4">
          To exercise these rights, contact us at support@mypayboard.com. We will respond within 30 days.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold" style={navyHeading}>
          8. International Data Transfers
        </h2>
        <p className="mt-2">
          MyPayBoard is operated from the United States. Your information may be stored and processed in the United
          States or transferred to other countries for processing. By using MyPayBoard, you consent to the transfer
          of your information to countries outside your country of residence, which may have different data
          protection rules.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold" style={navyHeading}>
          9. Children Under 13
        </h2>
        <p className="mt-2">
          MyPayBoard is not intended for children under 13 years old. We do not knowingly collect information from
          anyone under 13. If we learn that we have collected personal information from a child under 13, we will
          delete such information promptly. If you believe we have collected information from a child under 13,
          please contact us immediately.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold" style={navyHeading}>
          10. Third-Party Links
        </h2>
        <p className="mt-2">
          MyPayBoard may contain links to third-party websites. We are not responsible for the privacy practices of
          those sites. We encourage you to review their privacy policies before providing personal information.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold" style={navyHeading}>
          11. Governing Law
        </h2>
        <p className="mt-2">
          This Privacy Policy and all matters relating to your use of MyPayBoard are governed by and construed in
          accordance with the laws of the State of Hawaii, without regard to its conflict of law provisions. You
          agree to submit to the exclusive jurisdiction of the courts located in Hawaii for the resolution of any
          disputes.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold" style={navyHeading}>
          12. Changes to This Privacy Policy
        </h2>
        <p className="mt-2">
          We may update this Privacy Policy from time to time. We will notify you of material changes by posting
          the updated policy on our website and updating the &ldquo;Last Updated&rdquo; date. Your continued use of
          MyPayBoard after changes constitutes your acceptance of the updated Privacy Policy.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold" style={navyHeading}>
          13. Contact Us
        </h2>
        <p className="mt-2">
          If you have questions about this Privacy Policy or our privacy practices, please contact us:
        </p>
        <p className="mt-4">
          <strong>MyPayBoard</strong>
          <br />
          Email: support@mypayboard.com
          <br />
          Website: www.mypayboard.com
        </p>
      </section>

      <p className="text-sm italic text-gray-500">
        This Privacy Policy is provided as-is and is not a substitute for legal advice. Consult with a privacy
        attorney if you need specific guidance for your jurisdiction or use case.
      </p>
    </LegalPageLayout>
  )
}
