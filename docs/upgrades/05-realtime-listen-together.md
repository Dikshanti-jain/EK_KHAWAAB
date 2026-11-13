# Packet 05 — Listen Together: Room-Scoped Realtime

**Owner:** Sana · **Risk:** medium · **Time:** 3 days · **Reversible:** yes (route removal)

> **Read this first.** `/listen-together` **does not exist** in this repository. `grep -r "channel(|postgres_changes|broadcast|realtime" src/` returns zero matches. There is no audio element, no room code, no presence, no sync code. This packet is a greenfield specification, not a migration. Every number below is a design constraint, not a measurement.

That is an advantage: the 200-connection free-tier quota is entirely unspent, and the failure modes can be designed out before the first user arrives.

## 0. The one rule

**A socket is opened only inside the room route, only after the room code is validated, and only while the tab is visible.** Passive readers — feed, dictionary, studio, AI poet — open **zero** sockets. At 1,000 CCU the target is 20 sockets across 10 rooms, not 1,000.

| User class | Sockets | At 1,000 CCU |
|---|---|---|
| Readers, AI users, studio | 0 | 0 |
| Room participants (2 per room) | 1 per tab | 20 |
| Supabase free quota | 200 | headroom 10× |
| Guard threshold (this packet) | 120 (60%) | rejects the 121st session |

A Supabase channel is multiplexed over one WebSocket per client. Two channels (`presence`, `sync`) cost **one** socket, not two. The quota counts sockets; do not multiply by channel count.

## 1. Scope and non-goals

**v1 scope**

- Create a room → 6-character code. There is no server-side room registry; a code is live while a participant is present.
- Join by code; two participants (host + guest). A third is shown "Room is full" and closes its channel within one presence round-trip.
- Host controls play/pause/seek/track. Guest is receive-only for transport.
- Presence: who is here, host badge, connection state.
- Drift-corrected playback, target < 250 ms.

**Non-goals (explicitly rejected)**

| Idea | Why not |
|---|---|
| Live feed via `postgres_changes` | 1,000 sockets + one DB read per insert; use a 30 s poll instead |
| Chat inside the room | not in the product brief; adds moderation surface |
| More than 2 participants | sync and host authority get materially harder; not needed for a couplet |
| Host migration | a dropped host pauses the room; the guest sees "Host left" and can rejoin |
| WebRTC | better latency, but NAT traversal and no server state; Phase 3 |
| Self-hosted Socket.IO on Render | sticky sessions, a second service, and 10 rooms do not justify it |

**Auth decision:** rooms require a Supabase-authenticated user (`current_shayar_uid()` is non-null). Guests can browse the lobby but cannot open a socket. This is the cheapest abuse control for the quota table in §3, and it matches the product's pen-name model.

## 2. Data model and capacity probe

Realtime presence alone cannot answer "how many sockets are open project-wide" before a socket is opened — that is the whole point of the guard. A tiny heartbeat table answers it.

```sql
-- supabase/migrations/20261120000000_rooms.sql
CREATE TABLE IF NOT EXISTS public.room_sessions (
  room_code  text        NOT NULL CHECK (room_code ~ '^[2-9A-HJ-NP-Z]{6}$'),
  user_uid   text        NOT NULL,
  role       text        NOT NULL CHECK (role IN ('host', 'guest')),
  joined_at  timestamptz NOT NULL DEFAULT now(),
  last_seen  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_code, user_uid)
);

CREATE INDEX IF NOT EXISTS idx_room_sessions_seen
  ON public.room_sessions (last_seen DESC);

ALTER TABLE public.room_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS room_sessions_own ON public.room_sessions;
CREATE POLICY room_sessions_own ON public.room_sessions
  FOR ALL TO authenticated
  USING (user_uid = public.current_shayar_uid())
  WITH CHECK (user_uid = public.current_shayar_uid());

-- One round trip: upsert my presence, return project-wide active sessions.
CREATE OR REPLACE FUNCTION public.room_heartbeat(p_code text, p_role text)
RETURNS TABLE (active integer, capacity integer, ok boolean)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_uid text := public.current_shayar_uid();
  v_active integer;
  v_capacity integer := 120;   -- 60% of the 200-socket free quota
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '28000';
  END IF;

  INSERT INTO public.room_sessions (room_code, user_uid, role, last_seen)
  VALUES (p_code, v_uid, p_role, now())
  ON CONFLICT (room_code, user_uid)
  DO UPDATE SET last_seen = now(), role = EXCLUDED.role;

  SELECT count(DISTINCT user_uid) INTO v_active
  FROM public.room_sessions
  WHERE last_seen > now() - interval '45 seconds';

  RETURN QUERY SELECT v_active, v_capacity, v_active <= v_capacity;
END;
$$;

CREATE OR REPLACE FUNCTION public.room_leave(p_code text)
RETURNS void LANGUAGE sql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  DELETE FROM public.room_sessions
  WHERE room_code = p_code AND user_uid = public.current_shayar_uid();
$$;

REVOKE ALL ON FUNCTION public.room_heartbeat(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.room_leave(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.room_heartbeat(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.room_leave(text) TO authenticated;
```

Why 45 s TTL on a 20 s heartbeat: two missed beats plus scheduling jitter. Why 120: the free quota is 200 sockets, but one user with three tabs is three sockets and one row. The tab guard in §5 keeps that ratio near 1:1; the 80-socket remainder absorbs the error and any future realtime feature.

Cleanup (choose one):

```sql
-- if pg_cron is available
SELECT cron.schedule('room-sessions-cleanup', '*/5 * * * *', $$
  DELETE FROM public.room_sessions WHERE last_seen < now() - interval '10 minutes';
$$);
```

If `pg_cron` is not enabled, delete stale rows opportunistically inside `room_heartbeat` with a 1-in-50 random branch, or add a Render cron. Do not let the table grow unbounded; it is a quota probe, not an analytics table.

**Abuse note:** an authenticated user can create many rooms and inflate `active`, blocking the lobby. Mitigations, in order of cost: `room_heartbeat` is rate-limited by the 45 s TTL and primary key; room creation requires a user gesture and a code that only two people know; if abuse appears, add a `CHECK` on rooms per user per hour via a `room_creations` ledger. Do not add Turnstile here — the socket itself is the scarce resource, and auth is enough for v1.

## 3. Route and module layout

```
src/routes/listen-together.tsx        route + lobby + player shell
src/lib/rooms/codes.ts                alphabet, createRoomCode, isValidCode
src/lib/rooms/client.ts               thin Supabase channel wrapper (the ONLY channel owner)
src/lib/rooms/sync.ts                 pure clock/drift math (unit tested)
src/lib/rooms/useRoom.ts              lifecycle hook (join, heartbeat, visibility, reconnect)
public/audio/*.mp3                    3–5 tracks you own or CC0 — launch dependency
```

### 3.1 Room code

```ts
// src/lib/rooms/codes.ts
// Ambiguous glyphs removed: 0/O and 1/I/L.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const CODE_RE = /^[2-9A-HJ-NP-Z]{6}$/;

export function createRoomCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) {
    // rejection sampling keeps the distribution uniform
    out += ALPHABET[b % ALPHABET.length];
  }
  return out;
}

export const isValidCode = (s: string) => CODE_RE.test(s.toUpperCase());

export function roomFromSearch(search: Record<string, unknown>): string | null {
  const raw = typeof search.room === "string" ? search.room.toUpperCase() : "";
  return isValidCode(raw) ? raw : null;
}
```

Modulo bias with a 32-character alphabet and a 256-value byte is zero (256 / 32 = 8), so the loop above is exact. Keep the comment; the next person will wonder.

### 3.2 Route

```tsx
// src/routes/listen-together.tsx
export const Route = createFileRoute("/listen-together")({
  validateSearch: (search) => ({ room: typeof search.room === "string" ? search.room : undefined }),
  component: ListenTogether,
  errorComponent: ({ reset }) => <RouteFallback title="The room could not open" onRetry={reset} />,
});

function ListenTogether() {
  const { room } = Route.useSearch();
  const code = roomFromSearch({ room });
  const { user } = useStore();
  if (!user) return <SignInPrompt />;
  return code ? <Room code={code} /> : <Lobby />;
}
```

`Lobby` has two actions: **Create a room** (generates a code, `navigate({ search: { room } })`) and **Join with a code** (6 inputs or one paste field). It does not add a link to the primary nav until launch; the route is reachable by direct URL and by the "Listen together" action on a poem card, which is a product decision for Arjun, not this packet. This preserves the existing English nav copy.

### 3.3 The only place a channel is created

```ts
// src/lib/rooms/client.ts
import { supabase } from "@/integrations/supabase/client";

export type Role = "host" | "guest";

export function openRoom(code: string, role: Role, handlers: RoomHandlers) {
  // Two channels, one socket. Presence carries identity; sync carries transport.
  const presence = supabase.channel(`room:${code}:presence`, {
    config: { presence: { key: handlers.uid } },
  });
  const sync = supabase.channel(`room:${code}:sync`, {
    config: { broadcast: { self: false, ack: false } },
  });

  presence
    .on("presence", { event: "sync" }, () => handlers.onPresence(presence.presenceState()))
    .on("presence", { event: "join" }, ({ key, newPresences }) => handlers.onJoin(key, newPresences))
    .on("presence", { event: "leave" }, ({ key }) => handlers.onLeave(key))
    .subscribe((status) => handlers.onStatus("presence", status));

  sync
    .on("broadcast", { event: "sync" }, ({ payload }) => handlers.onSync(payload))
    .on("broadcast", { event: "ping" }, ({ payload }) => handlers.onPing(payload))
    .on("broadcast", { event: "pong" }, ({ payload }) => handlers.onPong(payload))
    .on("broadcast", { event: "request_state" }, () => handlers.onRequestState())
    .on("system", {}, (e) => handlers.onSystem(e))
    .subscribe((status) => handlers.onStatus("sync", status));

  return {
    presence,
    sync,
    track: (state: Record<string, unknown>) => presence.track(state),
    send: (event: string, payload: unknown) => sync.send({ type: "broadcast", event, payload }),
    close: () => {
      void supabase.removeChannel(sync);
      void supabase.removeChannel(presence);
    },
  };
}
```

`client.ts` is the **only** file allowed to call `supabase.channel`. Enforce it:

```jsonc
// eslint rule (flat config)
{
  "rules": {
    "no-restricted-syntax": ["error", {
      "selector": "CallExpression[callee.property.name='channel']",
      "message": "Use src/lib/rooms/client.ts — sockets must be room-scoped."
    }]
  }
}
```

One exception: the client wrapper itself. Scope the rule with an override for `src/lib/rooms/client.ts`.

## 4. Protocol

### 4.1 Presence payload

```ts
type Presence = {
  uid: string;
  role: "host" | "guest";
  takhallus: string;      // display only
  t0: number;             // host clock at join, Date.now()
  pos: number;            // seconds
  playing: boolean;
  trackId: string;
};
```

Tracked on join and refreshed every 20 s while visible. Presence is **not** the sync transport; it is who-is-here plus a coarse state for a late joiner.

### 4.2 Broadcast messages

| Event | Direction | Payload | Rate |
|---|---|---|---|
| `sync` | host → guest | `{ seq, pos, sentAt, playing, rate, trackId }` | ≤ 4/s |
| `request_state` | guest → host | `{}` | on join/reconnect/visible |
| `ping` | guest → host | `{ t: guestNow }` | 1 per 10 s, and on reconnect |
| `pong` | host → guest | `{ pingT, hostT }` | reply |
| `bye` | either | `{}` | on intentional leave |
| `track` | host → guest | `{ trackId, pos: 0, playing: false }` | on track change |

`seq` is monotonic per host session. The guest ignores any `sync` with `seq <= lastSeq`. This is the entire defence against out-of-order broadcast delivery, and it costs one integer.

### 4.3 Clock offset and target position

```ts
// src/lib/rooms/sync.ts — pure, unit tested, no DOM
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
 *   |drift| > 0.25 s  → hard seek (audible, but rare)
 *   otherwise         → a small rate nudge, deadband ±0.03 s
 */
export function correction(
  current: number,
  target: number
): { seek: number | null; rate: number } {
  const drift = current - target;
  if (Math.abs(drift) > 0.25) return { seek: target, rate: 1 };
  if (Math.abs(drift) < 0.03) return { seek: null, rate: 1 };
  const rate = Math.min(1.03, Math.max(0.97, 1 - drift / 2));
  return { seek: null, rate };
}
```

Sign check: if the guest is **ahead** (`drift > 0`), `rate < 1` slows it down. If behind, `rate > 1` catches up. Clamp to ±3%; beyond that, a seek is less noticeable than chipmunk audio.

Apply loop:

```ts
// guest, every 500 ms while playing and visible
const t = targetPosition(lastSync, clock.offsetMs, Date.now());
const { seek, rate } = correction(audio.currentTime, t);
if (seek !== null) audio.currentTime = seek;
if (audio.playbackRate !== rate) audio.playbackRate = rate;
```

Do **not** run this loop while `document.hidden`; browsers throttle timers and a stale target will cause a seek storm on return. On `visibilitychange → visible`, request a fresh `sync` and reset the loop.

### 4.4 Applying play/pause

```ts
if (msg.playing && audio.paused) {
  await audio.play().catch(() => setNeedsGesture(true));
}
if (!msg.playing && !audio.paused) audio.pause();
```

Guests will hit the mobile autoplay policy. The first `play()` without a user gesture rejects. Show a one-time overlay: **"Tap to join the listening"**. After that gesture, subsequent `play()` calls are allowed. This is not an edge case; it is the default on iOS Safari and Chrome Android.

## 5. Lifecycle

| Trigger | Action | Reason |
|---|---|---|
| route mount, valid code | `room_heartbeat` → if `ok` open channels; else `room_leave` + "Rooms are full" | quota guard before the socket, not after |
| `SUBSCRIBED` (both) | `presence.track(...)`, guest sends `request_state` | late join gets current state |
| heartbeat | every 20 s while visible | keeps quota row fresh |
| `visibilitychange → hidden` | stop sending sync/ping; keep receiving; start 10-min timer | a background tab should not hold a socket forever |
| hidden 60 s | stop the drift loop | timers are throttled; a stale target is worse than none |
| hidden 10 min | `close()`, set `needsReconnect` | frees a quota slot |
| `visibilitychange → visible` | if closed, re-run heartbeat + open; send `request_state` | resync, never trust local time |
| `online` | if closed or errored, reconnect with backoff | Wi-Fi → 5G handoff |
| `pagehide` / route unmount | `room_leave`, `close()` | best effort; the 45 s TTL is the backstop |
| `CHANNEL_ERROR` / `TIMED_OUT` | backoff 500 ms → 8 s, jitter, max 6; then manual "Reconnect" | avoid a reconnect storm |
| host presence `leave` | pause, show "Host left" | no host migration in v1 |
| third presence join | all three see 3 presences; the third closes its channel and shows "Room is full" | capacity is 2, enforced at presence, not at the socket |

**Tab guard (recommended):** use `BroadcastChannel("room:" + code)` to detect a second tab. The second tab shows "This room is open in another tab" and does not subscribe. This keeps sockets ≈ sessions, which is what makes the 120 threshold honest.

### Reconnect implementation sketch

```ts
let attempt = 0;
function scheduleReconnect() {
  if (attempt >= 6) return setStatus("offline");
  const base = Math.min(500 * 2 ** attempt, 8_000);
  const jitter = base * 0.2 * Math.random();
  attempt++;
  setTimeout(() => {
    void join(); // heartbeat → open → request_state
  }, base + jitter);
}
```

On successful `SUBSCRIBED`, reset `attempt = 0` and request state. Do not trust `audio.currentTime` after a reconnect; the host is authoritative.

## 6. Debouncing the scrubber

A pointer drag emits an event per pixel. At 60 Hz that is 60 messages/s per participant — enough to hit the per-channel broadcast rate limit and disconnect the room.

```ts
// src/lib/rooms/throttle.ts
export function createThrottle(send: (pos: number) => void) {
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending = 0;
  const MAX_PER_SEC = 4;

  function flush() {
    timer = null;
    last = performance.now();
    send(pending);
  }

  return {
    push(pos: number) {
      pending = pos;
      const now = performance.now();
      if (now - last >= 1000 / MAX_PER_SEC) {
        last = now;
        send(pos);
      } else if (!timer) {
        timer = setTimeout(flush, 1000 / MAX_PER_SEC - (now - last));
      }
    },
    final(pos: number) {
      if (timer) clearTimeout(timer);
      timer = null;
      last = performance.now();
      send(pos);           // leading edge on pointerup: exact landing position
    },
    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}
```

Usage: `onInput → throttle.push(audio.currentTime)`, `onPointerUp → throttle.final(audio.currentTime)`. The local audio moves immediately; only the network is throttled. The guest lands on the exact position because the final message is sent, not coalesced.

## 7. Audio source

The repository contains no audio files. v1 needs 3–5 tracks that the project owns or that are CC0. Do not hotlink a third-party host.

```ts
// src/data/tracks.ts
export type Track = { id: string; title: string; artist: string; url: string; duration: number };
export const TRACKS: Track[] = [
  { id: "monsoon", title: "Monsoon Letters", artist: "Ek Khwaab", url: "/audio/monsoon.mp3", duration: 214 },
  // ...
];
```

`<audio preload="metadata" playsInline src={track.url} />`. Serve from the same origin so the edge cache in packet 04 applies (`/audio/*` should get `max-age=604800`).

**If YouTube is a hard requirement** (because the tracks are already there), use the IFrame API with `enablejsapi=1`, `origin=https://ekkhwaab.in`, and accept ±300 ms accuracy. The API's `getCurrentTime()` is coarser than `HTMLAudioElement.currentTime`, and ads make host authority impossible. Do not mix YouTube for some tracks and HTML audio for others; the sync model assumes one clock source.

## 8. Tests

```ts
// src/lib/rooms/sync.test.ts
import { describe, it, expect } from "vitest";
import { estimateOffset, targetPosition, correction } from "./sync";

describe("clock", () => {
  it("estimates a positive offset when the host clock is ahead", () => {
    // guest ping at 1000, host replies at 5000, guest receives at 1200
    const c = estimateOffset(1000, 5000, 1200);
    expect(c.rttMs).toBe(200);
    expect(c.offsetMs).toBe(5000 + 100 - 1200); // 3900
  });

  it("projects a playing position forward", () => {
    const pos = targetPosition({ pos: 10, sentAt: 5000, playing: true, rate: 1 }, 0, 7000);
    expect(pos).toBe(12);
  });

  it("does not project when paused", () => {
    expect(targetPosition({ pos: 10, sentAt: 5000, playing: false, rate: 1 }, 0, 9000)).toBe(10);
  });

  it("seeks beyond 250 ms and nudges below it", () => {
    expect(correction(10.4, 10).seek).toBe(10);
    expect(correction(10.1, 10).seek).toBeNull();
    expect(correction(10.1, 10).rate).toBeLessThan(1);
    expect(correction(9.9, 10).rate).toBeGreaterThan(1);
  });

  it("clamps the rate correction", () => {
    expect(correction(10.24, 10).rate).toBe(0.97);
    expect(correction(9.76, 10).rate).toBe(1.03);
  });
});
```

Run with the existing `npm test` (Vitest). These are pure functions; no Supabase mock is needed.

Manual matrix (two devices, one on Wi-Fi, one on 5G):

| Scenario | Expected |
|---|---|
| host plays, guest joins | guest starts within 250 ms of host |
| host scrubs rapidly for 3 s | ≤ 4 messages/s observed; no disconnect |
| guest backgrounds 2 min, returns | one `request_state`, one seek at most |
| guest backgrounds 12 min, returns | "Reconnect" → fresh sync, no drift runaway |
| Wi-Fi → 5G on guest | auto-reconnect ≤ 8 s, resync |
| host closes tab | guest pauses within 2 s, "Host left" |
| third user opens the link | "Room is full" within 2 s; its socket closes |
| 130 sessions in the probe | 121st sees "Rooms are full" before subscribing |

## 9. Verify

```bash
# schema and grants
psql "$SUPABASE_DB_URL" -c "\df public.room_heartbeat"
psql "$SUPABASE_DB_URL" -c "select proname, proacl from pg_proc where proname like 'room_%';"

# anon cannot call the RPC
curl -s -X POST "https://<proj>.supabase.co/rest/v1/rpc/room_heartbeat" \
  -H "apikey: $ANON" -H "content-type: application/json" \
  -d '{"p_code":"ABC234","p_role":"host"}' | jq
# expect 401/403, not a row
```

- [ ] a reader on `/feed` opens no WebSocket (DevTools → Network → WS)
- [ ] joining a room opens exactly one WebSocket
- [ ] unmounting the route closes it (`supabase.getChannels().length === 0` in dev)
- [ ] heartbeat row disappears after `room_leave`
- [ ] stale row disappears within 10 min after a hard tab kill
- [ ] 3rd participant sees "Room is full" and closes its channel within 2 s
- [ ] a rejected 121st session calls `room_leave` so it does not inflate the probe
- [ ] guest audio starts only after the tap overlay
- [ ] drift stays under 250 ms for a 10-minute session
- [ ] no `postgres_changes` subscription anywhere in the bundle

## 10. Rollback

| Change | Rollback | Time |
|---|---|---|
| route | remove `listen-together.tsx` and any link; no other route imports it | 5 min |
| channels | `openRoom` is the only owner; deleting the module stops all sockets | 5 min |
| schema | `DROP TABLE room_sessions CASCADE; DROP FUNCTION room_heartbeat, room_leave;` | 2 min |
| audio | remove `public/audio/*`; no other page references it | 2 min |

The feature is additive. Nothing in the existing feed, studio, letters or AI paths imports it, so rollback cannot break the launch surface.

## 11. Why this design survives 1,000 CCU

| Failure mode | Guard |
|---|---|
| 1,000 global sockets | sockets only inside the room route; zero elsewhere |
| quota exhaustion at 200 | 120-session probe rejects before `subscribe` |
| reconnect storm | exponential backoff + jitter + 6-attempt cap + manual fallback |
| broadcast flood from a scrubber | 4 msg/s throttle + final leading edge |
| mobile handoff drift | NTP-style offset + hard seek > 250 ms + rate nudge |
| background tab holding a socket | 10-minute disconnect, reconnect on visible |
| out-of-order messages | monotonic `seq`, ignore stale |
| host disappears | pause + explicit "Host left"; no silent split-brain |
| a second tab doubling sockets | `BroadcastChannel` tab guard |

The design is deliberately boring: one socket per visible tab, one authoritative host, one integer sequence, one clock offset. The alternatives — WebRTC, server-authoritative time, host migration — are all better at a scale this product does not have yet.
