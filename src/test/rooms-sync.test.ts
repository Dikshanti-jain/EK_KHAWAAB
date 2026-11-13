import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  MAX_RATE_NUDGE,
  SEEK_THRESHOLD_SECONDS,
  clampPosition,
  correction,
  estimateOffset,
  targetPosition,
} from "@/lib/rooms/sync";
import { createThrottle, MIN_INTERVAL_MS } from "@/lib/rooms/throttle";
import { createRoomCode, isValidCode, roomFromSearch } from "@/lib/rooms/codes";

describe("room sync math", () => {
  it("estimates the host clock with half the round trip", () => {
    // Guest sent at 1000, host clock said 5000, reply arrived 120 ms later.
    const clock = estimateOffset(1000, 5000, 1120);
    expect(clock.rttMs).toBe(120);
    expect(clock.offsetMs).toBe(5000 + 60 - 1120);
  });

  it("never returns a negative round trip", () => {
    expect(estimateOffset(1000, 5000, 900).rttMs).toBe(0);
  });

  it("extrapolates a playing position and freezes a paused one", () => {
    const msg = { pos: 10, sentAt: 1000, playing: true, rate: 1 };
    expect(targetPosition(msg, 0, 3000)).toBe(12);
    expect(targetPosition({ ...msg, playing: false }, 0, 3000)).toBe(10);
  });

  it("applies the clock offset when extrapolating", () => {
    const msg = { pos: 10, sentAt: 1000, playing: true, rate: 1 };
    // Guest clock is 500 ms ahead of the host, so host time is now - 500.
    expect(targetPosition(msg, -500, 3500)).toBe(12);
  });

  it("hard-seeks only beyond 1.5 s", () => {
    expect(SEEK_THRESHOLD_SECONDS).toBe(1.5);
    expect(correction(10, 11.51)).toEqual({ seek: 11.51, rate: 1 });
    expect(correction(10, 11.49).seek).toBeNull();
  });

  it("does nothing inside the 30 ms deadband", () => {
    expect(correction(10, 10.02)).toEqual({ seek: null, rate: 1 });
  });

  it("slows down when ahead and speeds up when behind", () => {
    expect(correction(10.4, 10).rate).toBeLessThan(1);
    expect(correction(9.6, 10).rate).toBeGreaterThan(1);
  });

  it("clamps the rate nudge to ±3%", () => {
    expect(correction(11.4, 10).rate).toBe(1 - MAX_RATE_NUDGE);
    expect(correction(8.6, 10).rate).toBe(1 + MAX_RATE_NUDGE);
  });

  it("clamps positions to a finite, non-negative range", () => {
    expect(clampPosition(-5, 60)).toBe(0);
    expect(clampPosition(Number.NaN, 60)).toBe(0);
    expect(clampPosition(90, 60)).toBe(60);
  });
});

describe("scrubber throttle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends at most four messages per second during a drag", () => {
    const sent: number[] = [];
    const throttle = createThrottle((pos) => sent.push(pos));

    for (let i = 0; i < 30; i++) {
      throttle.push(i);
      vi.advanceTimersByTime(16); // ~60 Hz pointer events
    }

    // ~480 ms of dragging at 60 Hz must not produce 30 messages.
    expect(sent.length).toBeLessThanOrEqual(3);
    vi.advanceTimersByTime(MIN_INTERVAL_MS);
    expect(sent.length).toBeLessThanOrEqual(4);
  });

  it("sends the exact landing position on final()", () => {
    const sent: number[] = [];
    const throttle = createThrottle((pos) => sent.push(pos));
    throttle.push(1);
    throttle.final(42.5);
    expect(sent[sent.length - 1]).toBe(42.5);
  });

  it("cancel() drops a pending trailing message", () => {
    const sent: number[] = [];
    const throttle = createThrottle((pos) => sent.push(pos));
    throttle.push(1);
    throttle.push(2);
    throttle.cancel();
    vi.advanceTimersByTime(1000);
    expect(sent).toEqual([1]);
  });
});

describe("room codes", () => {
  it("generates six unambiguous characters", () => {
    for (let i = 0; i < 50; i++) {
      const code = createRoomCode();
      expect(code).toHaveLength(6);
      expect(isValidCode(code)).toBe(true);
      expect(code).not.toMatch(/[01OIL]/);
    }
  });

  it("rejects malformed codes", () => {
    expect(isValidCode("ABC")).toBe(false);
    expect(isValidCode("ABCDE0")).toBe(false);
    expect(isValidCode("ABCDEI")).toBe(false);
  });

  it("reads a valid room from search and normalises case", () => {
    expect(roomFromSearch({ room: "k7m2qx" })).toBe("K7M2QX");
    expect(roomFromSearch({ room: "nope" })).toBeNull();
    expect(roomFromSearch({})).toBeNull();
  });
});
