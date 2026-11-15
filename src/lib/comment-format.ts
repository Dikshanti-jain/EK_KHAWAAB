export type QuickReply = { emoji: string; text: string };

/** Quick responses are inserted into the composer, never auto-posted. */
export const QUICK_REPLIES: readonly QuickReply[] = [
  { emoji: "🥀", text: "Wah! Kya kehne" },
  { emoji: "🕯️", text: "Encore" },
  { emoji: "✨", text: "Dil ko chhoo gaya" },
  { emoji: "✒️", text: "Gehri baat" },
] as const;

const PAUSE_MARKS = [", ", " — ", " – ", "; ", " … "] as const;
const WORD_BREAKS = [" aur ", " par ", " magar ", " lekin ", " jo "] as const;

function nearestCut(flat: string): number {
  const mid = flat.length / 2;
  const cuts: number[] = [];

  // Punctuation stays with the first line, as it would in a written sher.
  for (const mark of PAUSE_MARKS) {
    let at = flat.indexOf(mark);
    while (at !== -1) {
      cuts.push(at + mark.length);
      at = flat.indexOf(mark, at + 1);
    }
  }

  // Conjunctions begin the second line rather than ending the first.
  for (const mark of WORD_BREAKS) {
    let at = flat.indexOf(mark);
    while (at !== -1) {
      cuts.push(at);
      at = flat.indexOf(mark, at + 1);
    }
  }

  const valid = cuts.filter((c) => c > 0 && c < flat.length);
  if (valid.length > 0) {
    valid.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
    return valid[0] ?? -1;
  }

  // A plain word boundary is the last resort.
  let bestSpace = -1;
  let bestDist = Infinity;
  for (let i = 0; i < flat.length; i++) {
    if (flat[i] === " ") {
      const dist = Math.abs(i - mid);
      if (dist < bestDist) {
        bestDist = dist;
        bestSpace = i;
      }
    }
  }
  return bestSpace;
}

/**
 * Turn a comment into a two-line Jawaabi Sher.
 *
 * Explicit newlines win. Otherwise the text breaks at the pause nearest its
 * middle, so a single flowing sentence still reads as a couplet. Text shorter
 * than four words stays on one line.
 */
export function toCouplet(input: string): string[] {
  const text = input.replace(/\r\n/g, "\n").trim();
  if (!text) return [];

  const explicit = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (explicit.length >= 2) {
    return [explicit[0]!, explicit.slice(1).join(" ")];
  }

  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.split(" ").length < 4) return [flat];

  const cut = nearestCut(flat);
  if (cut === -1) return [flat];

  const first = flat.slice(0, cut).trim();
  const second = flat.slice(cut).trim();
  return first && second ? [first, second] : [flat];
}

/** The exact text stored in `comments.comment_text`. */
export function formatComment(input: string, asCouplet: boolean): string {
  const clean = input.trim();
  if (!asCouplet) return clean;
  return toCouplet(clean).join("\n");
}

export function isCoupletComment(text: string): boolean {
  return text.split("\n").filter((l) => l.trim().length > 0).length === 2;
}
