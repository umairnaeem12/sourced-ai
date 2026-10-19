# Spec 005 plan

## Phase 1: Schema and settings

- `db/migrations/005-admin-dashboard.sql`:
  - `questions`: `citations jsonb not null default '[]'`, `question_embedding vector(768)`, `gap_id uuid`, `origin text not null default 'visitor'` with a check; indexes on `(origin, created_at)` and `gap_id`; hnsw index on `question_embedding`.
  - Backfill: `gap_id = md5(<spec 003 normalized text>)::uuid` for unanswered rows, so the old grouping carries over. Idempotent (only rows where `gap_id is null`).
  - `handoffs.origin`; `gap_resolutions (gap_id uuid primary key, resolved_at)`; `handoff_notes (id, handoff_id references handoffs on delete cascade, body, created_at)` with an index on `(handoff_id, created_at)`.
  - `documents`: `origin`, `source_filename`, `char_count`, `deleted_at`; drop `documents_slug_key`, add a unique index on `slug where deleted_at is null`.
- `src/server/config.ts`: `STORE_TIMEZONE`, `E2E_TRAFFIC_TOKEN`. Both added to `.env.example`.

## Phase 2: Question log v2

- `http/caller-context.ts`: `origin` is `test` when `x-sourced-test` equals `E2E_TRAFFIC_TOKEN` (constant-time compare), otherwise `visitor`.
- `QuestionService.resolve` returns the embedding and citations; `answer` logs `citations`, `question_embedding`, `origin`.
- `QuestionRepository.create`: for an unanswered row, picks `gap_id` from the closest unanswered non-test row in the last 90 days with similarity at or above `GAP_MATCH_SIMILARITY` (0.86, tuned with real embeddings: rewordings scored 0.93 to 0.99, different asks up to 0.84), else a new uuid. One SQL statement.
- `HandoffService.create` stores `origin` from the caller.

## Phase 3: Admin read APIs

- `repositories/analytics-repository.ts`: overview totals, previous totals, daily series via `generate_series` in `STORE_TIMEZONE`, top documents from `citations`, weekday by hour counts, median handle time. Every query filters `origin <> 'test'`.
- `repositories/conversation-repository.ts`: conversation list grouped by `conversation_id` with status filter and search, paged in SQL; detail.
- `QuestionRepository.listGaps` grouped by `gap_id` with wordings, 14-day counts, resolution and `asked_again`, paged in SQL. `gap-repository.ts` for resolutions.
- `HandoffRepository`: `origin` filter, `notes`, `addNote`, open count.
- Services: `analytics-service.ts`, `conversation-service.ts`; `admin-report-service.ts` gains gaps v2 and notes.
- Controllers and routes: `admin-overview-controller.ts`, `admin-conversation-controller.ts`; gaps PATCH; notes POST. `notification-status.ts` maps stored errors to `problem`.
- Error codes: `GAP_NOT_FOUND`, `DOCUMENT_NOT_FOUND`, `DOCUMENT_INVALID`, `DOCUMENT_LIMIT_REACHED`, `NOTIFICATION_NOT_CONFIGURED`, `NOTIFICATION_FAILED`.

## Phase 4: Documents

- `services/chunk-service.ts`: `parsePlainDocument(title, text)` splits paragraphs into passages of up to 1,200 characters, headed by their first line.
- `services/document-text.ts`: file type check by extension and content, size limit, PDF text via `unpdf@1.8.1`.
- `services/document-service.ts`: list, detail, create, replace, delete (soft document, hard passages, one transaction), slug generation, limit of 25. Shared with `scripts/ingest.ts`, which now loads every `.md` in `content/pinebrook` with `origin = 'sample'`.
- `PassageRepository`: `findClosest` and counts skip deleted documents.
- `admin-document-controller.ts` reads `multipart/form-data` with `request.formData()`; routes under `/api/admin/documents`.
- `/demo` reads the document list on the server (revalidated every 60 seconds), falling back to the static list if the database can't be reached.

## Phase 5: Settings and test alerts

- `services/settings-service.ts`: builds the read-only view from `AppConfig`; webhook URL reduced to its host.
- `HandoffNotifier.send` takes an `isTest` flag: Slack header, email subject prefix, webhook event `handoff.test`.
- `services/notification-test-service.ts`: sample conversation, rate limit rule `admin_test_alert` (5 per 10 minutes).
- `admin-settings-controller.ts`; routes `/api/admin/settings` and `/api/admin/notification-tests`.

## Phase 6: Sample and test activity

- `src/server/sample/pinebrook-activity.ts` and `sample-activity-builder.ts` (pure, unit tested): question templates with answers written from the real docs and their cited sections, gap questions, handoff emails and notes.
- `scripts/seed-demo.ts` (`npm run seed:demo`, flags `--clear` and `--reset`): embeds the distinct sample questions once, builds 30 days of activity with weekday and business-hours weighting, resolves citations against the live passages, inserts in batches inside one transaction per table. `--reset` deletes every question and handoff first and prints the counts.
- `playwright.config.ts`: loads `.env` when present and sends `x-sourced-test` when `E2E_TRAFFIC_TOKEN` is set.

## Phase 7: Admin UI

- Shell: `features/admin/AdminShell.tsx` (sidebar, mobile drawer, open count, sample notice), `AdminIcons.tsx`. `(dashboard)/layout.tsx` uses it; middleware sends `/admin` to `/admin/overview`.
- Charts in `features/admin/charts/` as plain SVG following the dataviz skill: stacked daily bars, bar list, weekday by hour heatmap, sparkline. Each with a visually hidden table.
- Pages: `overview`, `conversations`, `gaps` (v2), `handoffs` (side panel), `documents`, `settings`. Shared `Transcript.tsx` (messages with sources), `SidePanel.tsx`.
- `ListPage` gains optional `onRowOpen` and `selectedKey` so the inbox and documents can open a side panel. Expanding rows keeps working for the other lists.
- All server calls stay in `adminApi.ts` (and `documentsApi.ts` for uploads).

## Phase 8: Tests and docs

- Unit: caller origin, plain-text chunking, document validation, notification status mapping, settings redaction, overview day filling, shell navigation, charts' text alternatives, transcript sources.
- E2E: shell and mobile drawer, overview, conversations filters, notes, gap grouping and resolve, document upload and delete, settings test alert refusal, test traffic hidden.
- `docs/openapi.yaml`, README (seed and docs workflow), CLAUDE.md.

## Risk

- **Migration 005 swaps the documents slug constraint.** If it half-runs, the migration runner's transaction rolls the whole file back. Manual rollback: drop the partial index and re-add `unique (slug)`.
- **`seed:demo --reset` deletes all questions and handoffs.** It only runs with the explicit flag, prints the counts it deleted, and never touches documents or passages.
- **Gap grouping threshold.** Too low merges unrelated questions; too high keeps duplicates apart. Tuned against real embeddings with a test pair set before shipping; it only affects new rows, so a later change needs no migration.

## Phase 9: Build notes (2026-10-20)

- Test rows stay visible to an admin request that carries the test token, so the e2e suite can check its own handoffs; `visibleOrigin()` in `repositories/origin-filter.ts` applies it to every admin query.
- The six admin pages were built in parallel against the shared pieces (`ListPage` gained `toolbar`, `onRowOpen`, `selectedKey`, `showCount`; `SidePanel`, `Transcript`, `ChannelStatus`).
- Chart colors were validated with the dataviz palette checks in both themes: light `#0a9688` / `#d07a0c`, dark `#17a998` / `#c97d18`.

## Phase 10: Public demo dashboard (amendment 2026-10-20)

- `src/server/config.ts`: `ADMIN_PUBLIC` (boolean from "true"/"1", default false); `server/auth/admin-access.ts`: `isAdminPublic(env)` shared by the middleware, the layout and `/demo`.
- `src/middleware.ts`: skips the session check when public; `/admin/login` redirects to the overview.
- `AdminShell`: public notice, Sign out hidden. `/demo` header link. Settings row for public access.
- Rate limit rule `document_write` (20 per hour per visitor) in `DocumentService.create` and `replace`, keyed by the caller.
- Risk: public write access means anyone can delete documents. Rollback is unsetting `ADMIN_PUBLIC`; deleted documents are soft deleted, and `npm run ingest` restores the sample docs.
