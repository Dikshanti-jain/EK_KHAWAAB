# Upgrade Packets — Index & Deploy Order

Companion to [`ARCHITECTURE_AND_SCALING_BLUEPRINT.md`](../../ARCHITECTURE_AND_SCALING_BLUEPRINT.md).

These packets are **specifications**, not applied changes. Nothing here has been merged into the app. Each packet is written so it can be executed by one engineer in one sitting, verified, and rolled back.

## Reading order

| # | Packet | Depends on | Time | Risk |
|---|---|---|---|---|
| 1 | [`01-database-high-concurrency.md`](./01-database-high-concurrency.md) | none | 3 h | medium (grants) |
| 2 | [`02-render-ai-cache-and-queue.md`](./02-render-ai-cache-and-queue.md) | none (04 for the proxied `api` host) | 1 d | low |
| 3 | [`03-frontend-swr-and-chunks.md`](./03-frontend-swr-and-chunks.md) | 01 (for the combined feed RPC) | 1 d | low |
| 4 | [`04-edge-cache-and-litespeed.md`](./04-edge-cache-and-litespeed.md) | none | 2 h | low |
| 5 | [`05-realtime-listen-together.md`](./05-realtime-listen-together.md) | none (new feature) | 3 d | medium |
| 6 | [`06-loadtest-and-launch-runbook.md`](./06-loadtest-and-launch-runbook.md) | 01–04 | 1 d | low |

## Hard dependency graph

```
04 (CDN + headers) ──┐
                     ├──► 06 (load test) ──► launch
01 (DB + grants) ────┤
                     │
02 (AI pipeline) ────┤
                     │
03 (client cache) ───┘

05 (realtime) — independent, ship after launch
```

Do **not** run `06` before `04`. A load test against an uncached origin measures Hostinger's CPU limit, not the architecture.

Do **not** deploy `01`'s grant revocation before `03`'s combined feed query is live, or the feed will 401 for anonymous readers. The view grant stays in place throughout, so the rollback is a one-line `GRANT`.

## The 90-minute version (if you only do four things)

1. Cloudflare proxy + HTML `s-maxage=300` + `/assets/*` immutable (packet 04).
2. `clientKey()` on `CF-Connecting-IP` (packet 02, §1). Keep `TRUST_PROXY_HOPS=1` while the API is still on `*.onrender.com`; set it to `2` only if you also proxy `api.ekkhwaab.in`.
3. `useInfiniteQuery` on `/feed` with `staleTime: 45_000` (packet 03).
4. `REVOKE ALL ON public.poems FROM anon` + `public_shayars` column grants (packet 01, §10).

That set removes the origin cliff, the global-429 cliff, the database amplification, and the privacy leak. It does not fix AI throughput (packet 02) or SEO (blueprint §3.8), but the product survives a launch.

## Definition of done for the whole programme

- [ ] `cf-cache-status: HIT` on `/feed`
- [ ] `EXPLAIN` on the feed query: index scan, no `SubPlan`
- [ ] anon `select=*` on `poems` and `public_shayars` returns 401/403
- [ ] one feed request per mount (Network tab, `/` → `/feed` → `/` → `/feed`)
- [ ] entry chunk < 95 kB gzip
- [ ] AI cache hit ≥ 55%, zero 5xx at 50 concurrent, curated fallback on failure
- [ ] k6 thresholds green at 1,000 VUs
- [ ] no reader opens a WebSocket

## Conventions used in these packets

- `✅ DO` / `❌ DON'T` mark non-obvious constraints.
- Code blocks are complete files or complete replacements unless marked `// diff`.
- Every packet ends with **Verify** and **Rollback**.
- No packet changes the visual design. If a change would alter spacing, colour, or copy, it is called out explicitly.

## What is deliberately *not* in these packets

| Tempting change | Why not |
|---|---|
| Rewrite in Next.js / Remix for ISR | 2-week rewrite for a problem a Worker + sitemap solves in 2 days |
| Redis for caching | a new failure domain for a 40 MB in-process problem |
| Sharded counters | only needed above ~500 likes/s; current model peaks at 50 |
| Self-hosted WebSocket server | 10 rooms do not justify sticky sessions |
| Delete `/explore`, `/card-studio`, `/letters` | inbound links exist; 301 and canonicalise instead |
| Add a component library | the UI is intentionally bespoke; more JS is the opposite of the goal |
