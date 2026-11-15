import { useEffect, useRef, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { poetId, type Poem } from "@/data/poems";
import { useStore } from "@/lib/store";
import { addPoemComment, deletePoemComment } from "@/lib/poems.service";
import {
  QUICK_REPLIES,
  formatComment,
  isCoupletComment,
  toCouplet,
} from "@/lib/comment-format";
import { IdBadge, btnPrimary, btnOutline, input } from "./kit";
import { Modal } from "./Modal";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  poem: Poem;
  isCurated: boolean;
  /** Detail pages pass a freshly fetched list; cards read poem.hashiya. */
  comments?: Poem["hashiya"] | undefined;
  onCommentsChange?: ((next: Poem["hashiya"]) => void) | undefined;
  onRequestSignIn: () => void;
};

export function CommentDrawer({
  open,
  onClose,
  poem,
  isCurated,
  comments,
  onCommentsChange,
  onRequestSignIn,
}: Props) {
  const { user } = useStore();
  const me = user;
  const canWrite = Boolean(me && !me.guest);
  const list = comments ?? poem.hashiya;
  const [reply, setReply] = useState("");
  const [couplet, setCouplet] = useState(false);
  const [posting, setPosting] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) {
      setReply("");
      setCouplet(false);
    }
  }, [open]);

  const insertReply = (text: string) => {
    const el = areaRef.current;
    const start = el?.selectionStart ?? reply.length;
    const end = el?.selectionEnd ?? reply.length;
    const before = reply.slice(0, start);
    const after = reply.slice(end);
    const pad = before && !/\s$/.test(before) ? " " : "";
    const insert = `${pad}${text}${after ? "" : " "}`;
    const next = (before + insert + after).slice(0, 600);
    setReply(next);
    requestAnimationFrame(() => {
      el?.focus();
      const caret = Math.min(600, start + insert.length);
      el?.setSelectionRange(caret, caret);
    });
  };

  const preview = couplet ? toCouplet(reply) : [];

  const post = async () => {
    if (isCurated || !reply.trim() || posting) return;
    if (!canWrite || !me) {
      onRequestSignIn();
      return;
    }
    const body = formatComment(reply, couplet);
    if (!body) return;
    setPosting(true);
    try {
      const res = await addPoemComment(poem.id, me.poetId, body);
      if (!res.success) {
        toast.error(res.error || "Could not submit comment.");
        return;
      }
      const next = [
        ...list,
        { by: me.penName, text: body, ...(res.commentId ? { id: res.commentId } : {}) },
      ];
      onCommentsChange?.(next);
      setReply("");
      setCouplet(false);
      toast.success("Comment added");
    } finally {
      setPosting(false);
    }
  };

  const remove = async (comment: Poem["hashiya"][number], index: number) => {
    if (isCurated || !me) return;
    if (comment.id) {
      const res = await deletePoemComment(comment.id, me.poetId);
      if (!res.success) {
        toast.error(res.error || "Could not delete the comment.");
        return;
      }
    }
    onCommentsChange?.(list.filter((_, i) => i !== index));
    toast("Comment removed");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Comments"
      description="Everyone appears only by pen name and poet ID. A two-line reply becomes a Jawaabi Sher."
      maxWidth="max-w-lg"
      footer={
        isCurated ? (
          <p className="rounded-xl bg-secondary p-3 text-xs leading-relaxed text-muted-foreground">
            This is a curated verse from the archive, so comments are closed. Poems published in the
            live feed are open for conversation.
          </p>
        ) : !canWrite ? (
          <button type="button" onClick={onRequestSignIn} className={cn(btnOutline, "w-full py-2.5")}>
            Sign in to join the conversation
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {QUICK_REPLIES.map((chip) => (
                <button
                  key={chip.text}
                  type="button"
                  onClick={() => insertReply(chip.text)}
                  className="shrink-0 rounded-full border border-gold-line bg-cashmere px-2.5 py-1 text-[11px] font-medium text-cashmere-ink transition hover:bg-cashmere-hover hover:text-gold-ink"
                >
                  <span aria-hidden="true">{chip.emoji}</span> {chip.text}
                </button>
              ))}
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={couplet}
              onClick={() => setCouplet((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition",
                couplet
                  ? "border-gold-line bg-cashmere text-gold-ink"
                  : "border-hairline text-muted-foreground hover:border-gold-line hover:text-gold-ink"
              )}
            >
              <span aria-hidden="true">✒️</span>
              Format as 2-line couplet
              <span className="text-[10px] opacity-70">(Jawaabi Sher)</span>
            </button>

            {couplet && reply.trim() && (
              <div className="rounded-xl border border-gold-line/70 bg-cashmere/60 px-3 py-2.5 text-center">
                <span className="inline-block rounded-full border border-gold-line bg-white/70 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-gold-ink">
                  Jawaabi Sher
                </span>
                <div className="mt-1.5 font-serif text-sm italic leading-relaxed text-ink">
                  {preview.map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
                {preview.length < 2 && (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    A few more words will complete the couplet.
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <textarea
                ref={areaRef}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Write a comment or a reply couplet…"
                className={cn(input, "min-h-[44px] resize-none py-2.5")}
                rows={2}
                maxLength={600}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !couplet) {
                    e.preventDefault();
                    void post();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => void post()}
                disabled={posting || !reply.trim()}
                className={cn(btnPrimary, "self-stretch px-4")}
              >
                {posting ? <Loader2 className="size-4 animate-spin" /> : "Post"}
              </button>
            </div>
          </div>
        )
      }
    >
      <div className="max-h-[42vh] space-y-4 overflow-y-auto pr-1">
        {list.map((h, i) => {
          const asSher = isCoupletComment(h.text);
          return (
            <div key={h.id ?? i} className="group relative rounded-xl p-2 transition hover:bg-secondary/50">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold text-ink">@{h.by}</span>
                  <IdBadge id={h.by === me?.penName ? me.poetId : poetId(h.by)} />
                </div>
                {canWrite && me && h.by === me.penName && (
                  <button
                    type="button"
                    title="Delete comment"
                    aria-label="Delete comment"
                    onClick={() => void remove(h, i)}
                    className="rounded p-1 text-subtle hover:text-crimson"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
              {asSher ? (
                <div className="mt-2 rounded-xl border border-gold-line/70 bg-cashmere/60 px-3 py-3 text-center">
                  <span className="inline-block rounded-full border border-gold-line bg-white/70 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-gold-ink">
                    Jawaabi Sher
                  </span>
                  <div className="mt-2 font-serif text-sm italic leading-relaxed text-ink sm:text-base">
                    {h.text
                      .split("\n")
                      .filter((l) => l.trim())
                      .map((line, j) => (
                        <p key={j}>{line}</p>
                      ))}
                  </div>
                </div>
              ) : (
                <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{h.text}</p>
              )}
            </div>
          );
        })}
        {!list.length && (
          <p className="py-6 text-center text-sm text-subtle">
            {isCurated
              ? "No comments on this archived verse."
              : "No comments yet. Be the first to respond to this verse."}
          </p>
        )}
      </div>
    </Modal>
  );
}
