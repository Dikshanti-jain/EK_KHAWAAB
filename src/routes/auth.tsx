import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Lock,
  RefreshCw,
  Sparkles,
  Mail,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useStore, randomPoetId, type User } from "@/lib/store";
import {
  signUpWithVault,
  signInWithIdentifier,
  sendPasswordResetEmail,
  resendConfirmationEmail,
  updateVaultPassword,
} from "@/lib/auth.service";
import { IdBadge, btnOutline, btnPrimary, chip, input, label } from "@/components/kit";
import { Modal } from "@/components/Modal";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  validateSearch: (
    s: Record<string, unknown>
  ): { mode: "signin" | "signup" | "reset"; confirmed?: boolean | undefined; next?: string | undefined } => ({
    mode: s["mode"] === "signin" ? ("signin" as const) : s["mode"] === "reset" ? ("reset" as const) : ("signup" as const),
    confirmed: s["confirmed"] === "true",
    next:
      typeof s["next"] === "string" && s["next"].startsWith("/") && !s["next"].startsWith("//")
        ? s["next"]
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Get Started — Ek Khwaab" },
      { name: "description", content: "Create a private account and choose your public pen name and poet ID." },
      { property: "og:title", content: "Get Started — Ek Khwaab" },
      { property: "og:description", content: "Your email stays private. Only your pen name appears publicly." },
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
    ["Qaasid-e-Khwaab", "Messenger of Dreams"],
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
    ["Aina_Bin", "Mirror Gazer"],
    ["Justajoo_Dil", "Seeking Heart"],
    ["Khalaa_Nasheen", "Dweller of the Void"],
    ["Haqeeqat_Go", "Teller of Truth"],
    ["Safar_Nama", "Book of Journeys"],
  ],
};
type Vibe = string;
const TAKEN = ["abr_e_shab", "siyahi_qaasid", "khamosh_musafir"];
const shuffle = <T,>(a: readonly T[]) => [...a].sort(() => Math.random() - 0.5);
const EMAIL_RE = /^\S+@\S+\.\S+$/;

function passwordScore(p: string): number {
  if (!p) return 0;
  let score = 0;
  if (p.length >= 8) score += 1;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score += 1;
  if (/\d/.test(p) || /[^A-Za-z0-9]/.test(p)) score += 1;
  return score;
}

const STRENGTH = [
  { text: "Too short", cls: "bg-blush text-crimson" },
  { text: "Okay", cls: "bg-amber-50 text-amber-700" },
  { text: "Good", cls: "bg-wash text-royal" },
  { text: "Strong", cls: "bg-emerald-50 text-emerald-700" },
];

function FieldError({ children }: { children?: string | undefined }) {
  if (!children) return null;
  return (
    <p className="mt-1.5 flex items-start gap-1.5 text-xs text-crimson">
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

function Auth() {
  const { mode, confirmed, next } = Route.useSearch();
  const { set } = useStore();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [priv, setPriv] = useState({ email: "", password: "" });
  const [id, setId] = useState("#EK-7492");
  useEffect(() => setId(randomPoetId()), []);
  const [vibe, setVibe] = useState<Vibe>("Late Night Solitude");
  const [order, setOrder] = useState(0);
  const [pen, setPen] = useState("");
  const [signin, setSignin] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    signin?: string;
    pen?: string;
    form?: string;
  }>({});

  // Email Confirmation State
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  // Password Reset / Recovery state
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [resetUpdating, setResetUpdating] = useState(false);

  // Forgot password modal state
  const [forgotModal, setForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  // Handle confirmed flag or recovery token in hash
  useEffect(() => {
    if (confirmed) {
      toast.success("Email confirmed. You can sign in now.");
    }
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
      nav({ to: "/auth", search: { mode: "reset", ...(next ? { next } : {}) } });
    }
  }, [confirmed, nav, next]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const suggestions = useMemo(
    () => (order ? shuffle(VIBES[vibe] ?? []) : (VIBES[vibe] ?? [])).slice(0, 6),
    [vibe, order]
  );
  const norm = pen.trim().replace(/^@/, "").replace(/[\s-]+/g, "_");
  const taken = TAKEN.includes(norm.toLowerCase());
  const score = passwordScore(priv.password);

  const finish = (u: User) => {
    set({ user: u });
    toast.success(`Welcome, @${u.penName}`);
    if (next) nav({ to: next as never, replace: true });
    else nav({ to: "/feed" });
  };

  const validateStepOne = () => {
    const nextErrors: typeof errors = {};
    if (!EMAIL_RE.test(priv.email.trim())) {
      nextErrors.email = "Enter a real email address, like you@domain.com.";
    }
    if (priv.password.length < 6) {
      nextErrors.password = "Use at least 6 characters so your account stays safe.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSignIn = async () => {
    const email = signin.email.trim();
    if (!EMAIL_RE.test(email)) {
      setErrors({ signin: "Enter the email address you signed up with." });
      return;
    }
    if (!signin.password) {
      setErrors({ signin: "Enter your password." });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const res = await signInWithIdentifier(email, signin.password);
      if (res.user) {
        finish(res.user);
        return;
      }
      if (res.needsEmailConfirmation) {
        setPendingConfirmationEmail(res.email || email);
      }
      setErrors({
        signin:
          res.error ||
          "That email and password don't match. Try again, or reset your password below.",
      });
    } catch {
      setErrors({ signin: "Sign in failed. Check your connection and try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (norm.length < 3) {
      setErrors({ pen: "A pen name needs at least 3 characters." });
      return;
    }
    if (taken) {
      setErrors({ pen: "That pen name is already taken. Try another one." });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const res = await signUpWithVault({
        email: priv.email.trim(),
        password: priv.password,
        fullName: "",
        takhallus: norm,
        shayarUid: id,
        vibeCategory: vibe,
      });

      if (res.needsEmailConfirmation) {
        setPendingConfirmationEmail(res.email || priv.email);
        toast.success("Confirmation link sent. Check your inbox.");
        return;
      }
      if (res.user) {
        finish(res.user);
        return;
      }

      const message = res.error || "We couldn't create your account. Please try again.";
      if (/already|registered|exists/i.test(message)) {
        setStep(1);
        setErrors({
          email: "This email already has an account. Sign in instead, or use a different email.",
        });
        nav({ to: "/auth", search: { mode: "signup", ...(next ? { next } : {}) } });
      } else {
        setErrors({ form: message });
      }
    } catch {
      setErrors({ form: "Something went wrong while creating your account. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!pendingConfirmationEmail || resendCooldown > 0) return;
    setResending(true);
    try {
      const res = await resendConfirmationEmail(pendingConfirmationEmail);
      if (res.success) {
        toast.success("A fresh confirmation link is on its way.");
        setResendCooldown(60);
      } else {
        toast.error(res.error || "Could not resend the confirmation email.");
      }
    } finally {
      setResending(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setErrors({ password: "Use at least 6 characters." });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrors({ password: "The two passwords don't match." });
      return;
    }
    setErrors({});
    setResetUpdating(true);
    try {
      const res = await updateVaultPassword(newPassword);
      if (res.success) {
        toast.success("Password updated. Welcome back.");
        if (next) nav({ to: next as never, replace: true });
        else nav({ to: "/feed" });
      } else {
        setErrors({ password: res.error || "Could not update your password." });
      }
    } finally {
      setResetUpdating(false);
    }
  };

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(resetEmail.trim())) {
      toast.error("Enter the email address you signed up with.");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(resetEmail.trim());
      setResetSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-secondary px-3.5 py-6 sm:px-6 sm:py-12 md:py-16">
      <div className="mx-auto max-w-xl">
        <div className="rounded-2xl border border-hairline bg-card p-4 shadow-float sm:rounded-3xl sm:p-8 md:p-12">
          {/* PASSWORD RECOVERY MODE */}
          {mode === "reset" ? (
            <div className="space-y-6">
              <div>
                <span className="rounded-full bg-wash px-3 py-1 font-mono text-xs font-semibold text-royal">
                  RESET PASSWORD
                </span>
                <h1 className="mt-3 text-2xl font-semibold text-ink sm:text-3xl">Choose a new password</h1>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                  Pick something you'll remember. At least 6 characters.
                </p>
              </div>

              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div>
                  <label className={label} htmlFor="new-password">
                    New password
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    required
                    autoComplete="new-password"
                    className={input}
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label className={label} htmlFor="confirm-password">
                    Confirm new password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    required
                    autoComplete="new-password"
                    className={input}
                    placeholder="Re-type your new password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                  />
                </div>
                <FieldError>{errors.password}</FieldError>

                <button
                  disabled={resetUpdating}
                  type="submit"
                  className={cn(btnPrimary, "w-full py-3.5 text-base")}
                >
                  {resetUpdating ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin" /> Updating...
                    </span>
                  ) : (
                    "Update Password"
                  )}
                </button>
              </form>
            </div>
          ) : pendingConfirmationEmail ? (
            /* EMAIL CONFIRMATION PENDING NOTICE */
            <div className="space-y-6 py-4 text-center">
              <div className="mx-auto grid size-16 place-items-center rounded-full bg-wash text-royal shadow-sm">
                <Mail className="size-8" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Check your email</h1>
                <p className="mt-2 text-xs text-muted-foreground sm:text-sm">We sent a confirmation link to:</p>
                <p className="mt-1 font-mono text-sm font-semibold text-royal sm:text-base">
                  {pendingConfirmationEmail}
                </p>
              </div>
              <div className="rounded-2xl border border-royal/20 bg-wash/60 p-4 text-left text-xs leading-relaxed text-muted-foreground">
                <p className="mb-1 font-semibold text-wash-foreground">What to do next</p>
                <ol className="list-inside list-decimal space-y-1">
                  <li>Open your inbox (check Spam or Updates too).</li>
                  <li>Click the confirmation link.</li>
                  <li>You'll come back here, signed in.</li>
                </ol>
              </div>
              <div className="space-y-3 pt-2">
                <button
                  disabled={resending || resendCooldown > 0}
                  onClick={handleResendConfirmation}
                  className={cn(btnOutline, "w-full py-3 text-xs sm:text-sm")}
                >
                  {resending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin" /> Sending...
                    </span>
                  ) : resendCooldown > 0 ? (
                    `Resend Email (${resendCooldown}s)`
                  ) : (
                    "Resend Confirmation Email"
                  )}
                </button>
                <button
                  onClick={() => {
                    setPendingConfirmationEmail(null);
                    nav({ to: "/auth", search: { mode: "signin", ...(next ? { next } : {}) } });
                  }}
                  className={cn(btnPrimary, "w-full py-3 text-xs sm:text-sm")}
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Top Switcher: Create account vs Sign in */}
              <div className="mb-6 flex gap-1.5 rounded-full bg-muted p-1 text-xs font-medium sm:mb-8 sm:gap-2 sm:text-sm">
                <button
                  onClick={() => nav({ to: "/auth", search: { mode: "signup", ...(next ? { next } : {}) } })}
                  className={cn(
                    "flex-1 rounded-full py-2 transition sm:py-2.5",
                    mode === "signup" ? "bg-background font-semibold text-ink shadow-sm" : "text-muted-foreground hover:text-ink"
                  )}
                >
                  Create Account
                </button>
                <button
                  onClick={() => nav({ to: "/auth", search: { mode: "signin", ...(next ? { next } : {}) } })}
                  className={cn(
                    "flex-1 rounded-full py-2 transition sm:py-2.5",
                    mode === "signin" ? "bg-background font-semibold text-ink shadow-sm" : "text-muted-foreground hover:text-ink"
                  )}
                >
                  Sign In
                </button>
              </div>

              {/* SIGN IN FLOW */}
              {mode === "signin" ? (
                <div className="space-y-5">
                  <div>
                    <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Welcome back</h1>
                    <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                      Sign in with the email you used to create your account.
                    </p>
                  </div>

                  <div>
                    <label className={label} htmlFor="signin-email">
                      Email address
                    </label>
                    <input
                      id="signin-email"
                      className={input}
                      type="email"
                      autoComplete="email"
                      placeholder="you@domain.com"
                      value={signin.email}
                      onChange={(e) => setSignin({ ...signin, email: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && void handleSignIn()}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label className={label} htmlFor="signin-password">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotModal(true);
                          setResetSent(false);
                          setResetEmail(signin.email);
                        }}
                        className="text-xs font-semibold text-royal hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <input
                      id="signin-password"
                      type="password"
                      autoComplete="current-password"
                      className={input}
                      placeholder="Your password"
                      value={signin.password}
                      onChange={(e) => setSignin({ ...signin, password: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && void handleSignIn()}
                    />
                  </div>

                  <FieldError>{errors.signin}</FieldError>

                  <button
                    disabled={loading}
                    onClick={() => void handleSignIn()}
                    className={cn(btnPrimary, "w-full py-3 text-sm sm:py-3.5 sm:text-base")}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="size-4 animate-spin" /> Signing in...
                      </span>
                    ) : (
                      "Sign In"
                    )}
                  </button>

                  <p className="text-center text-xs text-muted-foreground">
                    New here?{" "}
                    <button
                      type="button"
                      onClick={() => nav({ to: "/auth", search: { mode: "signup", ...(next ? { next } : {}) } })}
                      className="font-semibold text-royal hover:underline"
                    >
                      Create an account
                    </button>
                  </p>
                </div>
              ) : step === 1 ? (
                /* SIGN UP - STEP 1: email + password only */
                <div className="space-y-6">
                  <div>
                    <span className="rounded-full bg-wash px-3 py-1 font-mono text-xs font-semibold text-royal">
                      STEP 1 OF 2
                    </span>
                    <h1 className="mt-3 text-2xl font-semibold text-ink sm:text-3xl">Create your account</h1>
                    <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                      Two fields now, a pen name next. That's it.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-royal/20 bg-wash/60 p-4 text-sm text-wash-foreground">
                    <p className="flex items-center gap-2 font-semibold">
                      <Lock className="size-4" /> Your email stays private
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Readers only ever see your pen name and poet ID. Your email is never shown on poems,
                      comments, cards or letters.
                    </p>
                  </div>

                  <form
                    className="space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (validateStepOne()) {
                        setErrors({});
                        setStep(2);
                      }
                    }}
                  >
                    <div>
                      <label className={label} htmlFor="signup-email">
                        Email address
                      </label>
                      <input
                        id="signup-email"
                        type="email"
                        autoComplete="email"
                        className={input}
                        placeholder="you@domain.com"
                        value={priv.email}
                        onChange={(e) => setPriv({ ...priv, email: e.target.value })}
                        onBlur={() => {
                          if (priv.email && !EMAIL_RE.test(priv.email.trim())) {
                            setErrors((x) => ({ ...x, email: "Enter a real email address, like you@domain.com." }));
                          }
                        }}
                      />
                      <FieldError>{errors.email}</FieldError>
                    </div>

                    <div>
                      <label className={label} htmlFor="signup-password">
                        Password
                      </label>
                      <input
                        id="signup-password"
                        type="password"
                        autoComplete="new-password"
                        className={input}
                        value={priv.password}
                        onChange={(e) => setPriv({ ...priv, password: e.target.value })}
                        placeholder="At least 6 characters"
                      />
                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                            priv.password ? STRENGTH[score]!.cls : "bg-muted text-subtle"
                          )}
                        >
                          {priv.password ? STRENGTH[score]!.text : "Password strength"}
                        </span>
                        <span className="text-[11px] text-subtle">
                          Mix letters, numbers or a symbol for a stronger password.
                        </span>
                      </div>
                      <FieldError>{errors.password}</FieldError>
                    </div>

                    <FieldError>{errors.form}</FieldError>

                    <button type="submit" className={cn(btnPrimary, "w-full py-3.5 text-base")}>
                      Continue to Pen Name →
                    </button>
                  </form>

                  <p className="text-center text-[11px] leading-relaxed text-subtle">
                    By continuing you agree to our{" "}
                    <a href="/privacy" className="font-semibold text-royal hover:underline">
                      privacy charter
                    </a>{" "}
                    and{" "}
                    <a href="/guidelines" className="font-semibold text-royal hover:underline">
                      community guidelines
                    </a>
                    .
                  </p>
                </div>
              ) : (
                /* SIGN UP - STEP 2: public pen name */
                <div className="space-y-7">
                  <div>
                    <span className="rounded-full bg-blush px-3 py-1 font-mono text-xs font-semibold text-crimson">
                      STEP 2 OF 2 · YOUR PEN NAME
                    </span>
                    <h1 className="mt-3 text-2xl font-semibold text-ink sm:text-3xl">Choose your pen name</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                      This is the only name readers will see. Pick one that feels like you.
                    </p>
                  </div>

                  {/* Auto-assigned poet ID */}
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-secondary p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Your poet ID
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
                      <RefreshCw className="size-3.5" /> New ID
                    </button>
                  </div>

                  {/* Vibe selector */}
                  <div>
                    <label className={label}>Pick a vibe</label>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(VIBES).map((v) => (
                        <button key={v} type="button" onClick={() => setVibe(v)} className={chip(vibe === v)}>
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Six poetic pen-name cards */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className={label}>Six names for this mood</label>
                      <button
                        type="button"
                        onClick={() => setOrder((o) => o + 1)}
                        className="flex items-center gap-1 text-xs font-semibold text-royal hover:underline"
                      >
                        🎲 Shuffle Names
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {suggestions.map(([n, m]) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => {
                            setPen(n);
                            setErrors((x) => ({ ...x, pen: "" }));
                          }}
                          className={cn(
                            "rounded-2xl border p-4 text-left transition",
                            norm === n.replace(/[\s-]+/g, "_")
                              ? "border-crimson bg-blush shadow-sm"
                              : "border-hairline bg-card hover:border-border hover:shadow-card"
                          )}
                        >
                          <p className="font-serif text-lg font-semibold text-ink">@{n.replace(/[\s-]+/g, "_")}</p>
                          <p className="text-xs italic text-muted-foreground">{m}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom pen name */}
                  <div>
                    <label className={label} htmlFor="custom-pen">
                      Or type your own pen name
                    </label>
                    <input
                      id="custom-pen"
                      value={pen}
                      onChange={(e) => {
                        setPen(e.target.value);
                        setErrors((x) => ({ ...x, pen: "" }));
                      }}
                      placeholder="e.g. Shab_e_Umeed, Tanha_Dil"
                      className={cn(input, "rounded-xl")}
                      maxLength={32}
                    />
                    <FieldError>{errors.pen}</FieldError>
                  </div>

                  {/* What stays private / public */}
                  <div className="space-y-2 rounded-2xl border border-hairline bg-secondary p-5 text-sm">
                    <p className="flex items-center gap-2">
                      <Lock className="size-4 text-subtle" />
                      <span className="text-xs font-semibold uppercase text-subtle">Private:</span>
                      <span className="truncate font-medium text-ink">{priv.email || "your email"}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Sparkles className="size-4 text-crimson" />
                      <span className="text-xs font-semibold uppercase text-subtle">Public:</span>
                      <span className="min-w-0 truncate font-semibold text-ink">@{norm || "your_pen_name"}</span>
                      <span className="shrink-0"><IdBadge id={id} /></span>
                    </p>
                  </div>

                  <FieldError>{errors.form}</FieldError>

                  <div className="flex flex-wrap gap-3">
                    <button
                      disabled={loading}
                      onClick={() => void handleSignUp()}
                      className={cn(btnPrimary, "flex-1 py-3.5 text-base")}
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="size-4 animate-spin" /> Creating your account...
                        </span>
                      ) : (
                        "Enter Ek Khwaab →"
                      )}
                    </button>
                    <button disabled={loading} onClick={() => setStep(1)} className={cn(btnOutline, "px-6 py-3.5")}>
                      Back
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Forgot password — a real modal: Escape, backdrop, scroll lock, 40 px close. */}
      <Modal
        open={forgotModal}
        onClose={() => setForgotModal(false)}
        title="Reset your password"
        description="Enter your account email and we'll send you a secure reset link."
      >
        {resetSent ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <p className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="size-4" /> Reset link sent
              </p>
              <p className="mt-1 text-xs">
                Instructions are on their way to <b>{resetEmail}</b>. Open the link to choose a new password.
              </p>
            </div>
            <button type="button" onClick={() => setForgotModal(false)} className={cn(btnPrimary, "w-full py-3")}>
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSendReset} className="space-y-4">
            <div>
              <label className={label} htmlFor="reset-email">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
                <input
                  id="reset-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className={cn(input, "pl-10")}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setForgotModal(false)} className={cn(btnOutline, "flex-1 py-2.5")}>
                Cancel
              </button>
              <button type="submit" disabled={loading} className={cn(btnPrimary, "flex-1 py-2.5")}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : "Send Reset Link"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
