// Room lifecycle. This is the only hook that opens a Realtime socket, and it
// only does so after the quota probe succeeds and the route is mounted.
//
// Rules encoded here:
//   * zero sockets outside an active room
//   * 2-seat guard enforced at presence, not at the socket
//   * host is authoritative for transport; guest applies remote actions behind
//     an isRemoteActionRef lock so a remote pause cannot echo back as a local one
//   * hidden tab stops sending, and closes after 10 minutes
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TRACKS } from "@/data/tracks";
import {
  openRoom,
  type PresenceMeta,
  type Role,
  type SyncMessage,
  type TrackMessage,
} from "./client";
import { clampPosition, correction, estimateOffset, targetPosition, type Clock } from "./sync";
import { createThrottle } from "./throttle";

const HEARTBEAT_MS = 20_000;
const PING_MS = 10_000;
const SYNC_MS = 1_000;
const DRIFT_MS = 500;
const HIDDEN_CLOSE_MS = 10 * 60_000;
const MAX_RECONNECT = 6;
const REMOTE_LOCK_MS = 400;

export type RoomStatus =
  | "joining"
  | "connected"
  | "full"
  | "auth-required"
  | "offline"
  | "host-left";

export type Participant = { uid: string; role: Role; takhallus: string; self: boolean };

type RoomClient = ReturnType<typeof openRoom>;
type Timer = ReturnType<typeof setInterval> | null;

function trackById(id: string) {
  return TRACKS.find((t) => t.id === id) ?? TRACKS[0];
}

export function useRoom({
  code,
  role,
  takhallus,
  audioRef,
}: {
  code: string;
  role: Role;
  takhallus: string;
  audioRef: RefObject<HTMLAudioElement | null>;
}) {
  const [status, setStatus] = useState<RoomStatus>("joining");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isHost, setIsHost] = useState(role === "host");
  const [needsGesture, setNeedsGesture] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [trackId, setTrackId] = useState(TRACKS[0]!.id);
  const [position, setPosition] = useState(0);

  const myUidRef = useRef("");
  const roleRef = useRef<Role>(role);
  const takhallusRef = useRef(takhallus);
  const clientRef = useRef<RoomClient | null>(null);
  const participantsRef = useRef<Participant[]>([]);
  const joiningRef = useRef(false);
  const unmountedRef = useRef(false);
  const intentionalRef = useRef(false);
  const hostSeenRef = useRef(false);
  const hiddenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const heartbeatRef = useRef<Timer>(null);
  const syncTimerRef = useRef<Timer>(null);
  const pingTimerRef = useRef<Timer>(null);
  const driftTimerRef = useRef<Timer>(null);

  const seqRef = useRef(0);
  const lastSeqRef = useRef(0);
  const lastSyncRef = useRef<SyncMessage | null>(null);
  const clockRef = useRef<Clock>({ offsetMs: 0, rttMs: 0 });
  const hasClockRef = useRef(false);
  const trackIdRef = useRef(TRACKS[0]!.id);
  const isRemoteActionRef = useRef(false);
  const joinRef = useRef<(() => Promise<void>) | null>(null);
  const scrubThrottleRef = useRef<ReturnType<typeof createThrottle> | null>(null);

  takhallusRef.current = takhallus;

  const clearTimer = (ref: { current: Timer }) => {
    if (ref.current) clearInterval(ref.current);
    ref.current = null;
  };

  // Remote actions are asynchronous (play() resolves, events fire later), so
  // the lock is time-boxed rather than released on the next microtask.
  const applyRemote = useCallback((fn: () => void) => {
    isRemoteActionRef.current = true;
    if (remoteLockTimerRef.current) clearTimeout(remoteLockTimerRef.current);
    remoteLockTimerRef.current = setTimeout(() => {
      isRemoteActionRef.current = false;
    }, REMOTE_LOCK_MS);
    fn();
  }, []);

  const loadTrack = useCallback(
    (nextTrackId: string, pos: number, shouldPlay: boolean) => {
      const audio = audioRef.current;
      const track = trackById(nextTrackId);
      if (!audio || !track) return;

      trackIdRef.current = track.id;
      setTrackId(track.id);

      const applyPosition = () => {
        audio.currentTime = clampPosition(pos, audio.duration);
        setPosition(audio.currentTime);
      };

      if (!audio.src.endsWith(track.url)) {
        audio.src = track.url;
        audio.load();
        const onReady = () => {
          audio.removeEventListener("loadedmetadata", onReady);
          applyPosition();
          if (shouldPlay) {
            audio.play().catch(() => setNeedsGesture(true));
          }
        };
        audio.addEventListener("loadedmetadata", onReady);
      } else {
        applyPosition();
        if (shouldPlay) audio.play().catch(() => setNeedsGesture(true));
      }
    },
    [audioRef]
  );

  const broadcastState = useCallback(() => {
    if (roleRef.current !== "host") return;
    const audio = audioRef.current;
    const client = clientRef.current;
    if (!audio || !client) return;
    seqRef.current += 1;
    client.send("sync", {
      seq: seqRef.current,
      pos: audio.currentTime,
      sentAt: Date.now(),
      playing: !audio.paused,
      rate: audio.playbackRate || 1,
      trackId: trackIdRef.current,
    } satisfies SyncMessage);
  }, [audioRef]);

  const closeChannels = useCallback(() => {
    clearTimer(heartbeatRef);
    clearTimer(syncTimerRef);
    clearTimer(pingTimerRef);
    clearTimer(driftTimerRef);
    scrubThrottleRef.current?.cancel();
    if (hiddenTimerRef.current) clearTimeout(hiddenTimerRef.current);
    hiddenTimerRef.current = null;
    clientRef.current?.close();
    clientRef.current = null;
  }, []);

  const leave = useCallback(
    async (announce = true) => {
      intentionalRef.current = true;
      if (announce) {
        try {
          clientRef.current?.send("bye", {});
        } catch {
          // socket already gone
        }
      }
      closeChannels();
      try {
        await supabase.rpc("room_leave", { p_code: code });
      } catch {
        // the 45 s TTL is the backstop
      }
    },
    [closeChannels, code]
  );

  const startGuestClock = useCallback(() => {
    const client = clientRef.current;
    if (!client || roleRef.current !== "guest") return;
    clearTimer(pingTimerRef);
    const ping = () => {
      if (document.hidden) return;
      client.send("ping", { t: Date.now() });
    };
    ping();
    pingTimerRef.current = setInterval(ping, PING_MS);
  }, []);

  const startDriftLoop = useCallback(() => {
    clearTimer(driftTimerRef);
    driftTimerRef.current = setInterval(() => {
      if (document.hidden) return;
      const audio = audioRef.current;
      const msg = lastSyncRef.current;
      if (!audio || !msg || !msg.playing || !hasClockRef.current) return;

      const target = targetPosition(msg, clockRef.current.offsetMs, Date.now());
      const { seek, rate } = correction(audio.currentTime, target);

      applyRemote(() => {
        if (seek !== null) audio.currentTime = clampPosition(seek, audio.duration);
        if (audio.playbackRate !== rate) audio.playbackRate = rate;
      });
      setPosition(audio.currentTime);
    }, DRIFT_MS);
  }, [applyRemote, audioRef]);

  const startHostBroadcast = useCallback(() => {
    clearTimer(syncTimerRef);
    syncTimerRef.current = setInterval(() => {
      if (document.hidden) return;
      const audio = audioRef.current;
      if (!audio || audio.paused) return;
      broadcastState();
      setPosition(audio.currentTime);
    }, SYNC_MS);
  }, [audioRef, broadcastState]);

  const startHeartbeat = useCallback(() => {
    clearTimer(heartbeatRef);
    heartbeatRef.current = setInterval(() => {
      if (document.hidden) return;
      void supabase.rpc("room_heartbeat", { p_code: code, p_role: roleRef.current });
    }, HEARTBEAT_MS);
  }, [code]);

  const markHostLeft = useCallback(() => {
    const audio = audioRef.current;
    if (audio && !audio.paused) audio.pause();
    setPlaying(false);
    setStatus("host-left");
  }, [audioRef]);

  const handlePresence = useCallback(
    (state: Record<string, PresenceMeta[]>) => {
      // One entry per person, not per tab. Supabase keeps a meta array per
      // presence key, so a second tab would otherwise consume the second seat
      // and evict the actual guest.
      const byUid = new Map<string, PresenceMeta>();
      for (const p of Object.values(state).flat()) {
        const existing = byUid.get(p.uid);
        if (
          !existing ||
          (p.role === "host" && existing.role !== "host") ||
          (p.role === existing.role && p.t0 < existing.t0)
        ) {
          byUid.set(p.uid, p);
        }
      }

      const list = [...byUid.values()].sort((a, b) => {
        // Host first, then earliest join. Deterministic on every client.
        if (a.role !== b.role) return a.role === "host" ? -1 : 1;
        return a.t0 - b.t0;
      });

      const seen = list.map((p) => ({
        uid: p.uid,
        role: p.role,
        takhallus: p.takhallus,
        self: p.uid === myUidRef.current,
      }));
      participantsRef.current = seen;
      setParticipants(seen);

      if (list.some((p) => p.role === "host")) hostSeenRef.current = true;

      // A host who returns after a drop clears the "Host left" banner.
      if (roleRef.current === "guest" && list.some((p) => p.role === "host")) {
        setStatus((prev) => (prev === "host-left" ? "connected" : prev));
      }

      // 2-seat guard. Everyone computes the same keep-set; the loser closes.
      if (list.length > 2) {
        const keep = list.slice(0, 2).map((p) => p.uid);
        if (!keep.includes(myUidRef.current)) {
          void leave(false);
          setStatus("full");
          return;
        }
      }

      // A second host (two people opened ?host=1) is demoted deterministically.
      const hosts = list.filter((p) => p.role === "host");
      if (hosts.length > 1 && roleRef.current === "host") {
        const winner = hosts.slice().sort((a, b) => a.t0 - b.t0 || a.uid.localeCompare(b.uid))[0];
        if (winner && winner.uid !== myUidRef.current) {
          roleRef.current = "guest";
          setIsHost(false);
          const me = list.find((p) => p.uid === myUidRef.current);
          if (me) clientRef.current?.track({ ...me, role: "guest" });
          clearTimer(syncTimerRef);
          startGuestClock();
          startDriftLoop();
        }
      }

      // Guest: the host disappeared. Pause and surface it. Ignore the brief
      // window before the host's first presence lands.
      if (
        roleRef.current === "guest" &&
        hostSeenRef.current &&
        !list.some((p) => p.role === "host")
      ) {
        markHostLeft();
      }
    },
    [leave, markHostLeft, startDriftLoop, startGuestClock]
  );

  const handleSync = useCallback(
    (payload: SyncMessage) => {
      if (roleRef.current !== "guest") return;
      if (payload.seq <= lastSeqRef.current) return;
      lastSeqRef.current = payload.seq;
      lastSyncRef.current = payload;

      setPlaying(payload.playing);

      const audio = audioRef.current;
      if (!audio) return;

      if (payload.trackId !== trackIdRef.current) {
        applyRemote(() => loadTrack(payload.trackId, payload.pos, payload.playing));
        return;
      }

      applyRemote(() => {
        if (payload.playing && audio.paused) {
          audio.play().catch(() => setNeedsGesture(true));
        } else if (!payload.playing && !audio.paused) {
          audio.pause();
        }
        if (!payload.playing) {
          audio.currentTime = clampPosition(payload.pos, audio.duration);
          setPosition(audio.currentTime);
        }
      });
    },
    [applyRemote, audioRef, loadTrack]
  );

  const scheduleReconnect = useCallback(() => {
    if (intentionalRef.current || unmountedRef.current) return;
    if (reconnectAttemptRef.current >= MAX_RECONNECT) {
      setStatus("offline");
      return;
    }
    const attempt = reconnectAttemptRef.current++;
    const base = Math.min(500 * 2 ** attempt, 8_000);
    const jitter = base * 0.2 * Math.random();
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = setTimeout(() => {
      void joinRef.current?.();
    }, base + jitter);
  }, []);

  const join = useCallback(async () => {
    if (joiningRef.current || unmountedRef.current) return;
    joiningRef.current = true;
    setStatus("joining");

    try {
      const { data: auth } = await supabase.auth.getUser();
      if (unmountedRef.current) return;
      const authUser = auth.user;
      if (!authUser) {
        setStatus("auth-required");
        return;
      }
      myUidRef.current = authUser.id;

      const { data, error } = await supabase.rpc("room_heartbeat", {
        p_code: code,
        p_role: roleRef.current,
      });
      if (unmountedRef.current) {
        // The route unmounted while the probe was in flight; release the seat.
        void supabase.rpc("room_leave", { p_code: code });
        return;
      }
      if (error) throw error;
      const probe = data?.[0];
      if (!probe?.ok) {
        await supabase.rpc("room_leave", { p_code: code });
        setStatus("full");
        return;
      }

      intentionalRef.current = false;
      clearTimer(heartbeatRef);

      const client = openRoom(code, {
        uid: authUser.id,
        onPresence: handlePresence,
        onJoin: () => {
          // A late joiner needs the current transport state.
          if (roleRef.current === "host") broadcastState();
        },
        onLeave: (key) => {
          const wasHost = participantsRef.current.find((p) => p.uid === key)?.role === "host";
          if (wasHost && roleRef.current === "guest") markHostLeft();
        },
        onSync: handleSync,
        onPing: (payload) => {
          if (roleRef.current === "host") {
            clientRef.current?.send("pong", { pingT: payload.t, hostT: Date.now() });
          }
        },
        onPong: (payload) => {
          if (roleRef.current !== "guest") return;
          clockRef.current = estimateOffset(payload.pingT, payload.hostT, Date.now());
          hasClockRef.current = true;
        },
        onRequestState: () => {
          if (roleRef.current === "host") broadcastState();
        },
        onBye: () => {
          if (roleRef.current === "guest") markHostLeft();
        },
        onTrack: (payload: TrackMessage) => {
          if (roleRef.current !== "guest") return;
          applyRemote(() => loadTrack(payload.trackId, payload.pos, payload.playing));
        },
        onStatus: (channel, next) => {
          if (next === "SUBSCRIBED") {
            reconnectAttemptRef.current = 0;
            if (channel === "presence") {
              const audio = audioRef.current;
              const me: PresenceMeta = {
                uid: myUidRef.current,
                role: roleRef.current,
                takhallus: takhallusRef.current,
                t0: Date.now(),
                pos: audio?.currentTime ?? 0,
                playing: audio ? !audio.paused : false,
                trackId: trackIdRef.current,
              };
              clientRef.current?.track(me);
              setStatus("connected");
              startHeartbeat();
              if (roleRef.current === "host") {
                startHostBroadcast();
              } else {
                startGuestClock();
                startDriftLoop();
                clientRef.current?.send("request_state", {});
              }
            } else if (roleRef.current === "host") {
              // The sync channel is the one that carries broadcast; send now
              // that it is actually joined.
              broadcastState();
            }
            return;
          }

          if (next === "CHANNEL_ERROR" || next === "TIMED_OUT" || next === "CLOSED") {
            if (intentionalRef.current) return;
            closeChannels();
            scheduleReconnect();
          }
        },
      });

      clientRef.current = client;
    } catch {
      closeChannels();
      setStatus("offline");
      scheduleReconnect();
    } finally {
      joiningRef.current = false;
    }
  }, [
    applyRemote,
    audioRef,
    broadcastState,
    closeChannels,
    code,
    handlePresence,
    handleSync,
    loadTrack,
    markHostLeft,
    scheduleReconnect,
    startDriftLoop,
    startGuestClock,
    startHeartbeat,
    startHostBroadcast,
  ]);

  joinRef.current = join;

  // Initial join, and teardown on unmount / pagehide.
  useEffect(() => {
    unmountedRef.current = false;
    void joinRef.current?.();

    const onPageHide = () => {
      void leave(true);
    };
    const onVisibility = () => {
      if (document.hidden) {
        // Stop sending; keep receiving. A background tab must not hold a
        // socket forever.
        clearTimer(syncTimerRef);
        clearTimer(pingTimerRef);
        clearTimer(driftTimerRef);
        if (hiddenTimerRef.current) clearTimeout(hiddenTimerRef.current);
        hiddenTimerRef.current = setTimeout(() => {
          void leave(false);
          setStatus("offline");
        }, HIDDEN_CLOSE_MS);
        return;
      }

      if (hiddenTimerRef.current) clearTimeout(hiddenTimerRef.current);
      hiddenTimerRef.current = null;

      if (!clientRef.current) {
        void joinRef.current?.();
        return;
      }

      if (roleRef.current === "host") {
        startHostBroadcast();
        broadcastState();
      } else {
        startGuestClock();
        startDriftLoop();
        clientRef.current?.send("request_state", {});
      }
    };
    const onOnline = () => {
      if (!clientRef.current) void joinRef.current?.();
    };

    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);

    return () => {
      unmountedRef.current = true;
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (remoteLockTimerRef.current) clearTimeout(remoteLockTimerRef.current);
      void leave(true);
    };
    // One-shot: re-running on callback identity changes would tear down the
    // socket on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // Keep the local transport state in sync with the element.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => {
      setPlaying(true);
      if (roleRef.current === "host" && !isRemoteActionRef.current) broadcastState();
    };
    const onPause = () => {
      setPlaying(false);
      if (roleRef.current === "host" && !isRemoteActionRef.current) broadcastState();
    };
    const onTime = () => setPosition(audio.currentTime);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("timeupdate", onTime);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("timeupdate", onTime);
    };
  }, [audioRef, broadcastState]);

  const toggle = useCallback(() => {
    if (roleRef.current !== "host") return;
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => setNeedsGesture(true));
    } else {
      audio.pause();
    }
  }, [audioRef]);

  const seek = useCallback(
    (pos: number) => {
      if (roleRef.current !== "host") return;
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = clampPosition(pos, audio.duration);
      setPosition(audio.currentTime);
      if (!scrubThrottleRef.current) {
        scrubThrottleRef.current = createThrottle(() => broadcastState());
      }
      scrubThrottleRef.current.push(pos);
    },
    [audioRef, broadcastState]
  );

  // Pointer-up: send the exact landing position, bypassing the 250 ms window.
  const commitSeek = useCallback(
    (pos: number) => {
      if (roleRef.current !== "host") return;
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = clampPosition(pos, audio.duration);
      setPosition(audio.currentTime);
      if (!scrubThrottleRef.current) {
        scrubThrottleRef.current = createThrottle(() => broadcastState());
      }
      scrubThrottleRef.current.final(pos);
    },
    [audioRef, broadcastState]
  );

  const selectTrack = useCallback(
    (nextTrackId: string) => {
      if (roleRef.current !== "host") return;
      const audio = audioRef.current;
      const wasPlaying = audio ? !audio.paused : false;
      loadTrack(nextTrackId, 0, wasPlaying);
      clientRef.current?.send("track", {
        trackId: nextTrackId,
        pos: 0,
        playing: wasPlaying,
      } satisfies TrackMessage);
      seqRef.current += 1;
      clientRef.current?.send("sync", {
        seq: seqRef.current,
        pos: 0,
        sentAt: Date.now(),
        playing: wasPlaying,
        rate: 1,
        trackId: nextTrackId,
      } satisfies SyncMessage);
    },
    [audioRef, loadTrack]
  );

  /** Called by the "Tap to join the listening" overlay after a user gesture. */
  const unlockAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setNeedsGesture(false);
    audio
      .play()
      .then(() => {
        if (roleRef.current === "guest") clientRef.current?.send("request_state", {});
      })
      .catch(() => setNeedsGesture(true));
  }, [audioRef]);

  const reconnect = useCallback(() => {
    reconnectAttemptRef.current = 0;
    intentionalRef.current = false;
    void join();
  }, [join]);

  return {
    status,
    participants,
    isHost,
    needsGesture,
    playing,
    trackId,
    position,
    leave,
    reconnect,
    actions: { toggle, seek, commitSeek, selectTrack, unlockAudio },
  };
}
