import { toast } from "sonner";
import { getPoemSlug, type Poem, type Script } from "@/data/poems";

/** The poem in the reader's current script, with a quiet attribution line. */
export function poemPlainText(poem: Poem, script: Script): string {
  const chosen = poem[script]?.length ? poem[script] : poem.hinglish;
  return `${chosen.join("\n")}\n\n— @${poem.takhallus} on ekkhawaab.in`;
}

/** Clipboard with a fallback for browsers that block the async API. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }

  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

export async function copyPoem(poem: Poem, script: Script): Promise<void> {
  const ok = await copyText(poemPlainText(poem, script));
  if (ok) toast.success("✓ Shayari copied to clipboard!");
  else toast.error("Could not copy. Long-press the verse to select it.");
}

export function poemUrl(poem: Poem): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://ekkhwaab.in";
  return `${origin}/poetry/${getPoemSlug(poem)}`;
}

/**
 * Native share sheet on touch devices; direct link copy everywhere else.
 * The visitor gets WhatsApp/Instagram/Telegram on a phone and a URL on desktop.
 */
export async function sharePoem(poem: Poem, script: Script): Promise<void> {
  const url = poemUrl(poem);
  const touch =
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof window !== "undefined" &&
    window.matchMedia?.("(pointer: coarse)").matches;

  if (touch) {
    try {
      await navigator.share({
        title: `@${poem.takhallus} — Ek Khwaab`,
        text: poemPlainText(poem, script),
        url,
      });
      return;
    } catch (err) {
      // A dismissed sheet is not an error; anything else falls back to copy.
      if (err instanceof Error && err.name === "AbortError") return;
    }
  }

  const ok = await copyText(url);
  if (ok) toast.success("✓ Link copied!");
  else toast.error("Could not copy the link.");
}

export async function shareLink(url: string, title: string): Promise<void> {
  const touch =
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof window !== "undefined" &&
    window.matchMedia?.("(pointer: coarse)").matches;

  if (touch) {
    try {
      await navigator.share({ title, url });
      return;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
    }
  }
  const ok = await copyText(url);
  if (ok) toast.success("✓ Link copied!");
  else toast.error("Could not copy the link.");
}
