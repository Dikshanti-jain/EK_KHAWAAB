import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, RefreshCw, Shuffle, Sparkles, KeyRound, Mail, CheckCircle2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useStore, randomPoetId } from "@/lib/store";
import { signUpWithVault, signInWithIdentifier, sendPasswordResetEmail } from "@/lib/auth.service";
import { IdBadge, btnOutline, btnPrimary, chip, input, label } from "@/components/kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    mode: s["mode"] === "signin" ? ("signin" as const) : ("signup" as const),
  }),
  head: () => ({
    meta: [
      { title: "Get Started — Ek Khawaab" },
      { name: "description", content: "Create a private account and choose your public pen name and poet ID." },
      { property: "og:title", content: "Get Started — Ek Khawaab" },
      { property: "og:description", content: "Your real identity stays in a private vault. Only your pen name appears." },
    ],
  }),
  component: Auth,
});

const VIBES: Record<string, (readonly [string, string])[]> = {
  "Heartbreak & Melancholy": [
    ["Harf-e-Khamosh", "Silent Word"],
    ["Dard_e_Dil", "Ache of the Heart"],
    ["Shikasta_Qalam", "Broken Pen"],
    ["Gham_Nawaz", "Keeper of Sorrow"],
    ["Ashk_e_Shab", "Tear of the Night"],
    ["Tanha_Musafir", "Lonely Traveller"],
    ["Bujha_Chiraagh", "Extinguished Lamp"],
    ["Zakhm_e_Harf", "Wound of a Letter"],
  ],
  "Romance & Love": [
    ["Qaasid-e-Khawaab", "Messenger of Dreams"],
    ["Gulab_Nama", "Letter of Roses"],
    ["Ishq_Bayaan", "Voice of Love"],
    ["Mahtab_Dil", "Moonlit Heart"],
    ["Zulf_e_Shaam", "Tresses of Dusk"],
    ["Rooh_e_Wafa", "Soul of Devotion"],
    ["Shabnam_Lab", "Dew-kissed Lips"],
    ["Khat_Wala", "The Letter Writer"],
  ],
  "Late Night Solitude": [
    ["Abr-e-Shab", "Cloud of the Night"],
    ["Siyahi Musafir", "Traveller of Ink"],
    ["Raat_Jaaga", "One Who Stays Awake"],
    ["Chaand_Saathi", "Moon's Companion"],
    ["Shab_Gard", "Night Wanderer"],
    ["Sitara_e_Sehar", "Star of Dawn"],
    ["Lantern_Dil", "Lantern Heart"],
    ["Neend_Chor", "Thief of Sleep"],
  ],
  "Philosophy & Truth": [
    ["Falsafi_Qalam", "Philosopher's Pen"],
    ["Sawaal_e_Rooh", "Question of the Soul"],
    ["Waqt_Shanas", "Knower of Time"],
    ["Aaina_Bin", "Mirror Gazer"],
    ["Justajoo_Dil", "Seeking Heart"],
    ["Khalaa_Nasheen", "Dweller of the Void"],
    ["Haqeeqat_Go", "Teller of Truth"],
    ["Safar_Nama", "Book of Journeys"],
  ],
};
type Vibe = string;
const TAKEN = ["abr_e_shab", "siyahi_qaasid", "khamosh_musafir"];
const shuffle = <T,>(a: readonly T[]) => [...a].sort(() => Math.random() - 0.5);

function Auth() {
  const { mode } = Route.useSearch();
  const { set } = useStore();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [priv, setPriv] = useState({ fullName: "", email: "", phone: "", password: "" });
  const [id, setId] = useState("#EK-7492");
  useEffect(() => setId(randomPoetId()), []);
  const [vibe, setVibe] = useState<Vibe>("Late Night Solitude");
  const [order, setOrder] = useState(0);
  const [pen, setPen] = useState("");
  const [signin, setSignin] = useState({ identifier: "", password: "" });
  const [loading, setLoading] = useState(false);

  // Forgot password modal state
  const [forgotModal, setForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const suggestions = (order ? shuffle(VIBES[vibe] ?? []) : VIBES[vibe] ?? []).slice(0, 6);
  const norm = pen.trim().replace(/[\s-]+/g, "_");
  const taken = TAKEN.includes(norm.toLowerCase());
  const step1ok =
    priv.fullName.trim().length > 1 &&
    /\S+@\S+\.\S+/.test(priv.email) &&
    priv.phone.replace(/\D/g, "").length >= 10 &&
    priv.password.length >= 6;

  const finish = (u: { penName: string; poetId: string; fullName: string; email: string; phone: string; guest?: boolean }) => {
    set({ user: u });
    toast(`Welcome to the Mehfil, @${u.penName}`);
    nav({ to: "/feed" });
  };

  const handleSignIn = async () => {
    const ident = signin.identifier.trim();
    if (!ident) {
      toast.error("Please enter your email, phone, or Shayar ID.");
      return;
    }
    setLoading(true);
    try {
      const res = await signInWithIdentifier(ident, signin.password);
      if (res.user) {
        finish(res.user);
      } else {
        toast.error(res.error || "Unable to sign in. Please verify your credentials.");
      }
    } catch {
      toast.error("Sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (norm.length < 3 || taken) return;
    setLoading(true);
    try {
      const res = await signUpWithVault({
        email: priv.email,
        password: priv.password,
        fullName: priv.fullName,
        phone: priv.phone,
        takhallus: norm,
        shayarUid: id,
        vibeCategory: vibe,
      });
      if (res.user) {
        finish(res.user);
      } else {
        toast.error(res.error || "Sign up could not be completed.");
      }
    } catch {
      toast.error("Sign up encountered an issue. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(resetEmail);
      setResetSent(true);
      toast("Password reset instructions sent to your email.");
    } finally {
      setLoading(false);
    }
  };

  const demo = () =>
    finish({
      penName: "Abr_e_Shab_Guest",
      poetId: randomPoetId(),
      fullName: "Demo Reader",
      email: "demo@ekkhawaab.in",
      phone: "+91 98765 43210",
      guest: true,
    });

  return (
    <div className="bg-secondary px-3.5 py-6 sm:px-6 sm:py-12 md:py-16">
      <div className="mx-auto max-w-xl">
        <div className="rounded-2xl sm:rounded-3xl border border-hairline bg-card p-4 sm:p-8 shadow-float md:p-12">
          {/* Top Switcher: Sign Up vs Sign In */}
          <div className="mb-6 sm:mb-8 flex gap-1.5 sm:gap-2 rounded-full bg-muted p-1 text-xs sm:text-sm font-medium">
            <button
              onClick={() => nav({ to: "/auth", search: { mode: "signup" } })}
              className={cn(
                "flex-1 rounded-full py-2 sm:py-2.5 transition",
                mode === "signup" ? "bg-background font-semibold text-ink shadow-sm" : "text-muted-foreground hover:text-ink"
              )}
            >
              Get Started (Sign Up)
            </button>
            <button
              onClick={() => nav({ to: "/auth", search: { mode: "signin" } })}
              className={cn(
                "flex-1 rounded-full py-2 sm:py-2.5 transition",
                mode === "signin" ? "bg-background font-semibold text-ink shadow-sm" : "text-muted-foreground hover:text-ink"
              )}
            >
              Sign In (Wapsi)
            </button>
          </div>

          {/* SIGN IN FLOW */}
          {mode === "signin" ? (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-ink">Welcome back to Ek Khawaab</h1>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                  Enter with your registered email, phone number, or unique Shayar ID.
                </p>
              </div>

              <div>
                <label className={label}>Email, Phone Number, or Shayar ID</label>
                <input
                  className={input}
                  placeholder="name@domain.com, +91..., or #EK-8492"
                  value={signin.identifier}
                  onChange={(e) => setSignin({ ...signin, identifier: e.target.value })}
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className={label}>Vault Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotModal(true);
                      setResetSent(false);
                      setResetEmail("");
                    }}
                    className="text-xs font-semibold text-royal hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <input
                  type="password"
                  className={input}
                  placeholder="Enter your password"
                  value={signin.password}
                  onChange={(e) => setSignin({ ...signin, password: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                />
              </div>

              <button
                disabled={loading || !signin.identifier.trim() || signin.password.length < 4}
                onClick={handleSignIn}
                className={cn(btnPrimary, "w-full py-3 sm:py-3.5 text-sm sm:text-base")}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="size-4 animate-spin" /> Entering Private Vault...
                  </span>
                ) : (
                  "Sign In to Private Vault"
                )}
              </button>

              <div className="relative my-4 text-center">
                <span className="bg-card px-3 text-xs text-subtle">or</span>
                <div className="absolute inset-x-0 top-1/2 -z-10 border-t border-hairline" />
              </div>

              <button onClick={demo} className={cn(btnOutline, "w-full py-2.5 sm:py-3 text-xs sm:text-sm")}>
                ⚡ One-Click Instant Guest Demo Login
              </button>
            </div>
          ) : step === 1 ? (
            /* SIGN UP - STEP 1 (Private Tijori Vault Details) */
            <div className="space-y-6">
              <div>
                <span className="rounded-full bg-wash px-3 py-1 font-mono text-xs font-semibold text-royal">
                  STEP 1 OF 2 · PRIVATE VAULT
                </span>
                <h1 className="mt-3 text-2xl sm:text-3xl font-semibold text-ink">Create Your Private Account</h1>
              </div>

              <div className="rounded-2xl border border-royal/20 bg-wash/60 p-4 text-sm text-wash-foreground">
                <p className="flex items-center gap-2 font-semibold">
                  <Lock className="size-4" /> 100% Zero-Leak Privacy Guarantee
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Your real name, email, and phone number are strictly encrypted in our private vault and NEVER shown to
                  other readers, on cards, in comments, or in secret letters.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={label}>Full Name (Private)</label>
                  <input
                    className={input}
                    placeholder="Your legal or real name"
                    value={priv.fullName}
                    onChange={(e) => setPriv({ ...priv, fullName: e.target.value })}
                  />
                </div>
                <div>
                  <label className={label}>Email Address (Private)</label>
                  <input
                    type="email"
                    className={input}
                    placeholder="you@domain.com"
                    value={priv.email}
                    onChange={(e) => setPriv({ ...priv, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className={label}>Phone Number (Private)</label>
                  <input
                    type="tel"
                    className={input}
                    value={priv.phone}
                    onChange={(e) => setPriv({ ...priv, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div>
                  <label className={label}>Create Vault Password</label>
                  <input
                    type="password"
                    className={input}
                    value={priv.password}
                    onChange={(e) => setPriv({ ...priv, password: e.target.value })}
                    placeholder="At least 6 characters"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  disabled={!step1ok}
                  onClick={() => setStep(2)}
                  className={cn(btnPrimary, "flex-1 py-3.5 text-base")}
                >
                  Continue to Pen Name Selection →
                </button>
                <button onClick={demo} className={cn(btnOutline, "py-3 text-sm")}>
                  Instant Demo
                </button>
              </div>
            </div>
          ) : (
            /* SIGN UP - STEP 2 (Public Poet Identity) */
            <div className="space-y-7">
              <div>
                <span className="rounded-full bg-blush px-3 py-1 font-mono text-xs font-semibold text-crimson">
                  STEP 2 OF 2 · PUBLIC IDENTITY
                </span>
                <h1 className="mt-3 text-3xl font-semibold text-ink">Choose Your Public Pen Name</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  This pen name and your unique poet ID are all the world will ever see.
                </p>
              </div>

              {/* Unique ID Badge & Regenerate */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-secondary p-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Your Unique Shayar ID:
                  </span>
                  <span className="rounded-full bg-wash px-3.5 py-1 font-mono text-sm font-bold text-royal">
                    {id}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setId(randomPoetId())}
                  className="flex items-center gap-1.5 text-xs font-semibold text-royal transition hover:text-vivid"
                >
                  <RefreshCw className="size-3.5" /> Regenerate ID
                </button>
              </div>

              {/* Vibe Selector */}
              <div>
                <label className={label}>Select Inspiration Vibe</label>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(VIBES).map((v) => (
                    <button key={v} onClick={() => setVibe(v)} className={chip(vibe === v)}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Curated Suggested Names */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className={label}>Pick a Curated Pen Name</label>
                  <button
                    type="button"
                    onClick={() => setOrder((o) => o + 1)}
                    className="flex items-center gap-1 text-xs font-semibold text-royal hover:underline"
                  >
                    <Shuffle className="size-3.5" /> Shuffle
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {suggestions.map(([n, m]) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPen(n)}
                      className={cn(
                        "rounded-2xl border p-4 text-left transition",
                        pen === n
                          ? "border-crimson bg-blush shadow-sm"
                          : "border-hairline bg-card hover:border-border hover:shadow-card"
                      )}
                    >
                      <p className="font-serif text-lg font-semibold text-ink">@{n}</p>
                      <p className="text-xs italic text-muted-foreground">{m}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Pen Name Input */}
              <div>
                <label className={label}>Or Enter Your Own Custom Pen Name</label>
                <input
                  value={pen}
                  onChange={(e) => setPen(e.target.value)}
                  placeholder="e.g. Shab_e_Umeed, Tanha_Dil"
                  className={cn(input, "rounded-xl")}
                />
              </div>

              {taken && <p className="text-xs font-semibold text-crimson">That pen name is reserved — please choose another.</p>}

              {/* Comparison Box */}
              <div className="space-y-2 rounded-2xl border border-hairline bg-secondary p-5 text-sm">
                <p className="flex items-center gap-2">
                  <Lock className="size-4 text-subtle" />
                  <span className="text-xs font-semibold uppercase text-subtle">Private in Vault:</span>
                  <span className="font-medium text-ink">{priv.fullName || "Your real name"} · {priv.phone || "Your phone"}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Sparkles className="size-4 text-crimson" />
                  <span className="text-xs font-semibold uppercase text-subtle">Visible on Mehfil:</span>
                  <span className="font-semibold text-ink">@{norm || "your_pen_name"}</span>
                  <IdBadge id={id} />
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  disabled={loading || norm.length < 3 || taken}
                  onClick={handleSignUp}
                  className={cn(btnPrimary, "flex-1 py-3.5 text-base")}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin" /> Sealing Vault & Entering Feed...
                    </span>
                  ) : (
                    "Complete Setup & Enter Feed →"
                  )}
                </button>
                <button disabled={loading} onClick={() => setStep(1)} className={cn(btnOutline, "px-6 py-3.5")}>
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4 backdrop-blur-sm"
          onClick={() => setForgotModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-hairline bg-background p-8 shadow-float"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="size-5 text-royal" />
                <h3 className="text-2xl font-semibold text-ink">Reset Vault Password</h3>
              </div>
              <button
                aria-label="Close"
                onClick={() => setForgotModal(false)}
                className="rounded-full p-2 text-subtle hover:bg-muted hover:text-ink"
              >
                <X className="size-5" />
              </button>
            </div>

            <p className="mt-2 text-sm text-muted-foreground">
              Enter your registered email address and we will generate a secure reset link for your encrypted vault.
            </p>

            {resetSent ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  <p className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="size-4" /> Reset Link Generated
                  </p>
                  <p className="mt-1 text-xs">
                    Instructions sent to <b>{resetEmail}</b>. In demo mode, your vault key can also be accessed directly
                    via Instant Demo Login.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setForgotModal(false)}
                  className={cn(btnPrimary, "w-full py-3")}
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendReset} className="mt-6 space-y-4">
                <div>
                  <label className={label}>Registered Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="you@domain.com"
                      className={cn(input, "pl-10")}
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotModal(false)}
                    className={cn(btnOutline, "flex-1 py-2.5")}
                  >
                    Cancel
                  </button>
                  <button type="submit" className={cn(btnPrimary, "flex-1 py-2.5")}>
                    Send Reset Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
