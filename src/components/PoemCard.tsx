import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bookmark, Heart, MessageCircle, Palette, Mail, X, Trash2, Flag, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { poetId, type Poem, type Script } from "@/data/poems";
import { useStore } from "@/lib/store";
import { togglePoemLike, togglePoemBookmark, addPoemComment, deletePoem } from "@/lib/poems.service";
import { IdBadge, Pill, ScriptSwitch, Verse, card, input, btnPrimary, btnOutline } from "./kit";
import { cn } from "@/lib/utils";

export function PoemCard({ poem, globalScript }: { poem: Poem; globalScript: Script }) {
  const store = useStore();
  const nav = useNavigate();
  const [override, setOverride] = useState<Script | null>(null);
  const [meaning, setMeaning] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [reply, setReply] = useState("");
  const [ripple, setRipple] = useState(0);

  // Author Deletion & Moderation Report States
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("Contains real personal identity info");

  const script = override ?? globalScript;
  const liked = store.liked.includes(poem.id);
  const saved = store.saved.includes(poem.id);
  const me = store.user;
  const isAuthor = Boolean(me && me.penName === poem.takhallus);

  const toggle = (k: "liked" | "saved") => {
    const userUid = me?.poetId || "#EK-7492";
    if (k === "liked") {
      togglePoemLike(poem.id, userUid, liked);
    } else {
      togglePoemBookmark(poem.id, userUid, saved);
    }
    store.set((s) => ({ [k]: s[k].includes(poem.id) ? s[k].filter((x) => x !== poem.id) : [...s[k], poem.id] }));
  };

  const addReply = () => {
    if (!reply.trim()) return;
    const replyText = reply.trim();
    const byName = store.user?.penName ?? "Guest_Reader";
    const userUid = store.user?.poetId || "#EK-7492";
    addPoemComment(poem.id, userUid, replyText);
    store.set((s) => ({
      poems: s.poems.map((p) =>
        p.id === poem.id ? { ...p, hashiya: [...p.hashiya, { by: byName, text: replyText }] } : p
      ),
    }));
    setReply("");
  };

  const deleteComment = (commentIdx: number) => {
    store.set((s) => ({
      poems: s.poems.map((p) =>
        p.id === poem.id ? { ...p, hashiya: p.hashiya.filter((_, idx) => idx !== commentIdx) } : p
      ),
    }));
    toast("Comment removed");
  };

  const handleDeletePoem = async () => {
    const userUid = me?.poetId || "#EK-7492";
    await deletePoem(poem.id, userUid);
    store.set((s) => ({
      poems: s.poems.filter((p) => p.id !== poem.id),
      saved: s.saved.filter((id) => id !== poem.id),
      liked: s.liked.filter((id) => id !== poem.id),
    }));
    setShowDeleteConfirm(false);
    toast.success("Verse removed from the Mehfil");
  };

  const handleReportPoem = (e: React.FormEvent) => {
    e.preventDefault();
    setShowReportModal(false);
    toast.success("Thank you. This verse has been flagged for editorial review.");
  };

  const toStudio = () => {
    store.set({ studio: { lines: poem[script], penName: poem.takhallus } });
    nav({ to: "/studio" });
  };

  const act = "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-ink";

  return (
    <article className={cn(card, "p-8 transition hover:shadow-float")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-ink">@{poem.takhallus}</span>
        <IdBadge id={poetId(poem.takhallus)} />
        <Pill tone="red">{poem.mood}</Pill>
        {isAuthor && (
          <span className="rounded-full bg-wash px-2.5 py-0.5 text-xs font-semibold text-royal">
            Your Verse
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {isAuthor && (
            <button
              title="Delete your poem"
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-full p-1.5 text-subtle transition hover:bg-blush hover:text-crimson"
            >
              <Trash2 className="size-4" />
            </button>
          )}
          <ScriptSwitch value={script} onChange={setOverride} meaning={meaning} onMeaning={() => setMeaning(!meaning)} />
        </div>
      </div>

      <div className="py-10">
        <Verse lines={poem[script]} script={script} />
        {meaning && (
          <div className="mx-auto mt-6 max-w-lg text-center text-muted-foreground">
            {poem.english.map((l, i) => (
              <p key={i}>{l}</p>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1 border-t border-hairline pt-4">
        <button
          onClick={() => {
            toggle("liked");
            setRipple((r) => r + 1);
          }}
          className={cn(act, liked && "text-crimson hover:text-crimson")}
        >
          <Heart key={ripple} className={cn("ink-ripple size-4", liked && "fill-current")} /> Appreciate ({poem.daad + (liked ? 1 : 0)})
        </button>
        <button onClick={() => setDrawer(true)} className={act}>
          <MessageCircle className="size-4" /> Comments ({poem.hashiya.length})
        </button>
        <button
          onClick={() => {
            toggle("saved");
            toast(saved ? "Removed from your collection" : "Saved to your collection");
          }}
          className={cn(act, saved && "text-royal hover:text-royal")}
        >
          <Bookmark className={cn("size-4", saved && "fill-current")} /> Save
        </button>
        <button onClick={toStudio} className={act}>
          <Palette className="size-4" /> Open in Card Studio
        </button>
        <button
          onClick={() => {
            store.set({ studio: { lines: poem.hinglish, penName: poem.takhallus } });
            nav({ to: "/letters", search: {} as any });
          }}
          className={act}
        >
          <Mail className="size-4" /> Send as Secret Letter
        </button>
        <button
          title="Report inappropriate content"
          onClick={() => setShowReportModal(true)}
          className="ml-auto rounded-full p-2 text-subtle hover:bg-muted hover:text-ink"
        >
          <Flag className="size-3.5" />
        </button>
      </div>

      {/* Comments Drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-ink/20" onClick={() => setDrawer(false)}>
          <aside onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-md flex-col bg-background p-8 shadow-float">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-semibold">Comments</h3>
              <button aria-label="Close comments" onClick={() => setDrawer(false)} className="rounded-full p-2 hover:bg-muted">
                <X className="size-5" />
              </button>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Everyone appears only by pen name and poet ID.</p>
            <div className="mt-6 flex-1 space-y-5 overflow-y-auto">
              {poem.hashiya.map((h, i) => (
                <div key={i} className="group relative rounded-xl p-2 transition hover:bg-secondary/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold text-ink">@{h.by}</span>
                      <IdBadge id={h.by === me?.penName ? me.poetId : poetId(h.by)} />
                    </div>
                    {me && h.by === me.penName && (
                      <button
                        title="Delete comment"
                        onClick={() => deleteComment(i)}
                        className="rounded p-1 text-subtle hover:text-crimson"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{h.text}</p>
                </div>
              ))}
              {!poem.hashiya.length && <p className="text-sm text-subtle">No comments yet. Be the first to appreciate this verse.</p>}
            </div>
            <div className="mt-4 flex gap-2">
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Write a comment or a reply couplet…"
                className={input}
                onKeyDown={(e) => e.key === "Enter" && addReply()}
              />
              <button onClick={addReply} className={btnPrimary}>Post</button>
            </div>
          </aside>
        </div>
      )}

      {/* Author Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4 backdrop-blur-sm"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border border-hairline bg-background p-8 shadow-float">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-full bg-blush text-crimson">
                <AlertTriangle className="size-5" />
              </div>
              <h3 className="text-xl font-semibold text-ink">Delete this Verse?</h3>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              This will permanently remove this poem and its appreciations from the Mehfil feed. This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className={btnOutline}>
                Cancel
              </button>
              <button onClick={handleDeletePoem} className={cn(btnPrimary, "bg-crimson hover:bg-crimson/90")}>
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Community Moderation Report Modal */}
      {showReportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4 backdrop-blur-sm"
          onClick={() => setShowReportModal(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border border-hairline bg-background p-8 shadow-float">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-ink">Report Verse to Editorial</h3>
              <button onClick={() => setShowReportModal(false)} className="rounded-full p-1 text-subtle hover:text-ink">
                <X className="size-5" />
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Help us maintain the safe, anonymous literary atmosphere of Ek Khawaab.
            </p>
            <form onSubmit={handleReportPoem} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-subtle">Reason for Report</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className={cn(input, "mt-1 text-sm")}
                >
                  <option value="Contains real personal identity info">Reveals real personal info / doxxing</option>
                  <option value="Hateful or abusive content">Hateful or abusive content</option>
                  <option value="Plagiarism without attribution">Plagiarism / copied work</option>
                  <option value="Spam or promotional material">Spam or advertising</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowReportModal(false)} className={btnOutline}>
                  Cancel
                </button>
                <button type="submit" className={btnPrimary}>
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </article>
  );
}
