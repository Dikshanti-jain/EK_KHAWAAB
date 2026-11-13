# EK KHWAAB — Architecture & 1,000-CCU Scaling Blueprint

**Document type:** Production architecture review + upgrade roadmap
**Target:** `https://ekkhwaab.in` (Hostinger LiteSpeed `public_html`) + Render AI microservice + Supabase (Postgres / Auth / PostgREST / Realtime) + Groq
**Load target:** 1,000 concurrent users (CCU), p95 feed read < 100 ms, zero privacy leaks, zero-downtime deploys
**Authored by:** 10-persona engineering council — Vikram, Ayaan, Zoya, Kabir, Rohan, Sana, Dev, Noor, Rhea, Arjun
**Status:** Analysis complete. No runtime code was modified in this pass — every change below is specified as a deployable packet.

---

## 0. Read This First

### 0.1 Verdict

Ek Khwaab is **not** one bad decision away from failing at 1,000 CCU. It is **eleven small decisions** away, and nine of them are caching, indexing, or scope decisions rather than infrastructure purchases.

The architecture is fundamentally sound for the target:

- Static-first delivery (TanStack Start prerendered to `dist/` on Hostinger) means the read path never touches Node.
- The AI path is already isolated on Render, so a Groq outage cannot white-screen the app.
- Two independent fallback engines (`POEMS` seed corpus and `composeFallbackPoem`) already exist.
- The dual-vault schema is materially better than most indie products: plaintext answers are gone, `is_gumnaam` is masked at the view layer, and brute-force lockout exists.

The three issues that would actually break the product under load are:

1. **No edge cache in front of Hostinger.** HTML is served with `max-age=0`, so every CCU page view is an origin hit on shared hosting.
2. **No client-side read cache.** TanStack Query is installed and mounted but never used, so `/feed` re-queries Supabase on every mount, plus an unbounded comments query.
3. **No write-once translation.** Scripts are written as raw source text first and overwritten later by a fire-and-forget browser job, so readers can see Roman text labelled Hindi, and readers never trigger translations at read time (good) but the write path is unreliable (bad).

The one issue that would break **trust** rather than throughput:

4. **`public_shayars` is readable by `anon` with `auth_user_id` in the row.** The public directory *view* hides it, but the base table does not. The fix is a grant change, not a redesign.

### 0.2 What was actually inspected

| Area | Files read |
|---|---|
| Frontend | `src/routes/__root.tsx`, `feed.tsx`, `index.tsx`, `studio.tsx`, `card-studio.tsx`, `explore.tsx`, `letters.tsx`, `secret-letters.tsx`, `ai-poet.tsx`, `auth.tsx`, `src/components/PoemCard.tsx`, `src/components/AmbientAudio.tsx`, `src/lib/store.tsx` |
| Services | `src/lib/poems.service.ts`, `khats.service.ts`, `translation.service.ts`, `groq.service.ts`, `shayar.functions.ts`, `auth.service.ts`, `rate-limiter.ts` |
| Data layer | all three `supabase/migrations/*.sql` |
| AI service | `render-api/server.mjs`, `render-api/package.json`, `render.yaml` |
| Delivery | `public/.htaccess`, `public/robots.txt`, `public/sitemap.xml`, `scripts/prerender-seo.mjs`, `scripts/generate-sitemap.ts`, `vite.config.ts`, `package.json`, `.env.example` |
| Build output | `.output/public/assets/*` (measured gzip sizes), `dist/index.html`, `dist/feed/index.html` |

### 0.3 Measured baseline (not estimates)

| Metric | Measured value | Source |
|---|---|---|
| Entry JS chunk | **755.0 kB raw / 216.8 kB gzip** | `.output/public/assets/index-PiYp2QWH.js` |
| Shared UI chunk | 55.0 kB raw / 19.6 kB gzip | `kit-Bxh3DDWo.js` |
| CSS | 94.2 kB raw | `styles-PF0nBuIe.css` |
| Home HTML | 64.5 kB | `dist/index.html` |
| Feed HTML | **151.9 kB** | `dist/feed/index.html` |
| Static URLs in sitemap | **66** (11 core + 4 topics + 16 poems + 35 lughat) | `public/sitemap.xml` |
| Supabase round trips per feed mount | **2 sequential** (poems, then comments) | `poems.service.ts:45-111` |
| TanStack Query usage | **0 call sites** | repo-wide grep |
| Supabase Realtime usage | **0 channels** | repo-wide grep |
| Stray deploy artifact | `dist/ai-poet.zip` — 1.8 MB | `dist/` |

### 0.4 Honest scope note: features named in the brief that do not exist

The brief references `/listen-together` (Hum-Nawa) and `/stages-of-love`. **Neither route exists in this repository.** There is no WebSocket code, no `supabase.channel(...)` call, no audio-room component, and no YouTube sync engine. `grep` for `realtime|channel(|postgres_changes|broadcast` returns zero matches in `src/`.

This is good news for the load target: the Supabase Realtime quota risk is currently **zero**, because nothing connects. Sana's section therefore specifies the room protocol **before** it ships, so the quota guard is designed in rather than retrofitted. If the features exist in a different branch, that branch must inherit §3.6 before merging.

Also absent: a `slug` column on `poems`, which is why user-published poems cannot be indexed (Noor, §3.8).

### 0.5 Severity register (summary)

| # | Severity | Finding | Owner |
|---|---|---|---|
| F-01 | **P0** | HTML served with `max-age=0`, no CDN/SWR → every page view hits shared hosting | Vikram/Noor |
| F-02 | **P0** | `public_shayars` anon-readable including `auth_user_id` | Kabir |
| F-03 | **P0** | `trust proxy 1` + Cloudflare → all users collapse to a few edge IPs → global rate-limit freeze | Kabir/Rohan |
| F-04 | **P1** | 216.8 kB gz entry chunk; target is < 90 kB | Zoya |
| F-05 | **P1** | 2 sequential round trips per feed mount, zero cache, unbounded comments query | Zoya/Ayaan |
| F-06 | **P1** | AI endpoints are unauthenticated; CORS does not stop curl → Groq quota drain | Kabir/Rohan |
| F-07 | **P1** | `poems` base table anon-readable → `is_gumnaam` masking is bypassable | Kabir |
| F-08 | **P1** | No bound on AI concurrency; 50 simultaneous requests vs ~30 RPM / 12k TPM | Rohan |
| F-09 | **P1** | Translation is fire-and-forget from the browser; abandoned tabs leave wrong-script poems | Rohan |
| F-10 | **P2** | Wide-row `daad_count` updates on `poems` (4× TEXT columns) cause write amplification | Ayaan |
| F-11 | **P2** | Cursor pagination on `created_at` alone → dropped/duplicated rows on ties | Ayaan |
| F-12 | **P2** | No per-route error boundaries; one route crash takes the shell | Rhea |
| F-13 | **P2** | `URL.createObjectURL` never revoked in Card Studio; `toBlob` null unhandled | Dev |
| F-14 | **P2** | `/studio` and `/card-studio` both live and both in sitemap | Noor/Arjun |
| F-15 | **P2** | `lastmod` = build date for all 66 URLs on every build | Noor |
| F-16 | **P2** | "Post to Feed" in Studio writes only to localStorage, never to Postgres | Dev/Arjun |
| F-17 | **P3** | Global `X-Robots-Tag: index, follow` also applies to `/auth`, `/profile` | Noor |
| F-18 | **P3** | Model name drift: `llama-3.3-70b-versatile` vs `openai/gpt-oss-120b` | Rohan |
| F-19 | **P3** | `dist/ai-poet.zip` ships to `public_html` if `dist/` is uploaded verbatim | Rhea |
| F-20 | **P3** | Stray filename `googleb15237dc8951269c .html` (space before extension) | Noor |

---

## 1. Executive Architecture Overview & 1,000-CCU Capacity Model

### 1.1 As-built topology

```
                        ┌───────────────────────────────┐
                        │        Readers / Poets        │
                        │  Android · iOS · Desktop      │
                        └───────────────┬───────────────┘
                                        │ HTTPS
                     ┌──────────────────▼──────────────────┐
                     │  DNS at registrar (no proxy layer)  │
                     │  ekkhwaab.in forced non-www + TLS   │
                     └──────────────────┬──────────────────┘
                                        │
        ┌───────────────────────────────▼────────────────────────────────┐
        │              HOSTINGER SHARED HOSTING (LiteSpeed)              │
        │  public_html/  =  dist/  (66 prerendered HTML files + assets)  │
        │                                                                │
        │  .htaccess                                                     │
        │   • 301 → https, 301 www → apex                                │
        │   • /dir/index.html if exists  (prerendered)                   │
        │   • -f static passthrough                                      │
        │   • SPA fallback → /index.html                                 │
        │   • text/html  Cache-Control: max-age=0      ← origin hit      │
        │   • /assets/* Cache-Control: 1 year (no immutable)             │
        │   • CSP, HSTS, X-Robots-Tag, COOP                              │
        └───────┬──────────────────────────────┬─────────────────────────┘
                │                              │
                │ 15–17 page views/sec         │ browser → Supabase (direct)
                │ (1,000 CCU model)            │ anon key in bundle
                │                              ▼
                │              ┌──────────────────────────────────────────┐
                │              │        SUPABASE (Postgres + PostgREST)   │
                │              │  poems · public_shayars · private_vault  │
                │              │  poem_likes · bookmarks · comments       │
                │              │  secret_khats · content_reports          │
                │              │  views: safe_poems_feed,                 │
                │              │         public_shayar_directory          │
                │              │  RPCs: create/unlock/get_secret_khat_rpc │
                │              │        sync_current_user_profile          │
                │              │        delete_my_account_rpc              │
                │              └──────────────────────────────────────────┘
                │
                │  AI only (direct browser → Render, CORS allowlist)
                ▼
        ┌────────────────────────────────────────────────────────────────┐
        │                RENDER WEB SERVICE  (plan: free)                │
        │  render-api/server.mjs   Express 4                             │
        │   GET  /health                                                 │
        │   POST /api/ai/shayar      (12 req / 10 min per IP)            │
        │   POST /api/ai/translate   (same limiter instance)             │
        │   • no cache · no queue · no circuit breaker · no helmet       │
        │   • AbortController 12 s                                       │
        └───────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS
                                    ▼
                        ┌───────────────────────────┐
                        │   GROQ  (LPU inference)   │
                        │  llama-3.3-70b-versatile  │
                        │  rate limits: RPM / TPM   │
                        └───────────────────────────┘
```

**Single points of failure:** Hostinger origin (no CDN), single Render instance (free plan spins down), single Supabase project (no read replica).

**Trust boundaries:** browser ↔ Hostinger (public static), browser ↔ Supabase (anon key + RLS), browser ↔ Render (no auth, CORS only), Render ↔ Groq (secret key).

### 1.2 Target topology (1,000 CCU)

```
                        ┌───────────────────────────────┐
                        │        Readers / Poets        │
                        └───────────────┬───────────────┘
                                        │ HTTP/3 · TLS1.3 · Brotli
                     ┌──────────────────▼──────────────────┐
                     │   CLOUDFLARE  (free plan is enough) │
                     │  • WAF + bot fight + Turnstile      │
                     │  • Tiered cache, Brotli, Early Hints│
                     │  • Cache rules:                     │
                     │      /assets/*  → 1y immutable      │
                     │      /*.html    → 5m + SWR 1d       │
                     │      /api/*     → bypass            │
                     │      /poetry/*  → Worker SEO shell  │
                     │  • Rate limits per path             │
                     └───────┬──────────────────┬──────────┘
                             │ cache miss       │ AI calls
                             │ (~1 req/s)       │ (bypass)
        ┌────────────────────▼───────┐   ┌──────▼────────────────────────┐
        │  HOSTINGER (origin only)   │   │  RENDER  (Starter, always-on) │
        │  static dist/ + .htaccess  │   │  express + LRU + p-limit(4)   │
        │  ~1.3 req/s · < 5% CPU     │   │  + token bucket + breaker     │
        └────────────────────────────┘   └──────┬────────────────────────┘
                                                │ ≤ 25 RPM / ≤ 10k TPM
                                                ▼
                                        ┌───────────────┐
                                        │     GROQ      │
                                        └───────────────┘

        ┌──────────────────────────────────────────────────────────────┐
        │ SUPABASE                                                     │
        │  • /feed first page served from Edge Snapshot (60 s KV cache)│
        │  • authenticated users → direct PostgREST with SWR 45 s      │
        │  • Realtime sockets ONLY inside /listen-together rooms       │
        │  • Supavisor transaction pooling for any server-side worker  │
        └──────────────────────────────────────────────────────────────┘
```

### 1.3 Traffic model (the assumptions everything else is derived from)

| Parameter | Value | Rationale |
|---|---|---|
| Concurrent users (CCU) | 1,000 | target |
| Mean session length | 9 min (540 s) | poetry app, long dwell |
| Page views per session | 7 | feed → poem → studio → feed |
| Page-view rate | `1000 ÷ (540 ÷ 7)` = **12.97 pv/s** | use **13 pv/s** |
| Burst factor | 1.5× | viral post / share spike → **20 pv/s** |
| Read : write ratio | 95 : 5 | matches brief |
| AI users | 5% = 50 | brief |
| Khat users | 2% = 20 | brief |
| Card Studio users | 8% = 80 | client-only, 0 server RPS |
| Realtime room users | 2% = 20 → 10 rooms | room-scoped only |

### 1.4 Capacity math

**A. Hostinger origin request rate**

| Scenario | Origin HTML req/s | Origin bytes/s | Origin concurrency @150 ms |
|---|---|---|---|
| No CDN (today) | 13.0 (burst 20) | 13 × 22 kB = **286 kB/s** (2.3 Mbps) | ~2.0 (burst 3.0) |
| Cloudflare, 5 min HTML TTL | ~0.15 | 3 kB/s | ~0.02 |
| Cloudflare, 90% HIT | 1.3 | 29 kB/s | ~0.2 |

The RPS number is small. **The risk is not RPS, it is burst TLS + burst egress.** One thousand cold visitors in 60 s = 16.7 connections/s × 415 kB of JS/CSS/fonts = **6.9 MB/s (55 Mbps)** and 1,000 TLS handshakes in one minute. On shared LiteSpeed that manifests as CPU throttling, then 503s, then `Entry Process` warnings. With Cloudflare, the same burst is absorbed at the edge (free plan has unmetered static bandwidth) and origin sees one revalidation.

**B. First-load byte budget (measured)**

| Asset | Raw | Gzip | Cached after first visit |
|---|---|---|---|
| `index-*.js` | 755.0 kB | **216.8 kB** | yes (immutable) |
| `kit-*.js` | 55.0 kB | 19.6 kB | yes |
| route chunks (avg) | ~30 kB | ~9 kB | yes |
| CSS | 94.2 kB | ~17 kB | yes |
| `logo.png` + `logo-icon.png` | 560 kB | 560 kB (PNG, no compression gain) | yes |
| fonts (Playfair, Jakarta, Devanagari, **Nastaliq**, Mono) | ~1.1 MB across families | — | yes |
| **Total cold** | **~2.6 MB** | **~900 kB + 560 kB images** | |

`logo.png` (300 kB) and `logo-icon.png` (248 kB) are the single biggest avoidable byte cost on the landing page. WebP/AVIF at 2 sizes cuts ~520 kB with zero visual change.

**C. Supabase read load**

| Scenario | Queries/s | Rows/s | Egress/s | Egress/month (2 h/day peak) |
|---|---|---|---|---|
| Today (no cache) | 13 × 2 = **26** | 260 poem + ~180 comment rows | 234 kB/s | **~50 GB** |
| Client SWR 45 s + dedupe (−80%) | 5.2 | 52 | 47 kB/s | ~10 GB |
| Edge snapshot 60 s (anon) | **< 1** | < 20 | < 10 kB/s | **< 1 GB** |

The free tier includes 5 GB/month egress. **Today's architecture is ~10× over the free tier at target load.** This is the most under-appreciated bottleneck in the repo: nothing in the code is slow — the bill is slow.

**D. Supabase database connections**

PostgREST speaks HTTP; the browser never opens a Postgres connection. 26 QPS × ~4 ms = 0.1 concurrent backends. The Micro instance's 60-connection ceiling is **not** the constraint at 1,000 CCU. Do not buy a bigger database before fixing §1.4C.

**E. Render + Groq**

| Metric | Value |
|---|---|
| AI users | 50 |
| Requests per user per 3 min | 1 |
| Steady-state AI RPS | 0.28 → **17 RPM** |
| Launch burst (50 users press Generate at once) | **50 concurrent** |
| Groq free-tier 70B limits (typical) | ~30 RPM · ~12k TPM |
| Tokens per request (prompt + 1,600 output) | ~2,400 |
| TPM-feasible throughput | 12,000 ÷ 2,400 = **5 RPM** |

So the binding constraint is **TPM, not RPM**: under 17 RPM of real traffic the service is 3.4× over its token budget. Mitigation is not "more concurrency" — it is cache + shorter outputs + a cheaper model for translation. With a 55% SHA-256 cache hit rate and `max_tokens: 900`, effective upstream cost drops to ~7.6 RPM × 1,600 tok ≈ 12k TPM, i.e. exactly at the limit, which is why the token bucket (§5) must reserve before dispatch rather than after.

**F. Realtime**

| Scenario | Sockets |
|---|---|
| Today (no feature) | 0 |
| Room-scoped, 2% in rooms | 20 sockets / 10 rooms |
| Free quota | 200 |
| Headroom | **10×** |
| Anti-pattern: global socket in `__root` | **1,000 sockets → hard fail at 201** |

That last row is the whole reason Sana's section exists.

### 1.5 Per-layer budget at 1,000 CCU

| Layer | Target p95 | Alarm threshold | Hard cap |
|---|---|---|---|
| Cloudflare edge (HTML) | 25 ms | 80 ms | 200 ms |
| Hostinger origin (cache miss) | 120 ms | 400 ms | 1 s |
| Supabase feed query | 35 ms | 100 ms | 500 ms |
| Supabase like/unlock RPC | 60 ms | 150 ms | 800 ms |
| Render `/health` | 30 ms | 200 ms | 2 s |
| Render AI cache hit | **2 ms** | 10 ms | 50 ms |
| Render AI cache miss | 3.5 s | 8 s | 12 s (abort) |
| Card export (client) | 400 ms | 1.5 s | 4 s |
| LCP (mobile, 4G) | 1.8 s | 2.5 s | 4 s |
| INP | 100 ms | 200 ms | 500 ms |
| CLS | 0.02 | 0.1 | 0.25 |

### 1.6 Sequence diagrams

#### (a) Dual-vault signup / login

```
Browser                Supabase Auth        Trigger (auth.users)      private_user_vault    public_shayars
   │                        │                        │                        │                  │
   │ signUp(email,pw,meta)  │                        │                        │                  │
   ├───────────────────────►│                        │                        │                  │
   │                        │ INSERT auth.users ─────►│                        │                  │
   │                        │                        │ handle_new_authenticated_user()           │
   │                        │                        ├───────────────────────►│ UPSERT (email,   │
   │                        │                        │                        │  real_full_name) │
   │                        │                        ├──────────────────────────────────────────►│ UPSERT
   │                        │                        │                        │                  │ (#EK-xxxx, takhallus)
   │                        │                        │ EXCEPTION → WARNING, never abort signup   │
   │  {session:null, needsConfirmation}              │                        │                  │
   │◄───────────────────────┤                        │                        │                  │
   │                        │                        │                        │                  │
   │ click email link → /auth?mode=signin&confirmed=true                       │                  │
   │ signInWithPassword     │                        │                        │                  │
   ├───────────────────────►│                        │                        │                  │
   │  JWT (access+refresh)  │                        │                        │                  │
   │◄───────────────────────┤                        │                        │                  │
   │                        │                        │                        │                  │
   │ StoreProvider: getSession() → select takhallus, shayar_uid WHERE auth_user_id = uid          │
   ├─────────────────────────────────────────────────────────────────────────────────────────────►│
   │  ⚠ anon/authenticated can also read OTHER users' auth_user_id today (F-02)                    │
   │                                                                                               │
   │ localStorage: { penName, poetId, script, liked, saved, studio, expiresAt }  — no PII          │
```

Failure modes to design for: duplicate `shayar_uid` collision (trigger swallows with `RAISE WARNING`, leaving a poet with **no** public row — the app must call `sync_current_user_profile()` on first write failure), and email-confirmation racing the client-side upsert (both paths are `ON CONFLICT`, so it converges).

#### (b) Feed read & poem publish — current vs target

```
CURRENT (13 req/s → 26 queries/s)
────────��──────────────────────────────────────────────────────────────────
Feed mount ──► fetchPoems()
                 ├─ Q1: select * from safe_poems_feed order by created_at desc limit 21
                 │      └─ view: LEFT JOIN public_shayars + auth.uid() ownership subquery
                 ├─ Q2: select comments.*, public_shayars(takhallus) where poem_id in (20 ids)
                 │      └─ ⚠ unbounded: a viral poem returns every comment
                 └─ merge 16 local seed poems → 36 cards
              ▲ no cache, no dedupe, no abort on route change
Publish    ──► INSERT poems (hinglish=raw, hindi=raw, urdu=raw, english=null)
                 └─ ⚠ until async job finishes, Hindi/Urdu readers see Roman text
              ──► triggerAutoTranslation() fire-and-forget from the tab
                 └─ ⚠ closing the tab leaves the poem permanently wrong-script


TARGET (13 req/s → 5.2 queries/s anon edge, 0 for snapshot hits)
───────────────────────────────────────────────────────────────────────────
Feed mount ──► useInfiniteQuery(['feed', cursor])
                 ├─ HIT in memory (< 45 s)         → 0 network
                 ├─ HIT in flight (dedupe)         → share the promise
                 ├─ anon first page ──► GET /v1/feed-snapshot (Cloudflare KV, 60 s)
                 │                        └─ miss → PostgREST → single query
                 │                                 (poem + top-3 comments via json_agg)
                 └─ authenticated ──► PostgREST keyset (created_at,id) + index
Publish    ──► INSERT poems (status='pending')
              ──► server writes all 3 scripts in ONE transaction when translation lands
              ──► pg_cron sweep re-queues anything pending > 5 min
```

#### (c) Secret Khat unlock (server-side hashed verification)

```
Sender                        Render/Browser            Supabase RPC                 secret_khats
  │                                 │                        │                            │
  │ fill poem + 2 clues + answer    │                        │                            │
  ├────────────────────────────────►│ create_secret_khat_rpc │                            │
  │                                 ├───────────────────────►│ auth.uid() → shayar_uid     │
  │                                 │                        ├───────────────────────────►│ INSERT
  │                                 │                        │  recipient → sha256         │
  │                                 │                        │  answer   → bcrypt(gen_salt)│
  │                                 │                        │  recipient_identifier='[REDACTED]'
  │  {id}  ← capability URL         │◄───────────────────────┤                            │
  │◄────────────────────────────────┤                        │                            │
  │                                 │                        │                            │
Recipient                           │                        │                            │
  │ open /letters?id=<uuid>         │                        │                            │
  ├────────────────────────────────►│ get_secret_khat_by_id  │                            │
  │                                 ├───────────────────────►│ SELECT ... expires_at>now() │
  │  poem + clues, sender=NULL      │◄───────────────────────┤ (sender masked until unlock)│
  │◄────────────────────────────────┤                        │                            │
  │ guess                           │                        │                            │
  ├────────────────────────────────►│ unlock_secret_khat_rpc │                            │
  │                                 ├───────────────────────►│ SELECT ... FOR UPDATE      │
  │                                 │                        │ ├ locked_until > now? → 0   │
  │                                 │                        │ ├ crypt(guess, hash)        │
  │                                 │                        │ ├ ok  → is_unlocked=true    │
  │                                 │                        │ └ bad → failed+1, lock @ 5  │
  │  {unlocked, sender_takhallus, remaining_attempts}        │                            │
  │◄────────────────────────────────┴────────────────────────┴────────────────────────────┘

Notes (see §3.4):
 • This is hashed server-side verification, NOT zero-knowledge — the server can read the poem.
 • `is_unlocked` is global: the first successful guess reveals the sender to every holder of the link.
 • SELECT ... FOR UPDATE serialises guesses on one letter (correct) but also allows a 5-guess lockout DoS.
```

#### (d) AI Poet generation with cache + queue

```
Browser                    Cloudflare            Render /api/ai/shayar            LRU            TokenBucket        Groq
   │                           │                          │                        │                 │               │
   │ POST seeds+style+stage    │                          │                        │                 │               │
   ├──────────────────────────►│ WAF + Turnstile          │                        │                 │               │
   │                           ├─────────────────────────►│ zod validate           │                 │               │
   │                           │                          ├─ sha256(canonical) ───►│ lookup          │               │
   │                           │                          │◄─ HIT (≤2 ms) ─────────┤                 │               │
   │  200 {cached:true}        │◄─────────────────────────┤                        │                 │               │
   │◄──────────────────────────┤                          │                        │                 │               │
   │                           │                          │ MISS                   │                 │               │
   │                           │                          ├─ singleflight(key)     │                 │               │
   │                           │                          ├─ queue (max 24) ──────►│ reserve tokens  │               │
   │                           │                          │                        │  (RPM+TPM)      │               │
   │                           │                          │                        ├────────────────►│ POST          │
   │                           │                          │                        │                 ├──────────────►│
   │                           │                          │                        │                 │◄── 200 JSON ──┤
   │                           │                          │◄── store(key, ttl 6h) ─┤                 │               │
   │  200 {cached:false, ms}   │◄─────────────────────────┤                        │                 │               │
   │◄──────────────────────────┤                          │                        │                 │               │
   │                           │                          │ 429 / 5xx × 5 → breaker OPEN 30 s      │               │
   │  200 {degraded:true, curated:true}  ← offline engine  │                        │                 │               │
```

#### (e) Two-person synced room (specified, not yet implemented)

```
Host (tap Play)                 Supabase Realtime channel: room:<code>            Guest
   │                                          │                                    │
   │ subscribe(presence)                      │                                    │
   ├─────────────────────────────────────────►│◄──── subscribe(presence) ──────────┤
   │ presence_state {t0, playing, pos}        │                                    │
   │◄─────────────────────────────────────────┼───────────────────────────────────►│
   │                                          │                                    │
   │ broadcast {t:'sync', pos, t0, seq}       │  (≤4 msg/s while scrubbing)        │
   ├─────────────────────────────────────────►├───────────────────────────────────►│
   │                                          │      offset = guest.now − t0 − rtt/2
   │                                          │      target = pos + (now − t0)
   │                                          │      if |drift| > 250 ms → seek
   │                                          │      else playbackRate = 1 ± drift/2000
   │ idle 10 min → unsubscribe() → socket released                             │
   │ Wi-Fi ⇄ 5G → on visibilitychange / online → re-join, resync from presence │
```

---

## 2. File-by-File & Service-by-Service Workflow Map

### 2.1 One request, end to end

```
GET https://ekkhwaab.in/feed
  │
  ├─ 1. DNS        A/AAAA → Cloudflare anycast (target) / Hostinger (today)
  ├─ 2. TLS        edge handshake, HTTP/3, Brotli
  ├─ 3. Cache key  host + path + Accept-Encoding (+ auth cookie if Vary)
  │      HIT  → serve dist/feed/index.html from edge (0 origin bytes)
  │      MISS → 4
  ├─ 4. Hostinger LiteSpeed
  │      .htaccess rule 3: /feed is a directory with index.html → serve it
  │      (no PHP, no Node, no entry process)
  ├─ 5. HTML parse
  │      • Google Fonts stylesheet is render-blocking (2 RTT + font fetch)
  │      • inline hydration script starts TanStack Router
  │      • JSON-LD @graph injected in <head> (safeJsonLd)
  ├─ 6. Hydrate    StoreProvider: localStorage read + supabase.auth.getSession()
  ├─ 7. Route      /feed component mounts
  │      └─ useEffect → fetchPoems()  ← the only network waterfall in the app
  ├─ 8. Browser ─► Supabase PostgREST  (direct, anon key)
  │      Q1 view safe_poems_feed (LEFT JOIN, auth.uid() predicate)
  │      Q2 comments + embedded public_shayars(takhallus)
  └─ 9. Paint      36 cards (20 DB + 16 seeds), each with 4 script arrays preloaded
```

The crucial property: **step 4 is the only origin work for a cache hit, and step 8 is the only database work.** Everything else is edge or client. At 1,000 CCU the whole system is therefore governed by two numbers: HTML cache hit ratio and Supabase queries per feed mount.

### 2.2 Route inventory

| Route | File | Renders | Server I/O on mount | Auth required | Indexable |
|---|---|---|---|---|---|
| `/` | `routes/index.tsx` | landing + featured | none (seed data) | no | yes |
| `/feed` | `routes/feed.tsx` | feed + compose | **2 queries** | no (write only) | yes |
| `/explore` | `routes/explore.tsx` | re-export of `Feed` | same as `/feed` | no | canonical → `/feed` |
| `/ai-poet` | `routes/ai-poet.tsx` | co-writer | 0 until generate | no | yes |
| `/studio` | `routes/studio.tsx` | Card Studio engine | 0 (canvas local) | no | yes |
| `/card-studio` | `routes/card-studio.tsx` | re-export of `Studio` | 0 | no | **duplicate of `/studio`** |
| `/letters` | `routes/letters.tsx` | create / unlock khat | 0–2 RPCs | write yes | no |
| `/secret-letters` | `routes/secret-letters.tsx` | re-export of `Letters` | same | no | duplicate |
| `/dictionary` | `routes/dictionary.tsx` | lughat index | 0 | no | yes |
| `/dictionary/$word` | `routes/dictionary.$word.tsx` | word page | 0 | no | yes (35 prerendered) |
| `/poetry/$slug` | `routes/poetry.$slug.tsx` | poem showcase | 0 (seed only) | no | yes (16 prerendered) |
| `/topic/$topic` | `routes/topic.$topic.tsx` | topic listing | 0 | no | yes (4 prerendered) |
| `/auth` | `routes/auth.tsx` | dual-vault signup/signin | auth calls | no | **must be noindex** |
| `/profile` | `routes/profile.tsx` | private vault view | profile query | yes | **must be noindex** |
| `/guidelines`, `/privacy` | static | legal | 0 | no | yes |

Six routes are thin re-exports (`/explore`→`Feed`, `/card-studio`→`Studio`, `/secret-letters`→`Letters`). That is a deliberate Lovable-era pattern, but three of them are **duplicate content** for search engines and two of them (`Studio`/`CardStudioPage`) double-render a rotating canvas on mobile. Canonicalise, do not delete the URLs (people share them).

### 2.3 Module responsibility map

| Module | Responsibility | Coupling risk at scale |
|---|---|---|
| `src/lib/store.tsx` | user, script, poems, liked, saved, letters, studio; localStorage TTL 7 d | **single context object** → every consumer re-renders on any poem update |
| `src/lib/poems.service.ts` | feed read/write, likes, bookmarks, comments, reports | 2 round trips, unbounded comments, `created_at`-only cursor |
| `src/lib/translation.service.ts` | script detection + auto-translation pipeline + offline fallback | browser-triggered; abandoned tab leaves wrong scripts |
| `src/lib/shayar.functions.ts` | AI poet server fn + hybrid caller + offline engine | rate limit key is a **constant string**, so the quota is global, not per user |
| `src/lib/groq.service.ts` | prompt building, call, schema validation | model name drift vs `.env.example` |
| `src/lib/khats.service.ts` | khat create / fetch / unlock via RPC | capability URL model; no per-recipient unlock state |
| `src/lib/auth.service.ts` | signup/signin/reset, redirect URL, vault upsert | duplicate provisioning with the DB trigger (idempotent, acceptable) |
| `src/lib/rate-limiter.ts` | in-memory sliding window for server fns | **single-process memory**; meaningless behind multiple instances |
| `src/integrations/supabase/client.ts` | singleton client, SSR URL rewrite | one client for the whole app (correct) |
| `src/components/PoemCard.tsx` | card, like, save, comment, report, delete | not memoised; re-renders 36× on one like |
| `render-api/server.mjs` | AI shayar + translate | no cache, no queue, no breaker, no helmet |
| `public/.htaccess` | routing, headers, caching | HTML `max-age=0`, assets without `immutable`, no compression block |
| `scripts/prerender-seo.mjs` | cleans `dist`, copies `.output/public`, pre-renders 66 routes | build time grows linearly with poems; 10k poems = unusable CI |
| `scripts/generate-sitemap.ts` | writes `public/sitemap.xml` before build | only static seeds; `lastmod` = today for all URLs |

### 2.4 The `.htaccess` contract (what it actually guarantees)

| Rule | Current behaviour | Risk |
|---|---|---|
| Force HTTPS | 301 | fine |
| www → apex | 301 | fine, but `ekkhawaab.in` typo variants are not redirected |
| Directory index | serves `/feed/index.html` | correct, this is the CDN-cacheable path |
| Static passthrough | `-f` short-circuit | correct |
| SPA fallback | everything else → `/index.html` | **200 for unknown URLs**, soft-404s; Google will index junk |
| `text/html max-age=0` | no edge caching | **F-01** |
| `/assets/*` 1 year | no `immutable` | revalidation on reload |
| No `mod_deflate`/`mod_brotli` | relies on host default | variable by plan |
| `X-Robots-Tag: index, follow` | global | applies to `/auth`, `/profile` |
| CSP | `script-src 'self' 'unsafe-inline'` | XSS surface, no `frame-ancestors` |
| `_headers` file | Cloudflare-Pages syntax, ignored by LiteSpeed | dead config, misleading |

### 2.5 Render API contract

| Endpoint | Auth | Limits | Timeout | Failure response |
|---|---|---|---|---|
| `GET /health` | none | none | — | — |
| `POST /api/ai/shayar` | **none** | 12 req / 10 min per IP (memory) | 12 s abort | 500 `{poem:null,error}` |
| `POST /api/ai/translate` | **none** | shares the same 12 req bucket | 12 s abort | 500 `{success:false,error}` |

Client-side fallback chain: Render → TanStack server fn (`composeShayari`) → `composeFallbackPoem` (curated, offline). The chain is good. What is missing is a **server-side** fallback when Groq is slow, so the browser does not sit through a 12 s abort before using the curated poem.

### 2.6 Supabase object inventory

| Object | Type | Notes |
|---|---|---|
| `private_user_vault` | table | real name, email, phone — RLS `auth.uid() = auth_user_id` |
| `public_shayars` | table | pen name, `#EK-xxxx`, **`auth_user_id`** → F-02 |
| `poems` | table | 3 script columns + english, `is_gumnaam`, `daad_count`, `seed_words[]` |
| `poem_likes` / `bookmarks` | tables | unique `(poem_id, shayar_uid)`; no UPDATE policy (correct) |
| `comments` | table | 600 char cap |
| `secret_khats` | table | bcrypt answer hash, sha256 recipient hash, `failed_attempts`, `locked_until`, `expires_at` |
| `content_reports` | table | insert-only for authenticated |
| `safe_poems_feed` | view | masks `is_gumnaam`, computes `is_owner` |
| `public_shayar_directory` | view | hides `auth_user_id` |
| `update_poem_daad_count()` | trigger fn | per-row counter update |
| `handle_new_authenticated_user()` | trigger fn | provisions both vaults |
| `create_secret_khat_rpc` / `get_secret_khat_by_id` / `unlock_secret_khat_rpc` | RPC | `SECURITY DEFINER`, `search_path` pinned |
| `sync_current_user_profile` | RPC | self-healing profile |
| `delete_my_account_rpc` | RPC | erasure |

### 2.7 Environment matrix

| Variable | Used by | Build-time? | Runtime? | Note |
|---|---|---|---|---|
| `VITE_SUPABASE_URL` | browser bundle | yes | — | public |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | browser bundle | yes | — | public, RLS-gated |
| `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` | SSR prerender | yes | yes | must be set in CI |
| `VITE_API_BASE_URL` | browser | yes | — | `https://ek-khawaab-api.onrender.com` |
| `GROQ_API_KEY` | Render + server fns | — | yes | **rotate if ever logged** |
| `GROQ_MODEL` | Render + server fns | — | yes | `llama-3.3-70b-versatile` vs `openai/gpt-oss-120b` → F-18 |
| `ALLOWED_ORIGINS` | Render CORS | — | yes | apex + www |
| `NITRO_PRESET` | build | yes | — | `vercel` in `.env.example`, unset for Hostinger |

---

## 3. Deep-Dive Audits by the Ten Persona Agents

Each persona follows the same contract: **Current State → 1,000-CCU Failure Mode → Options & Trade-offs → Selected Strategy → Exact Implementation Blueprint.**

---

### 3.1 👤 VIKRAM — Principal Systems & Distributed Topology Architect

#### Current State

The deployment is a three-plane split with clean separation of concerns:

- **Static plane** — Hostinger `public_html` receives `dist/` (66 prerendered HTML files + hashed assets). No Node runtime in production for reads.
- **AI plane** — Render free-tier Express service, CORS-allowlisted to `ekkhwaab.in` / `www.ekkhwaab.in`, 12 s abort, per-IP 12/10 min limiter.
- **Data plane** — Supabase accessed directly from the browser with the publishable key. RLS is the only gate.

What is *not* present: a CDN, an origin shield, a health-based failover, or any observability. `.htaccess` is the entire delivery contract. There is a `_headers` file using Cloudflare-Pages syntax that LiteSpeed ignores.

#### 1,000-CCU Failure Mode

The system fails in a specific, predictable order:

1. **Minute 0–1 (burst arrival).** 1,000 cold clients request `index.html` + 216.8 kB gz JS + 560 kB PNG logos + ~1 MB of fonts. Origin serves ~55 Mbps and ~17 TLS handshakes/s. LiteSpeed CPU saturates; some requests queue. Because `text/html` is `max-age=0`, **this repeats on every navigation**, not just first visit.
2. **Minute 1–5 (steady state).** 13 pv/s × 2 queries = 26 QPS to Supabase, of which the comments query is unbounded. Egress crosses 234 kB/s. On a free/micro project this is 10× the monthly egress allowance in under a week of peak usage.
3. **Minute 5–15 (AI spike).** 50 users trigger generation. Each Render request parks for up to 12 s holding a socket. Groq returns 429 at ~5–17 RPM depending on token size. Render's limiter (12/10 min **per IP**) either does nothing (1,000 distinct IPs) or blocks an entire college NAT (one IP).
4. **Any time (single dependency loss).** Hostinger 503 → whole product down (no cache to serve). Render asleep → AI dead for 50 s. Supabase slow → feed hangs with no timeout, no fallback (the `fetchPoems` fallback only runs on error, not on a 30 s hang).

There is no state in which the app "degrades": it either works or white-screens. That is the architectural gap Vikram owns.

#### Options & Trade-offs

| Option | What it buys | Cost / risk | Verdict |
|---|---|---|---|
| **A. Cloudflare proxy in front of Hostinger** | unmetered static bandwidth, WAF, Brotli, HTTP/3, edge HTML cache, instant purge | free; DNS nameserver move; must set SSL mode to Full (strict) | **Selected** |
| **B. Move static to Cloudflare Pages** | removes Hostinger entirely from the read path; atomic deploys; preview URLs | lose `.htaccess`, rewrite headers to `_headers`, new CI step, email/DNS disentangling | Phase 2 (best long-term) |
| **C. Lift-and-shift to a VPS + Nginx** | full control, HTTP/2 push, Brotli | ops burden, patching, no free DDoS protection, worse than A for zero cost | reject |
| **D. Keep as-is, upgrade Hostinger plan** | removes CPU throttling | ~$10–20/mo, still no edge cache, still repeats HTML on every navigation, still no WAF | reject as primary; keep plan |

Decision: **A now, B later.** A is reversible in 10 minutes (grey-cloud the DNS record) and delivers 90% of B's benefit without touching the build pipeline.

#### Selected Strategy

Three-tier delivery:

```
Tier 1  Edge        Cloudflare: HTML 5 min + SWR 1 day, assets 1 year immutable,
                    /api/* bypass, WAF + per-path rate limits, Tiered Cache.
Tier 2  Origin      Hostinger: static only. No SSR, no API, no DB. Cache-Control
                    headers repeated at origin so a CDN purge cannot poison browsers.
Tier 3  Compute     Render: AI only, always-on Starter, health-checked.
```

The contract that makes this safe: **the origin must be correct without the CDN**, and **the CDN must never cache anything user-specific**. That means `Vary` must not include `Authorization` for public HTML, and no HTML may contain per-user data. Today it doesn't — the app hydrates user state client-side from localStorage/JWT. That property must be preserved (Arjun's "state preserved" requirement must use client state, never SSR personalisation).

#### Exact Implementation Blueprint

1. **Cloudflare DNS.** Proxy `ekkhwaab.in` and `www` (orange cloud). SSL/TLS mode **Full (strict)**. Enable Always Use HTTPS, HSTS (6 months, preload after 30 days), Brotli, HTTP/3, 0-RTT (off until stable), Early Hints.
2. **Cache Rules** (in order):
   - `http.request.uri.path matches "^/assets/"` → Eligible, Edge TTL 1 year, Browser TTL 1 year, **immutable**.
   - `http.request.uri.path matches "\\.(png|jpg|jpeg|webp|avif|svg|ico|woff2)$"` → Edge 30 days, Browser 30 days.
   - `http.request.uri.path matches "^/api/"` → **Bypass**.
   - `http.request.uri.path matches "^/(auth|profile|letters|secret-letters)"` → Bypass.
   - everything else → Eligible, Edge TTL 300 s, Browser TTL 0, **Serve stale 86400 s**, `stale-while-revalidate=86400`.
3. **Origin Cache-Control** (in `.htaccess`, so a Cloudflare misconfiguration cannot cause browser-side staleness):
   - HTML → `public, max-age=0, s-maxage=300, stale-while-revalidate=86400`
   - `/assets/*` → `public, max-age=31536000, immutable`
4. **Origin lock-down.** Cloudflare IP allowlist on Hostinger if the plan supports it (`.htaccess` `Require ip` with Cloudflare ranges, refreshed quarterly), or mTLS/authenticated origin pull on higher plans. Without this, an attacker who finds the origin IP bypasses WAF and cache.
5. **WAF managed rules:** Cloudflare OWASP core ruleset in *log* mode for 7 days, then block. Add a custom rule: block `POST` to anything except `/api/ai/*`.
6. **Bulk redirects:** `ekkhawaab.in`, `www.ekkhawaab.in`, `ekkhawaab.com` → 301 `https://ekkhwaab.in`. (F-20 adjacent: the repo already contains one filename with a stray space, proof that typos happen.)
7. **Purge strategy:** Cloudflare cache purge-by-URL on deploy for `/`, `/feed`, `/explore`, `/poetry/*`, `/topic/*`. Do **not** purge `/assets/*` — hashed filenames make that unnecessary.
8. **Render:** move from `plan: free` to `starter`. Free instances sleep after 15 min idle → 30–60 s first-byte on the next AI request. If cost is the blocker, keep free + external ping every 5 min (see Rohan §3.5) but accept occasional 502 during platform restarts.

Acceptance test: `curl -sI https://ekkhwaab.in/feed | grep -i cf-cache-status` must return `HIT` on the second request, and `age` must be < 300.

---

### 3.2 👤 AYAAN — Staff PostgreSQL & Supabase High-Concurrency Engineer

#### Current State

Schema is normalized and sane. The problems are all in the read path and the counter write path.

**View `safe_poems_feed` (latest definition, `20261110000000_...sql:180-197`):**

```sql
SELECT p.id,
       CASE WHEN p.is_gumnaam THEN 'EK-GUMNAAM' ELSE p.shayar_uid END,
       ...
       (auth.uid() IS NOT NULL
        AND p.shayar_uid IN (SELECT shayar_uid FROM public.public_shayars
                             WHERE auth_user_id = auth.uid())) AS is_owner
FROM public.poems p
LEFT JOIN public.public_shayars s ON s.shayar_uid = p.shayar_uid;
```

Four distinct problems:

1. `auth.uid()` is evaluated inside the row expression. PostgreSQL marks it `STABLE`, so the planner *may* hoist it, but the `IN (SELECT …)` becomes a **hashed SubPlan evaluated per row** in the general case. At 20 rows × 13 req/s that is 260 subplan probes/s — survivable, but it is pure waste and it will be the first thing to show up when rows/page grows to 50.
2. The view has **no `security_invoker` setting**, so it runs with the owner's rights. That is intentional (it lets anon read `poems` through the view) but it also means RLS on `poems` and `public_shayars` is bypassed inside the view. Combined with F-07 (anon retains direct `poems` SELECT), the masking is cosmetic.
3. The view cannot be indexed. Every feed read recomputes the `CASE` expressions for every candidate row before `LIMIT`. With 10k poems and `ORDER BY created_at DESC LIMIT 21`, the planner walks `idx_poems_created_at` backwards and stops after 21 — fine — **but only if the index exists and the qual is pushdown-safe**. It does exist (`idx_poems_created_at`), so today the sort is cheap.
4. `is_owner` returns `NULL` (not `false`) for anonymous users because `NULL AND …` is `NULL`. The client does `Boolean(row.is_owner)`, so it works by accident. It should be `COALESCE(..., false)`.

**Counter trigger (`update_poem_daad_count`, `20261105000000_...sql:344-360`):**

```sql
UPDATE public.poems SET daad_count = daad_count + 1 WHERE id = NEW.poem_id;
```

`poems` has 4 `TEXT` columns (`hinglish_text`, `hindi_text`, `urdu_text`, `english_translation`), each up to 4,000 chars. A row is therefore ~2–8 kB and only 1–3 rows fit per 8 kB page. Every like rewrites the **whole wide tuple** and writes a new WAL record of that size. At 50 likes/s on a viral poem: 50 × 4 kB = 200 kB/s of WAL and 50 dead tuples/s concentrated on the same page, defeating HOT and inviting bloat/autovacuum churn.

**Indexes present:** `idx_poems_shayar_uid`, `idx_poems_created_at`, `idx_poems_mood_tag`, `idx_poem_likes_poem_id`, `idx_bookmarks_shayar_uid`, `idx_comments_poem_id`, `idx_secret_khats_sender_uid`. Missing: composite keyset cursor, `(mood_tag, created_at)`, text search, `(poem_id, created_at)` on comments, `poem_likes(shayar_uid)` for "my likes", and any index on `(auth_user_id)` for `public_shayars` (there is a UNIQUE constraint, so one exists implicitly).

**RLS policies** use the same per-row `IN (SELECT …)` pattern in 9 places (`poems` INSERT/UPDATE/DELETE, `poem_likes` INSERT/DELETE, `bookmarks`, `comments` INSERT/DELETE, `secret_khats` SELECT/DELETE). Each one re-runs the `public_shayars` lookup **per candidate row**. On a 20-row update that is 20 subqueries; on a bulk operation it is thousands. The fix is a `STABLE SECURITY DEFINER` helper that the planner can cache per statement.

#### 1,000-CCU Failure Mode

- Feed p95 stays acceptable at 20 rows (25–40 ms), then degrades super-linearly as `comments` grows: the second query has **no limit**, so one viral poem with 800 comments returns 800 rows × 20 poems worst case, blowing both egress and JSON parse time on mobile.
- A viral like burst produces lock waits on one `poems` row: each transaction holds the row lock while the trigger updates, then commits. At 200 likes/s this becomes a visible queue and `daad_count` reads (`SELECT` on `poems`) can return stale values while the update is in flight.
- Cursor pagination on `created_at` alone: two poems published in the same millisecond (entirely possible with AI batch creation) cause one to be **skipped forever** or repeated. At 13 pv/s this is rare; at a launch it is guaranteed.
- `auth.uid()` invoked per row in 9 policies multiplies the per-query planning cost; with pgbouncer in transaction mode and prepared statements, this also interacts badly with plan caching.

#### Options & Trade-offs

**Feed ownership check:**

| Option | Plan shape | Cost | Verdict |
|---|---|---|---|
| `IN (SELECT … auth.uid())` (today) | hashed SubPlan, per-row probe | O(n) probes | replace |
| `LEFT JOIN LATERAL (SELECT … WHERE auth_user_id = (SELECT auth.uid())) me ON true` | one-row nested loop, `InitPlan` for uid | O(1) | **Selected** |
| `EXISTS (SELECT 1 …)` | semi-join, per-row | O(n) but index-only | acceptable fallback |
| Denormalise `is_owner` into `poems` | no join at all | stale on ownership transfer (never happens) | over-engineering |

**Counter strategy:**

| Option | Write cost | Read cost | Correctness | Verdict |
|---|---|---|---|---|
| Wide-row trigger (today) | 4 kB WAL/like, page churn | free | exact | replace |
| **Narrow `poem_stats` table + trigger** | ~50 B WAL/like, HOT-friendly | 1 join on PK | exact | **Selected** |
| Sharded counters (`+1` to one of 16 rows) | ~50 B WAL, zero contention | `SUM()` over 16 rows | exact | only if > 500 likes/s |
| Redis/Upstash counter, flush every 10 s | cheapest | 1 extra hop | eventual (10 s) | nice later, adds a dependency |
| Drop the counter, `COUNT(*)` on read | free writes | O(likes) per poem | exact | unacceptable at 1k CCU |

**Search:**

| Option | Supports | Index size | Verdict |
|---|---|---|---|
| `pg_trgm` GIN on a concatenated column | substring `ILIKE '%x%'` for Hinglish; works on Devanagari/Arabic codepoints but no stemming | large (~3–5× text) | **Selected for Hinglish** |
| `tsvector` with `simple` config | word tokens, no stemming; poor Urdu morphology | small | complementary |
| `tsvector` with `hindi`/`urdu` configs | not shipped in stock Postgres; needs extensions | — | reject |
| External (Meilisearch/Typesense) | typo tolerance, ranking, facets | ops + cost | Phase 3 |

Selected: `pg_trgm` GIN on `(hinglish_text || ' ' || COALESCE(english_translation,''))` for the feed search box, plus a generated `tsvector` on `mood_tag` for mood filtering. Client-side filtering over the already-loaded 20–36 poems stays as the instant path; server search only fires on "Search all poems" (a new explicit action, so the default feed never pays for it).

#### Selected Strategy

1. Replace per-row ownership subqueries with a `STABLE` helper + `LATERAL` join.
2. Move the counter to a narrow table; keep `poems.daad_count` as a **generated read-only mirror** for backward compatibility (or drop it after the client no longer selects it — the view selects it, so keep the view column name).
3. Add composite and partial indexes with `CONCURRENTLY`.
4. Fix pagination to `(created_at, id)` keyset with a composite cursor.
5. Cap comments per poem in the feed query at 3 (with a "view all" lazy fetch).
6. `SECURITY INVOKER` is **not** appropriate here; instead keep the owner-rights view but revoke anon SELECT on the base table (Kabir §3.4).

#### Exact Implementation Blueprint

Ship as a single migration `supabase/migrations/20261115000000_ccu1000_hardening.sql`. Full SQL in **§4**. The five statements that matter most:

```sql
-- 1. One-row ownership probe instead of a per-row IN (SELECT ...)
CREATE OR REPLACE FUNCTION public.current_shayar_uid()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT shayar_uid FROM public.public_shayars WHERE auth_user_id = (SELECT auth.uid());
$$;

-- 2. Indexed keyset cursor (built CONCURRENTLY in §4)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_poems_feed_cursor
  ON public.poems (created_at DESC, id DESC);

-- 3. Mood-scoped cursor
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_poems_mood_cursor
  ON public.poems (mood_tag, created_at DESC, id DESC);

-- 4. Comments: covered, ordered, capped reads
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_poem_created
  ON public.comments (poem_id, created_at DESC);

-- 5. Narrow counter row
CREATE TABLE IF NOT EXISTS public.poem_stats (
  poem_id uuid PRIMARY KEY REFERENCES public.poems(id) ON DELETE CASCADE,
  daad_count integer NOT NULL DEFAULT 0 CHECK (daad_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

Verification queries (run before/after, record both):

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM public.safe_poems_feed ORDER BY created_at DESC, id DESC LIMIT 21;

EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM public.safe_poems_feed
WHERE mood_tag = 'Quiet longing'
ORDER BY created_at DESC, id DESC LIMIT 21;
```

Expected: `Index Scan using idx_poems_feed_cursor`, `Buffers: shared hit < 60`, `Execution Time < 5 ms` on a warm cache. If you see `Seq Scan` or a `SubPlan` with `loops=21`, the view rewrite did not take.

---

### 3.3 👤 ZOYA — Principal Frontend Performance & Client State Architect

#### Current State

Measured facts, not opinions:

- **Entry chunk is 755.0 kB raw / 216.8 kB gzip.** Target is < 90 kB gzip. `vite.config.ts` is 18 lines and contains **no** `build.rollupOptions.output.manualChunks`.
- **TanStack Query is installed, the `QueryClientProvider` is mounted in `__root.tsx`, and there are zero `useQuery` / `useMutation` call sites.** The caching layer exists but is unused.
- **Every `/feed` mount performs 2 sequential queries**, then merges 16 local seed poems. Navigating `/` → `/feed` → `/` → `/feed` repeats both queries each time.
- **Comments are fetched for all 20 poems with no per-poem cap.**
- **`store.tsx` exposes one context object** whose identity changes on **any** state change (`{...s, set, updatePoem, clearLocalData}` memoised on `s`). Liking one poem replaces `poems` → new `s` → new context value → all 36 `PoemCard`s re-render, each running 4 script arrays through `Verse`.
- **`feed.tsx` computes the filtered list on every keystroke with no `useMemo` and no `useDeferredValue`**, and the filter concatenates 4 script arrays + tags into a lowercased string *per poem per keystroke* (line 110-116). That is the INP hot spot on mid-range Android.
- **Google Fonts is a render-blocking stylesheet** with 5 families including **Noto Nastaliq Urdu** (very large). There is no `preload` for the woff2 files, and `logo.png` is 300 kB / `logo-icon.png` is 248 kB.
- Card Studio (`studio.tsx`) is statically imported by both `/studio` and `/card-studio`, so its canvas code is in the shared graph even for readers who never open it.

What is already right: route-level chunks exist (TanStack Router splits), `store` persists only non-PII, `set`/`updatePoem` are `useCallback`-stable, and the Canvas engine is one pure draw function (good).

#### 1,000-CCU Failure Mode

The frontend does not fall over at 1,000 CCU — each client is its own island. What happens is:

1. **Amplification.** 1,000 users × 1.5 page transitions/min × 2 queries = 26 QPS of avoidable Supabase traffic and ~50 GB/month egress (§1.4C). The client is the source of the database load.
2. **Cold-start LCP.** 216.8 kB gz JS + 17 kB CSS + 560 kB PNG + fonts on a 4G mid-range phone: TTI > 4 s, LCP > 2.8 s. Google's crawl budget and AdSense-style monetisation both punish this.
3. **INP collapse on search.** Typing "tanhai" = 7 keystrokes × 36 poems × 4 script joins + `toLowerCase()` = ~1,000 string operations with garbage churn, on the main thread, while hydration is still settling.
4. **Memory.** 36 poems × 4 scripts held in context; each `updatePoem` clones the whole array. With infinite scroll to 200 poems and a translation callback per poem, the retained heap grows and mobile Safari starts reloading tabs.
5. **Waterfall.** `fetchPoems` awaits poems, *then* comments. Two RTTs serialized. On 4G that is 2 × 180 ms of pure waiting before first paint of real content — the seeds cover it visually, but the network cost is paid.

#### Options & Trade-offs

| Option | Dedupe | Stale window | Persistence | Complexity | Verdict |
|---|---|---|---|---|---|
| Module-level `fetch` promise cache | in-flight only | none | no | ~30 LOC | too weak alone |
| **TanStack Query `useInfiniteQuery`** | identical keys | `staleTime` 45 s | optional persister | ~120 LOC, already installed | **Selected** |
| SWR library | yes | yes | optional | new dep | redundant |
| Hand-rolled `useSyncExternalStore` cache | yes | yes | manual | 300 LOC + bugs | reject |
| Service Worker (Workbox) | yes | yes | yes | ops + cache invalidation risk for HTML | Phase 3 (after CDN) |

| Chunking option | Initial JS | Risk |
|---|---|---|
| No change (today) | 216.8 kB gz | — |
| **`manualChunks` vendor groups + dynamic import of Studio/AI** | **~85–95 kB gz** | chunk cycles if React is split wrongly |
| Aggressive per-route splitting only | ~150 kB gz | shared vendor still large |
| Replace TanStack Router with manual router | ~60 kB gz | rewrite, lose type-safe routes | reject |

| Context option | Re-render blast radius | Effort |
|---|---|---|
| Single context (today) | every consumer | 0 |
| **Split `StateContext` + `ActionsContext` + selector hook** | actions never re-render consumers; state changes only re-render subscribers | ~80 LOC |
| Zustand / Jotai | fine-grained selectors | new dep, rewrite of 12 files |
| `useSyncExternalStore` store | minimal, no dep | ~150 LOC |

Selected: split contexts + `React.memo(PoemCard)` + a `usePoem(id)` selector. Enough for 200 cards, no new dependency.

#### Selected Strategy

**Read path:** `useInfiniteQuery(['feed', 'anon'|'auth'], …)` with `staleTime: 45_000`, `gcTime: 600_000`, `refetchOnWindowFocus: false`, `placeholderData: keepPreviousData`, and a **single combined PostgREST query** that returns poems + top-3 comments via an embedded resource with `limit`. Cursor becomes `(created_at, id)` encoded as `base64url`.

**Write path:** optimistic like/save with rollback on error; publish inserts then prepends, without refetching page 1 (today it already prepends — keep that, but invalidate in the background).

**Rendering:** `useMemo` the filter, `useDeferredValue(search)`, `React.memo` the card, split contexts, `content-visibility: auto` on cards beyond the fold.

**Build:** vendor `manualChunks` for `react`, `tanstack`, `supabase`, `radix`, `icons`, `sonner`; lazy-import the Studio canvas engine and the AI Poet route payload; drop dead shadcn components (39 of 45 are unused — `chart.tsx`, `calendar.tsx`, `carousel.tsx`, `command.tsx`, `drawer.tsx`, `form.tsx`, `input-otp.tsx`, `resizable.tsx`, `sidebar.tsx`, `menubar.tsx`, `navigation-menu.tsx` etc. are imported by nothing except each other).

**Assets:** convert the two PNGs to AVIF/WebP at 96 px and 512 px, self-host 4 woff2 subsets (Playfair 600, Jakarta 400/600, Devanagari 400), and **lazy-load Nastaliq only when `script === 'urdu'`** with `font-display: swap` + `size-adjust` fallback to hold CLS.

#### Exact Implementation Blueprint

1. `src/lib/feed-cache.ts` — new module with the canonical cursor codec, query key, and `fetchFeedPage()` that issues **one** request:

```ts
// conceptual shape; full file in docs/upgrades/03
const KEY = (scope: "anon" | "auth", cursor: string | null) => ["feed", scope, cursor] as const;

export function useFeed(scope: "anon" | "auth") {
  return useInfiniteQuery({
    queryKey: ["feed", scope],
    queryFn: ({ pageParam }) => fetchFeedPage(pageParam),
    initialPageParam: null as FeedCursor | null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 45_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}
```

2. `queryClient` defaults in `src/router.tsx`:

```ts
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 2,
      retryDelay: (i) => Math.min(1000 * 2 ** i, 8000),
      refetchOnWindowFocus: false,
      networkMode: "offlineFirst",
    },
  },
});
```

3. `feed.tsx`: replace the `useEffect(fetchPoems)` block with `useFeed()`; replace the inline `filter` with:

```ts
const deferredQuery = useDeferredValue(search.trim().toLowerCase());
const list = useMemo(
  () => poems.filter((p) => matchFilter(p, f) && matchesQuery(p, deferredQuery)),
  [poems, f, deferredQuery]
);
```

4. `store.tsx`: split into `StoreStateContext` and `StoreActionsContext`; keep `useStore()` as a compatibility hook that consumes both, so no route needs rewriting in one go. Wrap `PoemCard` in `memo` and pass only `poem` + `script`.

5. `vite.config.ts`: add `build.rollupOptions.output.manualChunks` (exact object in `docs/upgrades/03`), `build.target: "es2020"`, `build.cssCodeSplit: true`, and `build.reportCompressedSize: true` so regressions are visible in CI.

6. Add a bundle budget check to CI: fail if any chunk exceeds 120 kB gzip or the entry exceeds 95 kB gzip. This is the only way the < 90 kB target survives future feature work.

---

### 3.4 👤 KABIR — Offensive Red Team & Zero-Trust Security Lead

#### Current State

**Good, keep it:** answers are bcrypt-hashed (`crypt(p_secret_answer, gen_salt('bf'))`), recipient identifiers are SHA-256 hashed and the plaintext column is written as `'[REDACTED]'`, `secret_khats` has no public SELECT policy, `SECURITY DEFINER` functions pin `search_path`, `is_gumnaam` is masked in the view, `private_user_vault` is owner-only, content length `CHECK` constraints exist, prompt input is XML-fenced with an anti-injection directive, and `safeJsonLd` escapes JSON-LD.

**What the red team actually found:**

**K-1 (P0) — `public_shayars.auth_user_id` is anon-readable.** `20261110000000_...sql:158-160` replaced the restrictive policy with `USING (true)` to unblock the app. The directory *view* hides `auth_user_id`, but `GET /rest/v1/public_shayars?select=*` against the **table** returns it for every poet. `auth_user_id` is the primary key of `auth.users` — a stable cross-table identifier that enables linkage and makes any future "anonymous" feature a de-anonymisation risk. Fix: column-level grants (below).

**K-2 (P0) — `is_gumnaam` masking is not a security boundary.** `poems` still has `CREATE POLICY "Poems are publicly readable" … USING (true)` and Supabase's default grants give `anon` SELECT on `public.poems`. An attacker does not need the view:

```
GET /rest/v1/poems?select=shayar_uid,takhallus,hinglish_text&is_gumnaam=eq.true
```

…returns the real `shayar_uid` for every anonymous poem. The view only protects clients that choose to use it. Fix: revoke anon SELECT on `poems`, keep the owner-rights view as the only anon read path (or make the masking a `SECURITY DEFINER` RPC and revoke the view too).

**K-3 (P0) — rate limiting collapses behind Cloudflare.** `app.set("trust proxy", 1)` trusts exactly one hop. After Cloudflare is enabled the XFF chain is `client, cloudflare-edge`; Render's proxy prepends its own address. Depending on Render's hop count, Express resolves the client IP to a **Cloudflare edge IP**. `express-rate-limit` then buckets thousands of users into ~20 keys. Result: the 12 req/10 min limit becomes a **global 12-requests-per-10-minutes-per-edge** cap. This is a total AI outage that looks like a mystery 429. Fix: `trust proxy: 2` **and** key on `CF-Connecting-IP` with validation.

**K-4 (P1) — AI endpoints are unauthenticated.** CORS is a browser control; `curl -X POST https://ek-khawaab-api.onrender.com/api/ai/shayar -d '{...}'` bypasses it entirely. Anyone can burn the Groq quota in minutes. No Turnstile, no signed token, no daily global budget.

**K-5 (P1) — `express-rate-limit` MemoryStore.** Per-process memory. The moment Render runs 2 instances (or restarts), counters reset and each instance allows a full quota. Fine at 1 instance, unacceptable at 2.

**K-6 (P1) — CSP allows `'unsafe-inline'` scripts and has no `frame-ancestors` / `X-Frame-Options`.** `/letters` renders a riddle answer form; clickjacking it into an attacker iframe is a plausible social-engineering vector. `object-src`, `base-uri`, `form-action` are unset.

**K-7 (P2) — khat unlock state is global and lockout is weaponisable.** `is_unlocked` is a single boolean on the row. The first person to guess correctly reveals the sender to **every** holder of the link, forever. Conversely, an attacker who knows the letter ID can submit 5 wrong guesses and lock the legitimate recipient out for 15 minutes, repeatedly. Also `gen_salt('bf')` defaults to cost **6**, which is weak for a 100-char secret in 2026.

**K-8 (P2) — no security headers on Render.** No `helmet`, no HSTS, no `nosniff`, `X-Powered-By: Express` leaks the stack.

**K-9 (P3) — `credentials: true` on CORS with no cookies.** Harmless today, but it means any future cookie auth must be re-audited. Keep the allowlist exact.

**K-10 (P3) — the global `X-Robots-Tag: index, follow`** applies to `/auth` and `/profile`. Not a leak (content is client-rendered), but it invites indexing of empty private shells.

#### 1,000-CCU Failure Mode

Security failures at 1,000 CCU are **queueing failures**:

- **Credential stuffing:** 1,000 CCU is enough noise to hide 50 req/min of password attempts against Supabase Auth. Supabase applies its own auth rate limits, but there is no app-level captcha or device fingerprint. The `signUpWithVault` path also does 2 client-side upserts after signup — each is an extra authenticated write that can be scripted.
- **Riddle brute force:** 5 attempts / 15 min / letter is a *per-letter* control, not a per-attacker control. 1 attacker × 10,000 letter IDs × 5 guesses = 50,000 attempts, and pgcrypto `crypt()` at cost 6 is ~1 ms, so the DB happily absorbs it. The `SELECT … FOR UPDATE` serialises per row, which protects correctness but not throughput.
- **Spam poem flood:** no per-user publish throttle exists in the client or the DB. A scripted account can insert 10 poems/s until the `content_reports` queue is meaningless and the feed is poisoned. `CHECK` constraints only bound length.
- **Quota drain:** K-4 means the attack surface is a curl loop, not a browser.
- **Leak amplification:** every additional replica/cache of the feed is another place `is_gumnaam` must be masked. Because masking lives in **one view** and the base table is open (K-2), every cache (Cloudflare, KV snapshot, localStorage) inherits an unmasked source of truth if anyone queries the table directly.

#### Options & Trade-offs

**Where to enforce gumnaam masking:**

| Option | Bypassable by direct table query | Perf | Migration risk | Verdict |
|---|---|---|---|---|
| View only (today) | **yes** | good | none | insecure |
| View + revoke anon SELECT on base table | no | good | small (client must not query `poems` as anon) | **Selected** |
| Column-level masking via RLS on `poems` | no | RLS per row, slower | high (breaks owner flows) | reject |
| Move all reads to a `SECURITY DEFINER` RPC | no | one more function layer | medium | fallback if grants are messy |
| Encrypt `shayar_uid` per poem | no | key management | high | over-engineering |

**Rate-limit placement:**

| Layer | Protects | Limit | Cost |
|---|---|---|---|
| Cloudflare WAF rate rules | L3/L4 flood, credential stuffing, `/api/*` | 60 req/min/IP general, 10 req/min/IP on `/api/ai/*` | free |
| Cloudflare Turnstile | bots on AI + signup | invisible challenge | free |
| Render per-token sliding window | API abuse after WAF | 12 / 10 min / **CF-Connecting-IP** | free |
| Render global budget breaker | cost cap | 2,000 Groq calls/day, then 503 `ai_budget_exhausted` | free |
| Supabase RPC attempt throttle | riddle brute force | 10 / hour / IP via `khat_attempts` table | 1 insert/attempt |
| DB publish throttle | poem spam | 10 poems / hour / shayar_uid | 1 count query |

All five layers are needed. Each one alone has a documented bypass (WAF: origin IP; Render: distributed IPs; DB: single account).

**Khat unlock model:**

| Option | Recipient isolation | Complexity |
|---|---|---|
| Global `is_unlocked` (today) | none | 0 |
| **Per-recipient unlock row (`khat_unlocks`)** | each recipient unlocks independently | ~40 LOC + 1 table |
| Signed recipient token in URL (no DB state) | strong, but link forwarding shares access | ~60 LOC, no revocation |
| True E2E encryption of the poem | strongest, but sender must hold a key and the product loses server-side rendering | large rewrite |

Selected: `khat_unlocks(khat_id, recipient_hash, unlocked_at)` + keep `is_unlocked` as a denormalised "anyone unlocked" flag for the sender's view. Also raise bcrypt cost to 10 and add a per-IP attempt ledger. This is a **product-visible** change (the sender still sees "unlocked"), but recipients no longer share state.

#### Selected Strategy — Defense-in-Depth Matrix

| Attack | Cloudflare | Render | Supabase | Client |
|---|---|---|---|---|
| Credential stuffing | Turnstile on `/auth`, 10/min/IP | — | Auth built-in limits + CAPTCHA hook | disable submit while pending |
| AI quota drain | 10/min/IP + bot score | 12/10 min per CF IP + daily 2k budget + JWT-or-Turnstile | — | debounce, one in-flight request |
| Riddle brute force | 30/min/IP on `/letters` | — | 10/hour/IP ledger + 5/letter + cost-10 bcrypt | disable after 5, countdown |
| Poem spam | 20/min/IP on POST | — | 10 poems/hour/shayar_uid trigger | disable publish while pending |
| Comment spam | 30/min/IP | — | 20 comments/hour/shayar_uid | 600-char cap |
| Scraping the feed | bot fight + rate rule | — | view-only grants + egress budget | — |
| Clickjacking | — | — | — | `frame-ancestors 'none'` + XFO |

#### Exact Implementation Blueprint

1. **Lock the tables (F-02, K-2).** Full SQL in §4:

```sql
REVOKE ALL ON public.poems FROM anon;
REVOKE ALL ON public.public_shayars FROM anon;
REVOKE SELECT (auth_user_id) ON public.public_shayars FROM authenticated;
GRANT SELECT (shayar_uid, takhallus, takhallus_meaning, vibe_category, created_at, updated_at, avatar_color)
  ON public.public_shayars TO authenticated;
GRANT SELECT ON public.safe_poems_feed TO anon, authenticated;
GRANT SELECT ON public.public_shayar_directory TO anon, authenticated;
```

Then verify PostgREST still satisfies the app: `poems.service.ts` uses `.from("poems").insert(...).select()` as `authenticated` — INSERT + `RETURNING` needs SELECT on the inserted columns, so keep table-level SELECT for `authenticated` but **revoke the `auth_user_id` column**. `store.tsx` selects `shayar_uid, takhallus` from `public_shayars` — covered by the column grant. `poems.service.ts` embeds `public_shayars(takhallus)` — covered.

2. **Fix proxy trust and the limiter key** in `render-api/server.mjs`:

```js
app.set("trust proxy", 2);
const clientKey = (req) =>
  req.headers["cf-connecting-ip"]?.toString().trim() ||
  req.ip ||
  req.socket.remoteAddress ||
  "unknown";
```

and pass `keyGenerator: clientKey` to `rateLimit`. Add `validate: { xForwardedForHeader: false }`.

3. **Add helmet with an API-appropriate CSP:**

```js
app.use(helmet({
  contentSecurityPolicy: false,          // API returns JSON only
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
}));
app.disable("x-powered-by");
app.use((req, res, next) => { res.setHeader("X-Request-Id", crypto.randomUUID()); next(); });
```

4. **Turnstile gate on the two AI routes** (verify `cf-turnstile-response` against `https://challenges.cloudflare.com/turnstile/v0/siteverify`, cache the verdict in the LRU for 10 min per token) plus a **signed short-lived token** issued by the site. Trade-off: one extra 80 ms hop on the first AI request per session; acceptable.

5. **Daily budget breaker:** a module-level counter + date string; at 2,000 Groq calls, return `503 {error:"ai_budget_exhausted", retryAfter}` and let the client use the curated engine. This is the only control that actually bounds cost.

6. **Harden `.htaccess` headers:** add `frame-ancestors 'none'`, `base-uri 'self'`, `object-src 'none'`, `form-action 'self'`, `X-Frame-Options: DENY`, `Cross-Origin-Resource-Policy: same-site`, and make `X-Robots-Tag` conditional (see Noor §3.8). Keep `'unsafe-inline'` for `script-src` only because TanStack hydration requires it; migrate to nonces when the framework supports it (documented trade-off, not a silent omission).

7. **Khat ledger:** `khat_attempts(id, khat_id, ip_hash, created_at)` + a `BEFORE` check inside `unlock_secret_khat_rpc` that rejects when `count(*) > 10 in 1 hour for ip_hash`. Hash the IP with the project salt — never store raw IPs.

8. **Rotate the Groq key** if it has ever been pasted into a chat, a log, or a client bundle. It must exist only in Render env vars.

---

### 3.5 👤 ROHAN — Staff AI Systems, LLM Queue & Cost-Optimization Engineer

#### Current State

`render-api/server.mjs` (429 lines) is a competent single-file Express service:

- Zod validation on both endpoints, 1,000-char situation, 24 seeds, 6 phrases.
- 12 s `AbortController` timeout per request.
- `express-rate-limit` 12 / 10 min, shared instance across both AI routes.
- Prompt-injection defence via `<user_supplied_data>` fences + explicit directive.
- Rich structured output (4 scripts, alternatives, continuations, validation).

What is missing is everything that makes an LLM endpoint survive a crowd: **no cache, no concurrency bound, no queue, no token accounting, no circuit breaker, no fallback model routing, no budget cap, no keep-alive, and no request/response logging that could be used for a cost dashboard.**

There is also a real consistency bug: `.env.example` and `translateShayariServerFn` default to `openai/gpt-oss-120b`, while `render.yaml` and `server.mjs` default to `llama-3.3-70b-versatile`. Two different models, two different token budgets, two different output qualities, depending on which path handles the request.

And the **write-once** requirement is not met: `createPoem` writes the source lines into `hinglish_text`, `hindi_text`, and `urdu_text` (lines 200-202), then a browser-initiated job overwrites them. If the tab closes, the poem keeps Roman text in the Devanagari and Nastaliq columns forever.

#### 1,000-CCU Failure Mode

Numbers from §1.4E: steady state 17 RPM, launch burst 50 concurrent, Groq 70B free tier ~30 RPM / ~12k TPM, each request ~2.4k tokens → **token budget supports ~5 RPM**.

The failure is not a crash. It is a **cascade of 429s**:

1. 50 requests arrive within 2 s. Express accepts all 50 (event loop is idle — it's all I/O wait).
2. 50 parallel `fetch()` calls to Groq. Groq accepts ~5, rejects 45 with 429.
3. The client sees `500` (the catch block maps everything to 500, losing the 429 semantics), waits, retries — because there is no `Retry-After` handling.
4. Retries amplify: 45 → 90 → 180. The quota is gone for the next hour.
5. Meanwhile each request holds a socket for 12 s. 50 sockets is fine for Express, but 500 is not (Render free has a connection ceiling and a 512 MB container).
6. Translation requests share the same limiter, so a poem-publish burst starves the AI Poet, and vice versa. They have completely different urgency and cacheability and should not share a bucket.

Secondary failure: **cold start.** Free Render sleeps after 15 min idle. The first AI request after a quiet period waits 30–60 s, which exceeds the 12 s client abort in some paths, producing a "timeout" error even though generation would have succeeded.

#### Options & Trade-offs

**Concurrency control:**

| Option | Protects Groq | Tail latency | Complexity |
|---|---|---|---|
| Unbounded (today) | no | 429 storm | 0 |
| `p-limit(4)` FIFO queue, reject at 30 | yes | good up to 30, then 503 | low |
| Token bucket on RPM + TPM | yes, both dimensions | best | medium |
| **p-limit(4) + token bucket + queue timeout** | yes | bounded, honest 503 | medium | **Selected** |
| External queue (SQS/Upstash QStash) | yes | survives restarts | high, new dependency | Phase 3 |

**Cache key:**

| Key | Hit rate | Correctness risk |
|---|---|---|
| None | 0% | — |
| Hash of raw body | low (field order/whitespace) | none |
| **Hash of normalised semantic fields** | 35–60% generation, 80–95% translation | low if normalisation is documented | **Selected** |
| Hash + user id | lower | no cross-user reuse | reject |

**Model routing:**

| Route | Model | Why |
|---|---|---|
| Generation (poem) | `llama-3.3-70b-versatile` | quality matters, low volume |
| Translation | `openai/gpt-oss-20b` or `llama-3.1-8b-instant` | mechanical, high volume, 3–5× cheaper/faster |
| Fallback on 429 | 8b-instant | graceful quality drop beats an error |

Selected: two-tier routing with automatic downgrade. Trade-off: occasional weaker translations; mitigated by validating line counts and falling back to the source language for any empty array.

#### Selected Strategy

```
request
  │
  ├─ validate (zod) ───────────────► 400
  ├─ cache lookup (SHA-256) ───────► 200 {cached:true, ms:<2}
  ├─ singleflight (same key) ──────► share one upstream call
  ├─ queue acquire (max 24 waiting) ► 503 busy + Retry-After (if full)
  ├─ token bucket reserve(RPM, TPM) ► 503 + Retry-After (if empty)
  ├─ breaker state? ───────────────► 503 degraded (if OPEN)
  ├─ Groq fetch (7 s soft / 12 s hard)
  │    ├─ 200 → validate JSON → store in LRU (6 h) → 200
  │    ├─ 429 → Retry-After, decrement breaker, try 8b once
  │    └─ 5xx → breaker tick → fallback model once
  └─ all failed ───────────────────► 200 {degraded:true, curated:true}
```

The last line is the important product decision: **never return 500 for a poetic failure**. Return a curated poem with `degraded: true` so the UI can say "From our curated mehfil while the muses rest" instead of showing an error toast. The client already has `composeFallbackPoem`; moving the fallback server-side removes the 12 s abort from the user's critical path.

#### Exact Implementation Blueprint

Full module in **§5**. The integration points in `server.mjs`:

```js
import { createAiPipeline } from "./lib/ai-pipeline.mjs";
const ai = createAiPipeline({ groqKey: process.env.GROQ_API_KEY, dailyBudget: 2000 });

// replace the body of both route handlers with:
const result = await ai.run({
  kind: "shayar",              // or "translate"
  payload: data,
  requestId: req.id,
  clientKey: clientKey(req),
});
return res.status(result.status).set(result.headers).json(result.body);
```

`ai-pipeline.mjs` owns: `sha256Canonical()`, `LruTtlCache`, `SingleFlight`, `TokenBucket`, `Gate`, `Breaker`, `Budget`, `callGroq()`, `validatePoem()`, `validateTranslation()`.

Also:
- Set `max_tokens: 900` for generation and `700` for translation (the current 1,600/1,200 is 40% waste on couplets).
- Keep `temperature: 0.72` for generation, `0.25` for translation.
- Return `Retry-After` in seconds on 429/503.
- Log one JSON line per request: `{ts, id, kind, cache, queue_ms, upstream_ms, tokens_in, tokens_out, status}`. This is the only way to know the real hit rate.

**Write-once multi-script persistence** (the other half of Rohan's mandate):

1. Add `poems.translation_status` enum (`pending | processing | complete | failed`) and `poems.source_script`.
2. `createPoem()` inserts the source text in **one** column and `NULL` in the other two, with `translation_status='pending'`. The view coalesces `NULL` to the source text so readers never see an empty card.
3. A `pg_cron` job (or Render cron) selects `pending` rows every 2 minutes, calls `/internal/translate-batch` with a shared secret, and writes all three scripts in one `UPDATE … SET hinglish_text=…, hindi_text=…, urdu_text=…, translation_status='complete'`.
4. Readers never trigger AI. Ever. Script switching is a pure array index on data already in the payload.
5. Backfill: a one-off script marks existing rows `complete` where all three columns differ, `failed` where they are identical.

Trade-off: publish latency for Hindi/Urdu readers is up to 2 minutes. Mitigation: the author sees an optimistic "translating…" chip, and the feed shows the source script until the job lands. That is strictly better than a permanently wrong-script poem.

**Keep-alive:** if staying on free tier, ping `GET /health` every 5 minutes from an external monitor (cron-job.org / UptimeRobot / Cloudflare Worker cron). Document that this consumes the 750 free instance-hours and does **not** prevent platform restarts. The honest recommendation is Render Starter for production; the ping is a stopgap.

---

### 3.6 👤 SANA — Real-Time WebSockets & Audio Synchronization Engineer

#### Current State

**No realtime code exists in this repository.** `grep -r "channel(|postgres_changes|broadcast|realtime" src/` → 0 matches. `/listen-together` does not exist. There is no YouTube IFrame wrapper, no audio element, no room code, no presence.

`supabase-js` is created with default options, which means `realtime` is enabled but **no socket is opened until `.channel().subscribe()`**. So the current connection count is 0, and the free-tier 200-connection quota is entirely unspent.

This is the best possible starting position: the constraint can be designed in.

#### 1,000-CCU Failure Mode

If the feature ships the way such features usually ship, it fails in three stages:

1. **The global socket.** Someone puts `supabase.channel('presence').subscribe()` in `__root.tsx` or `StoreProvider` "so we know who's online". At 1,000 CCU that is 1,000 sockets. Supabase Free allows 200 concurrent; user 201 gets `CLOSED` / `channel error: too many connections`, and because the client retries with backoff, the reconnect storm makes it worse for everyone.
2. **The broadcast flood.** A scrubber drag emits a `timeupdate`/`input` event per pixel. 60 events/s × 2 participants is 120 messages/s per room. Supabase broadcast has a per-channel message rate limit (single-digit hundreds/sec on paid tiers, lower on free); the channel disconnects, the UI freezes mid-song, and the user blames the app.
3. **The mobile handoff.** Wi-Fi → 5G drops the TCP socket. Without a `reconnect` + presence resync, the guest keeps playing locally while the host pauses; the two are now 20 s apart and never converge because there is no clock-offset model, only "send position on change".

#### Options & Trade-offs

| Transport | Cost | Latency | Ops | Verdict |
|---|---|---|---|---|
| Supabase Realtime broadcast + presence | included, 200/500 conns | ~80–150 ms | none | **Selected for v1** |
| Self-hosted WebSocket on Render | free tier 1 instance | ~40 ms | sticky sessions, scaling | reject until > 500 rooms |
| WebRTC data channel | free, P2P | ~20 ms | NAT traversal, no server state | Phase 3 (best for 2-person audio) |
| Polling Postgres every 1 s | cheap | 1 s | terrible UX | reject |
| PartyKit / Ably / Pusher | $ | ~50 ms | external | fallback if quota is hit |

| Sync strategy | Drift | Complexity |
|---|---|---|
| Broadcast position on every change | unbounded between events | low |
| **Host authority + NTP-style offset + drift correction** | < 250 ms | medium | **Selected** |
| Server-authoritative clock (DB `now()`) | < 100 ms | high (extra RTT per sync) | Phase 3 |
| WebRTC with RTCP | < 30 ms | high | Phase 3 |

#### Selected Strategy

**Connection budget:**

| User class | Sockets | At 1,000 CCU |
|---|---|---|
| Passive readers (feed, dictionary, studio) | **0** | 0 |
| AI poet users | 0 | 0 |
| Active room participants | 1 per tab | 20 (10 rooms) |
| Quota (free / pro) | 200 / 500 | headroom 10× / 25× |

**Rules:**
1. Sockets are created **only** inside the `/listen-together` route component, in a `useEffect` that runs after the room code is validated.
2. `visibilitychange` → hidden for 60 s → downgrade to receive-only (unsubscribe from broadcast? No — keep the channel but stop sending; unsubscribing/re-subscribing costs a handshake). Hidden for **10 minutes** → `removeChannel()` and show "Reconnect" on return.
3. `pagehide` / `beforeunload` → `removeChannel()` (best effort).
4. Two channels maximum per room: `room:<code>:presence` and `room:<code>:sync`. Never `postgres_changes` for playback — it costs a DB read per event and adds 100–300 ms.
5. Room codes are 6 chars from an unambiguous alphabet (`23456789ABCDEFGHJKLMNPQRSTUVWXYZ`), created client-side, valid for 24 h.

**Protocol:**

```
Presence payload (join + every 20 s heartbeat):
  { uid, role: "host"|"guest", t0: Date.now(), pos: seconds, playing: bool, rate: 1 }

Sync message (host → guest, ≤ 4/s):
  { t: "sync", seq, pos, t0, playing, rate, trackId }

Guest apply:
  rtt    = now - sentAt              (from a ping/pong pair)
  offset = hostT0 - (guestNow - rtt/2)
  target = pos + (guestNow + offset - t0)/1000
  drift  = audio.currentTime - target
  if |drift| > 0.25  → audio.currentTime = target        (hard seek)
  else               → audio.playbackRate = clamp(1 - drift/2, 0.97, 1.03)
  if playing !== audio.paused → play()/pause() with a 120 ms fade
```

**Debouncing:** scrubber `input` events are coalesced with `requestAnimationFrame` + a 250 ms trailing throttle, hard-capped at 4 messages/s. On `pointerup`, one final authoritative `seek` message is sent immediately (leading edge) so the guest lands on the exact position.

**Reconnect:** `channel.on("system", …)` handles `CHANNEL_ERROR` / `TIMED_OUT`; exponential backoff 500 ms → 8 s with jitter, max 6 attempts; on `SUBSCRIBED`, emit `request_state` and let the host reply with a fresh `sync`. On `online` / `visibilitychange → visible`, force a resync. Never trust local `currentTime` after a reconnect.

#### Exact Implementation Blueprint

1. Add a `useRoomChannel(code, role)` hook that owns the lifecycle. It must be the **only** place `supabase.channel` is called (enforce with an ESLint `no-restricted-syntax` rule).
2. Add `src/routes/listen-together.tsx` with `validateSearch({ room })`; render a lobby (create/join) when no room, and the player when a room is present.
3. Add a connection guard: before subscribing, `fetch('/realtime-probe')` (or a tiny `/api/rooms/capacity` endpoint) that returns `{ ok, active }`. If the project is at > 80% of quota, show "Rooms are full — try again in a few minutes" instead of opening a doomed socket. This is the difference between graceful degradation and a reconnect storm.
4. Add `removeChannel` in `useEffect` cleanup **and** on `pagehide`; assert in dev that `supabase.getChannels().length === 0` after unmount.
5. Instrument: `rooms_active`, `socket_open_total`, `channel_errors_total`, `sync_drift_ms` histogram. Without the drift histogram you cannot tune the 250 ms threshold.
6. Do **not** enable `postgres_changes` on `poems`/`poem_likes` to make the feed live. At 1,000 CCU that is 1,000 sockets + a DB read per insert. If live feed is a product requirement later, use a 30 s SWR poll, not a socket.

---

### 3.7 👤 DEV — Canvas Graphics & Media Pipeline Engineer

#### Current State

`src/routes/studio.tsx` has one `draw()` function (lines 47-81) that is genuinely well-factored: a single canvas, one paint path, `THEMES` as literal hex (correct for canvas), `RATIOS` = 1080×1920 / 1080×1080 / 1080×1350, script-aware font selection, `x.direction = "rtl"` for Urdu, line-height 2.2 for Nastaliq, and a `document.fonts.load(...).then(() => document.fonts.ready)` gate.

Important correction to a common assumption: **the canvas is *not* multiplied by `devicePixelRatio`.** `c.width = W` where `W = 1080`, and CSS scales it down with `maxHeight`. So the exported PNG is exactly 1080 px wide and the backing store is ~8.3 MB (1080×1920×4). The `dpr × 3 = 3240×5760 = 74 MB` crash scenario **does not exist today**. Dev's mandate must be read as *prevent the future regression* and *fix the real memory bugs that do exist*, not as "clamp something that is already clamped".

The real bugs:

- **D-1 (P2)** `download()` creates an object URL and never revokes it (lines 114-118). Every export leaks 1–4 MB until navigation. Five exports on a 2 GB Android is 20 MB of dead blobs; combined with a canvas and fonts, that is enough for a tab reload.
- **D-2 (P2)** `toBlob` can invoke its callback with `null` (Safari under memory pressure, or a detached canvas). The current code silently does nothing — the user clicks Download and nothing happens, with no error.
- **D-3 (P2)** No auto-fit. `wrapped` is computed from `maxW` only; a long unbroken word overflows horizontally, and 8+ wrapped lines at size 110 overflow vertically. There is no clamp on total block height.
- **D-4 (P2)** Font gate has no timeout and no verification. If `document.fonts.load()` rejects (offline, blocked Google Fonts), the promise chain never paints, leaving the canvas blank. `document.fonts.check('64px "Noto Nastaliq Urdu"')` is never used to confirm the face actually loaded before rasterising.
- **D-5 (P3)** Word wrapping splits on `" "`. Urdu/Devanagari need grapheme-cluster-safe segmentation; `Intl.Segmenter` is the correct primitive. A space-split also breaks on non-breaking spaces and zero-width joiners used in Nastaliq.
- **D-6 (P2)** "Post to Feed" (lines 119-123) writes to `useStore` **only**. It is not persisted to Postgres, so the poem disappears on reload and never reaches other users. This is the single most product-damaging bug in the file: it looks like a publish and behaves like a scratchpad.
- **D-7 (P3)** The preview canvas re-renders on every keystroke (`text` is in the effect deps) at 1080×1920. On a mid-range phone that is a full 2-megapixel repaint per character. It needs a 200–300 ms debounce and a lower-resolution preview (e.g. 540×960) with export done at 1080 on demand.

#### 1,000-CCU Failure Mode

Card Studio is 8% of users = 80 concurrent clients. It generates **zero** server load, so it cannot hurt the 1,000-CCU budget. The failure is per-device:

- 80 users × 3 exports each = 240 leaked blobs per session wave; on low-RAM Android WebView this manifests as "page reloaded" and a lost draft.
- On Safari iOS, a 1080×1920 canvas plus 5 web fonts plus the Blob copy transiently needs ~24 MB; add the React app and images and a 1 GB device starts evicting tabs.
- Because fonts come from `fonts.googleapis.com`, an Indian ISP hiccup or a blocked request leaves the canvas blank with no error — support tickets that say "download button is broken".

#### Options & Trade-offs

| Export strategy | Peak memory | Quality | Complexity |
|---|---|---|---|
| Canvas at 1080 (today) | ~8.3 MB + blob | 1080p | low |
| Canvas at 2× (2160) | ~33 MB | 4K, unnecessary for IG | reject |
| **1080 canvas + rAF-throttled 540 preview** | ~2 MB preview, 8.3 MB on export | same export | low | **Selected** |
| SVG → canvas | vector, small | font embedding issues in Urdu | reject |
| Server-side render (Satori/Resvg) | 0 client | consistent, but adds Render load + font hosting | Phase 3 (for share cards only) |

| Post-to-Feed | Data integrity | Effort |
|---|---|---|
| Local store only (today) | **lost on reload** | 0 |
| Insert into `poems` with status pending | durable, consistent with feed | ~20 LOC | **Selected** |
| Navigate to compose with prefilled text | no auto-publish, user confirms | ~10 LOC | fallback |

#### Selected Strategy

1. Keep the single `draw()` function as the only paint path (it is the reason preview and PNG match — do not fork it).
2. Introduce `drawAtScale(ctx, options, scale)` so preview renders at 0.5× while export renders at 1×, with identical geometry.
3. Always `revokeObjectURL` in a `finally`/`setTimeout(…, 0)` after `a.click()`.
4. Wrap export in `try/catch` with a `toDataURL()` fallback and a visible toast on failure.
5. Auto-fit: compute `wrapped`, then shrink `size` in a loop (`while (blockHeight > H - 2*pad && size > 28) size -= 2`) before painting.
6. Segment with `Intl.Segmenter("ur", { granularity: "word" })` when available; fall back to space split.
7. Gate on `await Promise.race([document.fonts.ready, timeout(1500)])` and verify with `document.fonts.check(...)`; if the face is missing, render in the fallback and show a non-blocking notice rather than a blank card.
8. Make "Post to Feed" call `createPoem()` and only navigate on success.

#### Exact Implementation Blueprint

```ts
// preview debounce
const deferredText = useDeferredValue(text);
useEffect(() => {
  const id = setTimeout(() => paint(previewRef.current, { ...opts, scale: 0.5 }), 220);
  return () => clearTimeout(id);
}, [ratio, theme, deferredText, sign, id, showId, size, align, script]);

// export
async function exportPng() {
  const canvas = exportRef.current!;
  paint(canvas, { ...opts, scale: 1 });                 // 1080-wide backing store
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  if (!blob) { toast.error("Could not export on this device. Try a smaller size."); return; }
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url; a.download = `ekkhwaab-${ratio.replace(":", "x")}.png`;
    a.click();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
```

Also: release the export canvas after use (`canvas.width = canvas.height = 1`) on low-end devices, and add `willReadFrequently: false`/`alpha: false` to `getContext` to halve backing-store memory for opaque cards.

Acceptance test: 10 consecutive exports on a 2 GB Android emulator must show flat memory in Chrome DevTools (no staircase), and a forced offline font failure must still produce a readable PNG.

---

### 3.8 👤 NOOR — Technical SEO, Programmatic Content & Edge Caching Strategist

#### Current State

- `scripts/generate-sitemap.ts` emits **66 URLs**: 11 core + 4 topics + 16 seed poems + 35 lughat words. Every URL gets `lastmod = today` on every build.
- `scripts/prerender-seo.mjs` cleans `dist/`, copies `.output/public`, then renders 66 routes through the Nitro server entry with a Googlebot UA and writes `dist/<route>/index.html`.
- `robots.txt` allows everything except `/private-vault` and `/api/`, and points at `https://ekkhwaab.in/sitemap.xml`.
- `.htaccess` sets `X-Robots-Tag: index, follow` **globally**, including `/auth`, `/profile`, `/letters`.
- `/explore` canonicalises to `/feed` (good) but `/studio` and `/card-studio` both self-canonicalise (duplicate). `/secret-letters` and `/letters` both self-canonicalise (duplicate).
- No `poems.slug` column. `/poetry/$slug` resolves only against the local `POEMS` array, so **user-published poems are invisible to search engines**.
- The prerendered `/feed/index.html` is 151.9 kB because it inlines all 16 seed poems — good for LCP, but it means the HTML Googlebot sees is a *static snapshot* that never includes new poems.
- Google Fonts is a single render-blocking request for 5 families. Nastaliq is the heaviest and is loaded even for Hinglish readers.
- One stray file has a space in its name (`googleb15237dc8951269c .html`) and there are three site-verification HTML files, two of which are duplicates.

#### 1,000-CCU Failure Mode

SEO does not fail at 1,000 CCU; it fails *because of* the architecture that survives 1,000 CCU:

- **Crawl budget waste:** every unknown URL returns `200` with the SPA shell (`.htaccess` rule 5). Googlebot discovers infinite soft-404s through shared links and burns budget on them.
- **Stale index:** the sitemap says "daily" for 66 URLs but their content only changes at build time. Google learns that `lastmod` is noise and starts ignoring it — including for the pages that *do* change.
- **Invisible UGC:** 100% of user poems are unindexed, so the product's growth loop (poem → share → search → new user) is broken at the last step.
- **Duplicate canonicals:** `/studio` vs `/card-studio` and `/letters` vs `/secret-letters` split link equity.
- **CWV:** LCP is dominated by the render-blocking font stylesheet + 300 kB logo; CLS risk is concentrated in the Urdu toggle, where Nastaliq's tall metrics swap in after layout.

#### Options & Trade-offs

**Dynamic poem indexing:**

| Option | Indexable UGC | Freshness | Ops | Verdict |
|---|---|---|---|---|
| Rebuild + redeploy on every publish | yes | minutes | CI on every write, impossible | reject |
| Client-rendered `/poetry/:slug` + dynamic sitemap | partial (Google renders JS) | fast | low | **Selected v1** |
| **Cloudflare Worker SEO shell** for `/poetry/*` | yes (real HTML + meta + JSON-LD) | 5 min cache | medium | **Selected v1.5** |
| SSR the feed on Render | yes | instant | shares AI instance, cold start risk | reject |
| Prerender top 500 nightly via GitHub Action | yes for top 500 | 24 h | moderate | **Phase 2** |
| Next/Remix migration with ISR | best | seconds | rewrite | reject |

**Sitemap at scale:**

| Option | Limit | Cache | Complexity |
|---|---|---|---|
| One static `sitemap.xml` (today) | 50k URLs | edge | 0 |
| `sitemap-index.xml` + `/sitemap-static.xml` + `/sitemap-poems-1.xml` (1k each) | unlimited | edge | low | **Selected** |
| Worker-generated on demand | unlimited | KV 1 h | medium | Phase 2 |

#### Selected Strategy

**Hybrid static + dynamic:**

```
/sitemap.xml                  → sitemap index (5 lines)
  /sitemap-static.xml         → 11 core + 4 topics        (build time)
  /sitemap-poems.xml          → 16 seed poems             (build time)
  /sitemap-lughat.xml         → 35 words                  (build time)
  /sitemap-ugc-1.xml …        → published poems, 1k/page  (Worker, 1 h KV cache)

/poetry/:slug
  → Cloudflare Worker checks KV "poem:<slug>" (5 min)
  → miss: PostgREST GET /poems?slug=eq.<slug>&select=...
  → injects <title>, <meta description>, canonical, OG, JSON-LD CreativeWork
    into the static shell (string replacement, no rendering framework)
  → returns HTML; KV set 300 s

/feed
  → static shell + client hydration (unchanged); no per-user SSR
```

**Crawl hygiene:** 410/404 for unknown `/poetry/*` and `/dictionary/*` (do not SPA-fallback them), `noindex` on `/auth`, `/profile`, `/letters`, `/secret-letters`, conditional `X-Robots-Tag`, per-URL real `lastmod` (`updated_at` for poems, commit date for static pages), and `changefreq` removed entirely (Google ignores it; keeping it is noise).

**Core Web Vitals plan:**

| Metric | Current risk | Fix |
|---|---|---|
| LCP | font stylesheet blocks render; 300 kB logo | self-host + preload 2 woff2; AVIF logo 512 px (≈ 24 kB); `<link rel=preload>` hero text font |
| CLS | Nastaliq swap | `size-adjust` + `ascent-override` on the Urdu fallback face; reserve line-height 2.2 |
| INP | search filter on every keystroke | `useDeferredValue` + `useMemo` (Zoya §3.3) |
| TBT | 216.8 kB gz entry | `manualChunks` + lazy Studio (Zoya) |
| Font bytes | 5 families loaded always | load Nastaliq only when `script === "urdu"`; `font-display: swap` |

#### Exact Implementation Blueprint

1. **Add `poems.slug`** (nullable, unique, generated on insert by a trigger: `lower(regexp_replace(title_or_first_line, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(id::text,1,6)`). For Hinglish poems the first line is Latin, so slugs are clean ASCII. For Hindi/Urdu-only poems, fall back to `ek-khawaab-<shortid>`.
2. **Extend `generate-sitemap.ts`** into a sitemap-index writer; keep build-time entries, add an empty `/sitemap-ugc-1.xml` placeholder so the index is valid before the Worker exists.
3. **Cloudflare Worker** (`ekkhwaab-seo`, 1 route: `ekkhwaab.in/poetry/*`, `ekkhwaab.in/sitemap-ugc-*.xml`):
   - On poem route, fetch `https://<proj>.supabase.co/rest/v1/poems?select=slug,hinglish_text,hindi_text,mood_tag,created_at,updated_at,shayar_uid&slug=eq.<slug>` with the **service key in a Worker secret**, never in the browser.
   - Respect `is_gumnaam` (mask author) — the Worker must not become a new leak path (Kabir review required before deploy).
   - Replace the shell's `<title>`, description, canonical, OG, and inject `CreativeWork` JSON-LD. Cache 300 s, `stale-while-revalidate=3600`.
4. **`.htaccess`:** return 404 for `/poetry/*` when the file does not exist **and** the Worker is bypassed (defence in depth), add `Disallow: /auth`, `/profile`, `/letters`, `/secret-letters` to `robots.txt`, and make `X-Robots-Tag` opt-in per path.
5. **Canonicalise duplicates:** `/card-studio` → 301 `/studio`; `/secret-letters` → keep (it is the marketing name) and canonicalise `/letters` → `/secret-letters`. Remove the loser from the sitemap. Do **not** delete the routes — inbound links exist.
6. **Kill `lastmod` noise:** static pages use the last git commit date of their file (available at build time via `git log -1 --format=%cI -- <file>`); poems use `updated_at`; lughat uses the data file's mtime.
7. **Fonts:** move to `public/fonts/*.woff2`, subset with `glyphhanger` or `fonttools`, preload `Playfair-600` and `Jakarta-400`, and load Nastaliq via a `<link media="print" onload>` swap only when the reader selects Urdu. Verify with Lighthouse mobile: LCP < 1.8 s, CLS < 0.02.

---

### 3.9 👤 RHEA — Principal SRE, Observability & Chaos/Load-Testing Lead

#### Current State

- **No metrics, no traces, no error aggregation.** Errors go to `console.error` and `reportLovableError`; Render logs are ephemeral on free tier.
- **One route-level error boundary:** the root `errorComponent` in `__root.tsx`. Because it is the *root*, a throw inside `/feed` replaces the entire root component — including `TopBar`, `Footer`, and `BottomNav` — with a bare "This page didn't load". That is a white-screen-equivalent for a non-critical failure.
- **`/health` exists** on Render and is wired to `healthCheckPath`, but returns only `{status:"ok"}` — no version, no dependency state, no readiness.
- **No load test exists.** No `k6`, no autocannon, no artillery.
- **Client fallbacks exist but are silent:** `fetchPoems` returns seeds on error; `requestShayariGeneration` returns the curated poem; neither surfaces a "degraded" state to the user, so failures look like normal operation and never get reported.
- **No request IDs** across the Hostinger → Render boundary, so a user report cannot be correlated with a log line.

#### 1,000-CCU Failure Mode

The SRE failure mode is **not knowing which dependency is down**:

- Supabase latency rises to 2 s. The feed still renders (seeds) but users think the product is empty because no poem from the DB appears; no alert fires.
- Render restarts. AI requests time out at 12 s, then the client falls back to curated poems; the only signal is a console warning in a user's browser.
- Groq 429s. The UI shows a generic error toast; the team learns about it from a tweet.
- A bad deploy ships a broken `/feed` chunk. The root boundary blanks the site for everyone with a cached `index.html` referencing a missing chunk, until the CDN TTL expires.

And without a load test, none of the numbers in §1.4 are verified. They are a model. A model that has not been tested is a hypothesis.

#### Options & Trade-offs

| Load tool | Protocol | Scripting | Cloud | Verdict |
|---|---|---|---|---|
| **k6** | HTTP/1.1, HTTP/2, WS | JS, thresholds, scenarios | Grafana Cloud free tier | **Selected** |
| autocannon | HTTP | JS | no | good for micro-benchmarks only |
| Artillery | HTTP, WS, socket.io | YAML | yes | heavier config |
| Locust | HTTP | Python | yes | needs a runner |
| Playwright + workers | real browser | TS | no | measures CWV, not throughput | complementary |

| Error boundary scope | Blast radius | Effort |
|---|---|---|
| Root only (today) | whole shell | 0 |
| **Root + per-route `errorComponent`** | one route's `<Outlet/>` | ~10 LOC/route |
| Per-widget `<ErrorBoundary>` | one card | ~5 LOC/widget | selected for `PoemCard` + AI panel |

#### Selected Strategy

**Three signals, minimum viable observability:**

1. **Structured logs** (JSON one-liners) from Render with `request_id`, `kind`, `cache`, `queue_ms`, `upstream_ms`, `status`.
2. **Synthetic checks** every 60 s from 3 regions: `GET /` (must be 200 + contain "Ek Khwaab"), `GET /feed` (must be 200), `GET https://ek-khawaab-api.onrender.com/health` (must be 200 in < 2 s), and a **read-only** Supabase query (`select id from safe_poems_feed limit 1`).
3. **Client error beacon** to a Cloudflare Worker or Sentry free tier: `window.onerror` + `unhandledrejection` + route boundary catches, sampled at 10%, with route name and app version only (no poem text, no user id).

**Degradation matrix** (this is the product contract):

| Dependency | Failure | UI behaviour | Data shown | User message |
|---|---|---|---|---|
| Supabase read | timeout > 3 s / 5xx | feed renders seed corpus | 16 curated poems | subtle "Showing curated mehfil" chip |
| Supabase write (like/save) | error | optimistic rollback | previous state | toast "Could not save — try again" |
| Supabase Auth | down | browse-only mode | public pages | banner "Sign-in temporarily unavailable" |
| Render | asleep / 5xx | AI panel switches to curated engine | `composeFallbackPoem` | "From our curated mehfil" |
| Groq | 429 / 5xx | same as above, after 1 fast retry | cached or curated | "The muses are busy — here's a verse from our archive" |
| Realtime | channel error | playback pauses, "Reconnecting…" | last known position | auto-retry ×6 then manual |
| Card export | `toBlob` null | no navigation, canvas intact | preview | "Export failed on this device" |
| Fonts CDN | blocked | fallback serif, card still exports | layout with fallback | no message (silent, correct) |

**Circuit breaker (client-side, per dependency):** 5 failures in 60 s → open for 30 s → half-open with one probe. Implemented as a tiny module around `fetch` for the Render base URL only. Do not put Supabase behind it (the seeds fallback is already the breaker).

#### Exact Implementation Blueprint

1. **`/health` → `/health` + `/ready`:**

```js
app.get("/health", (_, res) => res.json({ status: "ok", uptime: process.uptime(), version: process.env.RENDER_GIT_COMMIT?.slice(0,7) ?? "dev" }));
app.get("/ready", async (_, res) => {
  const groq = await pingGroq();                 // HEAD /openai/v1/models, 1.5 s budget
  const status = groq.ok ? 200 : 503;
  res.status(status).json({ ready: groq.ok, groq: groq.ms, cache: ai.stats(), breaker: ai.breakerState() });
});
```

2. **Route-level error boundaries** — add to each heavy route:

```tsx
export const Route = createFileRoute("/feed")({
  component: Feed,
  errorComponent: ({ error, reset }) => <RouteFallback title="The mehfil could not load" error={error} onRetry={reset} />,
  pendingComponent: () => <FeedSkeleton />,
});
```

`RouteFallback` must render **inside** the shell (it replaces only the route's `<Outlet/>`), keep `TopBar`/`Footer`, and offer "Retry" + "Back to Home". This alone removes the white-screen class of failure (F-12).

3. **`k6` suite** — full runnable script in **§6**, with four scenarios (`readers`, `browsers`, `creators`, `ai`) and hard thresholds: `http_req_failed < 1%`, `http_req_duration{p95} < 800 ms` for HTML, `< 150 ms` for the feed API, `checks > 99%`. AI scenario runs against `/api/ai/shayar?mock=1` or a cached payload set — **never** live Groq (see §6.4).

4. **Deploy guard:** GitHub Action runs `npm ci && npm run build && npm test`, asserts the bundle budget, then uploads `dist/` over FTPS/SFTP with `--delete` but **excluding** `dist/ai-poet.zip` (delete the stale artifact from the build output first). Zero-downtime on Hostinger is achieved by uploading to `public_html_new/` and atomically swapping the symlink, or by uploading assets first (hashed names are additive) and HTML last.

5. **Rollback:** keep the previous `dist/` as `dist.prev` on the server; rollback = swap back. Target < 60 s.

---

### 3.10 👤 ARJUN — Product Systems & Literary UX Flow Director

#### Current State — the journey as it actually exists

```
Landing (/)                         ← strong: hero, featured couplets, JSON-LD
   │  [Start Reading] → /feed
   │  [Find your pen name] → /auth?mode=signup
   ▼
Takhallus onboarding (/auth)        ← 2-tab signup/signin, dual-vault copy, pen-name preview
   │  success → nav("/feed")
   ▼
Explore Feed (/feed)                ← mood pills, search, script switch, compose drawer
   │  card → /poetry/:slug
   │  card → "Design card" → /studio   (state via store.studio: lines + penName)
   │  card → comments (inline)
   ▼
AI Poet (/ai-poet)                  ← seeds, situation, style, mood; 3 modes
   │  [Send to Studio] → nav("/studio") with store.studio   ✅ works (line 750)
   │  [Post to feed]  → nav("/feed")                        ✅ works (line 306)
   │  [Send as Secret Letter] → ✗ DOES NOT EXIST
   ▼
Card Studio (/studio)               ← 3 ratios, 6 themes, auto-download 1080p
   │  [Post to Feed] → local store only                     ✗ F-16 (data loss)
   │  [Download] → PNG                                      ✅ but leaks blobs (D-1)
   │  [Send as Letter] → ✗ DOES NOT EXIST
   ▼
Secret Letters (/letters)           ← create khat (poem + 2 clues + answer) or unlock by id
   │  [Share link] → /letters?id=…                          ✅
   │  [Listen together] → ✗ DOES NOT EXIST
   ▼
Profile (/profile)                  ← vault fields (pen name only on client), liked, saved
```

Two entire modules from the product vision — **7 Stages of Love** and **Hum-Nawa Listen Together** — are not present. That is a roadmap fact, not a defect in this audit.

#### 1,000-CCU Failure Mode

UX does not fail at 1,000 CCU. It fails *before* 1,000 CCU and caps growth:

- **The publish illusion.** Card Studio's "Post to Feed" navigates to `/feed` and shows the poem, so the user believes it published. On reload it is gone. At any scale this is a trust bug; at 1,000 CCU it is 80 users/day losing work.
- **Dead-end after AI generation.** The generated poem can go to Studio or Feed, but not to a Secret Letter — the highest-intent, most shareable artifact in the product. The user must copy-paste into `/letters`, and the poem text is not carried over.
- **Duplicate destinations.** `/studio` and `/card-studio` both exist; the nav points to `/studio`, the sitemap lists both, the footer says "Card Studio". A user who bookmarks `/card-studio` gets a page that cannot be distinguished from `/studio` but has a different canonical. Same for `/letters` vs `/secret-letters`.
- **Compose draft coupling.** The `/feed` compose drawer persists to `ek_compose_draft` on every keystroke but never clears it if the user cancels; the next visit resurrects an abandoned draft with no "restore/discard" choice.
- **Script switching inconsistency.** The global script lives in the store; `PoemCard` has a local `override`. Opening a second card and switching there does not propagate, which is correct (per-card override) but visually ambiguous because both controls look identical.
- **Nav density.** Desktop has 6 links, mobile bottom bar has 5, and the footer repeats 6 more. `Card Studio` and `Studio` are the same destination under two names — the user cannot tell whether they differ.

#### Options & Trade-offs

| Product decision | Option A | Option B | Verdict |
|---|---|---|---|
| AI → Letter handoff | copy-paste (today) | **1-click "Seal as Khat" carrying lines + pen name** | B |
| Studio → Feed | local only (today) | **real `createPoem()` with pending translation** | B |
| Duplicate routes | delete one | **301 to canonical, keep inbound URLs alive** | B |
| Script control | global only | **global default + per-card override (today) with clearer affordance** | keep, relabel |
| Compose draft | auto-persist forever | **persist + explicit "Restore draft?" prompt on mount** | B |
| Empty states | generic | **script-aware curated verse + one CTA** | B |

#### Selected Strategy

The "one poem, five exits" rule. Every place a poem exists, the same action row must appear:

```
[Read in 3 scripts]  [Design card]  [Seal as Khat]  [Copy]  [Save]
```

State flows through the existing `store.studio` pattern — add `store.khatSeed` and `store.roomSeed` alongside it, all client-only and non-PII. No new persistence, no new API.

UI consistency contract (do not change the white editorial look):

| Token | Value | Usage |
|---|---|---|
| Background | `#FFFFFF` | page |
| Ink | `#0F172A` | primary text |
| Royal | `#1E3A8A` | links, secondary accents |
| Crimson | `#BE123C` | primary CTA, seal |
| Hairline | existing `border-hairline` | all dividers |
| Controls | **English** labels everywhere | no Hinglish buttons |
| Poetry text | script-native, never translated in the UI chrome | — |

#### Exact Implementation Blueprint

1. **Studio publish:** replace the local `set((s) => ({ poems: [...] }))` with `await createPoem({ shayarUid, takhallus, lines, sourceScript: script, moodTag, formatType })`, prepend the returned poem, navigate only on success, toast on failure. This closes F-16 and reuses the existing optimistic path.
2. **AI → Khat:** add a "Seal as Khat" button next to "Send to Studio" that does `set({ khatSeed: { lines: res.hinglish, penName } }); nav({ to: "/secret-letters", search: { compose: 1 } })`. `letters.tsx` reads `khatSeed` to prefill the poem textarea. Zero backend change.
3. **AI → Listen Together:** once §3.6 ships, add "Listen with someone" that creates a room and seeds the poem as the room title. Until then, omit the button rather than showing a disabled one.
4. **Route canonicalisation:** 301 `/card-studio` → `/studio`; canonical `/letters` → `/secret-letters`; remove the losers from the sitemap; keep both in `NAV` only once (rename the nav item "Card Studio" and point it at `/studio`).
5. **Draft recovery:** on `/feed` mount, if `ek_compose_draft` exists and is non-empty, show a small inline banner above the textarea: "Unsaved draft found · Restore · Discard". Never silently restore.
6. **Empty states:** replace the single generic "no poems" card with three contextual states (filter empty → "No verses in this mood yet · Be the first"; search empty → "Nothing for '<query>' · try 'tanhai'"; network degraded → "Showing curated mehfil"). Each has exactly one CTA.
7. **Accessibility:** the Card Studio canvas needs `role="img"` + `aria-label` describing ratio/theme/script; the script switch needs `aria-pressed`; the compose drawer needs a focus trap and `Escape` to close. These are cheap and improve the INP story by removing accidental focus thrash.

---

## 4. Database & SQL High-Concurrency Upgrade Script

**File:** `supabase/migrations/20261115000000_ccu1000_hardening.sql`
**Deploy window:** any time. Every index uses `CONCURRENTLY`; no table rewrites.

> **Apply with `psql`, not the SQL editor.** `CREATE INDEX CONCURRENTLY` and `CREATE UNIQUE INDEX CONCURRENTLY` cannot run inside a transaction block, and both the Supabase SQL editor and `supabase db push` wrap migrations in one. Apply this file with:
>
> ```bash
> psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20261115000000_ccu1000_hardening.sql
> ```
>
> `psql -f` autocommits each statement, so `CONCURRENTLY` is legal. If you must use the migration runner, split this into `..._schema.sql` (everything except indexes) and `..._indexes.sql` and run only the second one by hand. A failed `CONCURRENTLY` build leaves an **invalid** index behind — check `pg_index.indisvalid` and drop/recreate it.
>
> The trigger swap takes an `ACCESS EXCLUSIVE` lock on `poem_likes`/`poems` for a few milliseconds. Do it outside the publish peak.

```sql
-- ============================================================================
-- EK KHWAAB — 1,000 CCU HARDENING
-- Fixes: feed ownership subquery, cursor pagination, daad hot row,
--        anon table grants, khat attempt ledger, poem slug, translation state
-- Safe: CONCURRENTLY indexes, no table rewrites, idempotent
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Guard: run index statements outside a transaction block.
--    (Supabase SQL editor wraps in a txn; use the CLI for CONCURRENTLY.)
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. OWNERSHIP HELPER — evaluated once per statement, not once per row
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_shayar_uid()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT shayar_uid FROM public.public_shayars WHERE auth_user_id = (SELECT auth.uid());
$$;

REVOKE ALL ON FUNCTION public.current_shayar_uid() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_shayar_uid() TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. REPLACE PER-ROW IN (SELECT ...) POLICIES WITH THE HELPER
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Poets can create poems" ON public.poems;
CREATE POLICY "Poets can create poems" ON public.poems FOR INSERT
  WITH CHECK (shayar_uid = public.current_shayar_uid());

DROP POLICY IF EXISTS "Poets can delete their own poems" ON public.poems;
CREATE POLICY "Poets can delete their own poems" ON public.poems FOR DELETE
  USING (shayar_uid = public.current_shayar_uid());

DROP POLICY IF EXISTS "Owners can update own poems" ON public.poems;
CREATE POLICY "Owners can update own poems" ON public.poems FOR UPDATE
  USING (shayar_uid = public.current_shayar_uid())
  WITH CHECK (shayar_uid = public.current_shayar_uid());

DROP POLICY IF EXISTS "Users can insert own likes" ON public.poem_likes;
CREATE POLICY "Users can insert own likes" ON public.poem_likes FOR INSERT
  WITH CHECK (shayar_uid = public.current_shayar_uid());

DROP POLICY IF EXISTS "Users can delete own likes" ON public.poem_likes;
CREATE POLICY "Users can delete own likes" ON public.poem_likes FOR DELETE
  USING (shayar_uid = public.current_shayar_uid());

DROP POLICY IF EXISTS "Users can read own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can read own bookmarks" ON public.bookmarks FOR SELECT
  USING (shayar_uid = public.current_shayar_uid());

DROP POLICY IF EXISTS "Users can insert own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can insert own bookmarks" ON public.bookmarks FOR INSERT
  WITH CHECK (shayar_uid = public.current_shayar_uid());

DROP POLICY IF EXISTS "Users can delete own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can delete own bookmarks" ON public.bookmarks FOR DELETE
  USING (shayar_uid = public.current_shayar_uid());

DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE
  USING (shayar_uid = public.current_shayar_uid());

DROP POLICY IF EXISTS "Shayars can post comments" ON public.comments;
CREATE POLICY "Shayars can post comments" ON public.comments FOR INSERT
  WITH CHECK (shayar_uid = public.current_shayar_uid());

DROP POLICY IF EXISTS "Senders can view own sent khats" ON public.secret_khats;
CREATE POLICY "Senders can view own sent khats" ON public.secret_khats FOR SELECT
  USING (sender_uid = public.current_shayar_uid());

DROP POLICY IF EXISTS "Senders can delete own sent khats" ON public.secret_khats;
CREATE POLICY "Senders can delete own sent khats" ON public.secret_khats FOR DELETE
  USING (sender_uid = public.current_shayar_uid());

-- ---------------------------------------------------------------------------
-- 3. FEED VIEW — LATERAL ownership probe, COALESCE, no per-row subquery
--    security_barrier is deliberately OFF: masking happens in the SELECT
--    list, and turning it on would block keyset qual pushdown (major perf hit).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.safe_poems_feed AS
SELECT
  p.id,
  CASE WHEN p.is_gumnaam THEN 'EK-GUMNAAM' ELSE p.shayar_uid END AS shayar_uid,
  CASE WHEN p.is_gumnaam THEN 'Gumnaam_Shayar' ELSE COALESCE(s.takhallus, 'Gumnaam_Shayar') END AS takhallus,
  p.hinglish_text,
  p.hindi_text,
  p.urdu_text,
  p.english_translation,
  p.mood_tag,
  p.format_type,
  p.seed_words,
  p.is_gumnaam,
  COALESCE(st.daad_count, p.daad_count, 0) AS daad_count,
  p.created_at,
  COALESCE(me.shayar_uid IS NOT NULL AND p.shayar_uid = me.shayar_uid, false) AS is_owner
FROM public.poems p
LEFT JOIN public.public_shayars s ON s.shayar_uid = p.shayar_uid
LEFT JOIN public.poem_stats st ON st.poem_id = p.id
LEFT JOIN LATERAL (
  SELECT shayar_uid FROM public.public_shayars
  WHERE auth_user_id = (SELECT auth.uid())
) me ON true;

GRANT SELECT ON public.safe_poems_feed TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. NARROW COUNTER TABLE (hot-row relief)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.poem_stats (
  poem_id     uuid PRIMARY KEY REFERENCES public.poems(id) ON DELETE CASCADE,
  daad_count  integer NOT NULL DEFAULT 0 CHECK (daad_count >= 0),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.poem_stats (poem_id, daad_count)
SELECT id, COALESCE(daad_count, 0) FROM public.poems
ON CONFLICT (poem_id) DO NOTHING;

ALTER TABLE public.poem_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Poem stats are publicly readable" ON public.poem_stats;
CREATE POLICY "Poem stats are publicly readable"
  ON public.poem_stats FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.update_poem_daad_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.poem_stats (poem_id, daad_count, updated_at)
    VALUES (NEW.poem_id, 1, now())
    ON CONFLICT (poem_id) DO UPDATE
      SET daad_count = public.poem_stats.daad_count + 1,
          updated_at = now();
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.poem_stats
       SET daad_count = GREATEST(0, daad_count - 1),
           updated_at = now()
     WHERE poem_id = OLD.poem_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_poem_daad ON public.poem_likes;
CREATE TRIGGER trigger_sync_poem_daad
  AFTER INSERT OR DELETE ON public.poem_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_poem_daad_count();

-- Keep the legacy column in sync for one release, then drop it.
CREATE OR REPLACE FUNCTION public.mirror_daad_to_poems()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE public.poems SET daad_count = NEW.daad_count WHERE id = NEW.poem_id;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trigger_mirror_daad ON public.poem_stats;
CREATE TRIGGER trigger_mirror_daad
  AFTER UPDATE OF daad_count ON public.poem_stats
  FOR EACH ROW EXECUTE FUNCTION public.mirror_daad_to_poems();

-- ---------------------------------------------------------------------------
-- 5. KEYSET + FILTER + SEARCH INDEXES
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_poems_feed_cursor
  ON public.poems (created_at DESC, id DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_poems_mood_cursor
  ON public.poems (mood_tag, created_at DESC, id DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_poem_created
  ON public.comments (poem_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_poem_likes_shayar
  ON public.poem_likes (shayar_uid, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_poems_shayar_created
  ON public.poems (shayar_uid, created_at DESC);

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_poems_hinglish_trgm
  ON public.poems USING gin ((hinglish_text || ' ' || COALESCE(english_translation, '')) gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- 6. CURSOR RPC — one query, no unbounded comments, capped at 3 per poem
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_feed_page(
  p_cursor_created_at timestamptz DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL,
  p_mood text DEFAULT NULL,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid, shayar_uid text, takhallus text,
  hinglish_text text, hindi_text text, urdu_text text, english_translation text,
  mood_tag text, format_type text, seed_words text[], is_gumnaam boolean,
  daad_count integer, created_at timestamptz, is_owner boolean,
  recent_comments jsonb
)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT f.*, COALESCE(c.items, '[]'::jsonb) AS recent_comments
  FROM (
    SELECT * FROM public.safe_poems_feed
    WHERE (p_mood IS NULL OR mood_tag = p_mood)
      AND (p_cursor_created_at IS NULL
           OR created_at < p_cursor_created_at
           OR (created_at = p_cursor_created_at AND id < p_cursor_id))
    ORDER BY created_at DESC, id DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 50)
  ) f
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(x ORDER BY x.created_at DESC) AS items
    FROM (
      SELECT c.id, c.comment_text, c.created_at, s.takhallus
      FROM public.comments c
      LEFT JOIN public.public_shayars s ON s.shayar_uid = c.shayar_uid
      WHERE c.poem_id = f.id
      ORDER BY c.created_at DESC
      LIMIT 3
    ) x
  ) c ON true
  ORDER BY f.created_at DESC, f.id DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_feed_page(timestamptz, uuid, text, integer) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. WRITE-ONCE TRANSLATION STATE
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.translation_state AS ENUM ('pending','processing','complete','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.poems
  ADD COLUMN IF NOT EXISTS translation_status public.translation_state NOT NULL DEFAULT 'complete',
  ADD COLUMN IF NOT EXISTS source_script text NOT NULL DEFAULT 'hinglish',
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS translated_at timestamptz;

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_poems_slug ON public.poems (slug) WHERE slug IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_poems_translation_pending
  ON public.poems (created_at) WHERE translation_status IN ('pending','failed');
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_poems_created_public
  ON public.poems (created_at DESC) WHERE translation_status = 'complete';

CREATE OR REPLACE FUNCTION public.set_poem_slug()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE base text;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base := lower(regexp_replace(split_part(COALESCE(NEW.hinglish_text, ''), E'\n', 1), '[^a-zA-Z0-9]+', '-', 'g'));
    base := trim(both '-' from base);
    IF base = '' OR base IS NULL THEN
      base := 'ek-khawaab-' || substr(NEW.id::text, 1, 8);
    END IF;
    NEW.slug := left(base, 60) || '-' || substr(NEW.id::text, 1, 6);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trigger_set_poem_slug ON public.poems;
CREATE TRIGGER trigger_set_poem_slug
  BEFORE INSERT OR UPDATE OF hinglish_text, slug ON public.poems
  FOR EACH ROW EXECUTE FUNCTION public.set_poem_slug();

-- ---------------------------------------------------------------------------
-- 8. KHAT ATTEMPT LEDGER + PER-RECIPIENT UNLOCK (see §3.4)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.khat_attempts (
  id bigserial PRIMARY KEY,
  khat_id uuid NOT NULL REFERENCES public.secret_khats(id) ON DELETE CASCADE,
  ip_hash text NOT NULL,
  succeeded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_khat_attempts_ip_time
  ON public.khat_attempts (ip_hash, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_khat_attempts_khat_time
  ON public.khat_attempts (khat_id, created_at DESC);
ALTER TABLE public.khat_attempts ENABLE ROW LEVEL SECURITY;  -- no policies: service-role only

CREATE TABLE IF NOT EXISTS public.khat_unlocks (
  khat_id uuid NOT NULL REFERENCES public.secret_khats(id) ON DELETE CASCADE,
  recipient_token_hash text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (khat_id, recipient_token_hash)
);
ALTER TABLE public.khat_unlocks ENABLE ROW LEVEL SECURITY;
-- Service-role only. The recipient proves possession of the token in the share
-- link; the client never reads this table directly.
REVOKE ALL ON public.khat_unlocks FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 9. ANTI-SPAM THROTTLE (publish + comments)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_poem_publish_rate()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE recent int;
BEGIN
  SELECT count(*) INTO recent FROM public.poems
   WHERE shayar_uid = NEW.shayar_uid AND created_at > now() - interval '1 hour';
  IF recent >= 10 THEN
    RAISE EXCEPTION 'Publish limit reached (10 poems/hour). Please wait before posting again.';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trigger_poem_publish_rate ON public.poems;
CREATE TRIGGER trigger_poem_publish_rate
  BEFORE INSERT ON public.poems
  FOR EACH ROW EXECUTE FUNCTION public.enforce_poem_publish_rate();

CREATE OR REPLACE FUNCTION public.enforce_comment_rate()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE recent int;
BEGIN
  SELECT count(*) INTO recent FROM public.comments
   WHERE shayar_uid = NEW.shayar_uid AND created_at > now() - interval '1 hour';
  IF recent >= 20 THEN
    RAISE EXCEPTION 'Comment limit reached (20/hour).';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trigger_comment_rate ON public.comments;
CREATE TRIGGER trigger_comment_rate
  BEFORE INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_comment_rate();

-- ---------------------------------------------------------------------------
-- 10. ANON GRANT LOCKDOWN (F-02, K-2) — run after the client is updated
-- ---------------------------------------------------------------------------
REVOKE ALL ON public.poems FROM anon;
REVOKE ALL ON public.public_shayars FROM anon;
REVOKE ALL ON public.comments FROM anon;
REVOKE ALL ON public.poem_likes FROM anon;
REVOKE ALL ON public.bookmarks FROM anon;

GRANT SELECT ON public.safe_poems_feed TO anon;
GRANT SELECT ON public.public_shayar_directory TO anon;
GRANT SELECT (shayar_uid, takhallus, takhallus_meaning, vibe_category, avatar_color, created_at, updated_at)
  ON public.public_shayars TO authenticated;

-- ---------------------------------------------------------------------------
-- 11. STATEMENT BUDGETS (protect the pool from pathological queries)
-- ---------------------------------------------------------------------------
ALTER ROLE authenticated SET statement_timeout = '8s';
ALTER ROLE anon SET statement_timeout = '5s';

-- ---------------------------------------------------------------------------
-- 12. REFRESH PLANNER STATS
-- ---------------------------------------------------------------------------
ANALYZE public.poems;
ANALYZE public.poem_stats;
ANALYZE public.comments;
ANALYZE public.public_shayars;
```

### 4.1 Rollback

```sql
DROP TRIGGER IF EXISTS trigger_mirror_daad ON public.poem_stats;
DROP TRIGGER IF EXISTS trigger_comment_rate ON public.comments;
DROP TRIGGER IF EXISTS trigger_poem_publish_rate ON public.poems;
DROP TRIGGER IF EXISTS trigger_set_poem_slug ON public.poems;

CREATE OR REPLACE FUNCTION public.update_poem_daad_count() ... -- previous body from 20261105

DROP VIEW IF EXISTS public.safe_poems_feed;
CREATE OR REPLACE VIEW public.safe_poems_feed AS ... -- previous definition

GRANT ALL ON public.poems TO anon;   -- restores pre-hardening behaviour
```

Keep `poem_stats` (harmless, no reads after revert) and keep the helper function. Never drop indexes during an incident unless they are causing write amplification.

### 4.2 Connection pooling (Supavisor) — the honest answer

For this product, the browser never opens Postgres connections. PostgREST multiplexes HTTP onto a small internal pool. At 26 QPS and ~4 ms per query that is **~0.1 concurrent backends**. Supavisor tuning is therefore not on the critical path for 1,000 CCU.

Use it correctly anyway:

| Consumer | Connection | Mode | Pool size |
|---|---|---|---|
| Browser (PostgREST) | HTTPS | n/a | n/a |
| Render translation worker / cron | `:6543` (Supavisor) | transaction | 5 |
| Admin/psql/migrations | `:5432` direct | session | 1–2 |
| Edge Worker (SEO shell) | HTTPS PostgREST | n/a | n/a |

Never use `:5432` from an autoscaled service: 10 instances × 10 connections exhausts a small plan's 60-connection budget instantly. With `:6543` + `?pgbouncer=true`, prepared statements must be disabled (or use `prepare: false` in `postgres.js`). That single setting is the classic 2 a.m. outage.

---

## 5. Render AI Microservice Caching & Queue Blueprint

### 5.1 Design constraints

| Constraint | Value |
|---|---|
| Process model | 1 Node process per Render instance (512 MB on free) |
| Peak concurrent AI requests | 50 (launch), 17 RPM steady |
| Groq budget | ~30 RPM, ~12k TPM (70B free tier), each request ~2.4k tokens |
| Cache target | generation 35–60%, translation 80–95% |
| Max queue wait | 8 s (then honest 503 + `Retry-After`) |
| Hard daily spend cap | 2,000 upstream calls |
| Cold start | free tier 30–60 s; must not be on the user's critical path |

No new dependencies are required: a 12-line `p-limit` equivalent, a `Map`-backed TTL LRU, and a token bucket are enough. Avoid adding Redis at this scale — it is a new failure domain for a problem a 40 MB in-process cache solves.

### 5.2 `render-api/lib/ai-pipeline.mjs`

```js
// Ek Khwaab — AI pipeline: canonical cache + single-flight + bounded queue
// + RPM/TPM token bucket + circuit breaker + daily budget.
// Zero dependencies. Node >= 18 (global fetch, crypto).
import { createHash, randomUUID } from "node:crypto";

/* ------------------------------- LRU + TTL ------------------------------- */
export class LruTtlCache {
  constructor({ max = 2000, ttlMs = 6 * 60 * 60 * 1000, maxBytes = 40 * 1024 * 1024 } = {}) {
    this.max = max; this.ttlMs = ttlMs; this.maxBytes = maxBytes;
    this.map = new Map(); this.bytes = 0;
    this.hits = 0; this.misses = 0;
  }
  #size(v) { return Buffer.byteLength(JSON.stringify(v), "utf8"); }
  get(key) {
    const e = this.map.get(key);
    if (!e) { this.misses++; return null; }
    if (e.exp < Date.now()) { this.#del(key); this.misses++; return null; }
    // LRU touch
    this.map.delete(key); this.map.set(key, e);
    this.hits++;
    return e.value;
  }
  set(key, value) {
    const size = this.#size(value);
    if (size > this.maxBytes / 8) return; // never let one giant entry evict everything
    if (this.map.has(key)) this.#del(key);
    this.map.set(key, { value, exp: Date.now() + this.ttlMs, size });
    this.bytes += size;
    while (this.map.size > this.max || this.bytes > this.maxBytes) {
      const k = this.map.keys().next().value;
      this.#del(k);
    }
  }
  #del(key) {
    const e = this.map.get(key);
    if (!e) return;
    this.bytes -= e.size;
    this.map.delete(key);
  }
  stats() {
    const total = this.hits + this.misses;
    return {
      entries: this.map.size,
      bytes: this.bytes,
      hits: this.hits,
      misses: this.misses,
      hitRate: total ? +(this.hits / total).toFixed(3) : 0,
    };
  }
}

/* -------------------------------- Gate ---------------------------------- */
// Bounded concurrency + bounded queue. Rejects (never hangs) when full.
export class Gate {
  constructor({ concurrency = 4, maxQueue = 24 } = {}) {
    this.concurrency = concurrency; this.maxQueue = maxQueue;
    this.active = 0; this.queue = [];
  }
  get stats() { return { active: this.active, queued: this.queue.length }; }
  async run(task, { timeoutMs = 8000 } = {}) {
    if (this.active >= this.concurrency && this.queue.length >= this.maxQueue) {
      const err = new Error("queue_full");
      err.code = "QUEUE_FULL";
      throw err;
    }
    return new Promise((resolve, reject) => {
      const entry = { task, resolve, reject, timer: null };
      entry.start = () => {
        this.active++;
        entry.timer = setTimeout(() => {
          entry.reject(Object.assign(new Error("queue_timeout"), { code: "QUEUE_TIMEOUT" }));
        }, timeoutMs);
        Promise.resolve()
          .then(entry.task)
          .then((v) => { clearTimeout(entry.timer); entry.resolve(v); })
          .catch((e) => { clearTimeout(entry.timer); entry.reject(e); })
          .finally(() => { this.active--; this.#next(); });
      };
      this.queue.push(entry);
      if (this.active < this.concurrency) {
        const next = this.queue.shift();
        next.start();
      }
    });
  }
  #next() {
    if (this.queue.length && this.active < this.concurrency) this.queue.shift().start();
  }
}

/* ----------------------------- Token bucket ----------------------------- */
// Separately reserves RPM and TPM before dispatch. If either is short, waits.
export class TokenBucket {
  constructor({ rpm = 28, tpm = 11000, windowMs = 60_000 } = {}) {
    this.rpm = rpm; this.tpm = tpm; this.windowMs = windowMs;
    this.events = []; // { ts, tokens }
  }
  #prune(now) { this.events = this.events.filter((e) => now - e.ts < this.windowMs); }
  canReserve(tokens) {
    const now = Date.now(); this.#prune(now);
    const usedTokens = this.events.reduce((a, e) => a + e.tokens, 0);
    return this.events.length < this.rpm && usedTokens + tokens <= this.tpm;
  }
  reserve(tokens) {
    this.#prune(Date.now());
    this.events.push({ ts: Date.now(), tokens });
  }
  waitMs(tokens) {
    const now = Date.now(); this.#prune(now);
    const usedTokens = this.events.reduce((a, e) => a + e.tokens, 0);
    if (this.events.length >= this.rpm) return Math.max(0, this.events[0].ts + this.windowMs - now);
    if (usedTokens + tokens > this.tpm) {
      let acc = usedTokens, i = 0;
      while (i < this.events.length && acc + tokens > this.tpm) { acc -= this.events[i].tokens; i++; }
      return Math.max(0, (this.events[i - 1]?.ts ?? now) + this.windowMs - now);
    }
    return 0;
  }
}

/* ------------------------------ Breaker --------------------------------- */
export class Breaker {
  constructor({ threshold = 5, cooldownMs = 30_000 } = {}) {
    this.threshold = threshold; this.cooldownMs = cooldownMs;
    this.failures = 0; this.openedAt = 0; this.state = "closed";
  }
  allow() {
    if (this.state === "open" && Date.now() - this.openedAt > this.cooldownMs) {
      this.state = "half-open"; return true;
    }
    return this.state !== "open";
  }
  ok() { this.failures = 0; this.state = "closed"; }
  fail() {
    this.failures++;
    if (this.failures >= this.threshold) { this.state = "open"; this.openedAt = Date.now(); }
  }
}

/* ----------------------------- Single flight ---------------------------- */
const inflight = new Map();
export function singleFlight(key, fn) {
  if (inflight.has(key)) return inflight.get(key);
  const p = Promise.resolve().then(fn).finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

/* --------------------------- Canonicalisation --------------------------- */
const norm = (s) => String(s ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();

export function canonicalKey(kind, payload) {
  const base =
    kind === "translate"
      ? {
          k: "translate",
          src: payload.sourceScript,
          lines: (payload.sourceLines || []).map(norm),
          // poemId is deliberately excluded: two users translating the same
          // lines should share a cache entry.
        }
      : {
          k: "shayar",
          seeds: [...(payload.seeds || [])].map(norm).sort(),
          phrases: [...(payload.phrases || [])].map(norm).sort(),
          situation: norm(payload.situation),
          style: payload.style,
          mood: payload.mood,
          type: payload.poetryType,
          length: payload.length,
          lang: payload.primaryLanguage,
          intensity: payload.intensity,
          rhyme: payload.rhymePreference,
          radif: norm(payload.radif),
          qafiya: norm(payload.qafiya),
          draft: norm(payload.draftText),
        };
  return createHash("sha256").update(JSON.stringify(base)).digest("hex");
}

/* ------------------------------- Provider ------------------------------- */
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

async function callGroq({ apiKey, model, system, user, maxTokens, temperature, signal }) {
  const t0 = Date.now();
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal,
  });
  const ms = Date.now() - t0;
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const retryAfter = Number(res.headers.get("retry-after") || 0);
    throw Object.assign(new Error(`groq_${res.status}`), {
      status: res.status, retryAfter, body: body.slice(0, 300), ms,
    });
  }
  const json = await res.json();
  const usage = json.usage || {};
  return {
    content: json.choices?.[0]?.message?.content ?? "",
    tokensIn: usage.prompt_tokens ?? 0,
    tokensOut: usage.completion_tokens ?? 0,
    ms,
  };
}

/* ------------------------------- Pipeline ------------------------------- */
export function createAiPipeline({
  groqKey,
  modelFast = "llama-3.1-8b-instant",
  modelQuality = process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  dailyBudget = 2000,
  cache = new LruTtlCache(),
  gate = new Gate({ concurrency: 4, maxQueue: 24 }),
  bucket = new TokenBucket({ rpm: 28, tpm: 11000 }),
  breaker = new Breaker(),
} = {}) {
  let day = new Date().toISOString().slice(0, 10);
  let spent = 0;

  function budgetOk() {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== day) { day = today; spent = 0; }
    return spent < dailyBudget;
  }

  async function run({ kind, payload, buildPrompt, validate, requestId = randomUUID() }) {
    if (!groqKey) return degraded("ai_unconfigured");
    if (!budgetOk()) return degraded("ai_budget_exhausted", 3600);
    if (!breaker.allow()) return degraded("ai_breaker_open", 30);

    const key = canonicalKey(kind, payload);
    const cached = cache.get(key);
    if (cached) {
      return { status: 200, headers: { "X-Cache": "HIT" }, body: { ...cached, cached: true, requestId } };
    }

    const { system, user, maxTokens, temperature } = buildPrompt(payload);
    // Reserve conservatively: prompt chars/4 + max output.
    const estimate = Math.ceil((system.length + user.length) / 4) + maxTokens;

    try {
      const result = await singleFlight(key, () =>
        gate.run(async () => {
          if (!bucket.canReserve(estimate)) {
            const wait = Math.min(bucket.waitMs(estimate), 5000);
            await new Promise((r) => setTimeout(r, wait));
          }
          bucket.reserve(estimate);

          const controller = new AbortController();
          const t = setTimeout(() => controller.abort(), 12000);
          try {
            let out;
            try {
              out = await callGroq({
                apiKey: groqKey, model: modelQuality, system, user,
                maxTokens, temperature, signal: controller.signal,
              });
            } catch (err) {
              if (err.status === 429 || err.status >= 500) {
                out = await callGroq({
                  apiKey: groqKey, model: modelFast, system, user,
                  maxTokens: Math.min(maxTokens, 700), temperature, signal: controller.signal,
                });
              } else throw err;
            }
            const parsed = JSON.parse(out.content);
            const clean = validate(parsed, payload);
            breaker.ok();
            spent++;
            return { clean, meta: { upstreamMs: out.ms, tokensIn: out.tokensIn, tokensOut: out.tokensOut } };
          } finally {
            clearTimeout(t);
          }
        })
      );

      const body = { ...result.clean, cached: false, requestId, meta: result.meta };
      cache.set(key, result.clean);
      return { status: 200, headers: { "X-Cache": "MISS" }, body };
    } catch (err) {
      const code = err.code || (err.name === "AbortError" ? "upstream_timeout" : "upstream_error");
      if (code !== "QUEUE_TIMEOUT" && code !== "QUEUE_FULL") breaker.fail();
      const wait = err.status === 429 ? Math.max(err.retryAfter || 2, 2) : 5;
      console.warn(JSON.stringify({ level: "warn", requestId, kind, code, status: err.status, wait }));
      // Honest, non-500 degradation: the client renders curated content.
      return degraded(code, wait);
    }
  }

  function degraded(reason, retryAfter = 5) {
    return {
      status: 200,
      headers: { "X-Degraded": reason, "Retry-After": String(retryAfter) },
      body: { degraded: true, reason, retryAfter },
    };
  }

  return {
    run,
    stats: () => ({ cache: cache.stats(), gate: gate.stats, breaker: breaker.state, spent, day }),
  };
}
```

### 5.3 Wiring `server.mjs`

```js
import { createAiPipeline } from "./lib/ai-pipeline.mjs";

const ai = createAiPipeline({ groqKey: process.env.GROQ_API_KEY });

app.get("/health", (_, res) => res.json({ status: "ok", uptime: process.uptime(), version: process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? "dev" }));

app.get("/ready", async (_, res) => {
  const s = ai.stats();
  const ready = Boolean(process.env.GROQ_API_KEY) && s.breaker !== "open";
  res.status(ready ? 200 : 503).json({ ready, ...s });
});

app.post("/api/ai/shayar", aiRateLimiter, async (req, res) => {
  const parsed = ShayarInputSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid request payload", details: parsed.error.flatten() });

  const result = await ai.run({
    kind: "shayar",
    payload: parsed.data,
    requestId: req.get("X-Request-Id") || undefined,
    buildPrompt: (d) => ({ system: SHAYAR_SYSTEM_PROMPT, user: buildShayarUserPrompt(d), maxTokens: 900, temperature: 0.72 }),
    validate: (p, d) => ({
      poem: {
        requestId: `EK_AI_${Date.now()}`,
        poetryType: d.poetryType,
        title: p.title ?? null,
        hinglish: asLines(p.hinglish),
        hindi: asLines(p.hindi),
        urdu: asLines(p.urdu),
        english: typeof p.english === "string" ? p.english : asLines(p.english).join(" "),
        seedsUsed: p.usedPhrases ?? d.seeds ?? [],
        usedPhrases: p.usedPhrases ?? d.seeds ?? [],
        tags: p.tags ?? d.tags ?? [],
        alternatives: p.alternatives ?? [],
        continuations: p.continuations ?? [],
        validation: p.validation ?? { requiredPhrasesPresent: true, structureValid: true },
      },
      error: null,
    }),
  });

  return res.status(result.status).set(result.headers).json(result.body);
});
```

`buildShayarUserPrompt(d)` is the existing XML-fenced prompt builder, extracted into a pure function so it is unit-testable. `asLines(v)` coerces string → `["..."]` and filters empties. Validation **must** enforce `hinglish.length === hindi.length === urdu.length`; if it fails, return the degraded path rather than a misaligned poem (line mismatch is the most visible AI bug in the product).

### 5.4 `package.json` / `render.yaml` changes

```json
{
  "scripts": {
    "start": "node server.mjs",
    "dev": "node --watch server.mjs",
    "test": "node --test"
  }
}
```

No new dependencies. Remove `dotenv` from production if Render injects env vars (keep it for local dev; `dotenv` is a no-op when vars already exist).

```yaml
services:
  - type: web
    name: ek-khawaab-api
    runtime: node
    plan: starter            # free spins down after 15 min → 30–60 s cold start
    region: singapore
    rootDir: render-api
    buildCommand: npm ci --omit=dev
    startCommand: node server.mjs
    healthCheckPath: /health
    autoDeploy: true
    envVars:
      - key: PORT
        value: 3001
      - key: GROQ_API_KEY
        sync: false
      - key: GROQ_MODEL
        value: llama-3.3-70b-versatile
      - key: ALLOWED_ORIGINS
        value: https://ekkhwaab.in,https://www.ekkhwaab.in
      - key: AI_DAILY_BUDGET
        value: "2000"
```

### 5.5 Cache key semantics — the trade-offs, stated plainly

| Field | In key? | Why |
|---|---|---|
| `seeds` | yes, **sorted** | order of seed chips must not fragment the cache |
| `situation` | yes, normalised | free text is the main source of low hit rate |
| `style`, `mood`, `poetryType`, `length`, `intensity`, `rhyme` | yes | materially change output |
| `radif`, `qafiya`, `draftText` | yes, normalised | constrain the poem |
| `poemId` (translation) | **no** | same lines must share a cache entry across poems |
| `primaryLanguage` | yes for generation, no for translation | translation output covers all 4 |
| user id / IP | **no** | cross-user reuse is the point; outputs contain no PII |
| timestamp | **no** | obvious |

TTL 6 h balances freshness against hit rate. A poetry generator does not need per-minute freshness; the user cannot tell whether a verse was composed 3 s or 3 h ago, and the cache key includes every field that shapes meaning.

### 5.6 Expected effect at 1,000 CCU

| Metric | Before | After |
|---|---|---|
| Upstream calls at 17 RPM offered | 17 | ~7.6 (55% hit) |
| Tokens/min | 40,800 | ~12,100 |
| 429 responses | frequent | rare (bucket prevents dispatch) |
| AI p95 (cache hit) | n/a | **< 2 ms** |
| AI p95 (miss) | 12 s abort | ~3.5 s |
| Worst-case user experience | error toast after 12 s | curated poem in ≤ 8 s |
| Cost ceiling | unbounded | 2,000 calls/day |

---

## 6. Runnable 1,000-CCU Load Test Suite (`k6`) & Pre-Launch Verification Checklist

### 6.1 Safety rules — read before running

1. **Never point this at production Groq.** The AI scenario must hit `API_BASE` with `?mock=1` (staging only) or a cached payload. A 1,000-VU AI test against live Groq will consume the daily quota in under 30 seconds and may suspend the key.
2. **Never run writes against production.** The script issues `GET` only. Create/like/unlock paths are exercised against a **staging** Supabase project with seeded data.
3. **Warm the CDN first.** Run 30 VUs for 2 minutes, then the full profile. A cold Cloudflare cache measures origin, not steady state — useful, but label it separately.
4. **Watch the bill.** Supabase egress during a 20-minute 1,000-VU test at ~230 kB/s is ~275 MB. Acceptable. Without the client cache it would be ~2.7 GB.
5. **Kill switch:** `k6 run --yes` ... and keep the Cloudflare "Under Attack" toggle within reach if origin starts 503ing.

### 6.2 `scripts/loadtest-1000ccu.js`

```js
/**
 * Ek Khwaab — 1,000 CCU load test
 *
 *   k6 run scripts/loadtest-1000ccu.js \
 *     -e BASE_URL=https://ekkhwaab.in \
 *     -e SUPABASE_URL=https://<proj>.supabase.co \
 *     -e SUPABASE_ANON_KEY=<anon> \
 *     -e API_BASE=https://ek-khawaab-api.onrender.com \
 *     -e MOCK_AI=1
 *
 * READ-ONLY. No writes. AI is mocked or cache-only.
 */
import http from "k6/http";
import { check, sleep, group } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";
import { randomIntBetween } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";

const BASE = __ENV.BASE_URL || "https://ekkhwaab.in";
const SB = __ENV.SUPABASE_URL || "";
const SB_KEY = __ENV.SUPABASE_ANON_KEY || "";
const API = __ENV.API_BASE || "";
const MOCK_AI = __ENV.MOCK_AI === "1";

const feedTrend = new Trend("feed_api_ms", true);
const htmlTrend = new Trend("html_ms", true);
const aiTrend = new Trend("ai_ms", true);
const scriptSwitch = new Trend("script_switch_ms", true);
const degraded = new Rate("ai_degraded_rate");
const errors = new Counter("app_errors");

const SB_HEADERS = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

export const options = {
  scenarios: {
    // 70% — readers: HTML + feed API + script switching
    readers: {
      executor: "ramping-vus",
      exec: "reader",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 300 },
        { duration: "5m", target: 700 },
        { duration: "10m", target: 700 },
        { duration: "2m", target: 0 },
      ],
      gracefulRampDown: "30s",
      tags: { scenario: "readers" },
    },
    // 15% — dictionary + topic browsing
    browsers: {
      executor: "ramping-vus",
      exec: "browser",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 60 },
        { duration: "5m", target: 150 },
        { duration: "10m", target: 150 },
        { duration: "2m", target: 0 },
      ],
      gracefulRampDown: "30s",
      tags: { scenario: "browsers" },
    },
    // 8% — card studio (static route + assets only; canvas is client-local)
    creators: {
      executor: "constant-vus",
      exec: "creator",
      vus: 80,
      duration: "17m",
      tags: { scenario: "creators" },
    },
    // 5% — AI poet (MOCK ONLY)
    ai: {
      executor: "ramping-arrival-rate",
      exec: "aiUser",
      startRate: 1,
      timeUnit: "1s",
      preAllocatedVUs: 20,
      maxVUs: 60,
      stages: [
        { duration: "2m", target: 5 },
        { duration: "13m", target: 8 },
        { duration: "2m", target: 0 },
      ],
      tags: { scenario: "ai" },
    },
    // 2% — khat unlock (staging only; skipped when KHAT_ID is unset)
    khatUsers: {
      executor: "constant-vus",
      exec: "khatUser",
      vus: 20,
      duration: "17m",
      tags: { scenario: "khats" },
    },
  },
  thresholds: {
    "http_req_failed": ["rate<0.01"],
    "html_ms{scenario:readers}": ["p(95)<800"],
    "feed_api_ms": ["p(95)<150", "p(99)<400"],
    "script_switch_ms": ["p(95)<25"],
    "ai_ms{scenario:ai}": ["p(95)<200"],
    "ai_degraded_rate": ["rate<0.02"],
    "checks": ["rate>0.99"],
  },
  summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "p(99)", "max"],
};

/* ------------------------------- helpers ------------------------------- */
const FEED_SELECT =
  "id,shayar_uid,takhallus,hinglish_text,hindi_text,urdu_text,english_translation,mood_tag,format_type,daad_count,created_at,is_owner";

function getFeed(limit = 20) {
  const url = `${SB}/rest/v1/safe_poems_feed?select=${FEED_SELECT}&order=created_at.desc,id.desc&limit=${limit}`;
  const res = http.get(url, { headers: SB_HEADERS, tags: { name: "feed_api" } });
  feedTrend.add(res.timings.duration);
  const ok = check(res, {
    "feed 200": (r) => r.status === 200,
    "feed has rows": (r) => Array.isArray(r.json()) ? r.json().length > 0 : false,
    "no gumnaam leak": (r) => {
      const rows = r.json();
      if (!Array.isArray(rows)) return false;
      return rows.every((p) => !p.is_gumnaam || p.shayar_uid === "EK-GUMNAAM");
    },
  });
  if (!ok) errors.add(1);
  return res;
}

/* -------------------------------- reader -------------------------------- */
export function reader() {
  group("feed page", () => {
    const res = http.get(`${BASE}/feed`, { tags: { name: "feed_html" } });
    htmlTrend.add(res.timings.duration);
    check(res, {
      "feed html 200": (r) => r.status === 200,
      "feed html is prerendered": (r) => typeof r.body === "string" && r.body.includes("Ek Khwaab"),
    });

    const feed = getFeed(20);

    // Script switching is a pure client-side array swap, but a real browser
    // still re-renders. This approximates the work by parsing all 3 arrays.
    if (feed.status === 200) {
      const t0 = Date.now();
      const rows = feed.json() || [];
      let switched = 0;
      for (const p of rows) {
        for (const s of ["hinglish", "hindi", "urdu"]) {
          const text = p[`${s}_text`];
          if (typeof text === "string" && text.length > 0) switched++;
        }
      }
      const ms = Date.now() - t0;
      scriptSwitch.add(ms);
      check(switched, { "three scripts present": (n) => n >= rows.length });
    }

    // 30% also open a poem detail page
    if (Math.random() < 0.3) {
      const res2 = http.get(`${BASE}/poetry/ab-kisi-baat-pe-dil-dukhta-nahi`, { tags: { name: "poem_html" } });
      check(res2, { "poem html 200": (r) => r.status === 200 });
    }
  });

  sleep(randomIntBetween(6, 14)); // think time between page views
}

/* ------------------------------- browser ------------------------------- */
export function browser() {
  const words = ["tagaful", "ishq", "tanhai", "khwaab", "sukun"];
  group("dictionary", () => {
    const res = http.get(`${BASE}/dictionary`, { tags: { name: "dict_html" } });
    check(res, { "dictionary 200": (r) => r.status === 200 });
    const w = words[randomIntBetween(0, words.length - 1)];
    const res2 = http.get(`${BASE}/dictionary/${w}`, { tags: { name: "word_html" } });
    check(res2, { "word 200": (r) => r.status === 200 });
  });
  if (Math.random() < 0.4) {
    const topics = ["heartbreak-shayari", "two-line-shayari", "loneliness-shayari", "love-shayari"];
    const t = topics[randomIntBetween(0, topics.length - 1)];
    const res = http.get(`${BASE}/topic/${t}`, { tags: { name: "topic_html" } });
    check(res, { "topic 200": (r) => r.status === 200 });
  }
  sleep(randomIntBetween(8, 20));
}

/* ------------------------------- creator ------------------------------- */
export function creator() {
  // Card Studio never calls the server after its bundle loads. A creator
  // session is: open route, load the hashed chunk, "export" (client-only).
  const res = http.get(`${BASE}/studio`, { tags: { name: "studio_html" } });
  check(res, { "studio 200": (r) => r.status === 200 });
  sleep(randomIntBetween(15, 40));
}

/* --------------------------------- AI ---------------------------------- */
export function aiUser() {
  if (!API) { sleep(10); return; }
  if (!MOCK_AI) {
    // Hard guard: refuse to hammer live Groq.
    console.error("Refusing AI load without MOCK_AI=1");
    return;
  }

  // Repeat the same seed set deliberately: this measures cache hit rate as
  // much as generation. Ten distinct payloads across 8 rps ≈ 0.8 unique/s.
  const seeds = ["chai", "baarish", "metro", "khidki", "raat"];
  const payload = JSON.stringify({
    seeds,
    situation: "late night train window, missing someone",
    style: "Gulzar",
    poetryType: "shayari",
    mood: "Nostalgic",
    length: "couplet",
  });

  const res = http.post(`${API}/api/ai/shayar?mock=1`, payload, {
    headers: { "Content-Type": "application/json", "X-Request-Id": `k6-${__VU}-${__ITER}` },
    tags: { name: "ai_mock" },
  });
  aiTrend.add(res.timings.duration);
  let body = {};
  try { body = res.json(); } catch { /* ignore */ }
  degraded.add(Boolean(body && body.degraded));
  check(res, {
    "ai 200": (r) => r.status === 200,
    "ai not 5xx": (r) => r.status < 500,
  });
  sleep(randomIntBetween(2, 6));
}

/* -------------------------------- khat --------------------------------- */
export function khatUser() {
  // Only runs against staging with a known khat id.
  const id = __ENV.KHAT_ID;
  if (!id) { sleep(20); return; }

  const url = `${SB}/rest/v1/rpc/get_secret_khat_by_id`;
  const res = http.post(url, JSON.stringify({ p_khat_id: id }), {
    headers: SB_HEADERS,
    tags: { name: "khat_read" },
  });
  check(res, {
    "khat 200": (r) => r.status === 200,
    "khat hides sender": (r) => {
      const rows = r.json();
      if (!Array.isArray(rows) || !rows.length) return true;
      return rows[0].is_unlocked === true || rows[0].sender_uid === null;
    },
  });
  sleep(randomIntBetween(10, 25));
}

/* ------------------------------- summary ------------------------------- */
export function handleSummary(data) {
  const p = (m) => data.metrics[m]?.values?.["p(95)"] ?? 0;
  const fail = data.metrics.http_req_failed?.values?.rate ?? 0;
  const lines = [
    "",
    "=== EK KHWAAB 1,000 CCU SUMMARY ===",
    `HTML p95        : ${p("html_ms").toFixed(0)} ms`,
    `Feed API p95    : ${p("feed_api_ms").toFixed(0)} ms`,
    `Script switch p95: ${p("script_switch_ms").toFixed(1)} ms`,
    `AI p95          : ${p("ai_ms").toFixed(0)} ms`,
    `AI degraded     : ${(data.metrics.ai_degraded_rate?.values?.rate ?? 0) * 100}%`,
    `HTTP failure    : ${(fail * 100).toFixed(2)}%`,
    `Checks          : ${(data.metrics.checks?.values?.rate ?? 0) * 100}%`,
    "",
  ];
  return {
    stdout: lines.join("\n"),
    "reports/k6-1000ccu-summary.json": JSON.stringify(data, null, 2),
  };
}
```

### 6.3 How to read the results

| Signal | Meaning | Action |
|---|---|---|
| `html_ms` p95 > 800 ms but `feed_api_ms` normal | origin/CDN problem | check `cf-cache-status`, purge, inspect Hostinger CPU |
| `feed_api_ms` p95 > 150 ms | DB/index problem | `EXPLAIN` the feed query, check `pg_stat_statements` |
| `feed_api_ms` p99 ≫ p95 | lock contention or cold cache | check `poem_stats` trigger, autovacuum |
| `script_switch_ms` high | payload too large / JS main thread | reduce per-poem payload or move filtering off-thread |
| `ai_degraded_rate` > 2% | queue/bucket too tight or provider throttling | raise cache TTL, lower `max_tokens`, check hit rate |
| `http_req_failed` > 1% | CDN/origin saturation | scale down VUs, add cache, verify CDN is proxying |

### 6.4 Mock AI contract (must exist before the test is meaningful)

In `server.mjs`, behind a non-production gate:

```js
const MOCK = process.env.ALLOW_MOCK_AI === "1";

if (MOCK && req.query.mock === "1") {
  await new Promise((r) => setTimeout(r, 60 + Math.random() * 90)); // 60–150 ms
  return res.json({ poem: MOCK_POEM, error: null, mock: true });
}
```

`ALLOW_MOCK_AI` must be `0`/absent in production. Without this, §6 cannot be run safely — which is exactly the trap the brief warns about.

### 6.5 Pre-launch verification checklist

**Delivery & cache**

- [ ] `curl -sI https://ekkhwaab.in/ | grep -i cf-cache-status` → `HIT` on second request
- [ ] `/assets/*` returns `cache-control: public, max-age=31536000, immutable`
- [ ] HTML returns `s-maxage=300, stale-while-revalidate=86400`
- [ ] `www` and typo domains 301 to apex in one hop
- [ ] `/api/*` is **not** cached at the edge
- [ ] Unknown `/poetry/xyz` returns 404, not the SPA shell with 200
- [ ] `dist/` contains no `*.zip`, no `*.map` unless intended, no stray files with spaces

**Database**

- [ ] `EXPLAIN` on the feed uses `idx_poems_feed_cursor` and no `SubPlan`
- [ ] `pg_index.indisvalid` is true for every new index
- [ ] `poem_stats` backfill count == `poems` count
- [ ] Like → `poem_stats` +1 and `poems.daad_count` mirror +1
- [ ] `get_feed_page` returns ≤ 3 comments per poem
- [ ] `anon` cannot `select` from `poems` / `public_shayars` / `comments`
- [ ] `anon` **can** read `safe_poems_feed` and `public_shayar_directory`
- [ ] `auth_user_id` is not returned by any anon request
- [ ] Gumnaam poem: `shayar_uid = 'EK-GUMNAAM'`, `takhallus = 'Gumnaam_Shayar'` from **both** the view and any RPC
- [ ] Rate triggers reject the 11th poem/hour and the 21st comment/hour
- [ ] `statement_timeout` set for `anon` and `authenticated`

**Render / AI**

- [ ] `/health` < 200 ms after 10 min idle (or Starter plan, never sleeps)
- [ ] `/ready` returns 503 when `GROQ_API_KEY` is missing
- [ ] Two identical requests → second returns `X-Cache: HIT` in < 5 ms
- [ ] 50 concurrent requests → no 500s; excess returns 200 with `X-Degraded`
- [ ] `Retry-After` present on degraded responses
- [ ] Rate limiter keys on `CF-Connecting-IP`, not a shared edge IP
- [ ] Groq call count for a 30-minute soak < 2,000
- [ ] `ALLOW_MOCK_AI` is `0` in production
- [ ] Groq key exists only in Render env, never in a bundle or repo

**Frontend**

- [ ] Entry chunk < 95 kB gzip (target < 90)
- [ ] `/studio` and `/ai-poet` chunks are not in the initial load
- [ ] Navigating `/` → `/feed` → `/` → `/feed` issues **one** feed request (DevTools Network)
- [ ] Liking one card does not re-render all cards (React Profiler)
- [ ] Search typing keeps INP < 100 ms on a 4× CPU throttle
- [ ] Offline: feed shows seeds, AI shows curated poem, no white screen
- [ ] Card export 10× in a row: flat memory, no leaked object URLs
- [ ] Urdu toggle does not shift layout (CLS < 0.02)

**SEO**

- [ ] `sitemap.xml` is an index; child sitemaps return 200
- [ ] `lastmod` differs per URL and matches real content dates
- [ ] `/studio`, `/card-studio`, `/letters`, `/secret-letters` canonicalise consistently
- [ ] `/auth` and `/profile` are `noindex`
- [ ] A newly published poem appears in `/sitemap-ugc-1.xml` within 1 hour
- [ ] `/poetry/<new-slug>` returns HTML with the poem's title, description, canonical, and JSON-LD (view source, not DevTools)
- [ ] Rich Results Test passes for `CreativeWork`
- [ ] Lighthouse mobile: LCP < 1.8 s, CLS < 0.02, INP < 100 ms (lab)

**Reliability**

- [ ] Each route has its own `errorComponent`; a forced throw in `/feed` keeps the nav and footer
- [ ] Render restart during an AI call → client falls back in < 13 s with a message
- [ ] Supabase 503 (simulated via `blockNetwork`) → feed shows seeds + "curated mehfil" chip
- [ ] Error beacon receives a test exception with route + version, no PII
- [ ] Rollback to previous `dist/` completes in < 60 s
- [ ] Synthetic checks green from 3 regions for 24 h before launch

**Security**

- [ ] `curl -X POST` from a non-browser client is blocked by Turnstile/token on AI routes
- [ ] 5 wrong khat guesses → lockout; 6th from a different IP still allowed (ledger is per-IP)
- [ ] CSP has `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`
- [ ] `X-Frame-Options: DENY` present
- [ ] No `auth_user_id`, `secret_answer`, `recipient_identifier`, or real email appears in any network response
- [ ] PostgREST `select=*` on `public_shayars` as anon → 401/403
- [ ] Rate-limit matrix tested layer by layer (WAF → Render → DB → client)

---

## 7. Roadmap, Cost Model & Risk Register

### 7.1 Phased rollout

| Phase | Time | Work | Exit criteria |
|---|---|---|---|
| **P0 — Stop the bleeding** | Day 1 (2 h) | Cloudflare proxy + cache rules; `.htaccess` `s-maxage` + `immutable`; `trust proxy`/`CF-Connecting-IP`; Render daily budget | HTML `cf-cache-status: HIT`; no global 429 |
| **P1 — Privacy + DB** | Day 2 (3 h) | Migration §4 (indexes, view, poem_stats, grants, slug, translation state) | `EXPLAIN` clean; anon cannot read `poems`/`auth_user_id` |
| **P2 — Client read path** | Day 3–4 (1 d) | `useInfiniteQuery` feed cache, combined query, memoised cards, split contexts | one request per feed mount; INP < 100 ms |
| **P3 — AI pipeline** | Day 5 (1 d) | §5 module, write-once translation job, mock endpoint, keep-alive | 55%+ cache hit; zero 500s at 50 concurrent |
| **P4 — Bundle + fonts** | Day 6 (1 d) | `manualChunks`, lazy Studio, AVIF logos, self-hosted fonts, Nastaliq on demand | entry < 95 kB gz; LCP < 1.8 s |
| **P5 — SEO hybrid** | Week 2 (2 d) | slug routing, dynamic sitemap, Worker SEO shell, canonical fixes | new poem indexable < 1 h |
| **P6 — Load test + tune** | Week 2 (1 d) | k6 at 1,000 CCU, fix thresholds, chaos drills | all thresholds green; degradation matrix verified |
| **P7 — Realtime (if shipping)** | Week 3 (3 d) | `/listen-together` per §3.6, room-scoped sockets, drift telemetry | 0 sockets for readers; drift < 250 ms |
| **P8 — Optional** | Month 2 | Cloudflare Pages migration, Meilisearch, WebRTC rooms, image pipeline | — |

### 7.2 Cost model at 1,000 CCU

| Item | Today | Target | Note |
|---|---|---|---|
| Hostinger shared | ~$3–5/mo | ~$3–5/mo | unchanged, now origin-only |
| Cloudflare | $0 | $0 | free plan is sufficient |
| Render | $0 (free, sleeps) | **$7/mo** (Starter) | or $0 + external ping, accepting cold starts |
| Supabase | $0 (5 GB egress) | **$25/mo** (Pro) | egress, backups, 500 realtime conns, no pausing |
| Groq | ~$0 on free tier (throttled) | **$5–20/mo** | pay-as-you-go after cache |
| Uptime monitor | $0 | $0 | UptimeRobot / cron-job.org |
| **Total** | **$3–5** | **$40–57/mo** | |

Cheaper path if budget is fixed at $0: keep Supabase free **only if** the anon feed is served from the edge snapshot (target < 1 GB/month) and the project is active weekly (free projects pause after 7 days of inactivity). Otherwise the $25 Pro plan is not optional at this scale — it is the egress bill.

### 7.3 Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Cloudflare caching a user-specific HTML | low | high (privacy) | no SSR personalisation; `Vary` audit; cache rule bypass on `/auth`, `/profile` |
| Migration locks during peak | low | high | `psql -f` autocommit, `CONCURRENTLY`, off-peak window |
| Revoking anon grants breaks the feed | medium | high | deploy client change first; keep view grants; rollback SQL ready |
| AI cache poisoning (bad JSON cached) | low | medium | validate before `cache.set`; line-count equality check |
| Groq model deprecation | medium | medium | model name in env, fast-model fallback, curated engine |
| Render free restart mid-test | high | low | test against staging, or Starter |
| k6 test hits live Groq | medium | **critical** | `MOCK_AI=1` guard + `ALLOW_MOCK_AI` + no live key in staging |
| `poem_stats` drift from `poems.daad_count` | low | low | mirror trigger + nightly reconciliation query |
| Slug collisions | low | low | `id` suffix guarantees uniqueness |
| SEO Worker becomes a data leak | medium | high | mask `is_gumnaam` in the Worker; service key stays server-side; Kabir review gate |

### 7.4 What success looks like at 1,000 CCU

```
Edge HTML hit ratio              > 90%
Hostinger CPU                    < 5%
Supabase queries per feed mount  1 (anon, snapshot) / 1 (auth, keyset)
Supabase monthly egress          < 1 GB anon + < 10 GB auth
Feed p95                         35–45 ms
AI cache hit rate                > 55%
AI 5xx rate                      0%
AI degraded rate                 < 2%
Realtime sockets                 0 for readers, < 20 for rooms
Entry JS                         < 95 kB gzip
LCP / INP / CLS                  1.6 s / 90 ms / 0.01
Privacy leaks                    0 (verified by anon grant probe + gumnaam probe)
Monthly infra                    ~$40–57
```

---

## Appendix A — Findings register (full)

| ID | Sev | Area | Evidence | Fix | Effort |
|---|---|---|---|---|---|
| F-01 | P0 | Delivery | `.htaccess` `text/html max-age=0`; no CDN | §3.1 cache rules + `s-maxage` | 2 h |
| F-02 | P0 | Privacy | `20261110` policy `USING (true)` on `public_shayars` | column grants + anon revoke (§4.10) | 1 h |
| F-03 | P0 | Rate limit | `server.mjs:13` `trust proxy 1` | `clientKey()` on `CF-Connecting-IP`; hops `2` only once proxied | 30 m |
| F-04 | P1 | Bundle | 216.8 kB gz entry, no `manualChunks` | §3.3 chunk plan | 4 h |
| F-05 | P1 | Data | `poems.service.ts:45-111` 2 RTT, no cap | `get_feed_page` + SWR | 1 d |
| F-06 | P1 | AI abuse | no auth on `/api/ai/*` | Turnstile + budget | 3 h |
| F-07 | P1 | Privacy | `poems` anon SELECT | revoke + view-only | 1 h |
| F-08 | P1 | AI | no queue/cache | §5 pipeline | 1 d |
| F-09 | P1 | AI/data | browser fire-and-forget translation | write-once + cron sweep | 1 d |
| F-10 | P2 | DB | wide-row `daad_count` | `poem_stats` | 3 h |
| F-11 | P2 | DB | `created_at`-only cursor | `(created_at,id)` keyset | 3 h |
| F-12 | P2 | SRE | root-only error boundary | per-route `errorComponent` | 2 h |
| F-13 | P2 | Canvas | no `revokeObjectURL`, no null `toBlob` | §3.7 | 1 h |
| F-14 | P2 | SEO | `/studio` + `/card-studio` | 301 + canonical | 1 h |
| F-15 | P2 | SEO | `lastmod` = build date | real dates | 2 h |
| F-16 | P2 | UX/data | Studio "Post to Feed" local only | `createPoem()` | 2 h |
| F-17 | P3 | SEO | global `X-Robots-Tag` | conditional | 30 m |
| F-18 | P3 | AI | model name drift | single env default | 15 m |
| F-19 | P3 | Deploy | `dist/ai-poet.zip` 1.8 MB | clean build output | 10 m |
| F-20 | P3 | SEO | filename with space | rename | 5 m |

## Appendix B — Persona → file ownership map

| Persona | Primary files |
|---|---|
| Vikram | `.htaccess`, `render.yaml`, `vite.config.ts`, DNS |
| Ayaan | `supabase/migrations/*`, feed RPCs, indexes |
| Zoya | `store.tsx`, `feed.tsx`, `PoemCard.tsx`, `vite.config.ts`, `router.tsx` |
| Kabir | `server.mjs`, `khats.service.ts`, migrations (grants/policies), `.htaccess` CSP |
| Rohan | `render-api/server.mjs`, `render-api/lib/*`, `translation.service.ts`, `poems.service.ts` |
| Sana | `routes/listen-together.tsx` (new), `lib/realtime.ts` (new) |
| Dev | `routes/studio.tsx` |
| Noor | `scripts/prerender-seo.mjs`, `scripts/generate-sitemap.ts`, `public/robots.txt`, `.htaccess`, Worker |
| Rhea | `__root.tsx`, route files, `scripts/loadtest-1000ccu.js` (new), CI |
| Arjun | `routes/index.tsx`, `feed.tsx`, `ai-poet.tsx`, `letters.tsx`, `__root.tsx` |

## Appendix C — Companion upgrade packets

| File | Contents |
|---|---|
| `docs/upgrades/00-INDEX.md` | deploy order, dependencies, rollback |
| `docs/upgrades/01-database-high-concurrency.md` | migration packet + verification + rollback |
| `docs/upgrades/02-render-ai-cache-and-queue.md` | `ai-pipeline.mjs` + `server.mjs` diff + env |
| `docs/upgrades/03-frontend-swr-and-chunks.md` | `feed-cache.ts`, hooks, context split, `manualChunks` |
| `docs/upgrades/04-edge-cache-and-litespeed.md` | `.htaccess` rewrite, Cloudflare rules, cache matrix |
| `docs/upgrades/05-realtime-listen-together.md` | room protocol spec (pre-implementation) |
| `docs/upgrades/06-loadtest-and-launch-runbook.md` | k6 usage, chaos drills, go/no-go |

---

**End of blueprint.** Every number in this document is either measured from the repository (bundle sizes, URL counts, line references) or derived from an explicit assumption stated in §1.3. Where a feature named in the brief does not exist, that is stated rather than invented (§0.4). The upgrade packets in `docs/upgrades/` are written to be applied without changing the clean white editorial UI.

