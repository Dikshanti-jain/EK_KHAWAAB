import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, X, Search, Sparkles, Loader2, ArrowUp } from "lucide-react";
import { toast } from "sonner";
import { FILTERS, MOODS, POEMS, matchFilter, poetId, type Script } from "@/data/poems";
import { useStore } from "@/lib/store";
import { useDocumentSEO } from "@/hooks/useDocumentSEO";
import { useFeed, patchFeedPoem, prependFeedPoem } from "@/lib/feed-cache";
import { createPoem } from "@/lib/poems.service";
import { detectScript, triggerAutoTranslation } from "@/lib/translation.service";
import { PoemCard } from "@/components/PoemCard";
import { PoemSkeletonList } from "@/components/PoemSkeleton";
import { Modal } from "@/components/Modal";
import { useSignInPrompt } from "@/components/SignInPrompt";
import { ScriptSwitch, btnOutline, btnPrimary, card, chip, input, label } from "@/components/kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/feed")({
  validateSearch: (s: Record<string, unknown>): { q?: string | undefined } => ({
    q: typeof s["q"] === "string" && s["q"].trim() ? s["q"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Explore Hindi, Urdu & Hinglish Shayari, Ghazals & Poems | Ek Khwaab" },
      {
        name: "description",
        content:
          "Created by Dikshanti Jain. Browse trending two-line shayari, heartbreak poetry, late-night tanhai couplets, and unspoken love ghazals in Hinglish, Hindi, and Urdu.",
      },
      { property: "og:title", content: "Explore Hindi, Urdu & Hinglish Shayari | Created by Dikshanti Jain | Ek Khwaab" },
      {
        property: "og:description",
        content:
          "Browse trending two-line shayari, heartbreak poetry, late-night tanhai couplets, and unspoken love ghazals in Hinglish, Devanagari Hindi, and Nastaliq Urdu.",
      },
      { property: "og:url", content: "https://ekkhwaab.in/feed" },
    ],
  }),
  component: Feed,
});

export function Feed() {
  useDocumentSEO({
    title: "Explore Hindi, Urdu & Hinglish Shayari, Ghazals & Poems | Ek Khwaab",
    description: "Browse trending two-line shayari, heartbreak poetry, late-night tanhai couplets, and unspoken love ghazals in Hinglish, Devanagari Hindi, and Nastaliq Urdu.",
    canonicalPath: "/feed",
  });
  const { poems: storePoems, script, set, updatePoem, user } = useStore();
  const qc = useQueryClient();
  const nav = useNavigate();
  const { promptSignIn } = useSignInPrompt();
  // `/explore` reuses this component outside the `/feed` route, so read the
  // nearest search params instead of the route-bound hook (which would throw).
  const routeSearch = useSearch({ strict: false }) as { q?: string | undefined };
  const q = typeof routeSearch.q === "string" ? routeSearch.q : undefined;
  const [f, setF] = useState("All Moods");
  const [search, setSearch] = useState(q ?? "");
  const [compose, setCompose] = useState(false);
  const [text, setText] = useState("");
  const [mood, setMood] = useState(MOODS[0]!);
  const [posting, setPosting] = useState(false);
  const [showTop, setShowTop] = useState(false);

  // One RPC call per page, deduped and cached for 45 s. Re-entering /feed
  // inside that window costs zero network requests.
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useFeed(
    user?.poetId ?? "anon"
  );

  const poems = data?.poems ?? storePoems ?? POEMS;

  // A #tag click lands here as ?q=…; keep the visible search in sync.
  useEffect(() => {
    setSearch(q ?? "");
  }, [q]);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const canWrite = Boolean(user && !user.guest);

  const openCompose = () => {
    if (!canWrite) {
      promptSignIn("write");
      return;
    }
    setCompose(true);
  };

  const clearFilters = () => {
    setSearch("");
    setF("All Moods");
    nav({ to: "/feed", search: {}, replace: true });
  };

  // Stage-1 bridge: PoemCard still mutates the store array. Feed it the cached
  // page so both representations agree. Removed in stage 2.
  useEffect(() => {
    if (data?.poems) set({ poems: data.poems });
  }, [data?.poems, set]);

  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem("ek_compose_draft");
      if (savedDraft) setText(savedDraft);
    } catch {
      // localStorage unavailable in SSR
    }
  }, []);

  const handleTextChange = (val: string) => {
    setText(val);
    try {
      localStorage.setItem("ek_compose_draft", val);
    } catch {
      // ignore
    }
  };

  const deferredQuery = useDeferredValue(search.trim().toLowerCase());

  const list = useMemo(
    () =>
      poems.filter((p) => {
        // 1. Mood & Format Filter
        if (!matchFilter(p, f)) return false;

        // 2. Global Search Query Filter
        if (!deferredQuery) return true;

        const id = poetId(p.takhallus).toLowerCase();
        const takhallus = p.takhallus.toLowerCase();
        const moodName = p.mood.toLowerCase();
        const formatName = p.format.toLowerCase();
        const textAll = [
          ...p.hinglish,
          ...p.hindi,
          ...p.urdu,
          ...p.english,
          ...(p.tags || []),
        ].join(" ").toLowerCase();

        return (
          id.includes(deferredQuery) ||
          takhallus.includes(deferredQuery) ||
          moodName.includes(deferredQuery) ||
          formatName.includes(deferredQuery) ||
          textAll.includes(deferredQuery)
        );
      }),
    [poems, f, deferredQuery]
  );

  // Infinite scroll. The visible button below stays as the accessible fallback.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage) return;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: "600px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const post = async () => {
    if (!canWrite) {
      promptSignIn("write");
      return;
    }
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      toast.error("Please write at least two lines for your verse.");
      return;
    }
    setPosting(true);
    try {
      const detected = detectScript(lines.join("\n"));
      const res = await createPoem({
        shayarUid: user?.poetId || "",
        takhallus: user?.penName ?? "Guest_Reader",
        lines,
        sourceScript: detected,
        moodTag: mood,
        formatType: lines.length === 2 ? "Sher" : "Nazm",
      });

      if (res.error || !res.poem) {
        toast.error(res.error || "Could not publish poem to server.");
        return;
      }

      const newPoem = res.poem;
      // Immediate non-blocking publication to user's feed.
      // Both representations are updated: the store bridge that PoemCard reads,
      // and the query cache that /feed will re-render from on the next visit.
      set((s) => ({
        poems: [newPoem, ...s.poems],
      }));
      prependFeedPoem(qc, newPoem);

      try {
        localStorage.removeItem("ek_compose_draft");
      } catch {
        // ignore
      }
      setText("");
      setCompose(false);
      toast.success("Your poem is now live on the feed");

      // Trigger automatic background translation into other 3 supported scripts
      triggerAutoTranslation(newPoem.id, lines, detected, (updates) => {
        updatePoem(newPoem.id, updates);
        patchFeedPoem(qc, newPoem.id, updates);
      });
    } catch (err: any) {
      toast.error("Could not post poem: " + (err?.message || "Please try again"));
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-3.5 py-6 sm:px-6 md:px-12 md:py-14">
      {/* Top Header & Write Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink sm:text-3xl md:text-5xl">Explore Feed</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm md:text-base">
            Verses from anonymous poets sheltered behind their pen names.
          </p>
        </div>
        <button
          type="button"
          onClick={openCompose}
          className={cn(btnPrimary, "px-4 py-2 text-xs sm:px-5 sm:py-2.5 sm:text-sm")}
        >
          <Plus className="size-3.5 sm:size-4" /> Write a Poem
        </button>
      </div>

      {/* Sticky Filter & Search Bar Header */}
      <div className="sticky top-14 z-30 -mx-3.5 mt-6 space-y-3 border-b border-hairline bg-background/95 px-3.5 py-3 backdrop-blur-md sm:top-16 sm:-mx-6 sm:mt-8 sm:px-6 md:top-20 md:-mx-12 md:px-12">
        {/* Global Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-subtle sm:size-4" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search keywords, emotions, poet name or #EK-ID…"
            className={cn(input, "rounded-full py-2 pl-9 pr-8 text-xs shadow-sm sm:py-2.5 sm:pl-10 sm:text-sm")}
          />
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-subtle hover:text-ink"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills and Script Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {FILTERS.map((x) => (
              <button
                key={x}
                type="button"
                onClick={() => setF(x)}
                className={cn(
                  "rounded-full px-2.5 py-1.5 text-[11px] font-medium transition sm:px-3.5 sm:py-1.5 sm:text-xs",
                  f === x
                    ? "bg-ink text-primary-foreground shadow-sm"
                    : "border border-hairline bg-card text-muted-foreground hover:border-border hover:text-ink"
                )}
              >
                {x}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[11px] font-medium text-muted-foreground sm:text-xs">Script:</span>
            <ScriptSwitch value={script} onChange={(s: Script) => set({ script: s })} />
          </div>
        </div>

        {/* High-Intent Topic Explorations */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] sm:text-xs">
          <span className="font-mono text-subtle">Topics:</span>
          <Link
            to="/topic/$topic"
            params={{ topic: "heartbreak-shayari" }}
            className="rounded-full border border-hairline/70 bg-card/60 px-2.5 py-0.5 text-muted-foreground transition hover:border-royal hover:text-royal"
          >
            Heartbreak
          </Link>
          <Link
            to="/topic/$topic"
            params={{ topic: "two-line-shayari" }}
            className="rounded-full border border-hairline/70 bg-card/60 px-2.5 py-0.5 text-muted-foreground transition hover:border-royal hover:text-royal"
          >
            Two-Line Couplets
          </Link>
          <Link
            to="/topic/$topic"
            params={{ topic: "loneliness-shayari" }}
            className="rounded-full border border-hairline/70 bg-card/60 px-2.5 py-0.5 text-muted-foreground transition hover:border-royal hover:text-royal"
          >
            Tanhai (Solitude)
          </Link>
          <Link
            to="/topic/$topic"
            params={{ topic: "love-shayari" }}
            className="rounded-full border border-hairline/70 bg-card/60 px-2.5 py-0.5 text-muted-foreground transition hover:border-royal hover:text-royal"
          >
            Mohabbat (Love)
          </Link>
        </div>
      </div>

      {/* Compose — a real modal: Escape, backdrop, scroll lock and a 40 px close. */}
      <Modal
        open={compose}
        onClose={() => setCompose(false)}
        title="Compose a poem"
        description={`Publishing anonymously as @${user?.penName ?? "you"}. Your verse is translated into Hindi, Urdu, Hinglish and English.`}
        maxWidth="max-w-2xl"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" disabled={posting} onClick={() => setCompose(false)} className={btnOutline}>
              Cancel
            </button>
            <button type="button" disabled={posting} onClick={post} className={btnPrimary}>
              {posting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" /> Publishing...
                </span>
              ) : (
                "Publish Poem"
              )}
            </button>
          </div>
        }
      >
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-crimson sm:size-5" />
          <span className="text-xs text-muted-foreground">One line per row. Two lines make a sher.</span>
        </div>

        <textarea
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          rows={4}
          placeholder={"Teri yaad ki baarish mein bheegta raha dil,\nKhamoshi ne sab keh diya jo kehna tha."}
          className={cn(input, "mt-3 font-serif text-base leading-relaxed sm:text-lg")}
        />

        <div className="mt-4">
          <label className={label}>Select Mood Tag</label>
          <div className="flex flex-wrap gap-1.5">
            {MOODS.map((m) => (
              <button key={m} type="button" onClick={() => setMood(m)} className={chip(mood === m)}>
                {m}
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* Results Meta Info */}
      <div className="mt-4 flex items-center justify-between text-xs text-subtle sm:mt-6">
        <span>Showing {list.length} {list.length === 1 ? "verse" : "verses"}</span>
        {search && <span>Filtered by “{search}”</span>}
      </div>

      {/* Poetry Feed Cards */}
      <div className="mx-auto mt-4 max-w-3xl space-y-4 sm:mt-6 sm:space-y-6">
        {isLoading && !data ? (
          <PoemSkeletonList count={2} />
        ) : (
          list.map((p) => <PoemCard key={p.id} poem={p} globalScript={script} />)
        )}

        {!isLoading && !list.length && (
          <div className={cn(card, "px-6 py-16 text-center sm:py-20")}>
            <p className="font-serif text-xl italic text-ink">
              {search ? `No poems found for “${search}”` : "No poems match this mood yet."}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try a different word, or clear the filters and wander the whole feed.
            </p>
            <button onClick={clearFilters} className={cn(btnOutline, "mt-6")}>
              Clear Filters
            </button>
          </div>
        )}

        {hasNextPage && (
          <>
            <div ref={sentinel} className="h-10" aria-hidden />
            <div className="flex justify-center pt-4 sm:pt-6">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className={cn(btnOutline, "px-6 py-2.5 text-xs sm:text-sm")}
              >
                {isFetchingNextPage ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" /> Loading more verses...
                  </span>
                ) : (
                  "Load More Verses"
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Mobile: jump to top or start writing without hunting for the header. */}
      <div className="fixed bottom-20 right-4 z-30 flex flex-col items-end gap-2 lg:hidden">
        {showTop && (
          <button
            type="button"
            aria-label="Back to top"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="grid size-10 place-items-center rounded-full border border-hairline bg-background/95 text-ink shadow-float backdrop-blur"
          >
            <ArrowUp className="size-4" />
          </button>
        )}
        <button
          type="button"
          onClick={openCompose}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-3 text-xs font-semibold text-primary-foreground shadow-float transition hover:bg-primary-hover"
        >
          <Plus className="size-4" /> Write Poem
        </button>
      </div>
    </div>
  );
}
