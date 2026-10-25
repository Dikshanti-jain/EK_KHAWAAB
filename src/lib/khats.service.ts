import { supabase } from "@/integrations/supabase/client";
import type { Letter } from "@/lib/store";

export type CreateKhatPayload = {
  senderUid: string;
  recipientIdentifier: string;
  lines: string[];
  clue1: string;
  clue2: string;
  answer: string;
  seal: "crimson" | "royal";
  from: string;
};

/**
 * Persist a newly sealed secret letter in the database.
 */
export async function createSecretKhat(payload: CreateKhatPayload): Promise<Letter> {
  const poemText = payload.lines.join("\n");

  try {
    const { data, error } = await supabase
      .from("secret_khats")
      .insert({
        sender_uid: payload.senderUid,
        recipient_identifier: payload.recipientIdentifier || "Anonymous_Recipient",
        poem_content: poemText,
        clue_one: payload.clue1,
        clue_two: payload.clue2,
        secret_answer: payload.answer.trim().toLowerCase(),
        wax_seal_color: payload.seal,
        is_unlocked: false,
      })
      .select()
      .single();

    if (error || !data) {
      console.warn("[KhatsService] Could not persist to DB, returning client letter:", error?.message);
      return {
        id: Math.random().toString(36).slice(2, 9),
        lines: payload.lines,
        clue1: payload.clue1,
        clue2: payload.clue2,
        answer: payload.answer,
        seal: payload.seal,
        from: payload.from,
      };
    }

    return {
      id: data.id,
      lines: payload.lines,
      clue1: data.clue_one,
      clue2: data.clue_two,
      answer: data.secret_answer,
      seal: (data.wax_seal_color as "crimson" | "royal") || "crimson",
      from: payload.from,
    };
  } catch (err) {
    console.warn("[KhatsService] Exception creating khat, local fallback:", err);
    return {
      id: Math.random().toString(36).slice(2, 9),
      lines: payload.lines,
      clue1: payload.clue1,
      clue2: payload.clue2,
      answer: payload.answer,
      seal: payload.seal,
      from: payload.from,
    };
  }
}

/**
 * Retrieve a secret letter by its ID.
 */
export async function fetchSecretKhat(id: string): Promise<Letter | null> {
  try {
    const { data, error } = await supabase
      .from("secret_khats")
      .select(`
        id,
        sender_uid,
        recipient_identifier,
        poem_content,
        clue_one,
        clue_two,
        secret_answer,
        wax_seal_color,
        is_unlocked,
        public_shayars (
          takhallus
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;

    const senderTakhallus =
      (data.public_shayars as { takhallus?: string } | null)?.takhallus ||
      `Shayar_${data.sender_uid?.replace(/\W/g, "") || "Secret"}`;

    return {
      id: data.id,
      lines: data.poem_content.split("\n"),
      clue1: data.clue_one,
      clue2: data.clue_two,
      answer: data.secret_answer,
      seal: (data.wax_seal_color as "crimson" | "royal") || "crimson",
      from: senderTakhallus,
    };
  } catch {
    return null;
  }
}

/**
 * Unlock a secret letter by guessing the sender's cipher answer.
 */
export async function attemptUnlockKhat(
  khatId: string,
  guess: string
): Promise<{ correct: boolean; sender?: string; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("secret_khats")
      .select(`
        secret_answer,
        sender_uid,
        public_shayars (
          takhallus
        )
      `)
      .eq("id", khatId)
      .maybeSingle();

    if (error || !data) {
      return { correct: false, error: "Letter not found" };
    }

    const isMatch = guess.trim().toLowerCase() === data.secret_answer.trim().toLowerCase();

    if (isMatch) {
      // Mark as unlocked in database
      await supabase
        .from("secret_khats")
        .update({ is_unlocked: true })
        .eq("id", khatId);

      const senderTakhallus =
        (data.public_shayars as { takhallus?: string } | null)?.takhallus ||
        `Shayar_${data.sender_uid?.replace(/\W/g, "") || "Secret"}`;

      return { correct: true, sender: senderTakhallus, error: null };
    }

    return { correct: false, error: null };
  } catch (err: unknown) {
    return { correct: false, error: "Verification failed" };
  }
}
