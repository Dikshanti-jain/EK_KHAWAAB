import { useState, type ReactNode } from "react";
import { ALL_FORMS, findWord } from "@/data/lughat";
import type { Script } from "@/data/poems";
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

export function Verse({ lines, script, className }: { lines: string[]; script: Script; className?: string }) {
  const safeLines = Array.isArray(lines) && lines.length > 0 ? lines : [];
  return (
    <div
      dir={script === "urdu" ? "rtl" : "ltr"}
      className={cn(
        "text-center text-ink transition-all duration-300",
        script === "urdu"
          ? "urdu text-lg sm:text-xl md:text-2xl leading-relaxed"
          : script === "hindi"
          ? "deva text-lg sm:text-xl md:text-2xl leading-relaxed"
          : script === "english"
          ? "font-serif italic text-base sm:text-lg md:text-xl leading-relaxed text-ink/90"
          : "font-serif text-lg sm:text-xl md:text-2xl leading-relaxed",
        className
      )}
    >
      {safeLines.map((l, i) => (
        <p key={i} className="my-1 sm:my-1.5">
          <Line text={l} />
        </p>
      ))}
    </div>
  );
}

export function ScriptSwitch({
  value,
  onChange,
  meaning,
  onMeaning,
}: {
  value: Script;
  onChange: (s: Script) => void;
  meaning?: boolean;
  onMeaning?: () => void;
}) {
  const opts: [Script, string][] = [
    ["hinglish", "Hinglish"],
    ["hindi", "हिन्दी"],
    ["urdu", "اردو"],
    ["english", "English"],
  ];
  return (
    <div className="inline-flex max-w-full items-center gap-0.5 rounded-full bg-muted/90 p-0.5 text-[11px] font-medium sm:text-xs">
      {opts.map(([k, l]) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={cn(
            "rounded-full px-2 py-0.5 transition sm:px-2.5 sm:py-1",
            value === k
              ? "bg-background text-ink shadow-sm font-semibold"
              : "text-muted-foreground hover:text-ink"
          )}
        >
          {l}
        </button>
      ))}
      {onMeaning && (
        <button
          type="button"
          onClick={onMeaning}
          className={cn(
            "rounded-full px-2 py-0.5 transition sm:px-2.5 sm:py-1",
            meaning ? "bg-royal text-primary-foreground font-semibold" : "text-muted-foreground hover:text-ink"
          )}
        >
          Meaning
        </button>
      )}
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
