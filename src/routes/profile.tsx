import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, LogOut, ShieldCheck, KeyRound, CheckCircle2, Bookmark, Feather, Mail, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { updateVaultPassword, signOut, updatePublicTakhallus } from "@/lib/auth.service";
import { fetchMySavedPoems } from "@/lib/poems.service";
import { PoemCard } from "@/components/PoemCard";
import { IdBadge, btnOutline, btnPrimary, card, input, label } from "@/components/kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — Ek Khwaab" },
      { name: "description", content: "Your public poet profile, saved poems and privacy settings." },
      { property: "og:title", content: "My Profile — Ek Khwaab" },
      { property: "og:description", content: "Your pen name, poems and privacy settings." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const s = useStore();
  const nav = useNavigate();
  const [tab, setTab] = useState<"public" | "saved" | "privacy">("public");
  const u = s.user;

  // Change Password state
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdChanged, setPwdChanged] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  // Pen Name Customization state
  const [penDraft, setPenDraft] = useState(u?.penName || "");
  const [penLoading, setPenLoading] = useState(false);

  // Live bookmarks: the feed's saved poems live in Supabase, not in the seed
  // store, so hydrate them once per signed-in reader.
  const [savedFromDb, setSavedFromDb] = useState<Awaited<ReturnType<typeof fetchMySavedPoems>>["poems"]>([]);

  useEffect(() => {
    if (!u || u.guest) return;
    let active = true;
    void fetchMySavedPoems(u.poetId).then(({ poems, error }) => {
      if (!active || error) return;
      setSavedFromDb(poems);
      if (poems.length) {
        s.set((st) => ({
          saved: Array.from(new Set([...st.saved, ...poems.map((p) => p.id)])),
        }));
      }
    });
    return () => {
      active = false;
    };
  }, [u, s.set]);

  if (!u) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-wash text-royal">
          <Feather className="size-8" />
        </div>
        <h1 className="mt-6 text-4xl font-semibold text-ink">Your profile lives behind a pen name</h1>
        <p className="mt-3 text-muted-foreground">
          Create an anonymous pen name and #EK-ID to start publishing couplets, saving poems, and sealing secret letters.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/auth" search={{ mode: "signup" }} className={cn(btnPrimary, "px-7 py-3")}>
            Create Pen Name (Get Started)
          </Link>
          <Link to="/auth" search={{ mode: "signin" }} className={cn(btnOutline, "px-7 py-3")}>
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const mine = s.poems.filter((p) => p.takhallus === u.penName);
  const savedLocal = s.poems.filter((p) => s.saved.includes(p.id));
  const saved = [
    ...savedFromDb.filter((p) => s.saved.includes(p.id)),
    ...savedLocal.filter((p) => !savedFromDb.some((q) => q.id === p.id)),
  ];
  const appreciations = mine.reduce((a, p) => a + p.daad, 0);
  const mask = (v?: string | null) => (v ? v.slice(0, 2) + "•".repeat(Math.max(3, v.length - 4)) + v.slice(-2) : "—");

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    if (newPwd !== confirmPwd) {
      toast.error("New password and confirm password do not match.");
      return;
    }
    setPwdLoading(true);
    try {
      const res = await updateVaultPassword(newPwd);
      if (res.success) {
        setPwdChanged(true);
        setCurrentPwd("");
        setNewPwd("");
        setConfirmPwd("");
        toast.success("Password updated successfully!");
      } else {
        toast.error(res.error || "Could not update your password.");
      }
    } finally {
      setPwdLoading(false);
    }
  };

  const handleUpdatePenName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = penDraft.trim();
    if (!trimmed) {
      toast.error("Pen name cannot be empty.");
      return;
    }
    if (trimmed.length < 2 || trimmed.length > 30) {
      toast.error("Pen name must be between 2 and 30 characters.");
      return;
    }
    if (trimmed === u.penName) {
      toast("Pen name is already @" + trimmed);
      return;
    }

    setPenLoading(true);
    try {
      const res = await updatePublicTakhallus(trimmed);
      if (res.success) {
        s.set({
          user: {
            ...u,
            penName: trimmed,
          },
          poems: s.poems.map((p) => (p.takhallus === u.penName ? { ...p, takhallus: trimmed } : p)),
        });
        toast.success(`Public pen name changed to @${trimmed}`);
      } else {
        toast.error(res.error || "Failed to update pen name.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update pen name.");
    } finally {
      setPenLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-3.5 py-6 sm:px-6 md:px-12 md:py-14">
      {/* Header Profile Card */}
      <div className={cn(card, "flex flex-wrap items-center gap-4 p-4 sm:p-6 md:p-8")}>
        <div className="grid size-14 place-items-center rounded-full bg-wash font-serif text-2xl font-bold text-royal shadow-sm sm:size-20 sm:text-3xl">
          {u.penName[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-2xl font-semibold text-ink sm:text-3xl">@{u.penName}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <IdBadge id={u.poetId} />
            <span className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-[11px] text-muted-foreground sm:text-xs">
              <ShieldCheck className="size-3.5 text-royal" /> Your real identity stays private
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-center sm:gap-6 md:gap-8">
          <div>
            <p className="font-serif text-2xl font-bold text-ink sm:text-3xl">{appreciations}</p>
            <p className="text-[11px] text-subtle sm:text-xs">Appreciations</p>
          </div>
          <div>
            <p className="font-serif text-2xl font-bold text-ink sm:text-3xl">{mine.length}</p>
            <p className="text-[11px] text-subtle sm:text-xs">Published</p>
          </div>
          <div>
            <p className="font-serif text-2xl font-bold text-ink sm:text-3xl">{saved.length}</p>
            <p className="text-[11px] text-subtle sm:text-xs">Saved</p>
          </div>
          <div>
            <p className="font-serif text-2xl font-bold text-ink sm:text-3xl">{s.letters.length}</p>
            <p className="text-[11px] text-subtle sm:text-xs">Letters</p>
          </div>
        </div>
      </div>

      {/* Responsive Segmented Tabs */}
      <div className="my-6 sm:my-8 flex max-w-full rounded-full bg-muted/90 p-1 text-xs sm:text-sm font-medium">
        {(
          [
            ["public", "My Verses", "Public Poet Profile"],
            ["saved", "Saved", "Saved Poems"],
            ["privacy", "Privacy", "Privacy & Settings"],
          ] as const
        ).map(([k, shortLabel, longLabel]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={cn(
              "flex-1 rounded-full px-2.5 py-1.5 transition text-center whitespace-nowrap sm:px-4 sm:py-2",
              tab === k ? "bg-background font-semibold text-ink shadow-sm" : "text-muted-foreground hover:text-ink"
            )}
          >
            <span className="sm:hidden">{shortLabel}</span>
            <span className="hidden sm:inline">{longLabel}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: Public Poet Profile */}
      {tab === "public" && (
        <div className="mx-auto max-w-3xl space-y-4 sm:space-y-6">
          <div className="rounded-2xl border border-hairline bg-secondary/50 p-4 text-xs text-muted-foreground">
            <b>How readers see you:</b> your pen name <b>@{u.penName}</b>, poet ID <b>{u.poetId}</b>, and
            your published verses. Nothing else.
          </div>
          {mine.map((p) => (
            <PoemCard key={p.id} poem={p} globalScript={s.script} />
          ))}
          {!mine.length && (
            <div className={cn(card, "p-12 text-center")}>
              <p className="font-serif text-xl italic text-ink">"Khamosh qalam, naya safar..."</p>
              <p className="mt-2 text-sm text-muted-foreground">You have not posted any poems yet.</p>
              <div className="mt-6 flex justify-center gap-3">
                <Link to="/feed" className={btnPrimary}>
                  Write a Poem on Feed
                </Link>
                <Link to="/ai-poet" className={btnOutline}>
                  Co-Write with AI Poet
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Saved Poems */}
      {tab === "saved" && (
        <div className="mx-auto max-w-3xl space-y-6">
          <p className="text-sm text-muted-foreground">
            Verses you've kept for a slower evening.
          </p>
          {saved.map((p) => (
            <PoemCard key={p.id} poem={p} globalScript={s.script} />
          ))}
          {!saved.length && (
            <div className={cn(card, "px-6 py-16 text-center")}>
              <Bookmark className="mx-auto size-10 text-subtle" />
              <p className="mt-4 font-serif text-xl text-ink">You haven't saved any verses yet</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Tap the <b>•••</b> menu on any poem, then <b>Save Poem</b>. It will wait for you here.
              </p>
              <Link to="/feed" className={cn(btnPrimary, "mt-6")}>
                Explore Trending Shayari
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Privacy & Settings */}
      {tab === "privacy" && (
        <div className="mx-auto max-w-2xl space-y-8">
          {/* Private details */}
          <div className={cn(card, "p-8 md:p-10")}>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-1.5 text-xs font-semibold text-primary-foreground">
                <Lock className="size-3.5" /> Private details
              </span>
              <span className="font-mono text-xs text-subtle">{u.poetId}</span>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Only you can see this. Readers never see your name, email or phone — just your pen name.
            </p>

            <dl className="mt-6 divide-y divide-hairline">
              {[
                ["Full name (optional)", u.fullName || "—"],
                ["Email address", mask(u.email)],
                ["Phone number (optional)", mask(u.phone)],
                ["Public pen name", `@${u.penName}`],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-3.5 text-sm">
                  <dt className="text-subtle">{k}</dt>
                  <dd className="flex items-center gap-2 font-medium text-ink">
                    {v}
                    <Lock className="size-3.5 text-subtle" />
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Update Public Pen Name Card */}
          <div className={cn(card, "p-8 md:p-10")}>
            <div className="flex items-center gap-2">
              <Feather className="size-5 text-royal" />
              <h2 className="text-xl font-semibold text-ink">Change your pen name</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              This is the name readers see. Your new pen name applies to your profile and future poems.
            </p>

            <form onSubmit={handleUpdatePenName} className="mt-6 space-y-4">
              <div>
                <label className={label}>New pen name</label>
                <div className="relative mt-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground">@</span>
                  <input
                    type="text"
                    required
                    value={penDraft}
                    onChange={(e) => setPenDraft(e.target.value)}
                    placeholder="e.g. Mirza, Sahir, Parvaaz"
                    className={cn(input, "pl-9")}
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Current: <strong className="text-ink">@{u.penName}</strong> • Poet ID: <strong className="text-ink">{u.poetId}</strong>
                </p>
              </div>

              <button disabled={penLoading || penDraft.trim() === u.penName} type="submit" className={cn(btnPrimary, "w-full py-3")}>
                {penLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="size-4 animate-spin" /> Updating...
                  </span>
                ) : (
                  "Update Pen Name"
                )}
              </button>
            </form>
          </div>

          {/* Change Password Card */}
          <div className={cn(card, "p-8 md:p-10")}>
            <div className="flex items-center gap-2">
              <KeyRound className="size-5 text-royal" />
              <h2 className="text-xl font-semibold text-ink">Change password</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose a new password for signing in on any device.
            </p>

            {pwdChanged ? (
              <div className="mt-6 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                <span className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="size-4" /> Password updated successfully.
                </span>
                <button
                  onClick={() => setPwdChanged(false)}
                  className="text-xs font-semibold underline hover:no-underline"
                >
                  Change Again
                </button>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="mt-6 space-y-4">
                <div>
                  <label className={label}>Current Password</label>
                  <input
                    type="password"
                    required
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                    placeholder="Enter current password"
                    className={input}
                  />
                </div>
                <div>
                  <label className={label}>New Password</label>
                  <input
                    type="password"
                    required
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    placeholder="At least 6 characters"
                    className={input}
                  />
                </div>
                <div>
                  <label className={label}>Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    placeholder="Re-type new password"
                    className={input}
                  />
                </div>
                <button disabled={pwdLoading} type="submit" className={cn(btnPrimary, "w-full py-3")}>
                  {pwdLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin" /> Updating...
                    </span>
                  ) : (
                    "Update Password"
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Sign Out Card */}
          <div className={cn(card, "flex items-center justify-between p-6")}>
            <div>
              <p className="font-semibold text-ink">Sign Out</p>
              <p className="text-xs text-muted-foreground">Exit your session on this device.</p>
            </div>
            <button
              onClick={async () => {
                await signOut();
                s.set({ user: null });
                nav({ to: "/" });
                toast("Signed out successfully");
              }}
              className={cn(btnOutline, "text-crimson hover:border-crimson hover:bg-blush")}
            >
              <LogOut className="size-4" /> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
