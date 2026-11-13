// Pure clock and drift math. No DOM, no Supabase — unit tested directly.
//
// The seek threshold is 1.5 s, not the packet's 0.25 s: below 1.5 s the rate
// nudge is inaudible, and a hard seek on every jitter spike is worse than a
// slightly late line.

export const SEEK_THRESHOLD_SECONDS = 1.5;
export const RATE_DEADBAND_SECONDS = 0.03;
export const MAX_RATE_NUDGE = 0.03;

export type Clock = { offsetMs: number; rttMs: number };

/** Guest estimates host clock from one ping/pong pair. */
export function estimateOffset(pingT: number, hostT: number, recvT: number): Clock {
  const rttMs = Math.max(0, recvT - pingT);
  return { offsetMs: hostT + rttMs / 2 - recvT, rttMs };
}

/** Where the guest should be, in seconds, at guest time nowMs. */
export function targetPosition(
  msg: { pos: number; sentAt: number; playing: boolean; rate: number },
  offsetMs: number,
  nowMs: number
): number {
  if (!msg.playing) return msg.pos;
  return msg.pos + ((nowMs + offsetMs - msg.sentAt) / 1000) * msg.rate;
}

/**
 * Returns the correction to apply.
 *   |drift| > 1.5 s  → hard seek (audible, but rare)
 *   otherwise        → a small rate nudge, deadband ±0.03 s
 */
export function correction(
  current: number,
  target: number
): { seek: number | null; rate: number } {
  const drift = current - target;
  if (Math.abs(drift) > SEEK_THRESHOLD_SECONDS) return { seek: target, rate: 1 };
  if (Math.abs(drift) < RATE_DEADBAND_SECONDS) return { seek: null, rate: 1 };
  const rate = Math.min(
    1 + MAX_RATE_NUDGE,
    Math.max(1 - MAX_RATE_NUDGE, 1 - drift / 2)
  );
  return { seek: null, rate };
}

/** Clamp a requested position to a finite, non-negative value. */
export function clampPosition(pos: number, duration = Number.POSITIVE_INFINITY): number {
  if (!Number.isFinite(pos) || pos < 0) return 0;
  return Math.min(pos, Number.isFinite(duration) ? duration : pos);
}
