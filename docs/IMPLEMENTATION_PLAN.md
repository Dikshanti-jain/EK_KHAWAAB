# EK KHAWAAB — IMPLEMENTATION ROADMAP & EXECUTION PLAN

**Author**: Principal Software Architect & QA Lead  
**Execution Strategy**: Plan first, then immediately execute in prioritized dependency order without blocking on routine decisions.

---

## 1. Project Overview & Architectural State
- **Framework & Runtime**: TanStack Start v1.168, Nitro v3.0 (Vercel Serverless Preset), React 19, Vite v8.1.
- **Styling**: Tailwind CSS v4, editorial typography (Playfair Display, Plus Jakarta Sans, Noto Devanagari, Noto Nastaliq Urdu).
- **Backend & Database**: Supabase PostgreSQL with 7 tables (`private_user_vault`, `public_shayars`, `poems`, `poem_likes`, `bookmarks`, `comments`, `secret_khats`), Row-Level Security, and automated triggers.
- **Deployment Target**: Vercel Serverless (`.vercel/output/` build artifact).

---

## 2. Priority Implementation Roadmap & Execution Status

### Phase 1: Vercel Build & Environment Configuration (Deploy Blockers)
- [x] Test Nitro Vercel preset (`set NITRO_PRESET=vercel&& npm run build`).
- [x] Update `vite.config.ts` to automatically detect Vercel environment (`process.env["VERCEL"] ? "vercel" : undefined`).
- [x] Create `.env.example` with clear, safe placeholders for all required environment variables.
- [x] Create `vercel.json` with standard cache control and security headers.

### Phase 2: Khawaab Khat (Secret Letters) Dedicated Link & Share Flow
- [x] Update `src/routes/letters.tsx` to add `validateSearch` for URL search param `id?: string`.
- [x] Connect `fetchSecretKhat` on route mount if an `id` is provided in the URL to load recipient's exact dedication.
- [x] Add "Copy Secret Link" button when a letter is sealed, with clean toast feedback.

### Phase 3: Shayar-e-Khawaab (Groq AI Poetry System)
- [x] Configure server-side Groq API credentials (`GROQ_API_KEY`, `GROQ_MODEL`) in `.env` and `.env.example`.
- [x] Implement `src/lib/groq.service.ts`:
  - Complete Shayar-e-Khawaab System Prompt enforcing specificity over cliché.
  - Zod validation schemas for 10 poetic forms, semantic theme tags, and literary controls.
  - `callGroqShayar` executing against Groq's high-speed `openai/gpt-oss-120b` model in native JSON mode with 2500 max token budget.
- [x] Wire `composeShayari` server function in `src/lib/shayar.functions.ts` with automated Groq fallback to offline curated verses.
- [x] Build rich literary studio in `src/routes/ai-poet.tsx`:
  - Form selector (10 forms: Shayari, Ghazal, Nazm, Micro-poetry, Free verse, Rubai, Caption, Continue, Improve, Translate).
  - Semantic theme tags with multi-select and custom hashtag support.
  - Mandatory vs. optional key phrases toggle.
  - Progressive disclosure drawer for Advanced Literary Controls (length, diction, radif/qafiya, metaphor density, words to avoid).
  - Interactive editable canvas with direct line editing, 3-script switcher (Roman Hinglish, Devanagari Hindi, Nastaliq Urdu RTL), copy, save to Basta, Card Studio transfer, and feed publishing.
- [x] Implement personalization and counterfactual specificity test suite in `src/test/groq-shayar.test.ts` (17/17 tests passing).

### Phase 4: Author Post Deletion, Draft Preservation & Comment Controls
- [x] Add draft auto-persistence in `src/routes/feed.tsx` so user input survives drawer closing and page reloads.
- [x] Add author-only delete option with confirmation modal on `src/components/PoemCard.tsx`.
- [x] Add comment deletion for comment author (`h.by === me.penName`).
- [x] Add "Report Verse" community safety action modal.

### Phase 5: Profile Pen Name (Takhallus) Customization
- [x] Add `updatePublicTakhallus()` in `src/lib/auth.service.ts` to update `public_shayars` without exposing `private_user_vault`.
- [x] Add "Edit Public Pen Name" form in `src/routes/profile.tsx` with validation and immediate store refresh.

### Phase 6: SEO, Privacy Directives & Sitemaps
- [x] Update `public/robots.txt` to disallow private and authentication routes (`/profile`, `/auth`, `/letters?*`).
- [x] Create `public/sitemap.xml` mapping canonical URLs (`/`, `/feed`, `/ai-poet`, `/studio`, `/letters`, `/dictionary`, `/guidelines`, `/privacy`).
- [x] Verify OpenGraph metadata across all public pages.

### Phase 7: Verification, Automated Testing & Documentation
- [x] Run `npx tsc --noEmit` to verify 0 type errors. (Passed: 0 errors)
- [x] Run `npm test` across all Vitest suites and add new tests for AI modes, secret letter URL matching, profile pen name updates, and Groq personalization counterfactuals. (Passed: 17/17 tests)
- [x] Run production build `npm run build` targeting Vercel. (Passed: exit code 0)
- [x] Update `docs/PRODUCT_AUDIT.md`, `docs/QA_MATRIX.md`, `docs/VERCEL_DEPLOYMENT.md`, and `docs/KNOWN_ISSUES.md`.
