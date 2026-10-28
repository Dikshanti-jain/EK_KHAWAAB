import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, Palette, Share2, ShieldCheck, Sparkles, Languages, Image as Img, Flame, ArrowRight, ChevronLeft, ChevronRight, Bookmark, Linkedin, Mail } from "lucide-react";
import { toast } from "sonner";
import { POEMS, poetId, type Script } from "@/data/poems";
import { useStore } from "@/lib/store";
import { IdBadge, Pill, ScriptSwitch, Verse, btnOutline, btnPrimary, btnRoyal, card } from "@/components/kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ek Khawaab — Anonymous Poetry Sanctuary | Founded by Dikshanti Jain" },
      { name: "description", content: "Write, read and share poetry in Hinglish, Hindi and Urdu anonymously under a pen name. Created by Dikshanti Jain, featuring an AI co-writer and HD card studio." },
      { name: "author", content: "Dikshanti Jain" },
      { property: "og:title", content: "Ek Khawaab — Anonymous Poetry Sanctuary by Dikshanti Jain" },
      { property: "og:description", content: "Anonymous poetry in three scripts, an AI co-writer, card studio and secret letters. Created by Dikshanti Jain." },
      { property: "og:url", content: "https://ek-khawaab.vercel.app" },
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

  // Calm, serene Featured Couplet (manual toggle only, no jittery auto-slide)
  const tickerPoems = POEMS.slice(0, 5);
  const [tickerIndex, setTickerIndex] = useState(0);
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
      <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-8 sm:px-6 sm:py-12 md:gap-14 md:px-12 md:py-18 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <div className="mb-4 flex items-center gap-2.5 sm:mb-6">
            <img src="/logo-icon.png" alt="Ek Khawaab Insignia" className="size-8 sm:size-10 object-contain drop-shadow-sm" />
            <span className="rounded-full bg-wash px-3 py-1 text-[11px] font-semibold tracking-wide text-royal sm:px-4 sm:py-1.5 sm:text-xs">
              ANONYMOUS LITERARY SANCTUARY
            </span>
          </div>
          <h1 className="mt-3 text-3xl font-semibold leading-[1.15] tracking-tight text-ink sm:text-4xl md:text-5xl lg:text-6xl">
            Where unspoken feelings find their verse, <span className="italic text-crimson">anonymously.</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base md:text-lg">
            Write, read, and share deep poetry in Hinglish, Hindi, Urdu, and English. Your real identity stays locked in a private vault—only your pen name and words appear in the feed.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-8 sm:gap-4">
            <Link to="/feed" className={cn(btnPrimary, "px-5 py-2.5 text-xs sm:px-6 sm:py-3 sm:text-sm md:text-base")}>
              Explore Poetry Feed
            </Link>
            <Link to="/auth" search={{ mode: "signup" }} className={cn(btnOutline, "px-5 py-2.5 text-xs sm:px-6 sm:py-3 sm:text-sm md:text-base")}>
              Create Your Pen Name
            </Link>
          </div>
        </div>

        {/* Interactive Featured Poetry Card */}
        <div className="rounded-3xl border border-hairline bg-card p-4 sm:p-6 md:p-8 shadow-float">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ink sm:text-base">@{demo.takhallus}</span>
              <IdBadge id={poetId(demo.takhallus)} />
              <Pill tone="red">{demo.mood}</Pill>
            </div>
            <ScriptSwitch value={s} onChange={setS} />
          </div>
          <div className="py-6 sm:py-8 md:py-10">
            <Verse lines={demo[s]} script={s} />
            {demo.tags && demo.tags.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                {demo.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-wash/80 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-royal sm:text-xs"
                  >
                    {tag.startsWith("#") ? tag : `#${tag}`}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-hairline pt-3 sm:pt-4">
            <button
              type="button"
              onClick={() => toggleLiked(demo.id)}
              className={cn(btnOutline, "py-1.5 px-3 text-xs sm:text-sm", on && "border-crimson text-crimson")}
            >
              <Heart className={cn("size-3.5 sm:size-4", on && "fill-current text-crimson")} />
              <span>Appreciate ({demo.daad + (on ? 1 : 0)})</span>
            </button>
            <Link
              to="/studio"
              onClick={() => set({ studio: { lines: demo[s], penName: demo.takhallus } })}
              className={cn(btnOutline, "py-1.5 px-3 text-xs sm:text-sm")}
            >
              <Palette className="size-3.5 sm:size-4" />
              <span>Studio</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(window.location.origin + "/feed");
                toast.success("Link copied to clipboard");
              }}
              className={cn(btnOutline, "py-1.5 px-3 text-xs sm:text-sm")}
            >
              <Share2 className="size-3.5 sm:size-4" />
              <span>Share</span>
            </button>
          </div>
          <p className="mt-3 text-[11px] text-subtle sm:text-xs">Tap any underlined word to view vocabulary meaning in Lughat.</p>
        </div>
      </section>

      {/* Featured Couplet Showcase (Tranquil, No auto-sliding page shifts) */}
      <section className="border-y border-hairline bg-wash/40 py-4 sm:py-5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 sm:px-6 md:flex-row md:px-12">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-1 rounded-full bg-blush px-2.5 py-0.5 font-mono text-[10px] font-semibold text-crimson sm:text-xs">
              <Sparkles className="size-3 sm:size-3.5" /> FEATURED
            </span>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>@{activeTickerPoem.takhallus}</span>
              <IdBadge id={poetId(activeTickerPoem.takhallus)} />
            </div>
          </div>

          <div className="text-center font-serif text-base italic text-ink sm:text-lg md:px-6">
            <p>"{activeTickerPoem[s][0]}"</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous featured verse"
              onClick={() => setTickerIndex((prev) => (prev - 1 + tickerPoems.length) % tickerPoems.length)}
              className="rounded-full border border-hairline bg-background p-1.5 text-muted-foreground transition hover:text-ink"
            >
              <ChevronLeft className="size-3.5 sm:size-4" />
            </button>
            <span className="font-mono text-[11px] text-subtle sm:text-xs">
              {tickerIndex + 1}/{tickerPoems.length}
            </span>
            <button
              type="button"
              aria-label="Next featured verse"
              onClick={() => setTickerIndex((prev) => (prev + 1) % tickerPoems.length)}
              className="rounded-full border border-hairline bg-background p-1.5 text-muted-foreground transition hover:text-ink"
            >
              <ChevronRight className="size-3.5 sm:size-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                set({ studio: { lines: activeTickerPoem[s], penName: activeTickerPoem.takhallus } });
                nav({ to: "/studio" });
              }}
              className="ml-1 rounded-full border border-hairline bg-background px-2.5 py-1 text-xs font-medium text-royal transition hover:border-royal"
            >
              Studio
            </button>
          </div>
        </div>
      </section>

      {/* Top Trending Shayaris of the Mehfil Section */}
      <section className="bg-secondary/60 py-8 sm:py-12 md:py-18">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-crimson">
                <Flame className="size-3.5 sm:size-4" /> Trending in the Mehfil
              </span>
              <h2 className="mt-1 text-2xl font-semibold text-ink sm:text-3xl md:text-4xl">Top Appreciated Couplets</h2>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm md:text-base">
                Resonant and bookmarked verses written by anonymous poets.
              </p>
            </div>
            <Link to="/feed" className="inline-flex items-center gap-1 text-xs font-semibold text-royal hover:underline sm:text-sm">
              View All in Feed <ArrowRight className="size-3.5 sm:size-4" />
            </Link>
          </div>

          <div className="mt-6 grid gap-4 sm:mt-8 sm:gap-6 md:grid-cols-2">
            {trendingPoems.map((poem) => {
              const isLiked = liked.includes(poem.id);
              const isSaved = saved.includes(poem.id);
              return (
                <article
                  key={poem.id}
                  className={cn(card, "flex flex-col justify-between p-4 sm:p-6 md:p-8 transition hover:shadow-float")}
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="text-sm font-semibold text-ink sm:text-base">@{poem.takhallus}</span>
                        <IdBadge id={poetId(poem.takhallus)} />
                        <Pill tone="blue">{poem.mood}</Pill>
                      </div>
                      <span className="rounded-full bg-wash px-2 py-0.5 font-mono text-[10px] font-medium text-wash-foreground sm:text-[11px]">
                        {poem.format}
                      </span>
                    </div>

                    <div className="py-6 sm:py-8">
                      <Verse lines={poem[s]} script={s} />
                      {poem.tags && poem.tags.length > 0 && (
                        <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                          {poem.tags.map((tag) => (
                            <span
                              key={tag}
                              onClick={() => nav({ to: "/feed", search: {} as any })}
                              className="cursor-pointer rounded-full bg-wash/80 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-royal transition-all hover:bg-royal hover:text-white sm:text-xs"
                            >
                              {tag.startsWith("#") ? tag : `#${tag}`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-3 sm:pt-4">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <button
                        type="button"
                        onClick={() => toggleLiked(poem.id)}
                        className={cn(
                          "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition sm:px-3 sm:py-1.5 sm:text-sm",
                          isLiked ? "bg-blush font-semibold text-crimson" : "text-muted-foreground hover:bg-muted hover:text-ink"
                        )}
                      >
                        <Heart className={cn("size-3.5 sm:size-4", isLiked && "fill-current text-crimson")} />
                        <span>{poem.daad + (isLiked ? 1 : 0)}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleSaved(poem.id)}
                        className={cn(
                          "rounded-full p-1.5 transition sm:p-2",
                          isSaved ? "text-royal" : "text-muted-foreground hover:bg-muted hover:text-ink"
                        )}
                        title={isSaved ? "Saved" : "Save"}
                        aria-label="Save poem"
                      >
                        <Bookmark className={cn("size-3.5 sm:size-4", isSaved && "fill-current text-royal")} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        set({ studio: { lines: poem[s], penName: poem.takhallus } });
                        nav({ to: "/studio" });
                      }}
                      className={cn(btnOutline, "py-1 px-2.5 text-xs sm:py-1.5 sm:px-3")}
                    >
                      <Palette className="size-3 sm:size-3.5" /> Studio
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Ek Khawaab Bento Grid */}
      <section className="bg-background py-8 sm:py-12 md:py-18">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-12">
          <Pill>WHY EK KHAWAAB</Pill>
          <h2 className="mt-3 text-2xl font-semibold text-ink sm:text-3xl md:text-4xl">A quieter, cleaner place for poetry</h2>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm md:text-base">Built to strip away vanity metrics, social anxiety, and digital noise.</p>
          <div className="mt-6 grid gap-4 sm:mt-8 sm:gap-5 md:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ i: I, t, d }, n) => (
              <div key={t} className={cn(card, "p-4 sm:p-6 md:p-8")}>
                <div className={cn("grid size-9 place-items-center rounded-xl sm:size-11", n % 2 ? "bg-blush text-crimson" : "bg-wash text-royal")}>
                  <I className="size-4 sm:size-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-ink sm:mt-5 sm:text-xl">{t}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Creator & Founder Section */}
      <section className="border-t border-hairline bg-secondary/40 py-8 sm:py-12 md:py-18">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 md:px-12">
          <div className="mx-auto mb-4 flex justify-center sm:mb-6">
            <img src="/logo.png" alt="Ek Khawaab Official Monogram" className="h-20 sm:h-28 md:h-32 w-auto object-contain drop-shadow-sm transition-transform duration-300 hover:scale-105" />
          </div>
          <Pill tone="blue">ABOUT THE CREATOR</Pill>
          <h2 className="mt-3 font-serif text-2xl font-semibold text-ink sm:text-3xl md:text-4xl">
            "Every heart holds a poem that never found a voice."
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm md:text-base">
            <strong>Ek Khawaab</strong> was conceptualized, designed, and built by <strong>Dikshanti Jain</strong> to give poetry lovers an intimate, noise-free sanctuary. A platform where words matter more than follower counts, and every poet is sheltered behind an anonymous pen name.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:mt-8 sm:gap-4">
            <a
              href="https://www.linkedin.com/in/dikshanti-jain-9345723a7"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-card px-4 py-2 text-xs font-medium text-ink shadow-sm transition hover:border-royal hover:text-royal sm:px-5 sm:py-2.5 sm:text-sm"
            >
              <Linkedin className="size-3.5 text-royal sm:size-4" />
              <span>Connect on LinkedIn</span>
            </a>
            <a
              href="mailto:jaindikahanti@gmail.com"
              className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-card px-4 py-2 text-xs font-medium text-muted-foreground shadow-sm transition hover:text-ink sm:px-5 sm:py-2.5 sm:text-sm"
            >
              <Mail className="size-3.5 sm:size-4" />
              <span>jaindikahanti@gmail.com</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
