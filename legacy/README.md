# Legacy SQL archive

All historical `.sql` files that previously lived under:

- `cediwise-mobile-app/supabase/` (loose files + `migrations/`)
- `cediwise-dashboard/db/migrations/`
- `cediwise-web-official/db/migrations/`

…are archived here for **audit and archaeology only**.

## Rules

- **Do not** apply these files to production.
- **Do not** copy fragments back into `supabase/migrations/` unless you are intentionally replaying a one-off (almost never).
- The **only** migration source of truth is [`/supabase/migrations/`](../supabase/migrations/) at the repo root, managed with the Supabase CLI.

See [`INVENTORY.md`](INVENTORY.md) for per-file classification.
