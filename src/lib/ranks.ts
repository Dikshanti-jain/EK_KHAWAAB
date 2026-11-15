/**
 * Poet ranks grow with published verses, never with followers or applause.
 * Counts are deliberately gentle: three verses already make a Shayar.
 */
export type Rank = {
  key: "musafir" | "shayar" | "sukhanwar";
  name: string;
  english: string;
  min: number;
  next: number | null;
};

export const RANKS: readonly Rank[] = [
  { key: "musafir", name: "Musafir", english: "Seeker", min: 0, next: 3 },
  { key: "shayar", name: "Shayar", english: "Poet", min: 3, next: 10 },
  { key: "sukhanwar", name: "Sukhanwar", english: "Master of Verse", min: 10, next: null },
] as const;

export function rankFor(count: number): Rank {
  const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  if (n >= 10) return RANKS[2]!;
  if (n >= 3) return RANKS[1]!;
  return RANKS[0]!;
}

/** 0 → 1 progress toward the next rank; 1 once the highest rank is reached. */
export function rankProgress(count: number): number {
  const rank = rankFor(count);
  if (rank.next === null) return 1;
  const n = Math.max(0, Math.floor(Number.isFinite(count) ? count : 0));
  const span = rank.next - rank.min;
  return Math.min(1, Math.max(0, (n - rank.min) / span));
}

export function rankLabel(count: number): string {
  const rank = rankFor(count);
  return `${rank.name} (${rank.english})`;
}
