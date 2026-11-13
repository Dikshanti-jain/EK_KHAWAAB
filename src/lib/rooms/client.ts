// The ONLY file allowed to call `supabase.channel`.
//
// A Supabase channel is multiplexed over one WebSocket per client. Two
// channels (presence + sync) cost one socket, not two. A socket is opened
// only from useRoom, only after the room code and the quota probe succeed.
import { supabase } from "@/integrations/supabase/client";

export type Role = "host" | "guest";

export type PresenceMeta = {
  uid: string;
  role: Role;
  takhallus: string;
  t0: number;
  pos: number;
  playing: boolean;
  trackId: string;
};

export type SyncMessage = {
  seq: number;
  pos: number;
  sentAt: number;
  playing: boolean;
  rate: number;
  trackId: string;
};

export type TrackMessage = { trackId: string; pos: number; playing: boolean };

export type RoomHandlers = {
  uid: string;
  onPresence: (state: Record<string, PresenceMeta[]>) => void;
  onJoin: (key: string, newPresences: PresenceMeta[]) => void;
  onLeave: (key: string) => void;
  onSync: (payload: SyncMessage) => void;
  onPing: (payload: { t: number }) => void;
  onPong: (payload: { pingT: number; hostT: number }) => void;
  onRequestState: () => void;
  onBye: () => void;
  onTrack: (payload: TrackMessage) => void;
  onStatus: (channel: "presence" | "sync", status: string) => void;
};

export function openRoom(code: string, handlers: RoomHandlers) {
  const presence = supabase.channel(`room:${code}:presence`, {
    config: { presence: { key: handlers.uid } },
  });

  const sync = supabase.channel(`room:${code}:sync`, {
    config: { broadcast: { self: false, ack: false } },
  });

  presence
    .on("presence", { event: "sync" }, () => handlers.onPresence(presence.presenceState<PresenceMeta>()))
    .on("presence", { event: "join" }, ({ key, newPresences }) =>
      handlers.onJoin(key, newPresences as unknown as PresenceMeta[])
    )
    .on("presence", { event: "leave" }, ({ key }) => handlers.onLeave(key))
    .subscribe((status) => handlers.onStatus("presence", status));

  sync
    .on("broadcast", { event: "sync" }, ({ payload }) => handlers.onSync(payload as SyncMessage))
    .on("broadcast", { event: "ping" }, ({ payload }) => handlers.onPing(payload as { t: number }))
    .on("broadcast", { event: "pong" }, ({ payload }) =>
      handlers.onPong(payload as { pingT: number; hostT: number })
    )
    .on("broadcast", { event: "request_state" }, () => handlers.onRequestState())
    .on("broadcast", { event: "bye" }, () => handlers.onBye())
    .on("broadcast", { event: "track" }, ({ payload }) =>
      handlers.onTrack(payload as TrackMessage)
    )
    .subscribe((status) => handlers.onStatus("sync", status));

  return {
    presence,
    sync,
    track: (state: PresenceMeta) => presence.track(state as unknown as Record<string, unknown>),
    send: (event: string, payload: unknown) =>
      sync.send({ type: "broadcast", event, payload }),
    close: () => {
      void supabase.removeChannel(sync);
      void supabase.removeChannel(presence);
    },
  };
}
