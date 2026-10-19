# Spec 005: Admin dashboard

Status: built (2026-10-20); signed-in e2e checks wait on the owner's E2E_ADMIN_PASSWORD and E2E_TRAFFIC_TOKEN

## Summary

Spec 003 gave the owner two plain pages: a gap report and a handoff inbox. A business evaluating Sourced AI expects a real support console, and the current pages show raw test rows and developer error strings. This spec turns `/admin` into that console: a sidebar shell, an overview dashboard with charts, a log of every conversation with the sources each answer used, a richer inbox with internal notes, a gap report that groups questions by meaning, a documents page where the owner uploads and manages help docs, and a settings page that shows what is connected and can send a test alert.

So the demo looks like a store in use, a script loads 30 days of realistic sample activity for Pinebrook Supply, clearly labelled as sample data, and traffic from automated tests is kept out of every report.

Builds on spec 002 (answers, passages), spec 003 (question log, handoffs, admin auth) and spec 004 (rate limits).

## Scope

### In scope

- Admin shell: left sidebar on desktop, top bar with a menu drawer on phones.
- Overview page with a period picker, headline numbers and charts.
- Conversations page: every chat, answered or not, with filters, search and the cited sources.
- Inbox: a side panel with the transcript and sources, internal notes, and channel status in plain language.
- Gap report: questions grouped by meaning, a 14-day trend per group, and "doc written" status.
- Documents page: upload (Markdown, plain text, PDF) or paste text, replace, delete, and read a document's passages.
- `/demo` lists its loaded docs from the database.
- Settings page: store, answer and alert settings (read-only), plus a test alert per channel.
- Storing the sources cited by each answer, from this spec on.
- A sample-activity script for the demo store, and test traffic excluded from reports.

### Out of scope

- More than one admin user, roles, or assigning handoffs to a person.
- Replying to customers from inside the admin. "Reply by email" still opens the owner's mail app.
- Editing a document's text in the browser. A document is changed by uploading a new version.
- Word files, web page crawling, and scanned PDFs without a text layer.
- Changing settings from the UI. Settings stay in environment variables.
- CSV export, live push updates (pages load fresh data on open and on "Refresh"), translations.
- Backfilling sources for answers logged before this spec. Those show "Sources not recorded".

## Behaviour

### Shell

1. **B1** - Every admin page has a sidebar: Overview, Conversations, Inbox (with the count of open handoffs), Gap report, Documents, Settings. Below the links: the store name with a "Demo store" label, a link to the live demo, and Sign out.
2. **B2** - Below 1024px the sidebar becomes a top bar with the logo and a menu button that opens the same links in a drawer. The drawer closes on navigation and on Escape.
3. **B3** - `/admin` with a session goes to `/admin/overview` (spec 003 B8 sent it to the gap report). Signing in lands on the overview.
4. **B4** - When sample activity is loaded, every page shows a slim notice: "Showing sample activity for the demo store." Rows from the sample set are not marked one by one.

### Overview

5. **B5** - A period picker offers the last 7, 30 and 90 days (default 30). All figures on the page use the store's time zone.
6. **B6** - Headline numbers, each with the change against the previous period of the same length: conversations, questions, answer rate (answered from the docs / questions), handoffs, and median time to mark a handoff handled.
7. **B7** - Charts: questions per day split into answered and not answered; the most cited docs (top 5, by the number of answers that cited them); busiest times (weekday by hour of day).
8. **B8** - Two short lists: the top 5 open gaps, linking to the gap report, and the 5 newest open handoffs, linking to the inbox.
9. **B9** - With no activity in the period, each chart shows "No questions in this period" instead of empty axes.

### Conversations

10. **B10** - A paged table of conversations, newest first: started, first question, questions, answered, and an outcome tag ("All answered", "Some not answered", "Handed off").
11. **B11** - Tabs: All, Answered (every question answered), Not answered (at least one not answered), Handed off. Search matches any question in the conversation.
12. **B12** - Opening a row shows the transcript. Each answer lists the sources it cited (doc title and section); opening a source shows the passage text that was used. A conversation that was handed off links to its handoff in the inbox.

### Inbox

13. **B13** - Opening a handoff shows a side panel (full width on phones): customer email with "Copy" and "Reply by email", when it arrived, status, the transcript with sources (as B12), and internal notes.
14. **B14** - The owner can add an internal note (1 to 2,000 characters). Notes show newest last, with their time. Notes are never sent to the customer or to any channel.
15. **B15** - Channel status reads in plain language: "Sent to Slack", "Emailed", "Sent to webhook", "Email written to the server log (development)", "Slack isn't connected" (with a link to Settings) when its setting is missing, and "Couldn't reach Slack" with the error detail on hover when delivery failed.
16. **B16** - Marking handled or reopening keeps working as in spec 003 and updates the sidebar count.

### Gap report

17. **B17** - Unanswered questions that mean the same thing are grouped, even when worded differently ("What's the weather in Lahore?" and "What is the weather in Lahore today?"). Each group shows its most common wording, how many other wordings it has (expandable), times asked, last asked, and a 14-day sparkline.
18. **B18** - Tabs: Open and Doc written. "Mark doc written" moves a group to Doc written; "Reopen" moves it back. If the question is asked again after it was marked, the group returns to Open with the label "Asked again since marked".
19. **B19** - The summary cards from spec 003 stay above the table.

### Documents

20. **B20** - A table of documents: title, passages, size, source ("Sample doc" or "Uploaded"), last updated. Opening one lists its passages (heading and text).
21. **B21** - "Add document" accepts one file (`.md`, `.txt`, `.pdf`, up to 2 MB) or pasted text with a title. Markdown uses its `# Title` and `## Heading` sections; plain text and PDF are split into passages by paragraph, and the title comes from the form or the file name.
22. **B22** - After a successful upload the document is in the table with its passage count, and the chat answers from it on the next question. A file with no extractable text (for example a scanned PDF) is refused with "We couldn't find any text in this file."
23. **B23** - "Replace" uploads a new version of a document; its passages are swapped in one step, so the chat never sees half a document. "Delete" asks for confirmation, then removes the document and its passages from answers.
24. **B24** - At most 25 documents. Adding a 26th is refused with a message that names the limit.
25. **B25** - `/demo` lists the loaded docs and their count from the database.

### Settings

26. **B26** - Read-only sections: Store (name, time zone), Answers (AI provider and model, fallback provider, embedding model, match cutoff, daily question limit), Handoff alerts, Admin (session length). A note says these are set in environment variables.
27. **B27** - Each alert channel shows one of: "Connected", "Turned on but missing <SETTING>", "Set up but turned off (add it to HANDOFF_NOTIFY)", "Not set up". Secrets are never shown; a webhook address shows its host only.
28. **B28** - "Send test alert" on a connected channel sends a sample handoff marked as a test (Slack header "Test alert", email subject starting "[Test]", webhook event `handoff.test`) and shows the result inline. At most 5 test alerts per 10 minutes.

### Sample and test activity

29. **B29** - A script loads 30 days of sample activity ending now: about 150 conversations and 350 questions, about 85% answered with sources from the real Pinebrook docs, a handful of recurring gaps, and about 12 handoffs (some handled, some with notes). Running it again replaces the previous sample set. A flag removes the sample set, and another clears all activity first (for a fresh demo database).
30. **B30** - Requests from the automated test suite are marked as test traffic and left out of every admin page and count. Real visitor traffic is unaffected.

## API changes

All responses use the spec 002 envelope. All `/api/admin/*` routes need the admin session (spec 003). Lists take `page` and `page_size` and return `pagination`.

- `GET /api/admin/overview?days=7|30|90` → `{ overview: { period, totals, previous_totals, daily[], top_documents[], busiest[], top_gaps[], recent_handoffs[], has_sample_data } }`.
- `GET /api/admin/conversations?status=all|answered|unanswered|handed_off&search=` → `{ conversations[], pagination }`.
- `GET /api/admin/conversations/{conversation_id}` → `{ conversation: { id, started_at, handoff_id, messages[] } }`, each message with `citations[]`. 404 `CONVERSATION_NOT_FOUND`.
- `GET /api/admin/gaps?status=open|resolved` (revised): rows gain `gap_id`, `wordings[]`, `daily_counts[]` (14 values), `resolved_at`, `asked_again`.
- `PATCH /api/admin/gaps/{gap_id}` `{ is_resolved: boolean }` → `{ gap: { gap_id, is_resolved } }`. 404 `GAP_NOT_FOUND`.
- `GET /api/admin/handoffs` and `/{handoff_id}` (revised): each notification gains `problem: null | "not_configured" | "delivery_failed"`; detail messages gain `citations[]`; detail gains `notes[]`.
- `POST /api/admin/handoffs/{handoff_id}/notes` `{ body }` → 201 `{ note }`.
- `GET /api/admin/documents` → `{ documents[], pagination, limit }`.
- `POST /api/admin/documents` (multipart: `file`, or `title` + `text`) → 201 `{ document }`. 422 `DOCUMENT_INVALID` (type, size, no text), 409 `DOCUMENT_LIMIT_REACHED` with `context.limit`.
- `GET /api/admin/documents/{document_id}` → `{ document: { ..., passages[] } }`. 404 `DOCUMENT_NOT_FOUND`.
- `PATCH /api/admin/documents/{document_id}` (multipart, as POST) → `{ document }`.
- `DELETE /api/admin/documents/{document_id}` → 204.
- `GET /api/admin/settings` → `{ settings }`, with no secret values.
- `POST /api/admin/notification-tests` `{ channel }` → `{ result: "sent" | "logged" }`. 422 `NOTIFICATION_NOT_CONFIGURED`, 502 `NOTIFICATION_FAILED` with `context.detail`, 429 `RATE_LIMITED`.
- `POST /api/questions` (amends spec 002): the answer is unchanged; the logged row now keeps its citations.

## Data changes

- `questions` gains: `citations` (the cited passages as shown: doc slug, title, section, heading, text), `question_embedding` (768 dims), `gap_id` (the group of an unanswered question), `origin` (`visitor`, `sample` or `test`).
- Existing unanswered rows get a `gap_id` shared by identical wording (spec 003 grouping), so old gaps stay grouped.
- `handoffs` gains `origin`.
- New `gap_resolutions` (gap id, resolved at) and `handoff_notes` (handoff, body, created at).
- `documents` gains `origin` (`sample` or `upload`), `source_filename`, `char_count` and `deleted_at`. Deleting is soft for the document; its passages are removed. Slugs stay unique among documents that are not deleted.
- New settings: `STORE_TIMEZONE` (default `America/New_York`), `E2E_TRAFFIC_TOKEN` (optional).

## Acceptance criteria

- **AC1** - Every admin page shows the sidebar with six links; the current page is marked `aria-current="page"`; the Inbox link shows the open handoff count.
- **AC2** - At 375px wide no admin page scrolls sideways, and the menu button opens a drawer with the same six links.
- **AC3** - `/admin` with a session redirects to `/admin/overview`.
- **AC4** - The overview returns totals for the chosen period and the previous one; with seeded data the answer rate is between 80% and 90%.
- **AC5** - The daily series has one entry per day in the period, in the store's time zone, including days with no questions.
- **AC6** - Each chart has a text alternative (a table or summary) readable by a screen reader.
- **AC7** - The Conversations "Handed off" tab lists only conversations with a handoff; "Not answered" only those with at least one unanswered question.
- **AC8** - A conversation answered after this spec shows its cited sources; opening one shows the passage text.
- **AC9** - Adding a note to a handoff returns 201 and the note appears in the panel; an empty note is refused with 400.
- **AC10** - A handoff whose Slack setting was missing shows "Slack isn't connected" and no raw setting error in the row.
- **AC11** - Two differently worded questions with the same meaning appear as one gap with 2 wordings; two unrelated questions stay separate.
- **AC12** - Marking a gap as doc written moves it to the Doc written tab; asking it again afterwards returns it to Open with "Asked again since marked".
- **AC13** - Uploading a Markdown file creates a document with one passage per `##` section; asking a question covered only by that file returns an answer citing it.
- **AC14** - Uploading a `.pdf` with text creates passages; a file with no text, a `.docx`, or a file over 2 MB returns 422 `DOCUMENT_INVALID`.
- **AC15** - With 25 documents, a new upload returns 409 `DOCUMENT_LIMIT_REACHED` with `context.limit = 25`.
- **AC16** - Deleting a document returns 204, removes it from the list and from `/demo`, and its passages are no longer cited.
- **AC17** - The settings response never contains an API key, webhook secret, full webhook URL or the admin password.
- **AC18** - "Send test alert" for a channel that isn't configured returns 422 `NOTIFICATION_NOT_CONFIGURED`; the sixth test within 10 minutes returns 429.
- **AC19** - After the sample script, the admin shows the sample notice; after removing the sample set, it doesn't.
- **AC20** - A question sent with the test-traffic header and the right token is logged with origin `test` and appears on no admin page of a normal session (an admin request carrying the same token, which only the e2e suite has, still sees it); with a wrong token it is a normal visitor question.
- **AC21** - Typecheck, lint, unit tests, e2e and the production build pass.

## Amendment (2026-10-20)

The owner wants anyone trying the demo to open the dashboard too, with full access, so a client can see the whole product without asking for a password. This is a setting, so a real store keeps its dashboard private. These supersede spec 003 B8 and the matching items above:

- **B31 (new)** - With `ADMIN_PUBLIC=true`, every admin page and admin API works without signing in, for viewing and for changes. `/admin/login` sends visitors to the overview. Without the setting (the default), everything stays behind the password as before.
- **B32 (new)** - When the dashboard is public, `/demo` shows an "Admin dashboard" link in its header, and every admin page shows a notice: "Public demo: anyone with the link can view and change this dashboard." Sign out is hidden, since there is no session to end.
- **B33 (new)** - Adding or replacing a document is limited to 20 per visitor per hour, because indexing uses the AI quota. Test alerts keep their own limit (B28).
- **B34 (new)** - Settings shows whether public access is on (`ADMIN_PUBLIC`).

### Acceptance criteria (added)

- **AC22** - With `ADMIN_PUBLIC=true`, `/admin/overview` and `GET /api/admin/overview` work without a session cookie, and `/demo` links to `/admin`.
- **AC23** - Without `ADMIN_PUBLIC`, AC1 to AC21 and spec 003's sign-in checks hold unchanged, and `/demo` has no admin link.
- **AC24** - The 21st document upload from one visitor within an hour returns 429 `RATE_LIMITED`.
