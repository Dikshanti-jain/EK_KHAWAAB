// Unit tests for the AI pipeline. No network, no Groq key.
// Run with: npm test   (node --test)
import test from "node:test";
import assert from "node:assert/strict";
import { LruTtlCache, Gate, TokenBucket, Breaker, canonicalKey } from "../lib/ai-pipeline.mjs";

test("LRU evicts the oldest entry and respects TTL", async () => {
  const c = new LruTtlCache({ max: 2, ttlMs: 20 });
  c.set("a", 1);
  c.set("b", 2);
  c.get("a"); // touch a, so b becomes the oldest
  c.set("c", 3);

  assert.equal(c.get("b"), null);
  assert.equal(c.get("a"), 1);

  await new Promise((r) => setTimeout(r, 30));
  assert.equal(c.get("a"), null);
});

test("LRU refuses a single entry larger than one eighth of the budget", () => {
  const c = new LruTtlCache({ maxBytes: 800 });
  c.set("huge", "x".repeat(200));
  assert.equal(c.get("huge"), null);
  assert.equal(c.stats().entries, 0);
});

test("Gate rejects when the queue is full instead of hanging", async () => {
  const g = new Gate({ concurrency: 1, maxQueue: 1, queueWaitMs: 2000 });
  const slow = () => new Promise((r) => setTimeout(r, 50));
  const first = g.run(slow);
  const second = g.run(slow);
  await assert.rejects(g.run(slow), (e) => e.code === "QUEUE_FULL");
  await Promise.all([first, second]);
});

test("Gate rejects a queued task when the wait budget expires", async () => {
  const g = new Gate({ concurrency: 1, maxQueue: 5, queueWaitMs: 20 });
  const slow = () => new Promise((r) => setTimeout(r, 80));
  const first = g.run(slow);
  await assert.rejects(g.run(slow), (e) => e.code === "QUEUE_TIMEOUT");
  await first;
});

test("Token bucket refuses a reservation larger than the window", () => {
  const b = new TokenBucket({ rpm: 2, tpm: 100 });
  assert.equal(b.canReserve(60), true);
  b.reserve(60);
  assert.equal(b.canReserve(60), false);
});

test("Token bucket enforces RPM independently of TPM", () => {
  const b = new TokenBucket({ rpm: 2, tpm: 10_000 });
  b.reserve(1);
  b.reserve(1);
  assert.equal(b.canReserve(1), false);
});

test("Breaker opens after the threshold and half-opens after cooldown", async () => {
  const br = new Breaker({ threshold: 5, cooldownMs: 10 });
  for (let i = 0; i < 5; i++) br.fail();
  assert.equal(br.allow(), false);

  await new Promise((r) => setTimeout(r, 15));
  assert.equal(br.allow(), true);
  assert.equal(br.state, "half-open");

  br.ok();
  assert.equal(br.state, "closed");
});

test("canonicalKey is stable across field order and case, and ignores poemId", () => {
  const a = canonicalKey("translate", {
    sourceScript: "hinglish",
    sourceLines: ["Teri  yaad", "Khamoshi"],
    poemId: "one",
  });
  const b = canonicalKey("translate", {
    sourceLines: ["teri yaad", "KHAMOSHI"],
    sourceScript: "hinglish",
    poemId: "two",
  });
  assert.equal(a, b);
});

test("canonicalKey separates different situations", () => {
  const base = {
    seeds: ["chai"],
    phrases: [],
    situation: "late night train",
    style: "Gulzar",
    mood: "Nostalgic",
    poetryType: "shayari",
    length: "couplet",
  };
  assert.notEqual(
    canonicalKey("shayar", base),
    canonicalKey("shayar", { ...base, situation: "airport farewell" })
  );
});
