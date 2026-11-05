/**
 * In-memory sliding-window rate limiter for server functions (Fixes RL-04).
 * Enforces per-client/IP quotas with automatic expiration of stale window timestamps.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const records = new Map<string, RateLimitRecord>();

// Periodically purge expired records to avoid memory leaks
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of records.entries()) {
    record.timestamps = record.timestamps.filter((t) => now - t < 15 * 60 * 1000);
    if (record.timestamps.length === 0) {
      records.delete(key);
    }
  }
}, 5 * 60 * 1000);

if (typeof cleanupTimer === "object" && cleanupTimer && "unref" in cleanupTimer) {
  (cleanupTimer as { unref: () => void }).unref();
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetMs: number;
};

/**
 * Checks sliding window rate limit.
 * @param identifier Unique key (IP address or Shayar ID)
 * @param limit Max allowed requests within window (default: 10)
 * @param windowMs Window duration in milliseconds (default: 10 minutes)
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 10 * 60 * 1000
): RateLimitResult {
  const key = identifier.trim() || "anonymous_client";
  const now = Date.now();

  let record = records.get(key);
  if (!record) {
    record = { timestamps: [] };
    records.set(key, record);
  }

  // Filter timestamps within current window
  record.timestamps = record.timestamps.filter((t) => now - t < windowMs);

  if (record.timestamps.length >= limit) {
    const oldest = record.timestamps[0] || now;
    const resetMs = Math.max(0, oldest + windowMs - now);
    return {
      allowed: false,
      remaining: 0,
      resetMs,
    };
  }

  record.timestamps.push(now);
  return {
    allowed: true,
    remaining: Math.max(0, limit - record.timestamps.length),
    resetMs: windowMs,
  };
}

