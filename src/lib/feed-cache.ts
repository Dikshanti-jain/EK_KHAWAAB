import {
  useInfiniteQuery,
  keepPreviousData,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { POEMS, type Poem, type Script } from "@/data/poems";
import { detectScript } from "./translation.service";

export type FeedCursor = { createdAt: string; id: string };
export type FeedPage = { poems: Poem[]; nextCursor: FeedCursor | null; error: string | null };

const PAGE_SIZE = 20;

/* ------------------------------ cursor codec ----------------------------- */
// base64url so the cursor survives a URL and a React key without escaping.
export function encodeCursor(c: FeedCursor): string {
  const b64 = btoa(JSON.stringify(c));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeCursor(s: string): FeedCursor | null {
  try {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const parsed = JSON.parse(atob(padded));
    if (typeof parsed?.createdAt !== "string" || typeof parsed?.id !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

/* -------------------------------- row type ------------------------------- */
export type FeedRow = {
  id: string;
  shayar_uid: string;
  takhallus: string | null;
  hinglish_text: string | null;
  hindi_text: string | null;
  urdu_text: string | null;
  english_translation: string | null;
  mood_tag: string | null;
  format_type: string | null;
  seed_words: string[] | null;
  is_gumnaam: boolean;
  daad_count: number;
  created_at: string;
  is_owner: boolean;
  recent_comments:
    | { id: string; comment_text: string; created_at: string; takhallus: string | null }[]
    | null;
};

const lines = (v: string | null) => (v ? v.split("\n").filter((l) => l.length > 0) : []);

export function toPoem(row: FeedRow): Poem {
  const hinglish = lines(row.hinglish_text);
  const hindi = lines(row.hindi_text);
  const urdu = lines(row.urdu_text);
  const english = lines(row.english_translation);
  const source = detectScript(row.hinglish_text || row.hindi_text || row.urdu_text || "");

  const tagSource = row.seed_words?.length
    ? row.seed_words.map((w) => (w.startsWith("#") ? w : `#${w}`))
    : [`#${(row.mood_tag || "Shayari").replace(/\s+/g, "")}`];

  return {
    id: row.id,
    takhallus: row.takhallus || "Gumnaam_Shayar",
    shayarUid: row.shayar_uid,
    isOwner: Boolean(row.is_owner),
    format: row.format_type || "Sher",
    mood: row.mood_tag || "Unspoken Love",
    style: "Modern",
    paper: "kora",
    hinglish,
    hindi,
    urdu,
    english,
    sourceLanguage: source,
    translationStatus: {
      hinglish: hinglish.length ? "completed" : "pending",
      hindi: hindi.length ? "completed" : "pending",
      urdu: urdu.length ? "completed" : "pending",
      english: english.length ? "completed" : "pending",
    } as Record<Script, "completed" | "pending">,
    daad: row.daad_count ?? 0,
    muqarrar: 0,
    hashiya: (row.recent_comments ?? []).map((c) => ({
      id: c.id,
      by: c.takhallus || "Reader",
      text: c.comment_text,
    })),
    tags: tagSource,
  };
}

function mergeSeeds(poems: Poem[]): Poem[] {
  const ids = new Set(poems.map((p) => p.id));
  return [...poems, ...POEMS.filter((p) => !ids.has(p.id))];
}

/* ------------------------------- fetch page ------------------------------ */
export async function fetchFeedPage(cursor: FeedCursor | null): Promise<FeedPage> {
  const { data, error } = await supabase.rpc("get_feed_page", {
    p_cursor_created_at: cursor?.createdAt ?? null,
    p_cursor_id: cursor?.id ?? null,
    p_mood: null,
    p_limit: PAGE_SIZE + 1,
  });

  if (error) {
    console.error("[feed] rpc failed:", error.message);
    // First page still renders the curated corpus; later pages just stop.
    return cursor
      ? { poems: [], nextCursor: null, error: error.message }
      : { poems: POEMS, nextCursor: null, error: error.message };
  }

  const rows = (data ?? []) as FeedRow[];
  const hasMore = rows.length > PAGE_SIZE;
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

  const last = page[page.length - 1];
  return {
    poems: page.map(toPoem),
    nextCursor: hasMore && last ? { createdAt: last.created_at, id: last.id } : null,
    error: null,
  };
}

/* --------------------------------- hooks --------------------------------- */
export function useFeed(scope: string) {
  return useInfiniteQuery({
    queryKey: ["feed", scope],
    queryFn: ({ pageParam }) => fetchFeedPage(pageParam),
    initialPageParam: null as FeedCursor | null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 45_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    select: (data) => {
      const all = data.pages.flatMap((p) => p.poems);
      return {
        poems: mergeSeeds(all),
        error: data.pages.find((p) => p.error)?.error ?? null,
      };
    },
  });
}

/* ------------------------- cache mutation helpers ------------------------ */
// Needed because the feed is now cached: a delete that only touches the
// Zustand-style store reappears when the user navigates back inside staleTime.

type FeedData = InfiniteData<FeedPage, FeedCursor | null>;

function mapPages(qc: QueryClient, fn: (p: FeedPage, i: number) => FeedPage) {
  qc.setQueriesData<FeedData>({ queryKey: ["feed"] }, (old) =>
    old ? { ...old, pages: old.pages.map(fn) } : old
  );
}

export function patchFeedPoem(qc: QueryClient, id: string, patch: Partial<Poem>) {
  mapPages(qc, (p) => ({
    ...p,
    poems: p.poems.map((poem) => (poem.id === id ? { ...poem, ...patch } : poem)),
  }));
}

export function removeFeedPoem(qc: QueryClient, id: string) {
  mapPages(qc, (p) => ({ ...p, poems: p.poems.filter((poem) => poem.id !== id) }));
}

export function prependFeedPoem(qc: QueryClient, poem: Poem) {
  mapPages(qc, (p, i) => (i === 0 ? { ...p, poems: [poem, ...p.poems] } : p));
}
