// Ek Khwaab - AI pipeline: canonical cache + single-flight + bounded queue
// + RPM/TPM token bucket + circuit breaker + daily budget.
//
// Zero dependencies. Node >= 18 (global fetch, crypto).
//
// Contract: `run()` never throws to the route. It always resolves to
// { status, headers, body }. A poetic failure is a 200 with X-Degraded, never
// a 500 - a 500 promises the request was broken, and it was not.
import { createHash, randomUUID } from "node:crypto";

/* ------------------------------- LRU + TTL ------------------------------- */
export class LruTtlCache {
  constructor({ max = 2000, ttlMs = 6 * 60 * 60 * 1000, maxBytes = 40 * 1024 * 1024 } = {}) {
    this.max = max;
    this.ttlMs = ttlMs;
    this.maxBytes = maxBytes;
    this.map = new Map();
    this.bytes = 0;
    this.hits = 0;
    this.misses = 0;
  }

  #size(v) {
    return Buffer.byteLength(JSON.stringify(v), "utf8");
  }

  get(key) {
    const e = this.map.get(key);
    if (!e) {
      this.misses++;
      return null;
    }
    if (e.exp < Date.now()) {
      this.#del(key);
      this.misses++;
      return null;
    }
    // LRU touch: delete + re-insert moves the key to the tail.
    this.map.delete(key);
    this.map.set(key, e);
    this.hits++;
    return e.value;
  }

  set(key, value) {
    const size = this.#size(value);
    // Never let one giant entry evict everything.
    if (size > this.maxBytes / 8) return;
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
// Bounded concurrency + bounded queue + bounded queue wait.
// Rejects (never hangs) when full or when the wait budget expires.
export class Gate {
  constructor({ concurrency = 4, maxQueue = 24, queueWaitMs = 7000 } = {}) {
    this.concurrency = concurrency;
    this.maxQueue = maxQueue;
    this.queueWaitMs = queueWaitMs;
    this.active = 0;
    this.queue = [];
  }

  get stats() {
    return { active: this.active, queued: this.queue.length };
  }

  async run(task, { timeoutMs = 12000 } = {}) {
    if (this.active >= this.concurrency && this.queue.length >= this.maxQueue) {
      throw Object.assign(new Error("queue_full"), { code: "QUEUE_FULL" });
    }

    return new Promise((resolve, reject) => {
      const entry = { task, resolve, reject, execTimer: null, waitTimer: null, started: false };

      entry.waitTimer = setTimeout(() => {
        if (entry.started) return;
        const idx = this.queue.indexOf(entry);
        if (idx >= 0) this.queue.splice(idx, 1);
        reject(Object.assign(new Error("queue_timeout"), { code: "QUEUE_TIMEOUT" }));
      }, this.queueWaitMs);

      entry.start = () => {
        entry.started = true;
        clearTimeout(entry.waitTimer);
        this.active++;

        entry.execTimer = setTimeout(() => {
          entry.reject(Object.assign(new Error("queue_timeout"), { code: "QUEUE_TIMEOUT" }));
        }, timeoutMs);

        Promise.resolve()
          .then(entry.task)
          .then((v) => {
            clearTimeout(entry.execTimer);
            entry.resolve(v);
          })
          .catch((e) => {
            clearTimeout(entry.execTimer);
            entry.reject(e);
          })
          .finally(() => {
            this.active--;
            this.#next();
          });
      };

      this.queue.push(entry);
      if (this.active < this.concurrency) {
        this.queue.shift().start();
      }
    });
  }

  #next() {
    if (this.queue.length && this.active < this.concurrency) {
      this.queue.shift().start();
    }
  }
}

/* ----------------------------- Token bucket ----------------------------- */
// Separately reserves RPM and TPM before dispatch.
export class TokenBucket {
  constructor({ rpm = 28, tpm = 11000, windowMs = 60_000 } = {}) {
    this.rpm = rpm;
    this.tpm = tpm;
    this.windowMs = windowMs;
    this.events = []; // { ts, tokens }
  }

  #prune(now) {
    this.events = this.events.filter((e) => now - e.ts < this.windowMs);
  }

  canReserve(tokens) {
    const now = Date.now();
    this.#prune(now);
    const usedTokens = this.events.reduce((a, e) => a + e.tokens, 0);
    return this.events.length < this.rpm && usedTokens + tokens <= this.tpm;
  }

  reserve(tokens) {
    this.#prune(Date.now());
    this.events.push({ ts: Date.now(), tokens });
  }

  waitMs(tokens) {
    const now = Date.now();
    this.#prune(now);
    const usedTokens = this.events.reduce((a, e) => a + e.tokens, 0);
    if (this.events.length >= this.rpm) {
      return Math.max(0, this.events[0].ts + this.windowMs - now);
    }
    if (usedTokens + tokens > this.tpm) {
      let acc = usedTokens;
      let i = 0;
      while (i < this.events.length && acc + tokens > this.tpm) {
        acc -= this.events[i].tokens;
        i++;
      }
      return Math.max(0, (this.events[i - 1]?.ts ?? now) + this.windowMs - now);
    }
    return 0;
  }
}

/* ------------------------------ Breaker --------------------------------- */
export class Breaker {
  constructor({ threshold = 5, cooldownMs = 30_000 } = {}) {
    this.threshold = threshold;
    this.cooldownMs = cooldownMs;
    this.failures = 0;
    this.openedAt = 0;
    this.state = "closed";
  }

  allow() {
    if (this.state === "open" && Date.now() - this.openedAt > this.cooldownMs) {
      this.state = "half-open";
      return true;
    }
    return this.state !== "open";
  }

  ok() {
    this.failures = 0;
    this.state = "closed";
  }

  fail() {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.state = "open";
      this.openedAt = Date.now();
    }
  }
}

/* ----------------------------- Single flight ---------------------------- */
const inflight = new Map();

export function singleFlight(key, fn) {
  if (inflight.has(key)) return inflight.get(key);
  const p = Promise.resolve()
    .then(fn)
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

/* --------------------------- Canonicalisation --------------------------- */
const norm = (s) =>
  String(s ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/**
 * The key must mirror exactly the fields that reach the prompt. Including a
 * field the prompt ignores only lowers the hit rate; omitting a field the
 * prompt uses returns a poem for the wrong request.
 */
export function canonicalKey(kind, payload) {
  const base =
    kind === "translate"
      ? {
          k: "translate",
          src: payload.sourceScript,
          lines: (payload.sourceLines || []).map(norm),
          // poemId is deliberately excluded: two users translating the same
          // lines should share one cache entry.
        }
      : {
          k: "shayar",
          type: payload.poetryType,
          mood: payload.mood,
          intensity: payload.intensity,
          length: payload.length,
          vocab: payload.vocabComplexity,
          rhyme: payload.rhymePreference,
          radif: norm(payload.radif),
          qafiya: norm(payload.qafiya),
          style: payload.style,
          styleLens: norm(payload.poeticStyleLens),
          seeds: [...(payload.seeds || [])].map(norm).sort(),
          phrases: [...(payload.phrases || [])].map(norm).sort(),
          situation: norm(payload.situation),
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
      status: res.status,
      retryAfter,
      body: body.slice(0, 300),
      ms,
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
  modelFast = process.env.GROQ_MODEL_FAST || "llama-3.1-8b-instant",
  modelQuality = process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  dailyBudget = Number(process.env.AI_DAILY_BUDGET ?? 2000),
  cache = new LruTtlCache(),
  translateCache = new LruTtlCache({ ttlMs: 30 * 24 * 60 * 60 * 1000 }),
  gate = new Gate({ concurrency: 4, maxQueue: 24 }),
  bucket = new TokenBucket({ rpm: 28, tpm: 11000 }),
  breaker = new Breaker(),
} = {}) {
  let day = new Date().toISOString().slice(0, 10);
  let spent = 0;

  function budgetOk() {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== day) {
      day = today;
      spent = 0;
    }
    return spent < dailyBudget;
  }

  const cacheFor = (kind) => (kind === "translate" ? translateCache : cache);

  function degraded(reason, retryAfter = 5) {
    return {
      status: 200,
      headers: { "X-Degraded": reason, "Retry-After": String(retryAfter) },
      body: { degraded: true, reason, retryAfter },
    };
  }

  async function run({ kind, payload, buildPrompt, validate, requestId = randomUUID() }) {
    if (!groqKey) return degraded("ai_unconfigured");
    if (!budgetOk()) return degraded("ai_budget_exhausted", 3600);
    if (!breaker.allow()) return degraded("ai_breaker_open", 30);

    const store = cacheFor(kind);
    const key = canonicalKey(kind, payload);

    const cached = store.get(key);
    if (cached) {
      return {
        status: 200,
        headers: { "X-Cache": "HIT" },
        body: { ...cached, cached: true, requestId },
      };
    }

    const { system, user, maxTokens, temperature, model } = buildPrompt(payload);
    const primaryModel = model || modelQuality;
    // Reserve conservatively: prompt chars / 4 + max output.
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
                apiKey: groqKey,
                model: primaryModel,
                system,
                user,
                maxTokens,
                temperature,
                signal: controller.signal,
              });
            } catch (err) {
              // 429 or 5xx: one retry on the fast model, then give up.
              if (err.status === 429 || err.status >= 500) {
                out = await callGroq({
                  apiKey: groqKey,
                  model: modelFast,
                  system,
                  user,
                  maxTokens: Math.min(maxTokens, 900),
                  temperature,
                  signal: controller.signal,
                });
              } else {
                throw err;
              }
            }

            let parsed;
            try {
              parsed = JSON.parse(out.content);
            } catch {
              throw Object.assign(new Error("invalid_json"), { code: "PARSE_ERROR" });
            }

            let clean;
            try {
              clean = validate(parsed, payload);
            } catch (e) {
              throw Object.assign(new Error("invalid_output"), {
                code: "VALIDATION_ERROR",
                cause: e,
              });
            }

            breaker.ok();
            spent++;
            return {
              clean,
              meta: {
                upstreamMs: out.ms,
                tokensIn: out.tokensIn,
                tokensOut: out.tokensOut,
                model: primaryModel,
              },
            };
          } finally {
            clearTimeout(t);
          }
        })
      );

      const body = { ...result.clean, cached: false, requestId, meta: result.meta };
      store.set(key, result.clean);
      return { status: 200, headers: { "X-Cache": "MISS" }, body };
    } catch (err) {
      const code = err.code || (err.name === "AbortError" ? "upstream_timeout" : "upstream_error");

      // A malformed model response is not a provider outage; do not open the
      // breaker for it or one bad completion takes the service down for 30 s.
      const providerFailure = code !== "QUEUE_TIMEOUT" && code !== "QUEUE_FULL" &&
        code !== "PARSE_ERROR" && code !== "VALIDATION_ERROR";
      if (providerFailure) breaker.fail();

      const wait = err.status === 429 ? Math.max(err.retryAfter || 2, 2) : 5;
      console.warn(
        JSON.stringify({
          level: "warn",
          requestId,
          kind,
          code,
          status: err.status ?? null,
          wait,
        })
      );

      // Honest, non-500 degradation: the client renders curated content.
      return degraded(code, wait);
    }
  }

  return {
    run,
    stats: () => ({
      cache: cache.stats(),
      translateCache: translateCache.stats(),
      gate: gate.stats,
      breaker: breaker.state,
      spent,
      day,
    }),
  };
}
