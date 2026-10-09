# Project structure

The repository follows the SecureSense AI blueprint and keeps the MVP in one
monorepo:

- `apps/web/` — planned Next.js, TypeScript, and Tailwind application. Its
  `app/` subdirectories reserve space for authentication, protected dashboard
  pages, admin screens, and API handlers; `components/`, `lib/`, `public/`,
  and `tests/` separate shared UI, application helpers, assets, and tests.
- `apps/desktop/` — optional Tauri wrapper around the web experience.
- `services/ml-api/` — planned private Python/FastAPI inference service,
  feature extraction, model, explanation, security, and training modules.
- `packages/shared-types/` — shared API contracts and schemas.
- `database/` — database indexes, synthetic seed data, and migration notes.
- `docs/` — project design and evaluation documentation.
- `scripts/` — safe setup and evaluation helpers.

This commit establishes directories only; app dependencies and feature
implementations will be added in later milestones.

## Safety constraint

Analyze submitted URLs from their text and extracted local features without
opening or fetching them. Results should show evidence and uncertainty rather
than guarantee safety.
