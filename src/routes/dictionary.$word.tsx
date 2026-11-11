import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { safeJsonLd } from "@/lib/security";
import { Volume2, ArrowLeft, BookOpen, Sparkles, ArrowRight, Share2, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { LUGHAT, findWordBySlug, getWordSlug, type Word } from "@/data/lughat";
import { POEMS, getPoemSlug } from "@/data/poems";
import { card, btnOutline, btnPrimary, btnRoyal, IdBadge, Pill } from "@/components/kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dictionary/$word")({
  loader: ({ params }) => {
    const word = findWordBySlug(params.word);
    if (!word) {
      throw notFound();
    }
    return { word, slug: params.word };
  },
  head: ({ loaderData }) => {
    if (!loaderData?.word) {
      return { meta: [{ title: "Word Not Found — Ek Khawaab Dictionary" }] };
    }
    const { word } = loaderData;
    const title = `${word.roman} Meaning in Hindi, Urdu & English with Shayari Examples | Ek Khawaab Dictionary`;
    const description = `Learn the poetic meaning of ${word.roman} (${word.hindi} • ${word.urdu}) in Hindi, Urdu, and English. Pronunciation: /${word.say}/. Understand how classical shayar like Ghalib and Jaun Elia use it with authentic couplet examples.`;
    const canonical = `https://ekkhawaab.in/dictionary/${loaderData.slug}`;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "keywords", content: `${word.roman} meaning, ${word.hindi} meaning, ${word.urdu} meaning, urdu dictionary, hindi dictionary, poetry words, lughat, ${word.meaning}` },
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
  component: DictionaryWordPage,
});

const speakWord = (text: string) => {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "hi-IN";
    u.rate = 0.8;
    window.speechSynthesis.speak(u);
  }
};

function DictionaryWordPage() {
  const { word, slug } = Route.useLoaderData();
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    const url = `${window.location.origin}/dictionary/${slug}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Dictionary word link copied!");
    } else {
      toast(url);
    }
  };

  // Find poems that use this word
  const matchingPoems = POEMS.filter((p) => {
    const text = [...p.hinglish, ...p.hindi, ...p.urdu].join(" ").toLowerCase();
    return (
      text.includes(word.roman.toLowerCase()) ||
      text.includes(word.hindi.toLowerCase()) ||
      text.includes(word.urdu)
    );
  }).slice(0, 4);

  // Related dictionary words
  const relatedWords = LUGHAT.filter((w) => w.roman !== word.roman).slice(0, 6);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    "name": word.roman,
    "alternateName": [word.hindi, word.urdu],
    "description": word.meaning,
    "inDefinedTermSet": {
      "@type": "DefinedTermSet",
      "name": "Ek Khawaab Urdu & Hindi Poetry Lughat",
      "url": "https://ekkhawaab.in/dictionary",
    },
    "url": `https://ekkhawaab.in/dictionary/${slug}`,
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
        <Link to="/dictionary" className="hover:text-ink">Poetry Dictionary (Lughat)</Link>
        <span>/</span>
        <span className="font-semibold text-ink">{word.roman}</span>
      </nav>

      {/* Main Word Header Article */}
      <article className={cn(card, "p-6 sm:p-10 md:p-12 relative overflow-hidden")}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="rounded-full bg-wash px-3 py-1 font-mono text-xs font-semibold text-royal">
              URDU & HINDI LUGHAT
            </span>
            <h1 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-semibold text-ink tracking-tight">
              {word.roman}{" "}
              <span className="text-2xl sm:text-3xl font-normal text-muted-foreground">
                (<span className="deva">{word.hindi}</span> · <span className="urdu text-2xl">{word.urdu}</span>)
              </span>
            </h1>
            <p className="mt-3 text-lg font-medium text-royal">
              {word.meaning}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => speakWord(word.hindi)}
              aria-label={`Pronounce ${word.roman}`}
              className="flex items-center gap-1.5 rounded-full border border-hairline bg-secondary/80 px-4 py-2 text-xs font-medium text-royal hover:bg-wash transition"
            >
              <Volume2 className="size-4" />
              <span>Listen / Pronounce</span>
            </button>
            <button
              onClick={copyLink}
              aria-label="Share word link"
              className={cn(btnOutline, "p-2.5")}
              title="Copy link"
            >
              {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
            </button>
          </div>
        </div>

        {/* Phonetics & Etymology Badges */}
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-hairline pt-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-ink">Pronunciation:</span>
            <span className="font-mono text-ink bg-secondary px-2.5 py-1 rounded-md">/{word.say}/</span>
          </div>
          {word.origin && (
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-ink">Etymology:</span>
              <span className="text-ink">{word.origin}</span>
            </div>
          )}
        </div>

        {/* Literary Nuance & Context */}
        <div className="mt-8 space-y-4">
          <h2 className="text-base font-semibold text-ink">Literary Nuance & Poetic Usage</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {word.context}
          </p>
          {word.nuance && (
            <div className="rounded-2xl border border-hairline bg-secondary/50 p-4 sm:p-5 text-xs sm:text-sm leading-relaxed text-ink/90">
              <p className="font-semibold text-royal mb-1">In Classical & Modern Poetry:</p>
              <p>{word.nuance}</p>
            </div>
          )}
        </div>

        {/* Primary Couplet Example */}
        <div className="mt-8 rounded-2xl bg-secondary p-5 sm:p-6 border-l-4 border-crimson">
          <span className="text-xs font-semibold uppercase tracking-wider text-crimson">
            Shayari Example in Roman Hinglish
          </span>
          <p className="mt-2 font-serif text-lg sm:text-xl italic text-ink">
            "{word.example}"
          </p>
        </div>

        {/* Secondary Couplet Example (Multi-script if available) */}
        {word.secondaryExample && (
          <div className="mt-6 rounded-2xl bg-secondary/70 p-5 sm:p-6 border-l-4 border-royal">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-royal">
                Classical Couplet Tribute
              </span>
              {word.secondaryExample.poet && (
                <span className="text-xs font-semibold text-ink">— {word.secondaryExample.poet}</span>
              )}
            </div>
            <p className="mt-2 font-serif text-base sm:text-lg italic text-ink">
              "{word.secondaryExample.hinglish}"
            </p>
            <p className="mt-2 text-base deva text-ink">
              {word.secondaryExample.hindi}
            </p>
            <p className="mt-2 text-lg urdu text-ink" dir="rtl">
              {word.secondaryExample.urdu}
            </p>
          </div>
        )}
      </article>

      {/* Poems using this word */}
      {matchingPoems.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-ink">Poems on Ek Khawaab Featuring "{word.roman}"</h2>
            <Link to="/feed" className="text-xs font-semibold text-royal hover:underline">
              Explore All →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {matchingPoems.map((p) => {
              const poemSlug = getPoemSlug(p);
              return (
                <Link
                  key={p.id}
                  to="/poetry/$slug"
                  params={{ slug: poemSlug }}
                  className={cn(card, "p-5 transition hover:shadow-float flex flex-col justify-between")}
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                      <span className="font-semibold text-ink">@{p.takhallus}</span>
                      <span className="rounded-full bg-wash px-2 py-0.5 text-royal text-[11px]">{p.format}</span>
                    </div>
                    <p className="font-serif text-sm italic text-ink line-clamp-3">
                      "{p.hinglish[0]}"
                    </p>
                  </div>
                  <span className="mt-4 flex items-center gap-1 text-xs font-medium text-crimson">
                    Read Poem with Tashreeh <ArrowRight className="size-3" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Explore Related Words in Lughat */}
      <section className="mt-8 rounded-3xl border border-hairline bg-card p-6 sm:p-8">
        <h2 className="text-base font-semibold text-ink">Explore More Poetic Words in Lughat</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {relatedWords.map((rw) => {
            const rwSlug = getWordSlug(rw);
            return (
              <Link
                key={rw.roman}
                to="/dictionary/$word"
                params={{ word: rwSlug }}
                className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-secondary/50 px-3.5 py-1.5 text-xs text-ink hover:border-royal hover:bg-wash transition"
              >
                <span className="font-semibold">{rw.roman}</span>
                <span className="text-muted-foreground text-[11px]">({rw.hindi})</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Back button */}
      <div className="mt-10 text-center">
        <Link to="/dictionary" className={cn(btnOutline, "px-6 py-2.5")}>
          <ArrowLeft className="size-4" /> Back to Full Poetry Dictionary
        </Link>
      </div>
    </div>
  );
}

