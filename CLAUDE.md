# PastQ — Codebase Guide

PastQ is a platform for browsing and practicing **Ghanaian exam past questions**
(BECE, WASSCE, University, Professional) with an AI tutor, full-text search, a
voice practice mode, and a student progress dashboard. Built for the Npontu /
Snwolley AI hackathon.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (CSS-first config via `@import "tailwindcss"`; no `tailwind.config.js`)
- **Supabase** (Postgres + Auth + RLS) via `@supabase/ssr`
- **Google Gemini** (`@google/generative-ai`) for streamed explanations, hints and practice-question generation
- **Snwolley AI** (hackathon) for Speech-to-Text, Text-to-Speech and an AI agent (voice mode)

## Data hierarchy

```
levels → institutions → courses → subjects → papers → questions
```

- `levels` — BECE, WASSCE, University, Professional
- `institutions` — exam bodies / schools (e.g. WAEC, University of Ghana, ICAG)
- `courses` — programmes within an institution (e.g. General Science, General Arts)
- `subjects` — e.g. Core Mathematics, Integrated Science, English Language
- `papers` — one per (subject, year, title)
- `questions` — `type` is `mcq | essay | structured`; MCQ `options` are JSONB `{ "A": "...", ... }`

Slugs are unique **per parent** (except `levels.slug`, which is globally unique).
The browse URL skips the course layer: `/browse?level=…&institution=…&subject=…&paper=…`.

## Key files

### Database (`supabase/migrations/`, run in order in the Supabase SQL editor)
- `0001_init_pastq.sql` — all 6 tables, RLS (public read / authenticated write), indexes, generated `questions.search_vector` (tsvector) + GIN index, base seed data.
- `0002_search.sql` — `search_questions(...)` RPC (FTS + filters + pagination).
- `0003_user_progress.sql` — `user_progress` table (per-attempt rows, own-row RLS) + `get_dashboard_stats()` RPC.
- `0004_demo_seed.sql` — rich demo questions (WASSCE Maths, BECE Science, WASSCE English).

### Supabase clients (`src/lib/supabase/`)
- `client.ts` — browser client (`createBrowserClient`) for Client Components.
- `server.ts` — cookie-aware server client (`createServerClient`) for Server Components / Route Handlers.

### Data & AI libs (`src/lib/`)
- `browse-data.ts` — `server-only` fetch helpers for the browse hierarchy.
- `gemini/index.ts` — `explainAnswer()` (hints), `streamExplanation()` (streamed explanations), `generatePracticeQuestions()`.

### App routes (`src/app/`)
- `layout.tsx` — Inter font, `<Navbar>` (in a Suspense boundary), global styles.
- `page.tsx` — landing page.
- `(browse)/browse/page.tsx` — three-panel explorer (levels / institutions↔subjects / papers↔question preview), server-rendered per search param, Suspense skeletons.
- `search/page.tsx` + `components/SearchResults.tsx` — full-text search UI (grouped, highlighted).
- `dashboard/page.tsx` — student dashboard (greeting, stats, recent activity, recommended subject, quick start).
- `api/questions/explain/route.ts` — streams Gemini explanations (text stream); hints returned as JSON.
- `api/questions/practice/route.ts` — generates 3 AI practice questions.
- `api/search/route.ts` — `GET /api/search` → `search_questions` RPC.
- `api/voice/route.ts` — proxy for Snwolley STT/TTS/chat (`?action=stt|tts|chat`), keeps API key server-side.
- `api/random-paper/route.ts` — returns a random paper id (Random question button).

### Components (`src/components/`)
- `ui/Navbar.tsx` — logo, debounced search (→ `/search`), auth-aware avatar/sign-in.
- `questions/QuestionViewer.tsx` — paginated (infinite scroll) question practice, MCQ/essay cards, streamed typewriter explanations, sticky question navigator, floating Voice-mode toggle, records attempts to `user_progress`.
- `questions/PracticeModal.tsx` — "Study this topic" AI bonus questions.
- `VoiceExamMode.tsx` — mic capture → STT → AI evaluation → TTS feedback.
- `browse/` — panel shell, link lists, skeletons. `dashboard/QuickStart.tsx` — continue/random buttons.

### Types
- `src/types/index.ts` — `Level`, `Institution`, `Course`, `Subject`, `Paper`, `Question`, `QuestionType`.

## Environment variables

See `.env.example`. Copy to `.env.local`:

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase anon key |
| `GEMINI_API_KEY` | server | Gemini explanations / practice questions |
| `GEMINI_MODEL` | server | Gemini model (default `gemini-2.0-flash`) |
| `SNWOLLEY_API_KEY` | server | Snwolley STT/TTS/chat (voice mode) |
| `SNWOLLEY_MODEL` | server | Snwolley chat model |

## Supabase project

- Project ref: `hukwgvbqtxvakncdjwwy` (`https://hukwgvbqtxvakncdjwwy.supabase.co`).
- Apply migrations `0001` → `0004` in order via the SQL editor (or `supabase db push`).
- **RLS everywhere**: catalog tables are public-read / authenticated-write; `user_progress` is restricted to each user's own rows.
- Public reads use the anon key (no auth required to browse/search); writing progress requires a signed-in user.

## Conventions

- Server Components fetch via `lib/supabase/server.ts`; interactivity lives in `"use client"` components.
- Prefer URL search params for navigable state (browse, search).
- Keep secrets server-side; the browser only ever sees `NEXT_PUBLIC_*`.

## Known gaps / TODO

- No auth UI yet (`/sign-in`, `/dashboard` links exist) and no `middleware.ts` for SSR session refresh — the dashboard and progress tracking only light up once a user is signed in.
- Snwolley request/response shapes are best-effort assumptions (see `api/voice/route.ts`); verify against the hackathon API docs.
