import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { EyeOff, FileLock2, ImageOff, Lock, Server, Cpu, Database, Trash2, RefreshCw, AlertTriangle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHead, card, btnPrimary, btnOutline } from "@/components/kit";
import { useStore } from "@/lib/store";
import { deleteMyAccount } from "@/lib/auth.service";
import { cn } from "@/lib/utils";

const CORE_PILLARS = [
  [Lock, "Private Vault Isolation", "Your real legal name, email, and phone number are stored strictly in an encrypted private vault guarded by PostgreSQL Row Level Security (RLS). They are NEVER exposed in public API feeds, comments, or directory views."],
  [EyeOff, "Public Pen Name Representation", "Readers, commenters, and letter recipients only ever see your chosen pen name (Takhallus) and cryptographic #EK-ID. If you choose 'Gumnaam', your identity is masked at the database level."],
  [Cpu, "Subprocessors & AI Processing", "When using the AI Poet or translation features, prompts are processed via Groq Inc. using server-side models. No personal user credentials or vault records are ever forwarded to LLM providers."],
  [Database, "Data Infrastructure & Supabase", "Primary database storage and session tokens are hosted securely on Supabase (PostgreSQL with RLS). Sessions are governed by 7-day TTL expiration to minimize credential exposure."],
  [ImageOff, "Zero-Exif Card Studio Exports", "Quote cards are generated in-memory through HTML5 Canvas. Downloaded PNG and JPEG images contain zero GPS metadata, device identifiers, or tracking tags."],
  [FileLock2, "Zero-Knowledge Secret Letters", "Letters are locked cryptographically with bcrypt riddle answers. Senders remain hidden as 'A secret admirer' until the riddle is successfully unlocked by the recipient."],
] as const;

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy & Data Protection Charter — Ek Khwaab | DPDP Act 2023 Compliant" },
      { name: "description", content: "Learn how Ek Khwaab protects user anonymity, private vault records, and complies with India's DPDP Act 2023." },
      { name: "author", content: "Dikshanti Jain" },
      { property: "og:title", content: "Privacy Policy — Ek Khwaab" },
      { property: "og:description", content: "Your words are public, but your real identity is sealed in an encrypted vault." },
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
        toast.success("Your account and private vault have been permanently erased.");
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
        title="Your feelings are yours. Your identity stays sealed."
        sub="Ek Khwaab is built from the ground up on zero-knowledge anonymity, explicit user consent, and India's Digital Personal Data Protection Act, 2023 (DPDP Act 2023)."
      />

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
          <li><strong>Right to Access:</strong> You can review all vault credentials and public poems from your account profile at any time.</li>
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
              <Trash2 className="size-4" /> Delete My Account & Vault
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
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4 backdrop-blur-sm"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-hairline bg-background p-6 sm:p-8 shadow-float"
          >
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-full bg-blush text-crimson">
                <AlertTriangle className="size-5" />
              </div>
              <h3 className="text-xl font-semibold text-ink">Erase Your Account?</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              This will permanently delete your private vault data, your public pen name profile, your secret letters, and your bookmarks. This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className={btnOutline}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className={cn(btnPrimary, "bg-crimson hover:bg-crimson/90")}
              >
                {deleting ? "Erasing..." : "Yes, Erase Everything"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
