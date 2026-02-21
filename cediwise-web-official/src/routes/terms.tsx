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
        'CediWise Terms of Service. Read the terms governing use of our financial tools and services.',
    }),
})

function TermsPage() {
  return (
    <>
      <ContentPageLayout
        title="Terms of Service"
        subtitle="Effective date: February 21, 2026"
      >
        <section className="space-y-6">
          <h2>1. Acceptance</h2>
          <p>
            By using the CediWise website or mobile app (&quot;Services&quot;)
            you accept these Terms. If you do not agree, do not use the
            Services.
          </p>

          <h2>2. Services & eligibility</h2>
          <p>
            CediWise provides budgeting, salary, SME ledger, and financial
            literacy tools. You must be at least 13 to use the Services (or have
            parental permission). We may refuse service to anyone.
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

          <h2>5. Payments & refunds</h2>
          <p>
            No payments are required at this time. If we add paid features in
            the future, we will describe billing, refund, and cancellation
            policies separately.
          </p>

          <h2>6. Prohibited conduct</h2>
          <p>
            Do not misuse the Services (e.g., attempt unauthorized access,
            submit illegal content, provide false info). Breach may result in
            account termination.
          </p>

          <h2>7. Intellectual property</h2>
          <p>
            All intellectual property in the Services (UI, code, trademarks)
            belongs to CediWise or its licensors. Except for content you post,
            you may not copy or use our IP without permission.
          </p>

          <h2>8. Disclaimer — Not financial advice</h2>
          <p>
            The Services provide informational tools only. Nothing in the app
            constitutes financial, tax, or legal advice. Consult a professional
            before making financial decisions.
          </p>

          <h2>9. Warranties & limitation of liability</h2>
          <p>
            Service is provided &quot;AS IS&quot;. To the maximum extent
            permitted, CediWise disclaims all warranties. We are not liable for
            indirect, incidental, or consequential damages.
          </p>

          <h2>10. Indemnification</h2>
          <p>
            You agree to indemnify CediWise from claims arising from your misuse
            of the Services or violation of these Terms.
          </p>

          <h2>11. Governing law & dispute resolution</h2>
          <p>
            These Terms are governed by the laws of Ghana. Disputes shall be
            resolved in Ghanaian courts.
          </p>

          <h2>12. Changes to Terms</h2>
          <p>
            We may modify these Terms; material changes will be notified.
            Continued use after changes means acceptance.
          </p>

          <h2>13. Contact</h2>
          <p>
            For legal notices:{' '}
            <a href="mailto:legal@cediwise.app">legal@cediwise.app</a>
          </p>
        </section>
      </ContentPageLayout>
      <Footer />
    </>
  )
}
