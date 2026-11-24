import { CEDIWISE_REPOSITORY_URL } from './markdown'
import { SITE_URL } from '@/lib/seo'

const link = (path: string) => `${SITE_URL}${path}`

/**
 * Structured view of the site for `/?mode=agent`. CediWise has no agent API,
 * so `api` is null and authentication is stated explicitly.
 */
export function agentViewJson(): string {
  const view = {
    name: 'CediWise',
    description:
      'Finance app for Ghana: PAYE and SSNIT checks, budgeting in cedis, SME ledger with VAT, and money lessons.',
    url: SITE_URL,
    capabilities: [
      {
        id: 'salary-check',
        description:
          'Estimate PAYE, SSNIT, and take-home pay under the GRA 2026 tax bands.',
        url: link('/salary-calculator'),
      },
      {
        id: 'budgeting',
        description:
          'Budget in cedis with safe-to-spend limits. Runs in the CediWise app.',
        url: link('/budgeting-tool'),
      },
      {
        id: 'debt-tracking',
        description:
          'Track debt balances, repayments, and payoff dates. Runs in the CediWise app.',
        url: link('/debt-dashboard'),
      },
      {
        id: 'sme-ledger',
        description:
          'Record sales and expenses with 20% VAT under VAT Act 1151. Runs in the CediWise app.',
        url: link('/sme-ledger'),
      },
      {
        id: 'financial-literacy',
        description:
          'Ghana-specific money lessons on tax, pensions, mobile money, and SME finance.',
        url: link('/financial-literacy'),
      },
    ],
    authentication: {
      required_for_public_pages: false,
      agent_credentials: 'none',
      user_accounts:
        'Created and used by the user in the CediWise app. Agents must not sign in for a user.',
      guide: link('/auth.md'),
    },
    api: null,
    documents: {
      llms_txt: link('/llms.txt'),
      llms_full_txt: link('/llms-full.txt'),
      markdown_home: link('/index.md'),
      markdown_pricing: link('/pricing.md'),
      sitemap: link('/sitemap.xml'),
      ard: link('/.well-known/ard.json'),
      repository: CEDIWISE_REPOSITORY_URL,
    },
  }
  return `${JSON.stringify(view, null, 2)}\n`
}
