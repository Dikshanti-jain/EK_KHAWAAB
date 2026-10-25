import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, Palette, Share2, ShieldCheck, Sparkles, Languages, Image as Img, Flame, ArrowRight, ChevronLeft, ChevronRight, Bookmark } from "lucide-react";
import { toast } from "sonner";
import { POEMS, poetId, type Script } from "@/data/poems";
import { useStore } from "@/lib/store";
import { IdBadge, Pill, ScriptSwitch, Verse, btnOutline, btnPrimary, btnRoyal, card } from "@/components/kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ek Khawaab — Where unspoken feelings find their verse" },
      { name: "description", content: "Write, read and share poetry in Hinglish, Hindi and Urdu — anonymously, under a pen name." },
      { property: "og:title", content: "Ek Khawaab — Anonymous Poetry Sanctuary" },
      { property: "og:description", content: "Anonymous poetry in three scripts, an AI co-writer, card studio and secret letters." },
    ],
  }),
  component: Home,
});

const FEATURES = [
  { i: ShieldCheck, t: "100% Masked Identity", d: "Your real details stay in a private vault. Only your pen name and #EK-ID ever represent you." },
  { i: Sparkles, t: "Word-to-Verse AI Co-Writer", d: "Give 3–5 of your own words and let AI weave them into metered shayari." },
  { i: Languages, t: "Instant Multi-Script Reader", d: "Read any poem in Hinglish, Hindi or Urdu with a single click." },
  { i: Img, t: "High-Res Card Studio & Secret Letters", d: "Download 9:16 story cards, or send wax-sealed riddle letters." },
];

function Home() {
  const [s, setS] = useState<Script>("hinglish");
  const { liked, saved, set } = useStore();
  const nav = useNavigate();
  const demo = POEMS[0]!;
  const on = liked.includes(demo.id);

  // Auto-rotating Couplet Ticker (rotates every 4s, pauses on hover)
  const tickerPoems = POEMS.slice(0, 5);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % tickerPoems.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isPaused, tickerPoems.length]);

  const activeTickerPoem = tickerPoems[tickerIndex]!;

  // Top Trending Shayaris of the Mehfil (sorted by appreciations)
  const trendingPoems = [...POEMS].sort((a, b) => b.daad - a.daad).slice(0, 6);

  const toggleLiked = (id: string) => {
    set((st) => ({
      liked: st.liked.includes(id) ? st.liked.filter((x) => x !== id) : [...st.liked, id],
    }));
  };

  const toggleSaved = (id: string) => {
    const isSaved = saved.includes(id);
    set((st) => ({
      saved: isSaved ? st.saved.filter((x) => x !== id) : [...st.saved, id],
    }));
    toast(isSaved ? "Removed from your collection" : "Saved to your collection");
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="mx-auto grid max-w-6xl items-center gap-16 px-6 py-20 md:px-12 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <span className="rounded-full bg-wash px-4 py-1.5 text-xs font-semibold tracking-wide text-royal">ANONYMOUS LITERARY SANCTUARY</span>
          <h1 className="mt-6 text-5xl leading-[1.12] tracking-tight text-ink md:text-6xl">
            Where unspoken feelings find their verse, <span className="italic text-crimson">anonymously.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Write, read, and share deep poetry in Hinglish, Hindi, and Urdu. Your real identity stays locked in a private vault—only your pen name and words appear in the feed.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link to="/feed" className={cn(btnPrimary, "px-7 py-3.5 text-base")}>Explore Poetry Feed</Link>
            <Link to="/auth" search={{ mode: "signup" }} className={cn(btnOutline, "px-7 py-3.5 text-base")}>Create Your Pen Name</Link>
          </div>
        </div>

        {/* Interactive Featured Poetry Card */}
        <div className="rounded-3xl border border-hairline bg-card p-8 shadow-float md:p-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-ink">@{demo.takhallus}</span>
              <IdBadge id={poetId(demo.takhallus)} />
              <Pill tone="red">{demo.mood}</Pill>
            </div>
            <ScriptSwitch value={s} onChange={setS} />
          </div>
          <div className="py-12">
            <Verse lines={demo[s]} script={s} />
            {demo.tags && demo.tags.length > 0 && (
              <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                {demo.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-wash/80 px-3 py-1 font-mono text-xs font-semibold text-royal"
                  >
                    {tag.startsWith("#") ? tag : `#${tag}`}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 border-t border-hairline pt-4">
            <button
              onClick={() => toggleLiked(demo.id)}
              className={cn(btnOutline, "py-2", on && "border-crimson text-crimson")}
            >
              <Heart className={cn("size-4", on && "fill-current text-crimson")} /> Appreciate ({demo.daad + (on ? 1 : 0)})
            </button>
            <Link
              to="/studio"
              onClick={() => set({ studio: { lines: demo[s], penName: demo.takhallus } })}
              className={cn(btnOutline, "py-2")}
            >
              <Palette className="size-4" /> Customize Card
            </Link>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(window.location.origin + "/feed");
                toast("Link copied to clipboard");
              }}
              className={cn(btnOutline, "py-2")}
            >
              <Share2 className="size-4" /> Share
            </button>
          </div>
          <p className="mt-5 text-xs text-subtle">Click any underlined word to view its vocabulary meaning in Lughat.</p>
        </div>
      </section>

      {/* Interactive Poetry Ticker / Changing Banner */}
      <section
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="border-y border-hairline bg-wash/50 py-5 transition-colors"
      >
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 md:flex-row md:px-12">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full bg-blush px-3 py-1 font-mono text-xs font-semibold text-crimson">
              <Sparkles className="size-3.5" /> FEATURED VERSE
            </span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>@{activeTickerPoem.takhallus}</span>
              <IdBadge id={poetId(activeTickerPoem.takhallus)} />
            </div>
          </div>

          <div className="min-h-12 flex-1 text-center font-serif text-lg italic text-ink md:px-8">
            <p className="transition-all duration-500 ease-in-out">
              "{activeTickerPoem[s][0]}"
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              aria-label="Previous verse"
              onClick={() => setTickerIndex((prev) => (prev - 1 + tickerPoems.length) % tickerPoems.length)}
              className="rounded-full border border-hairline bg-background p-1.5 text-muted-foreground transition hover:text-ink"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="font-mono text-xs text-subtle">
              {tickerIndex + 1}/{tickerPoems.length}
            </span>
            <button
              aria-label="Next verse"
              onClick={() => setTickerIndex((prev) => (prev + 1) % tickerPoems.length)}
              className="rounded-full border border-hairline bg-background p-1.5 text-muted-foreground transition hover:text-ink"
            >
              <ChevronRight className="size-4" />
            </button>
            <button
              onClick={() => {
                set({ studio: { lines: activeTickerPoem[s], penName: activeTickerPoem.takhallus } });
                nav({ to: "/studio" });
              }}
              className="ml-2 rounded-full border border-hairline bg-background px-3 py-1 text-xs font-medium text-royal transition hover:border-royal"
            >
              Studio
            </button>
          </div>
        </div>
      </section>

      {/* Top Trending Shayaris of the Mehfil Section */}
      <section className="bg-secondary py-20">
        <div className="mx-auto max-w-6xl px-6 md:px-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-crimson">
                <Flame className="size-4" /> Trending in the Mehfil
              </span>
              <h2 className="mt-2 text-3xl font-semibold text-ink md:text-4xl">Top Appreciated Couplets</h2>
              <p className="mt-2 text-muted-foreground">The most resonated and bookmarked verses written by anonymous poets.</p>
            </div>
            <Link to="/feed" className="inline-flex items-center gap-1.5 text-sm font-semibold text-royal hover:underline">
              View All Poems in Feed <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {trendingPoems.map((poem) => {
              const isLiked = liked.includes(poem.id);
              const isSaved = saved.includes(poem.id);
              return (
                <article
                  key={poem.id}
                  className={cn(card, "flex flex-col justify-between p-8 transition hover:shadow-float")}
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink">@{poem.takhallus}</span>
                        <IdBadge id={poetId(poem.takhallus)} />
                        <Pill tone="blue">{poem.mood}</Pill>
                      </div>
                      <span className="rounded-full bg-wash px-2.5 py-0.5 font-mono text-[11px] font-medium text-wash-foreground">
                        {poem.format}
                      </span>
                    </div>

                    <div className="py-8">
                      <Verse lines={poem[s]} script={s} />
                      {poem.tags && poem.tags.length > 0 && (
                        <div className="mt-6 flex flex-wrap items-center gap-2">
                          {poem.tags.map((tag) => (
                            <span
                              key={tag}
                              onClick={() => nav({ to: "/feed", search: {} as any })}
                              className="cursor-pointer rounded-full bg-wash/80 px-2.5 py-0.5 font-mono text-xs font-semibold text-royal transition-all hover:bg-royal hover:text-white"
                            >
                              {tag.startsWith("#") ? tag : `#${tag}`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleLiked(poem.id)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition",
                          isLiked ? "bg-blush font-semibold text-crimson" : "text-muted-foreground hover:bg-muted hover:text-ink"
                        )}
                      >
                        <Heart className={cn("size-4", isLiked && "fill-current text-crimson")} />
                        Appreciate ({poem.daad + (isLiked ? 1 : 0)})
                      </button>

                      <button
                        onClick={() => toggleSaved(poem.id)}
                        className={cn(
                          "rounded-full p-2 transition",
                          isSaved ? "text-royal" : "text-muted-foreground hover:bg-muted hover:text-ink"
                        )}
                        title={isSaved ? "Saved" : "Save"}
                        aria-label="Save poem"
                      >
                        <Bookmark className={cn("size-4", isSaved && "fill-current text-royal")} />
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        set({ studio: { lines: poem[s], penName: poem.takhallus } });
                        nav({ to: "/studio" });
                      }}
                      className={cn(btnOutline, "py-1.5 text-xs")}
                    >
                      <Palette className="size-3.5" /> Open in Card Studio
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Ek Khawaab Bento Grid */}
      <section className="bg-background py-20">
        <div className="mx-auto max-w-6xl px-6 md:px-12">
          <Pill>WHY EK KHAWAAB</Pill>
          <h2 className="mt-4 text-4xl font-semibold text-ink">A quieter, cleaner place for poetry</h2>
          <p className="mt-2 text-lg text-muted-foreground">Built to strip away vanity metrics, social anxiety, and digital noise.</p>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ i: I, t, d }, n) => (
              <div key={t} className={cn(card, "p-8")}>
                <div className={cn("grid size-11 place-items-center rounded-xl", n % 2 ? "bg-blush text-crimson" : "bg-wash text-royal")}>
                  <I className="size-5" />
                </div>
                <h3 className="mt-6 text-xl font-semibold text-ink">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
