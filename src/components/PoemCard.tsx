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
} from "lucide-react";
import { toast } from "sonner";
import { poetId, getPoemSlug, isLivePoemId, type Poem, type Script } from "@/data/poems";
import { useStore } from "@/lib/store";
import { patchFeedPoem, removeFeedPoem } from "@/lib/feed-cache";
import {
  togglePoemLike,
  togglePoemBookmark,
  addPoemComment,
  deletePoemComment,
  deletePoem,
  reportContent,
} from "@/lib/poems.service";
import { triggerAutoTranslation } from "@/lib/translation.service";
import { copyPoem, sharePoem } from "@/lib/share";
import { IdBadge, Pill, ScriptSwitch, Verse, card, input, label, btnPrimary, btnOutline } from "./kit";
import { Modal } from "./Modal";
import { useSignInPrompt } from "./SignInPrompt";
import { cn } from "@/lib/utils";

export function PoemCard({ poem, globalScript }: { poem: Poem; globalScript: Script }) {
  const store = useStore();
  const qc = useQueryClient();
  const nav = useNavigate();
  const { promptSignIn } = useSignInPrompt();
  const [override, setOverride] = useState<Script | null>(null);
  const [meaning, setMeaning] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [reply, setReply] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [ripple, setRipple] = useState(0);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const openComments = () => {
    if (!canWrite) {
      promptSignIn("comment");
      return;
    }
    setDrawer(true);
  };

  const addReply = async () => {
    if (isCurated || !reply.trim() || postingComment) return;
    if (!canWrite || !me) {
      promptSignIn("comment");
      return;
    }
    const replyText = reply.trim();
    const byName = me.penName;
    setPostingComment(true);
    try {
      const res = await addPoemComment(poem.id, me.poetId, replyText);
      if (!res.success) {
        toast.error(res.error || "Could not submit comment.");
        return;
      }
      const next = [
        ...poem.hashiya,
        { by: byName, text: replyText, ...(res.commentId ? { id: res.commentId } : {}) },
      ];
      store.updatePoem(poem.id, { hashiya: next });
      patchFeedPoem(qc, poem.id, { hashiya: next });
      setReply("");
      toast.success("Comment added");
    } finally {
      setPostingComment(false);
    }
  };

  const deleteComment = async (comment: Poem["hashiya"][number], index: number) => {
    if (isCurated || !me) return;
    if (comment.id) {
      const res = await deletePoemComment(comment.id, me.poetId);
      if (!res.success) {
        toast.error(res.error || "Could not delete the comment.");
        return;
      }
    }
    const next = poem.hashiya.filter((_, i) => i !== index);
    store.updatePoem(poem.id, { hashiya: next });
    patchFeedPoem(qc, poem.id, { hashiya: next });
    toast("Comment removed");
  };

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
            <span className="rounded-full bg-wash px-2 py-0.5 text-[10px] font-semibold text-royal sm:text-xs">
              Your Verse
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <ScriptSwitch value={script} onChange={setOverride} meaning={meaning} onMeaning={() => setMeaning(!meaning)} />

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

        <Link
          to="/poetry/$slug"
          params={{ slug: getPoemSlug(poem) }}
          className="block transition-opacity hover:opacity-90"
          title="Read full verse, script translations and tashreeh"
        >
          <Verse lines={currentLines || canonicalLines} script={currentLines ? script : canonicalScript} />
        </Link>

        {/* English poetic meaning if toggled and not already in English */}
        {meaning && script !== "english" && poem.english && poem.english.length > 0 && (
          <div className="mx-auto mt-4 max-w-lg border-t border-hairline/70 pt-3 text-center text-xs italic text-muted-foreground sm:text-sm">
            {poem.english.map((l, i) => (
              <p key={i}>{l}</p>
            ))}
          </div>
        )}

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
                className="cursor-pointer rounded-full bg-wash/80 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-royal transition-all hover:bg-royal hover:text-white sm:text-xs"
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

      {/* Comments — a real modal: Escape, backdrop, scroll lock, 40 px close. */}
      <Modal
        open={drawer}
        onClose={() => setDrawer(false)}
        title="Comments"
        description="Everyone appears only by pen name and poet ID."
        maxWidth="max-w-lg"
        footer={
          isCurated ? (
            <p className="rounded-xl bg-secondary p-3 text-xs leading-relaxed text-muted-foreground">
              This is a curated verse from the archive, so comments are closed. Poems published in the
              live feed are open for conversation.
            </p>
          ) : (
            <div className="flex gap-2">
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Write a comment or a reply couplet…"
                className={input}
                maxLength={600}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void addReply();
                  }
                }}
              />
              <button onClick={() => void addReply()} disabled={postingComment} className={btnPrimary}>
                {postingComment ? <Loader2 className="size-4 animate-spin" /> : "Post"}
              </button>
            </div>
          )
        }
      >
        <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-1">
          {poem.hashiya.map((h, i) => (
            <div key={h.id ?? i} className="group relative rounded-xl p-2 transition hover:bg-secondary/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold text-ink">@{h.by}</span>
                  <IdBadge id={h.by === me?.penName ? me.poetId : poetId(h.by)} />
                </div>
                {canWrite && me && h.by === me.penName && (
                  <button
                    title="Delete comment"
                    aria-label="Delete comment"
                    onClick={() => void deleteComment(h, i)}
                    className="rounded p-1 text-subtle hover:text-crimson"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{h.text}</p>
            </div>
          ))}
          {!poem.hashiya.length && (
            <p className="py-6 text-center text-sm text-subtle">
              {isCurated
                ? "No comments on this archived verse."
                : "No comments yet. Be the first to respond to this verse."}
            </p>
          )}
          {!isCurated && poem.hashiya.length >= 3 && (
            <p className="pt-1 text-center text-[11px] text-subtle">
              Showing the 3 most recent comments.
            </p>
          )}
        </div>
      </Modal>

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
