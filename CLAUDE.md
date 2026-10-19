# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Sourced AI: a RAG support agent that answers questions from a store's own docs with citations, refuses when the docs don't cover it, and hands the conversation to a person. The demo store is Pinebrook Supply (fictional, docs in `content/pinebrook/`). Routes: landing `/`, chat `/demo`, password-protected admin `/admin` (overview, conversations, inbox, gap report, documents, settings). API contract lives in `docs/openapi.yaml`.

## Commands

```bash
npm run dev          # Next dev server on port 3100 (not 3000)
npm run typecheck    # tsc --noEmit
npm run lint
npm run test         # Vitest, all src/**/*.test.{ts,tsx}
npx vitest run src/server/services/question-service.test.ts   # one file
npx vitest run -t "falls back to Groq"                        # by test name
npm run e2e          # Playwright; starts or reuses the dev server on 3100
npx playwright test e2e/demo-chat.spec.ts                      # one e2e file
E2E_BASE_URL=https://... npm run e2e                           # against a deployed site

npm run db:migrate   # applies db/migrations/*.sql once each (tracked in schema_migrations)
npm run ingest       # chunks + embeds every content/pinebrook/*.md as a sample doc (safe to rerun)
npm run seed:demo    # replaces the sample activity set (30 days ending now); --clear removes it, --reset wipes all activity first
npm run smoke -- "a question"   # shows matched passages and similarity scores; use to tune MIN_SIMILARITY
```

Scripts load `.env` via `tsx --env-file=.env`; `playwright.config.ts` loads it too. Vitest and builds never need `DATABASE_URL` or AI keys: the DB client and providers are created lazily or injected.

## Architecture

Single Next.js 15 App Router app. All backend logic lives in `src/server/`, layered:

`src/app/api/**/route.ts` → `controllers/` → `services/` → `repositories/` (+ `ai/`, `notifications/`, `email/`)

- **Routes are one-liners** that export a controller method (`export const POST = questionController.create`). Put logic in the controller/service, never the route file.
- **Controllers** parse the body with a zod schema from `validators/`, call the service with `callerOf(request)` (a hashed visitor id for rate limiting), serialize to snake_case, and return through `responseHandler`. All errors go through `responseHandler.fromError`, which maps `ZodError` to 400 and `ApiError` (`http/api-error.ts`, with `ErrorCode`) to its status, adding `Retry-After` when `context.retry_after_seconds` is set. Response envelope is `{ success, message, data }` or `{ success: false, message, code, ... }`.
- **Services are classes with constructor-injected dependencies** typed as `Pick<Repo, "method">`, plus a module-level singleton built from `loadConfig()` at the bottom of the file. Unit tests construct the class directly with `vi.fn()` fakes; follow this pattern for new services. Server tests that need Node APIs start with `// @vitest-environment node` (default env is jsdom).
- **Config**: every env var is declared and defaulted in `src/server/config.ts` (zod). Empty `KEY=` values are treated as unset. Add new env vars there and to `.env.example`.
- **DB**: Neon serverless HTTP driver (`db/db-client.ts`) with pgvector. Migrations are plain SQL split on line-ending semicolons and run one statement per query, so avoid functions/DO blocks with internal semicolons. New migrations are numbered `NNN-name.sql`.

### Answer pipeline (`services/question-service.ts`)

1. Rate limits (`question` per visitor, `question_daily` global; Postgres-backed, skipped when no caller, e.g. `npm run smoke`).
2. Embed the question with Gemini (embeddings are always Gemini, regardless of `AI_PROVIDER`).
3. `findClosest` passages, keep those with similarity >= `MIN_SIMILARITY`. **No relevant passage means no model call** and a fixed "won't guess" reply.
4. `answer-prompt.ts` builds the prompt; the model returns JSON `{ is_answered, answer, citations: [passage numbers] }`, parsed by `parseModelAnswer`. The model may also decline.
5. Providers come from `ai/ai-providers.ts`: primary per `AI_PROVIDER` (gemini | groq | openai | anthropic), with Groq appended as fallback when it has a key. Fallback only triggers on `AiRateLimitError` / `AiUnavailableError`.
6. Every question is logged with its citations, its embedding and an `origin` (feeds the admin); a failed log write must never fail the answer. An unanswered question joins the nearest earlier unanswered one at cosine >= `GAP_MATCH_SIMILARITY` (0.86) and takes its `gap_id`, all inside the insert in `question-repository.ts`. That is how the gap report groups by meaning in SQL.

### Handoffs (`services/handoff-service.ts`)

Saving the handoff row is the request's whole job; notifications run after the response via Next's `after()` (injected as `schedule` so tests can control it). `HANDOFF_NOTIFY` selects channels (slack, email via Resend + Handlebars templates in `email/templates/`, signed webhook with `X-Sourced-Signature`). Each channel's result is recorded per handoff; notifier failures never throw. Handlebars is a `serverExternalPackages` entry and the templates are added via `outputFileTracingIncludes` in `next.config.ts`; keep both if templates move.

### Traffic origin

`questions.origin` and `handoffs.origin` are `visitor`, `sample` (from `seed:demo`) or `test`. A request is test traffic when `x-sourced-test` matches `E2E_TRAFFIC_TOKEN` (`http/caller-context.ts`). Every admin query filters test rows through `visibleOrigin()` (`repositories/origin-filter.ts`) unless the admin request itself carries the token, which is how the e2e suite sees its own rows and nobody else does. New admin queries must use it.

### Documents

`services/document-service.ts` is shared by uploads (`/api/admin/documents`, multipart) and `npm run ingest`. Markdown with `# Title` / `## Section` keeps one passage per section; plain text and PDF (`unpdf`) are packed by size in `chunk-service.ts`. Replace and delete swap passages in one transaction; documents are soft deleted and their passages hard deleted. `/demo` lists docs from the database and is revalidated after each change.

### Admin auth

`src/middleware.ts` guards `/admin/*` and `/api/admin/*` with a signed session cookie (`server/auth/admin-session.ts`) derived from `ADMIN_PASSWORD`, unless `ADMIN_PUBLIC=true` (`server/auth/admin-access.ts`), which opens the whole dashboard for the public demo. e2e tests read the same flag and skip or adapt their sign-in steps. `/api/admin/sessions` is the only open admin endpoint (sign-in, with lockout after repeated wrong passwords).

### Frontend

- `src/features/<feature>/` holds a feature's components, client API wrappers (`*Api.ts`) and colocated tests. `src/components/ui/` and `src/components/list/` (shared `ListPage`) are cross-feature.
- Every admin list goes through `ListPage` (fetching, paging, search, states, `toolbar` for tabs, `onRowOpen` for side panels, `renderExpanded` for inline rows). All admin fetches live in `features/admin/adminApi.ts`. The dashboard layout is a server component that reads the open-handoff count, so call `router.refresh()` after changing a handoff.
- Charts in `features/admin/charts/` are hand-written SVG/HTML following the dataviz skill: palette tokens `--series-1`, `--series-2`, `--heat-high` in `globals.css` were validated for both themes; each chart has a legend or direct labels, a keyboard-reachable readout and a screen-reader table.
- Tailwind v4 (config in `globals.css`), `cn()` from `src/lib/cn.ts`, `motion` for animation. Landing animations must respect reduced motion; both light and dark themes are supported.

## Workflow conventions

- Work is spec-driven: `specs/NNN-slug/{spec.md,plan.md,tasks.md}`, one folder per feature. A new feature gets a new spec number; changes to a shipped flow amend the owning spec (as an amendment with new tasks). Code comments and tests cite the spec and acceptance criteria they implement (e.g. `// Spec 002, AC3`).
- The landing page and README must stay truthful about what is actually built, since this is a portfolio piece.
- Never read or print `.env`; use `.env.example` for variable names.
