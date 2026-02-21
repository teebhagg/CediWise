import { ContentPageLayout } from '@/components/layout/ContentPageLayout'
import { Footer } from '@/components/layout/Footer'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/privacy')({
  component: PrivacyPage,
  head: () =>
    createPageHead({
      path: '/privacy',
      title: 'Privacy Policy',
      description:
        'CediWise Privacy Policy. Learn how we collect, use, and protect your personal information.',
    }),
})

function PrivacyPage() {
  return (
    <>
      <ContentPageLayout
        title="Privacy Policy"
        subtitle="Last updated: February 21, 2026"
      >
        <section className="space-y-6">
          <h2>1. Introduction</h2>
          <p>
            CediWise (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) provides a
            salary calculator, budgeting, SME ledger, and financial literacy
            tools via web and mobile applications (the &quot;Services&quot;).
            This Privacy Policy describes what personal information we collect,
            how we use it, with whom we share it, and your rights. By using our
            Services you agree to the terms below.
          </p>

          <h2>2. Controller & Contact</h2>
          <p>
            Data controller: CediWise. For privacy inquiries, contact us at{' '}
            <a href="mailto:privacy@cediwise.app">privacy@cediwise.app</a>.
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
              SME ledger entries, transactions you input (stored to provide the
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
          </ul>

          <h2>4. Legal bases</h2>
          <ul>
            <li>Performance of a contract — account and financial data.</li>
            <li>
              Legitimate interests — security, product improvement, analytics.
            </li>
            <li>Consent — marketing emails and newsletters (opt out anytime).</li>
          </ul>

          <h2>5. How we use your data</h2>
          <ul>
            <li>Provide, operate, and maintain the Services.</li>
            <li>Authenticate you (OTP via SMS, Google Sign-In).</li>
            <li>Improve and personalize the Services (analytics).</li>
            <li>Communicate about account, support, updates, or legal notices.</li>
            <li>Detect and prevent fraud and misuse.</li>
          </ul>

          <h2>6. Third parties & processors</h2>
          <p>
            We use trusted providers: <strong>Supabase</strong> (database/auth),{' '}
            <strong>Firebase</strong> (analytics), <strong>Google</strong>{' '}
            (Sign-In), <strong>Arkesel</strong> (SMS OTP),{' '}
            <strong>Vercel/GitHub</strong> (hosting). We only share the minimum
            data required. Refer to each provider&apos;s privacy policies for
            details.
          </p>

          <h2>7. Data retention</h2>
          <p>
            We retain personal data only as long as necessary to provide the
            Services, comply with legal obligations, resolve disputes, and
            enforce agreements. Financial entries and user content are retained
            until you delete them or close your account, except where backups or
            legal holds apply.
          </p>

          <h2>8. Your rights</h2>
          <p>
            You have rights to request: access, correction, deletion
            (right to be forgotten), portability, restriction of processing, and
            to object to processing where applicable. Contact{' '}
            <a href="mailto:privacy@cediwise.app">privacy@cediwise.app</a> to
            exercise these rights.
          </p>

          <h2>9. Security</h2>
          <p>
            We use industry-standard measures (encryption in transit, secure
            storage, least privilege access). No internet transmission is 100%
            secure — please treat sensitive financial data with discretion.
          </p>

          <h2>10. International transfers</h2>
          <p>
            Your data may be stored or processed in countries other than yours
            where our providers operate. We ensure appropriate safeguards
            (processor agreements, standard contractual clauses where required).
          </p>

          <h2>11. Children</h2>
          <p>
            Our Services are not directed to children under 13. We do not
            knowingly collect personal data from children under 13. If you
            believe we collected such data, contact us and we will remove it.
          </p>

          <h2>12. Changes</h2>
          <p>
            We may update this policy; we&apos;ll post the date of the latest
            revision and, if material, notify users.
          </p>

          <h2>13. Contact</h2>
          <p>
            <a href="mailto:privacy@cediwise.app">privacy@cediwise.app</a>
          </p>
        </section>
      </ContentPageLayout>
      <Footer />
    </>
  )
}
