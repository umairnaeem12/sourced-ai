# Sourced AI

An AI support agent that answers customer questions from a business's own docs, links the source behind each answer, says when it doesn't know, and hands the conversation to a person. The demo runs on Pinebrook Supply, a fictional online store.

Status: landing page (spec 001), the answering chat at `/demo` (spec 002), human handoff (spec 003), launch hardening (spec 004), and the admin dashboard at `/admin` (spec 005): overview charts, every conversation with its sources, the handoff inbox with notes, gaps grouped by meaning, document upload, and settings with test alerts.

## Stack

Next.js 15 (App Router), TypeScript, Tailwind v4, Neon Postgres with pgvector. Gemini answers and embeds (Groq is the automatic fallback); `AI_PROVIDER` switches answers to Groq, OpenAI or Claude. Handoffs land in an admin inbox and can notify Slack, email (Resend) or any tool through a signed webhook. Planned: Vercel hosting. All free tiers.

## Run it

```bash
npm install
cp .env.example .env   # add GEMINI_API_KEY and DATABASE_URL; .env is git-ignored
npm run db:migrate     # creates the tables (safe to rerun)
npm run ingest         # loads every .md in content/pinebrook as sample docs (safe to rerun)
npm run seed:demo      # 30 days of sample activity so the admin looks like a store in use
npm run smoke          # asks the demo questions and prints match scores
npm run dev            # http://localhost:3100, chat at /demo, admin at /admin
```

Set `ADMIN_PASSWORD` (6+ characters) to open `/admin`. For a public portfolio demo, `ADMIN_PUBLIC=true` opens the whole dashboard to everyone (no password, full access, with a link on `/demo`); leave it empty for a real store. "Talk to a person" handoffs always land in the admin inbox; `HANDOFF_NOTIFY` adds Slack, email (Resend) and/or a signed webhook for any other tool. See `.env.example` for each channel's settings.

Visitors are rate limited (20 questions per 10 minutes, 5 handoffs per hour, admin lockout after 5 wrong passwords) and the demo stops at `DAILY_QUESTION_LIMIT` questions a day.

More docs can be uploaded from `/admin/documents` (Markdown, plain text or PDF, up to 2 MB, 25 docs at most); the chat answers from them on the next question.

`npm run seed:demo` replaces the sample set each time it runs, ending now. `npm run seed:demo -- --clear` removes it. `npm run seed:demo -- --reset` deletes every question and handoff first (documents are kept), for a clean demo database.

`npm run smoke -- "your own question"` tries any question and shows which passages matched and how closely. Use it to tune `MIN_SIMILARITY`.

The API is described in `docs/openapi.yaml`.

## Checks

```bash
npm run typecheck
npm run lint
npm run test   # Vitest
npm run e2e    # Playwright, reuses a running dev server on 3100
```

`E2E_BASE_URL=https://your-deploy.vercel.app npm run e2e` runs the same suite against a deployed site.

Playwright reads `.env` itself. The signed-in admin tests run when the server has `ADMIN_PASSWORD` and the same value is in `E2E_ADMIN_PASSWORD`; otherwise they are skipped. Set `E2E_TRAFFIC_TOKEN` to any long random string so the suite's own questions and handoffs stay out of the admin reports.

## Layout

- `specs/` one folder per feature: `spec.md`, `plan.md`, `tasks.md`
- `src/app/` routes
- `src/features/<feature>/` components and tests for one feature
- `src/components/ui/` shared primitives
- `e2e/` Playwright specs
