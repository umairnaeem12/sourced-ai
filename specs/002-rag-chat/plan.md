# Spec 002 plan

Layering follows Controller-Service-Repository. Next.js `route.ts` plays the routes layer and only wires a controller method.

## Phase 1: Data

- Dependencies: `@neondatabase/serverless`, `zod`, dev `tsx`.
- `db/migrations/001-create-documents-and-passages.sql`: `create extension if not exists vector`, the two tables, the HNSW index.
- `scripts/migrate.ts` (`npm run db:migrate`): applies unapplied files in name order, records them in `schema_migrations`, each in a transaction.
- `src/server/db/db-client.ts`: Neon client from `DATABASE_URL`.
- `src/server/repositories/passage-repository.ts`: `replaceDocument(doc, passages)` in one transaction, `findClosest(embedding, limit)` returning similarity `1 - (embedding <=> $1)`.

## Phase 2: Content and ingest

- `content/pinebrook/*.md`: shipping, returns, warranty, orders, payments. Facts match the landing page (30-day returns, 10% restocking fee on used items, 2-day dispatch, Canada 5 to 8 business days). Price matching, address changes after shipping, Australia and student discounts are deliberately absent so they show up as gaps.
- `src/server/services/chunk-service.ts`: one passage per `##` section; sections over 1,200 characters split on paragraph boundaries.
- `scripts/ingest.ts` (`npm run ingest`): read, chunk, embed in one batch call per doc, `replaceDocument`.

## Phase 3: AI providers

- `src/server/config.ts`: Zod-parsed env (`AI_PROVIDER`, keys, models, `MIN_SIMILARITY`).
- `src/server/ai/ai-provider.ts`: the `AiProvider` interface (`generateAnswer(prompt)`), `AiRateLimitError`, `AiUnavailableError`.
- `src/server/ai/gemini-provider.ts`: `generateContent` with `systemInstruction` and JSON output (`responseMimeType`, `responseSchema`). Default model `gemini-3.5-flash-lite`.
- `src/server/ai/openai-compatible-provider.ts`: chat completions with `response_format: json_object`; used for Groq (`llama-3.3-70b-versatile`) and OpenAI.
- `src/server/ai/gemini-embedding.ts`: `gemini-embedding-2`, `output_dimensionality: 768`, query and document task prefixes.
- `src/server/services/answer-prompt.ts`: builds the system and user prompt, parses and validates the model's JSON.

## Phase 4: Endpoint

- `src/server/http/api-error.ts`: `ApiError`, `ErrorCode` (`VALIDATION_ERROR`, `AI_RATE_LIMITED`, `AI_UNAVAILABLE`, `INTERNAL_ERROR`).
- `src/server/http/response-handler.ts`: `ok`, and `fromError` that maps `ApiError`/`ZodError`/unknown to the envelope and logs.
- `src/server/logger.ts`: structured JSON to stderr; ESLint `no-console` allows only `warn` and `error`.
- `src/server/validators/question-validator.ts`, `src/server/services/question-service.ts` (`QuestionService` + `questionService` singleton), `src/server/controllers/question-controller.ts`, `src/app/api/questions/route.ts`.
- `docs/openapi.yaml`.

## Phase 5: Chat UI

- `src/features/chat/questionsApi.ts`: the one `fetch` for this feature, reading the envelope and branching on `code`.
- `src/features/chat/ChatPanel.tsx`, `MessageBubble.tsx`, `SourcePanel.tsx`, `src/app/demo/page.tsx`. Same tokens and motion as the landing page.

## Phase 6: Tests

- Unit: chunking, prompt parsing (AC4), question service with fake repository and providers (AC3, AC5), controller validation and envelopes (AC6), chat panel with a mocked API module.
- E2E `e2e/demo-chat.spec.ts` with `/api/questions` routed to fixtures (AC7, AC8, AC9).
- `scripts/smoke.ts` (`npm run smoke`): asks the three demo questions against the real stack for AC10.

## Risk

No money or customer data. Two real risks:

- The similarity cutoff. Too high and real questions get "I don't know"; too low and weak passages reach the model. Tuned with the smoke script against the sample docs and kept in env.
- Free-tier quota. Ingest uses batch embedding calls (5 per run). The no-evidence path skips the model.

If ingest fails halfway, `replaceDocument` runs per doc in a transaction, so a doc is either fully old or fully new; rerunning ingest fixes it.
