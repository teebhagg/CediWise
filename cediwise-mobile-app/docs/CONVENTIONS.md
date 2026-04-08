# File Naming Convention

All SQL migration files and Markdown spec/plan/PRD documents use a timestamp-based naming convention matching Prisma migration format.

## Format

```
YYYYMMDDHHmmss_descriptive-name.ext
```

- `YYYY` — 4-digit year
- `MM` — 2-digit month (01-12)
- `DD` — 2-digit day (01-31)
- `HH` — 2-digit hour in 24h UTC (00-23)
- `mm` — 2-digit minute (00-59)
- `ss` — 2-digit second (00-59)
- `descriptive-name` — kebab-case identifier
- `ext` — `.sql` for migrations, `.md` for specs/plans/PRDs

## Examples

- `20260407143052_profiles_version.sql`
- `20260407120000_preferences-pipeline-fix-design.md`
- `20260407150000_vitals-wizard-enhancement-design.md`
- `20260327000600_sme_categories_updated_at.sql`

## Applies To

| Directory | File Types |
|-----------|------------|
| `supabase/` | All `.sql` migration files |
| `docs/superpowers/specs/` | All `.md` spec files |
| `docs/plans/` | All `.md` plan files |
| `docs/prd/` | All `.md` PRD files |

## Why

- **Uniqueness** — Timestamps to the second guarantee no filename collisions
- **Chronological ordering** — Files sort naturally by name, showing project history
- **Prisma alignment** — Matches the existing Prisma migration naming already used in the codebase
- **Auditability** — Creation time is encoded in the filename, no need to check git history

## How to Generate

Use UTC time:

```bash
date -u +"%Y%m%d%H%M%S"
# Output: 20260407234546
```

Then append your descriptive name: `20260407234546_my-feature-design.md`
