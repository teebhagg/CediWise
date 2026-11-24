import { SITE_URL } from '@/lib/seo'
import {
  CEDIWISE_ANDROID_PLAY_STORE_URL,
  CEDIWISE_IOS_APP_STORE_URL,
} from '@/lib/storeLinks'

/**
 * Markdown bodies served to clients that request `Accept: text/markdown`.
 * Keep these in step with the visible copy on the matching HTML page.
 */

const link = (path: string) => `${SITE_URL}${path}`

const AGENT_RESOURCES = [
  `- [Site index for agents (llms.txt)](${link('/llms.txt')})`,
  `- [Full content (llms-full.txt)](${link('/llms-full.txt')})`,
  `- [Sitemap](${link('/sitemap.xml')})`,
]

function homeMarkdown(): string {
  return `# CediWise — PAYE Calculator & Budget App for Ghana

CediWise is a personal and small-business finance app for Ghana. It checks PAYE and SSNIT against the GRA 2026 tables, helps you budget in cedis, and tracks SME VAT. The salary calculator is free on the web. The app is available on Android and iOS.

## What CediWise does

- **Salary check:** Run a gross monthly salary through the 2026 GRA PAYE bands and SSNIT rules, then compare the result with your payslip. [Salary calculator](${link('/salary-calculator')})
- **Budgeting:** Plan the month in cedis with safe-to-spend limits, categories, and spending charts. [Budgeting tool](${link('/budgeting-tool')})
- **Debt:** Track balances, repayments, and payoff dates. [Debt dashboard](${link('/debt-dashboard')})
- **SME ledger:** Record sales and expenses, apply 20% VAT under VAT Act 1151, and get alerts as turnover nears GHS 750,000. [SME ledger](${link('/sme-ledger')})
- **Financial literacy:** Ghana-specific money lessons with quizzes and calculators. [Financial literacy](${link('/financial-literacy')})

## Pricing

- **Free (GH¢ 0):** Web salary calculator and the financial literacy lessons.
- **Smart Budget (GH¢ 15 per month or GH¢ 39 per quarter):** Budget, debt dashboard, and spending insights in the app, with a 30-day free trial.
- **SME Ledger (GH¢ 25 per month or GH¢ 65 per quarter):** Everything in Smart Budget plus the business ledger, automatic VAT, and monthly profit and loss, with a 30-day free trial.

Full details: [Pricing](${link('/pricing')})

## Download the app

- [Android (Google Play)](${CEDIWISE_ANDROID_PLAY_STORE_URL})
- [iOS (App Store)](${CEDIWISE_IOS_APP_STORE_URL})

## Resources for AI agents

${AGENT_RESOURCES.join('\n')}
`
}

const MARKDOWN_PAGES: Record<string, () => string> = {
  '/': homeMarkdown,
}

/** Returns the Markdown body for a route, or `undefined` when none is published. */
export function getMarkdownPage(pathname: string): string | undefined {
  const render = MARKDOWN_PAGES[pathname]
  return render ? render() : undefined
}

export function notFoundMarkdown(): string {
  return `# 404 Not Found

The page you requested does not exist on CediWise. Check the address, or start from the home page or the site index.

- [Home](${link('/')})
${AGENT_RESOURCES.join('\n')}
`
}

export function notAcceptableMarkdown(): string {
  return `# 406 Not Acceptable

This page is only available as HTML. Send \`Accept: text/html\` to read it, or use the Markdown resources below.

- [Home (Markdown)](${link('/')})
${AGENT_RESOURCES.join('\n')}
`
}
