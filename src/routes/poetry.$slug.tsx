import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, Share2, Palette, Sparkles, BookOpen, ArrowLeft, ArrowRight, Check, Copy, Tag } from "lucide-react";
import { toast } from "sonner";
import { POEMS, poetId, findPoemBySlugOrId, getPoemSlug, type Script } from "@/data/poems";
import { LUGHAT, getWordSlug } from "@/data/lughat";
import { useStore } from "@/lib/store";
import { IdBadge, Pill, ScriptSwitch, Verse, btnOutline, btnPrimary, btnRoyal, card } from "@/components/kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/poetry/$slug")({
  loader: ({ params }) => {
    const poem = findPoemBySlugOrId(params.slug, POEMS);
    if (!poem) {
      throw notFound();
    }
    return { poem, slug: params.slug };
  },
  head: ({ loaderData }) => {
    if (!loaderData?.poem) {
      return { meta: [{ title: "Poem Not Found — Ek Khawaab" }] };
    }
    const { poem } = loaderData;
    const firstLine = poem.hinglish[0] || "Shayari";
    const secondLine = poem.hinglish[1] || "";
    const title = `${firstLine} — ${poem.mood} Shayari in Hindi, Urdu & Hinglish | Ek Khawaab`;
    const description = `${firstLine}${secondLine ? ` / ${secondLine}` : ""}. Read this authentic ${poem.mood} ${poem.format} by ${poem.takhallus} in Hinglish, Devanagari Hindi, and Nastaliq Urdu with English translation on Ek Khawaab.`;
    const canonical = `https://ek-khawaab.vercel.app/poetry/${loaderData.slug}`;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "keywords", content: `${poem.takhallus}, ${poem.mood}, ${poem.format}, hindi shayari, urdu poetry, hinglish poetry, ${poem.tags?.join(", ") || ""}` },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: canonical },
        { property: "og:type", content: "article" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [
        { rel: "canonical", href: canonical },
      ],
    };
  },
  component: PoemDetailPage,
});

function PoemDetailPage() {
  const { poem, slug } = Route.useLoaderData();
  const { liked, saved, set } = useStore();
  const nav = useNavigate();
  const [script, setScript] = useState<Script>("hinglish");
  const [copied, setCopied] = useState(false);
  const [showAllScripts, setShowAllScripts] = useState(true);

  const isLiked = liked.includes(poem.id);
  const isSaved = saved.includes(poem.id);

  const toggleDaad = () => {
    set((s) => {
      const exists = s.liked.includes(poem.id);
      return {
        liked: exists ? s.liked.filter((x) => x !== poem.id) : [...s.liked, poem.id],
      };
    });
    toast(isLiked ? "Daad wapas li gayi" : "Mukarrar! Aapki daad shayar tak pahunchi.");
  };

  const copyPermalink = () => {
    const url = `${window.location.origin}/poetry/${slug}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Poem link copied to clipboard!");
    } else {
      toast(url);
    }
  };

  const openInStudio = () => {
    set({
      studio: {
        lines: poem[script] || poem.hinglish,
        penName: poem.takhallus,
      },
    });
    nav({ to: "/studio" });
  };

  // Find vocabulary from LUGHAT present in this poem
  const allPoemText = [
    ...poem.hinglish,
    ...poem.hindi,
    ...poem.urdu,
  ].join(" ").toLowerCase();

  const detectedVocab = LUGHAT.filter((w) => {
    const r = w.roman.toLowerCase();
    const h = w.hindi.toLowerCase();
    const u = w.urdu;
    return allPoemText.includes(r) || allPoemText.includes(h) || allPoemText.includes(u);
  }).slice(0, 5);

  // Related poems with matching mood
  const relatedPoems = POEMS.filter((p) => p.id !== poem.id && p.mood === poem.mood).slice(0, 3);

  const isClassical = poem.takhallus.toLowerCase().includes("ghalib") || poem.style === "Classical";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "name": poem.hinglish[0],
    "headline": poem.hinglish[0],
    "author": {
      "@type": "Person",
      "name": poem.takhallus,
      "identifier": poetId(poem.takhallus),
    },
    "inLanguage": ["hi", "ur", "en"],
    "genre": poem.format,
    "keywords": [poem.mood, poem.format, ...(poem.tags || [])].join(", "),
    "text": poem.hinglish.join("\n"),
    "publisher": {
      "@type": "Organization",
      "name": "Ek Khawaab",
      "url": "https://ek-khawaab.vercel.app",
    },
  };

  return (
    <div className="mx-auto max-w-4xl px-3.5 py-6 sm:px-6 md:px-10 md:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-ink">Home</Link>
        <span>/</span>
        <Link to="/feed" className="hover:text-ink">Mehfil Feed</Link>
        <span>/</span>
        <span className="font-serif italic text-ink truncate max-w-xs">{poem.hinglish[0]}</span>
      </nav>

      {/* Main Poem Article */}
      <article className={cn(card, "p-6 sm:p-10 md:p-12 relative overflow-hidden")}>
        {/* Paper tone indicator line */}
        <div className={cn(
          "absolute top-0 inset-x-0 h-1.5",
          poem.paper === "surkh" ? "bg-crimson" : poem.paper === "neeli" ? "bg-royal" : "bg-hairline"
        )} />

        {/* Card Header & Metadata */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <IdBadge id={poetId(poem.takhallus)} />
            <span className="font-semibold text-sm text-ink">@{poem.takhallus}</span>
            <span className="rounded-full bg-wash px-2.5 py-0.5 text-xs font-medium text-royal">
              {poem.format}
            </span>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
              {poem.mood}
            </span>
            {isClassical && (
              <span className="rounded-full bg-blush px-2.5 py-0.5 text-xs font-semibold text-crimson">
                Classical Tribute
              </span>
            )}
          </div>
          <ScriptSwitch value={script} onChange={setScript} />
        </header>

        {/* Primary Semantic H1 & Verse Display */}
        <div className="py-10 text-center">
          <h1 className="sr-only">{poem.hinglish[0]} — {poem.mood} Shayari by {poem.takhallus}</h1>
          <Verse lines={poem[script] || poem.hinglish} script={script} />
        </div>

        {/* Action Toolbar */}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-5">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleDaad}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-medium transition",
                isLiked ? "border-crimson bg-blush text-crimson" : "border-hairline hover:bg-muted text-ink"
              )}
            >
              <Heart className={cn("size-3.5", isLiked && "fill-crimson")} />
              <span>{poem.daad + (isLiked ? 1 : 0)} Daad</span>
            </button>
            <button
              onClick={openInStudio}
              className={cn(btnRoyal, "px-4 py-2 text-xs")}
            >
              <Palette className="size-3.5" /> Customize in Card Studio
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyPermalink}
              className={cn(btnOutline, "px-3.5 py-2 text-xs")}
              title="Copy shareable permalink"
            >
              {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
              <span>{copied ? "Link Copied!" : "Share Link"}</span>
            </button>
          </div>
        </footer>
      </article>

      {/* Complete Multi-Script & Poetic Meaning Section (Crawlable by Googlebot) */}
      <section className="mt-8 rounded-3xl border border-hairline bg-card p-6 sm:p-8">
        <div className="flex items-center justify-between border-b border-hairline pb-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">All Scripts & Poetic Meaning (Tashreeh)</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Read this couplet across Roman Urdu, Devanagari Hindi, Nastaliq Urdu, and English.
            </p>
          </div>
          <button
            onClick={() => setShowAllScripts(!showAllScripts)}
            className="text-xs font-medium text-royal hover:underline"
          >
            {showAllScripts ? "Hide View" : "Expand All"}
          </button>
        </div>

        {showAllScripts && (
          <div className="mt-6 space-y-6">
            {/* 1. Devanagari Hindi */}
            <div className="rounded-2xl bg-secondary/60 p-4 sm:p-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-crimson">
                हिंदी में शायरी (Devanagari Script)
              </span>
              <div className="mt-2 text-lg sm:text-xl deva leading-relaxed text-ink">
                {poem.hindi.map((l, i) => <p key={i}>{l}</p>)}
              </div>
            </div>

            {/* 2. Nastaliq Urdu */}
            <div className="rounded-2xl bg-secondary/60 p-4 sm:p-5" dir="rtl">
              <span className="text-xs font-semibold uppercase tracking-wider text-royal" dir="ltr">
                اردو شاعری (Nastaliq Script)
              </span>
              <div className="mt-2 text-xl sm:text-2xl urdu leading-loose text-ink">
                {poem.urdu.map((l, i) => <p key={i}>{l}</p>)}
              </div>
            </div>

            {/* 3. Roman Hinglish */}
            <div className="rounded-2xl bg-secondary/60 p-4 sm:p-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Hinglish / Roman Urdu
              </span>
              <div className="mt-2 font-serif text-base sm:text-lg italic text-ink leading-relaxed">
                {poem.hinglish.map((l, i) => <p key={i}>{l}</p>)}
              </div>
            </div>

            {/* 4. Poetic English Interpretation */}
            <div className="rounded-2xl border border-royal/15 bg-wash/50 p-4 sm:p-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-royal">
                English Poetic Translation & Emotional Context
              </span>
              <div className="mt-2 font-serif text-base sm:text-lg italic text-ink/90 leading-relaxed">
                {poem.english.map((l, i) => <p key={i}>"{l}"</p>)}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Vocabulary Breakdown (Internal Links to /dictionary/:word) */}
      {detectedVocab.length > 0 && (
        <section className="mt-8 rounded-3xl border border-hairline bg-card p-6 sm:p-8">
          <h2 className="text-base font-semibold text-ink flex items-center gap-2">
            <BookOpen className="size-4 text-royal" /> Deep Vocabulary in this Verse (Lughat)
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Click any word to read its full meaning, pronunciation, and other classic couplets.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {detectedVocab.map((w) => {
              const wordSlug = getWordSlug(w);
              return (
                <Link
                  key={w.roman}
                  to="/dictionary/$word"
                  params={{ word: wordSlug }}
                  className="rounded-2xl border border-hairline bg-secondary/40 p-3.5 transition hover:border-royal hover:shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-ink">{w.roman}</span>
                    <span className="text-xs text-muted-foreground deva">{w.hindi}</span>
                  </div>
                  <p className="mt-1 text-xs text-royal font-medium">{w.meaning}</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Related Poems in Same Mood */}
      {relatedPoems.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-ink">More in {poem.mood}</h2>
            <Link to="/feed" className="text-xs font-semibold text-royal hover:underline">
              View All in Feed →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {relatedPoems.map((rel) => {
              const relSlug = getPoemSlug(rel);
              return (
                <Link
                  key={rel.id}
                  to="/poetry/$slug"
                  params={{ slug: relSlug }}
                  className={cn(card, "p-5 transition hover:shadow-float flex flex-col justify-between")}
                >
                  <div>
                    <span className="text-[11px] font-mono text-muted-foreground">@{rel.takhallus}</span>
                    <p className="mt-2 font-serif text-sm italic text-ink line-clamp-3">
                      "{rel.hinglish[0]}"
                    </p>
                  </div>
                  <span className="mt-4 flex items-center gap-1 text-xs font-medium text-crimson">
                    Read Full Poem <ArrowRight className="size-3" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Back to feed footer button */}
      <div className="mt-10 text-center">
        <Link to="/feed" className={cn(btnOutline, "px-6 py-2.5")}>
          <ArrowLeft className="size-4" /> Back to Mehfil Feed
        </Link>
      </div>
    </div>
  );
}

