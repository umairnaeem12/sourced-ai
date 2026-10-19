# Spec 001: Project setup and landing page

Status: done (Day 1, 2026-10-17)

## Summary

Sourced AI is an AI support agent that answers customer questions from a business's own docs, cites the page each answer came from, says when it does not know, and hands the conversation to a person. The demo is loaded with Pinebrook Supply, a fictional online store.

This spec covers the project skeleton and the public landing page. The landing page explains what the product does and points to the demo store. It does not include the working chat, which later specs add.

## Scope

### In scope

- Next.js app with TypeScript, Tailwind, ESLint, Vitest and Playwright wired up.
- `.env.example` listing every setting later specs will need, with the AI provider as one setting. No real keys anywhere in the repo.
- A single landing page at `/` with: header, hero, how it works, features, demo store section, footer.
- A 404 page that links back to `/`.
- Light and dark colour schemes that follow the visitor's OS setting.
- Layout that works from 360px wide phones to desktop.

### Out of scope

- The chat widget, RAG pipeline, embeddings, database, handoff and gap report (later specs).
- Deployment to Vercel (done once the chat works, so the live link shows a working product).
- Contact form, sign-up, pricing, analytics.
- Testimonials, customer logos, usage numbers or any other claim the demo cannot back up.

## Behaviour

1. Visiting `/` shows the product name, a one-sentence description of what it does, and two calls to action: one to the demo section and one to "How it works".
2. Header links (How it works, Features, Demo) jump to their sections on the same page.
3. The hero shows a static preview of one customer question and an answer with a source chip, labelled as a preview from the fictional demo store.
4. "How it works" lists three steps: add your docs, a customer asks, the agent answers with sources or hands off.
5. "Features" lists five capabilities: cited answers, "I don't know" instead of guessing, human handoff, gap report, swappable AI provider.
6. The demo section names Pinebrook Supply as fictional, lists the sample docs it is loaded with, shows example questions, and states plainly that the live chat is coming soon. It has no button that suggests a live demo exists yet.
7. The footer states this is a portfolio demo and all sample data is made up.
8. Any unknown URL shows a 404 page with a link back to the home page.

## API changes

None.

## Data changes

None.

## Acceptance criteria

- AC1: `/` renders one `h1` containing "Sourced AI".
- AC2: Clicking the "How it works" header link brings the "How it works" section heading into view.
- AC3: The features section shows exactly five feature cards.
- AC4: The demo section contains the text "fictional" and a visible "coming soon" status, and has no link to a chat route.
- AC5: Visiting `/does-not-exist` shows a "Page not found" heading and a link back to the home page that works.
- AC6: At 375px viewport width the page has no horizontal scroll.
- AC7: `npm run typecheck`, `npm run lint`, `npm run test` and `npm run e2e` all pass.
- AC8: `.env.example` is committed-safe (no values) and `.env` is git-ignored.

## Amendment (2026-10-17)

Owner review of the Day 1 page: the product is strong but the page reads as flat. It needs more detail, motion and a premium finish. These supersede the matching behaviour and criteria above. Everything still describes only real, planned behaviour; no invented customers, numbers or reviews.

### Behaviour (revised)

- **B3 (revised)** - The hero chat is an animated replay: a customer types a question, the agent searches the demo docs, the matched passage is shown, the answer streams in and its source chip appears. A second exchange shows a question the docs do not cover, the "I don't know" reply and a handoff to a person. It loops while on screen and is labelled as a replay from the fictional store.
- **B4 (revised)** - "How it works" becomes an under-the-hood pipeline in four stages (docs, passages, matching, answer with sources), each with a small visual that animates in on scroll. Similarity scores shown there are labelled illustrative.
- **B5 (revised)** - Features is a bento grid of the same five capabilities, each with a small visual.
- **B9 (new)** - A "What your team sees" section shows a mock handoff message as posted to a Slack channel and a mock gap report table, both marked as sample data.
- **B10 (new)** - A comparison table: generic AI chatbot vs Sourced AI, one row per capability.
- **B11 (new)** - An FAQ of five to seven questions; each opens and closes with a keyboard-accessible button.
- **B11 (revised, owner review)** - Only one FAQ answer is open at a time: opening a question closes the one that was open, and clicking an open question closes it.
- **B12 (new)** - A closing call to action before the footer.
- **B13 (new)** - Light and dark themes are both finished designs, chosen by the visitor's OS setting.
- **B14 (new)** - Visitors with "reduce motion" set see every section in its final state with no movement; the chat replay shows the full transcript at once.

### Acceptance criteria (added)

- **AC9** - The chat replay reaches the cited answer ("Source:" chip visible) within 15 seconds of the page loading.
- **AC10** - With reduced motion emulated, the full replay transcript, including the handoff line, is visible on first paint.
- **AC11** - Each FAQ question is a button with `aria-expanded`; activating it reveals its answer.
- **AC11b** - Opening a second FAQ question collapses the first (`aria-expanded="false"`).
- **AC12** - The comparison table has a row for each of the five features.
- **AC13** - AC6 (no horizontal scroll at 375px) still holds with all animations running.

## Amendment 2 (2026-10-17)

Spec 002 passed its live check (spec 002 T20), so the landing page now points at the working chat. These supersede the matching items above:

- **B6 (revised)** - The demo section shows "Live chat is open" and a "Try the live demo" button to `/demo`.
- **B1 / B12 (revised)** - The hero and closing calls to action read "Try the live demo" and go to `/demo`; the header button reads "Try the demo".
- **AC4 (revised)** - The demo section contains "fictional" and a link named "Try the live demo" to `/demo`.

## Amendment 3 (2026-10-19)

The product was called HelpGenie AI until this date. That name is already taken, so the owner renamed it to **Sourced AI**: every answer is sourced from the business's own docs. These supersede the matching items above:

- **B15 (new)** - The product name is "Sourced AI" in all visible text, page titles, Open Graph image, email templates and Slack messages. The logo reads "Sourced" with an italic "AI".
- **AC1 (revised)** - `/` renders one `h1` containing "Sourced AI".
- **Code identifiers** - The package is `sourced-ai`. The handoff webhook headers from spec 003 (B13, AC13) are now `X-Sourced-Event`, `X-Sourced-Delivery` and `X-Sourced-Signature`. The default `HANDOFF_EMAIL_FROM_NAME` is "Sourced AI".
- The repo folder was renamed from `helpgenie-ai` to `sourced-ai` on 2026-10-20, at the owner's request.
