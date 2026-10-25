import { z } from "zod";

// ------------------------------------------------------------------
// 1. INPUT VALIDATION SCHEMAS
// ------------------------------------------------------------------

export const POETRY_TYPES = [
  "shayari",      // Two-line couplet / Sher
  "ghazal",       // Traditional ghazal (multi-couplet with matla, radif & qafiya)
  "nazm",         // Thematic progression
  "micropoetry",  // Compact, minimalist lines
  "freeverse",    // Azad Nazm (rhythmic, non-rhyming)
  "rubai",        // 4-line quatrain (AABA scheme)
  "caption",      // Social-ready short couplet
  "continue",     // Completes unfinished lines
  "improve",      // Polishes meter & rhyme without losing meaning
  "translate",    // Translation & transliteration
] as const;
export type PoetryType = (typeof POETRY_TYPES)[number];

export const POETRY_MOODS = [
  "Quiet longing",
  "Soft & tender",
  "Deep melancholy",
  "Reflective",
  "Hopeful",
  "Nostalgic",
  "Apologetic",
  "Romantic",
  "Existential",
  "Playful",
  "Assertive",
  "Sufi reflection",
] as const;
export type PoetryMood = (typeof POETRY_MOODS)[number];

export const SUGGESTED_TAGS = [
  "#Ishq",
  "#Dard",
  "#Tanhai",
  "#Intezaar",
  "#Yaadein",
  "#Maafi",
  "#Umeed",
  "#Dosti",
  "#Zindagi",
  "#Khwaab",
  "#AdhuriBaat",
  "#UnspokenFeelings",
] as const;

export const ShayarRequestSchema = z.object({
  situation: z.string().max(1000).optional().default(""),
  phrases: z.array(z.string().min(1).max(60)).max(6).optional().default([]),
  isPhraseMandatory: z.boolean().optional().default(false),
  tags: z.array(z.string().max(30)).max(8).optional().default([]),
  poetryType: z.enum(POETRY_TYPES).default("shayari"),
  primaryLanguage: z.enum(["hinglish", "hindi", "urdu", "english"]).default("hinglish"),
  mood: z.enum(POETRY_MOODS).default("Quiet longing"),
  intensity: z.enum(["Subtle", "Moderate", "Deep"]).default("Moderate"),
  
  // Advanced Literary Controls
  length: z.enum(["couplet", "qata", "short", "full"]).default("couplet"),
  vocabComplexity: z.enum(["conversational", "classical"]).default("conversational"),
  rhymePreference: z.enum(["rhymed", "free"]).default("rhymed"),
  radif: z.string().max(40).optional().default(""),
  qafiya: z.string().max(40).optional().default(""),
  metaphorDensity: z.enum(["minimal", "moderate", "rich"]).default("moderate"),
  perspective: z.enum(["first_person", "observational"]).default("first_person"),
  avoidWords: z.string().max(200).optional().default(""),
  
  // Existing Draft (for improve or continue)
  draftText: z.string().max(1200).optional().default(""),
  poeticStyleLens: z.string().optional().default(""),
});
export type ShayarRequest = z.infer<typeof ShayarRequestSchema>;

// ------------------------------------------------------------------
// 2. OUTPUT VALIDATION SCHEMAS
// ------------------------------------------------------------------

export const ContinuationSchema = z.object({
  hinglish: z.string(),
  hindi: z.string(),
  urdu: z.string(),
});

export const AlternativeVersionSchema = z.object({
  hinglish: z.array(z.string()),
  hindi: z.array(z.string()),
  urdu: z.array(z.string()),
  note: z.string().optional(),
});

export const ShayarResponseSchema = z.object({
  requestId: z.string(),
  poetryType: z.string(),
  title: z.string().nullable().default(null),
  hinglish: z.array(z.string()),
  hindi: z.array(z.string()),
  urdu: z.array(z.string()),
  english: z.string(),
  usedPhrases: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  originalDraft: z.string().optional(),
  alternatives: z.array(AlternativeVersionSchema).optional().default([]),
  continuations: z.array(ContinuationSchema).optional().default([]),
  validation: z.object({
    requiredPhrasesPresent: z.boolean(),
    structureValid: z.boolean(),
    notes: z.string().optional(),
  }),
});
export type ShayarResponse = z.infer<typeof ShayarResponseSchema>;

// ------------------------------------------------------------------
// 3. SHAYAR-E-KHAWAAB SYSTEM PROMPT
// ------------------------------------------------------------------

const SYSTEM_PROMPT = `You are Shayar-e-Khawaab, the multilingual AI writing companion for EK Khawaab.
Your purpose is to help people transform their own experiences, unfinished thoughts, carefully chosen words and emotions into meaningful, original poetry.
You are not a generic quote generator. Your writing must be strictly specific to the user's supplied context.

CORE PRINCIPLE: SPECIFICITY BEFORE DECORATION
- Before composing, identify the concrete details, emotional tension, and factual boundaries contained in the user's input.
- A poem must be recognizably connected to the supplied situation, not merely to its broad emotional category.
- If two inputs describe different events, their poems MUST differ in imagery, emotional progression, details and meaning.
- DO NOT rely on generic placeholder words like "dard", "khamoshi", "aankhein", "raat", "tanhaai", "dil" or "yaadein" simply because the user requested sad or romantic poetry. Use them only when contextually justified.
- PRESERVE THE USER'S MEANING: Do NOT invent breakups, betrayals, deaths, affairs, or promises if the user described college nervousness, friendship farewells, or an apology.
- Do NOT turn friendship into romance. Do NOT turn regret into self-pity.

FORMS AND STRUCTURES:
- shayari: A single focused, memorable couplet (Sher - 2 lines).
- ghazal: 2 to 4 couplets sharing radif (refrain) and qafiya (rhyme base).
- nazm: 4 to 8 lines with coherent progression from beginning to middle to ending.
- micropoetry: 2 compact, minimalist, punchy lines.
- freeverse: deliberate line breaks and rhythm without forced end-rhymes.
- rubai: 4-line quatrain following AABA rhyme.
- caption: 2 crisp, social-ready lines.
- continue: Keep the user's opening line intact as line 1, and provide seamless completion lines + 3 alternative continuation couplets.
- improve: Polish meter, rhyme and cadence of the user's draft while preserving its exact intent.
- translate: Faithfully translate and transliterate between scripts.

MULTILINGUAL OUTPUT REQUIREMENT:
You MUST return the exact same poem in THREE synchronized scripts (same number of lines):
1. hinglish: Natural, readable conversational Roman Urdu/Hindi.
2. hindi: Proper Devanagari script.
3. urdu: Authentic Urdu Nastaliq script with proper punctuation (۔ ، !).
4. english: A sensitive 2-sentence poetic English interpretation of the meaning.

RESPONSE FORMAT (STRICT JSON ONLY):
You must output ONLY valid JSON matching this schema:
{
  "title": string or null,
  "hinglish": ["line 1", "line 2", ...],
  "hindi": ["line 1", "line 2", ...],
  "urdu": ["line 1", "line 2", ...],
  "english": "Poetic English explanation",
  "usedPhrases": ["phrase1"],
  "tags": ["#Tag1", "#Tag2"],
  "alternatives": [
    {
      "hinglish": ["alt line 1", "alt line 2"],
      "hindi": ["alt line 1", "alt line 2"],
      "urdu": ["alt line 1", "alt line 2"],
      "note": "Optional stylistic distinction"
    }
  ],
  "continuations": [
    {
      "hinglish": "Continuation line 2",
      "hindi": "कंटिन्यूएशन लाइन २",
      "urdu": "کنٹینیوایشن لائن ۲"
    }
  ],
  "notes": "Short note on literary devices used"
}`;

// ------------------------------------------------------------------
// 4. CREATIVE BRIEF BUILDER
// ------------------------------------------------------------------

export function buildCreativeBrief(req: ShayarRequest): string {
  const parts: string[] = [];

  parts.push(`POETRY TYPE: ${req.poetryType.toUpperCase()}`);
  parts.push(`DESIRED MOOD: ${req.mood} (Intensity: ${req.intensity})`);
  parts.push(`TARGET LENGTH: ${req.length}`);
  parts.push(`VOCABULARY COMPLEXITY: ${req.vocabComplexity}`);
  parts.push(`RHYME PREFERENCE: ${req.rhymePreference}`);

  if (req.radif) parts.push(`DESIRED RADIF (REFRAIN): "${req.radif}"`);
  if (req.qafiya) parts.push(`DESIRED QAFIYA (RHYME): "${req.qafiya}"`);
  if (req.perspective) parts.push(`PERSPECTIVE: ${req.perspective.replace("_", " ")}`);

  if (req.tags && req.tags.length > 0) {
    parts.push(`SEMANTIC THEME TAGS: ${req.tags.join(", ")} (interpret as thematic guides, do not paste mechanically into lines)`);
  }

  if (req.phrases && req.phrases.length > 0) {
    const status = req.isPhraseMandatory ? "MANDATORY (MUST be incorporated naturally into the verse)" : "OPTIONAL INSPIRATION";
    parts.push(`USER PHRASES [${status}]: ${req.phrases.map((p) => `"${p}"`).join(", ")}`);
  }

  if (req.avoidWords) {
    parts.push(`WORDS OR CLICHÉS TO AVOID: ${req.avoidWords}`);
  }

  if (req.poeticStyleLens) {
    parts.push(`STYLISTIC INFLUENCE: ${req.poeticStyleLens}`);
  }

  if (req.poetryType === "improve" || req.poetryType === "continue") {
    parts.push(`USER'S ORIGINAL DRAFT / UNFINISHED LINES:\n"""\n${req.draftText}\n"""`);
    if (req.poetryType === "continue") {
      parts.push(`INSTRUCTION: Keep user's line as line 1. Provide a cohesive continuation and 3 alternative couplet endings under 'continuations'.`);
    } else {
      parts.push(`INSTRUCTION: Polish meter, flow, and vocabulary while keeping user's exact emotional meaning. Provide an alternative polish under 'alternatives'.`);
    }
  }

  if (req.situation) {
    parts.push(`USER'S RAW SITUATION / UNSTRUCTURED WORDS:\n"""\n${req.situation}\n"""`);
    parts.push(`CRITICAL: Ground the imagery, metaphors, and specific verbs directly in this situation. Avoid generic heartbreak or clichéd pain.`);
  }

  return parts.join("\n\n");
}

// ------------------------------------------------------------------
// 5. DETERMINISTIC VALIDATION & FALLBACK ENGINES
// ------------------------------------------------------------------

export function validateRequiredPhrases(lines: string[], phrases: string[]): boolean {
  if (!phrases || phrases.length === 0) return true;
  const fullText = lines.join(" ").toLowerCase();
  // Check if at least one or all mandatory phrases appear
  return phrases.some((p) => fullText.includes(p.trim().toLowerCase()));
}

// ------------------------------------------------------------------
// 6. GROQ CALL PIPELINE
// ------------------------------------------------------------------

export async function callGroqShayar(req: ShayarRequest): Promise<ShayarResponse> {
  const apiKey = process.env["GROQ_API_KEY"];
  const model = process.env["GROQ_MODEL"] || "openai/gpt-oss-120b";
  const requestId = `shayar_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured on the server.");
  }

  const creativeBrief = buildCreativeBrief(req) + "\n\nCRITICAL: Return output as a strictly valid JSON object.";

  const payload = {
    model,
    response_format: { type: "json_object" },
    temperature: 0.72,
    max_tokens: 2500,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: creativeBrief },
    ],
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    let responseData: any = null;

    if (!res.ok) {
      const errText = await res.text();
      let errMsg = `Groq API responded with status ${res.status}`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error?.message) errMsg = parsed.error.message;
      } catch {}

      // If rate limited, attempt an immediate fallback to openai/gpt-oss-20b
      if (res.status === 429 || errMsg.toLowerCase().includes("rate limit")) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        const retryRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...payload,
            model: "openai/gpt-oss-20b",
            max_tokens: 1500,
          }),
        });

        if (retryRes.ok) {
          responseData = await retryRes.json();
        } else {
          throw new Error(errMsg);
        }
      } else {
        throw new Error(errMsg);
      }
    } else {
      responseData = await res.json();
    }

    const rawContent = responseData?.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new Error("Groq API returned an empty completion.");
    }

    const parsedJson = JSON.parse(rawContent);

    // Validate structure
    const hinglish: string[] = Array.isArray(parsedJson.hinglish)
      ? parsedJson.hinglish.map(String)
      : typeof parsedJson.hinglish === "string"
        ? parsedJson.hinglish.split("\n").filter(Boolean)
        : [];

    const hindi: string[] = Array.isArray(parsedJson.hindi)
      ? parsedJson.hindi.map(String)
      : typeof parsedJson.hindi === "string"
        ? parsedJson.hindi.split("\n").filter(Boolean)
        : hinglish;

    const urdu: string[] = Array.isArray(parsedJson.urdu)
      ? parsedJson.urdu.map(String)
      : typeof parsedJson.urdu === "string"
        ? parsedJson.urdu.split("\n").filter(Boolean)
        : hinglish;

    const english: string = parsedJson.english || "A poetic reflection created from your words.";

    const usedPhrases: string[] = Array.isArray(parsedJson.usedPhrases)
      ? parsedJson.usedPhrases.map(String)
      : req.phrases || [];

    const phrasesPresent = req.isPhraseMandatory
      ? validateRequiredPhrases(hinglish, req.phrases || [])
      : true;

    return {
      requestId,
      poetryType: req.poetryType,
      title: parsedJson.title || null,
      hinglish,
      hindi,
      urdu,
      english,
      usedPhrases,
      tags: req.tags || [],
      originalDraft: req.draftText || undefined,
      alternatives: Array.isArray(parsedJson.alternatives) ? parsedJson.alternatives : [],
      continuations: Array.isArray(parsedJson.continuations) ? parsedJson.continuations : [],
      validation: {
        requiredPhrasesPresent: phrasesPresent,
        structureValid: hinglish.length > 0,
        notes: parsedJson.notes || undefined,
      },
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
