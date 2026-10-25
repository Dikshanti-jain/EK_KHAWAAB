import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

export function AmbientAudio() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  const stopAudio = () => {
    try {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
      setIsPlaying(false);
    } catch {
      // Ignore audio cleanup errors
    }
  };

  const startAudio = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }

      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }

      const ctx = audioCtxRef.current;
      // 3 seconds pink noise loop buffer
      const bufferSize = ctx.sampleRate * 3;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      // Pink noise filter simulation
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.035;
        b6 = white * 0.115926;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      // Lowpass filter to simulate muffled distant monsoon rainfall
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1000, ctx.currentTime);

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.04, ctx.currentTime);

      source.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      source.start();
      sourceNodeRef.current = source;
      gainNodeRef.current = gainNode;
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  };

  const toggle = () => {
    if (isPlaying) {
      stopAudio();
    } else {
      startAudio();
    }
  };

  useEffect(() => {
    return () => {
      stopAudio();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      title={isPlaying ? "Mute Monsoon Rain Ambience" : "Play Gentle Monsoon Rain Ambience"}
      aria-label="Toggle ambient rain sound"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition",
        isPlaying
          ? "border border-crimson/30 bg-blush text-crimson"
          : "border border-hairline bg-muted/60 text-muted-foreground hover:border-border hover:text-ink"
      )}
    >
      {isPlaying ? (
        <>
          <span className="flex items-center gap-0.5" aria-hidden="true">
            <span className="inline-block h-2 w-0.5 animate-pulse bg-crimson" />
            <span className="inline-block h-3 w-0.5 animate-pulse bg-crimson [animation-delay:150ms]" />
            <span className="inline-block h-1.5 w-0.5 animate-pulse bg-crimson [animation-delay:300ms]" />
          </span>
          <span className="hidden sm:inline">Rain Ambience</span>
          <Volume2 className="size-3.5" />
        </>
      ) : (
        <>
          <VolumeX className="size-3.5" />
          <span className="hidden sm:inline">Rain Ambience</span>
        </>
      )}
    </button>
  );
}
