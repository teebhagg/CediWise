import { ContentPageLayout } from '@/components/layout/ContentPageLayout'
import { Footer } from '@/components/layout/Footer'
import { createPageHead } from '@/lib/seo'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/terms')({
  component: TermsPage,
  head: () =>
    createPageHead({
      path: '/terms',
      title: 'Terms of Service',
      description:
        'Terms for using CediWise website and app. Salary tools, budgeting, optional MoMo SMS import, and SME ledger for Ghana.',
    }),
})

function TermsPage() {
  return (
    <>
      <ContentPageLayout
        title="Terms of Service"
        subtitle="Effective July 5, 2026"
      >
        <section className="space-y-6">
          <p>
            These terms apply when you use the CediWise website or mobile app. Read them before you
            rely on salary, budget, or business tools for important decisions.
          </p>

          <h2>1. Acceptance</h2>
          <p>
            By using the CediWise website or mobile app (&quot;Services&quot;)
            you accept these Terms. If you do not agree, do not use the
            Services.
          </p>

          <h2>2. Services & eligibility</h2>
          <p>
            CediWise offers salary checks, budgeting, debt tracking, SME ledger, money lessons, and
            optional Mobile Money (MoMo) SMS expense import for users in Ghana. MoMo import is
            available on supported mobile devices when you opt in (Android first; iOS may use Apple
            Shortcuts when available). You must be at least 13 (or have a parent&apos;s permission).
            We may refuse service.
          </p>

          <h2>3. Account registration</h2>
          <p>
            You are responsible for providing accurate information and
            maintaining the security of your account. We may suspend accounts
            that violate our policies.
          </p>

          <h2>4. User content & licenses</h2>
          <p>
            You retain ownership of the content you upload. By uploading
            content, you grant CediWise a worldwide, non-exclusive,
            royalty-free license to host, copy, and display it as needed to
            operate the Services.
          </p>

          <h2>5. Optional MoMo SMS import</h2>
          <p>
            If you enable MoMo SMS import, you agree to the following:
          </p>
          <ul>
            <li>
              The feature is <strong>opt-in only</strong>. You voluntarily grant
              any device permissions required (e.g. SMS read on Android).
            </li>
            <li>
              You must use a phone and account that legitimately receive your
              MoMo payment alerts.
            </li>
            <li>
              We do <strong>not</strong> guarantee complete, timely, or accurate
              capture of every MoMo transaction. Import is an aid to budgeting,
              not a substitute for your MoMo wallet history, bank records, or
              official statements.
            </li>
            <li>
              You are responsible for reviewing imported entries and correcting
              or deleting inaccurate ones.
            </li>
            <li>
              You must not share import credentials (e.g. webhook keys), misuse
              the import API, or attempt to import SMS belonging to another
              person.
            </li>
          </ul>

          <h2>6. Payments, subscriptions & refunds</h2>
          <p>
            CediWise offers a free tier and paid subscriptions processed through{' '}
            <strong>Paystack</strong>. All prices are in <strong>Ghana cedis (GHS)</strong>{' '}
            unless stated otherwise.
          </p>

          <h3>Plans & pricing</h3>
          <ul>
            <li>
              <strong>Free:</strong> GHS 0 — salary and tax calculator tools.
            </li>
            <li>
              <strong>Smart Budget:</strong> GHS 15/month or GHS 39/quarter — budgeting,
              debt tracking, and spending insights.
            </li>
            <li>
              <strong>SME Ledger:</strong> GHS 25/month or GHS 65/quarter — business ledger,
              VAT tracking, and related tools.
            </li>
          </ul>
          <p>
            We may offer promotional or annual pricing from time to time. Current prices are
            shown in the app and on our{' '}
            <a href="/pricing">pricing page</a> at checkout.
          </p>

          <h3>Free trial</h3>
          <p>
            Smart Budget and SME Ledger include a <strong>30-day free trial</strong> for
            eligible new subscribers. During the trial you can use paid features without
            charge. When the trial ends, you must subscribe to keep premium access unless
            you cancel or downgrade before the trial period expires.
          </p>

          <h3>Billing & payment methods</h3>
          <ul>
            <li>
              Payments are processed by Paystack. We accept{' '}
              <strong>debit/credit card</strong> and <strong>Mobile Money (MoMo)</strong>{' '}
              where supported.
            </li>
            <li>
              MoMo payments may require approval on your phone and can take longer to
              confirm than card payments.
            </li>
            <li>
              You authorize us (via Paystack) to charge the payment method you select for
              the plan and billing cycle you choose.
            </li>
            <li>
              Failed renewals may enter a grace period before premium access is removed;
              we may send reminders by email or SMS.
            </li>
          </ul>

          <h3>Cancellation</h3>
          <p>
            You may <strong>cancel anytime</strong> from the app (Profile → subscription /
            manage plan). Cancellation typically takes effect at the <strong>end of your
            current billing period</strong>, and you retain access until then unless we
            state otherwise at checkout. After cancellation, your account may revert to
            the free tier.
          </p>

          <h3>Refunds</h3>
          <p>
            Subscription fees are generally <strong>non-refundable</strong>, except where
            required by applicable law or where we explicitly agree in writing. If you
            believe you were charged in error, contact us promptly at{' '}
            <a href="mailto:joshua.ansah@cediwise.app">joshua.ansah@cediwise.app</a>.
          </p>

          <h3>Price & plan changes</h3>
          <p>
            We may change plan features or prices. Material price increases will be
            communicated in advance where required. Continued use or renewal after notice
            may constitute acceptance of updated pricing.
          </p>

          <h2>7. Prohibited conduct</h2>
          <p>
            Do not misuse the Services (e.g., attempt unauthorized access,
            submit illegal content, provide false info, abuse MoMo import
            endpoints or credentials). Breach may result in account termination.
          </p>

          <h2>8. Intellectual property</h2>
          <p>
            All intellectual property in the Services (UI, code, trademarks)
            belongs to CediWise or its licensors. Except for content you post,
            you may not copy or use our IP without permission.
          </p>

          <h2>9. Disclaimer — Not financial advice</h2>
          <p>
            The Services provide informational tools only. Nothing in the app
            constitutes financial, tax, or legal advice. Auto-imported MoMo
            amounts and categories are parsed automatically and may be wrong.
            Consult a professional before making financial decisions.
          </p>

          <h2>10. Warranties & limitation of liability</h2>
          <p>
            Service is provided &quot;AS IS&quot;. To the maximum extent
            permitted, CediWise disclaims all warranties. We are not liable for
            indirect, incidental, or consequential damages, including losses
            arising from missed, duplicate, or incorrect MoMo imports.
          </p>

          <h2>11. Indemnification</h2>
          <p>
            You agree to indemnify CediWise from claims arising from your misuse
            of the Services or violation of these Terms.
          </p>

          <h2>12. Governing law & dispute resolution</h2>
          <p>
            These Terms are governed by the laws of Ghana. Disputes shall be
            resolved in Ghanaian courts.
          </p>

          <h2>13. Changes to Terms</h2>
          <p>
            We may modify these Terms; material changes will be notified.
            Continued use after changes means acceptance.
          </p>

          <h2>14. Contact</h2>
          <p>
            For legal notices:{' '}
            <a href="mailto:joshua.ansah@cediwise.app">joshua.ansah@cediwise.app</a>
          </p>
        </section>
      </ContentPageLayout>
      <Footer />
    </>
  )
}
