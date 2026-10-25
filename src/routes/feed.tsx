import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, X, Search, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { FILTERS, MOODS, matchFilter, poetId, type Script } from "@/data/poems";
import { useStore } from "@/lib/store";
import { fetchPoems, createPoem } from "@/lib/poems.service";
import { PoemCard } from "@/components/PoemCard";
import { ScriptSwitch, btnOutline, btnPrimary, card, chip, input, label } from "@/components/kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Explore Feed — Ek Khawaab" },
      { name: "description", content: "Anonymous couplets, ghazals and nazms in Hinglish, Hindi and Urdu." },
      { property: "og:title", content: "Explore Feed — Ek Khawaab" },
      { property: "og:description", content: "Read and appreciate anonymous poetry." },
    ],
  }),
  component: Feed,
});

function Feed() {
  const { poems, script, set, user } = useStore();
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
      const newPoem = await createPoem({
        shayarUid: user?.poetId || "#EK-7492",
        takhallus: user?.penName ?? "Guest_Reader",
        hinglish: lines,
        hindi: lines,
        urdu: lines,
        english: [],
        moodTag: mood,
        formatType: lines.length === 2 ? "Sher" : "Nazm",
      });
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
      toast("Your poem is now live on the Mehfil feed");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 md:px-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold text-ink md:text-5xl">Explore Feed</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Verses from anonymous poets you will only ever know by their pen name.
          </p>
        </div>
        <button onClick={() => setCompose(true)} className={cn(btnPrimary, "px-6 py-3")}>
          <Plus className="size-4" /> + Write a Poem
        </button>
      </div>

      {/* Sticky Filter & Search Bar Header */}
      <div className="sticky top-20 z-30 -mx-4 mt-10 space-y-4 border-b border-hairline bg-background/95 px-4 py-4 backdrop-blur-md">
        {/* Global Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search poetry by keywords, emotions, poet name or Unique ID like #EK-4829…"
            className={cn(input, "rounded-full py-3 pl-11 pr-10 text-sm shadow-sm")}
          />
          {search && (
            <button
              aria-label="Clear search"
              onClick={() => setSearch("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-subtle hover:text-ink"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Filter Pills and Script Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((x) => (
              <button
                key={x}
                onClick={() => setF(x)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-medium transition",
                  f === x
                    ? "bg-ink text-primary-foreground shadow-sm"
                    : "border border-hairline bg-card text-muted-foreground hover:border-border hover:text-ink"
                )}
              >
                {x}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-medium text-muted-foreground">Read In:</span>
            <ScriptSwitch value={script} onChange={(s: Script) => set({ script: s })} />
          </div>
        </div>
      </div>

      {/* Compose Poem Drawer / Box */}
      {compose && (
        <div className={cn(card, "mt-8 p-8 shadow-float")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-crimson" />
              <h2 className="text-2xl font-semibold text-ink">Compose a Poem</h2>
            </div>
            <button
              aria-label="Close"
              onClick={() => setCompose(false)}
              className="rounded-full p-2 text-subtle transition hover:bg-muted hover:text-ink"
            >
              <X className="size-5" />
            </button>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Publishing anonymously as <b className="text-ink">@{user?.penName ?? "Guest_Reader"}</b>
          </p>

          <textarea
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            rows={4}
            placeholder={"Write one line per row…\nTeri yaad ki baarish mein bheegta raha dil,\nKhamoshi ne sab keh diya jo kehna tha."}
            className={cn(input, "mt-4 font-serif text-lg leading-relaxed")}
          />

          <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <label className={label}>Select Mood Tag</label>
              <div className="flex flex-wrap gap-2">
                {MOODS.map((m) => (
                  <button key={m} onClick={() => setMood(m)} className={chip(mood === m)}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button disabled={posting} onClick={() => setCompose(false)} className={btnOutline}>
                Cancel
              </button>
              <button disabled={posting} onClick={post} className={btnPrimary}>
                {posting ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="size-4 animate-spin" /> Publishing...
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
      <div className="mt-6 flex items-center justify-between text-xs text-subtle">
        <span>Showing {list.length} {list.length === 1 ? "verse" : "verses"}</span>
        {search && <span>Filtered by "{search}"</span>}
      </div>

      {/* Poetry Feed Cards */}
      <div className="mx-auto mt-6 max-w-3xl space-y-6">
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
