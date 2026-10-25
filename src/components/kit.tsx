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
  return (
    <div dir={script === "urdu" ? "rtl" : "ltr"}
      className={cn("text-center text-ink", script === "urdu" ? "urdu text-xl" : script === "hindi" ? "deva text-xl" : "font-serif text-2xl leading-relaxed", className)}>
      {lines.map((l, i) => <p key={i}><Line text={l} /></p>)}
    </div>
  );
}

export function ScriptSwitch({ value, onChange, meaning, onMeaning }: { value: Script; onChange: (s: Script) => void; meaning?: boolean; onMeaning?: () => void }) {
  const opts: [Script, string][] = [["hinglish", "Hinglish"], ["hindi", "Hindi"], ["urdu", "Urdu"]];
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full bg-muted p-1 text-xs font-medium">
      {opts.map(([k, l]) => (
        <button key={k} onClick={() => onChange(k)} className={cn("rounded-full px-3 py-1 transition", value === k ? "bg-background text-ink shadow-sm" : "text-muted-foreground hover:text-ink")}>{l}</button>
      ))}
      {onMeaning && <button onClick={onMeaning} className={cn("rounded-full px-3 py-1 transition", meaning ? "bg-royal text-primary-foreground" : "text-muted-foreground hover:text-ink")}>English Meaning</button>}
    </div>
  );
}

export function IdBadge({ id }: { id: string }) {
  return <span className="rounded-full bg-wash px-2.5 py-0.5 font-mono text-[11px] font-medium text-wash-foreground">{id}</span>;
}

export function Seal({ tone = "crimson", className }: { tone?: "crimson" | "royal"; className?: string }) {
  return (
    <div className={cn("grid size-16 place-items-center rounded-full font-serif text-2xl italic text-primary-foreground shadow-[inset_0_-4px_10px_rgb(0_0_0/0.3),0_6px_16px_rgb(15_23_42/0.18)]", tone === "crimson" ? "bg-crimson" : "bg-royal", className)}>
      ek
    </div>
  );
}

export function Pill({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "red" | "grey" }) {
  return <span className={cn("rounded-full px-3 py-1 text-xs font-medium", tone === "red" ? "bg-blush text-crimson" : tone === "blue" ? "bg-wash text-wash-foreground" : "bg-muted text-muted-foreground")}>{children}</span>;
}

export function PageHead({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <header className="mb-12">
      <Pill>{kicker}</Pill>
      <h1 className="mt-5 text-4xl font-semibold text-ink md:text-5xl">{title}</h1>
      {sub && <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{sub}</p>}
    </header>
  );
}

export const card = "rounded-2xl border border-hairline bg-card shadow-card";
export const btn = "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition disabled:opacity-50 disabled:pointer-events-none";
export const btnPrimary = cn(btn, "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover");
export const btnRoyal = cn(btn, "bg-royal text-primary-foreground hover:bg-vivid");
export const btnOutline = cn(btn, "border border-border bg-background text-ink hover:border-royal");
export const btnGhost = cn(btn, "text-royal hover:bg-wash");
export const chip = (on: boolean) => cn("rounded-full px-4 py-1.5 text-sm font-medium transition", on ? "bg-ink text-primary-foreground" : "bg-muted text-muted-foreground hover:text-ink");
export const input = "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-royal focus:ring-2 focus:ring-wash";
export const label = "mb-1.5 block text-sm font-medium text-ink";
