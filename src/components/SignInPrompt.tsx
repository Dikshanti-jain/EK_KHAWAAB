import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Feather, Heart, MessageCircle, PenLine, Bookmark, Lock } from "lucide-react";
import { Modal } from "./Modal";
import { btnOutline, btnPrimary } from "./kit";
import { cn } from "@/lib/utils";

type Reason = "appreciate" | "comment" | "save" | "write" | "listen";

const COPY: Record<Reason, { title: string; body: string; icon: typeof Heart }> = {
  appreciate: {
    title: "Sign in to appreciate this verse",
    body: "Appreciations are real here. Sign in so your appreciation reaches the poet — you'll come right back to this poem.",
    icon: Heart,
  },
  comment: {
    title: "Sign in to join the conversation",
    body: "Comments appear under your pen name only. Sign in to leave one, and you'll return to the same poem.",
    icon: MessageCircle,
  },
  save: {
    title: "Sign in to save this poem",
    body: "Saved poems live in your private collection. Sign in to keep this one — we'll bring you back.",
    icon: Bookmark,
  },
  write: {
    title: "Sign in to publish your verse",
    body: "Your real name stays private. Choose a pen name and your words appear under it — nothing else.",
    icon: PenLine,
  },
  listen: {
    title: "Sign in to open a listening room",
    body: "Rooms hold two people and nothing is recorded. Sign in to take a seat.",
    icon: Feather,
  },
};

const Ctx = createContext<{ promptSignIn: (reason?: Reason) => void } | null>(null);

export function SignInPromptProvider({ children }: { children: ReactNode }) {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason>("appreciate");

  const promptSignIn = useCallback((next: Reason = "appreciate") => {
    setReason(next);
    setOpen(true);
    try {
      // Remember where the visitor was so auth can return them here.
      const path = window.location.pathname + window.location.search;
      if (path.startsWith("/") && !path.startsWith("/auth")) {
        sessionStorage.setItem("ek_return_to", path);
      }
    } catch {
      // private mode: the return path is a nicety, not a requirement
    }
  }, []);

  const go = (mode: "signin" | "signup") => {
    setOpen(false);
    let next: string | undefined;
    try {
      next = sessionStorage.getItem("ek_return_to") || undefined;
    } catch {
      next = undefined;
    }
    nav({ to: "/auth", search: next ? { mode, next } : { mode } });
  };

  const value = useMemo(() => ({ promptSignIn }), [promptSignIn]);
  const c = COPY[reason];
  const Icon = c.icon;

  return (
    <Ctx.Provider value={value}>
      {children}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={c.title}
        description={c.body}
        footer={
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => go("signin")} className={cn(btnPrimary, "flex-1 py-2.5")}>
              Sign In
            </button>
            <button type="button" onClick={() => go("signup")} className={cn(btnOutline, "flex-1 py-2.5")}>
              Create a Pen Name
            </button>
          </div>
        }
      >
        <div className="flex items-center gap-3 rounded-2xl bg-secondary p-4 text-xs leading-relaxed text-muted-foreground">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-wash text-royal">
            <Icon className="size-4" />
          </span>
          <span className="flex items-center gap-1.5">
            <Lock className="size-3.5 shrink-0 text-subtle" />
            Only your pen name and #EK-ID are ever public.
          </span>
        </div>
      </Modal>
    </Ctx.Provider>
  );
}

export function useSignInPrompt() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSignInPrompt must be used inside SignInPromptProvider");
  return ctx;
}
