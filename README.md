# Ek Khwaab (एक ख़्वाब / اک خواب)

> **Where unspoken feelings find their verse, anonymously.**  
> An AI-native, multi-script literary sanctuary for Urdu, Hindi, and Hinglish poetry — featuring word-seeded AI co-writing (**Shayar-e-Khwaab**), instant 4-script switching, wax-sealed riddle letters (**Khwaab Khat**), real-time synchronized co-listening (**Hum-Nawa**), and a 1080p **Card Studio**.

**Live Production Site:** [https://ekkhwaab.in](https://ekkhwaab.in)

---

## Core Capabilities

- **Multi-Script Poetry Reader**: Instant, zero-reload switching across **Roman Hinglish**, **Devanagari Hindi**, **Nastaliq Urdu**, and **English** interpretations, with tap-to-Lughat word definitions.
- **Shayar-e-Khwaab (AI Co-Writer)**: Word-seeded poetry generator supporting 10 poetic forms (*Sher/Shayari, Ghazal, Nazm, Rubai, Micro-Poetry, Free Verse, Poetic Caption, Complete My Thought, Improve My Shayari, Translation*) and 4 literary lenses (*Modern Hinglish, Jaun Elia, Gulzar, Mirza Ghalib*) with seed-word highlighting.
- **Khwaab Khat (Secret Letters)**: Wax-sealed anonymous poetry dedications protected by a 3-clue *Pehchan Kaun* guessing cipher before revealing the sender.
- **Hum-Nawa (Listen Together)**: 2-person real-time synchronized music & poetry co-listening rooms with clock-offset estimation and drift-corrected playback.
- **Card Studio**: Single-canvas 1080p PNG renderer (`src/lib/card-render.ts`) ensuring byte-for-byte identical preview and export across `9:16 Story`, `1:1 Square`, and `4:5 Portrait` ratios and 8 editorial themes.
- **Lughat & Saat Muqaam-e-Ishq**: Interactive Urdu/Hindi poetic dictionary with Web Speech pronunciation and an interactive guide to the 7 Sufi stages of love.

---

## Architecture & Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework & Routing** | [TanStack Start](https://tanstack.com/start), TanStack Router (file-based), Nitro SSR (`vercel` preset) |
| **UI & State** | React 19, TypeScript (strict), Tailwind CSS v4, TanStack Query (SWR feed cache), React Context + `localStorage` (`src/lib/store.tsx`) |
| **Database & Auth** | Supabase (Auth, Postgres, RLS policies, RPCs, Realtime Channels) & Drizzle ORM schema (`drizzle/schema.ts`) |
| **AI Backend (`render-api/`)** | Express service (`render-api/server.mjs`) with Groq (`openai/gpt-oss-120b` / `20b`), LRU+TTL cache, concurrency `Gate`, `TokenBucket` (RPM/TPM), circuit `Breaker`, and Cloudflare Turnstile verification |
| **Resilient Fallback** | Built-in offline poetic & transliteration engines (`composeFallbackPoem`, `composeFallbackTranslation`) |
| **Testing** | Vitest, React Testing Library, `jsdom`, and Node `node:test` |

---

## Routes Overview

| Route | View | Description |
| :--- | :--- | :--- |
| `/` | **Dehleez (Landing)** | Hero showcase, interactive multi-script couplet, feeling hubs, and FAQ schema |
| `/feed`, `/explore` | **Explore Feed** | Cursor-paginated feed with mood filters, live search, script switching, Daad appreciation, and comment drawers |
| `/ai-poet` | **Shayar-e-Khwaab** | Seed-word AI poetry co-writer with editable 3-script output and direct feed publishing |
| `/card-studio`, `/studio` | **Card Studio** | Multi-ratio, multi-theme 1080p PNG card generator and publisher |
| `/letters`, `/secret-letters` | **Khwaab Khat** | Create and unlock wax-sealed riddle poetry letters |
| `/listen-together` | **Hum-Nawa** | 2-person real-time synced audio & poetry listening rooms |
| `/dictionary`, `/dictionary/$word` | **Lughat** | Searchable Urdu/Hindi poetic vocabulary with meanings, etymology, and pronunciation |
| `/stages-of-love` | **Saat Muqaam-e-Ishq** | Interactive 7 stages of love guide with multi-script couplets |
| `/poetry/$slug`, `/topic/$topic`, `/directory` | **SEO & Topic Hubs** | Programmatic topic collections, full poem pages, and directory index |
| `/auth`, `/profile`, `/privacy`, `/guidelines` | **Account & Charter** | Split-vault `#EK-ID` onboarding, saved poems, privacy controls, and community guidelines |

---

## Getting Started

### 1. Install Dependencies
```bash
npm ci
```

### 2. Configure Environment
Copy `.env.example` to `.env` and fill in your credentials (see `render-api/.env.example` for the standalone AI backend):
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase project credentials
- `GROQ_API_KEY` / `GROQ_MODEL` — Groq API key for live AI generation & translation
- `VITE_API_BASE_URL` — Optional Render AI backend URL (falls back to server functions / offline engine if unset)
- `VITE_TURNSTILE_SITE_KEY` — Optional Cloudflare Turnstile site key

### 3. Run Local Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
```
Generates sitemap/SEO artifacts (`scripts/generate-sitemap.ts`), builds client and Nitro SSR bundles, prerenders SEO pages (`scripts/prerender-seo.mjs`), and verifies bundle budgets (`scripts/check-bundle-budget.mjs`).

---

## Testing & Quality Assurance

### Frontend, Unit & Integration Tests (Vitest)
```bash
npm test
```
Runs **18 test files** (**109 passing tests**, plus 2 opt-in live Groq AI tests skipped unless `RUN_LIVE_AI_TESTS=1`):
- **Unit suites**: security/JSON-LD/rate-limiter/prompt-sanitization (`backend-security.test.ts`), script detection & translation (`translation.test.ts`), room sync math & codes (`rooms-sync.test.ts`), feed cursor & cache helpers (`feed-cache.test.ts`), share & SEO (`share-and-seo.test.ts`), canvas card rendering (`card-render.test.ts`), comment formatting, Lughat detection, ranks, reading scale, seed highlighting, fallback poet, and route matching.
- **Integration & Frontend suites**: `StoreProvider` + `localStorage` persistence (`store.integration.test.tsx`), `PoemCard` interactions (`poem-card.integration.test.tsx`), UI components (`frontend-components.test.tsx`), and full route views for `/dictionary`, `/feed`, and `/ai-poet` (`frontend-routes.integration.test.tsx`).

To run the opt-in live Groq AI tests:
```bash
RUN_LIVE_AI_TESTS=1 npm test
```

### Render AI Pipeline Tests
```bash
node --test render-api/test/ai-pipeline.test.mjs
```
Runs 9 unit tests covering `LruTtlCache`, `Gate`, `TokenBucket`, `Breaker`, and `canonicalKey`.

### Typechecking & Linting
```bash
npm run typecheck
npm run lint
```

---

## Security & Privacy Principles

1. **Split-Vault Pseudonymous Privacy (`#EK-ID`)**: Real names, emails, and phone numbers are never persisted in client `localStorage` or exposed on public feeds, comments, or letters; public interactions use only the poet's chosen pen name and `#EK-ID`.
2. **Prompt Injection & XSS Defense**: User inputs to AI prompts are stripped of control characters, angle-bracket escaped, and isolated inside `<user_supplied_data>` tags; JSON-LD metadata is serialized with `safeJsonLd()` to prevent `</script>` breakout.
3. **Abuse & Cost Protection**: Sliding-window rate limiting, Zod boundary validation, optional Cloudflare Turnstile verification, and an upstream circuit breaker protect AI endpoints.

---

## Project Structure

```text
├── src/
│   ├── components/         # UI components (PoemCard, CommentDrawer, AmbientAudio, kit, etc.)
│   ├── data/               # Curated poems, Lughat dictionary, moods, topics, tracks
│   ├── hooks/              # Custom hooks (useDocumentSEO, use-mobile)
│   ├── integrations/       # Supabase client, server client, auth middleware
│   ├── lib/                # Core logic (store, feed-cache, card-render, shayar, translation, rooms/)
│   ├── routes/             # TanStack Router file-based pages
│   └── test/               # Vitest unit, integration, and frontend tests
├── render-api/             # Standalone Express AI & caching backend for Render
├── drizzle/                # Drizzle ORM schema and migrations
├── supabase/               # Supabase SQL migrations & RLS policies
├── scripts/                # Sitemap, SEO prerender, bundle budget, and load test scripts
└── docs/                   # Architecture, QA matrix, and upgrade runbooks
```

---

## Owner & Creator

- **Founder & Creator**: **Dikshanti Jain**
- **LinkedIn**: [linkedin.com/in/dikshanti-jain](https://www.linkedin.com/in/dikshanti-jain-9345723a7)
- **Contact Email**: [jaindikahanti@gmail.com](mailto:jaindikahanti@gmail.com)
