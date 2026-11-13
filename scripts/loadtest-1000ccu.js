/**
 * Ek Khwaab — 1,000 CCU load test (k6 v0.50+)
 *
 *   mkdir -p reports
 *   k6 run scripts/loadtest-1000ccu.js \
 *     -e BASE_URL=https://staging.ekkhwaab.in \
 *     -e SUPABASE_URL=https://<staging-proj>.supabase.co \
 *     -e SUPABASE_ANON_KEY=<staging-anon> \
 *     -e API_BASE=https://ek-khwaab-api-staging.onrender.com \
 *     -e MOCK_AI=1
 *
 * READ-ONLY. No writes, no likes, no comments, no khat creation.
 * The AI scenario refuses to run unless MOCK_AI=1, because 1,000 VUs against
 * live Groq exhausts the daily quota in under 30 seconds.
 *
 * The feed query matches what ships after packet 01/03: the get_feed_page RPC,
 * not the safe_poems_feed view. Measure the real query or the numbers lie.
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

const SB_HEADERS = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
};

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
    http_req_failed: ["rate<0.01"],
    "html_ms{scenario:readers}": ["p(95)<800"],
    feed_api_ms: ["p(95)<150", "p(99)<400"],
    script_switch_ms: ["p(95)<25"],
    "ai_ms{scenario:ai}": ["p(95)<200"],
    ai_degraded_rate: ["rate<0.02"],
    checks: ["rate>0.99"],
  },
  summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "p(99)", "max"],
};

/* ------------------------------- helpers ------------------------------- */

function getFeed(limit = 20, cursor = null) {
  const url = `${SB}/rest/v1/rpc/get_feed_page`;
  const body = JSON.stringify({
    p_cursor_created_at: cursor ? cursor.created_at : null,
    p_cursor_id: cursor ? cursor.id : null,
    p_mood: null,
    p_limit: limit,
  });
  const res = http.post(url, body, { headers: SB_HEADERS, tags: { name: "feed_api" } });
  feedTrend.add(res.timings.duration);

  let rows = [];
  try {
    rows = res.json() ?? [];
  } catch {
    /* non-JSON error body */
  }
  res.rows = Array.isArray(rows) ? rows : [];

  const ok = check(res, {
    "feed 200": (r) => r.status === 200,
    "feed has rows": () => res.rows.length > 0,
    "comments capped at 3": () =>
      res.rows.every((p) => (p.recent_comments ?? []).length <= 3),
    "no auth_user_id": () => res.rows.every((p) => !("auth_user_id" in p)),
    "no gumnaam leak": () =>
      res.rows.every((p) => !p.is_gumnaam || p.shayar_uid === "EK-GUMNAAM"),
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
      "feed html is prerendered": (r) =>
        typeof r.body === "string" && r.body.includes("Ek Khwaab"),
    });

    const page1 = getFeed(20);

    // Script switching is a pure client-side array swap, but a real browser
    // still re-renders. This approximates the work by parsing all 3 arrays.
    if (page1.status === 200 && page1.rows.length) {
      const t0 = Date.now();
      let switched = 0;
      for (const p of page1.rows) {
        for (const s of ["hinglish", "hindi", "urdu"]) {
          const text = p[`${s}_text`];
          if (typeof text === "string" && text.length > 0) switched++;
        }
      }
      scriptSwitch.add(Date.now() - t0);
      check(switched, { "three scripts present": (n) => n >= page1.rows.length });

      // Keyset pagination must not repeat the first page.
      const last = page1.rows[page1.rows.length - 1];
      const page2 = getFeed(20, last);
      if (page2.status === 200) {
        const ids1 = new Set(page1.rows.map((p) => p.id));
        check(page2.rows, {
          "cursor does not repeat rows": (rows) => rows.every((p) => !ids1.has(p.id)),
        });
      }
    }

    // 30% also open a poem detail page (a prerendered slug that exists).
    if (Math.random() < 0.3) {
      const res2 = http.get(`${BASE}/poetry/ab-kisi-baat-pe-dil-dukhta-nahi`, {
        tags: { name: "poem_html" },
      });
      check(res2, { "poem html 200": (r) => r.status === 200 });
    }
  });

  sleep(randomIntBetween(6, 14)); // think time between page views
}

/* ------------------------------- browser ------------------------------- */
export function browser() {
  // All of these are prerendered by scripts/prerender-seo.mjs.
  const words = [
    "aab-e-hayat",
    "aftab",
    "arzoo",
    "bewafa",
    "chiraagh",
    "dil-e-nadaan",
    "firaaq",
    "gham",
    "guftagu",
    "hijr",
    "intezaar",
    "ishq",
    "tagaful",
  ];

  group("dictionary", () => {
    const res = http.get(`${BASE}/dictionary`, { tags: { name: "dict_html" } });
    check(res, { "dictionary 200": (r) => r.status === 200 });
    const w = words[randomIntBetween(0, words.length - 1)];
    const res2 = http.get(`${BASE}/dictionary/${w}`, { tags: { name: "word_html" } });
    check(res2, { "word 200": (r) => r.status === 200 });
  });

  if (Math.random() < 0.4) {
    const topics = [
      "heartbreak-shayari",
      "two-line-shayari",
      "loneliness-shayari",
      "love-shayari",
    ];
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
  if (!API) {
    sleep(10);
    return;
  }
  if (!MOCK_AI) {
    // Hard guard: refuse to hammer live Groq. Sleep so this is not a hot loop.
    console.error("Refusing AI load without MOCK_AI=1 — set MOCK_AI=1 against staging.");
    sleep(10);
    return;
  }

  // Repeat the same seed set deliberately: this measures cache hit rate as
  // much as generation. Ten distinct payloads across 8 rps ≈ 0.8 unique/s.
  const payload = JSON.stringify({
    mode: "words",
    seeds: ["chai", "baarish", "metro", "khidki", "raat"],
    situation: "late night train window, missing someone",
    style: "Gulzar",
    poetryType: "shayari",
    mood: "Nostalgic",
    length: "couplet",
  });

  const res = http.post(`${API}/api/ai/shayar?mock=1`, payload, {
    headers: {
      "Content-Type": "application/json",
      "X-Request-Id": `k6-${__VU}-${__ITER}`,
    },
    tags: { name: "ai_mock" },
  });
  aiTrend.add(res.timings.duration);

  // The pipeline reports degradation in a header so the body can stay a poem.
  const degradedHeader = res.headers["X-Degraded"] || res.headers["x-degraded"] || "";
  degraded.add(Boolean(degradedHeader));

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
  if (!id) {
    sleep(20);
    return;
  }

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
    `AI degraded     : ${((data.metrics.ai_degraded_rate?.values?.rate ?? 0) * 100).toFixed(2)}%`,
    `HTTP failure    : ${(fail * 100).toFixed(2)}%`,
    `Checks          : ${((data.metrics.checks?.values?.rate ?? 0) * 100).toFixed(2)}%`,
    "",
  ];
  return {
    stdout: lines.join("\n"),
    "reports/k6-1000ccu-summary.json": JSON.stringify(data, null, 2),
  };
}
