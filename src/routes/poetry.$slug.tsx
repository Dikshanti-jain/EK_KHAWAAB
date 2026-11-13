import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { safeJsonLd } from "@/lib/security";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Heart, Share2, Palette, Sparkles, BookOpen, ArrowLeft, ArrowRight, Copy } from "lucide-react";
import { toast } from "sonner";
import { POEMS, poetId, findPoemBySlugOrId, getPoemSlug, isLivePoemId, type Script } from "@/data/poems";
import { LUGHAT, getWordSlug } from "@/data/lughat";
import { useStore } from "@/lib/store";
import { togglePoemLike, fetchPoemById } from "@/lib/poems.service";
import { patchFeedPoem } from "@/lib/feed-cache";
import { copyPoem, sharePoem } from "@/lib/share";
import { useSignInPrompt } from "@/components/SignInPrompt";
import { IdBadge, Pill, ScriptSwitch, Verse, btnOutline, btnPrimary, btnRoyal, card } from "@/components/kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/poetry/$slug")({
  loader: async ({ params }) => {
    const seed = findPoemBySlugOrId(params.slug, POEMS);
    if (seed) return { poem: seed, slug: params.slug };

    // Published poems are linked by UUID; resolve them from the public view.
    const live = await fetchPoemById(params.slug);
    if (live) return { poem: live, slug: params.slug };

    throw notFound();
  },
  head: ({ loaderData }) => {
    if (!loaderData?.poem) {
      return { meta: [{ title: "Poem Not Found — Ek Khwaab" }] };
    }
    const { poem } = loaderData;
    const firstLine = poem.hinglish[0] || "Shayari";
    const secondLine = poem.hinglish[1] || "";
    const title = `${firstLine} — ${poem.mood} Shayari in Hindi, Urdu & Hinglish | Ek Khwaab`;
    const description = `${firstLine}${secondLine ? ` / ${secondLine}` : ""}. Read this authentic ${poem.mood} ${poem.format} by ${poem.takhallus} in Hinglish, Devanagari Hindi, and Nastaliq Urdu with English translation on Ek Khwaab.`;
    const canonical = `https://ekkhwaab.in/poetry/${loaderData.slug}`;

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
  const { poem } = Route.useLoaderData();
  const { liked, set, user } = useStore();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { promptSignIn } = useSignInPrompt();
  const [script, setScript] = useState<Script>("hinglish");
  const [showAllScripts, setShowAllScripts] = useState(true);
  const isCurated = !isLivePoemId(poem.id);
  const [daadCount, setDaadCount] = useState(
    poem.daad + (isCurated && liked.includes(poem.id) ? 1 : 0)
  );

  const isLiked = liked.includes(poem.id);
  const canWrite = Boolean(user && !user.guest);

  const toggleDaad = async () => {
    if (!canWrite || !user) {
      promptSignIn("appreciate");
      return;
    }

    // Archive verses have no poem_likes row; keep the appreciation local.
    if (isCurated) {
      setDaadCount(isLiked ? poem.daad : poem.daad + 1);
      set((s) => ({
        liked: isLiked ? s.liked.filter((x) => x !== poem.id) : [...s.liked, poem.id],
      }));
      return;
    }

    const previous = liked;
    const next = Math.max(0, daadCount + (isLiked ? -1 : 1));
    setDaadCount(next);
    set((s) => ({
      liked: s.liked.includes(poem.id) ? s.liked.filter((x) => x !== poem.id) : [...s.liked, poem.id],
    }));
    patchFeedPoem(qc, poem.id, { daad: next });

    const res = await togglePoemLike(poem.id, user.poetId, isLiked);
    if (!res.success) {
      setDaadCount(daadCount);
      set({ liked: previous });
      patchFeedPoem(qc, poem.id, { daad: daadCount });
      toast.error(res.error || "Could not update your appreciation.");
    }
  };

  const copyShayari = () => {
    void copyPoem(poem, script);
  };

  const shareThis = () => {
    void sharePoem(poem, script);
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
      "name": "Ek Khwaab",
      "url": "https://ekkhwaab.in",
    },
  };

  return (
    <div className="mx-auto max-w-4xl px-3.5 py-6 sm:px-6 md:px-10 md:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-ink">Home</Link>
        <span>/</span>
        <Link to="/feed" className="hover:text-ink">Explore Feed</Link>
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
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => void toggleDaad()}
              aria-label={daadCount > 0 ? `Appreciate, ${daadCount} appreciations` : "Appreciate this verse"}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-medium transition",
                isLiked ? "border-crimson bg-blush text-crimson" : "border-hairline text-ink hover:bg-muted"
              )}
            >
              <Heart className={cn("size-3.5", isLiked && "fill-crimson")} />
              <span>{daadCount > 0 ? daadCount : "Appreciate"}</span>
            </button>
            <button onClick={copyShayari} className={cn(btnOutline, "px-3.5 py-2 text-xs")}>
              <Copy className="size-3.5" /> Copy Shayari
            </button>
            <button onClick={shareThis} className={cn(btnOutline, "px-3.5 py-2 text-xs")}>
              <Share2 className="size-3.5" /> Share
            </button>
            <button onClick={openInStudio} className={cn(btnRoyal, "px-4 py-2 text-xs")}>
              <Palette className="size-3.5" /> Create Card
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
          <ArrowLeft className="size-4" /> Back to Explore Feed
        </Link>
      </div>
    </div>
  );
}

