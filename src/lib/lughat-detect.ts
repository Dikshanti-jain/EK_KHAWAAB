import { LUGHAT, type Word } from "@/data/lughat";

/** Lowercase and reduce every script to space-separated letter/number runs. */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Find dictionary words that genuinely occur in a verse.
 *
 * Matching on normalized whole tokens prevents "shab" from firing inside
 * "shabnam" and lets compound entries such as "shab-e-gham" match as phrases.
 */
export function detectLughat(lines: readonly string[], limit = 4): Word[] {
  const haystack = ` ${normalize(lines.join(" "))} `;
  if (haystack.trim().length === 0) return [];

  const found: Word[] = [];
  for (const word of LUGHAT) {
    const forms = [word.roman, word.hindi, word.urdu];
    const hit = forms.some((form) => {
      const needle = normalize(form);
      return needle.length > 0 && haystack.includes(` ${needle} `);
    });
    if (hit) {
      found.push(word);
      if (found.length >= limit) break;
    }
  }
  return found;
}
