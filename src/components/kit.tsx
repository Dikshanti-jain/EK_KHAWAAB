import { Fragment, useState, type ReactNode } from "react";
import { ALL_FORMS, findWord } from "@/data/lughat";
import type { Script } from "@/data/poems";
import { rankFor } from "@/lib/ranks";
import { cn } from "@/lib/utils";

export function Lughat({ token }: { token: string }) {
  const w = findWord(token)!;
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" className="lughat-word" onClick={() => setOpen((o) => !o)}>{token}</button>
      {open && (
        <span dir="ltr" className="absolute left-1/2 top-full z-50 mt-3 block w-64 -translate-x-1/2 rounded-2xl border border-hairline bg-popover p-4 text-left font-sans text-sm leading-normal text-popover-foreground shadow-float">
          <span className="block font-serif text-lg font-semibold">{w.roman}</span>
          <span className="block text-xs text-subtle"><span className="deva">{w.hindi}</span> · <span className="font-urdu">{w.urdu}</span> · /{w.say}/</span>
          <span className="mt-2 block font-medium text-royal">{w.meaning}</span>
          <span className="mt-1 block text-muted-foreground">{w.context}</span>
        </span>
      )}
    </span>
  );
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const RE = new RegExp(`(${ALL_FORMS.map(esc).join("|")})`, "gi");

export function Line({ text }: { text: string }) {
  return <>{text.split(RE).map((p, i) => (findWord(p) ? <Lughat key={i} token={p} /> : <span key={i}>{p}</span>))}</>;
}

export function Verse({
  lines,
  script,
  className,
  ornament = false,
}: {
  lines: string[];
  script: Script;
  className?: string;
  ornament?: boolean;
}) {
  const safeLines = Array.isArray(lines) && lines.length > 0 ? lines : [];
  const showOrnament = ornament && safeLines.length === 2;
  // Each script keeps its own responsive base size; the reader's Aa choice
  // multiplies it through --verse-scale on <html>.
  const baseSize =
    script === "english"
      ? "[--verse-base:1rem] sm:[--verse-base:1.125rem] md:[--verse-base:1.25rem]"
      : "[--verse-base:1.125rem] sm:[--verse-base:1.25rem] md:[--verse-base:1.5rem]";

  return (
    <div
      data-verse-body
      dir={script === "urdu" ? "rtl" : "ltr"}
      style={{ fontSize: "calc(var(--verse-base) * var(--verse-scale, 1))" }}
      className={cn(
        "text-center text-ink transition-[font-size,color] duration-300",
        script === "urdu"
          ? "urdu leading-relaxed"
          : script === "hindi"
          ? "deva leading-relaxed"
          : script === "english"
          ? "font-serif italic leading-relaxed text-ink/90"
          : "font-serif leading-relaxed",
        baseSize,
        className
      )}
    >
      {safeLines.map((l, i) => (
        <Fragment key={i}>
          {showOrnament && i === 1 && (
            <span
              aria-hidden="true"
              className="my-1.5 block select-none text-center font-serif text-[11px] tracking-[0.45em] text-gold sm:my-2"
            >
              ❖
            </span>
          )}
          <p className="my-1 sm:my-1.5">
            <Line text={l} />
          </p>
        </Fragment>
      ))}
    </div>
  );
}

export type VerseTone = "white" | "cashmere" | "midnight";

const VERSE_TONE: Record<VerseTone, { panel: string; frame: string; mark: string }> = {
  white: { panel: "bg-white", frame: "border-gold/35", mark: "text-gold/20" },
  cashmere: { panel: "bg-cashmere", frame: "border-gold/45", mark: "text-gold/25" },
  midnight: { panel: "bg-midnight", frame: "border-gold/30", mark: "text-gold/20" },
};

/**
 * The reading panel inside a PoemCard: an inner gold rule and an oversized
 * serif opening quote, both decorative. The panel is the only surface the
 * three tone dots repaint; header and actions stay editorial white.
 */
export function VerseFrame({
  tone = "white",
  className,
  children,
}: {
  tone?: VerseTone;
  className?: string;
  children: ReactNode;
}) {
  const skin = VERSE_TONE[tone];
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl px-4 pb-3 pt-8 sm:px-8 sm:pt-10",
        skin.panel,
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn("pointer-events-none absolute inset-2 rounded-xl border sm:inset-3", skin.frame)}
      />
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute left-4 top-0.5 select-none font-serif text-[64px] leading-none sm:text-[84px]",
          skin.mark
        )}
      >
        “
      </span>
      <div className="relative">{children}</div>
    </div>
  );
}

export function RankBadge({
  count,
  prefix,
  className,
}: {
  count: number;
  prefix?: string;
  className?: string;
}) {
  const rank = rankFor(count);
  const title = `${prefix ? `${prefix} · ` : ""}${rank.name} (${rank.english}) · ${count} ${
    count === 1 ? "verse" : "verses"
  }`;
  return (
    <span
      title={title}
      aria-label={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-gold-line bg-cashmere px-2 py-0.5 text-[10px] font-medium text-gold-ink sm:px-2.5 sm:text-[11px]",
        className
      )}
    >
      <span aria-hidden="true">✦</span>
      {prefix ? `${prefix} · ` : ""}
      {rank.name}
    </span>
  );
}

export function ScriptSwitch({ value, onChange }: { value: Script; onChange: (s: Script) => void }) {
  const opts: [Script, string][] = [
    ["hinglish", "Hinglish"],
    ["hindi", "हिन्दी"],
    ["urdu", "اردو"],
    ["english", "English"],
  ];
  return (
    <div className="inline-flex max-w-full flex-wrap items-center gap-0.5 rounded-full bg-muted/90 p-0.5 text-[11px] font-medium sm:text-xs">
      {opts.map(([k, l]) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={cn(
            "rounded-full px-3 py-1.5 transition",
            value === k
              ? "bg-background text-ink shadow-sm font-semibold"
              : "text-muted-foreground hover:text-ink"
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function IdBadge({ id }: { id: string }) {
  return <span className="rounded-full bg-wash px-2 py-0.5 font-mono text-[10px] font-medium text-wash-foreground sm:px-2.5 sm:text-[11px]">{id}</span>;
}

export function Seal({ tone = "crimson", className }: { tone?: "crimson" | "royal"; className?: string }) {
  return (
    <div className={cn("grid size-14 place-items-center rounded-full font-serif text-xl italic text-primary-foreground shadow-[inset_0_-4px_10px_rgb(0_0_0/0.3),0_6px_16px_rgb(15_23_42/0.18)] sm:size-16 sm:text-2xl", tone === "crimson" ? "bg-crimson" : "bg-royal", className)}>
      ek
    </div>
  );
}

export function Pill({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "red" | "grey" }) {
  return <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium sm:px-3 sm:py-1 sm:text-xs", tone === "red" ? "bg-blush text-crimson" : tone === "blue" ? "bg-wash text-wash-foreground" : "bg-muted text-muted-foreground")}>{children}</span>;
}

export function PageHead({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <header className="mb-6 md:mb-10">
      <Pill>{kicker}</Pill>
      <h1 className="mt-3 text-2xl font-semibold text-ink sm:text-3xl md:text-5xl">{title}</h1>
      {sub && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base md:text-lg">{sub}</p>}
    </header>
  );
}

export const card = "rounded-2xl border border-hairline bg-card shadow-card";
export const btn = "inline-flex items-center justify-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition sm:px-5 sm:py-2.5 sm:text-sm disabled:opacity-50 disabled:pointer-events-none";
export const btnPrimary = cn(btn, "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover");
export const btnRoyal = cn(btn, "bg-royal text-primary-foreground hover:bg-vivid");
export const btnOutline = cn(btn, "border border-border bg-background text-ink hover:border-royal");
export const btnGhost = cn(btn, "text-royal hover:bg-wash");
export const chip = (on: boolean) => cn("rounded-full px-3 py-1 text-xs font-medium transition sm:px-4 sm:py-1.5 sm:text-sm", on ? "bg-ink text-primary-foreground" : "bg-muted text-muted-foreground hover:text-ink");
export const input = "w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none transition focus:border-royal focus:ring-2 focus:ring-wash sm:px-4 sm:py-2.5 sm:text-sm";
export const label = "mb-1.5 block text-xs font-medium text-ink sm:text-sm";
