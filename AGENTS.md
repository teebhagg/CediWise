# CediWise repository guide

## Start here

- Read [the system overview](docs/architecture/SYSTEM_OVERVIEW.md) and [the module map](docs/architecture/MODULE_MAP.md) before broad repository work.
- Read the relevant feature's `CURRENT_STATE.md`, then its `IMPROVEMENTS.md` and `IMPLEMENTATION_PLAN.md` before changing that feature.
- Check the matching audit when work touches security, user experience, performance, or test coverage.
- The root repository is a monorepo, but each application has its own package manifest and toolchain. The root `package.json` does not define the app commands.

## Source and evidence rules

- Application code is under `cediwise-mobile-app/`, `cediwise-web-official/`, and `cediwise-dashboard/`. Supabase migrations and Edge Functions at `supabase/` are the canonical database/backend source.
- Treat this knowledge base as an index and a record of reviewed observations. Current source, migrations, and package-specific guidance override it when they disagree.
- Distinguish source presence from build, device, deployment, and production-runtime evidence. Never infer that a migration, function, policy, secret, cron job, or feature is live from local files alone.
- The first baseline was written from the working tree on 2026-10-27. That checkout contained unrelated modified, staged, and untracked work. Recheck Git state and source before relying on snapshot-specific findings.
- In documentation, label observations, recommendations, and items needing external verification. Update `Last reviewed` when a page is rechecked; do not silently turn an old proposal into current state.

## Domain and data guidance

- Financial calculations are high-impact. Before changing PAYE, SSNIT, VAT, tax bands, thresholds, or prices, identify every client/server implementation and verify current rules with the relevant official Ghana source. Keep test cases and explanatory copy aligned with the verified rule set.
- Budget and SME records are user financial data. Preserve user ownership checks, Supabase RLS, local-user scoping, and queued-write semantics when changing persistence.
- Supabase DDL belongs in timestamped files under `supabase/migrations/`. Follow [the database change workflow](supabase/docs/database-change-workflow.md) and [operator preflight](supabase/docs/OPERATOR_PREFLIGHT.md). Keep legacy SQL read-only.
- Public `EXPO_PUBLIC_*` and `NEXT_PUBLIC_*` values are client-visible. Never put service-role keys, payment secrets, AI keys, or mail credentials into client code or public environment variables.
- Android SMS permissions and MoMo import require a separate policy, release, migration, and device-readiness check. Source implementation is not Play approval or production readiness.

## Verification and operations

- Use the scripts in the relevant app's `package.json`; do not assume a root-level build or test command exists.
- Do not run database pushes, function deployments, store submissions, or other live writes unless the user explicitly asks for that operation and the target project is verified.
- Report what was actually inspected or run. Static review, automated checks, simulator/device behavior, deployment status, and live behavior are separate evidence.
- Preserve existing user changes. Do not reset, clean, stage, commit, or push unrelated work.

## Git commit governance

- Never run `git add`, `git commit`, or `git push` unless the user has explicitly authorized the corresponding operation. Do not stage files automatically.
- Before asking to commit, present a proposal with: **Intent** (why and what it resolves), **Content** (exact files and logical changes), and **Commit message** in `<type>(<scope>): <short description>` form.
- Allowed commit types are `feat`, `fix`, `refactor`, `style`, `docs`, `test`, and `chore`. Stop and wait for explicit user confirmation before any commit operation.

## Keeping this knowledge base current

- Update the architecture map when application ownership, backend entry points, or principal data flows change.
- Update feature state when its routes, data model, calculation source, or release gates change. Keep proposals in `IMPROVEMENTS.md` and ordered work in `IMPLEMENTATION_PLAN.md`.
- Add audit findings only with a file-level source or verification gap. Include priority, impact, evidence, and a concrete next step. Do not describe an unmeasured performance concern as a measured regression.
