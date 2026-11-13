import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState, type ReactNode } from "react";
import {
  AlertCircle,
  Check,
  Copy,
  Loader2,
  LogOut,
  Music,
  Pause,
  Play,
  Radio,
  Users,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useDocumentSEO } from "@/hooks/useDocumentSEO";
import { TRACKS } from "@/data/tracks";
import { createRoomCode, isValidCode, roomFromSearch } from "@/lib/rooms/codes";
import { useRoom } from "@/lib/rooms/useRoom";
import { btnOutline, btnPrimary, card, input, label } from "@/components/kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/listen-together")({
  validateSearch: (search: Record<string, unknown>): { room?: string; host?: string } => {
    // Build the object conditionally: exactOptionalPropertyTypes rejects
    // `{ room: undefined }`, and navigation with `{}` must stay valid.
    const out: { room?: string; host?: string } = {};
    if (typeof search["room"] === "string") out.room = search["room"].toUpperCase();
    if (search["host"] === "1") out.host = "1";
    return out;
  },
  head: () => ({
    meta: [
      { title: "Listen Together — Shayari & Ambient Rooms | Ek Khwaab" },
      {
        name: "description",
        content:
          "Open a private two-person listening room and share ambient shayari soundscapes in sync, with drift-corrected playback and a six-character room code.",
      },
      { property: "og:title", content: "Listen Together — Ek Khwaab" },
      {
        property: "og:description",
        content: "A private two-person room for ambient shayari. One host, one listener, one clock.",
      },
      { property: "og:url", content: "https://ekkhwaab.in/listen-together" },
    ],
  }),
  component: ListenTogether,
});

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function ListenTogether() {
  useDocumentSEO({
    title: "Listen Together — Shayari & Ambient Rooms | Ek Khwaab",
    description:
      "Open a private two-person listening room and share ambient shayari soundscapes in sync, with drift-corrected playback and a six-character room code.",
    canonicalPath: "/listen-together",
  });

  const { user } = useStore();
  const search = Route.useSearch();
  const code = roomFromSearch({ room: search.room });

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 md:py-24">
        <div className={cn(card, "p-6 text-center sm:p-10")}>
          <span className="inline-flex items-center gap-2 rounded-full bg-blush px-3 py-1 text-xs font-medium text-crimson">
            <Radio className="size-3.5" /> Listen Together
          </span>
          <h1 className="mt-4 text-2xl font-semibold text-ink sm:text-3xl">A room needs a pen name</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Rooms are private and hold two people. Sign in or choose a pen name first, then open a
            listening room.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link to="/auth" search={{ mode: "signin" }} className={btnPrimary}>
              Sign in
            </Link>
            <Link to="/feed" className={btnOutline}>
              Back to the feed
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return code ? <Room code={code} isHostParam={search.host === "1"} /> : <Lobby />;
}

function Lobby() {
  const nav = useNavigate();
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = () => {
    const next = createRoomCode();
    nav({ to: "/listen-together", search: { room: next, host: "1" } });
  };

  const join = () => {
    const clean = joinCode.trim().toUpperCase();
    if (!isValidCode(clean)) {
      setError("A room code is six characters, without 0, O, 1, I or L.");
      return;
    }
    setError(null);
    nav({ to: "/listen-together", search: { room: clean } });
  };

  return (
    <div className="mx-auto max-w-3xl px-3.5 py-8 sm:px-6 md:py-16">
      <span className="inline-flex items-center gap-2 rounded-full bg-blush px-3 py-1 text-xs font-medium text-crimson">
        <Radio className="size-3.5" /> Listen Together
      </span>
      <h1 className="mt-3 text-2xl font-semibold text-ink sm:text-3xl md:text-5xl">
        One poem, one room, one clock
      </h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
        Open a private room for two. The host chooses the ambient track and controls playback; the
        listener hears the same line at the same moment.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className={cn(card, "p-5 sm:p-7")}>
          <div className="flex items-center gap-2">
            <Music className="size-4 text-royal" />
            <h2 className="text-lg font-semibold text-ink">Create a room</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            You become the host. Share the six-character code with one person.
          </p>
          <button type="button" onClick={create} className={cn(btnPrimary, "mt-5 w-full justify-center")}>
            <Play className="size-4" /> Create a listening room
          </button>
        </div>

        <div className={cn(card, "p-5 sm:p-7")}>
          <div className="flex items-center gap-2">
            <Users className="size-4 text-royal" />
            <h2 className="text-lg font-semibold text-ink">Join with a code</h2>
          </div>
          <label className={cn(label, "mt-3")} htmlFor="room-code">
            Room code
          </label>
          <input
            id="room-code"
            value={joinCode}
            onChange={(e) => {
              setJoinCode(e.target.value.toUpperCase().replace(/[^2-9A-HJKMNP-Z]/g, "").slice(0, 6));
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") join();
            }}
            placeholder="K7M2QX"
            autoComplete="off"
            spellCheck={false}
            className={cn(input, "font-mono text-base tracking-[0.3em] uppercase")}
          />
          {error && <p className="mt-2 text-xs text-crimson">{error}</p>}
          <button type="button" onClick={join} className={cn(btnOutline, "mt-4 w-full justify-center")}>
            Join room
          </button>
        </div>
      </div>

      <p className="mt-6 text-xs text-subtle">
        Rooms hold two people. Nothing is recorded, and the room disappears when both leave.
      </p>
    </div>
  );
}

function Room({ code, isHostParam }: { code: string; isHostParam: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { user } = useStore();
  const nav = useNavigate();
  const [copied, setCopied] = useState(false);
  const [trackOpen, setTrackOpen] = useState(false);

  const room = useRoom({
    code,
    role: isHostParam ? "host" : "guest",
    takhallus: user?.penName ?? "Musafir",
    audioRef,
  });

  const track = TRACKS.find((t) => t.id === room.trackId) ?? TRACKS[0]!;
  const duration = Number.isFinite(audioRef.current?.duration)
    ? (audioRef.current?.duration as number)
    : track.duration;

  const copyCode = async () => {
    const url = `${window.location.origin}/listen-together?room=${code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be blocked; the code is visible and selectable.
    }
  };

  const backToLobby = () => {
    void room.leave();
    nav({ to: "/listen-together", search: {} });
  };

  return (
    <div className="mx-auto max-w-3xl px-3.5 py-8 sm:px-6 md:py-14">
      <audio ref={audioRef} src={TRACKS[0]!.url} preload="metadata" playsInline className="hidden" />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-blush px-3 py-1 text-xs font-medium text-crimson">
            <Radio className="size-3.5" /> {room.status === "connected" ? "Live room" : "Room"}
          </span>
          <h1 className="mt-3 flex items-center gap-3 text-2xl font-semibold text-ink sm:text-3xl">
            <span className="font-mono tracking-[0.25em]">{code}</span>
            <button
              type="button"
              onClick={copyCode}
              aria-label="Copy room link"
              className="rounded-full border border-hairline p-1.5 text-subtle transition hover:border-royal hover:text-royal"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </button>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {room.isHost ? "You are the host. Only you control playback." : "You are listening. The host controls playback."}
          </p>
        </div>
        <button type="button" onClick={backToLobby} className={cn(btnOutline, "text-xs sm:text-sm")}>
          <LogOut className="size-4" /> Leave room
        </button>
      </div>

      {room.status === "full" && (
        <Banner tone="crimson" title="This room is full">
          A room holds two people. Ask the host for a different code, or open your own room.
          <button type="button" onClick={backToLobby} className={cn(btnOutline, "mt-3")}>
            Back to the lobby
          </button>
        </Banner>
      )}

      {room.status === "auth-required" && (
        <Banner tone="royal" title="Sign in to join">
          Realtime rooms require an account so the socket quota stays honest.
          <Link to="/auth" search={{ mode: "signin" }} className={cn(btnPrimary, "mt-3")}>
            Sign in
          </Link>
        </Banner>
      )}

      {room.status === "offline" && (
        <Banner tone="royal" title="Connection lost">
          The room could not reconnect.
          <button type="button" onClick={room.reconnect} className={cn(btnOutline, "mt-3")}>
            Reconnect
          </button>
        </Banner>
      )}

      {room.status === "host-left" && (
        <Banner tone="crimson" title="Host left the room">
          Playback is paused. You can wait for the host to return, or leave and open your own room.
          <button type="button" onClick={backToLobby} className={cn(btnOutline, "mt-3")}>
            Back to the lobby
          </button>
        </Banner>
      )}

      <div className={cn(card, "mt-6 p-5 sm:p-7")}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-ink">{track.title}</p>
            <p className="text-xs text-muted-foreground">{track.artist}</p>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
            {room.isHost ? "Host" : "Listener"}
          </span>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={room.actions.toggle}
            disabled={!room.isHost || room.status !== "connected"}
            aria-label={room.playing ? "Pause" : "Play"}
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-primary-foreground transition disabled:opacity-40",
              room.isHost && "hover:bg-royal"
            )}
          >
            {room.playing ? <Pause className="size-5" /> : <Play className="size-5" />}
          </button>

          <div className="min-w-0 flex-1">
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.1}
              value={Math.min(room.position, duration || 1)}
              onChange={(e) => room.actions.seek(Number(e.target.value))}
              onPointerUp={(e) => room.actions.commitSeek(Number((e.target as HTMLInputElement).value))}
              onTouchEnd={(e) => room.actions.commitSeek(Number((e.target as HTMLInputElement).value))}
              disabled={!room.isHost || room.status !== "connected"}
              aria-label="Playback position"
              className="w-full accent-royal disabled:opacity-60"
            />
            <div className="mt-1 flex justify-between font-mono text-[11px] text-subtle">
              <span>{formatTime(room.position)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>

        {room.isHost && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setTrackOpen((v) => !v)}
              className="text-xs font-medium text-royal hover:underline"
            >
              {trackOpen ? "Hide tracks" : "Change track"}
            </button>
            {trackOpen && (
              <ul className="mt-2 space-y-1.5">
                {TRACKS.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => {
                        room.actions.selectTrack(t.id);
                        setTrackOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition",
                        t.id === room.trackId
                          ? "border-royal bg-wash text-ink"
                          : "border-hairline bg-background text-muted-foreground hover:border-royal"
                      )}
                    >
                      <span>{t.title}</span>
                      <span className="font-mono text-[11px]">{formatTime(t.duration)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!room.isHost && (
          <p className="mt-4 text-xs text-subtle">
            Playback follows the host. If the audio does not start, tap below.
          </p>
        )}

        {room.needsGesture && (
          <button
            type="button"
            onClick={room.actions.unlockAudio}
            className={cn(btnPrimary, "mt-3 w-full justify-center")}
          >
            <Play className="size-4" /> Tap to join the listening
          </button>
        )}
      </div>

      <div className={cn(card, "mt-4 p-5 sm:p-6")}>
        <div className="flex items-center gap-2">
          <Users className="size-4 text-royal" />
          <h2 className="text-sm font-semibold text-ink">In this room</h2>
        </div>
        <ul className="mt-3 space-y-2">
          {room.participants.map((p) => (
            <li key={p.uid} className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2">
              <span className="text-sm text-ink">
                @{p.takhallus}
                {p.self && <span className="ml-1 text-subtle">(you)</span>}
              </span>
              <span className="text-[11px] font-medium uppercase tracking-wide text-subtle">
                {p.role}
              </span>
            </li>
          ))}
          {room.participants.length < 2 && (
            <li className="flex items-center gap-2 rounded-xl border border-dashed border-hairline px-3 py-2 text-sm text-subtle">
              {room.status === "joining" ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Opening the room…
                </>
              ) : (
                "Waiting for the second listener…"
              )}
            </li>
          )}
        </ul>
      </div>

      <p className="mt-4 text-xs text-subtle">
        Nothing is recorded. The room closes when both people leave.
      </p>
    </div>
  );
}

function Banner({
  tone,
  title,
  children,
}: {
  tone: "crimson" | "royal";
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "mt-5 rounded-2xl border p-4 sm:p-5",
        tone === "crimson" ? "border-crimson/30 bg-blush" : "border-royal/20 bg-wash"
      )}
    >
      <div className="flex items-center gap-2">
        <AlertCircle className={cn("size-4", tone === "crimson" ? "text-crimson" : "text-royal")} />
        <p className="text-sm font-semibold text-ink">{title}</p>
      </div>
      <div className="mt-1 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}
