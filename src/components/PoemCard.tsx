import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bookmark,
  Heart,
  MessageCircle,
  Palette,
  Mail,
  Trash2,
  Flag,
  AlertTriangle,
  Loader2,
  RotateCcw,
  Copy,
  MoreHorizontal,
  Link2,
  Sparkles,
  ArrowRight,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { poetId, getPoemSlug, isLivePoemId, type Poem, type Script } from "@/data/poems";
import { getWordSlug } from "@/data/lughat";
import { useStore } from "@/lib/store";
import { patchFeedPoem, removeFeedPoem } from "@/lib/feed-cache";
import {
  togglePoemLike,
  togglePoemBookmark,
  deletePoem,
  reportContent,
} from "@/lib/poems.service";
import { triggerAutoTranslation } from "@/lib/translation.service";
import { copyPoem, sharePoem } from "@/lib/share";
import { detectLughat } from "@/lib/lughat-detect";
import {
  IdBadge,
  Pill,
  RankBadge,
  ScriptSwitch,
  Verse,
  VerseFrame,
  card,
  input,
  label,
  btnPrimary,
  btnOutline,
  type VerseTone,
} from "./kit";
import { CommentDrawer } from "./CommentDrawer";
import { Modal } from "./Modal";
import { useSignInPrompt } from "./SignInPrompt";
import { cn } from "@/lib/utils";

const SURFACES: { id: VerseTone; label: string; bg: string; border: string }[] = [
  { id: "white", label: "White paper", bg: "#FFFFFF", border: "#E6DEC8" },
  { id: "cashmere", label: "Warm cashmere", bg: "#FAF6F0", border: "#E6DEC8" },
  { id: "midnight", label: "Midnight", bg: "#101B33", border: "#101B33" },
];

export function PoemCard({ poem, globalScript }: { poem: Poem; globalScript: Script }) {
  const store = useStore();
  const qc = useQueryClient();
  const nav = useNavigate();
  const { promptSignIn } = useSignInPrompt();
  const [override, setOverride] = useState<Script | null>(null);
  const [meaning, setMeaning] = useState(false);
  const [surface, setSurface] = useState<VerseTone>("white");
  const [seal, setSeal] = useState(0);
  const [drawer, setDrawer] = useState(false);
  const [ripple, setRipple] = useState(0);
  const [menu, setMenu] = useState(false);
  const [quickDownloading, setQuickDownloading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const lastTap = useRef(0);

  // Author Deletion & Moderation Report States
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("Contains real personal identity info");
  const [submittingReport, setSubmittingReport] = useState(false);

  const script = override ?? globalScript;
  const liked = store.liked.includes(poem.id);
  const saved = store.saved.includes(poem.id);
  const me = store.user;
  // A local "guest demo" user has no Supabase session, so every write would
  // fail server-side. Treat it as signed out for interactions.
  const canWrite = Boolean(me && !me.guest);
  // Curated archive verses have no database row. Their appreciation is a
  // personal, locally remembered action; live poems use the real server count.
  const isCurated = !isLivePoemId(poem.id);
  const isAuthor = Boolean(!isCurated && (poem.isOwner || (canWrite && me && me.penName === poem.takhallus)));

  const daad = isCurated ? poem.daad + (liked ? 1 : 0) : poem.daad;
  const commentCount = poem.hashiya.length;
  // The feed RPC returns at most three recent comments, so "3+" is honest
  // when the list is full and the true total is unknown.
  const commentLabel = commentCount === 0 ? "Comment" : commentCount >= 3 ? "3+" : String(commentCount);

  // Close the overflow menu on Escape and on any outside click.
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [menu]);

  // The wax seal blooms for 650 ms, then leaves no residue in the card.
  useEffect(() => {
    if (!seal) return;
    const t = window.setTimeout(() => setSeal(0), 700);
    return () => window.clearTimeout(t);
  }, [seal]);

  const toggleLike = async () => {
    if (!canWrite || !me) {
      promptSignIn("appreciate");
      return;
    }

    // Curated archive verses have no poem_likes row to write. Keep the
    // appreciation personal and local instead of failing a foreign key.
    if (isCurated) {
      store.set((s) => ({
        liked: s.liked.includes(poem.id) ? s.liked.filter((x) => x !== poem.id) : [...s.liked, poem.id],
      }));
      setRipple((r) => r + 1);
      return;
    }

    const userUid = me.poetId;
    const previous = store.liked;
    const nextDaad = Math.max(0, daad + (liked ? -1 : 1));

    // Optimistic: heart flips and the count moves immediately. The count is
    // patched by exactly one, never `serverCount + 1`, so it cannot double-count.
    store.set((s) => ({
      liked: s.liked.includes(poem.id) ? s.liked.filter((x) => x !== poem.id) : [...s.liked, poem.id],
    }));
    store.updatePoem(poem.id, { daad: nextDaad });
    patchFeedPoem(qc, poem.id, { daad: nextDaad });
    setRipple((r) => r + 1);

    const res = await togglePoemLike(poem.id, userUid, liked);
    if (!res.success) {
      store.set({ liked: previous });
      store.updatePoem(poem.id, { daad });
      patchFeedPoem(qc, poem.id, { daad });
      toast.error(res.error || "Could not update your appreciation.");
    }
  };

  /** Double-tap always appreciates; it never accidentally removes a like. */
  const appreciate = async () => {
    if (!canWrite || !me) {
      promptSignIn("appreciate");
      return;
    }
    setSeal((n) => n + 1);
    if (!liked) await toggleLike();
  };

  const onVersePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button, a")) return;
    if (e.pointerType === "mouse") return;
    const now = Date.now();
    if (now - lastTap.current < 320) {
      lastTap.current = 0;
      void appreciate();
    } else {
      lastTap.current = now;
    }
  };

  const onVerseDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button, a")) return;
    void appreciate();
  };

  const toggleSave = async () => {
    if (!canWrite || !me) {
      promptSignIn("save");
      return;
    }

    // Saves for curated verses live in the reader's local collection.
    if (isCurated) {
      store.set((s) => ({
        saved: s.saved.includes(poem.id) ? s.saved.filter((x) => x !== poem.id) : [...s.saved, poem.id],
      }));
      toast.success(saved ? "Removed from Saved Poems" : "Saved to your collection");
      return;
    }

    const userUid = me.poetId;
    const previous = store.saved;

    store.set((s) => ({
      saved: s.saved.includes(poem.id) ? s.saved.filter((x) => x !== poem.id) : [...s.saved, poem.id],
    }));

    const res = await togglePoemBookmark(poem.id, userUid, saved);
    if (!res.success) {
      store.set({ saved: previous });
      toast.error(res.error || "Could not update your saved poems.");
      return;
    }
    toast.success(saved ? "Removed from Saved Poems" : "Saved to your collection");
  };

  const openComments = () => setDrawer(true);

  const handleDeletePoem = async () => {
    if (isCurated) return;
    if (!canWrite || !me) {
      promptSignIn("write");
      return;
    }
    const res = await deletePoem(poem.id, me.poetId);
    if (!res.success) {
      toast.error(res.error || "Could not delete the verse.");
      return;
    }
    store.set((s) => ({
      poems: s.poems.filter((p) => p.id !== poem.id),
      saved: s.saved.filter((id) => id !== poem.id),
      liked: s.liked.filter((id) => id !== poem.id),
      myPoemCount: Math.max(0, s.myPoemCount - 1),
    }));
    removeFeedPoem(qc, poem.id);
    setShowDeleteConfirm(false);
    toast.success("Verse removed");
  };

  const handleReportPoem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportReason.trim() || submittingReport) return;
    setSubmittingReport(true);
    try {
      const res = await reportContent({
        targetType: "poem",
        targetId: poem.id,
        reason: reportReason,
      });
      if (res.success) {
        setShowReportModal(false);
        toast.success("Thank you. This verse has been flagged for editorial review.");
      } else {
        toast.error(res.error || "Failed to submit report.");
      }
    } finally {
      setSubmittingReport(false);
    }
  };

  const toStudio = () => {
    const linesToUse = poem[script] && poem[script].length ? poem[script] : poem.hinglish;
    store.set({ studio: { lines: linesToUse, penName: poem.takhallus } });
    nav({ to: "/studio" });
  };

  // Safe translation lines resolution
  const canonicalScript = poem.sourceLanguage || "hinglish";
  const currentLines = poem[script] && poem[script].length > 0 ? poem[script] : null;
  const canonicalLines =
    poem[canonicalScript] && poem[canonicalScript].length > 0
      ? poem[canonicalScript]
      : poem.hinglish.length
        ? poem.hinglish
        : poem.hindi.length
          ? poem.hindi
          : poem.urdu;
  const displayScript = currentLines ? script : canonicalScript;

  const translationStatus = poem.translationStatus?.[script];
  const isTranslating = translationStatus === "pending" && !currentLines;
  const isTranslationFailed = translationStatus === "failed" && !currentLines;

  const handleRetryTranslation = () => {
    store.updatePoem(poem.id, {
      translationStatus: {
        ...poem.translationStatus,
        [script]: "pending",
      },
    });
    toast("Retrying literary translation...");
    triggerAutoTranslation(poem.id, canonicalLines, canonicalScript, (updates) => {
      store.updatePoem(poem.id, updates);
    });
  };

  const meaningWords = detectLughat(currentLines || canonicalLines, 4);
  const showEnglish = script !== "english" && poem.english.length > 0;
  const canShowMeaning = showEnglish || meaningWords.length > 0;
  const isMidnight = surface === "midnight";

  const quickDownload = async () => {
    setMenu(false);
    setQuickDownloading(true);
    try {
      // Loaded on demand so the card renderer never enters the entry chunk.
      const { renderCardBlob, downloadBlob } = await import("@/lib/card-render");
      const theme =
        surface === "midnight"
          ? "Midnight Sanctuary"
          : surface === "cashmere"
            ? "Warm Cashmere"
            : "Pure White Editorial";
      const blob = await renderCardBlob({
        lines: currentLines || canonicalLines,
        script: displayScript,
        penName: poem.takhallus,
        id: poetId(poem.takhallus),
        theme,
        ratio: "9:16 Story",
      });
      downloadBlob(blob, `ek-khwaab-${getPoemSlug(poem)}-9x16.png`);
      toast.success("✓ 9:16 Story Card downloaded!");
    } catch {
      toast.error("Could not prepare the story card. Try Card Studio.");
    } finally {
      setQuickDownloading(false);
    }
  };

  const act =
    "inline-flex min-w-0 items-center justify-center gap-1 rounded-full px-1 py-2 text-[10px] font-medium text-muted-foreground transition hover:bg-muted hover:text-ink sm:gap-1.5 sm:px-2.5 sm:text-sm";
  const menuItem =
    "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-ink transition hover:bg-muted sm:text-sm";

  return (
    <article className={cn(card, "p-4 transition hover:shadow-float sm:p-6 md:p-8")}>
      {/* Card Header: Author info, ID badge, Mood & Compact Script Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="text-sm font-semibold text-ink sm:text-base">@{poem.takhallus}</span>
          <IdBadge id={poetId(poem.takhallus)} />
          <Pill tone="red">{poem.mood}</Pill>
          {isAuthor && (
            <RankBadge count={Math.max(1, store.myPoemCount)} prefix="Your Verse" />
          )}
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <ScriptSwitch value={script} onChange={setOverride} />

          {/* Secondary actions live here, never in the primary row. */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-label="More actions"
              aria-haspopup="menu"
              aria-expanded={menu}
              onClick={() => setMenu((m) => !m)}
              className="grid size-8 place-items-center rounded-full text-subtle transition hover:bg-muted hover:text-ink"
            >
              <MoreHorizontal className="size-4" />
            </button>
            {menu && (
              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-1 w-52 rounded-2xl border border-hairline bg-popover p-1.5 shadow-float"
              >
                <button
                  type="button"
                  role="menuitem"
                  disabled={quickDownloading}
                  onClick={() => void quickDownload()}
                  className={menuItem}
                >
                  {quickDownloading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Zap className="size-4 text-gold-ink" />
                  )}
                  {quickDownloading ? "Painting card…" : "Quick Download"}
                </button>
                <button type="button" role="menuitem" onClick={() => { setMenu(false); void toggleSave(); }} className={menuItem}>
                  <Bookmark className={cn("size-4", saved && "fill-current text-royal")} />
                  {saved ? "Remove from Saved Poems" : "Save Poem"}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenu(false);
                    store.set({ studio: { lines: canonicalLines, penName: poem.takhallus } });
                    nav({ to: "/letters", search: {} });
                  }}
                  className={menuItem}
                >
                  <Mail className="size-4" /> Send as Secret Letter
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setMenu(false); void sharePoem(poem, script); }}
                  className={menuItem}
                >
                  <Link2 className="size-4" /> Share Link
                </button>
                {!isCurated && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setMenu(false); setShowReportModal(true); }}
                    className={menuItem}
                  >
                    <Flag className="size-4" /> Report
                  </button>
                )}
                {isAuthor && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setMenu(false); setShowDeleteConfirm(true); }}
                    className={cn(menuItem, "text-crimson hover:bg-blush")}
                  >
                    <Trash2 className="size-4" /> Delete Verse
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Poetry Verse Reading Area */}
      <div className="py-6 sm:py-8 md:py-10">
        {isTranslating && (
          <div className="mb-3 flex items-center justify-center gap-2 text-xs text-royal">
            <Loader2 className="size-3.5 animate-spin" />
            <span>Translating verse to {script}… Showing original:</span>
          </div>
        )}

        {isTranslationFailed && (
          <div className="mb-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>Translation temporarily unavailable.</span>
            <button
              type="button"
              onClick={handleRetryTranslation}
              className="inline-flex items-center gap-1 font-semibold text-royal underline hover:text-ink"
            >
              <RotateCcw className="size-3" /> Retry
            </button>
          </div>
        )}

        <VerseFrame tone={surface}>
          {seal > 0 && (
            <span key={seal} aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
              <span className="seal-bloom grid size-20 place-items-center rounded-full bg-seal font-serif text-2xl italic text-white shadow-[inset_0_-4px_10px_rgb(0_0_0/0.35),0_10px_30px_rgb(15_23_42/0.25)] sm:size-24 sm:text-3xl">
                ek
              </span>
            </span>
          )}

          <div
            onDoubleClick={onVerseDoubleClick}
            onPointerUp={onVersePointerUp}
            title="Double-tap to appreciate"
            className="select-text"
          >
            <Verse
              lines={currentLines || canonicalLines}
              script={displayScript}
              ornament
              className={cn(isMidnight && "text-white [&_.lughat-word]:border-gold/70")}
            />
          </div>

          {canShowMeaning && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setMeaning((m) => !m)}
                aria-expanded={meaning}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-medium transition sm:text-xs",
                  meaning
                    ? "border-gold-line bg-cashmere text-gold-ink"
                    : "border-hairline bg-white/60 text-cashmere-ink hover:border-gold-line hover:text-gold-ink",
                  isMidnight && "border-gold/25 bg-white/5 text-white/70 hover:border-gold/50 hover:text-white"
                )}
              >
                <Sparkles className="size-3" />
                Meaning
              </button>
            </div>
          )}

          {meaning && canShowMeaning && (
            <div
              className={cn(
                "mt-4 rounded-xl border p-4 text-left sm:p-5",
                isMidnight ? "border-gold/25 bg-white/5" : "border-gold-line/70 bg-white/60"
              )}
            >
              {showEnglish && (
                <div>
                  <p className={cn("font-mono text-[10px] uppercase tracking-[0.18em]", isMidnight ? "text-gold" : "text-gold-ink")}>
                    English meaning
                  </p>
                  <div
                    className={cn(
                      "mt-2 font-serif text-sm italic leading-relaxed sm:text-base",
                      isMidnight ? "text-white/85" : "text-ink/85"
                    )}
                  >
                    {poem.english.map((l, i) => (
                      <p key={i}>{l}</p>
                    ))}
                  </div>
                </div>
              )}
              {meaningWords.length > 0 && (
                <div className={cn(showEnglish && "mt-4 border-t pt-3", showEnglish && (isMidnight ? "border-gold/20" : "border-gold-line/60"))}>
                  <p className={cn("font-mono text-[10px] uppercase tracking-[0.18em]", isMidnight ? "text-gold" : "text-gold-ink")}>
                    Lughat in this verse
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {meaningWords.map((w) => (
                      <Link
                        key={w.roman}
                        to="/dictionary/$word"
                        params={{ word: getWordSlug(w) }}
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 font-serif text-[11px] italic transition",
                          isMidnight
                            ? "border-gold/30 text-white/80 hover:border-gold hover:text-white"
                            : "border-gold-line bg-cashmere text-cashmere-ink hover:bg-cashmere-hover hover:text-gold-ink"
                        )}
                      >
                        {w.roman}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Three surface dots repaint only this reading panel. */}
          <div className="mt-5 flex items-center justify-end gap-1.5">
            <span className="sr-only">Verse background</span>
            {SURFACES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSurface(s.id)}
                aria-label={`${s.label} background`}
                aria-pressed={surface === s.id}
                className="grid size-6 place-items-center rounded-full transition hover:bg-black/5"
              >
                <span
                  className={cn(
                    "size-3 rounded-full border transition",
                    surface === s.id && "ring-2 ring-gold-ink/60 ring-offset-1"
                  )}
                  style={{ backgroundColor: s.bg, borderColor: s.border }}
                />
              </button>
            ))}
          </div>
        </VerseFrame>

        <div className="mt-3 text-center">
          <Link
            to="/poetry/$slug"
            params={{ slug: getPoemSlug(poem) }}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-subtle transition hover:text-ink sm:text-xs"
          >
            Read full verse <ArrowRight className="size-3" />
          </Link>
        </div>

        {/* Hashtags below verses (NOT drawn on canvas/downloads) */}
        {poem.tags && poem.tags.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
            {poem.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() =>
                  nav({ to: "/feed", search: { q: tag.replace(/^#/, "") } })
                }
                className="cursor-pointer rounded-md border border-gold-line bg-cashmere px-2.5 py-0.5 font-serif text-xs italic text-cashmere-ink transition hover:bg-cashmere-hover"
              >
                {tag.startsWith("#") ? tag : `#${tag}`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Four primary actions only. Everything else lives in •••. */}
      <div className="grid grid-cols-4 items-center gap-0.5 border-t border-hairline pt-2 sm:gap-1 sm:pt-3">
        <button
          type="button"
          aria-label={daad > 0 ? `Appreciate verse, ${daad} appreciations` : "Appreciate verse"}
          onClick={toggleLike}
          className={cn(act, liked && "font-semibold text-crimson hover:text-crimson")}
        >
          <Heart key={ripple} className={cn("ink-ripple size-3.5 shrink-0 sm:size-4", liked && "fill-current")} />
          <span className="truncate">{daad > 0 ? daad : "Appreciate"}</span>
        </button>

        <button
          type="button"
          aria-label={commentCount > 0 ? `Comments, ${commentLabel}` : "Comment"}
          onClick={openComments}
          className={act}
        >
          <MessageCircle className="size-3.5 shrink-0 sm:size-4" />
          <span className="truncate">{commentLabel}</span>
        </button>

        <button
          type="button"
          aria-label="Copy shayari to clipboard"
          onClick={() => void copyPoem(poem, script)}
          className={act}
        >
          <Copy className="size-3.5 shrink-0 sm:size-4" />
          <span className="truncate">Copy</span>
        </button>

        <button
          type="button"
          title="Open in Card Studio"
          aria-label="Create a card from this verse"
          onClick={toStudio}
          className={act}
        >
          <Palette className="size-3.5 shrink-0 sm:size-4" />
          <span className="truncate">Create Card</span>
        </button>
      </div>

      {/* Comments — shared with the poem detail page. */}
      <CommentDrawer
        open={drawer}
        onClose={() => setDrawer(false)}
        poem={poem}
        isCurated={isCurated}
        onCommentsChange={(next) => {
          store.updatePoem(poem.id, { hashiya: next });
          patchFeedPoem(qc, poem.id, { hashiya: next });
        }}
        onRequestSignIn={() => promptSignIn("comment")}
      />

      {/* Author Delete Confirmation Modal */}
      <Modal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete this verse?"
        tone="danger"
        description="This permanently removes the poem and its appreciations. This cannot be undone."
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowDeleteConfirm(false)} className={btnOutline}>
              Cancel
            </button>
            <button onClick={() => void handleDeletePoem()} className={cn(btnPrimary, "bg-crimson hover:bg-crimson/90")}>
              Confirm Delete
            </button>
          </div>
        }
      >
        <div className="flex items-center gap-3 rounded-2xl bg-blush/60 p-4 text-xs text-crimson">
          <AlertTriangle className="size-4 shrink-0" />
          <span>Readers will no longer find this verse in the feed.</span>
        </div>
      </Modal>

      {/* Community Moderation Report Modal */}
      <Modal
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="Report this verse"
        description="Help us keep Ek Khwaab a safe, anonymous place to read."
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowReportModal(false)} className={btnOutline}>
              Cancel
            </button>
            <button type="submit" form="report-poem-form" disabled={submittingReport} className={btnPrimary}>
              {submittingReport ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        }
      >
        <form id="report-poem-form" onSubmit={handleReportPoem} className="space-y-4">
          <div>
            <label className={label} htmlFor="report-reason">
              Reason for report
            </label>
            <select
              id="report-reason"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className={cn(input, "text-sm")}
            >
              <option value="Contains real personal identity info">Reveals real personal info / doxxing</option>
              <option value="Hateful or abusive content">Hateful or abusive content</option>
              <option value="Plagiarism without attribution">Plagiarism / copied work</option>
              <option value="Spam or promotional material">Spam or advertising</option>
            </select>
          </div>
        </form>
      </Modal>
    </article>
  );
}
