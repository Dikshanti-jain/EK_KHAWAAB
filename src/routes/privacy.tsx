import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { EyeOff, FileLock2, ImageOff, Lock, Server, Cpu, Database, Trash2, RefreshCw, AlertTriangle, ShieldCheck, Cookie } from "lucide-react";
import { toast } from "sonner";
import { PageHead, card, btnPrimary, btnOutline } from "@/components/kit";
import { Modal } from "@/components/Modal";
import { useStore } from "@/lib/store";
import { deleteMyAccount } from "@/lib/auth.service";
import { cn } from "@/lib/utils";

const CORE_PILLARS = [
  [Lock, "Your private details stay private", "Your real name (if you add one), email and phone live in a private table that only you can read. They are never shown in feeds, comments, cards or letters."],
  [EyeOff, "Only your pen name is public", "Readers, commenters and letter recipients see your pen name (takhallus) and your #EK-ID. Nothing else. If you post anonymously, even your pen name is hidden."],
  [Cpu, "AI processing", "When you use the AI Poet or translation, your prompt is processed by Groq Inc. on the server. Your account credentials and private details are never sent to the model."],
  [Database, "Where data lives", "Poems, comments and sessions are stored on Supabase (PostgreSQL). Sessions expire after 7 days so a lost device does not stay signed in forever."],
  [ImageOff, "Card exports carry no hidden data", "Quote cards are drawn in your browser with HTML5 Canvas. Downloaded images contain no GPS location, device ID or tracking tag."],
  [FileLock2, "Sealed secret letters", "Letter answers are hashed with bcrypt. The sender stays hidden as “A secret admirer” until the recipient solves the riddle."],
] as const;

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy & Data Protection Charter — Ek Khwaab | DPDP Act 2023 Compliant" },
      { name: "description", content: "Learn how Ek Khwaab protects user anonymity, private account details, and complies with India's DPDP Act 2023." },
      { name: "author", content: "Dikshanti Jain" },
      { property: "og:title", content: "Privacy Policy — Ek Khwaab" },
      { property: "og:description", content: "Your words are public, but your real identity stays private." },
    ],
  }),
  component: PrivacyPage,
});

export function PrivacyPage() {
  const { user, set } = useStore();
  const nav = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleClearLocalData = () => {
    try {
      localStorage.removeItem("ek_khwaab_store_v1");
      localStorage.removeItem("ek_khawaab_store_v1");
      localStorage.removeItem("ek-khwaab-v2");
      localStorage.removeItem("ek-khawaab-v2");
      localStorage.removeItem("ek_compose_draft");
      set({ liked: [], saved: [], letters: [] });
      toast.success("Local device cache and temporary drafts cleared successfully.");
    } catch {
      toast.error("Could not clear local device data.");
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await deleteMyAccount();
      if (res.success) {
        set({ user: null, liked: [], saved: [], letters: [] });
        try {
          localStorage.removeItem("ek_khwaab_store_v1");
      localStorage.removeItem("ek_khawaab_store_v1");
      localStorage.removeItem("ek-khwaab-v2");
      localStorage.removeItem("ek-khawaab-v2");
          localStorage.removeItem("ek_compose_draft");
        } catch {}
        setShowDeleteModal(false);
        toast.success("Your account and private details have been permanently erased.");
        nav({ to: "/" });
      } else {
        toast.error(res.error || "Failed to delete account. Please try again.");
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-14 md:px-12">
      <PageHead
        kicker="PRIVACY & DATA CHARTER"
        title="Your feelings are yours. Your identity stays private."
        sub="The short version: your email is never shown publicly, your pen name is the only public identity, and we use no advertising trackers. The detail below explains exactly what we store and how to remove it."
      />

      {/* Plain-language summary */}
      <div className={cn(card, "mb-8 border-royal/15 bg-wash/40 p-6 sm:p-8")}>
        <h2 className="text-lg font-semibold text-ink sm:text-xl">The short version</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
          <li><b className="text-ink">Public:</b> your pen name, #EK-ID, poems and comments.</li>
          <li><b className="text-ink">Private:</b> your email, optional full name and phone, and your password.</li>
          <li><b className="text-ink">Never sold:</b> we do not sell data or run cross-site ad trackers.</li>
          <li><b className="text-ink">Always yours:</b> you can clear local data or delete your account below.</li>
        </ul>
      </div>

      {/* Core Security & Privacy Pillars */}
      <div className="grid gap-5 md:grid-cols-2">
        {CORE_PILLARS.map(([Icon, title, desc]) => (
          <div key={title} className={cn(card, "p-6 sm:p-8")}>
            <div className="grid size-11 place-items-center rounded-xl bg-wash text-royal">
              <Icon className="size-5" />
            </div>
            <h2 className="mt-5 text-lg font-semibold text-ink sm:text-xl">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>

      {/* Cookies & local storage */}
      <div className={cn(card, "mt-8 p-6 sm:p-8")}>
        <div className="flex items-center gap-2.5">
          <Cookie className="size-5 text-royal" />
          <h2 className="text-xl font-semibold text-ink">Cookies & local storage</h2>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          We use a small amount of browser storage, not advertising trackers:
        </p>
        <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-muted-foreground">
          <li><b className="text-ink">Session:</b> keeps you signed in securely.</li>
          <li><b className="text-ink">Script preference:</b> remembers Hinglish, Hindi or Urdu.</li>
          <li><b className="text-ink">Reading cache:</b> a 7-day local cache so the feed opens quickly.</li>
          <li><b className="text-ink">Your cookie choice:</b> so this banner does not ask again.</li>
        </ul>
        <button
          type="button"
          onClick={() => {
            try {
              localStorage.removeItem("ek_cookie_consent_v1");
              toast.success("Cookie choice cleared. The banner will appear again.");
            } catch {
              toast.error("Could not clear the cookie choice on this device.");
            }
          }}
          className={cn(btnOutline, "mt-5 text-xs sm:text-sm")}
        >
          Change cookie choice
        </button>
      </div>

      {/* DPDP Act 2023 Compliance & Data Protection Section */}
      <div className={cn(card, "mt-8 p-6 sm:p-8 space-y-4")}>
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="size-5 text-emerald-600" />
          <h2 className="text-xl font-semibold text-ink">DPDP Act 2023 Compliance & User Rights</h2>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Under the Digital Personal Data Protection Act, 2023 of India, you hold irrevocable rights regarding your digital data:
        </p>
        <ul className="list-inside list-disc space-y-1.5 text-sm text-muted-foreground">
          <li><strong>Right to Access:</strong> You can review your account details and public poems from your profile at any time.</li>
          <li><strong>Right to Correction & Erasure:</strong> You can modify your pen name or trigger immediate irreversible account deletion.</li>
          <li><strong>Right to Grievance Redressal:</strong> Inquiries or grievances can be addressed directly to our Data Protection & Grievance Officer.</li>
        </ul>
      </div>

      {/* Interactive Data Control Actions (PC-04) */}
      <div className={cn(card, "mt-8 p-6 sm:p-8 border-destructive/20 bg-blush/20")}>
        <h2 className="text-xl font-semibold text-ink">Manage Your Stored Data</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          You are always in complete control of what stays on your device and what exists in our database.
        </p>

        <div className="mt-6 flex flex-wrap gap-4">
          <button
            onClick={handleClearLocalData}
            className={cn(btnOutline, "flex items-center gap-2 text-xs sm:text-sm")}
          >
            <RefreshCw className="size-4" /> Clear Local Device Storage
          </button>

          {user && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className={cn(btnPrimary, "bg-crimson hover:bg-crimson/90 text-xs sm:text-sm flex items-center gap-2")}
            >
              <Trash2 className="size-4" /> Delete My Account
            </button>
          )}
        </div>
      </div>

      {/* Grievance Officer Contact Box */}
      <div className={cn(card, "mt-8 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6")}>
        <div>
          <h3 className="text-lg font-semibold text-ink">Data Protection & Grievance Officer</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Ek Khwaab is maintained with strict data privacy principles by founder and owner <strong>Dikshanti Jain</strong>.
          </p>
        </div>
        <a
          href="mailto:jaindikahanti@gmail.com"
          className="whitespace-nowrap rounded-full border border-hairline bg-card px-5 py-2.5 text-sm font-medium text-ink shadow-sm transition hover:border-royal hover:text-royal"
        >
          Contact: jaindikahanti@gmail.com
        </a>
      </div>

      {/* Account Deletion Confirmation Dialog */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete your account?"
        tone="danger"
        description="This permanently deletes your private details, pen-name profile, secret letters and bookmarks. It cannot be undone."
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowDeleteModal(false)} disabled={deleting} className={btnOutline}>
              Cancel
            </button>
            <button
              onClick={() => void handleDeleteAccount()}
              disabled={deleting}
              className={cn(btnPrimary, "bg-crimson hover:bg-crimson/90")}
            >
              {deleting ? "Erasing..." : "Yes, Delete Everything"}
            </button>
          </div>
        }
      >
        <div className="flex items-center gap-3 rounded-2xl bg-blush/60 p-4 text-xs text-crimson">
          <AlertTriangle className="size-4 shrink-0" />
          <span>Your poems will be removed from the public feed.</span>
        </div>
      </Modal>
    </div>
  );
}
