import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Volume2, ArrowRight } from "lucide-react";
import { LUGHAT, getWordSlug } from "@/data/lughat";
import { PageHead, card, input } from "@/components/kit";
import { useDocumentSEO } from "@/hooks/useDocumentSEO";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dictionary")({
  head: () => ({
    meta: [
      { title: "Urdu & Poetic Words Dictionary (Lughat) with Hinglish Meanings | Ek Khawaab" },
      {
        name: "description",
        content: "Learn the meanings, pronunciation, and shayari examples of deep Urdu and Hindi poetic words like Hijr, Tagaful, Vehshat, Musalsal, Qurbat, and Arzoo.",
      },
      { property: "og:title", content: "Urdu & Poetic Words Dictionary (Lughat) with Hinglish Meanings | Ek Khawaab" },
      {
        property: "og:description",
        content: "Learn the meanings, pronunciation, and shayari examples of deep Urdu and Hindi poetic words.",
      },
      { property: "og:url", content: "https://ekkhawaab.in/dictionary" },
    ],
    links: [
      { rel: "canonical", href: "https://ekkhawaab.in/dictionary" },
    ],
  }),
  component: Dictionary,
});

const speak = (t: string) => {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    const u = new SpeechSynthesisUtterance(t);
    u.lang = "hi-IN";
    u.rate = 0.8;
    window.speechSynthesis.speak(u);
  }
};

function Dictionary() {
  useDocumentSEO({
    title: "Urdu & Poetic Words Dictionary (Lughat) with Hinglish Meanings | Ek Khawaab",
    description: "Learn the meanings, pronunciation, and shayari examples of deep Urdu and Hindi poetic words like Hijr, Tagaful, Vehshat, Musalsal, Qurbat, and Arzoo.",
    canonicalPath: "/dictionary",
  });
  const [q, setQ] = useState("");
  const list = LUGHAT.filter((w) =>
    [w.roman, w.hindi, w.urdu, w.meaning].some((f) =>
      f.toLowerCase().includes(q.toLowerCase())
    )
  );

  return (
    <div className="mx-auto max-w-6xl px-3.5 py-6 sm:px-6 md:px-12 md:py-14">
      <PageHead
        kicker="LUGHAT · POETRY DICTIONARY"
        title="The words behind the verses"
        sub="Spellings in three scripts, pronunciation, meaning, and how classical poets invoke each word in shayari."
      />

      <div className="relative mb-6 sm:mb-10 max-w-xl">
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-subtle" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search — hijr, longing, क़ुर्बत, فراق, tagaful…"
          className={cn(input, "rounded-full py-2.5 sm:py-3 pl-11 text-sm")}
        />
      </div>

      <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
        {list.map((w) => {
          const wordSlug = getWordSlug(w);
          return (
            <div key={w.roman} className={cn(card, "p-5 sm:p-6 flex flex-col justify-between transition hover:shadow-float")}>
              <div>
                <div className="flex items-start justify-between">
                  <Link
                    to="/dictionary/$word"
                    params={{ word: wordSlug }}
                    className="hover:text-royal transition"
                  >
                    <h2 className="text-2xl font-semibold text-ink">{w.roman}</h2>
                  </Link>
                  <button
                    aria-label={`Pronounce ${w.roman}`}
                    onClick={() => speak(w.hindi)}
                    className="rounded-full p-2 text-royal hover:bg-wash transition"
                  >
                    <Volume2 className="size-4" />
                  </button>
                </div>
                <p className="text-sm text-subtle mt-0.5">
                  <span className="deva">{w.hindi}</span> · <span className="font-urdu">{w.urdu}</span> · <span className="font-mono text-xs">/{w.say}/</span>
                </p>
                <p className="mt-3 font-semibold text-royal text-sm">{w.meaning}</p>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{w.context}</p>
                <p className="mt-3 rounded-xl bg-secondary p-3 font-serif italic text-xs text-ink line-clamp-2">
                  "{w.example}"
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-hairline flex items-center justify-between">
                <Link
                  to="/dictionary/$word"
                  params={{ word: wordSlug }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-crimson hover:underline"
                >
                  <span>Full Meaning & Poems</span>
                  <ArrowRight className="size-3" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {!list.length && (
        <p className="py-12 text-center text-muted-foreground">
          No word matches that search yet. Explore words like <i>Hijr</i>, <i>Tagaful</i>, or <i>Vehshat</i>.
        </p>
      )}
    </div>
  );
}
