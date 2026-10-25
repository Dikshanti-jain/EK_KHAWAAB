# Ek Khawaab (एक ख़्वाब / اک خواب) — Anonymous Poetry Sanctuary

> **Where unspoken feelings find their verse, anonymously.**  
> A production-grade literary platform built for anonymous poetry sharing, real-time multi-script reading (Hinglish, Devanagari Hindi, Nastaliq Urdu), an AI-assisted co-writer, high-resolution card export studio, and wax-sealed secret letters.

---

## 🏛️ Architecture & Tech Stack

- **Framework**: [TanStack Start](https://tanstack.com/start) with Nitro SSR server & TanStack Router
- **Runtime & UI**: React 19, TypeScript (strict mode, 100% typechecked)
- **Styling**: Tailwind CSS v4 with custom warm editorial palette (`#FFFFFF`, `#0F172A`, `#1E3A8A`, `#BE123C`), responsive typography (Playfair Display, Plus Jakarta Sans, Noto Serif Devanagari, Noto Nastaliq Urdu)
- **State Management**: Unified Client Store persisted to `localStorage` (`src/lib/store.tsx`)
- **Interactive Audio**: Procedural Monsoon Rain Ambience synthesized in real-time via Web Audio API (`src/components/AmbientAudio.tsx`) without external audio assets
- **Canvas Rendering**: 1080p HD Card Studio exporting 9:16 Story, 1:1 Square, and 4:5 Portrait cards
- **Backend & Database Ready**: Supabase integration configured (`src/integrations/supabase/`) and Drizzle ORM schema ready (`drizzle/schema.ts`)
- **AI Poetry Engine**: Hybrid AI architecture supporting `LOVABLE_API_KEY` (Lovable AI gateway), `OPENAI_API_KEY`, and a resilient offline algorithmic poetry engine covering all 4 masters (Modern Hinglish, Jaun Elia, Gulzar, Mirza Ghalib) with seed-word highlighting in crimson badges

---

## 📁 Key Routes & Capabilities

| Route | View | Description |
| :--- | :--- | :--- |
| `/` | **Dehleez (Landing)** | Hero showcase, interactive demo couplet with script switch, 4-pillar bento grid |
| `/feed` | **Explore Feed** | Filter by moods (*Late Night*, *Heartbreak*, *Unspoken Love*, *Philosophy*), per-card multi-script toggle, interactive Daad appreciation, inline comment drawers |
| `/ai-poet` | **AI Co-Writer** | Seed-word input (2–6 chips), situation prompt, 4 poetic personas, multi-script output with highlighted seed badges |
| `/studio` | **Card Studio** | 6 curated themes, customizable typography, aspect ratio toggles, HD PNG export via HTML5 Canvas |
| `/letters` | **Secret Letters** | Send wax-sealed poems with 3-clue guessing ciphers; realistic seal-breaking animation for recipients |
| `/dictionary` | **Lughat (Dictionary)** | 35+ Urdu/Hindi poetic terms with meanings, pronunciations (Web Speech API), and example couplets |
| `/auth` | **Onboarding & Vault** | 2-step onboarding: real identity encrypted in private vault, public pen name with `#EK-ID` badge |
| `/profile` | **Poet Profile** | Public poet portfolio, saved poem basta, encrypted private vault inspector |

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Local Development Server
```bash
npm run dev
```
The server will start on `http://localhost:8080/`.

### 3. Run Test Suite
```bash
npm test
```
Runs Vitest unit tests covering routing, seed-word highlighting, and multi-script AI poetry generation.

### 4. Build for Production
```bash
npm run build
```
Generates production-optimized assets in `.output/public` and Nitro SSR server in `.output/server`.

---

## 🔒 Privacy & Production Principles
1. **Zero Public Real-Identity Leakage**: Full names, emails, and phone numbers remain strictly quarantined in the user's private vault; only the public pen name and `#EK-ID` badge are transmitted on feed, comments, and letters.
2. **Resilient AI Pipeline**: The poetry generator gracefully degrades to curated algorithmic verse if external API credits or network quotas lapse, ensuring 100% demo and company uptime.
3. **No External Asset Latency**: Audio ambience, dictionary pronunciation, fonts, and canvas card rendering execute locally in the client runtime without relying on brittle third-party media CDNs.
