# Spec 004: Launch

Status: in progress (Day 4, 2026-10-18)

## Summary

Takes Sourced AI from "works on my machine" to a live portfolio piece that passes the done checklist in the portfolio README: the main flow works every time, obvious failures are handled, there is a live link, a GitHub repo, a 2-minute Loom, 4 screenshots, and an Upwork description that matches exactly what it does.

## Scope

### In scope

- **Claude as an AI provider** (`AI_PROVIDER=anthropic`), so the landing page's "Gemini, OpenAI or Claude" is true.
- **Rate limiting** per visitor: questions, handoffs, and admin sign-in failures (lockout), plus a daily cap on questions across all visitors to protect free-tier quotas.
- **Production polish:** security headers, `robots.txt` that keeps `/admin` and `/api` out of search, link-preview image and metadata for sharing on Upwork and LinkedIn.
- **Deploy to Vercel** from GitHub, with every setting documented.
- **Checks against the live URL:** the e2e suite and a smoke run pointed at production.
- **Portfolio pack:** 4 screenshots, repo README with them, a 2-minute Loom script, and the Upwork description.

### Out of scope

- A content security policy (Next's inline scripts need nonces; revisit if a client needs one).
- A separate production database; the demo keeps one Neon database.
- Custom domain and a Resend verified domain.
- Recording the Loom itself and posting to Upwork (the owner does both).

## Decisions

- **Claude through the official SDK** (`@anthropic-ai/sdk`), per the Claude API guidance for TypeScript projects. Default model `claude-opus-5-5`, overridable with `ANTHROPIC_MODEL`. Effort `low` (support answers are chat-shaped). Server-side refusal fallback on (`fallbacks: "default"`); a refusal that still ends the request is treated as "not answered".
- **Rate limits live in Postgres**, so they hold across serverless instances. Fixed windows, keyed by a SHA-256 hash of the visitor's IP; raw IPs are never stored.
- **A blocked sign-in stays blocked even with the right password** until the window passes, so the lockout can't be used to confirm a guess.

## Behaviour

1. `AI_PROVIDER=anthropic` with `ANTHROPIC_API_KEY` answers questions exactly like the other providers: JSON answer, citations checked against the passages sent, Groq fallback on rate limit or outage.
2. A visitor can ask 20 questions per 10 minutes. The 21st gets "You're asking quickly. Try again in a few minutes." in the chat.
3. All visitors together can ask `DAILY_QUESTION_LIMIT` questions per day (default 500). Past that, everyone gets "The demo has reached today's limit. Try again tomorrow."
4. A visitor can send 5 handoffs per hour.
5. After 5 failed admin sign-ins in 15 minutes from one visitor, every sign-in from that visitor gets "Too many attempts. Try again in 15 minutes." until the window passes.
6. Every 429 carries `Retry-After` and `context.retry_after_seconds`.
7. Responses carry `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY` and a restrictive `Permissions-Policy`.
8. `/robots.txt` disallows `/admin` and `/api`. The landing page has an Open Graph image and title for link previews.

## API changes

- `POST /api/questions`, `POST /api/handoffs`, `POST /api/admin/sessions` can return 429 `RATE_LIMITED` (per visitor) with `context: { retry_after_seconds }`. `POST /api/questions` can also return 429 `DAILY_LIMIT_REACHED`.
- `AI_PROVIDER` accepts `anthropic`.

## Data changes

Migration 004: `rate_limit_hits` (`bucket` text, `window_start` timestamptz, `hits` integer, primary key on both). Rows older than 2 days are deleted opportunistically.

## Acceptance criteria

- AC1: Unit tests show the Claude provider sends the system prompt, the JSON output format, effort `low` and the fallback beta, returns the answer text, maps 429 to rate limited and 5xx/overloaded/network to unavailable, and turns a refusal into "not answered".
- AC2: Live: with `AI_PROVIDER=anthropic` and a key, the three demo questions behave as with Gemini. (Runs only if the owner adds an Anthropic key.)
- AC3: The 21st question from one visitor inside 10 minutes returns 429 `RATE_LIMITED`; a different visitor is unaffected.
- AC4: The daily cap returns 429 `DAILY_LIMIT_REACHED` for everyone once reached.
- AC5: The 6th failed sign-in within 15 minutes returns 429, and so does the correct password until the window passes.
- AC6: The chat shows the rate-limit messages and lets the visitor send again later.
- AC7: Security headers present on `/`, `/demo` and `/api/questions`; `/robots.txt` disallows `/admin` and `/api`.
- AC8: The live URL passes the e2e suite and the smoke run.
- AC9: The portfolio pack exists and every claim in the Upwork description maps to something the live demo does.
- AC10: typecheck, lint, unit tests, e2e and build pass.
