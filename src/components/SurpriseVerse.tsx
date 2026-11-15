import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ClipboardCopy, Palette, RefreshCw, Sparkles } from "lucide-react";
import { POEMS, poetId, type Poem, type Script } from "@/data/poems";
import { useStore } from "@/lib/store";
import { copyPoem } from "@/lib/share";
import { IdBadge, Pill, Verse, btnOutline, btnPrimary } from "./kit";
import { Modal } from "./Modal";
import { cn } from "@/lib/utils";

const SUITS = [
  { id: "quiet", label: "Quiet Heart", mood: "Unspoken Love", seal: "crimson" },
  { id: "late", label: "Late Night Thoughts", mood: "Late Night Tanhai", seal: "royal" },
  { id: "unspoken", label: "Unspoken Words", mood: "Heartbreak & Hijr", seal: "crimson" },
] as const;

function poolFor(mood: string): Poem[] {
  const matches = POEMS.filter((p) => p.mood === mood);
  return matches.length ? matches : POEMS;
}

function pick(pool: Poem[], excludeId?: string): Poem {
  const candidates = pool.filter((p) => p.id !== excludeId);
  const list = candidates.length ? candidates : pool;
  return list[Math.floor(Math.random() * list.length)] ?? POEMS[0]!;
}

function linesFor(poem: Poem, script: Script): string[] {
  const chosen = poem[script];
  if (chosen && chosen.length) return chosen;
  return poem.hinglish.length ? poem.hinglish : poem.hindi;
}

/**
 * Three face-down wax-sealed envelopes. The reveal is intentionally a small
 * ritual: choose a mood, read one verse, then copy it or carry it to Studio.
 */
export function SurpriseVerse({ className }: { className?: string }) {
  const { script, set } = useStore();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [suit, setSuit] = useState<number | null>(null);
  const [poem, setPoem] = useState<Poem | null>(null);
  const [flipped, setFlipped] = useState(false);

  const reset = () => {
    setSuit(null);
    setPoem(null);
    setFlipped(false);
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  const draw = (index: number) => {
    const next = pick(poolFor(SUITS[index]!.mood));
    setSuit(index);
    setPoem(next);
    setFlipped(true);
  };

  const drawAnother = () => {
    if (suit === null) return;
    const pool = poolFor(SUITS[suit]!.mood);
    setFlipped(false);
    requestAnimationFrame(() => {
      setPoem(pick(pool, poem?.id));
      setFlipped(true);
    });
  };

  const openStudio = () => {
    if (!poem) return;
    set({ studio: { lines: linesFor(poem, script), penName: poem.takhallus } });
    setOpen(false);
    reset();
    nav({ to: "/studio" });
  };

  const chosenSuit = suit === null ? null : SUITS[suit]!;
  const displayScript: Script = poem
    ? poem[script]?.length
      ? script
      : poem.sourceLanguage || "hinglish"
    : script;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(btnOutline, "px-4 py-2 text-xs sm:px-5 sm:py-2.5 sm:text-sm", className)}
      >
        <Sparkles className="size-3.5 text-gold-ink sm:size-4" />
        Pick a Verse for Me
      </button>

      <Modal
        open={open}
        onClose={close}
        title="✨ Pick a Verse for Me"
        description="Three sealed envelopes. Choose one, and let the sanctuary answer."
        maxWidth="max-w-2xl"
      >
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {SUITS.map((s, i) => {
            const isChosen = suit === i && flipped;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => draw(i)}
                aria-label={`Open ${s.label}`}
                aria-pressed={isChosen}
                className="group text-left [perspective:900px]"
              >
                <span
                  className={cn(
                    "relative block h-36 w-full transition-transform duration-500 [transform-style:preserve-3d] sm:h-44",
                    isChosen && "[transform:rotateY(180deg)]"
                  )}
                >
                  {/* Face down: cashmere paper and a wax seal. */}
                  <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl border border-gold-line bg-cashmere p-2 shadow-sm [backface-visibility:hidden]">
                    <span
                      className={cn(
                        "grid size-9 place-items-center rounded-full font-serif text-base italic text-white shadow-[inset_0_-3px_7px_rgb(0_0_0/0.3),0_4px_10px_rgb(15_23_42/0.18)] sm:size-11 sm:text-lg",
                        s.seal === "royal" ? "bg-royal" : "bg-seal"
                      )}
                    >
                      ek
                    </span>
                    <span className="text-center font-serif text-[11px] italic leading-tight text-cashmere-ink sm:text-xs">
                      {s.label}
                    </span>
                    <span aria-hidden="true" className="font-mono text-[9px] uppercase tracking-[0.2em] text-gold-ink/70">
                      sealed
                    </span>
                  </span>

                  {/* Face up: the first line, kept short so the card stays a card. */}
                  <span className="absolute inset-0 flex flex-col justify-between rounded-2xl border border-gold-line bg-white p-2.5 [backface-visibility:hidden] [transform:rotateY(180deg)] sm:p-3">
                    <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-gold-ink sm:text-[9px]">
                      {s.label}
                    </span>
                    <span className="line-clamp-4 font-serif text-[11px] italic leading-relaxed text-ink sm:text-xs">
                      {poem && isChosen ? linesFor(poem, displayScript)[0] : ""}
                    </span>
                    <span className="truncate font-mono text-[8px] text-subtle sm:text-[9px]">
                      {poem && isChosen ? `@${poem.takhallus}` : ""}
                    </span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {poem && chosenSuit && (
          <div className="mt-5 rounded-2xl border border-gold-line bg-cashmere/50 p-4 text-center sm:p-6">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-sm font-semibold text-ink">@{poem.takhallus}</span>
              <IdBadge id={poetId(poem.takhallus)} />
              <Pill tone="red">{poem.mood}</Pill>
            </div>
            <div className="mt-4">
              <Verse lines={linesFor(poem, displayScript)} script={displayScript} ornament />
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => void copyPoem(poem, displayScript)}
                className={cn(btnOutline, "px-3 py-2 text-xs")}
              >
                <ClipboardCopy className="size-3.5" /> Copy Verse
              </button>
              <button
                type="button"
                onClick={openStudio}
                className={cn(btnPrimary, "px-3 py-2 text-xs")}
              >
                <Palette className="size-3.5" /> Open in Studio
              </button>
              <button
                type="button"
                onClick={drawAnother}
                className={cn(btnOutline, "px-3 py-2 text-xs")}
              >
                <RefreshCw className="size-3.5" /> Draw Another
              </button>
            </div>
            <button
              type="button"
              onClick={reset}
              className="mt-3 text-[11px] text-subtle transition hover:text-ink"
            >
              ← Choose a different card
            </button>
          </div>
        )}
      </Modal>
    </>
  );
}
