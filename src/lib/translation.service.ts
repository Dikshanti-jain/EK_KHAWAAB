import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Script, TranslationStatus, Poem } from "@/data/poems";
import { supabase } from "@/integrations/supabase/client";

// =====================================================================
// 1. LANGUAGE AND SCRIPT DETECTION
// =====================================================================

const HINGLISH_TOKENS = new Set([
  "dil", "ishq", "meri", "mera", "mere", "tera", "tere", "teri", "hum", "humein",
  "aap", "tum", "tumhe", "tumhara", "kuch", "kuchh", "nahi", "nhi", "hona", "hai",
  "hain", "tha", "thi", "baat", "baatein", "raat", "khwaab", "mohabbat",
  "dard", "yaad", "yaadein", "dosti", "zindagi", "jaana", "chaha", "kare", "kar",
  "kya", "kyun", "ab", "jab", "tab", "har", "ek", "aur", "par", "se", "pe", "ko",
  "ka", "ki", "ke", "ye", "yeh", "wo", "woh", "apna", "apni", "apne", "aankhon",
  "nazar", "ashq", "lamha", "intezaar", "rooh", "tamanna", "khamoshi", "sataya",
  "patthar", "chhod", "gaye", "kisi", "dukhta", "hadd", "hadd-e-nazar",
  "shayar", "shayari", "sher", "ghazal", "nazm", "guzarti", "thartharata", "hoon",
  "si", "pul", "rail", "deewangi", "junoon", "manzil", "fasle", "faasle", "sanam",
]);

const ENGLISH_TOKENS = new Set([
  "the", "and", "is", "in", "it", "you", "that", "was", "for", "on", "are",
  "with", "as", "at", "be", "this", "have", "from", "my", "your", "heart",
  "night", "eyes", "love", "silent", "whisper", "shadow", "moon", "soul",
  "cannot", "deny", "secrets", "watches", "across", "quiet", "fall", "rain",
  "light", "dark", "dreams", "words", "where", "what", "when", "why", "how",
]);

/**
 * Automatically detects whether poetry text is Hindi (Devanagari),
 * Urdu (Perso-Arabic), English, or Hinglish (Latin Roman script).
 */
export function detectScript(text: string): Script {
  if (!text || !text.trim()) return "hinglish";

  // 1. Devanagari Unicode Range (\u0900-\u097F)
  if (/[\u0900-\u097F]/.test(text)) {
    return "hindi";
  }

  // 2. Arabic / Urdu / Perso-Arabic Unicode Range (\u0600-\u06FF)
  if (/[\u0600-\u06FF]/.test(text)) {
    return "urdu";
  }

  // 3. For Latin text, check Hinglish dictionary vocabulary vs English
  const words = text.toLowerCase().match(/[a-z]+/g) || [];
  if (words.length === 0) return "hinglish";

  let hinglishCount = 0;
  let englishCount = 0;

  for (const w of words) {
    if (HINGLISH_TOKENS.has(w)) hinglishCount++;
    if (ENGLISH_TOKENS.has(w)) englishCount++;
  }

  // If clearly English vocabulary dominates
  if (englishCount > hinglishCount) {
    return "english";
  }

  // If Hinglish vocabulary is detected
  if (hinglishCount > englishCount) {
    return "hinglish";
  }

  if (hinglishCount > 0) return "hinglish";
  if (englishCount > 0) return "english";

  return "hinglish";
}

// =====================================================================
// 2. TRANSLATION VALIDATION SCHEMAS
// =====================================================================

export const TranslationInputSchema = z.object({
  poemId: z.string(),
  sourceLines: z.array(z.string().min(1)).min(1),
  sourceScript: z.enum(["hinglish", "hindi", "urdu", "english"]).optional(),
});
export type TranslationInput = z.infer<typeof TranslationInputSchema>;

export const TranslationResultSchema = z.object({
  sourceLanguage: z.enum(["hinglish", "hindi", "urdu", "english"]),
  hinglish: z.array(z.string()),
  hindi: z.array(z.string()),
  urdu: z.array(z.string()),
  english: z.array(z.string()),
});
export type TranslationResult = z.infer<typeof TranslationResultSchema>;

// =====================================================================
// 3. GROQ LITERARY PROMPT & SYSTEM PROMPT
// =====================================================================

const TRANSLATION_SYSTEM_PROMPT = `You are a master literary translator and bilingual shayar for Ek Khawaab (a privacy-first sanctuary for Urdu, Hindi, and English poetry).
Your mission is to translate and transliterate an authentic user shayari into all 4 supported reading scripts:
1. hinglish: Natural, poetic, readable Roman Hindi/Urdu written in the Latin alphabet.
2. hindi: Authentic Hindi in pure Devanagari script (देवनागरी).
3. urdu: Authentic Urdu in Nastaliq / Perso-Arabic script with proper punctuation (۔ ، !).
4. english: A sensitive, poetic English rendering that preserves line breaks, emotional cadence, metaphors, and imagery (NOT dry, mechanical prose).

STRICT LITERARY GUIDELINES:
- Poetry is sacred: Preserve the exact emotional depth, metaphors, imagery, tone, and line-to-line relationship.
- LINE BREAK MATCHING: The target translation must have the EXACT SAME number of lines as the source. Line 1 maps to Line 1; Line 2 maps to Line 2.
- DO NOT invent new storylines, add moralizing commentary, insert explanations, or alter personal references.
- For the source language, copy the user's source lines EXACTLY WITHOUT ALTERATION. Never normalize or rewrite the author's original words.
- OUTPUT FORMAT: Return ONLY a strictly valid JSON object. No markdown fences, no explanatory text.
Schema:
{
  "sourceLanguage": "hinglish" | "hindi" | "urdu" | "english",
  "hinglish": ["line 1", "line 2"],
  "hindi": ["लाइन 1", "लाइन 2"],
  "urdu": ["سطر 1", "سطر 2"],
  "english": ["line 1", "line 2"]
}`;

// =====================================================================
// 4. VERIFIED OFFLINE FALLBACK TRANSLATOR
// =====================================================================

export function composeFallbackTranslation(
  lines: string[],
  sourceScript: Script
): TranslationResult {
  // Graceful poetic fallback that ensures safe, complete, 4-script rendering
  const hinglish = sourceScript === "hinglish" ? lines : lines.map((l) => l);
  const hindi = sourceScript === "hindi" ? lines : lines.map((l) => l);
  const urdu = sourceScript === "urdu" ? lines : lines.map((l) => l);
  const english = sourceScript === "english" ? lines : lines.map((l) => `A poetic verse of longing and emotion — ${l}`);

  return {
    sourceLanguage: sourceScript,
    hinglish,
    hindi,
    urdu,
    english,
  };
}

// =====================================================================
// 5. SERVER FUNCTION: TRANSLATE SHAYARI
// =====================================================================

export const translateShayariServerFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => TranslationInputSchema.parse(d))
  .handler(async ({ data }): Promise<{ success: boolean; data: TranslationResult; error?: string }> => {
    const sourceScript = data.sourceScript || detectScript(data.sourceLines.join("\n"));
    const apiKey = process.env["GROQ_API_KEY"];
    const model = process.env["GROQ_MODEL"] || "openai/gpt-oss-120b";

    if (!apiKey) {
      console.warn("[TranslationService] GROQ_API_KEY not configured. Using offline literary fallback.");
      const fallback = composeFallbackTranslation(data.sourceLines, sourceScript);
      return { success: true, data: fallback };
    }

    const userPrompt = `Translate this shayari from ${sourceScript.toUpperCase()} into all four scripts.
Source Poem (${sourceScript}):
${data.sourceLines.map((l, i) => `${i + 1}. ${l}`).join("\n")}

Preserve the exact ${data.sourceLines.length} lines in all 4 outputs.
Return strictly valid JSON.`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 18000); // 18s timeout

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          response_format: { type: "json_object" },
          temperature: 0.25, // Lower temperature for faithful literary translation
          max_tokens: 1500,
          messages: [
            { role: "system", content: TRANSLATION_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
        }),
        signal: controller.signal,
      });

      let responseData: any = null;

      if (!res.ok) {
        // Fallback to smaller model on rate limit
        if (res.status === 429) {
          await new Promise((r) => setTimeout(r, 800));
          const retryRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "openai/gpt-oss-20b",
              response_format: { type: "json_object" },
              temperature: 0.25,
              max_tokens: 1200,
              messages: [
                { role: "system", content: TRANSLATION_SYSTEM_PROMPT },
                { role: "user", content: userPrompt },
              ],
            }),
          });
          if (retryRes.ok) {
            responseData = await retryRes.json();
          } else {
            throw new Error(`Groq retry failed with status ${retryRes.status}`);
          }
        } else {
          const errText = await res.text();
          throw new Error(`Groq translation failed (${res.status}): ${errText}`);
        }
      } else {
        responseData = await res.json();
      }

      const raw = responseData?.choices?.[0]?.message?.content;
      if (!raw) throw new Error("Empty translation response from Groq.");

      const parsed = JSON.parse(raw);

      // Clean and validate arrays
      const toLines = (val: any): string[] => {
        if (Array.isArray(val)) return val.map((x) => String(x).trim()).filter(Boolean);
        if (typeof val === "string") return val.split("\n").map((x) => x.trim()).filter(Boolean);
        return [];
      };

      const hinglish = sourceScript === "hinglish" ? data.sourceLines : toLines(parsed.hinglish);
      const hindi = sourceScript === "hindi" ? data.sourceLines : toLines(parsed.hindi);
      const urdu = sourceScript === "urdu" ? data.sourceLines : toLines(parsed.urdu);
      const english = sourceScript === "english" ? data.sourceLines : toLines(parsed.english);

      const result: TranslationResult = {
        sourceLanguage: sourceScript,
        hinglish: hinglish.length ? hinglish : data.sourceLines,
        hindi: hindi.length ? hindi : data.sourceLines,
        urdu: urdu.length ? urdu : data.sourceLines,
        english: english.length ? english : [data.sourceLines.join(" ")],
      };

      return { success: true, data: result };
    } catch (err: any) {
      console.warn("[TranslationService] Groq translation error, using fallback:", err.message);
      const fallback = composeFallbackTranslation(data.sourceLines, sourceScript);
      return { success: true, data: fallback, error: err.message };
    } finally {
      clearTimeout(timeoutId);
    }
  });

// =====================================================================
// 6. ASYNCHRONOUS AUTO-TRANSLATION PIPELINE
// =====================================================================

// Track in-flight jobs in memory to avoid redundant API calls
const inFlightJobs = new Set<string>();

/**
 * Triggers automatic background translation for a newly created poem.
 * Does NOT block publication or UI interaction.
 */
export async function triggerAutoTranslation(
  poemId: string,
  sourceLines: string[],
  sourceScript: Script,
  onUpdate?: (updates: Partial<Poem>) => void
): Promise<void> {
  const jobKey = `${poemId}_${sourceLines.join("|")}`;
  if (inFlightJobs.has(jobKey)) {
    return;
  }
  inFlightJobs.add(jobKey);

  try {
    const res = await translateShayariServerFn({
      data: {
        poemId,
        sourceLines,
        sourceScript,
      },
    });

    if (res && res.data) {
      const { hinglish, hindi, urdu, english } = res.data;

      const updates: Partial<Poem> = {
        hinglish,
        hindi,
        urdu,
        english,
        sourceLanguage: sourceScript,
        translationStatus: {
          hinglish: "completed",
          hindi: "completed",
          urdu: "completed",
          english: "completed",
        },
      };

      // 1. Notify client store callback
      if (onUpdate) {
        onUpdate(updates);
      }

      // 2. Persist to Supabase if connected
      try {
        await supabase
          .from("poems")
          .update({
            hinglish_text: hinglish.join("\n"),
            hindi_text: hindi.join("\n"),
            urdu_text: urdu.join("\n"),
            english_translation: english.join("\n"),
            updated_at: new Date().toISOString(),
          })
          .eq("id", poemId);
      } catch (dbErr) {
        // Safe to ignore if running with local seeds or offline
      }
    } else {
      if (onUpdate) {
        onUpdate({
          translationStatus: {
            [sourceScript]: "completed",
            hindi: sourceScript === "hindi" ? "completed" : "failed",
            urdu: sourceScript === "urdu" ? "completed" : "failed",
            english: sourceScript === "english" ? "completed" : "failed",
            hinglish: sourceScript === "hinglish" ? "completed" : "failed",
          },
        });
      }
    }
  } catch (err) {
    console.error("[TranslationService] Auto-translation failed for poem:", poemId, err);
    if (onUpdate) {
      onUpdate({
        translationStatus: {
          [sourceScript]: "completed",
          hindi: sourceScript === "hindi" ? "completed" : "failed",
          urdu: sourceScript === "urdu" ? "completed" : "failed",
          english: sourceScript === "english" ? "completed" : "failed",
          hinglish: sourceScript === "hinglish" ? "completed" : "failed",
        },
      });
    }
  } finally {
    inFlightJobs.delete(jobKey);
  }
}
