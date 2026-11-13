import { supabase } from "@/integrations/supabase/client";
import { POEMS, isLivePoemId, type Poem, type Script, type TranslationStatus } from "@/data/poems";
import { detectScript } from "./translation.service";
import { toPoem, type FeedRow } from "./feed-cache";

export type CreatePoemPayload = {
  shayarUid: string;
  takhallus: string;
  lines?: string[];
  sourceScript?: Script;
  hinglish?: string[];
  hindi?: string[];
  urdu?: string[];
  english?: string[];
  moodTag: string;
  formatType?: string;
  seedWords?: string[];
  tags?: string[];
  isGumnaam?: boolean;
};

export type FetchPoemsOptions = {
  cursor?: string;
  limit?: number;
};

export type FetchPoemsResult = {
  poems: Poem[];
  nextCursor: string | null;
  error: string | null;
};

export type ReportContentPayload = {
  targetType: "poem" | "comment" | "khat";
  targetId: string;
  reason: string;
};

/**
 * Fetch poems from the secure safe_poems_feed view with keyset pagination.
 * Zero leaks of takhallus or shayar_uid for is_gumnaam poems at the database level (Fixes RT-04, RL-02).
 */
export async function fetchPoems(options: FetchPoemsOptions = {}): Promise<FetchPoemsResult> {
  const limit = options.limit || 20;
  try {
    let query = supabase
      .from("safe_poems_feed")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit + 1);

    if (options.cursor) {
      query = query.lt("created_at", options.cursor);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[PoemsService] Database fetch error:", error.message);
      // If error on initial load without cursor, fallback to seeds to maintain experience, but report error
      if (!options.cursor) {
        return { poems: POEMS, nextCursor: null, error: error.message };
      }
      return { poems: [], nextCursor: null, error: error.message };
    }

    if (!data || data.length === 0) {
      if (!options.cursor) {
        return { poems: POEMS, nextCursor: null, error: null };
      }
      return { poems: [], nextCursor: null, error: null };
    }

    const hasMore = data.length > limit;
    const pageRows = hasMore ? data.slice(0, limit) : data;
    const nextCursor = hasMore ? pageRows[pageRows.length - 1]!.created_at : null;

    // Fetch comments for the fetched poems
    const poemIds = pageRows.map((r) => r.id);
    let commentsByPoem: Record<string, { by: string; text: string }[]> = {};

    if (poemIds.length > 0) {
      const { data: commentsData } = await supabase
        .from("comments")
        .select(`
          id,
          poem_id,
          shayar_uid,
          comment_text,
          created_at,
          public_shayars (
            takhallus
          )
        `)
        .in("poem_id", poemIds)
        .order("created_at", { ascending: true });

      if (commentsData) {
        for (const c of commentsData) {
          if (!commentsByPoem[c.poem_id]) {
            commentsByPoem[c.poem_id] = [];
          }
          const authorTakhallus =
            (c.public_shayars as { takhallus?: string } | null)?.takhallus ||
            `Reader_${c.shayar_uid ? c.shayar_uid.replace(/\W/g, "") : "Anon"}`;
          commentsByPoem[c.poem_id]!.push({
            by: authorTakhallus,
            text: c.comment_text,
          });
        }
      }
    }

    // Map DB view rows to Poem domain model
    const dbPoems: Poem[] = pageRows.map((row) => {
      const hinglishLines = row.hinglish_text ? row.hinglish_text.split("\n") : [];
      const hindiLines = row.hindi_text ? row.hindi_text.split("\n") : hinglishLines;
      const urduLines = row.urdu_text ? row.urdu_text.split("\n") : hinglishLines;
      const englishLines = row.english_translation ? row.english_translation.split("\n") : [];

      const rawSeedWords = row.seed_words;
      const seedTags: string[] =
        rawSeedWords && Array.isArray(rawSeedWords) && rawSeedWords.length > 0
          ? rawSeedWords.map((w: string) => (w.startsWith("#") ? w : `#${w}`))
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
        hinglish: hinglishLines,
        hindi: hindiLines,
        urdu: urduLines,
        english: englishLines,
        sourceLanguage: detectScript(row.hinglish_text || row.hindi_text || row.urdu_text || ""),
        translationStatus: {
          hinglish: hinglishLines.length ? "completed" : "pending",
          hindi: hindiLines.length ? "completed" : "pending",
          urdu: urduLines.length ? "completed" : "pending",
          english: englishLines.length ? "completed" : "pending",
        },
        daad: row.daad_count ?? 0,
        muqarrar: 0,
        hashiya: commentsByPoem[row.id] || [],
        tags: seedTags,
      };
    });

    // On initial page without cursor, merge with seed poems to ensure richness
    if (!options.cursor) {
      const existingIds = new Set(dbPoems.map((p) => p.id));
      const extraSeeds = POEMS.filter((p) => !existingIds.has(p.id));
      return { poems: [...dbPoems, ...extraSeeds], nextCursor, error: null };
    }

    return { poems: dbPoems, nextCursor, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load poems feed.";
    console.error("[PoemsService] fetchPoems exception:", message);
    if (!options.cursor) {
      return { poems: POEMS, nextCursor: null, error: message };
    }
    return { poems: [], nextCursor: null, error: message };
  }
}

/**
 * Publish a new poem to the database.
 * Returns true server poem or real error (Fixes RT-03). Zero fake fallbacks.
 */
export async function createPoem(
  payload: CreatePoemPayload
): Promise<{ poem: Poem | null; error: string | null }> {
  const rawLines =
    payload.lines && payload.lines.length
      ? payload.lines
      : payload.hinglish && payload.hinglish.length
        ? payload.hinglish
        : payload.hindi && payload.hindi.length
          ? payload.hindi
          : payload.urdu && payload.urdu.length
            ? payload.urdu
            : payload.english ?? [];

  if (rawLines.length === 0) {
    return { poem: null, error: "Verse lines cannot be empty." };
  }

  const sourceScript: Script = payload.sourceScript || detectScript(rawLines.join("\n"));

  const hinglishLines = payload.hinglish ?? (sourceScript === "hinglish" ? rawLines : []);
  const hindiLines = payload.hindi ?? (sourceScript === "hindi" ? rawLines : []);
  const urduLines = payload.urdu ?? (sourceScript === "urdu" ? rawLines : []);
  const englishLines = payload.english ?? (sourceScript === "english" ? rawLines : []);

  const hinglishJoined = (hinglishLines.length ? hinglishLines : rawLines).join("\n").trim();
  const hindiJoined = (hindiLines.length ? hindiLines : rawLines).join("\n").trim();
  const urduJoined = (urduLines.length ? urduLines : rawLines).join("\n").trim();
  const englishJoined = englishLines.join("\n").trim();

  const initialStatus: Partial<Record<Script, TranslationStatus>> = {
    [sourceScript]: "completed",
    hindi: sourceScript === "hindi" ? "completed" : "pending",
    urdu: sourceScript === "urdu" ? "completed" : "pending",
    english: sourceScript === "english" ? "completed" : "pending",
    hinglish: sourceScript === "hinglish" ? "completed" : "pending",
  };

  try {
    const { data, error } = await supabase
      .from("poems")
      .insert({
        shayar_uid: payload.shayarUid,
        hinglish_text: hinglishJoined,
        hindi_text: hindiJoined,
        urdu_text: urduJoined,
        english_translation: englishJoined || null,
        mood_tag: payload.moodTag,
        format_type: payload.formatType || (rawLines.length === 2 ? "Sher" : "Nazm"),
        seed_words: payload.seedWords || null,
        is_gumnaam: payload.isGumnaam || false,
      })
      .select()
      .single();

    if (error || !data) {
      return { poem: null, error: error?.message || "Failed to publish poem." };
    }

    const createdPoem: Poem = {
      id: data.id,
      takhallus: payload.isGumnaam ? "Gumnaam_Shayar" : payload.takhallus,
      shayarUid: data.shayar_uid,
      isOwner: true,
      format: data.format_type || "Sher",
      mood: data.mood_tag,
      style: "Modern",
      paper: "kora",
      hinglish: hinglishLines.length ? hinglishLines : rawLines,
      hindi: hindiLines.length ? hindiLines : rawLines,
      urdu: urduLines.length ? urduLines : rawLines,
      english: englishLines,
      sourceLanguage: sourceScript,
      translationStatus: initialStatus,
      daad: data.daad_count ?? 0,
      muqarrar: 0,
      hashiya: [],
      tags: payload.tags || (payload.seedWords ? payload.seedWords.map((w) => (w.startsWith("#") ? w : `#${w}`)) : []),
    };

    return { poem: createdPoem, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to publish poem.";
    return { poem: null, error: message };
  }
}

/**
 * Updates an existing poem's translations in the remote database.
 */
export async function updatePoemTranslations(
  poemId: string,
  translations: {
    hinglish: string[];
    hindi: string[];
    urdu: string[];
    english: string[];
  }
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from("poems")
      .update({
        hinglish_text: translations.hinglish.join("\n"),
        hindi_text: translations.hindi.join("\n"),
        urdu_text: translations.urdu.join("\n"),
        english_translation: translations.english.join("\n"),
        updated_at: new Date().toISOString(),
      })
      .eq("id", poemId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update translations." };
  }
}

/**
 * Fetch a single published poem by its UUID for the detail page.
 */
export async function fetchPoemById(id: string): Promise<Poem | null> {
  if (!isLivePoemId(id)) return null;
  try {
    const { data, error } = await supabase
      .from("safe_poems_feed")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;
    return toPoem({ ...(data as FeedRow), recent_comments: null });
  } catch {
    return null;
  }
}

/**
 * Fetch the signed-in reader's bookmarked poems. Bookmarks are stored as
 * ids, so this joins them back to the public feed view in one extra round trip.
 */
export async function fetchMySavedPoems(
  shayarUid: string
): Promise<{ poems: Poem[]; error: string | null }> {
  try {
    const { data: marks, error: markError } = await supabase
      .from("bookmarks")
      .select("poem_id")
      .eq("shayar_uid", shayarUid);

    if (markError) return { poems: [], error: markError.message };

    const ids = (marks ?? [])
      .map((m) => m.poem_id as string)
      .filter((id): id is string => Boolean(id));
    if (!ids.length) return { poems: [], error: null };

    const { data: rows, error: rowError } = await supabase
      .from("safe_poems_feed")
      .select("*")
      .in("id", ids);

    if (rowError) return { poems: [], error: rowError.message };

    return {
      poems: (rows ?? []).map((row) =>
        toPoem({ ...(row as FeedRow), recent_comments: null })
      ),
      error: null,
    };
  } catch (err: unknown) {
    return {
      poems: [],
      error: err instanceof Error ? err.message : "Could not load saved poems.",
    };
  }
}

/**
 * Toggle like/daad on a poem in the database.
 * Real error propagation (Fixes RT-03).
 */
export async function togglePoemLike(
  poemId: string,
  shayarUid: string,
  isCurrentlyLiked: boolean
): Promise<{ success: boolean; error: string | null }> {
  try {
    if (isCurrentlyLiked) {
      const { error } = await supabase
        .from("poem_likes")
        .delete()
        .eq("poem_id", poemId)
        .eq("shayar_uid", shayarUid);
      if (error) return { success: false, error: error.message };
      return { success: true, error: null };
    } else {
      const { error } = await supabase
        .from("poem_likes")
        .insert({ poem_id: poemId, shayar_uid: shayarUid });
      if (error) return { success: false, error: error.message };
      return { success: true, error: null };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Could not toggle like.";
    return { success: false, error: message };
  }
}

/**
 * Toggle bookmark/basta saving for a poem in the database.
 * Real error propagation (Fixes RT-03).
 */
export async function togglePoemBookmark(
  poemId: string,
  shayarUid: string,
  isCurrentlySaved: boolean
): Promise<{ success: boolean; error: string | null }> {
  try {
    if (isCurrentlySaved) {
      const { error } = await supabase
        .from("bookmarks")
        .delete()
        .eq("poem_id", poemId)
        .eq("shayar_uid", shayarUid);
      if (error) return { success: false, error: error.message };
      return { success: true, error: null };
    } else {
      const { error } = await supabase
        .from("bookmarks")
        .insert({ poem_id: poemId, shayar_uid: shayarUid });
      if (error) return { success: false, error: error.message };
      return { success: true, error: null };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Could not toggle bookmark.";
    return { success: false, error: message };
  }
}

/**
 * Add a comment/hashiya to a poem.
 * Real error propagation (Fixes RT-03).
 */
export async function addPoemComment(
  poemId: string,
  shayarUid: string,
  commentText: string
): Promise<{ success: boolean; commentId?: string | undefined; error: string | null }> {
  const cleanComment = commentText.trim();
  if (!cleanComment || cleanComment.length > 600) {
    return { success: false, error: "Comment must be between 1 and 600 characters." };
  }

  try {
    const { data, error } = await supabase
      .from("comments")
      .insert({
        poem_id: poemId,
        shayar_uid: shayarUid,
        comment_text: cleanComment,
      })
      .select("id")
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || "Failed to post comment." };
    }
    return { success: true, commentId: data.id, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to post comment.";
    return { success: false, error: message };
  }
}

/**
 * Delete a poem owned by the author.
 * Real error propagation (Fixes RT-03).
 */
export async function deletePoem(
  poemId: string,
  shayarUid: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from("poems")
      .delete()
      .eq("id", poemId)
      .eq("shayar_uid", shayarUid);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete poem.";
    return { success: false, error: message };
  }
}

/**
 * Delete a comment.
 * Real error propagation (Fixes RT-03).
 */
export async function deletePoemComment(
  commentId: string,
  shayarUid: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId)
      .eq("shayar_uid", shayarUid);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete comment.";
    return { success: false, error: message };
  }
}

/**
 * Submit a content report to public.content_reports (Fixes RL-03).
 */
export async function reportContent(
  payload: ReportContentPayload
): Promise<{ success: boolean; error: string | null }> {
  const reasonClean = payload.reason.trim();
  if (reasonClean.length < 3 || reasonClean.length > 500) {
    return { success: false, error: "Report reason must be between 3 and 500 characters." };
  }

  try {
    const { error } = await supabase
      .from("content_reports")
      .insert({
        target_type: payload.targetType,
        target_id: payload.targetId,
        reason: reasonClean,
        status: "pending",
      });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to submit content report.";
    return { success: false, error: message };
  }
}
