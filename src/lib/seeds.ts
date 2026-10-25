/** Split a poem line into parts, flagging the user's seed words (case-insensitive). */
export function highlightSeeds(line: string, seeds: string[]) {
  const clean = seeds.map((s) => s.trim()).filter(Boolean);
  if (!clean.length) return [{ t: line, seed: false }];
  const re = new RegExp(`(${clean.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return line.split(re).filter(Boolean).map((t) => ({ t, seed: clean.some((s) => s.toLowerCase() === t.toLowerCase()) }));
}
