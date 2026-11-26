import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  encodeCursor,
  decodeCursor,
  toPoem,
  fetchFeedPage,
  patchFeedPoem,
  removeFeedPoem,
  prependFeedPoem,
  type FeedRow,
  type FeedPage,
  type FeedCursor,
} from "@/lib/feed-cache";
import { POEMS, type Poem } from "@/data/poems";

const mockRpc = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

describe("feed-cache unit & QueryClient integration", () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  describe("cursor codec", () => {
    it("round-trips a FeedCursor through base64url", () => {
      const cursor: FeedCursor = {
        createdAt: "2026-11-26T12:34:56.789Z",
        id: "550e8400-e29b-41d4-a716-446655440000",
      };
      const encoded = encodeCursor(cursor);
      expect(encoded).not.toMatch(/[+/=]/);
      expect(decodeCursor(encoded)).toEqual(cursor);
    });

    it("returns null for malformed or incomplete cursors", () => {
      expect(decodeCursor("not-valid-base64!!!")).toBeNull();
      expect(decodeCursor(btoa(JSON.stringify({ id: "only-id" })))).toBeNull();
      expect(decodeCursor(btoa(JSON.stringify({ createdAt: 123, id: "x" })))).toBeNull();
    });
  });

  describe("toPoem()", () => {
    it("maps a FeedRow to a Poem with script detection, tags, and comments", () => {
      const row: FeedRow = {
        id: "550e8400-e29b-41d4-a716-446655440001",
        shayar_uid: "#EK-1042",
        takhallus: "Mirza",
        hinglish_text: "Teri yaad aayi\nDil ro pada",
        hindi_text: "तेरी याद आई\nदिल रो पड़ा",
        urdu_text: null,
        english_translation: "Your memory came\nThe heart wept",
        mood_tag: "Quiet Longing",
        format_type: "Sher",
        seed_words: ["yaad", "#baarish"],
        is_gumnaam: false,
        daad_count: 14,
        created_at: "2026-11-26T00:00:00Z",
        is_owner: true,
        recent_comments: [
          { id: "c1", comment_text: "Wah!", created_at: "2026-11-26T01:00:00Z", takhallus: "Noor" },
          { id: "c2", comment_text: "Khoob", created_at: "2026-11-26T02:00:00Z", takhallus: null },
        ],
      };

      const poem = toPoem(row);
      expect(poem.id).toBe(row.id);
      expect(poem.takhallus).toBe("Mirza");
      expect(poem.isOwner).toBe(true);
      expect(poem.hinglish).toEqual(["Teri yaad aayi", "Dil ro pada"]);
      expect(poem.hindi).toEqual(["तेरी याद आई", "दिल रो पड़ा"]);
      expect(poem.urdu).toEqual([]);
      expect(poem.translationStatus).toEqual({
        hinglish: "completed",
        hindi: "completed",
        urdu: "pending",
        english: "completed",
      });
      expect(poem.tags).toEqual(["#yaad", "#baarish"]);
      expect(poem.hashiya).toEqual([
        { id: "c1", by: "Noor", text: "Wah!" },
        { id: "c2", by: "Reader", text: "Khoob" },
      ]);
    });

    it("falls back to Gumnaam_Shayar and mood tag when optional fields are null", () => {
      const row: FeedRow = {
        id: "p2",
        shayar_uid: "#EK-0001",
        takhallus: null,
        hinglish_text: null,
        hindi_text: null,
        urdu_text: null,
        english_translation: null,
        mood_tag: "Ishq E Haqeeqi",
        format_type: null,
        seed_words: null,
        is_gumnaam: true,
        daad_count: 0,
        created_at: "2026-11-26T00:00:00Z",
        is_owner: false,
        recent_comments: null,
      };

      const poem = toPoem(row);
      expect(poem.takhallus).toBe("Gumnaam_Shayar");
      expect(poem.format).toBe("Sher");
      expect(poem.tags).toEqual(["#IshqEHaqeeqi"]);
    });
  });

  describe("fetchFeedPage()", () => {
    it("paginates using PAGE_SIZE + 1 lookahead and emits nextCursor", async () => {
      const rows: FeedRow[] = Array.from({ length: 21 }, (_, i) => ({
        id: `id-${i}`,
        shayar_uid: `#EK-${1000 + i}`,
        takhallus: `Poet${i}`,
        hinglish_text: `Line ${i}`,
        hindi_text: null,
        urdu_text: null,
        english_translation: null,
        mood_tag: "Longing",
        format_type: "Sher",
        seed_words: ["chai"],
        is_gumnaam: false,
        daad_count: i,
        created_at: `2026-11-26T00:${String(i).padStart(2, "0")}:00Z`,
        is_owner: false,
        recent_comments: null,
      }));
      mockRpc.mockResolvedValueOnce({ data: rows, error: null });

      const page = await fetchFeedPage(null);
      expect(page.error).toBeNull();
      expect(page.poems).toHaveLength(20);
      expect(page.nextCursor).toEqual({
        createdAt: rows[19]!.created_at,
        id: "id-19",
      });
    });

    it("falls back to curated POEMS on first-page RPC error and returns empty on later pages", async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: "network down" } });
      const first = await fetchFeedPage(null);
      expect(first.error).toBe("network down");
      expect(first.poems).toEqual(POEMS);
      expect(first.nextCursor).toBeNull();

      mockRpc.mockResolvedValueOnce({ data: null, error: { message: "timeout" } });
      const next = await fetchFeedPage({ createdAt: "2026-11-26T00:00:00Z", id: "id-19" });
      expect(next.error).toBe("timeout");
      expect(next.poems).toEqual([]);
      expect(next.nextCursor).toBeNull();
    });
  });

  describe("cache mutation helpers", () => {
    const samplePoem = (id: string, daad = 1): Poem => ({
      ...POEMS[0]!,
      id,
      daad,
    });

    it("patches, prepends, and removes poems across cached pages", () => {
      const qc = new QueryClient();
      const page1: FeedPage = { poems: [samplePoem("a", 2), samplePoem("b", 5)], nextCursor: null, error: null };
      const page2: FeedPage = { poems: [samplePoem("c", 9)], nextCursor: null, error: null };
      qc.setQueryData(["feed", "all"], { pages: [page1, page2], pageParams: [null, null] });

      patchFeedPoem(qc, "b", { daad: 6 });
      prependFeedPoem(qc, samplePoem("new", 0));
      removeFeedPoem(qc, "c");

      const updated = qc.getQueryData<{ pages: FeedPage[] }>(["feed", "all"]);
      expect(updated?.pages[0]!.poems.map((p) => p.id)).toEqual(["new", "a", "b"]);
      expect(updated?.pages[0]!.poems.find((p) => p.id === "b")?.daad).toBe(6);
      expect(updated?.pages[1]!.poems).toEqual([]);
    });
  });
});
