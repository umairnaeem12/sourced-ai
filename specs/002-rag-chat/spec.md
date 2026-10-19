# Spec 002: Answer questions from the docs, with sources

Status: done (Day 2, 2026-10-17)

## Summary

The working core of Sourced AI. Pinebrook Supply's five sample docs are split into passages and indexed by meaning. A visitor asks a question on `/demo`; Sourced AI finds the closest passages, asks the AI to answer from those passages only, and shows the answer with numbered sources the visitor can open. When no passage is a close match, or the AI reports the passages don't answer it, the visitor gets a plain "I don't know" and no invented answer.

## Scope

### In scope

- Five fictional Pinebrook Supply docs as Markdown in the repo.
- Postgres (Neon) with pgvector: `documents` and `passages` tables, applied by a migration script.
- An ingest script that splits each doc into passages, embeds them and replaces that doc's passages.
- `POST /api/questions`: takes one question, returns an answer with citations or a "not answered" result.
- AI provider chosen by `AI_PROVIDER` (`gemini` default, `groq`, `openai`). Groq is used automatically when the primary provider is rate limited or down and a Groq key is set.
- Embeddings from Gemini (`gemini-embedding-2`, 768 dimensions).
- `/demo` chat page: suggested questions, answer bubbles, numbered source chips that open the passage, loading, empty and error states.
- An `openapi.yaml` describing the endpoint.

### Out of scope

- Human handoff and the gap report (spec 003). A "not answered" reply in this spec shows text only.
- The Anthropic (Claude) provider and OpenAI embeddings (spec 004). The landing page claim about Claude is not published to Upwork until spec 004 ships it.
- Conversation memory: each question is answered on its own; follow-ups like "what about Canada?" are not resolved against earlier turns.
- Uploading docs through the UI; docs are added by the ingest script.
- Per-visitor rate limiting and deployment (spec 004).
- Streaming answers token by token.

## Decisions

- **Provider interface.** The architecture convention avoids interfaces and adapters unless a spec agrees to one. This spec does: the AI provider is a setting by product requirement, so `generateAnswer` sits behind one small interface with one implementation per provider. Nothing else gets an interface.
- **No AI call without evidence.** If no passage clears the similarity cutoff, the service answers "I don't know" without calling the model. This also saves free-tier quota.

## Behaviour

1. A question is 1 to 500 characters after trimming. Anything else is rejected with a field error.
2. The question is embedded and compared with every passage; the 4 closest are kept if their similarity is at or above `MIN_SIMILARITY` (default 0.55, tuned against the sample docs).
3. No passage kept: the reply is "not answered" with the fixed don't-know text. The AI is not called.
4. Passages kept: the AI receives the question and the numbered passages, with instructions to answer only from them, cite passage numbers, and report when they do not answer the question.
5. The AI's reply counts as answered only if it says so and cites at least one passage that was actually sent. Citations to passages that were not sent are dropped. An answered reply with no valid citation becomes "not answered".
6. If the primary provider returns a rate limit or is unavailable and `GROQ_API_KEY` is set (and Groq is not already the primary), the same request is retried once on Groq.
7. If every provider is rate limited, the visitor sees "The demo is busy right now. Try again in a minute." If a provider is down, "The AI service is unavailable right now."
8. On `/demo`, a visitor can click a suggested question or type one (Enter sends, Shift+Enter adds a line). While waiting, a typing indicator shows and the input is disabled.
9. An answered reply shows the text and one chip per cited source ("1 Returns and refunds"). Clicking a chip shows that passage's heading and full text.
10. A "not answered" reply shows the don't-know text and no chips.

## API changes

`POST /api/questions`

Request:

```json
{ "question": "Can I return a kettle I've already used?" }
```

Response 200:

```json
{
  "success": true,
  "message": "Question answered",
  "data": {
    "answer": {
      "is_answered": true,
      "text": "Yes. You can return it within 30 days...",
      "citations": [
        {
          "number": 1,
          "document_slug": "returns-and-refunds",
          "document_title": "Returns and refunds",
          "section_number": 2,
          "heading": "Used and opened items",
          "content": "Used items are accepted if undamaged..."
        }
      ]
    }
  }
}
```

A not-answered reply is also 200, with `"message": "No answer found in the docs"`, `is_answered: false` and `citations: []`.

Errors use the same envelope with `success: false`:

| Status | `code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Question missing, empty or over 500 characters. `errors` lists `{ field, message }`. |
| 429 | `AI_RATE_LIMITED` | Every available provider is rate limited. |
| 503 | `AI_UNAVAILABLE` | The provider failed or is not configured. |
| 500 | `INTERNAL_ERROR` | Anything unexpected. |

## Data changes

- `documents`: `id` uuid, `slug` unique, `title`, `created_at`, `updated_at`.
- `passages`: `id` uuid, `document_id` (cascade delete), `section_number`, `heading`, `content`, `embedding vector(768)`, `created_at`. HNSW index on `embedding` with cosine distance.
- `schema_migrations`: applied migration file names.

## Acceptance criteria

- AC1: `npm run db:migrate` creates the tables on an empty Neon database and is a no-op when run again.
- AC2: `npm run ingest` loads all 5 docs; running it twice leaves the same passage count (no duplicates).
- AC3: A question with no passage over the cutoff returns `is_answered: false` and the AI provider is never called (unit test with a mocked provider).
- AC4: A model reply citing passage 9 when only 4 were sent keeps only valid citations; a reply with none left is returned as not answered.
- AC5: A 429 from Gemini with a Groq key set returns Groq's answer; with no Groq key it returns 429 `AI_RATE_LIMITED`.
- AC6: An empty or 501-character question returns 400 `VALIDATION_ERROR` with a `question` field error.
- AC7: On `/demo`, clicking "Can I return a kettle I've already used?" shows an answer with at least one source chip, and clicking the chip shows the passage text.
- AC8: On `/demo`, a not-answered reply shows the don't-know text and no source chip.
- AC9: On `/demo`, a 429 shows the busy message and the visitor can send again.
- AC10: Live check with real keys: the three demo-section questions behave as described (two answered with sources, "Do you price match?" not answered).
- AC11: typecheck, lint, unit tests and e2e pass; `openapi.yaml` describes the endpoint.

## Live check results (2026-10-17)

`npm run smoke` against Neon and Gemini (`gemini-3.5-flash-lite`, `gemini-embedding-2`), 27 passages from 5 docs:

- Answerable questions scored 0.69 to 0.82 on their best passage and were answered with the right citation (used kettle return, Canada shipping, Australia, cookware warranty, gift card expiry, broken toaster after 3 months).
- In-domain gaps scored 0.63 to 0.68 and were declined by the model (price match, student discount, installments).
- Off-topic ("weather in Lahore") scored 0.53 and was declined before any model call.

`MIN_SIMILARITY` stays at 0.55: it filters off-topic questions without a model call, and the model declines in-domain gaps.
