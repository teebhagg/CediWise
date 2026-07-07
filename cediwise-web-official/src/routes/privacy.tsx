import { createFileRoute } from '@tanstack/react-router'
import { ContentPageLayout } from '@/components/layout/ContentPageLayout'
import { Footer } from '@/components/layout/Footer'
import { createPageHead } from '@/lib/seo'

export const Route = createFileRoute('/privacy')({
  component: PrivacyPage,
  head: () =>
    createPageHead({
      path: '/privacy',
      title: 'Privacy Policy',
      description:
        'How CediWise handles your data: salary inputs, budgets, SME records, optional MoMo SMS import, and account info.',
    }),
})

function PrivacyPage() {
  return (
    <>
      <ContentPageLayout
        title="Privacy Policy"
        subtitle="Last updated July 5, 2026"
      >
        <section className="space-y-6">
          <p>
            CediWise runs salary calculators, budgets, SME ledgers, and lessons on web and mobile.
            This page explains what we collect, why, and your choices.
          </p>

          <h2>1. Introduction</h2>
          <p>
            By using CediWise you agree to this policy. If anything here is unclear, email{' '}
            <a href="mailto:joshua.ansah@cediwise.app">joshua.ansah@cediwise.app</a>.
          </p>

          <h2>2. Controller & Contact</h2>
          <p>
            Data controller: CediWise. For privacy inquiries, contact us at{' '}
            <a href="mailto:joshua.ansah@cediwise.app">joshua.ansah@cediwise.app</a>.
          </p>

          <h2>3. What we collect</h2>
          <ul>
            <li>
              <strong>Account & identity data:</strong> email address, phone
              number (used for OTP), name, Google account identifiers for Google
              Sign-In.
            </li>
            <li>
              <strong>Financial & usage data:</strong> salary inputs, budgets,
              small and medium enterprise (SME) ledger entries, transactions you input (stored to provide the
              service).
            </li>
            <li>
              <strong>Device & technical data:</strong> device model, OS
              version, app version, IP address, crash reports (for
              troubleshooting and analytics).
            </li>
            <li>
              <strong>Analytics & telemetry:</strong> usage patterns via
              Firebase Analytics to improve the app.
            </li>
            <li>
              <strong>Communications:</strong> emails you send, newsletter
              sign-ups, and support responses.
            </li>
            <li>
              <strong>Optional MoMo SMS import (mobile, opt-in):</strong> if you
              enable Mobile Money (MoMo) auto-tracking, the app reads SMS on your
              device that match MoMo payment alerts from Ghanaian carriers (e.g.
              MTN MoMo, Telecel Cash)—not your full message history. Message
              text, sender, and timestamp may be sent to our servers to parse
              amount and transaction details and create budget entries. You may
              also paste a single MoMo SMS manually. On iOS, similar import may
              use Apple Shortcuts you configure (optional, when available).
            </li>
          </ul>

          <h2>4. MoMo SMS auto-tracking (optional)</h2>
          <p>
            This feature is <strong>off by default</strong> and requires your
            explicit consent in the app.
          </p>
          <ul>
            <li>
              <strong>On-device:</strong> filtered MoMo alert SMS only (Android:
              with your permission, <code>READ_SMS</code> /{' '}
              <code>RECEIVE_SMS</code>); we do not request access to unrelated
              messages.
            </li>
            <li>
              <strong>Sent to CediWise:</strong> SMS body, sender ID, received
              time, and parsed fields (amount, counterparty, reference where
              available) to log expenses you choose to track.
            </li>
            <li>
              <strong>Not sent:</strong> unrelated SMS, contacts, call logs, or
              continuous monitoring beyond MoMo-style filters you enable.
            </li>
            <li>
              <strong>Accuracy:</strong> parsing may miss or misclassify
              messages; you should review imported entries and correct them when
              needed.
            </li>
            <li>
              <strong>Disable anytime:</strong> turn off tracking in Profile
              settings and revoke SMS permissions in your device settings.
            </li>
          </ul>

          <h2>5. Legal bases</h2>
          <ul>
            <li>Performance of a contract — account and financial data.</li>
            <li>
              Legitimate interests — security, product improvement, analytics.
            </li>
            <li>Consent — marketing emails and newsletters (opt out anytime).</li>
            <li>
              Consent — optional MoMo SMS import and related device permissions
              (withdraw by disabling the feature).
            </li>
          </ul>

          <h2>6. How we use your data</h2>
          <ul>
            <li>Provide, operate, and maintain the Services.</li>
            <li>Authenticate you (OTP via SMS, Google Sign-In).</li>
            <li>Improve and personalize the Services (analytics).</li>
            <li>Communicate about account, support, updates, or legal notices.</li>
            <li>Detect and prevent fraud and misuse.</li>
            <li>
              Parse optional MoMo SMS you provide (automatically or by paste) to
              suggest or create budget transactions.
            </li>
          </ul>

          <h2>7. Third parties & processors</h2>
          <p>
            We use trusted providers: <strong>Supabase</strong> (database/auth),{' '}
            <strong>Firebase</strong> (analytics), <strong>Google</strong>{' '}
            (Sign-In), <strong>Arkesel</strong> (SMS OTP),{' '}
            <strong>Vercel/GitHub</strong> (hosting). We only share the minimum
            data required. Refer to each provider&apos;s privacy policies for
            details.
          </p>

          <h2>8. Data retention</h2>
          <p>
            We retain personal data only as long as necessary to provide the
            Services, comply with legal obligations, resolve disputes, and
            enforce agreements. Financial entries and user content are retained
            until you delete them or close your account, except where backups or
            legal holds apply.
          </p>
          <p>
            <strong>MoMo SMS import logs:</strong> raw SMS text and import
            metadata used for troubleshooting and deduplication are kept for up
            to <strong>180 days</strong>, then deleted. Budget transactions
            created from imports are kept like other transactions until you
            delete them or close your account.
          </p>

          <h2>9. Your rights</h2>
          <p>
            You have rights to request: access, correction, deletion
            (right to be forgotten), portability, restriction of processing, and
            to object to processing where applicable. Contact{' '}
            <a href="mailto:joshua.ansah@cediwise.app">joshua.ansah@cediwise.app</a> to
            exercise these rights.
          </p>

          <h2>10. Security</h2>
          <p>
            We use industry-standard measures (encryption in transit, secure
            storage, least privilege access). No internet transmission is 100%
            secure — please treat sensitive financial data with discretion.
          </p>

          <h2>11. International transfers</h2>
          <p>
            Your data may be stored or processed in countries other than yours
            where our providers operate. We ensure appropriate safeguards
            (processor agreements, standard contractual clauses where required).
          </p>

          <h2>12. Children</h2>
          <p>
            Our Services are not directed to children under 13. We do not
            knowingly collect personal data from children under 13. If you
            believe we collected such data, contact us and we will remove it.
          </p>

          <h2>13. Changes</h2>
          <p>
            We may update this policy; we&apos;ll post the date of the latest
            revision and, if material, notify users.
          </p>

          <h2>14. Contact</h2>
          <p>
            <a href="mailto:joshua.ansah@cediwise.app">joshua.ansah@cediwise.app</a>
          </p>
        </section>
      </ContentPageLayout>
      <Footer />
    </>
  )
}
