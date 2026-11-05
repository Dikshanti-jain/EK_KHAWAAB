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

export type CreateKhatResponse = {
  letter: Letter | null;
  error: string | null;
};

export type UnlockKhatResponse = {
  correct: boolean;
  sender?: string | undefined;
  remainingAttempts?: number | undefined;
  error: string | null;
};

/**
 * Persist a newly sealed secret letter in the database via secure RPC.
 * Server-side bcrypt hashing for answers and SHA-256 for recipient tokens.
 * Zero plaintext PII or answers stored (Fixes RT-01, PC-03).
 */
export async function createSecretKhat(payload: CreateKhatPayload): Promise<CreateKhatResponse> {
  const poemText = payload.lines.join("\n").trim();
  const cleanAnswer = payload.answer.trim();

  if (!poemText) {
    return { letter: null, error: "Letter poem content cannot be empty." };
  }
  if (!cleanAnswer || cleanAnswer.length < 1 || cleanAnswer.length > 100) {
    return { letter: null, error: "Cipher answer must be between 1 and 100 characters." };
  }
  if (!payload.clue1.trim() || !payload.clue2.trim()) {
    return { letter: null, error: "Please provide both clues for your riddle." };
  }

  try {
    const { data: khatId, error } = await supabase.rpc("create_secret_khat_rpc", {
      p_recipient_identifier: payload.recipientIdentifier.trim() || "anonymous_recipient",
      p_poem_content: poemText,
      p_clue_one: payload.clue1.trim(),
      p_clue_two: payload.clue2.trim(),
      p_secret_answer: cleanAnswer,
      p_wax_seal_color: payload.seal || "crimson",
    });

    if (error || !khatId) {
      return { letter: null, error: error?.message || "Failed to seal secret letter in database." };
    }

    const createdLetter: Letter = {
      id: khatId,
      lines: payload.lines,
      clue1: payload.clue1,
      clue2: payload.clue2,
      seal: payload.seal,
      from: payload.from,
      isUnlocked: false,
    };

    return { letter: createdLetter, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to seal secret letter.";
    return { letter: null, error: message };
  }
}

/**
 * Fetch a sealed letter by ID via secure RPC.
 * Never exposes the riddle answer, recipient PII, or the sender's identity prior to unlock (Fixes RT-01, AS-01).
 */
export async function fetchSecretKhat(id: string): Promise<Letter | null> {
  if (!id || id === "demo") return null;

  try {
    const { data, error } = await supabase.rpc("get_secret_khat_by_id", {
      p_khat_id: id,
    });

    if (error || !data || !Array.isArray(data) || data.length === 0) {
      return null;
    }

    const row = data[0];
    if (!row) return null;

    return {
      id: row.id,
      lines: (row.poem_content || "").split("\n"),
      clue1: row.clue_one || "",
      clue2: row.clue_two || "",
      seal: (row.wax_seal_color as "crimson" | "royal") || "crimson",
      isUnlocked: Boolean(row.is_unlocked),
      // Sender identity is ONLY revealed by the RPC if the letter is actually unlocked
      from: row.is_unlocked && row.sender_takhallus ? row.sender_takhallus : "A secret admirer",
    };
  } catch (err) {
    console.warn("[KhatsService] fetchSecretKhat exception:", err);
    return null;
  }
}

/**
 * Unlock a secret letter via Server-Side RPC.
 * Compares against bcrypt hash with strict 5-attempt brute-force protection (Fixes RT-02, AS-01).
 */
export async function attemptUnlockKhat(
  khatId: string,
  guess: string
): Promise<UnlockKhatResponse> {
  const cleanGuess = guess.trim();
  if (!cleanGuess) {
    return { correct: false, error: "Please enter your guess." };
  }

  try {
    const { data, error } = await supabase.rpc("unlock_secret_khat_rpc", {
      p_khat_id: khatId,
      p_guess: cleanGuess,
    });

    if (error || !data || !Array.isArray(data) || data.length === 0) {
      return { correct: false, error: error?.message || "Failed to verify riddle answer." };
    }

    const result = data[0];
    if (!result) {
      return { correct: false, error: "No response from verification RPC." };
    }

    return {
      correct: Boolean(result.unlocked),
      sender: result.sender_takhallus || undefined,
      remainingAttempts: typeof result.remaining_attempts === "number" ? result.remaining_attempts : undefined,
      error: result.error_message || null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to verify answer.";
    return { correct: false, error: message };
  }
}
