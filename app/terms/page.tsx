import type { Metadata } from 'next'
import { LegalPageLayout } from '@/components/legal/LegalPageLayout'

export const metadata: Metadata = {
  title: 'Terms of Service | MyPayBoard',
  description: 'MyPayBoard terms and conditions',
}

const navyHeading = { color: '#185FA5' }

export default function TermsPage() {
  return (
    <LegalPageLayout
      title="Terms of Service"
      lastUpdated="August 2026"
      otherPageHref="/privacy"
      otherPageLabel="Privacy Policy"
    >
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the MyPayBoard application and
        website (collectively, the &ldquo;Service&rdquo;), operated by MyPayBoard (&ldquo;we,&rdquo;
        &ldquo;us,&rdquo; &ldquo;our,&rdquo; or &ldquo;Company&rdquo;). By accessing or using MyPayBoard, you agree
        to be bound by these Terms. If you do not agree with any part of these Terms, you may not use the Service.
      </p>

      <section>
        <h2 className="text-xl font-semibold" style={navyHeading}>
          1. Eligibility and Account Registration
        </h2>
        <p className="mt-2">
          You must be at least 18 years old to use MyPayBoard. By creating an account, you represent and warrant
          that:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>You are at least 18 years old</li>
          <li>You have the legal capacity to enter into these Terms</li>
          <li>All information you provide is accurate and truthful</li>
          <li>You will comply with all applicable laws and regulations</li>
        </ul>
        <p className="mt-4">
          Each person may create only one personal account. Creating multiple accounts to circumvent limitations or
          misrepresent identity is prohibited. If we discover violations, we reserve the right to suspend or
          terminate your account without refund.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold" style={navyHeading}>
          2. Account Ownership and Household Access
        </h2>
        <h3 className="mt-4 font-semibold text-gray-800">Account Responsibility</h3>
        <p className="mt-2">
          You are responsible for maintaining the confidentiality of your account credentials and for all activity
          that occurs under your account. You agree to notify us immediately of any unauthorized use of your
          account.
        </p>
        <h3 className="mt-4 font-semibold text-gray-800">Household Collaboration</h3>
        <p className="mt-2">
          MyPayBoard is designed for household collaboration. When you create or join a household workspace:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>All financial data you enter is visible to every member of the household</li>
          <li>The household owner controls who can join the household and has the right to remove members at any time</li>
          <li>
            By inviting someone to your household or accepting an invitation, you consent to sharing all household
            financial data with that person
          </li>
        </ul>
        <p className="mt-4">
          You are solely responsible for managing household membership and for ensuring all members consent to
          shared data visibility.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold" style={navyHeading}>
          3. Acceptable Use
        </h2>
        <p className="mt-2">
          You agree not to use MyPayBoard for any unlawful, fraudulent, or harmful purposes. Specifically, you will
          not:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>Use the Service to plan, coordinate, or commit fraud, theft, or other illegal activity</li>
          <li>Harass, threaten, defame, or abuse other users</li>
          <li>Attempt to gain unauthorized access to the Service or other users&rsquo; accounts</li>
          <li>Upload viruses, malware, or other harmful code</li>
          <li>Reverse engineer, decompile, or attempt to discover the source code or underlying technology</li>
          <li>Spam, phish, or send unsolicited messages through the Service</li>
          <li>Impersonate others or misrepresent your identity</li>
          <li>Violate any third-party intellectual property, privacy, or other rights</li>
          <li>Overload or intentionally disrupt the Service through automated requests or denial-of-service attacks</li>
        </ul>
        <p className="mt-4">
          Violations of this section may result in immediate suspension or termination of your account and may be
          reported to law enforcement.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold" style={navyHeading}>
          4. MyPayBoard is a Planning Tool, Not Financial Advice
        </h2>
        <p className="mt-2">
          <strong>
            MyPayBoard is a household budgeting and paycheck planning tool. It is not a bank, financial advisor,
            investment platform, or source of financial advice.
          </strong>
        </p>
        <p className="mt-4">By using MyPayBoard, you acknowledge and agree that:</p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>MyPayBoard does not provide financial, investment, tax, legal, or accounting advice</li>
          <li>You are solely responsible for making your own financial decisions and managing your household budget</li>
          <li>
            You are responsible for ensuring that all bills are paid on time; a missed bill in the MyPayBoard app
            does not excuse non-payment to your creditors
          </li>
          <li>MyPayBoard is not liable for late fees, credit impacts, or other consequences resulting from missed or late payments</li>
          <li>MyPayBoard does not have access to your actual bank accounts; data is entered manually and may not reflect real-time balances</li>
          <li>MyPayBoard does not validate, verify, or guarantee the accuracy of financial information you enter</li>
        </ul>
        <p className="mt-4">
          We strongly recommend consulting with a qualified financial advisor, accountant, or attorney for
          personalized financial guidance.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold" style={navyHeading}>
          5. Free Tier, Paid Tiers, and Subscriptions
        </h2>
        <h3 className="mt-4 font-semibold text-gray-800">Current Free Offering</h3>
        <p className="mt-2">
          MyPayBoard is currently offered free of charge. Free accounts include access to a limited number of
          households.
        </p>
        <h3 className="mt-4 font-semibold text-gray-800">Future Paid Tiers</h3>
        <p className="mt-2">We may introduce paid subscription tiers in the future. When we do:</p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>Free tier accounts will retain their current limits (e.g., X households maximum)</li>
          <li>Paid tier subscriptions will allow you to create additional households (stackable)</li>
          <li>We will provide at least 30 days&rsquo; notice before introducing paid features</li>
          <li>Your existing free tier access will not be degraded by the introduction of paid tiers</li>
        </ul>
        <h3 className="mt-4 font-semibold text-gray-800">Subscription and Billing</h3>
        <p className="mt-2">If you subscribe to a paid tier:</p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>You authorize us to charge your payment method on a recurring basis (monthly or annually, as selected)</li>
          <li>You are responsible for maintaining accurate billing information</li>
          <li>Failed payments may result in suspension of paid features after a grace period (see below)</li>
          <li>
            You may cancel your subscription at any time through your account settings; cancellation takes effect
            at the end of your current billing cycle
          </li>
        </ul>
        <h3 className="mt-4 font-semibold text-gray-800">Downgrade and Feature Restrictions</h3>
        <p className="mt-2">If you cancel a paid subscription or your payment fails:</p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>Billing will stop immediately</li>
          <li>Paid features will remain available for 7–14 days (grace period) to allow you to manage your account</li>
          <li>After the grace period, any households that exceed your free tier limit will have paid features restricted</li>
          <li>Restriction means those workspaces will be limited to free tier functionality; data will not be deleted</li>
          <li>You may re-subscribe to restore paid features, or manually delete excess households to remain within free tier limits</li>
        </ul>
        <h3 className="mt-4 font-semibold text-gray-800">Downgrading to Free Tier</h3>
        <p className="mt-2">If you have multiple households and choose to downgrade from paid to free:</p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>All your households will be downgraded to free tier features</li>
          <li>
            If you exceed the free tier household limit after downgrade, excess households will have paid features
            restricted (but data will be preserved)
          </li>
          <li>You can manually delete households or re-subscribe to paid to remove the restriction</li>
        </ul>
        <h3 className="mt-4 font-semibold text-gray-800">Service Limitations</h3>
        <p className="mt-2">We reserve the right to:</p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>
            Impose or adjust limitations on free accounts (e.g., number of households, Pay Date Cards, or household
            members) with 30 days&rsquo; notice
          </li>
          <li>Discontinue the Service or free access with 30 days&rsquo; notice</li>
          <li>Adjust pricing for paid tiers with 30 days&rsquo; notice for existing subscribers</li>
        </ul>
        <p className="mt-4">
          Your continued use of the Service following any changes constitutes acceptance of those changes.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold" style={navyHeading}>
          6. Intellectual Property
        </h2>
        <h3 className="mt-4 font-semibold text-gray-800">Your Content</h3>
        <p className="mt-2">
          You retain ownership of all financial data, notes, and other content you create and enter into MyPayBoard
          (&ldquo;Your Content&rdquo;). By using the Service, you grant MyPayBoard a non-exclusive, royalty-free,
          worldwide license to store, process, and display Your Content for the purpose of providing the Service to
          you and your household.
        </p>
        <h3 className="mt-4 font-semibold text-gray-800">MyPayBoard IP</h3>
        <p className="mt-2">
          All content, features, and functionality of MyPayBoard (including but not limited to software, design,
          text, and logos) are owned by or licensed to MyPayBoard and are protected by copyright, trademark, and
          other intellectual property laws. You may not reproduce, distribute, modify, or create derivative works
          of MyPayBoard without express written permission.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold" style={navyHeading}>
          7. User Conduct and Suspension
        </h2>
        <p className="mt-2">
          We may suspend or terminate your account, or restrict your access to the Service, at any time and for any
          reason, including:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>Violation of these Terms or our Privacy Policy</li>
          <li>Suspected fraud, abuse, or illegal activity</li>
          <li>Harm to other users or the integrity of the Service</li>
          <li>Non-compliance with applicable laws</li>
        </ul>
        <p className="mt-4">
          Upon suspension or termination, your right to use the Service immediately ceases. You remain liable for
          any outstanding obligations.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold" style={navyHeading}>
          8. Data Deletion and Account Termination
        </h2>
        <h3 className="mt-4 font-semibold text-gray-800">Your Right to Delete</h3>
        <p className="mt-2">
          You may delete your account at any time through your account settings. Please see our Privacy Policy for
          details on what happens to your data upon deletion.
        </p>
        <h3 className="mt-4 font-semibold text-gray-800">Consequences of Deletion</h3>
        <p className="mt-2">
          <strong>
            If you are the household owner and delete your account, the entire household workspace and all
            associated data will be permanently deleted for all members.
          </strong>{' '}
          This action cannot be undone.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold" style={navyHeading}>
          9. Limitation of Liability
        </h2>
        <p className="mt-2 font-semibold uppercase">
          To the maximum extent permitted by law, MyPayBoard and its officers, directors, employees, and agents
          shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including
          lost profits, loss of data, or business interruption, arising out of or in connection with your use of
          the Service, even if MyPayBoard has been advised of the possibility of such damages.
        </p>
        <p className="mt-4 font-semibold uppercase">
          Your sole and exclusive remedy for any dispute with MyPayBoard is to stop using the Service.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold" style={navyHeading}>
          10. Disclaimer of Warranties
        </h2>
        <p className="mt-2 font-semibold uppercase">
          The Service is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without any
          warranties of any kind, express or implied.
        </p>
        <p className="mt-4 uppercase">MyPayBoard disclaims all warranties, including but not limited to:</p>
        <ul className="mt-2 list-disc space-y-1 pl-6 uppercase">
          <li>Warranties of merchantability</li>
          <li>Fitness for a particular purpose</li>
          <li>Non-infringement</li>
          <li>Accuracy or completeness of data</li>
          <li>Uninterrupted or error-free operation</li>
        </ul>
        <p className="mt-4 uppercase">MyPayBoard does not warrant that:</p>
        <ul className="mt-2 list-disc space-y-1 pl-6 uppercase">
          <li>The Service will meet your requirements</li>
          <li>The Service will be error-free, secure, or uninterrupted</li>
          <li>Defects in the Service will be corrected</li>
          <li>Any data loss will not occur</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold" style={navyHeading}>
          11. Indemnification
        </h2>
        <p className="mt-2">
          You agree to indemnify, defend, and hold harmless MyPayBoard and its officers, directors, employees, and
          agents from any claims, damages, losses, liabilities, and expenses (including reasonable attorneys&rsquo;
          fees) arising out of or related to:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>Your use of the Service</li>
          <li>Your violation of these Terms</li>
          <li>Your violation of any applicable law or regulation</li>
          <li>Your infringement of any third-party rights</li>
          <li>Your content or statements made through the Service</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold" style={navyHeading}>
          12. Third-Party Services and Links
        </h2>
        <p className="mt-2">
          MyPayBoard may contain links to third-party websites, applications, or services that are not operated by
          us. We are not responsible for the content, accuracy, privacy practices, or availability of these
          third-party services. Your use of third-party services is governed by their own terms and policies. We
          encourage you to review those terms before providing personal information.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold" style={navyHeading}>
          13. Changes to Terms
        </h2>
        <p className="mt-2">
          We may update these Terms at any time. We will notify you of material changes by posting the updated
          Terms on our website and updating the &ldquo;Last Updated&rdquo; date. Your continued use of the Service
          following changes constitutes acceptance of the updated Terms.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold" style={navyHeading}>
          14. Governing Law and Jurisdiction
        </h2>
        <p className="mt-2">
          These Terms of Service are governed by and construed in accordance with the laws of the State of Hawaii,
          without regard to its conflict of law provisions. You agree to submit to the exclusive jurisdiction of
          the courts located in Hawaii for the resolution of any disputes arising out of or related to these Terms
          or your use of the Service.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold" style={navyHeading}>
          15. Severability
        </h2>
        <p className="mt-2">
          If any provision of these Terms is found to be invalid, illegal, or unenforceable, that provision shall
          be severed, and the remaining provisions shall remain in full force and effect.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold" style={navyHeading}>
          16. Entire Agreement
        </h2>
        <p className="mt-2">
          These Terms, together with our Privacy Policy, constitute the entire agreement between you and MyPayBoard
          regarding your use of the Service and supersede all prior agreements and understandings.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold" style={navyHeading}>
          17. Contact Us
        </h2>
        <p className="mt-2">If you have questions about these Terms of Service, please contact us:</p>
        <p className="mt-4">
          <strong>MyPayBoard</strong>
          <br />
          Email: support@mypayboard.com
          <br />
          Website: www.mypayboard.com
        </p>
      </section>

      <p className="text-sm italic text-gray-500">
        These Terms of Service are provided as-is and are not a substitute for legal advice. Consult with an
        attorney if you need specific guidance for your jurisdiction or situation.
      </p>
    </LegalPageLayout>
  )
}
