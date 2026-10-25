import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import {
  Loader2,
  RefreshCw,
  Sparkles,
  X,
  Wand2,
  GitCompare,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Palette,
  Sliders,
  Bookmark,
  Send,
  Feather,
  Plus,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import {
  composeShayari,
  STYLES,
  POETRY_TYPES,
  POETRY_MOODS,
  SUGGESTED_TAGS,
  type PoemResult,
  type PoeticStyle,
  type PoetryType,
  type PoetryMood,
} from "@/lib/shayar.functions";
import { POEMS, type Script } from "@/data/poems";
import { useStore, uid } from "@/lib/store";
import { PageHead, ScriptSwitch, btnOutline, btnPrimary, btnRoyal, card, input, label } from "@/components/kit";
import { cn } from "@/lib/utils";
import { highlightSeeds } from "@/lib/seeds";

export const Route = createFileRoute("/ai-poet")({
  head: () => ({
    meta: [
      { title: "Shayar-e-Khawaab — AI Poetry Studio | Ek Khawaab" },
      {
        name: "description",
        content:
          "Transform your raw feelings, memories, and personal situations into original Shayari, Ghazals, and Nazms powered by Groq AI.",
      },
      { property: "og:title", content: "Shayar-e-Khawaab — AI Poetry Studio" },
      {
        property: "og:description",
        content: "Context-aware, personalized poetry co-writer across Hinglish, Hindi, and Urdu.",
      },
    ],
  }),
  component: AiPoet,
});

const STYLE_CARDS: Record<PoeticStyle, [string, string]> = {
  "Modern Hinglish": ["Modern Hinglish", "Raw, relatable, everyday imagery"],
  "Jaun Elia": ["Jaun Elia Style", "Deep heartbreak with existential irony"],
  Gulzar: ["Gulzar Style", "Nostalgic metaphors & paused time"],
  "Mirza Ghalib": ["Mirza Ghalib Style", "Classical philosophy & paradox"],
};

const POETRY_TYPE_LABELS: Record<PoetryType, { title: string; desc: string }> = {
  shayari: { title: "Shayari / Sher", desc: "A 2-line memorable couplet" },
  ghazal: { title: "Ghazal", desc: "Multi-couplets with radif & qafiya" },
  nazm: { title: "Nazm", desc: "Thematic descriptive poem" },
  micropoetry: { title: "Micro-Poetry", desc: "Compact, minimalist lines" },
  freeverse: { title: "Free Verse", desc: "Azad Nazm with emotional rhythm" },
  rubai: { title: "Rubai", desc: "4-line quatrain (AABA scheme)" },
  caption: { title: "Poetic Caption", desc: "Short, social-ready quote" },
  continue: { title: "Complete My Thought", desc: "Complete an unfinished line" },
  improve: { title: "Improve My Shayari", desc: "Polish draft meter & rhyme" },
  translate: { title: "Translation", desc: "Adapt across Hindi & Urdu scripts" },
};

export function AiPoet() {
  const compose = useServerFn(composeShayari);
  const { set, poems } = useStore();
  const nav = useNavigate();

  // Core Configuration
  const [poetryType, setPoetryType] = useState<PoetryType>("shayari");
  const [situation, setSituation] = useState(
    "I see her every day in college, but cannot start a conversation. I don't want to make her uncomfortable."
  );

  // Phrases & Keywords
  const [phrases, setPhrases] = useState<string[]>(["Library", "Silent"]);
  const [phraseDraft, setPhraseDraft] = useState("");
  const [isPhraseMandatory, setIsPhraseMandatory] = useState(false);

  // Semantic Themes / Hashtags
  const [selectedTags, setSelectedTags] = useState<string[]>(["#UnspokenFeelings", "#Intezaar"]);
  const [customTagInput, setCustomTagInput] = useState("");

  // Mood & Intensity
  const [mood, setMood] = useState<PoetryMood>("Quiet longing");
  const [intensity, setIntensity] = useState<"Subtle" | "Moderate" | "Deep">("Moderate");

  // Literary Style & Controls
  const [style, setStyle] = useState<PoeticStyle>("Modern Hinglish");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [length, setLength] = useState<"couplet" | "qata" | "short" | "full">("couplet");
  const [vocabComplexity, setVocabComplexity] = useState<"conversational" | "classical">("conversational");
  const [rhymePreference, setRhymePreference] = useState<"rhymed" | "free">("rhymed");
  const [radif, setRadif] = useState("");
  const [qafiya, setQafiya] = useState("");
  const [metaphorDensity, setMetaphorDensity] = useState<"minimal" | "moderate" | "rich">("moderate");
  const [perspective, setPerspective] = useState<"first_person" | "observational">("first_person");
  const [avoidWords, setAvoidWords] = useState("");

  // Original Draft for Continue or Improve
  const [draftText, setDraftText] = useState("");

  // Output & Interaction State
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<PoemResult | null>(null);
  const [script, setScript] = useState<Script>("hinglish");
  const [showComparison, setShowComparison] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync draft couplet from feed if available
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem("ek_khawaab_draft_couplet");
      if (savedDraft && !draftText) {
        setDraftText(savedDraft);
      }
    } catch {}
  }, []);

  const addPhrase = (w: string) => {
    const trimmed = w.trim();
    if (trimmed && phrases.length < 6 && !phrases.some((p) => p.toLowerCase() === trimmed.toLowerCase())) {
      setPhrases([...phrases, trimmed]);
    }
    setPhraseDraft("");
  };

  const removePhrase = (w: string) => {
    setPhrases(phrases.filter((p) => p !== w));
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else if (selectedTags.length < 6) {
      setSelectedTags([...selectedTags, tag]);
    } else {
      toast.error("You can select up to 6 theme tags.");
    }
  };

  const addCustomTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    const raw = customTagInput.trim();
    if (!raw) return;
    const formatted = raw.startsWith("#") ? raw : `#${raw}`;
    if (!selectedTags.includes(formatted) && selectedTags.length < 6) {
      setSelectedTags([...selectedTags, formatted]);
      setCustomTagInput("");
    }
  };

  const run = async () => {
    if (poetryType === "improve" || poetryType === "continue") {
      if (!draftText.trim()) {
        toast.error("Please enter your draft lines first.");
        return;
      }
    } else if (!situation.trim() && phrases.length === 0) {
      toast.error("Please describe your situation or add important words.");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        situation,
        phrases,
        isPhraseMandatory,
        tags: selectedTags,
        poetryType,
        primaryLanguage: script,
        mood,
        intensity,
        length,
        vocabComplexity,
        rhymePreference,
        radif,
        qafiya,
        metaphorDensity,
        perspective,
        avoidWords,
        draftText: poetryType === "improve" || poetryType === "continue" ? draftText : "",
        style,
        poeticStyleLens: STYLE_CARDS[style][1],
      };

      const r = await compose({ data: payload });

      if (r.error) {
        toast.error(r.error);
      } else if (r.poem) {
        setRes(r.poem);
        setScript("hinglish");
        setIsEditing(false);
        if (poetryType === "improve") setShowComparison(true);
        toast.success("Shayar-e-Khawaab has crafted your verse!");
      }
    } catch (err: any) {
      toast.error(err.message || "The AI poet could not write right now. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleLineChange = (index: number, newText: string) => {
    if (!res) return;
    const currentScriptLines = [...res[script]];
    currentScriptLines[index] = newText;
    setRes({
      ...res,
      [script]: currentScriptLines,
    });
  };

  const chooseContinuation = (opt: { hinglish: string; hindi: string; urdu: string }) => {
    if (!res) return;
    setRes({
      ...res,
      hinglish: [res.hinglish[0]!, opt.hinglish],
      hindi: [res.hindi[0]!, opt.hindi],
      urdu: [res.urdu[0]!, opt.urdu],
    });
    toast.success("Applied continuation to your verse.");
  };

  const copyToClipboard = () => {
    if (!res) return;
    const lines = res[script].join("\n");
    navigator.clipboard.writeText(lines);
    setCopied(true);
    toast.success("Poem copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const saveToBasta = () => {
    if (!res) return;
    const newPoemId = uid();
    set((s) => ({
      saved: s.saved.includes(newPoemId) ? s.saved : [...s.saved, newPoemId],
      poems: [
        {
          ...POEMS[0]!,
          id: newPoemId,
          takhallus: s.user?.penName ?? "Shayar",
          format: poetryType.toUpperCase(),
          mood,
          style,
          hinglish: res.hinglish,
          hindi: res.hindi,
          urdu: res.urdu,
          english: [res.english],
          daad: 0,
          muqarrar: 0,
          hashiya: [],
        },
        ...s.poems,
      ],
    }));
    toast.success("Poem saved to your private Basta!");
  };

  const publishToFeed = () => {
    if (!res) return;
    set((s) => ({
      poems: [
        {
          ...POEMS[0]!,
          id: uid(),
          takhallus: s.user?.penName ?? "Guest_Reader",
          format: poetryType.toUpperCase(),
          mood,
          style,
          hinglish: res.hinglish,
          hindi: res.hindi,
          urdu: res.urdu,
          english: [res.english],
          daad: 0,
          muqarrar: 0,
          hashiya: [],
        },
        ...s.poems,
      ],
    }));
    toast.success("Published to the Mehfil feed!");
    nav({ to: "/feed" });
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-16 md:px-12">
      <PageHead
        kicker="SHAYAR-E-KHAWAAB · POWERED BY GROQ"
        title="Personalized Poetry Writing Studio"
        sub="Describe what happened or what you feel. The AI Shayar crafts authentic, metered verse in Hinglish, Hindi, and Urdu specifically for your moment."
      />

      {/* Main Grid: Input Studio & Live Output Canvas */}
      <div className="mt-10 grid gap-8 lg:grid-cols-[480px_1fr]">
        {/* Left Column: Literary Input Controls */}
        <div className={cn(card, "space-y-6 p-7 md:p-8")}>
          {/* 1. Poetry Form Selector */}
          <div>
            <label className={label}>Poetic Form / Genre</label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-2">
              {(Object.keys(POETRY_TYPE_LABELS) as PoetryType[]).map((type) => {
                const info = POETRY_TYPE_LABELS[type];
                const active = poetryType === type;
                return (
                  <button
                    key={type}
                    onClick={() => {
                      setPoetryType(type);
                      setRes(null);
                      setShowComparison(false);
                    }}
                    className={cn(
                      "rounded-xl border p-3 text-left transition",
                      active
                        ? "border-crimson bg-blush/60 text-crimson shadow-sm"
                        : "border-hairline bg-card hover:border-border"
                    )}
                  >
                    <p className="text-xs font-semibold leading-tight text-ink">{info.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{info.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Mode-Specific Draft Input (For Improve & Continue) */}
          {(poetryType === "improve" || poetryType === "continue") && (
            <div>
              <label className={label}>
                {poetryType === "improve" ? "Your Draft Lines (To Polish)" : "Your Opening Line / Misra"}
              </label>
              <textarea
                rows={4}
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                placeholder={
                  poetryType === "improve"
                    ? "Tere bina ye raatein kitni veeran hain,\nAankhon mein bas tera hi khawaab rehta hai."
                    : "Main chup raha to usne samjha ke gila nahi hai..."
                }
                className={cn(input, "font-serif text-sm leading-relaxed")}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {poetryType === "improve"
                  ? "We polish meter (behr), rhyme (qafiya), and vocabulary without altering your intended sentiment."
                  : "We complete the thought seamlessly and offer 3 alternative continuations."}
              </p>
            </div>
          )}

          {/* 3. Your Words / Situation Context */}
          <div>
            <label className={label}>
              Your Situation, Memory, or Feelings
              <span className="ml-1 text-xs font-normal text-muted-foreground">(The core context)</span>
            </label>
            <textarea
              rows={4}
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              placeholder="Jo baat keh nahi pa rahe, apne words mein likho. Perfect likhne ki zaroorat nahi..."
              className={cn(input, "text-sm leading-relaxed")}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Tip: The more genuine and specific your context, the more unique your poetry will be.
            </p>
          </div>

          {/* 4. Important Words / Phrases to Include */}
          <div>
            <div className="flex items-center justify-between">
              <label className={label}>Key Words or Phrases</label>
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={isPhraseMandatory}
                  onChange={(e) => setIsPhraseMandatory(e.target.checked)}
                  className="rounded border-border text-crimson focus:ring-crimson"
                />
                Mandatory in poem
              </label>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 rounded-xl border border-border p-2 focus-within:border-royal">
              {phrases.map((p) => (
                <span
                  key={p}
                  className="flex items-center gap-1 rounded-full bg-blush px-2.5 py-1 text-xs font-medium text-crimson"
                >
                  {p}
                  <button aria-label={`Remove ${p}`} onClick={() => removePhrase(p)}>
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              {phrases.length < 6 && (
                <input
                  value={phraseDraft}
                  onChange={(e) => setPhraseDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addPhrase(phraseDraft);
                    }
                  }}
                  placeholder="Add phrase (press Enter)"
                  className="min-w-28 flex-1 bg-transparent px-2 py-0.5 text-xs outline-none"
                />
              )}
            </div>
          </div>

          {/* 5. Semantic Themes & Hashtags */}
          <div>
            <label className={label}>Semantic Themes (#Tags)</label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {SUGGESTED_TAGS.map((t) => {
                const selected = selectedTags.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleTag(t)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs transition",
                      selected
                        ? "border-crimson bg-blush font-medium text-crimson"
                        : "border-hairline text-muted-foreground hover:border-border"
                    )}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
            {/* Custom Tag Input */}
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomTag(e);
                  }
                }}
                placeholder="Add custom #tag..."
                className={cn(input, "py-1.5 text-xs")}
              />
              <button onClick={addCustomTag} className={cn(btnOutline, "px-3 py-1.5 text-xs")}>
                <Plus className="size-3.5" />
              </button>
            </div>
          </div>

          {/* 6. Mood & Intensity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Emotional Mood</label>
              <select
                value={mood}
                onChange={(e) => setMood(e.target.value as PoetryMood)}
                className={cn(input, "cursor-pointer py-2 text-xs")}
              >
                {POETRY_MOODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Emotional Intensity</label>
              <div className="flex rounded-xl border border-hairline p-0.5">
                {(["Subtle", "Moderate", "Deep"] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setIntensity(lvl)}
                    className={cn(
                      "flex-1 rounded-lg py-1.5 text-center text-xs transition",
                      intensity === lvl ? "bg-ink font-semibold text-primary-foreground" : "text-muted-foreground hover:text-ink"
                    )}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 7. Poetic Style & Lens */}
          <div>
            <label className={label}>Literary Voice & Style Lens</label>
            <div className="grid grid-cols-2 gap-2.5">
              {STYLES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStyle(s)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition",
                    style === s ? "border-crimson bg-blush shadow-sm" : "border-hairline hover:border-border"
                  )}
                >
                  <p className="text-xs font-semibold text-ink">{STYLE_CARDS[s][0]}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{STYLE_CARDS[s][1]}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 8. Progressive Disclosure: Advanced Literary Controls */}
          <div className="border-t border-hairline pt-3">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex w-full items-center justify-between text-xs font-semibold text-royal hover:underline"
            >
              <span className="flex items-center gap-1.5">
                <Sliders className="size-3.5" /> Advanced Literary Controls
              </span>
              {showAdvanced ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4 rounded-2xl bg-secondary/60 p-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={label}>Length</label>
                    <select
                      value={length}
                      onChange={(e) => setLength(e.target.value as any)}
                      className={cn(input, "py-1.5 text-xs")}
                    >
                      <option value="couplet">Couplet (2 lines)</option>
                      <option value="qata">Qata (4 lines)</option>
                      <option value="short">Short (6 lines)</option>
                      <option value="full">Full (8-10 lines)</option>
                    </select>
                  </div>
                  <div>
                    <label className={label}>Diction</label>
                    <select
                      value={vocabComplexity}
                      onChange={(e) => setVocabComplexity(e.target.value as any)}
                      className={cn(input, "py-1.5 text-xs")}
                    >
                      <option value="conversational">Conversational Hindustani</option>
                      <option value="classical">Classical Urdu/Hindi</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={label}>Radif (Refrain)</label>
                    <input
                      value={radif}
                      onChange={(e) => setRadif(e.target.value)}
                      placeholder="e.g. rehti hai"
                      className={cn(input, "py-1.5 text-xs")}
                    />
                  </div>
                  <div>
                    <label className={label}>Qafiya (Rhyme)</label>
                    <input
                      value={qafiya}
                      onChange={(e) => setQafiya(e.target.value)}
                      placeholder="e.g. teri, meri"
                      className={cn(input, "py-1.5 text-xs")}
                    />
                  </div>
                </div>

                <div>
                  <label className={label}>Words or Clichés to Avoid</label>
                  <input
                    value={avoidWords}
                    onChange={(e) => setAvoidWords(e.target.value)}
                    placeholder="e.g. bewafa, dhokha, maut"
                    className={cn(input, "py-1.5 text-xs")}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 9. Generate Action Button */}
          <button
            onClick={run}
            disabled={busy}
            className={cn(btnPrimary, "w-full py-4 text-base font-semibold shadow-md")}
          >
            {busy ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" /> Composing with Groq AI...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Sparkles className="size-4" /> Generate Contextual Poetry
              </span>
            )}
          </button>
        </div>

        {/* Right Column: Editorial Poetry Output Canvas */}
        <div className={cn(card, "flex min-h-[36rem] flex-col p-8 md:p-10")}>
          {!res ? (
            <div className="m-auto max-w-sm text-center">
              <div className="mx-auto grid size-16 place-items-center rounded-full bg-wash text-royal shadow-sm">
                <Feather className="size-8" />
              </div>
              <p className="mt-5 font-serif text-2xl italic text-ink">
                {busy ? "Shayar-e-Khawaab is choosing words…" : "Your poem will be born here."}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter your situation, pick your poetic form, and receive original verse that respects your true emotions.
              </p>
            </div>
          ) : (
            <>
              {/* Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-wash px-3 py-1 font-mono text-xs font-semibold text-royal">
                    {(res.poetryType || poetryType).toUpperCase()}
                  </span>
                  {res.tags && res.tags.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {res.tags.join(" ")}
                    </span>
                  )}
                  {poetryType === "improve" && (
                    <button
                      onClick={() => setShowComparison(!showComparison)}
                      className={cn(btnOutline, "py-1 text-xs")}
                    >
                      <GitCompare className="size-3.5" />
                      {showComparison ? "Hide Comparison" : "Compare with Original"}
                    </button>
                  )}
                </div>
                <ScriptSwitch value={script} onChange={setScript} />
              </div>

              {/* Side-by-Side Comparison for 'Improve' Mode */}
              {poetryType === "improve" && showComparison && res.originalDraft && (
                <div className="my-6 grid gap-4 rounded-2xl bg-secondary/60 p-5 sm:grid-cols-2">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Original Draft:
                    </span>
                    <p className="mt-2 whitespace-pre-line font-serif text-base italic text-muted-foreground">
                      {res.originalDraft}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-crimson">
                      Polished Verse:
                    </span>
                    <p className="mt-2 whitespace-pre-line font-serif text-base text-ink">
                      {res[script].join("\n")}
                    </p>
                  </div>
                </div>
              )}

              {/* Editable Verse Canvas */}
              <div
                dir={script === "urdu" ? "rtl" : "ltr"}
                className={cn(
                  "my-auto py-10 text-center text-ink",
                  script === "urdu" ? "urdu text-2xl" : script === "hindi" ? "deva text-2xl" : "font-serif text-3xl leading-loose"
                )}
              >
                {res[script].map((line, i) => (
                  <div key={i} className="group relative mx-auto my-2 max-w-2xl">
                    <input
                      type="text"
                      value={line}
                      onChange={(e) => handleLineChange(i, e.target.value)}
                      className={cn(
                        "w-full rounded-lg bg-transparent text-center transition hover:bg-secondary/40 focus:bg-secondary/80 focus:outline-none",
                        script === "urdu" ? "urdu" : script === "hindi" ? "deva" : "font-serif"
                      )}
                    />
                  </div>
                ))}

                {/* Poetic English Interpretation */}
                <p className="mx-auto mt-8 max-w-lg font-sans text-sm italic text-muted-foreground" dir="ltr">
                  "{res.english}"
                </p>
              </div>

              {/* Mode: Alternative Continuations (For Continue Mode) */}
              {poetryType === "continue" && res.continuations && res.continuations.length > 0 && (
                <div className="my-6 border-t border-hairline pt-5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Choose an Alternative Continuation:
                  </span>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {res.continuations.map((c, idx) => (
                      <button
                        key={idx}
                        onClick={() => chooseContinuation(c)}
                        className="rounded-2xl border border-hairline bg-card p-3.5 text-left text-xs transition hover:border-royal hover:shadow-sm"
                      >
                        <p className={cn("font-serif text-sm font-medium text-ink", script === "urdu" && "urdu")}>
                          {c[script]}
                        </p>
                        <span className="mt-2 flex items-center gap-1 font-sans text-[11px] text-royal">
                          Apply Line <ArrowRight className="size-3" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom Action Toolbar */}
              <div className="flex flex-wrap items-center gap-2 border-t border-hairline pt-5">
                <button onClick={publishToFeed} className={cn(btnPrimary, "px-5")}>
                  <Send className="size-4" /> Post to Mehfil Feed
                </button>
                <button
                  onClick={() => {
                    set({ studio: { lines: res.hinglish, penName: "" } });
                    nav({ to: "/studio" });
                  }}
                  className={cn(btnRoyal, "px-5")}
                >
                  <Palette className="size-4" /> Card Studio
                </button>
                <button onClick={saveToBasta} className={btnOutline}>
                  <Bookmark className="size-4" /> Save in Basta
                </button>
                <button onClick={copyToClipboard} className={btnOutline}>
                  {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button onClick={run} disabled={busy} className={btnOutline}>
                  <RefreshCw className="size-4" /> Regenerate
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
