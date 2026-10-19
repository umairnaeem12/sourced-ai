# Spec 003 tasks

## Phase 1: Data

- [x] T1 Migration 002
- [x] T2 Question and handoff repositories

## Phase 2: Question log

- [x] T3 Log every question from the question service; optional conversation id

## Phase 3: Handoff

- [x] T4 Slack client and config check
- [x] T5 Handoff message builder with escaping
- [x] T6 Handoff service, validator, controller, route

## Phase 4: Admin auth

- [x] T7 Admin session signing and middleware
- [x] T8 Sessions endpoint

## Phase 5: Admin API

- [x] T9 List query validator, report service, gaps and handoffs endpoints

## Phase 6: UI

- [x] T10 Chat: conversation id, Talk to a person, handoff form
- [x] T11 Shared ListPage component
- [x] T12 Admin login, layout, gap report, handoffs pages

## Phase 7: Tests and docs

- [x] T13 Unit tests
- [x] T14 E2E handoff and admin
- [x] T15 openapi.yaml, README, .env.example
- [x] T16 typecheck, lint, test, e2e, build green
- [x] T17 Live: migrate, real questions logged, gap report grouping (AC1, AC9)
- [ ] T18 Live: Slack webhook added by the owner, real handoff lands in Slack (AC10, now covered by T29)

## Phase 8: Channels and inbox (amendment 2026-10-17)

- [x] T19 Migration 003 and handoff repository rework
- [x] T20 Notifier interface, Slack notifier, channel factory
- [x] T21 Email service with Resend, templates, email notifier
- [x] T22 Webhook notifier with signature
- [x] T23 Handoff service create and notify, controller with after()
- [x] T24 Admin inbox API: status filter, detail, mark handled
- [x] T25 ListPage params and expandable rows; inbox UI
- [x] T26 Chat and landing copy updates
- [x] T27 Tests, openapi, README, .env.example; all checks and build green
- [x] T28 Live: inbox-only handoff on Neon (AC4, AC15)
- [ ] T29 Live: owner adds channel keys, each channel delivers (AC10)
- [x] T30 Minimum admin password length 6 (amendment 2)
