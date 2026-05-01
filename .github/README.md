# GitHub Actions

**Canonical overview:** see the repository root [README.md](../README.md#deployment--release) (deployment, commit conventions, release notes, and workflow behavior).

## Workflows (summary)

| File | Role |
| ---- | ---- |
| `mobile-app-pr-check.yml` | PRs to `main`: mobile ESLint + TypeScript check |
| `build-android-release.yml` | EAS Android AAB (local build), Play Store submit, `app_versions` update |
| `build-ios-release.yml` | EAS iOS production build + App Store Connect auto-submit, `app_versions` update |

## Secrets (GitHub → Settings → Secrets and variables → Actions)

Configure at least:

- `EXPO_TOKEN`
- `GOOGLE_SERVICE_KEY` (Android Play API / submit)
- `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY`, `EXPO_PUBLIC_POSTHOG_API_KEY`, `EXPO_PUBLIC_POSTHOG_HOST`
- `SENTRY_AUTH_TOKEN`
- `SUPABASE_SERVICE_ROLE_KEY` (for `app_versions` REST updates from CI — server-only; never in client apps)

For the marketing site’s “latest release” integrations, set `VITE_GITHUB_REPO=owner/repo` in `cediwise-web-official` env if applicable.
