# Spec 004 plan

## Phase 1: Claude provider

- `@anthropic-ai/sdk`. `src/server/ai/anthropic-provider.ts`: `client.beta.messages.create` with `system`, one user message, `output_config: { effort: "low", format: <answer JSON schema> }`, `betas: ["server-side-fallback-2026-07-01"]`, `fallbacks: "default"`. Error chain: `RateLimitError` to `AiRateLimitError`; `APIConnectionError`, `InternalServerError` (incl. 529 overloaded) and other `APIError` to `AiUnavailableError`. `stop_reason: "refusal"` returns a not-answered JSON string.
- Config: `AI_PROVIDER` gains `anthropic`; `ANTHROPIC_MODEL` default `claude-opus-5-5`.

## Phase 2: Rate limits

- `db/migrations/004-rate-limits.sql`.
- `src/server/repositories/rate-limit-repository.ts`: `hit(bucket, windowStart)` upsert returning the count; `cleanup()`.
- `src/server/services/rate-limit-service.ts`: named rules (`question`, `question_daily`, `handoff`, `admin_sign_in_failure`), `consume(rule, visitorId)` throws `ApiError` 429 with `retry_after_seconds`; `isBlocked(rule, visitorId)` reads without counting (for the lockout).
- `src/server/http/caller-context.ts`: `visitorIdOf(request)`, SHA-256 of the first `x-forwarded-for` address (or `x-real-ip`).
- Wiring: question and handoff services take a caller context and consume their rules; a new `admin-session-service.ts` owns sign-in (lockout check, password check, failure counting); controllers build the caller context and call one service.
- `response-handler` adds `Retry-After` for 429s. Chat and admin clients map the new codes to messages.

## Phase 3: Production polish

- `next.config.ts` `headers()`; `src/app/robots.ts`; `src/app/opengraph-image.tsx` (`next/og`); `metadataBase` from `APP_URL`.

## Phase 4: Deploy (owner, then agent)

- Owner: GitHub repo, commit and push, import in Vercel, add env vars, deploy.
- Agent: `playwright.config.ts` honours `E2E_BASE_URL` (no local server then); run e2e and smoke against the live URL.

## Phase 5: Portfolio pack

- `docs/portfolio/` with 4 screenshots from the live site, `loom-script.md`, `upwork-description.md`; README gets a screenshot strip and the live link.

## Risk

- The daily cap counts questions, not tokens. A burst of long questions could still exhaust Gemini's daily quota first; the busy message covers that case.
- Visitors behind one shared IP (an office) share a limit. Acceptable for a demo.
