// Room codes. Ambiguous glyphs removed: 0/O, 1/I/L.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_RE = /^[2-9A-HJKMNP-Z]{6}$/;

export function createRoomCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) {
    // Modulo bias is zero here: 256 / 32 = 8 exactly. The next person will
    // wonder why this is not rejection sampling, so it is written down.
    out += ALPHABET[b % ALPHABET.length];
  }
  return out;
}

export const isValidCode = (s: string) => CODE_RE.test(s.toUpperCase());

export function roomFromSearch(search: Record<string, unknown>): string | null {
  const raw = typeof search["room"] === "string" ? search["room"].toUpperCase() : "";
  return isValidCode(raw) ? raw : null;
}
