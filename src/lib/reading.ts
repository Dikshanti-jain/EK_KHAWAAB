export type VerseScale = "standard" | "large" | "xlarge";

export const VERSE_SCALE_KEY = "ek_verse_scale_v1";

export const VERSE_SCALES: readonly { value: VerseScale; label: string; short: string }[] = [
  { value: "standard", label: "Standard text size", short: "Aa" },
  { value: "large", label: "Large text size", short: "Aa" },
  { value: "xlarge", label: "Extra large text size", short: "Aa" },
] as const;

export function isVerseScale(value: unknown): value is VerseScale {
  return value === "standard" || value === "large" || value === "xlarge";
}

export function nextVerseScale(current: VerseScale): VerseScale {
  if (current === "standard") return "large";
  if (current === "large") return "xlarge";
  return "standard";
}

export function readVerseScale(): VerseScale {
  if (typeof window === "undefined") return "standard";
  try {
    const saved = window.localStorage.getItem(VERSE_SCALE_KEY);
    return isVerseScale(saved) ? saved : "standard";
  } catch {
    return "standard";
  }
}

/** Apply the reader's choice globally and remember it for the next visit. */
export function applyVerseScale(scale: VerseScale): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset["verseScale"] = scale;
  try {
    window.localStorage.setItem(VERSE_SCALE_KEY, scale);
  } catch {
    // Private mode can reject writes; the current page still scales.
  }
}
