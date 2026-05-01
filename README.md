<p align="center">
  <img src="assets/cediwise-smooth-light-logo.png" alt="CediWise Logo" width="120" />
</p>

<h1 align="center">CediWise</h1>
<p align="center">
  <strong>Personal Finance Companion.</strong>
</p>

<p align="center">
  <img src="assets/banner.png" alt="CediWise Banner" width="100%" />
</p>

<p align="center">
  <a href="#about">About</a> •
  <a href="#features">Features</a> •
  <a href="#project-structure">Structure</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#deployment--release">Deployment</a> •
  <a href="#tech-stack">Tech Stack</a>
</p>

**Monorepo:** mobile app (Expo), marketing web (TanStack Start), admin dashboard (Next.js), and shared **Supabase** (Postgres, Auth, Edge Functions) at [`supabase/`](supabase/README.md).

**Database & Edge:** Migrations and Edge Functions live in [`supabase/`](supabase/README.md). Follow [`supabase/docs/database-change-workflow.md`](supabase/docs/database-change-workflow.md) for production schema changes and [`supabase/docs/OPERATOR_PREFLIGHT.md`](supabase/docs/OPERATOR_PREFLIGHT.md) before first push.

---

## About

**CediWise** is a lean, high-accuracy financial tool built for Ghanaian users. It helps individuals manage salary, taxes, budgets, and financial literacy—with support for Ghana’s 2026 tax rules, SSNIT, PAYE, and VAT.

> _Banker aesthetic • Deep Green • White • Gold accents_

---

## Features

### Mobile app (`cediwise-mobile-app`)

| Category | Capabilities |
| -------- | ------------ |
| **Salary** | Basic salary input → SSNIT (5.5%), PAYE (7-tier), net take-home; tax & salary calculator; SSNIT/PAYE toggle on income sources |
| **Budget** | Category budgets (Needs/Wants/Savings), spent vs remaining progress bars; Vitals wizard; multiple income sources; budget templates; spending insights |
| **Debt** | Debt dashboard — add debts, record payments, payoff estimates, linked to budget cycles |
| **Recurring expenses** | Weekly, bi-weekly, monthly, quarterly, annually |
| **Auth** | Phone OTP (Firebase), Google Sign-In, Apple Sign-In (iOS) |
| **Financial literacy** | Modules and lessons; glossary; calculators: PAYE & SSNIT, budget builder, savings goal, loan amortization, T-Bill projection, cash flow |
| **Investment** | Tab placeholder — coming soon (GSE, T-Bill content in literacy) |
| **Offline & sync** | Mutation queue for budget changes; local storage sync |
| **Other** | Onboarding; guided tours; in-app update checks; push notifications; analytics (Firebase, PostHog); error reporting (Sentry) |

### Web app — [cediwise.app](https://cediwise.app) (`cediwise-web-official`)

- **Product**: Salary Calculator, Budgeting Tool, SME Ledger, Financial Literacy
- **Company**: About Us, Contact
- **Legal**: Privacy Policy, Terms of Service

### Admin dashboard (`cediwise-dashboard`)

- Users management
- Learning data: lessons, T-Bill rates, feedback, progress
- Announcements & push notifications
- Email and SMS campaigns

---

## Project structure

```
CediWise/
├── assets/                       # Shared images (banner, logo)
├── supabase/                     # Canonical Supabase CLI root (migrations, Edge Functions, seeds)
├── scripts/                      # Repo-level ops (backup, sync baseline, seeds — see each script)
├── legacy/                       # Archived historical SQL (read-only; do not re-apply)
├── cediwise-mobile-app/          # Expo React Native app (Android, iOS) — EAS, app.json, eas.json
│   ├── app/                      # Expo Router screens
│   ├── components/
│   ├── calculators/
│   ├── distribution/             # Per-version release notes (*.txt) for CI — required for store deploys
│   └── content/                  # Bundled lesson content (app)
├── cediwise-dashboard/           # Next.js admin dashboard
│   ├── app/(dashboard)/
│   └── scripts/                  # e.g. SMS provider tests
├── cediwise-web-official/        # TanStack Start + Vite (marketing site; Vercel)
├── content/                      # Lesson source content (Markdown), shared with tooling
├── docs/                         # Specs, plans, PRDs (root-level docs)
├── .github/workflows/            # CI: mobile PR checks; Android & iOS EAS build + submit
├── LICENSE
├── CONTRIBUTING.md
└── README.md                     # This file
```

Package-specific setup and env details: [`cediwise-mobile-app/README.md`](cediwise-mobile-app/README.md), [`cediwise-web-official/README.md`](cediwise-web-official/README.md), [`cediwise-dashboard/README.md`](cediwise-dashboard/README.md).

---

## Quick start

### Mobile (Expo)

```bash
cd cediwise-mobile-app
npm install
npx expo start
```

Native builds (Firebase Phone Auth, full native modules):

```bash
npx expo run:android
# or
npx expo run:ios
```

### Web (marketing site)

```bash
cd cediwise-web-official
npm install
npm run dev
```

### Admin dashboard

```bash
cd cediwise-dashboard
npm install
npm run dev
```

### Supabase (local / migrations)

See [`supabase/README.md`](supabase/README.md) for `supabase link`, `supabase db reset`, migrations, and Edge Function deploys.

---

## Deployment & release

### Version source of truth

- **Mobile:** `cediwise-mobile-app/app.json` → `expo.version` (must match the release you are shipping).
- **EAS:** Production profile uses `appVersionSource: "remote"` in `eas.json` with `autoIncrement` for store builds — align bumps with your release process.

### Commit messages and release signals

Use **[Conventional Commits](https://www.conventionalcommits.org/)** (`type(scope): summary`) for readable history. CI also interprets the following:

| Signal | Effect |
| ------ | ------ |
| **`[skip-deploy]`** in the **latest commit message** | Skips the **Android** and **iOS** deploy jobs (both workflows read the latest commit message). |
| **`BREAKING CHANGE`** (footer), **`type(scope)!:`**, or **`[force-update]`** in commits since the previous `v*` tag | Sets `requires_update` when writing `app_versions` in Supabase (in-app update policy). |
| Tag **`v*`** (e.g. `v0.2.6`) | Treated as a release ref for version extraction and always eligible for deploy paths that key off tags. |

**Never commit secrets.** Use GitHub Actions secrets and/or Expo/EAS project secrets. `eas.json` in the repo should not hold production credentials (CI injects env at build time).

### Release notes (required for mobile CI)

For each shipped **mobile** version, add a plain-text file:

- **Path:** `cediwise-mobile-app/distribution/<version>.txt` (e.g. `0.2.6.txt` matching `app.json`).
- **Length:** ≤ **500 characters** (enforced by workflows).
- **Content:** User-facing changelog snippet used for store metadata and optional `app_versions` rows.

If this file is missing for the version being built, **Android** and **iOS** deploy workflows **fail** the release-notes validation step.

### GitHub Actions (mobile)

| Workflow | Purpose |
| -------- | ------- |
| [`mobile-app-pr-check.yml`](.github/workflows/mobile-app-pr-check.yml) | On PRs to `main` that touch `cediwise-mobile-app/**`: ESLint (errors fail), `tsc --noEmit`, PR comment with summary. |
| [`build-android-release.yml`](.github/workflows/build-android-release.yml) | EAS **local** Android **AAB**, submit to **Google Play**, inject secrets into `eas.json` from GitHub Secrets, update **`app_versions`** for Android. Triggers: `push` to `main`, tags `v*`, `workflow_dispatch`. |
| [`build-ios-release.yml`](.github/workflows/build-ios-release.yml) | EAS **iOS** production build with **`--auto-submit`** to App Store Connect, same secret injection pattern, update **`app_versions`** for iOS. Triggers: `push` to `main`, tags `v*`, `workflow_dispatch` (optional `skip_deploy`). |

**Android vs iOS on `push` to `main`:** The **Android** workflow builds only when `app.json` version is **newer** than the latest `v*` GitHub release tag (semver). The **iOS** workflow does **not** use that gate—it runs whenever the job is not skipped (`[skip-deploy]`, etc.) and release notes exist for the current version. Plan iOS pushes accordingly, or use `workflow_dispatch` / tags as needed.

**Secrets (configure in GitHub → Settings → Secrets and variables → Actions):**  
At minimum, workflows expect: `EXPO_TOKEN`, `GOOGLE_SERVICE_KEY` (Android Play API / submit), `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `FIREBASE_PROJECT_ID`, `EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY`, `EXPO_PUBLIC_POSTHOG_API_KEY`, `EXPO_PUBLIC_POSTHOG_HOST`, `SENTRY_AUTH_TOKEN`, and `SUPABASE_SERVICE_ROLE_KEY` (for `app_versions` API updates). **Do not** paste these into the repo.

More detail and historical notes: [`.github/README.md`](.github/README.md).

### Web & dashboard

- **Marketing site** (`cediwise-web-official`): Deployed separately (e.g. **Vercel** — see `vercel.json`). Production URL: **https://cediwise.app**.
- **Dashboard**: Deploy per your hosting policy (typically Vercel or similar for Next.js); configure Supabase service role and auth only in the host’s env, never in client bundles.

### Operational scripts

- **`scripts/sync-remote-baseline.sh`** — Supabase baseline sync (see `supabase/README.md`).
- **`scripts/backup-supabase-prod.sh`** — Database backup (review before use in production).

---

## Environment variables (overview)

Values differ by app. Mobile public keys are embedded at build time (`EXPO_PUBLIC_*`).

| Variable | Used by | Description |
| -------- | ------- | ----------- |
| `EXPO_PUBLIC_SUPABASE_URL` | Mobile | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_KEY` | Mobile | Supabase publishable / client key (see mobile README) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Mobile | JWT for `createClient` — must be the **anon** key, not service role |
| `EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY` | Mobile | Paystack **public** key (`pk_…`) |
| `EXPO_PUBLIC_POSTHOG_*` | Mobile | Product analytics |
| `FIREBASE_PROJECT_ID` | Mobile builds | Firebase project id |
| `SENTRY_AUTH_TOKEN` | CI / EAS | Upload symbols (CI only; not for app runtime) |

Firebase config files: `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) live under `cediwise-mobile-app/` (see mobile README). Supabase **service role** must **only** exist on servers, CI secrets, or Edge Functions — never in the mobile app.

---

## Data standards (Ghana 2026)

- **PAYE**: 7-tier graduated tax (0% from GHS 490)
- **SSNIT**: Capped at GHS 69,000 monthly insurable earnings (5.5% employee contribution)
- **Unified VAT**: 20% (15% VAT + 2.5% NHIL + 2.5% GETFund); GRA may apply additional levies (e.g. COVID-19 Health Recovery Levy)

---

## Tech stack

| Layer | Technologies |
| ----- | ------------ |
| **Mobile** | React Native, Expo (expo-router, dev client), Supabase, Firebase (auth, analytics), Google & Apple sign-in, Paystack (WebView), PostHog, Sentry, HeroUI Native, FlashList, Reanimated |
| **Web** | TanStack Start, Vite, React, Tailwind CSS, shadcn-style UI |
| **Dashboard** | Next.js, Supabase (SSR patterns), shadcn, Recharts |
| **Backend** | Supabase (Postgres, RLS, Realtime, Edge Functions); phone auth bridge via Firebase |

---

## Contributing & license

- **Contributing:** [CONTRIBUTING.md](CONTRIBUTING.md) — no secrets in commits; focused PRs; CLA applies.
- **License:** Dual-license, source-available — [LICENSE](LICENSE), [COMMERCIAL-LICENSE.md](COMMERCIAL-LICENSE.md), [CLA.md](CLA.md), [TRADEMARK.md](TRADEMARK.md).

This is **not** open source in the OSI sense. It allows personal use and community contributions while reserving commercial rights and trademark control for CediWise.

---

<p align="center">
  <sub>Built for Ghana by <a href="https://joshua-ansah.vercel.app">Joshua Ansah</a> • Offline-first • High-contrast UI</sub>
</p>
