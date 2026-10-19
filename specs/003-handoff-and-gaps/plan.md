# Spec 003 plan

## Phase 1: Data

- `db/migrations/002-create-questions-and-handoffs.sql`.
- `src/server/repositories/question-repository.ts`: `create`, `findByConversation`, `listGaps({ days, search, page, page_size })` (group on normalized text, total via `count(distinct ...)`), `summary(days)`.
- `src/server/repositories/handoff-repository.ts`: `findByConversation`, `upsertFailed`, `markSent`, `list({ page, page_size })`, `countSent(days)`.

## Phase 2: Question log

- `QuestionService.answer(question, conversationId?)` records the outcome through `questionRepository.create`; failures are caught, logged with `logger.error`, and swallowed on purpose (decision: logging never breaks the answer).
- Validator gains optional `conversation_id`.

## Phase 3: Handoff

- `src/server/slack/slack-client.ts`: `postMessage(payload)` to `SLACK_WEBHOOK_URL`, 10s timeout, throws `SlackUnavailableError`. Accepts only `https://hooks.slack.com/` URLs, checked at send time so a bad URL breaks handoffs only.
- `src/server/services/handoff-message.ts`: builds Slack blocks from the log; `escapeSlack`; 10-exchange and 2,900-character limits per block.
- `src/server/services/handoff-service.ts`: 404 when the log is empty, 409 when already sent, store failed then rethrow as `HANDOFF_UNAVAILABLE`, mark sent on success.
- `src/server/validators/handoff-validator.ts`, `src/server/controllers/handoff-controller.ts`, `src/app/api/handoffs/route.ts`.

## Phase 4: Admin auth

- `src/server/auth/admin-session.ts`: Web Crypto HMAC-SHA256 over `expires_at`, keyed by `ADMIN_PASSWORD`; cookie `hg_admin`, `HttpOnly; Secure in production; SameSite=Lax; Path=/`, 12 hours. Constant-time compare. Works in the Edge runtime so middleware can use it.
- `src/middleware.ts`: guards `/admin/*` (except `/admin/login`) with a redirect and `/api/admin/*` (except sessions) with 401.
- `src/server/controllers/admin-session-controller.ts`, `src/app/api/admin/sessions/route.ts`.

## Phase 5: Admin API

- `src/server/validators/list-query-validator.ts` (`page`, `page_size` capped at 100, `search`, `days`).
- `src/server/services/admin-report-service.ts`, `src/server/controllers/admin-report-controller.ts`, routes `src/app/api/admin/gaps/route.ts` and `src/app/api/admin/handoffs/route.ts`.

## Phase 6: UI

- Chat: conversation id state, `Talk to a person` in the header and under not-answered replies, `HandoffForm`, `handoffsApi.ts`.
- `src/components/list/ListPage.tsx`: the shared list component (fetching, server paging, debounced search, duplicate-request guard, first-load vs refresh busy states, normalization, empty and error states).
- `src/app/admin/layout.tsx` (background, noindex), `src/app/admin/(auth)/login/page.tsx`, `src/app/admin/(dashboard)/layout.tsx` (nav, sign out), `src/app/admin/(dashboard)/gaps/page.tsx` (summary cards + `ListPage`), `src/app/admin/(dashboard)/handoffs/page.tsx`. `/admin` itself is redirected by the middleware. Components live in `src/features/admin/`.
- Admin pages are `noindex`.

## Phase 7: Tests and docs

- Unit: Slack escaping and message building, handoff service (AC3, AC4, AC5), question logging failure (AC2), admin session sign/verify and expiry, list-query validation, `ListPage` states.
- E2E: `e2e/handoff.spec.ts` with routed API (AC6), `e2e/admin.spec.ts` against the real server for redirects and 401 (AC7, AC8).
- Live checks against Neon with the dev server and curl (AC1, AC9), then a real Slack post once the webhook exists (AC10).
- `docs/openapi.yaml`, README, `.env.example` (`ADMIN_PASSWORD`, `SLACK_WEBHOOK_URL`).

## Risk

- A half-run handoff: the failed row is written before Slack is called, and marked sent after. If the process dies between Slack accepting and the update, the row says failed while Slack has the message; a retry posts a duplicate. Acceptable for a demo; noted.
- Weak admin password: the app refuses passwords shorter than 12 characters at sign-in time (`ADMIN_DISABLED`), so a short one can't be left in production by accident.

## Phase 8: Channels and inbox (amendment 2026-10-17)

- `db/migrations/003-handoff-notifications.sql`.
- `src/server/notifications/handoff-notifier.ts`: `HandoffNotifier`, `NotificationError`, `HandoffDetails`. `slack-notifier.ts` (wraps the existing message builder), `email-notifier.ts`, `webhook-notifier.ts`, `handoff-notifiers.ts` (reads `HANDOFF_NOTIFY`; unknown names are ignored with a warning so a typo can't take the app down).
- `src/server/email/email-service.ts` (Resend over `fetch`, console transport without a key outside production) and `src/server/email/templates/{layout,handoff}.html.hbs`, `handoff.txt.hbs` with Handlebars. `next.config.ts` traces the templates into the server bundle.
- `HandoffRepository`: `create` (insert, conflict means 409), `findById`, `recordNotification`, `list(status, page, page_size)` with notifications aggregated, `setHandled`, `countSince(days)`.
- `HandoffService.create` saves only; `HandoffService.notify(id)` runs every channel with `Promise.allSettled` and never throws. The controller schedules `notify` with Next's `after()`, injected so tests run it inline.
- Admin: `[handoff_id]/route.ts` (GET, PATCH), status filter, detail and handled endpoints in the report service and controller.
- UI: `ListPage` gains `params` and expandable rows; `HandoffInbox` (tabs, channel chips, expanded `HandoffDetail` with conversation, reply and handled actions). Nav label becomes "Inbox".
- Landing copy: handoff mentions Slack, email or a webhook.
- Tests: notifier unit tests (Slack, email render and reply-to, webhook signature), service notify with mixed results, repository-free inbox controller tests, e2e inbox flow.

Risk: a notification lost if the server stops between the response and `after()` finishing. The handoff itself is saved and visible in the inbox, so nothing is lost for the team.
