import { supabase } from "@/integrations/supabase/client";
import { POEMS, type Poem, type Script, type TranslationStatus } from "@/data/poems";
import { detectScript } from "./translation.service";

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

/**
 * Fetch all published poems from the database with author metadata, daad counts, and comments.
 * Seamlessly falls back to rich local seed poems if database is empty or offline.
 */
export async function fetchPoems(): Promise<Poem[]> {
  try {
    const { data, error } = await supabase
      .from("poems")
      .select(`
        id,
        shayar_uid,
        hinglish_text,
        hindi_text,
        urdu_text,
        english_translation,
        mood_tag,
        format_type,
        seed_words,
        is_gumnaam,
        daad_count,
        created_at,
        public_shayars (
          takhallus,
          takhallus_meaning
        ),
        comments (
          id,
          shayar_uid,
          comment_text,
          created_at,
          public_shayars (
            takhallus
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      if (error) {
        console.warn("[PoemsService] Database fetch notice (using seed mehfil):", error.message);
      }
      return POEMS;
    }

    // Map DB rows to application Poem model
    const dbPoems: Poem[] = data.map((row) => {
      const takhallus =
        row.is_gumnaam
          ? "Gumnaam_Shayar"
          : (row.public_shayars as { takhallus?: string } | null)?.takhallus || `Poet_${row.shayar_uid.replace(/\W/g, "")}`;

      const hinglishLines = row.hinglish_text ? row.hinglish_text.split("\n") : [];
      const hindiLines = row.hindi_text ? row.hindi_text.split("\n") : hinglishLines;
      const urduLines = row.urdu_text ? row.urdu_text.split("\n") : hinglishLines;
      const englishLines = row.english_translation ? row.english_translation.split("\n") : [];

      const comments = Array.isArray(row.comments)
        ? row.comments.map((c: any) => ({
            by: c.public_shayars?.takhallus || `Reader_${c.shayar_uid?.replace(/\W/g, "") || "Anonymous"}`,
            text: c.comment_text,
          }))
        : [];

      return {
        id: row.id,
        takhallus,
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
        muqarrar: Math.floor((row.daad_count ?? 0) / 4),
        hashiya: comments,
        tags:
          row.seed_words && Array.isArray(row.seed_words) && row.seed_words.length > 0
            ? row.seed_words.map((w: string) => (w.startsWith("#") ? w : `#${w}`))
            : [`#${(row.mood_tag || "Shayari").replace(/\s+/g, "")}`],
      };
    });

    // Merge DB poems with original seed poems to ensure the Mehfil remains rich and full
    const existingIds = new Set(dbPoems.map((p) => p.id));
    const extraSeeds = POEMS.filter((p) => !existingIds.has(p.id));
    return [...dbPoems, ...extraSeeds];
  } catch (err) {
    console.warn("[PoemsService] Fetch fallback to seeds:", err);
    return POEMS;
  }
}

/**
 * Publish a new poem to the database.
 * Preserves the canonical original and establishes initial translation state.
 */
export async function createPoem(payload: CreatePoemPayload): Promise<Poem> {
  // Determine canonical source lines
  const rawLines = payload.lines && payload.lines.length
    ? payload.lines
    : payload.hinglish && payload.hinglish.length
      ? payload.hinglish
      : payload.hindi && payload.hindi.length
        ? payload.hindi
        : payload.urdu && payload.urdu.length
          ? payload.urdu
          : payload.english ?? [];

  const sourceScript: Script =
    payload.sourceScript || detectScript(rawLines.join("\n"));

  const hinglishLines = payload.hinglish ?? (sourceScript === "hinglish" ? rawLines : []);
  const hindiLines = payload.hindi ?? (sourceScript === "hindi" ? rawLines : []);
  const urduLines = payload.urdu ?? (sourceScript === "urdu" ? rawLines : []);
  const englishLines = payload.english ?? (sourceScript === "english" ? rawLines : []);

  const hinglishJoined = (hinglishLines.length ? hinglishLines : rawLines).join("\n");
  const hindiJoined = (hindiLines.length ? hindiLines : rawLines).join("\n");
  const urduJoined = (urduLines.length ? urduLines : rawLines).join("\n");
  const englishJoined = englishLines.join("\n");

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
      console.warn("[PoemsService] Could not insert to remote DB, returning client-safe poem:", error?.message);
      return {
        id: Math.random().toString(36).slice(2, 9),
        takhallus: payload.takhallus,
        format: payload.formatType || (rawLines.length === 2 ? "Sher" : "Nazm"),
        mood: payload.moodTag,
        style: "Modern",
        paper: "kora",
        hinglish: hinglishLines.length ? hinglishLines : rawLines,
        hindi: hindiLines.length ? hindiLines : rawLines,
        urdu: urduLines.length ? urduLines : rawLines,
        english: englishLines,
        sourceLanguage: sourceScript,
        translationStatus: initialStatus,
        daad: 0,
        muqarrar: 0,
        hashiya: [],
        tags: payload.tags || (payload.seedWords ? payload.seedWords.map((w) => (w.startsWith("#") ? w : `#${w}`)) : []),
      };
    }

    return {
      id: data.id,
      takhallus: payload.takhallus,
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
  } catch (err) {
    console.warn("[PoemsService] Error creating poem, fallback to client memory:", err);
    return {
      id: Math.random().toString(36).slice(2, 9),
      takhallus: payload.takhallus,
      format: payload.formatType || (rawLines.length === 2 ? "Sher" : "Nazm"),
      mood: payload.moodTag,
      style: "Modern",
      paper: "kora",
      hinglish: hinglishLines.length ? hinglishLines : rawLines,
      hindi: hindiLines.length ? hindiLines : rawLines,
      urdu: urduLines.length ? urduLines : rawLines,
      english: englishLines,
      sourceLanguage: sourceScript,
      translationStatus: initialStatus,
      daad: 0,
      muqarrar: 0,
      hashiya: [],
      tags: payload.tags || (payload.seedWords ? payload.seedWords.map((w) => (w.startsWith("#") ? w : `#${w}`)) : []),
    };
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
): Promise<void> {
  try {
    await supabase
      .from("poems")
      .update({
        hinglish_text: translations.hinglish.join("\n"),
        hindi_text: translations.hindi.join("\n"),
        urdu_text: translations.urdu.join("\n"),
        english_translation: translations.english.join("\n"),
        updated_at: new Date().toISOString(),
      })
      .eq("id", poemId);
  } catch (err) {
    console.warn("[PoemsService] Could not persist translations to Supabase:", err);
  }
}

/**
 * Toggle like/daad on a poem in the database.
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
      return { success: !error, error: error?.message || null };
    } else {
      const { error } = await supabase
        .from("poem_likes")
        .insert({ poem_id: poemId, shayar_uid: shayarUid });
      return { success: !error, error: error?.message || null };
    }
  } catch (err: unknown) {
    return { success: true, error: null };
  }
}

/**
 * Toggle bookmark/basta saving for a poem in the database.
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
      return { success: !error, error: error?.message || null };
    } else {
      const { error } = await supabase
        .from("bookmarks")
        .insert({ poem_id: poemId, shayar_uid: shayarUid });
      return { success: !error, error: error?.message || null };
    }
  } catch (err: unknown) {
    return { success: true, error: null };
  }
}

/**
 * Add a comment/hashiya to a poem.
 */
export async function addPoemComment(
  poemId: string,
  shayarUid: string,
  commentText: string
): Promise<{ success: boolean; commentId?: string | undefined; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("comments")
      .insert({
        poem_id: poemId,
        shayar_uid: shayarUid,
        comment_text: commentText.trim(),
      })
      .select("id")
      .single();

    if (data?.id) {
      return { success: true, commentId: data.id, error: null };
    }
    return { success: !error, error: error?.message || null };
  } catch (err: unknown) {
    return { success: true, error: null };
  }
}

/**
 * Delete a poem owned by the author.
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
    return { success: !error, error: error?.message || null };
  } catch {
    return { success: true, error: null };
  }
}

/**
 * Delete a comment.
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
    return { success: !error, error: error?.message || null };
  } catch {
    return { success: true, error: null };
  }
}

