# Spec 003: Human handoff and gap report

Status: in progress (Day 3, 2026-10-17)

## Summary

Two things a support team needs once Sourced AI is answering. First, a customer can ask for a person at any point; the conversation so far, plus an email if they leave one, is posted to the team's Slack channel. Second, every question is logged, and a password-protected admin area shows the questions Sourced AI couldn't answer, grouped and counted, so the team knows which doc to write next. The admin area also lists handoffs and whether each reached Slack.

Builds on spec 002 (`POST /api/questions`, `/demo`).

## Scope

### In scope

- Logging every question with its outcome and the answer shown.
- A conversation id per chat session, sent with each question.
- "Talk to a person" in the chat header (any time after the first question) and under every "not answered" reply.
- A handoff form in the chat with an optional email.
- Posting the handoff to Slack through an incoming webhook.
- Admin sign-in with one password from `ADMIN_PASSWORD`, kept in a signed, HTTP-only cookie for 12 hours.
- Admin pages: gap report (with a summary of the last 30 days) and handoffs list.
- A shared list component for the two admin lists (frontend data-tables convention).

### Out of scope

- Replying to the customer from Slack or the admin area; the team replies by email outside Sourced AI.
- Grouping questions by meaning. Gaps are grouped by normalized text (case, spacing and trailing punctuation ignored).
- Marking a gap as fixed, editing docs from the admin area, exporting.
- Multiple admin users or roles.
- Per-visitor rate limiting (spec 004). The one-handoff-per-conversation rule limits Slack spam in the meantime.

## Decisions

- **The server builds the Slack transcript from its own question log**, keyed by conversation id. The client never sends message text for a handoff, so a visitor can't post arbitrary text to Slack as "Sourced AI said".
- **Logging a question never breaks the answer.** If the log write fails, the customer still gets the answer and the failure is logged as an error.
- **One handoff per conversation.** A second request for a conversation already sent returns 409. A failed one can be retried.
- **Customer text is escaped for Slack** (`&`, `<`, `>`), so `<!channel>` or a link can't be injected.
- **Admin auth is a cookie, not a token in the URL**, so the password never appears in history or logs. Without `ADMIN_PASSWORD` set, sign-in is refused.

## Behaviour

1. Opening `/demo` starts a new conversation id. Each question is sent with it.
2. Every answered or not-answered question is stored: conversation id, question, outcome, the text shown, best similarity, provider.
3. "Talk to a person" is disabled until the first reply, then opens a short form: "Add your email if you'd like a reply (optional)" and "Send to the team".
4. Sending posts to Slack: a header, the store name, the email or "No email left", how many questions were asked and how many went unanswered, then the conversation (up to the last 10 exchanges).
5. On success the chat shows "Sent to the Pinebrook Supply team" and, with an email, "They'll reply to you at …"; without one, "They can't reply without an email, but they'll see what you needed." The button becomes "Team notified" and stays disabled.
6. If Slack isn't configured or fails, the handoff is stored as failed and the chat says "Couldn't reach the team right now. Try again in a minute." The customer can retry.
7. An invalid email is rejected in the form before sending.
8. `/admin` redirects to `/admin/login` without a valid session, and to `/admin/gaps` with one.
9. The gap report shows: questions in the last 30 days, answered rate, unanswered count, handoffs sent; then a paged table of unanswered questions with times asked and last asked, most asked first, with search.
10. The handoffs page lists each handoff: when, email, questions in the conversation, Slack status.
11. "Sign out" ends the session.

## API changes

All responses use the spec 002 envelope.

`POST /api/questions` (amends spec 002): body gains optional `conversation_id` (uuid).

`POST /api/handoffs`: body `{ "conversation_id": uuid, "email"?: string }`.
- 201 `{ handoff: { id, status: "sent" } }`, message "Handoff sent".
- 400 `VALIDATION_ERROR` (bad uuid or email).
- 404 `CONVERSATION_NOT_FOUND`: no questions logged for that id.
- 409 `HANDOFF_ALREADY_SENT`.
- 503 `HANDOFF_UNAVAILABLE`: Slack not configured or failed; stored as failed.

`POST /api/admin/sessions`: body `{ "password": string }`. 204 and sets the cookie, or 401 `INVALID_CREDENTIALS`. 503 `ADMIN_DISABLED` when `ADMIN_PASSWORD` is unset.

`DELETE /api/admin/sessions`: 204, clears the cookie.

`GET /api/admin/gaps?page=&page_size=&search=&days=30`: `{ gaps: [{ question, times_asked, last_asked_at }], summary: { questions, answered, unanswered, handoffs_sent, days }, pagination }`.

`GET /api/admin/handoffs?page=&page_size=`: `{ handoffs: [{ id, created_at, email, question_count, status, error }], pagination }`.

Admin endpoints return 401 `UNAUTHENTICATED` without a valid session. `page_size` defaults to 20 and is capped at 100.

## Data changes

Migration 002:

- `questions`: `id` uuid, `conversation_id` uuid null, `question` text, `is_answered` boolean, `answer_text` text, `top_similarity` real null, `provider` text null, `created_at`. Indexes on `conversation_id` and `(is_answered, created_at)`.
- `handoffs`: `id` uuid, `conversation_id` uuid unique, `email` text null, `status` text (`sent` | `failed`), `error` text null, `created_at`, `sent_at` null.

## Acceptance criteria

- AC1: Asking a question on `/demo` writes one `questions` row with the conversation id and outcome.
- AC2: A failure writing the log still returns the answer (unit test with a failing repository).
- AC3: A handoff for a conversation with questions posts one Slack message built from the stored log, with customer text escaped; a second request returns 409.
- AC4: With no `SLACK_WEBHOOK_URL`, a handoff returns 503 `HANDOFF_UNAVAILABLE` and a `failed` row; retrying after configuring Slack succeeds.
- AC5: A handoff for an unknown conversation returns 404 `CONVERSATION_NOT_FOUND`.
- AC6: In the chat, "Talk to a person" is disabled before the first reply; after sending, the confirmation shows and the button reads "Team notified".
- AC7: `/admin/gaps` without a session redirects to `/admin/login`; `GET /api/admin/gaps` without a session returns 401.
- AC8: A wrong password returns 401 and no cookie; the right one opens the gap report.
- AC9: The gap report groups "Do you price match?" and "do you price match" as one row with times asked 2.
- AC10: Live check: a real handoff appears in the Slack channel, and the handoffs page shows it as sent.
- AC11: typecheck, lint, unit tests, e2e and build pass; `openapi.yaml` updated.

## Amendment (2026-10-17)

Owner review: not every team uses Slack. Slack becomes one notification channel among several, and the admin area becomes an inbox that works with no channel at all. These supersede the matching items above.

### Decisions (revised)

- **A handoff succeeds once it is saved.** The customer's confirmation no longer depends on any outside service. Notifications are sent after the response and their results are recorded per channel, so a Slack or email outage shows up in the inbox, never in the chat. (Replaces "store failed then return 503".)
- **Notification channels are a setting**, like the AI provider: `HANDOFF_NOTIFY` is a comma list of `slack`, `email`, `webhook`. Empty means inbox only. As with the AI provider, the channels sit behind one small notifier interface; nothing else gets one.
- **Email goes through Resend** (owner's choice), from one email service, with templates as files on a shared layout. The email's reply-to is the customer's address when they left one, so the team can reply straight from their mail client. Without `RESEND_API_KEY` outside production, the email is written to the server log and recorded as `logged`.
- **The generic webhook** lets any other tool receive handoffs (Microsoft Teams, Discord, WhatsApp, a CRM, n8n, Make, Zapier). It posts a JSON `handoff.created` event and, when `HANDOFF_WEBHOOK_SECRET` is set, signs the body with HMAC-SHA256 so the receiver can check it came from Sourced AI.

### Behaviour (revised)

- **B4 (revised)** - After a handoff is saved, each channel in `HANDOFF_NOTIFY` is notified: Slack (as before), email to `HANDOFF_EMAIL_TO`, and/or a POST to `HANDOFF_WEBHOOK_URL`.
- **B5 (revised)** - The customer sees "Sent to the Pinebrook Supply team" as soon as the handoff is saved.
- **B6 (revised)** - Only a failure to save the handoff reaches the customer ("Something went wrong on our side. Try again."). A failed notification is recorded with its reason and shown in the inbox.
- **B10 (revised)** - The handoffs page is an inbox with Open, Handled and All tabs. Each row shows when, the customer's email, the number of questions and one status chip per channel (sent, logged, failed with the reason). Expanding a row shows the full conversation, "Reply by email" (when there is an email) and "Mark handled" or "Reopen".
- **B12 (new)** - The handoff email has the store name in the subject, the counts, the conversation with unanswered replies marked, and a link to the inbox.
- **B13 (new)** - The webhook body is `{ event, sent_at, store, handoff: { id, created_at, email, question_count, unanswered_count }, conversation: [{ question, answer, is_answered, asked_at }] }` with headers `X-Sourced-Event`, `X-Sourced-Delivery` (the handoff id) and, with a secret, `X-Sourced-Signature: sha256=<hex>`. Only `https://` URLs are accepted, plus `http://localhost` for testing.

### API changes (revised)

- `POST /api/handoffs`: 201 `{ handoff: { id, status: "received" } }`. 409 `HANDOFF_ALREADY_SENT` when the conversation already has a handoff. `HANDOFF_UNAVAILABLE` is retired.
- `GET /api/admin/handoffs?status=open|handled|all&page=&page_size=`: rows `{ id, created_at, email, question_count, is_handled, handled_at, notifications: [{ channel, status, error }] }`. Default `open`.
- `GET /api/admin/handoffs/:handoff_id`: the row plus `conversation: [{ question, answer_text, is_answered, created_at }]`. 404 `HANDOFF_NOT_FOUND`.
- `PATCH /api/admin/handoffs/:handoff_id`: body `{ is_handled: boolean }`, returns the row.

### Data changes (revised)

Migration 003: `handoff_notifications` (`id`, `handoff_id` cascade, `channel` in slack/email/webhook, `status` in sent/failed/logged, `error`, `created_at`, unique per handoff and channel). Existing handoff results are copied in as Slack notifications, then `handoffs` drops `status`, `error`, `sent_at` and gains `handled_at`.

### Acceptance criteria (revised and added)

- **AC4 (revised)** - With no channels configured, a handoff returns 201 and appears in the inbox under Open.
- **AC10 (revised)** - Live: each configured channel delivers a real handoff (Slack message, email in the inbox, webhook received), and the inbox shows each as sent.
- **AC12** - The email has the customer as reply-to when given, escapes customer text, and renders from the template files.
- **AC13** - A webhook receiver can verify `X-Sourced-Signature` with the shared secret; a tampered body fails verification.
- **AC14** - When a channel fails, the customer still sees the confirmation and the inbox row shows that channel as failed with the reason.
- **AC15** - "Mark handled" moves a handoff from Open to Handled; "Reopen" moves it back.

## Amendment 2 (2026-10-18)

- **Admin password (revised)** - The minimum `ADMIN_PASSWORD` length is 6 characters (was 12), at the owner's request. Wrong passwords still wait 500ms; spec 004's rate limiting adds a lockout after repeated failures, which matters more with a shorter password.
