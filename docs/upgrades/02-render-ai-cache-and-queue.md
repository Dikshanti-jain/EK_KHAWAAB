# Packet 02 — Render AI: Cache, Queue & Edge Identity

**Owner:** Rohan (pipeline) · Kabir (edge identity, Turnstile) · **Risk:** low · **Time:** 1 day · **Reversible:** yes

Full module source: [`ARCHITECTURE_AND_SCALING_BLUEPRINT.md` §5.2](../../ARCHITECTURE_AND_SCALING_BLUEPRINT.md#52-render-apilibai-pipelinemjs). This packet is the execution runbook around it: the identity fix that must land first, the middleware order, the human gate, the deploy config, and the rollback.

## 0. What this packet buys

| Today | After |
|---|---|
| 50 concurrent requests → ~45 Groq 429s → client 500s | 4 in flight, 24 queued, rest get honest `X-Degraded` in ≤ 8 s |
| Every request is an upstream call | 55%+ generation hit rate, 85%+ translation |
| `req.ip` is Cloudflare's edge IP, so 12 req/10 min is a **global** limit | per-real-client limit (F-03) |
| Free Render sleeps after 15 min → 30–60 s cold start | Starter plan, never sleeps |
| No budget ceiling | 2,000 upstream calls/day hard stop |
| Any script can POST to the AI routes | Turnstile token required on cache misses |

**Non-goals:** no Redis, no external queue, no per-user cache partitioning. At 17 RPM offered load, an in-process 40 MB LRU is the correct engineering choice; Redis adds a failure domain and a second network hop to a 3.5 s request.

## 1. Fix the identity before touching the cache (F-03)

This is the highest-severity item in the packet. The current line 13 of `render-api/server.mjs`:

```js
app.set("trust proxy", 1);
```

### What actually happens

```
browser ──► Cloudflare edge ──► Render proxy ──► Express
             sets XFF: <client>   appends <cf-edge-ip>
```

`X-Forwarded-For: 49.36.x.x, 172.70.x.x`. With `trust proxy 1`, Express trusts exactly one hop and resolves `req.ip` to the **right-most** entry — the Cloudflare edge IP. Every user behind that edge (often tens of thousands) shares one rate-limit bucket. Twelve AI requests in ten minutes across all of India, then `429` for everyone. It looks like a provider outage; it is a proxy configuration bug.

This is the shape as soon as `api.ekkhwaab.in` is proxied. Today `.env.example` points the client at `https://ek-khawaab-api.onrender.com` directly, where one hop is correct. Both cases are handled below; the danger is copying one setting into the other topology.

### The fix

There are two valid shapes. Pick by how the API hostname is proxied.

| API hostname | Chain | Setting | Key |
|---|---|---|---|
| `api.ekkhwaab.in` behind Cloudflare (recommended) | client → CF → Render → app | `trust proxy 2` | `CF-Connecting-IP`, verified by a shared edge header |
| `ek-khawaab-api.onrender.com` direct (today) | client → Render → app | `trust proxy 1` (correct as-is) | `req.ip` |
| Cloudflare Worker in front (Phase 3) | client → Worker → Render → app | `trust proxy 2` | `CF-Connecting-IP` |

`trust proxy 2` alone is not sufficient if the number of hops ever changes (Worker added, Render changes its proxy). The durable pattern is: **trust a header only when you can prove it came from your edge.**

```js
// ------------------------------------------------------------------
// 0. PROXY IDENTITY (must be the first app.set)
// ------------------------------------------------------------------
// TRUST_PROXY_HOPS=2 only when Cloudflare sits in front of Render and
// the edge secret is configured. Default 1 = direct onrender.com.
const hops = Number(process.env.TRUST_PROXY_HOPS ?? 1);
app.set("trust proxy", Number.isInteger(hops) && hops >= 1 && hops <= 3 ? hops : 1);
app.disable("x-powered-by");

const EDGE_SECRET = process.env.EDGE_SHARED_SECRET || "";

function safeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * The only function allowed to answer "who is calling?".
 * Order of trust:
 *   1. CF-Connecting-IP, but only if the request carries the edge secret
 *      injected by a Cloudflare Transform Rule (clients cannot forge it,
 *      because the rule overwrites the header on every request).
 *   2. req.ip, resolved through the numbered trust-proxy chain.
 */
function clientKey(req) {
  const edgeIp = req.get("cf-connecting-ip");
  const fromEdge = safeEqual(req.get("x-edge-secret"), EDGE_SECRET);
  if (edgeIp && fromEdge) return edgeIp.trim();
  return req.ip || req.socket.remoteAddress || "unknown";
}
```

Cloudflare setup (one rule, 2 minutes):

| Field | Value |
|---|---|
| Rule | Transform Rule → Request Header → Set |
| Expression | `http.host eq "api.ekkhwaab.in"` |
| Header | `X-Edge-Secret` = the value in Render's `EDGE_SHARED_SECRET` |
| Also | Enable **Pseudo IPv4** only if you need `CF-Connecting-IP` as IPv4; native IPv6 is fine as a key |

> ✅ DO set `TRUST_PROXY_HOPS=2` **and** the edge secret together when Cloudflare fronts the API. Leave `1` (the default) for direct `onrender.com`.
>
> ❌ DON'T use `app.set("trust proxy", true)`. It trusts the entire `X-Forwarded-For` chain, so any client can set `X-Forwarded-For: 1.2.3.4` and mint unlimited rate-limit keys.
>
> ❌ DON'T set `2` without Cloudflare in front. With one proxy, the second-from-right XFF entry is client-controlled, which is worse than the bug you are fixing.

### Keep the limiter's IPv6 validation quiet

`express-rate-limit@7.5` validates custom `keyGenerator`s and warns when the value can be a raw IPv6 address. `clientKey()` returns `req.ip` as a fallback, so either normalise it or disable that one validation:

```js
const aiRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientKey,
  validate: { keyGeneratorIpFallback: false }, // we resolve IPv6 ourselves
  message: { error: "Rate limit reached. Please wait a few minutes before requesting more AI verses." },
});
```

If you prefer not to disable a validation, import `ipKeyGenerator` from the package and wrap the fallback: `ipKeyGenerator(req.ip)`.

## 2. Middleware order (order is the security model)

Replace the top of `server.mjs` (lines 1–55) with this order. Each step depends on the previous one.

```js
// diff: replaces lines 1–55. clientKey() and safeEqual() from §1 sit
// between the app.set calls and the request-id middleware.
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import dotenv from "dotenv";
import { createAiPipeline } from "./lib/ai-pipeline.mjs";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const hops = Number(process.env.TRUST_PROXY_HOPS ?? 1);
app.set("trust proxy", Number.isInteger(hops) && hops >= 1 && hops <= 3 ? hops : 1);
app.disable("x-powered-by");

// 1. request id + structured access log
app.use((req, res, next) => {
  req.id = req.get("X-Request-Id") || randomUUID();
  res.setHeader("X-Request-Id", req.id);
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    console.log(JSON.stringify({
      level: "info",
      ts: new Date().toISOString(),
      id: req.id,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ms: Number(process.hrtime.bigint() - start) / 1e6,
      ip: clientKey(req),
      cache: res.getHeader("X-Cache") || null,
      degraded: res.getHeader("X-Degraded") || null,
    }));
  });
  next();
});

// 2. security headers (JSON API: no CSP needed, but lock the rest)
app.use((_, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin"); // CORS is explicit below
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  next();
});

// 3. CORS — a browser convenience, not an auth boundary
app.use(cors({ /* unchanged origin allowlist */ }));

// 4. body limit
app.use(express.json({ limit: "256kb" }));
```

Order rationale:

1. **identity** before the limiter, or the limiter keys on the proxy.
2. **request id** before the body parser, so a malformed JSON body still gets a correlation id in the 400.
3. **security headers** before routes, so even an error response carries `X-Content-Type-Options`.
4. **CORS** before body parsing is not required, but keeping it above means a preflight never allocates a JSON parser.
5. **body limit** last, immediately before routes.

No new dependency is required. Six `res.setHeader` calls cover a JSON-only service; the AI pipeline stays dependency-free.

## 3. Turnstile: price the AI request, not the page view

The AI routes are the only ones that can spend money. Gate every request, including a cache hit: a cached answer is cheap, but the cache key is not a secret, and without a token a script can enumerate it and scrape the generated corpus. The widget is invisible and costs ~100 ms on submit, which is noise next to a 3.5 s generation.

### 3.1 Server verifier

```js
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY || "";
const TURNSTILE_ENFORCE = process.env.TURNSTILE_ENFORCE === "1";

async function verifyTurnstile(req) {
  if (!TURNSTILE_ENFORCE) return { ok: true, skipped: true };
  if (!TURNSTILE_SECRET) return { ok: false, reason: "turnstile_unconfigured" };

  const token = req.get("cf-turnstile-response") || req.body?.turnstileToken;
  if (!token) return { ok: false, reason: "turnstile_missing" };

  const body = new URLSearchParams({
    secret: TURNSTILE_SECRET,
    response: token,
    remoteip: clientKey(req),
  });

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 2500);
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: controller.signal,
    });
    const j = await r.json();
    return { ok: Boolean(j.success), reason: j["error-codes"]?.join(",") || "turnstile_failed" };
  } catch {
    // Fail closed in production: a verifier outage must not become a free gateway.
    return { ok: false, reason: "turnstile_unreachable" };
  } finally {
    clearTimeout(t);
  }
}
```

Tokens are **single-use** and expire after 300 s. The client must call `turnstile.execute()` immediately before each submit, not on page load.

### 3.2 Where it sits in the route

```js
app.post("/api/ai/shayar", aiRateLimiter, async (req, res) => {
  const parsed = ShayarInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request payload", details: parsed.error.flatten() });
  }

  const gate = await verifyTurnstile(req);
  if (!gate.ok) {
    return res.status(403).json({ error: "Human verification failed", reason: gate.reason, requestId: req.id });
  }

  const result = await ai.run({ /* §5 */ });
  return res.status(result.status).set(result.headers).json(result.body);
});
```

### 3.3 Client (only if the AI form is touched)

```tsx
// src/lib/turnstile.ts — lazy loader, one script per page
let loaded: Promise<void> | null = null;
export function loadTurnstile() {
  loaded ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("turnstile_load_failed"));
    document.head.appendChild(s);
  });
  return loaded;
}

export async function turnstileToken(siteKey: string): Promise<string> {
  await loadTurnstile();
  const w = window as any;
  const el = document.createElement("div");
  el.style.display = "none";
  document.body.appendChild(el);

  return new Promise((resolve, reject) => {
    let id: string;
    const cleanup = () => {
      w.turnstile.remove(id);
      el.remove();
    };
    id = w.turnstile.render(el, {
      sitekey: siteKey,
      size: "invisible",
      execution: "execute",
      callback: (token: string) => {
        resolve(token);
        cleanup();
      },
      "error-callback": () => {
        reject(new Error("turnstile_failed"));
        cleanup();
      },
    });
    w.turnstile.execute(id);   // tokens are single-use and expire in 300 s
  });
}
```

The request then carries the token as a header:

```ts
const token = await turnstileToken(import.meta.env.VITE_TURNSTILE_SITE_KEY);
const res = await fetch(`${apiBase}/api/ai/shayar`, {
  method: "POST",
  headers: { "content-type": "application/json", "cf-turnstile-response": token },
  body: JSON.stringify(payload),
});
```

Add `VITE_TURNSTILE_SITE_KEY` to `.env` (the site key is public; the secret key lives only in Render). The CSP in packet 04 already allows `challenges.cloudflare.com` in `script-src`, `frame-src` and `connect-src`.

> ✅ DO keep `TURNSTILE_ENFORCE=0` until the widget is live on `/ai-poet`, then flip it and watch `403` rate for an hour.
>
> ❌ DON'T render the widget on every page. It is one script and one iframe; load it inside the AI route's submit handler.

**Trade-off, stated plainly:** a determined attacker can solve Turnstile at ~$1/1,000. The token is not a wall; it is a price floor that makes scripted quota exhaustion more expensive than the poem is worth. The real ceilings are the token bucket and the daily budget.

## 4. `ai-pipeline.mjs`: contract and tests

Create `render-api/lib/ai-pipeline.mjs` with the exact source from blueprint §5.2. The module exports `LruTtlCache`, `Gate`, `TokenBucket`, `Breaker`, and `createAiPipeline`.

| Export | Responsibility | Invariant |
|---|---|---|
| `LruTtlCache` | 2,000 entries / 40 MB / 6 h | never stores an entry larger than 5 MB |
| `Gate` | 4 concurrent, 24 queued | rejects with `QUEUE_FULL`, never grows unbounded |
| `TokenBucket` | 28 RPM, 11k TPM | reserves **before** dispatch, both dimensions |
| `Breaker` | 5 failures / 60 s → open 30 s | half-open sends exactly one probe |
| `createAiPipeline` | orchestrates all of the above | never throws to the route; always returns `{status, headers, body}` |

### Two contract decisions the blueprint leaves implicit

1. **The cache is global, not per user.** `createAiPipeline` takes no `clientKey`; per-IP fairness is Express's job. This is deliberate: two strangers asking for a monsoon couplet should share one upstream call. Do not "fix" it by adding an IP to the key — that drops the hit rate to zero and re-creates the 429 storm.
2. **`degraded: true` carries no poem.** The server returns `{ degraded: true, reason, retryAfter }` with HTTP 200; the client renders `composeFallbackPoem`. Keep it that way. Embedding a curated poem server-side would mean shipping the corpus twice and drifting the two copies.

### Unit tests (no network)

```js
// render-api/test/ai-pipeline.test.mjs — node --test
import test from "node:test";
import assert from "node:assert/strict";
import { LruTtlCache, Gate, TokenBucket, Breaker } from "../lib/ai-pipeline.mjs";

test("LRU evicts oldest and respects TTL", async () => {
  const c = new LruTtlCache({ max: 2, ttlMs: 20 });
  c.set("a", 1); c.set("b", 2); c.get("a"); c.set("c", 3);
  assert.equal(c.get("b"), null);
  assert.equal(c.get("a"), 1);
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(c.get("a"), null);
});

test("Gate rejects when the queue is full instead of hanging", async () => {
  const g = new Gate({ concurrency: 1, maxQueue: 1 });
  const slow = () => new Promise((r) => setTimeout(r, 50));
  const first = g.run(slow);
  const second = g.run(slow);
  await assert.rejects(g.run(slow), (e) => e.code === "QUEUE_FULL");
  await Promise.all([first, second]);
});

test("Token bucket refuses a reservation larger than the window", () => {
  const b = new TokenBucket({ rpm: 2, tpm: 100 });
  assert.equal(b.canReserve(60), true);
  b.reserve(60);
  assert.equal(b.canReserve(60), false);
});

test("Breaker opens after 5 failures and half-opens after cooldown", async () => {
  const br = new Breaker({ threshold: 5, cooldownMs: 10 });
  for (let i = 0; i < 5; i++) br.fail();
  assert.equal(br.allow(), false);
  await new Promise((r) => setTimeout(r, 15));
  assert.equal(br.allow(), true);
});
```

`npm test` already exists in the root workspace but not in `render-api/package.json`. Add `"test": "node --test"` there.

## 5. Wire the two routes

Replace the bodies of `/api/ai/shayar` (line 232) and `/api/ai/translate` (line 338). The route stays responsible for validation and HTTP semantics; the pipeline owns everything after that.

```js
const ai = createAiPipeline({
  groqKey: process.env.GROQ_API_KEY,
  modelQuality: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  modelFast: "llama-3.1-8b-instant",
  dailyBudget: Number(process.env.AI_DAILY_BUDGET ?? 2000),
});
```

### 5.1 Shayar route

```js
app.post("/api/ai/shayar", aiRateLimiter, async (req, res) => {
  const parsed = ShayarInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request payload", details: parsed.error.flatten() });
  }
  const human = await verifyTurnstile(req);
  if (!human.ok) return res.status(403).json({ error: "Human verification failed", reason: human.reason });

  const d = parsed.data;
  const result = await ai.run({
    kind: "shayar",
    payload: d,
    requestId: req.id,
    buildPrompt: (p) => ({
      system: SHAYAR_SYSTEM_PROMPT,                 // existing constant
      user: buildShayarUserPrompt(p),               // extract lines 249–290 into a pure function
      maxTokens: 900,
      temperature: 0.72,
    }),
    validate: (p) => ({
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

`buildShayarUserPrompt` must remain byte-identical to today's template. It is the prompt that produces acceptable Urdu; refactoring it is a separate, testable change.

### 5.2 Translation route

Same shape, different constants:

| Setting | Shayar | Translate |
|---|---|---|
| `maxTokens` | 900 | 700 |
| `temperature` | 0.72 | 0.25 |
| model | 70B | 8B-instant (mechanical task) |
| cache TTL | 6 h | 30 days (translations are deterministic) |
| limiter | 12 / 10 min / IP | 60 / 10 min / IP, **separate instance** |

The split limiter matters: a publish burst must not starve the AI Poet, and vice versa. Today both routes share `aiRateLimiter` (line 47), which couples two unrelated workloads.

### 5.3 The fallback contract

| Situation | HTTP | Headers | Body | Client |
|---|---|---|---|---|
| cache hit | 200 | `X-Cache: HIT` | poem + `cached: true` | render immediately |
| generated | 200 | `X-Cache: MISS` | poem + `meta` | render |
| queue/bucket/breaker/budget | 200 | `X-Degraded: <reason>`, `Retry-After` | `{degraded:true}` | `composeFallbackPoem`, show "curated mehfil" chip |
| bad input | 400 | — | Zod flatten | inline form error |
| Turnstile fail | 403 | — | reason | retry once, then honest message |
| no key | 200 + `X-Degraded: ai_unconfigured` | — | `{degraded:true}` | curated |

Never map a poetic failure to `500`. A 500 is a promise that the request was broken; it was not — the muses were busy.

### 5.4 Mock route (staging only, required by packet 06)

The load test cannot use the real route: Turnstile has no token, and the per-IP limiter would reject 8 req/s. Register a mock **before** the guarded routes, gated by an env flag that must never be `1` in production.

```js
const ALLOW_MOCK = process.env.ALLOW_MOCK_AI === "1" && process.env.NODE_ENV !== "production";

if (ALLOW_MOCK) {
  app.post("/api/ai/shayar", async (req, res) => {
    if (req.query.mock !== "1") return res.status(404).json({ error: "not found" });
    await new Promise((r) => setTimeout(r, 60 + Math.random() * 90)); // 60–150 ms
    return res.json({ poem: MOCK_POEM, error: null, mock: true });
  });
}
```

Order matters: this handler is registered **above** the real `/api/ai/shayar`, so Express never reaches the limiter, the Turnstile verifier, or Groq. If it is registered below, the mock is unreachable and the load test will report 403s as failures.

`MOCK_POEM` is a constant with the same shape as a generated poem (four script arrays of equal length). Keep it in `render-api/fixtures/mock-poem.mjs`; do not import it into the production bundle.

> ✅ DO set `ALLOW_MOCK_AI=1` on staging and `0` (or omit) on production. Packet 06 asserts this.
>
> ❌ DON'T expose the mock without the `NODE_ENV !== "production"` clause. A misconfigured env var would otherwise turn the paid endpoint into a free echo.

## 6. Budget, model drift and keep-alive

### 6.1 Daily budget is process-local

`spent` resets when the Render instance restarts, and each instance has its own counter. At one instance and `plan: starter`, this is a **soft** cap that is accurate to within one restart. Say so in the runbook; do not describe it as a billing control.

If a hard cap is required later, the cheap version is a `daily_ai_usage` row in Postgres incremented by the pipeline through PostgREST, with the service key. That adds one DB write per upstream call (~7/min at target) — acceptable, but not needed for launch.

### 6.2 Model drift (F-18)

There are **two AI paths**, and they are allowed to use different models — what is not allowed is an undocumented third default:

| Path | File | Model variable |
|---|---|---|
| Render API (Groq direct) | `render.yaml`, `server.mjs` | `GROQ_MODEL` / `GROQ_MODEL_FAST` |
| Lovable server function | `.env.example`, `shayar.functions.ts` | `LOVABLE_AI_MODEL` (explicit) |

The Render side should be:

```
GROQ_MODEL=llama-3.3-70b-versatile    # generation
GROQ_MODEL_FAST=llama-3.1-8b-instant  # translation + 429 fallback
```

On the Lovable side, keep whichever model that gateway actually exposes (`openai/gpt-oss-120b` today) but give it its own variable. The bug in F-18 is not that two models exist; it is that `translateShayariServerFn` has a **silent fallback** to a model that appears in no config table, so nobody can answer "which model wrote this poem?" from the logs. Make the variable explicit, log it per request, and the drift stops being a mystery.

If the translation quality of 8B is unacceptable on a sample of 50 poems, use `openai/gpt-oss-20b` for translation — but decide once, in the table above, and make every path read from its named variable.

### 6.3 `package.json` and `render.yaml`

```json
{
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "express-rate-limit": "^7.5.0",
    "zod": "^3.25.76"
  },
  "scripts": {
    "start": "node server.mjs",
    "dev": "node --watch server.mjs",
    "test": "node --test"
  }
}
```

Run `npm install` in `render-api/` only if you add a dependency; this packet adds none. Commit any lockfile change. `npm ci --omit=dev` fails if the lockfile and `package.json` disagree, which is a deploy-time failure, not a runtime one — catch it locally.

```yaml
services:
  - type: web
    name: ek-khawaab-api
    runtime: node
    plan: starter                 # free sleeps at 15 min; cold start is 30–60 s
    region: singapore
    rootDir: render-api
    buildCommand: npm ci --omit=dev
    startCommand: node server.mjs
    healthCheckPath: /health
    autoDeploy: true
    envVars:
      - key: PORT
        value: "3001"
      - key: GROQ_API_KEY
        sync: false
      - key: GROQ_MODEL
        value: llama-3.3-70b-versatile
      - key: GROQ_MODEL_FAST
        value: llama-3.1-8b-instant
      - key: ALLOWED_ORIGINS
        value: https://ekkhwaab.in,https://www.ekkhwaab.in
      - key: AI_DAILY_BUDGET
        value: "2000"
      # flip to 2 only when api.ekkhwaab.in is proxied + EDGE_SHARED_SECRET is set
      - key: TRUST_PROXY_HOPS
        value: "1"
      - key: EDGE_SHARED_SECRET
        sync: false
      - key: TURNSTILE_SECRET_KEY
        sync: false
      # flip to 1 after the widget is live on /ai-poet
      - key: TURNSTILE_ENFORCE
        value: "0"
      - key: ALLOW_MOCK_AI
        value: "0"
```

> ✅ DO ship `TRUST_PROXY_HOPS=1` until `api.ekkhwaab.in` is proxied and `EDGE_SHARED_SECRET` is set, then flip both together. A blue-green env change is safer than editing code twice.
>
> ❌ DON'T leave `TRUST_PROXY_HOPS=2` with no Cloudflare rule in front. It over-trusts the client-supplied `X-Forwarded-For` chain.

### 6.4 Health and readiness

```js
app.get("/health", (_, res) => res.json({
  status: "ok",
  service: "ek-khwaab-render-api",
  uptime: Math.round(process.uptime()),
  version: process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? "dev",
}));

app.get("/ready", (_, res) => {
  const s = ai.stats();
  const ready = Boolean(process.env.GROQ_API_KEY) && s.breaker !== "open";
  res.status(ready ? 200 : 503).json({ ready, ...s });
});
```

`/health` must stay dependency-free: it is what Render uses to decide whether to route traffic. `/ready` is for humans and synthetic checks.

### 6.5 Keep-alive (only if you stay on free)

| Option | Verdict |
|---|---|
| Render Starter ($7/mo) | **selected** — removes cold starts and the 750 h ceiling |
| Ping `/health` every 5 min from cron-job.org | stopgap; consumes instance hours, does not prevent platform restarts |
| Self-ping inside the process | useless — a sleeping process cannot ping itself |

If the stopgap is used, document that the first request after a **deploy** is still cold, and that a 30 s cold start exceeds the client's abort budget. Do not ship free tier to a launch with a paid marketing spend behind it.

## 7. Write-once translation job

Packet 01 adds `translation_status` and `source_script`. This is the consumer.

```
poems.translation_status = 'pending'
        │
        ▼  pg_cron every 2 min (or Render cron hitting /internal/translate-batch)
POST /internal/translate-batch        header: X-Internal-Secret
        │
        ├── SELECT id, source_script, <source column> FROM poems
        │   WHERE translation_status = 'pending' ORDER BY created_at LIMIT 20
        ├── for each: ai.run({ kind: "translate" })  ← cache hit if the lines repeat
        ├── UPDATE poems SET hinglish_text=$, hindi_text=$, urdu_text=$,
        │          translation_status='complete' WHERE id=$
        └── on repeated failure: translation_status='failed', source text stays in all
            three columns (view coalesces), author sees "translation unavailable"
```

Rules:

1. The internal route is **not** public: require `X-Internal-Secret`, reject otherwise with 404 (not 403 — do not confirm the route exists).
2. Batch size 20, concurrency 2. A publish burst of 100 poems is five batches, ~2 minutes behind.
3. Readers never trigger translation. Ever. The current browser-initiated overwrite is why a closed tab leaves Roman text in the Devanagari column.
4. Backfill once: rows where all three columns are identical → `failed`; where they differ → `complete`.

## 8. Verify

```bash
# 1. identity — two requests from the same IP must share a bucket;
#    a spoofed X-Forwarded-For must NOT mint a new one.
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://api.ekkhwaab.in/api/ai/shayar \
  -H 'content-type: application/json' -H 'x-forwarded-for: 1.2.3.4' \
  -d '{"situation":"test","seeds":["chai"]}'
# repeat 13x → 429 on the 13th, and the 429 must not appear for a different real IP

# 2. cache
curl -s -D- -o /dev/null -X POST https://api.ekkhwaab.in/api/ai/shayar \
  -H 'content-type: application/json' -d @fixtures/shayar.json | grep -i x-cache
# second identical call → X-Cache: HIT and < 5 ms

# 3. readiness
curl -s https://api.ekkhwaab.in/ready | jq

# 4. no key leak in the client bundle
grep -r "gsk_" dist/ && echo "LEAK" || echo "clean"
```

Acceptance:

- [ ] `req.ip` (logged) equals the real client IP, not `172.70.*`
- [ ] 13 requests in 10 min from one IP → 429; 13 from a second IP → 200
- [ ] identical request twice → `X-Cache: HIT`, < 5 ms
- [ ] 50 concurrent → zero 500s, ≤ 8 s worst case, excess `X-Degraded`
- [ ] `X-Request-Id` present on success, 400, 403 and degrade
- [ ] Turnstile enforced: no token → 403; valid token → 200
- [ ] `/ready` returns 503 when `GROQ_API_KEY` is removed in a preview env
- [ ] 30-minute soak: Groq calls < 2,000, no memory growth > 20 MB

## 9. Rollback

| Change | Rollback | Time |
|---|---|---|
| `trust proxy` / `clientKey` | revert env `TRUST_PROXY_HOPS=1`, redeploy | 3 min |
| Turnstile | `TURNSTILE_ENFORCE=0`, redeploy | 2 min |
| Pipeline | revert `server.mjs` to the commit before wiring; `lib/` is unused then | 5 min |
| `render.yaml` plan | dashboard → downgrade to free | 1 min |
| Daily budget hit | raise `AI_DAILY_BUDGET` or wait for UTC midnight | 1 min |

Keep the previous Render deploy pinned in the dashboard before starting. Render retains it; rollback is a button, not a rebuild.

## 10. Expected effect

| Metric | Before | After |
|---|---|---|
| Upstream calls at 17 RPM offered | 17/min | ~7.6/min |
| Tokens/min | ~40,800 | ~12,100 |
| 429s reaching the user | frequent | ~0 (bucket prevents dispatch) |
| p95 on cache hit | — | < 2 ms |
| p95 on miss | 12 s abort | ~3.5 s |
| Worst case | error toast after 12 s | curated poem in ≤ 8 s |
| Effective per-IP limit | global (edge IP) | true per client |
| Cost ceiling | unbounded | 2,000 calls/day |

The single most important number is the last one: without the identity fix, every other improvement is masked by a global 429 that looks like a provider outage.
