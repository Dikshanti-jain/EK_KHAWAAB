import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Send, Sparkles, BookOpen, Layers, Type, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { POEMS, poetId, type Script } from "@/data/poems";
import { useStore } from "@/lib/store";
import { createPoem } from "@/lib/poems.service";
import { prependFeedPoem } from "@/lib/feed-cache";
import { useSignInPrompt } from "@/components/SignInPrompt";
import { PageHead, ScriptSwitch, btnOutline, btnPrimary, card, chip, input, label } from "@/components/kit";
import { useDocumentSEO } from "@/hooks/useDocumentSEO";
import { FONT, RATIOS, THEMES, draw, type Ratio, type Theme } from "@/lib/card-render";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Card Studio Workspace — Design, Preview & Export | Ek Khwaab" },
      {
        name: "description",
        content:
          "Design, preview, and export high-resolution 9:16 story cards and 1:1 square shayari posters in a zero-clutter workspace. The preview and PNG use the same canvas renderer.",
      },
      { property: "og:title", content: "Card Studio Workspace — Design, Preview & Export | Ek Khwaab" },
      {
        property: "og:description",
        content: "A focused workspace for typography, themes, and HD shayari card export.",
      },
      { property: "og:url", content: "https://ekkhwaab.in/studio" },
    ],
    links: [
      { rel: "canonical", href: "https://ekkhwaab.in/card-studio" },
    ],
  }),
  component: Studio,
});

export function Studio() {
  useDocumentSEO({
    title: "Card Studio Workspace — Design, Preview & Export | Ek Khwaab",
    description:
      "Design, preview, and export high-resolution 9:16 story cards and 1:1 square shayari posters in a zero-clutter workspace.",
    canonicalPath: "/card-studio",
  });
  const { studio, set, user } = useStore();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { promptSignIn } = useSignInPrompt();
  const seed = POEMS[1]!;
  const match0 = studio && POEMS.find((p) => [p.hinglish, p.hindi, p.urdu, p.english].some((v) => (v ?? []).join("\n") === studio.lines.join("\n")));
  const [script, setScript] = useState<Script>("hinglish");
  const [text, setText] = useState((studio?.lines ?? seed.hinglish).join("\n"));
  const [source, setSource] = useState(match0 ?? (studio ? null : seed));
  const [sign, setSign] = useState(studio?.penName || user?.penName || seed.takhallus);
  const [ratio, setRatio] = useState<Ratio>("9:16 Story");
  const [theme, setTheme] = useState<Theme>("Pure White Editorial");
  const [size, setSize] = useState(64);
  const [align, setAlign] = useState<"center" | "left">("center");
  const [showId, setShowId] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const ref = useRef<HTMLCanvasElement>(null);
  const id = user && sign === user.penName ? user.poetId : poetId(sign);

  const changeScript = (s: Script) => { setScript(s); if (source && source[s]?.length) setText(source[s].join("\n")); if (s === "urdu") setSize(54); };
  useEffect(() => {
    let live = true;
    Promise.all([document.fonts.load(`64px "${FONT[script]}"`), document.fonts.load(`34px "Plus Jakarta Sans"`)]).then(() => document.fonts.ready).then(() => {
      if (live && ref.current) draw(ref.current, { ratio, theme, lines: text.split("\n").filter(Boolean), sign: sign || "Anonymous", id, showId, size, align, script });
    });
    return () => { live = false; };
  }, [ratio, theme, text, sign, id, showId, size, align, script]);

  const download = () => ref.current?.toBlob((b) => {
    if (!b) return;
    const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `ek-khwaab-${ratio.split(" ")[0]!.replace(":", "x")}.png`; a.click();
    toast("HD card downloaded");
  }, "image/png");
  const post = async () => {
    if (!user || user.guest) {
      promptSignIn("write");
      return;
    }
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      toast.error("Add at least two lines before publishing.");
      return;
    }
    setPublishing(true);
    try {
      const created = await createPoem({
        shayarUid: user.poetId,
        takhallus: user.penName,
        lines,
        sourceScript: script,
        moodTag: "Life & Philosophy",
        formatType: lines.length > 2 ? "Qata" : "Sher",
      });
      if (created.error || !created.poem) {
        toast.error(created.error || "Could not publish your poem.");
        return;
      }
      set((s) => ({ poems: [created.poem!, ...s.poems], myPoemCount: s.myPoemCount + 1 }));
      prependFeedPoem(qc, created.poem);
      toast.success("Your poem is now live on the feed");
      nav({ to: "/feed" });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-3.5 py-6 sm:px-6 md:px-12 md:py-14">
      <PageHead kicker="CARD STUDIO" title="Design a card worth sharing" sub="Pick a size and a theme, then download a high-resolution PNG for Instagram or WhatsApp." />
      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <div className={cn(card, "space-y-5 p-4 sm:p-6 md:p-8")}>
          <div><label className={label}>Poem Script</label><ScriptSwitch value={script} onChange={changeScript} /></div>
          <div>
            <label className={label}>Poem Text</label>
            <textarea dir={script === "urdu" ? "rtl" : "ltr"} value={text} onChange={(e) => { setText(e.target.value); setSource(null); }} rows={4} className={cn(input, script === "urdu" ? "urdu" : script === "hindi" ? "deva" : "font-serif text-base")} />
          </div>
          <div><label className={label}>Card Aspect Ratio</label><div className="flex flex-wrap gap-2">{(Object.keys(RATIOS) as Ratio[]).map((r) => <button key={r} onClick={() => setRatio(r)} className={chip(ratio === r)}>{r}</button>)}</div></div>
          <div>
            <label className={label}>Background Theme Presets</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(THEMES) as Theme[]).map((t) => (
                <button key={t} onClick={() => setTheme(t)} className={cn("flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 text-xs font-medium transition", theme === t ? "border-ink" : "border-hairline hover:border-border")}>
                  <span className="size-5 rounded-full border border-border" style={{ background: THEMES[t].bg }} />{t}
                </button>
              ))}
            </div>
          </div>
          <div><label className={label}>Font Size · {size}px</label><input type="range" min={36} max={110} value={size} onChange={(e) => setSize(+e.target.value)} className="w-full accent-crimson" /></div>
          <div><label className={label}>Alignment</label><div className="flex gap-2">{(["center", "left"] as const).map((a) => <button key={a} onClick={() => setAlign(a)} className={cn(chip(align === a), "capitalize")}>{a}</button>)}</div></div>
          <div>
            <label className="flex items-center justify-between text-sm font-medium text-ink">Show Pen Name & #EK-ID
              <button role="switch" aria-checked={showId} onClick={() => setShowId(!showId)} className={cn("relative h-6 w-11 rounded-full transition", showId ? "bg-crimson" : "bg-border")}><span className={cn("absolute top-0.5 size-5 rounded-full bg-background shadow transition", showId ? "left-5" : "left-0.5")} /></button>
            </label>
            {showId && <input value={sign} onChange={(e) => setSign(e.target.value)} className={cn(input, "mt-2")} />}
          </div>
        </div>
        <div className="flex min-w-0 flex-col items-center justify-center gap-5 overflow-hidden rounded-2xl bg-secondary p-4 sm:p-6 md:p-8">
          <canvas ref={ref} aria-label="Card preview" style={{ maxHeight: "65vh", maxWidth: "100%", width: "auto", height: "auto" }} className="block max-w-full rounded-xl object-contain shadow-float" />
          <div className="flex w-full flex-col flex-wrap justify-center gap-2.5 sm:flex-row sm:gap-3">
            <button onClick={download} className={cn(btnPrimary, "w-full px-5 py-2.5 sm:w-auto sm:px-7 sm:py-3")}><Download className="size-4" /> Download HD PNG Card</button>
            <button onClick={() => void post()} disabled={publishing} className={cn(btnOutline, "w-full px-5 py-2.5 sm:w-auto sm:px-7 sm:py-3")}><Send className="size-4" /> {publishing ? "Publishing..." : "Publish Poem"}</button>
          </div>
        </div>
      </div>

      {/* BELOW-THE-FOLD PEOPLE-FIRST EDITORIAL CONTENT (TASK 4) */}
      <section className="mt-20 pt-16 border-t border-hairline">
        <div className="max-w-3xl">
          <span className="rounded-full bg-wash px-3 py-1 font-mono text-xs font-semibold text-royal">
            DESIGN GUIDE · SHAYARI CARD STUDIO
          </span>
          <h2 className="text-xl sm:text-2xl font-semibold text-ink">Designing Aesthetic Poetry Cards for Instagram Stories &amp; Posts</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Turn any couplet, sher, or nazm into a publication-ready visual card. Here is how poets craft cards that look like timeless literary prints.
          </p>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Guide Card 1: Aspect Ratios */}
          <div className={cn(card, "p-6 space-y-3")}>
            <div className="grid size-10 place-items-center rounded-xl bg-wash text-royal">
              <Layers className="size-5" />
            </div>
            <h3 className="text-base font-semibold text-ink">Choosing the Right Aspect Ratio</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <b>9:16 Story (1080×1920)</b> is calibrated for full-screen Instagram Stories, WhatsApp Status, and vertical mobile reading. <b>1:1 Square (1080×1080)</b> is ideal for Instagram feed carousels, and <b>4:5 Portrait (1080×1350)</b> commands the maximum vertical feed real estate.
            </p>
          </div>

          {/* Guide Card 2: Typography & Script Pairing */}
          <div className={cn(card, "p-6 space-y-3")}>
            <div className="grid size-10 place-items-center rounded-xl bg-wash text-royal">
              <Type className="size-5" />
            </div>
            <h3 className="text-base font-semibold text-ink">Nastaliq & Serif Typography</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              When rendering Urdu Nastaliq (with <code>dir="rtl"</code>), the canvas applies right-to-left layout and generous line-height to let cascading diacritics breathe. Hinglish pairs with <i>Playfair Display</i>, and Hindi renders in authentic <i>Noto Serif Devanagari</i>.
            </p>
          </div>

          {/* Guide Card 3: Palette Contrast & Anonymous Attribution */}
          <div className={cn(card, "p-6 space-y-3")}>
            <div className="grid size-10 place-items-center rounded-xl bg-wash text-royal">
              <ShieldCheck className="size-5" />
            </div>
            <h3 className="text-base font-semibold text-ink">Contrast & Anonymous Pen Name</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              High-contrast palettes (Royal Ink Blue, Velvet Crimson, Soft Ivory, and Pure White) ensure readability on OLED and Retina displays. The watermark binds your public pen name and unique #EK-ID, while your real name stays private.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
