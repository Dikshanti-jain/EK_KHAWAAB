# Packet 06 — Load Test, Chaos Drills & Launch Runbook

**Owner:** Rhea · **Risk:** low (read-only) · **Time:** 1 day · **Reversible:** n/a

Full script: [`ARCHITECTURE_AND_SCALING_BLUEPRINT.md` §6.2](../../ARCHITECTURE_AND_SCALING_BLUEPRINT.md#62-scriptsloadtest-1000ccujs). This packet is how to run it without burning the Groq quota, how to read the output, and the go/no-go gate for launch.

## 0. What the test proves — and what it does not

| Proves | Does not prove |
|---|---|
| origin + CDN sustain ~1,000 concurrent readers | browser rendering, INP, CLS |
| the feed query stays under 150 ms p95 at 20 rps | memory on a 2 GB Android |
| AI degradation is graceful at 8 req/s | real Groq throughput (AI is mocked) |
| cache hit ratio and egress per request | Supabase connection-pool behaviour above 50 direct connections |
| the degradation matrix returns the right status codes | WebSocket sync accuracy |

Core Web Vitals need Lighthouse/Playwright, not k6. Do not put "LCP < 1.8 s" on a k6 report; it is not measured there.

## 1. Safety rules (non-negotiable)

1. **`MOCK_AI=1` always.** The AI scenario must hit a staging Render service with `ALLOW_MOCK_AI=1`. A 1,000-VU run against live Groq consumes the daily quota in under 30 seconds and can suspend the key.
2. **Never run writes against production.** The script is read-only. Khat and any future like/comment scenarios run against staging only.
3. **Warm the edge first.** 30 VUs for 2 minutes, then the full profile. A cold cache measures Hostinger, not the architecture — label that run separately.
4. **Bypass the production WAF for the AI scenario.** Packet 04 adds a 30 req/min edge limit on `/api/ai/*`. The k6 AI scenario does 8 req/s. Point `API_BASE` at the **staging Render URL**, not `api.ekkhwaab.in`.
5. **Watch the bill.** 20 minutes at ~230 kB/s is ~275 MB of Supabase egress. Acceptable once. Without the client cache it would be ~2.7 GB.
6. **Kill switch ready.** Keep the Cloudflare "Under Attack" toggle and the Render suspend button in reach. If origin p95 crosses 3 s for 5 minutes, stop the test; do not "wait and see".

## 2. Pre-flight

### 2.1 Staging must exist

The test is only meaningful if staging mirrors production:

- [ ] staging Supabase project with ≥ 500 poems, ≥ 2,000 likes, ≥ 1,000 comments
- [ ] packet 01 migration applied (indexes, `get_feed_page`, grants)
- [ ] staging Render service with `ALLOW_MOCK_AI=1`, `TURNSTILE_ENFORCE=0`, `AI_DAILY_BUDGET=2000`
- [ ] staging Hostinger copy with the packet 04 `.htaccess`
- [ ] Cloudflare staging hostname proxied (or the test measures origin only — say which)
- [ ] `reports/` directory exists in the k6 working directory

```bash
mkdir -p reports
k6 version   # v0.50+ required for the thresholds syntax used
```

### 2.2 Environment

```bash
export BASE_URL=https://staging.ekkhwaab.in
export SUPABASE_URL=https://<staging-proj>.supabase.co
export SUPABASE_ANON_KEY=<staging-anon-key>
export API_BASE=https://ek-khawaab-api-staging.onrender.com
export MOCK_AI=1
```

Do **not** export `KHAT_ID` unless you intend to exercise the khat RPC. Leaving it unset makes that scenario sleep and exit, which is the safe default.

Run k6 from a region close to the Supabase project (ap-south-1 / ap-southeast-1). The `feed_api_ms` threshold includes the runner's network RTT; a laptop on another continent will fail 150 ms on distance alone, and you will spend a day tuning an index that was never the problem.

### 2.3 Warm-up

```bash
k6 run scripts/loadtest-1000ccu.js \
  --vus 30 --duration 2m \
  -e BASE_URL="$BASE_URL" \
  -e SUPABASE_URL="$SUPABASE_URL" \
  -e SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
  -e API_BASE="$API_BASE" \
  -e MOCK_AI=1
```

Then confirm the edge is warm:

```bash
curl -sI "$BASE_URL/feed" | grep -i cf-cache-status   # HIT
curl -sI "$BASE_URL/assets/$(curl -s "$BASE_URL/feed" | grep -o 'assets/[^"]*\.js' | head -1)" | grep -i cf-cache-status
```

If the second request is still `MISS`, stop. The cache rule is wrong, and the full run will measure the origin's CPU limit.

## 3. Run the 1,000-CCU profile

```bash
k6 run scripts/loadtest-1000ccu.js \
  -e BASE_URL="$BASE_URL" \
  -e SUPABASE_URL="$SUPABASE_URL" \
  -e SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
  -e API_BASE="$API_BASE" \
  -e MOCK_AI=1
```

Duration: ~19 minutes (the longest ramping scenario; creators/AI run 17 minutes).

What the profile represents:

| Scenario | VUs / rate | Share | Traffic |
|---|---|---|---|
| `readers` | 700 ramping VUs | 70% | `/feed` HTML + feed API + 30% poem detail |
| `browsers` | 150 VUs | 15% | `/dictionary`, word pages, topics |
| `creators` | 80 constant VUs | 8% | `/studio` HTML only (canvas is client-local) |
| `ai` | 1→8 req/s, max 60 VUs | 5% | mocked AI, repeated payloads to measure cache |
| `khatUsers` | 20 VUs (skipped) | 2% | staging khat RPC only |

The persistent VU total is 950; the AI arrival rate adds ~30 in-flight requests at 8 req/s with 2–6 s think time. That is the "1,000 CCU" model. It is a model; say so in the report.

During the run, watch in a second terminal:

```bash
# origin health, every 10 s
while true; do
  curl -s -o /dev/null -w '%{http_code} %{time_total}s\n' "$BASE_URL/feed"
  sleep 10
done
```

And in the dashboards: Cloudflare cache hit ratio, Hostinger CPU, Supabase `pg_stat_activity` by state, Render memory and event-loop lag.

## 4. Patch the script to measure the real query

The blueprint script calls PostgREST `/safe_poems_feed` directly. After packet 03, the app calls `get_feed_page`. Measure what ships.

```js
// replace getFeed() in scripts/loadtest-1000ccu.js
function getFeed(limit = 20, cursor = null) {
  const url = `${SB}/rest/v1/rpc/get_feed_page`;
  const body = JSON.stringify({
    p_cursor_created_at: cursor?.created_at ?? null,
    p_cursor_id: cursor?.id ?? null,
    p_mood: null,
    p_limit: limit,
  });
  const res = http.post(url, body, {
    headers: SB_HEADERS,
    tags: { name: "feed_api" },
  });
  feedTrend.add(res.timings.duration);

  let rows = [];
  try { rows = res.json() ?? []; } catch { /* non-JSON error */ }

  const ok = check(res, {
    "feed 200": (r) => r.status === 200,
    "feed has rows": () => Array.isArray(rows) && rows.length > 0,
    "comments capped at 3": () =>
      Array.isArray(rows) && rows.every((p) => (p.recent_comments ?? []).length <= 3),
    "no auth_user_id": () =>
      Array.isArray(rows) && rows.every((p) => !("auth_user_id" in p)),
    "no gumnaam leak": () =>
      Array.isArray(rows) && rows.every((p) => !p.is_gumnaam || p.shayar_uid === "EK-GUMNAAM"),
  });
  if (!ok) errors.add(1);
  res.rows = rows;   // keep the original response API for the reader scenario
  return res;
}
```

The rest of `reader()` still works (`feed.status`, `feed.json()`). The keyset check becomes:

```js
const page1 = getFeed(20);
if (page1.status === 200 && page1.rows.length) {
  const last = page1.rows[page1.rows.length - 1];
  const page2 = getFeed(20, last);
  if (page2.status === 200) {
    const ids1 = new Set(page1.rows.map((p) => p.id));
    check(page2.rows, {
      "cursor does not repeat rows": (rows) => rows.every((p) => !ids1.has(p.id)),
    });
  }
}
```

If you keep the original `safe_poems_feed` call as well, label the metric `feed_legacy_ms`; do not mix them in one Trend.

## 5. Reading the results

Hard thresholds in the script:

| Metric | Threshold | If it fails |
|---|---|---|
| `http_req_failed` | < 1% | CDN or origin saturation; reduce VUs, verify proxy |
| `html_ms{scenario:readers}` p95 | < 800 ms | origin/CDN; check `cf-cache-status`, Hostinger CPU |
| `feed_api_ms` p95 / p99 | < 150 / < 400 ms | `EXPLAIN` the RPC; check indexes, `poem_stats`, autovacuum |
| `script_switch_ms` p95 | < 25 ms | JSON payload too large or parse cost; this is **not** INP |
| `ai_ms{scenario:ai}` p95 | < 200 ms | mock is slow or queue is saturated; check `Gate` stats |
| `ai_degraded_rate` | < 2% | queue/bucket too tight; check cache hit rate and `max_tokens` |
| `checks` | > 99% | one assertion is wrong or a dependency is leaking data |

Triage order:

```
http_req_failed high?
├─ yes → is cf-cache-status HIT? no → cache rule / purge / origin
│        yes → Hostinger CPU / PHP workers / .htaccess loop
└─ no  → feed p95 high?
         ├─ yes → EXPLAIN (ANALYZE, BUFFERS) the RPC
         │        ├─ Seq Scan → index missing or not used (packet 01)
         │        ├─ SubPlan → view still has the per-row auth predicate
         │        └─ heap fetch wide → select fewer columns / TOAST
         └─ no  → AI degraded?
                  ├─ yes → cache hit rate < 50%? key fragmentation / TTL
                  │        queue full? concurrency 4 is too low for the burst
                  └─ no  → checks failing → assertion bug or a real privacy leak
```

`feed_api_ms` p99 ≫ p95 usually means lock contention or a cold cache, not a missing index. Check `pg_stat_activity` waits and `pg_stat_statements` during the run, not after.

## 6. Chaos drills (30 minutes, staging)

Run these **after** the load test passes, not during it.

| Drill | How to simulate | Expected | Fail if |
|---|---|---|---|
| Supabase read down | DevTools → block `*.supabase.co`, reload `/feed` | 16 seeds + "curated mehfil" chip, no white screen | blank feed or console-only error |
| Supabase write fails | block `*.supabase.co`, tap like | optimistic rollback + toast | like appears saved but is not |
| Render asleep / 5xx | suspend the staging Render service, submit AI | curated poem in ≤ 13 s + message | spinner forever / 500 toast |
| Groq budget exhausted | set `AI_DAILY_BUDGET=0`, restart staging | `X-Degraded: ai_budget_exhausted`, HTTP 200 | 500 |
| Groq 429 | point `GROQ_API_KEY` at an exhausted key | one fast-model retry, then degraded | retry storm in logs |
| CDN purge mid-run | purge `/feed` during 100 VUs | origin absorbs briefly; p95 recovers < 2 min | origin 503 |
| Slow DB | `ALTER ROLE anon SET statement_timeout='80ms'` on staging | queries cancel; seeds fallback | connections pile up |
| WebSocket drop | DevTools offline 10 s, then online | reconnect ≤ 8 s, resync, no runaway drift | guest keeps playing desynced |
| Deploy during traffic | upload a new `dist/` at 100 VUs | old hashed assets still resolve; no chunk 404 | white screen |
| Rollback | swap `dist.prev` | < 60 s, no 404 | cache purge needed for assets |

The last two are the ones teams skip. They are the ones that turn a launch into an incident.

## 7. Go / no-go gate

Every line needs an **evidence artifact** (curl output, k6 summary, screenshot, SQL result), not a verbal "looks fine".

### Delivery

- [ ] second request to `/feed` → `cf-cache-status: HIT` (curl log)
- [ ] `/assets/*` → `immutable` (curl log)
- [ ] HTML → `s-maxage=300, stale-while-revalidate=86400`
- [ ] `www` → apex in one hop
- [ ] `/api/*` never edge-cached
- [ ] unknown `/poetry/xyz` → 404
- [ ] `dist/` has no `*.zip`, no stray filenames with spaces (the current `dist/ai-poet.zip` must be deleted)

### Database

- [ ] `EXPLAIN` uses `idx_poems_feed_cursor`, no `SubPlan`
- [ ] every new index `indisvalid = true`
- [ ] anon cannot `select` from `poems`, `public_shayars`, `comments`
- [ ] anon **can** read `safe_poems_feed` and call `get_feed_page`
- [ ] `auth_user_id` absent from every anon response
- [ ] gumnaam poem masks author in the view **and** the RPC
- [ ] 11th poem/hour and 21st comment/hour rejected
- [ ] `statement_timeout` set for `anon`/`authenticated`

### AI

- [ ] `/health` < 200 ms after 10 min idle (Starter, never sleeps)
- [ ] `/ready` → 503 with no `GROQ_API_KEY`
- [ ] identical request twice → `X-Cache: HIT`, < 5 ms
- [ ] 50 concurrent → zero 500s, excess `X-Degraded`
- [ ] `Retry-After` on every degraded response
- [ ] limiter keyed on the real client IP (packet 02 §1)
- [ ] `ALLOW_MOCK_AI=0` in production
- [ ] Groq key only in Render env

### Frontend

- [ ] entry chunk < 95 kB gzip (budget script output)
- [ ] `/studio` and `/ai-poet` not in the initial load
- [ ] `/`→`/feed`→`/`→`/feed` issues one feed request
- [ ] search INP < 100 ms at 4× throttle (Performance panel)
- [ ] offline → seeds + curated, no white screen
- [ ] 10 card exports in a row: flat memory, no leaked blob URLs
- [ ] Urdu toggle CLS < 0.02

### SEO

- [ ] `sitemap.xml` is an index; children 200
- [ ] `lastmod` differs per URL and matches real dates
- [ ] `/studio` vs `/card-studio`, `/letters` vs `/secret-letters` canonicalise consistently
- [ ] `/auth`, `/profile` are `noindex`
- [ ] new poem appears in `/sitemap-ugc-1.xml` within 1 hour
- [ ] `/poetry/<new-slug>` returns real HTML with title/description/canonical/JSON-LD
- [ ] Rich Results Test passes for `CreativeWork`
- [ ] Lighthouse mobile: LCP < 1.8 s, CLS < 0.02, INP < 100 ms

### Reliability

- [ ] each heavy route has its own `errorComponent`; a throw in `/feed` keeps nav/footer
- [ ] Render restart mid-AI → fallback < 13 s with a message
- [ ] Supabase 503 → seeds + chip
- [ ] error beacon receives a test exception with route + version, no PII
- [ ] rollback < 60 s
- [ ] synthetic checks green from 3 regions for 24 h

### Security

- [ ] non-browser POST to AI → 403 (Turnstile)
- [ ] 5 wrong khat guesses → lockout; different IP still allowed
- [ ] CSP has `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`
- [ ] `X-Frame-Options: DENY`
- [ ] no `auth_user_id`, `secret_answer`, `recipient_identifier`, or real email in any response
- [ ] anon `select=*` on `public_shayars` → 401/403
- [ ] rate limits tested layer by layer: WAF → Render → DB → client

**Decision rule:** one red line in Delivery, Database, Security or Reliability = **no-go**. A red line in SEO or Frontend = **go with a named owner and a 7-day fix date**, because neither can take the site down on day one.

## 8. Launch timeline

| When | Action | Owner | Evidence |
|---|---|---|---|
| T-7 d | freeze schema; apply packet 01 to staging; run the 1,000-CCU test | Ayaan/Rhea | k6 summary |
| T-5 d | apply packet 04 to staging; verify HIT + 404 + headers | Noor | curl log |
| T-3 d | production dry run at 100 VUs, off-peak (02:00–04:00 IST) | Rhea | k6 summary |
| T-2 d | deploy packets 02 + 03 to production behind flags (`TURNSTILE_ENFORCE=0`) | Rohan/Zoya | build + smoke |
| T-1 d | `pg_dump` production; snapshot `.htaccess`; pin the Render deploy; warm cache; start synthetic checks | Dev/Rhea | backup path, monitor URL |
| T-1 d | enable Turnstile; watch 403 rate for 1 h | Kabir | dashboard |
| T-0 | deploy assets → HTML → `.htaccess`; purge `/` and `/feed`; run smoke | Dev | §9 |
| T+1 h | watch p95, 5xx, AI degraded, DB connections, egress | Rhea | dashboard |
| T+24 h | review the four dashboards; tune cache TTL; publish the incident log if any | all | report |

## 9. Post-deploy smoke (5 minutes)

```bash
BASE=https://ekkhwaab.in

# 1. shell + cache
curl -sI "$BASE/feed" | grep -iE 'HTTP|cf-cache-status|cache-control'
curl -sI "$BASE/feed" | grep -i cf-cache-status   # HIT

# 2. a real poem page
curl -s "$BASE/poetry/ab-kisi-baat-pe-dil-dukhta-nahi" | grep -o '<title>[^<]*' | head -1

# 3. API
curl -s "$BASE/api/health" -o /dev/null -w '%{http_code}\n' || true
curl -s https://api.ekkhwaab.in/health | jq
curl -s https://api.ekkhwaab.in/ready | jq

# 4. edge identity (must not be a CF edge IP)
curl -s https://api.ekkhwaab.in/health -H 'X-Request-Id: smoke-1' -D- -o /dev/null | grep -i x-request-id

# 5. privacy
curl -s "$SUPABASE_URL/rest/v1/poems?select=*&limit=1" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON" -o /dev/null -w '%{http_code}\n'
# 401/403

# 6. AI degrade path (no token, should be 403, not 500)
curl -s -X POST https://api.ekkhwaab.in/api/ai/shayar \
  -H 'content-type: application/json' -d '{"situation":"smoke","seeds":["chai"]}' \
  -o /dev/null -w '%{http_code}\n'
# 403 when Turnstile is enforced

# 7. assets
ASSET=$(curl -s "$BASE/feed" | grep -o '/assets/[^"]*\.js' | head -1)
curl -sI "$BASE$ASSET" | grep -iE 'HTTP|cache-control'
```

## 10. Rollback triggers

| Signal | Threshold | Action |
|---|---|---|
| HTML p95 | > 2 s for 10 min | disable HTML cache rule? No — first check origin CPU; if origin is saturated, purge and serve from cache is already happening. Scale Hostinger or enable "Under Attack". |
| 5xx rate | > 5% for 5 min | roll back `dist/` to `dist.prev`, purge |
| AI degraded | > 20% for 10 min | raise `AI_DAILY_BUDGET`, lower `max_tokens`, or disable the AI route in the UI |
| DB CPU | > 80% for 10 min | revoke `anon` base-table grants if not already, check slow queries, increase Supabase compute |
| DB connections | > 80% of pool | check for a connection leak in a new client; restart Render |
| Error beacon | 10× baseline | roll back the last frontend deploy |
| Auth failures | > 5% of sign-ins | check Supabase Auth status before touching the app |

The default rollback is **frontend only**: swap `dist.prev` and purge HTML. It fixes most launch-day regressions in under a minute. Database migrations are forward-only in this programme; packet 01 has a separate `DROP` rollback and should not be run in reverse during an incident.

## 11. After the test: what to record

Write these into `docs/upgrades/RESULTS-<date>.md` (create it, do not edit this packet):

```
profile:            950 persistent VUs + 8 rps AI
duration:           19 min
html p95:           ___ ms
feed p95 / p99:     ___ / ___ ms
http_req_failed:    ___ %
ai p95:             ___ ms
ai degraded:        ___ %
cache hit (edge):   ___ %
supabase egress:    ___ MB
origin CPU peak:    ___ %
render memory:      ___ MB
failures:           ___
decision:           GO / NO-GO
```

The number that matters most is not p95. It is **cache hit ratio**. At 1,000 CCU, a 95% hit ratio means the origin sees 5% of the traffic; a 70% hit ratio means it sees six times more and the plan does not matter. If the hit ratio is low, fix the cache rule before tuning anything else.
