# Spec 002 tasks

## Phase 1: Data

- [x] T1 Add dependencies and `db:migrate`, `ingest`, `smoke` scripts
- [x] T2 Migration 001 and migrate runner
- [x] T3 DB client and passage repository

## Phase 2: Content and ingest

- [x] T4 Five Pinebrook docs
- [x] T5 Chunk service
- [x] T6 Ingest script

## Phase 3: AI providers

- [x] T7 Config and provider interface with error types
- [x] T8 Gemini provider and Gemini embeddings
- [x] T9 OpenAI-compatible provider (Groq, OpenAI)
- [x] T10 Answer prompt builder and parser

## Phase 4: Endpoint

- [x] T11 ApiError, response handler, logger, no-console lint rule
- [x] T12 Question validator, service, controller, route
- [x] T13 openapi.yaml

## Phase 5: Chat UI

- [x] T14 questionsApi module
- [x] T15 Chat panel, message bubble, source panel, `/demo` page

## Phase 6: Tests

- [x] T16 Unit tests (AC3, AC4, AC5, AC6) and chat panel tests
- [x] T17 E2E demo chat (AC7, AC8, AC9)
- [x] T18 Smoke script
- [x] T19 typecheck, lint, test, e2e green (AC11)
- [x] T20 Live run with real keys: migrate, ingest, tune cutoff, smoke (AC1, AC2, AC10)
- [x] T21 After T20 passes: switch the landing demo section from "coming soon" to a live link (amends spec 001)
