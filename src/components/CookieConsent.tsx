import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Cookie } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "ek_cookie_consent_v1";

type Choice = "all" | "essential";

/**
 * A consent card, not a wall.
 *
 * Nothing here is an ad tracker: the site stores a script preference, a
 * session token and a 7-day reading cache. The banner exists so the choice is
 * explicit and revisitable, and so "Essential Only" is a real option.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      // Storage blocked: show once per session, never nag.
    }
    const t = window.setTimeout(() => setVisible(true), 700);
    return () => window.clearTimeout(t);
  }, []);

  const choose = (choice: Choice) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ choice, at: new Date().toISOString() }));
    } catch {
      // The banner still closes; the preference simply will not persist.
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie and privacy choices"
      className={cn(
        "fixed bottom-20 left-4 right-4 z-50 rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-xl backdrop-blur-md",
        "md:bottom-4 md:left-auto md:right-4 md:max-w-md"
      )}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-wash text-royal">
          <Cookie className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">A small, honest cookie note</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            We use essential cookies to keep your session secure and remember your preferred poetry
            script (Hinglish, Hindi, or Urdu). No invasive ad trackers.{" "}
            <Link to="/privacy" className="font-semibold text-royal underline underline-offset-2">
              Read our privacy charter
            </Link>
            .
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => choose("essential")}
          className="rounded-full bg-slate-100 px-4 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
        >
          Essential Only
        </button>
        <button
          type="button"
          onClick={() => choose("all")}
          className="rounded-full bg-[#0F172A] px-5 py-2 text-xs font-semibold text-white transition hover:bg-[#1E3A8A]"
        >
          Accept All
        </button>
      </div>
    </div>
  );
}
