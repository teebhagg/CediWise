import aboutMd from './content/about.md?raw'
import budgetingToolMd from './content/budgeting-tool.md?raw'
import contactMd from './content/contact.md?raw'
import debtDashboardMd from './content/debt-dashboard.md?raw'
import feedbackMd from './content/feedback.md?raw'
import financialLiteracyMd from './content/financial-literacy.md?raw'
import privacyMd from './content/privacy.md?raw'
import salaryCalculatorMd from './content/salary-calculator.md?raw'
import smeLedgerMd from './content/sme-ledger.md?raw'
import spendingInsightsMd from './content/spending-insights.md?raw'
import termsMd from './content/terms.md?raw'
import tryCalculatorMd from './content/try-salary-calculator.md?raw'
import { SITE_URL } from '@/lib/seo'
import {
  CEDIWISE_ANDROID_PLAY_STORE_URL,
  CEDIWISE_IOS_APP_STORE_URL,
} from '@/lib/storeLinks'

/**
 * Markdown bodies served to agents: via `Accept: text/markdown`, via a `.md`
 * twin (`/index.md`, `/pricing.md`), or as a static agent document (`/auth.md`).
 * Keep these in step with the visible copy on the matching HTML page.
 */

const link = (path: string) => `${SITE_URL}${path}`

export const CEDIWISE_REPOSITORY_URL = 'https://github.com/teebhagg/CediWise'

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

Full details, as Markdown: [Pricing (Markdown)](${link('/pricing.md')})

## Download the app

- [Android (Google Play)](${CEDIWISE_ANDROID_PLAY_STORE_URL})
- [iOS (App Store)](${CEDIWISE_IOS_APP_STORE_URL})

## Source code

- [CediWise repository](${CEDIWISE_REPOSITORY_URL})

## Resources for AI agents

- [Pricing (Markdown)](${link('/pricing.md')})
- [Agent access (auth.md)](${link('/auth.md')})
- [Agent resource catalog (ard.json)](${link('/.well-known/ard.json')})
${AGENT_RESOURCES.join('\n')}
`
}

function pricingMarkdown(): string {
  return `# CediWise pricing

Prices are in Ghana cedis (GH¢). Smart Budget and SME Ledger include a 30-day free trial. Quarterly billing saves about 13% compared with monthly billing.

## Plans

| Plan | Monthly | Quarterly | Includes |
| --- | --- | --- | --- |
| Free | GH¢ 0 (forever) | — | 2026 PAYE and SSNIT calculator, financial literacy lessons, future GRA tax updates |
| Smart Budget | GH¢ 15 | GH¢ 39 | Everything in Free, plus budgeting with progress bars, debt dashboard and payoff plans, recurring bills and spending charts, offline mode |
| SME Ledger | GH¢ 25 | GH¢ 65 | Everything in Smart Budget, plus sales and expenses ledger, automatic 20% VAT with a GH¢ 750K turnover alert, CSV export for your accountant, monthly profit summary |

## Notes

- Smart Budget and SME Ledger start with a 30-day free trial.
- The free calculator allows 3 checks per day on the website. Resets at midnight Ghana time.
- Prices are shown in GH¢ only.

Source: [${SITE_URL}/pricing](${link('/pricing')})
`
}

function authMarkdown(): string {
  return `# Agent access to CediWise

CediWise does not issue credentials to agents. The public endpoints need none. There is no agent-facing account, token, or sign-up flow.

## Discover

Start from the discovery documents: ${link('/.well-known/ard.json')} (ARD catalog), ${link('/.well-known/agent-card.json')} (A2A agent card), ${link('/mcp/server-card')} (MCP server card), and ${link('/.well-known/api-catalog')} (API catalog).

## Pick a method

Public endpoints are read-only and anonymous: ${link('/ask')} (NLWeb question API), ${link('/mcp')} (MCP tools), and ${link('/a2a')} (A2A messages). Use them without credentials.

## Register

Not available. CediWise does not register agents, and it publishes no agent_auth block or identity_endpoint.

## Claim

Not available. There is no account that an agent can claim.

## Exchange

Not applicable. No token exchange happens, so no access_token is issued.

## Use the access_token

Not applicable. The public endpoints accept requests without a token.

## Errors

The public endpoints return JSON errors with the status codes described in ${link('/openapi.json')}. CediWise does not send WWW-Authenticate challenges, because nothing on the site needs a token.

## Revocation

Not applicable. No agent credentials exist to revoke.

## User accounts

Budgeting, debt tracking, and the SME ledger need an account in the CediWise app. An agent must not create accounts, sign in, or enter passwords or one-time codes for a user. Ask the user to do that in the app.
`
}

const MARKDOWN_PAGES: Record<string, () => string> = {
  '/': homeMarkdown,
  '/pricing': pricingMarkdown,
  '/about': () => aboutMd,
  '/contact': () => contactMd,
  '/privacy': () => privacyMd,
  '/terms': () => termsMd,
  '/feedback': () => feedbackMd,
  '/salary-calculator': () => salaryCalculatorMd,
  '/try-salary-calculator': () => tryCalculatorMd,
  '/budgeting-tool': () => budgetingToolMd,
  '/sme-ledger': () => smeLedgerMd,
  '/financial-literacy': () => financialLiteracyMd,
  '/debt-dashboard': () => debtDashboardMd,
  '/spending-insights': () => spendingInsightsMd,
}

/** Routes that have a Markdown body. Must match `MARKDOWN_TWIN_ROUTES`. */
export const MARKDOWN_PAGE_ROUTES: ReadonlyArray<string> =
  Object.keys(MARKDOWN_PAGES)

/** Static agent documents that are not HTML routes. */
const STATIC_MARKDOWN_DOCUMENTS: Record<string, () => string> = {
  '/auth.md': authMarkdown,
}

/** Returns the Markdown body for a route, or `undefined` when none is published. */
export function getMarkdownPage(pathname: string): string | undefined {
  const render = MARKDOWN_PAGES[pathname]
  return render ? render() : undefined
}

/** Returns the Markdown body for a static agent document such as `/auth.md`. */
export function getStaticMarkdownDocument(
  pathname: string,
): string | undefined {
  const render = STATIC_MARKDOWN_DOCUMENTS[pathname]
  return render ? render() : undefined
}

/**
 * Maps a `.md` twin path to its HTML route: `/index.md` → `/`, `/pricing.md` →
 * `/pricing`. Returns `undefined` for paths that do not end in `.md`.
 */
export function markdownTwinRoute(pathname: string): string | undefined {
  if (!pathname.endsWith('.md')) return undefined
  if (pathname === '/index.md') return '/'
  return pathname.slice(0, -'.md'.length)
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

- [Home (Markdown)](${link('/index.md')})
${AGENT_RESOURCES.join('\n')}
`
}

export function noMarkdownTwinMarkdown(route: string): string {
  return `# 404 Not Found

There is no Markdown version of ${link(route)}. Open the HTML page, or use the Markdown resources below.

- [HTML page](${link(route)})
- [Home (Markdown)](${link('/index.md')})
${AGENT_RESOURCES.join('\n')}
`
}
