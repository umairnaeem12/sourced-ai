# Spec 001 plan

## Phase 1: Project skeleton

- `create-next-app@15` with App Router, `src/`, TypeScript, Tailwind v4, ESLint, `@/*` alias.
- Scripts in `package.json`: `typecheck` (`tsc --noEmit`), `test` (`vitest run`), `e2e` (`playwright test`).
- `src/lib/cn.ts`: `clsx` plus `tailwind-merge`.
- `src/components/ui/Button.tsx`: one primitive built on `class-variance-authority`, rendered as a link via `asChild`-style `href` prop.
- `.env.example` with `AI_PROVIDER`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `DATABASE_URL`, `SLACK_WEBHOOK_URL`, all blank. `.gitignore` keeps ignoring `.env*` and re-includes `.env.example`.

Next.js routes live in `src/app/` (the framework's routing folder), which fills the role the frontend convention gives to `src/pages/`.

## Phase 2: Landing page

- `src/features/landing/` holds one component per section: `SiteHeader`, `Hero`, `ChatPreview`, `HowItWorks`, `Features`, `DemoStore`, `SiteFooter`, plus `content.ts` with the copy and lists so sections stay presentational.
- `src/app/page.tsx` composes the sections in order.
- `src/app/not-found.tsx` for the 404.
- `src/app/layout.tsx`: real metadata (title, description), Geist font kept.
- `src/app/globals.css`: colour tokens on `:root` with a dark set under `prefers-color-scheme: dark`, exposed to Tailwind through `@theme inline`.

## Phase 3: Tests

- Vitest + Testing Library + jsdom, colocated `*.test.tsx` next to the section components (AC1, AC3, AC4).
- Playwright `e2e/landing-page.spec.ts` covering AC2, AC5, AC6 against `next dev` (reuses an already-running server).

## Risk

None that touches money or data. The one risk is copy drifting ahead of the product: the demo section must keep saying "coming soon" until the chat spec ships, and the README's done checklist gates the Upwork listing.

## Phase 4: Premium redesign (amendment 2026-10-17)

- Add `motion` (motion/react) for scroll reveals, the replay and layout transitions. Wrap the page in `MotionConfig reducedMotion="user"`.
- Theme: rework tokens in `globals.css` for both schemes (surfaces, glow, grid texture, strong line), add Instrument Serif italic for accent words.
- New in `src/features/landing/`: `Reveal` (scroll fade-up), `ScrollProgress`, `ChatReplay` (scripted state machine, starts when in view, static transcript under reduced motion), `Pipeline` (replaces `HowItWorks`), `Features` rebuilt as a bento grid with `SpotlightCard`, `TeamView` (handoff + gap report mocks), `Comparison`, `Faq`, `ClosingCta`. Header turns glassy on scroll; footer gets link columns.
- Copy for every new section lives in `content.ts`.
- Tests: jsdom needs `IntersectionObserver` and `matchMedia` stubs. Unit tests for AC11 and AC12; e2e for AC9, AC10, AC13.

Risk: motion that ignores reduced-motion settings, and wide decorative layers causing sideways scroll on phones. Both have tests (AC10, AC13).
