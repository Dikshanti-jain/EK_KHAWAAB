import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, X, Search, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { FILTERS, MOODS, matchFilter, poetId, type Script } from "@/data/poems";
import { useStore } from "@/lib/store";
import { fetchPoems, createPoem } from "@/lib/poems.service";
import { detectScript, triggerAutoTranslation } from "@/lib/translation.service";
import { PoemCard } from "@/components/PoemCard";
import { ScriptSwitch, btnOutline, btnPrimary, card, chip, input, label } from "@/components/kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Explore Feed — Ek Khawaab" },
      { name: "description", content: "Anonymous couplets, ghazals and nazms in Hinglish, Hindi, Urdu, and English." },
      { property: "og:title", content: "Explore Feed — Ek Khawaab" },
      { property: "og:description", content: "Read and appreciate anonymous poetry across multiple scripts." },
    ],
  }),
  component: Feed,
});

function Feed() {
  const { poems, script, set, updatePoem, user } = useStore();
  const [f, setF] = useState("All Moods");
  const [search, setSearch] = useState("");
  const [compose, setCompose] = useState(false);
  const [text, setText] = useState("");
  const [mood, setMood] = useState(MOODS[0]!);
  const [posting, setPosting] = useState(false);

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

  useEffect(() => {
    let active = true;
    fetchPoems().then((loaded) => {
      if (active && loaded && loaded.length > 0) {
        set({ poems: loaded });
      }
    });
    return () => {
      active = false;
    };
  }, [set]);

  const query = search.trim().toLowerCase();

  const list = poems.filter((p) => {
    // 1. Mood & Format Filter
    const matchesFilter = matchFilter(p, f);
    if (!matchesFilter) return false;

    // 2. Global Search Query Filter
    if (!query) return true;

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
      id.includes(query) ||
      takhallus.includes(query) ||
      moodName.includes(query) ||
      formatName.includes(query) ||
      textAll.includes(query)
    );
  });

  const post = async () => {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      toast.error("Please write at least two lines for your verse.");
      return;
    }
    setPosting(true);
    try {
      const detected = detectScript(lines.join("\n"));
      const newPoem = await createPoem({
        shayarUid: user?.poetId || "#EK-7492",
        takhallus: user?.penName ?? "Guest_Reader",
        lines,
        sourceScript: detected,
        moodTag: mood,
        formatType: lines.length === 2 ? "Sher" : "Nazm",
      });

      // Immediate non-blocking publication to user's feed
      set((s) => ({
        poems: [newPoem, ...s.poems],
      }));

      try {
        localStorage.removeItem("ek_compose_draft");
      } catch {
        // ignore
      }
      setText("");
      setCompose(false);
      toast.success("Your poem is now live on the Mehfil feed");

      // Trigger automatic background translation into other 3 supported scripts
      triggerAutoTranslation(newPoem.id, lines, detected, (updates) => {
        updatePoem(newPoem.id, updates);
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
          onClick={() => setCompose(true)}
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
                  "rounded-full px-2.5 py-1 text-[11px] font-medium transition sm:px-3.5 sm:py-1.5 sm:text-xs",
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
      </div>

      {/* Compose Poem Drawer / Box */}
      {compose && (
        <div className={cn(card, "mt-6 p-4 sm:p-6 md:p-8 shadow-float")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-crimson sm:size-5" />
              <h2 className="text-xl font-semibold text-ink sm:text-2xl">Compose a Poem</h2>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setCompose(false)}
              className="rounded-full p-1.5 text-subtle transition hover:bg-muted hover:text-ink"
            >
              <X className="size-4 sm:size-5" />
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Publishing anonymously as <b className="text-ink">@{user?.penName ?? "Guest_Reader"}</b>.
            Your verse will automatically be translated into Hindi, Urdu, Hinglish, and English!
          </p>

          <textarea
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            rows={4}
            placeholder={"Write one line per row…\nTeri yaad ki baarish mein bheegta raha dil,\nKhamoshi ne sab keh diya jo kehna tha."}
            className={cn(input, "mt-3 font-serif text-base leading-relaxed sm:text-lg")}
          />

          <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <label className={label}>Select Mood Tag</label>
              <div className="flex flex-wrap gap-1.5">
                {MOODS.map((m) => (
                  <button key={m} type="button" onClick={() => setMood(m)} className={chip(mood === m)}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" disabled={posting} onClick={() => setCompose(false)} className={btnOutline}>
                Cancel
              </button>
              <button type="button" disabled={posting} onClick={post} className={btnPrimary}>
                {posting ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="size-3.5 animate-spin" /> Publishing...
                  </span>
                ) : (
                  "Publish to Mehfil"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Meta Info */}
      <div className="mt-4 flex items-center justify-between text-xs text-subtle sm:mt-6">
        <span>Showing {list.length} {list.length === 1 ? "verse" : "verses"}</span>
        {search && <span>Filtered by "{search}"</span>}
      </div>

      {/* Poetry Feed Cards */}
      <div className="mx-auto mt-4 max-w-3xl space-y-4 sm:mt-6 sm:space-y-6">
        {list.map((p) => (
          <PoemCard key={p.id} poem={p} globalScript={script} />
        ))}

        {!list.length && (
          <div className={cn(card, "py-20 text-center")}>
            <p className="font-serif text-xl italic text-ink">"Khamosh hai mehfil, koi harf nahi..."</p>
            <p className="mt-2 text-sm text-muted-foreground">
              No poems found matching your filter or search query.
            </p>
            <button
              onClick={() => {
                setSearch("");
                setF("All Moods");
              }}
              className={cn(btnOutline, "mt-6")}
            >
              Reset Search & Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
