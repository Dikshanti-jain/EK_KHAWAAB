// Broadcast throttle for the scrubber.
//
// A pointer drag emits an event per pixel. At 60 Hz that is 60 messages/s per
// participant — enough to hit the per-channel broadcast limit and disconnect
// the room. The local audio still moves immediately; only the network waits.
//
// 4 messages/second = one every 250 ms.

export const MAX_MESSAGES_PER_SECOND = 4;
export const MIN_INTERVAL_MS = 1000 / MAX_MESSAGES_PER_SECOND;

export function createThrottle(send: (pos: number) => void) {
  // -MIN_INTERVAL_MS so the very first push is a leading-edge send even when
  // performance.now() starts at 0 (fake timers, cold tab).
  let last = -MIN_INTERVAL_MS;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending = 0;

  function flush() {
    timer = null;
    last = performance.now();
    send(pending);
  }

  return {
    push(pos: number) {
      pending = pos;
      const now = performance.now();
      if (now - last >= MIN_INTERVAL_MS) {
        last = now;
        send(pos);
      } else if (!timer) {
        timer = setTimeout(flush, MIN_INTERVAL_MS - (now - last));
      }
    },
    final(pos: number) {
      if (timer) clearTimeout(timer);
      timer = null;
      last = performance.now();
      // Leading edge on pointerup: the guest lands on the exact position.
      send(pos);
    },
    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}
