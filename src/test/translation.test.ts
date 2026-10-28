import { describe, it, expect } from "vitest";
import {
  detectScript,
  composeFallbackTranslation,
  TranslationInputSchema,
  TranslationResultSchema,
} from "../lib/translation.service";

describe("Translation Service & Script Detection", () => {
  describe("detectScript()", () => {
    it("should accurately detect Hindi (Devanagari script)", () => {
      const hindiSher = "तू किसी रेल सी गुज़रती है,\nमैं किसी पुल सा थरथराता हूँ।";
      expect(detectScript(hindiSher)).toBe("hindi");

      const singleHindiWord = "मोहब्बत";
      expect(detectScript(singleHindiWord)).toBe("hindi");
    });

    it("should accurately detect Urdu (Nastaliq / Perso-Arabic script)", () => {
      const urduSher = "دلِ ناداں تجھے ہوا کیا ہے\nآخر اس درد کی دوا کیا ہے";
      expect(detectScript(urduSher)).toBe("urdu");

      const singleUrduWord = "عشق";
      expect(detectScript(singleUrduWord)).toBe("urdu");
    });

    it("should accurately detect Hinglish (Roman Hindi/Urdu in Latin script)", () => {
      const hinglishSher = "tu kisi rail si guzarti hai\nmain kisi pul sa thartharata hoon";
      expect(detectScript(hinglishSher)).toBe("hinglish");

      const hinglishCouplet = "dil ki baat aankhon se bayaan hoti hai\nteri yaad har raat satati hai";
      expect(detectScript(hinglishCouplet)).toBe("hinglish");
    });

    it("should accurately detect English poetry in Latin script", () => {
      const englishVerse = "The moon watches silently as shadows fall across the quiet night,\nAnd love whispers secrets that the heart cannot deny.";
      expect(detectScript(englishVerse)).toBe("english");
    });

    it("defaults gracefully to hinglish for empty or whitespace strings", () => {
      expect(detectScript("")).toBe("hinglish");
      expect(detectScript("   ")).toBe("hinglish");
    });
  });

  describe("composeFallbackTranslation()", () => {
    it("preserves canonical source lines in detected script and produces all 4 formats", () => {
      const originalLines = [
        "tu kisi rail si guzarti hai",
        "main kisi pul sa thartharata hoon",
      ];
      const fallback = composeFallbackTranslation(originalLines, "hinglish");

      expect(fallback.sourceLanguage).toBe("hinglish");
      expect(fallback.hinglish).toEqual(originalLines);
      expect(fallback.hindi).toBeDefined();
      expect(fallback.urdu).toBeDefined();
      expect(fallback.english).toBeDefined();
      expect(fallback.english.length).toBe(originalLines.length);
    });

    it("preserves Hindi original without alteration in hindi field", () => {
      const originalLines = [
        "तू किसी रेल सी गुज़रती है",
        "मैं किसी पुल सा थरथराता हूँ",
      ];
      const fallback = composeFallbackTranslation(originalLines, "hindi");

      expect(fallback.sourceLanguage).toBe("hindi");
      expect(fallback.hindi).toEqual(originalLines);
    });
  });

  describe("Zod Schema Validation", () => {
    it("validates valid translation input", () => {
      const input = {
        poemId: "test-poem-123",
        sourceLines: ["line 1", "line 2"],
        sourceScript: "hinglish",
      };
      const parsed = TranslationInputSchema.parse(input);
      expect(parsed.poemId).toBe("test-poem-123");
    });

    it("rejects empty source lines", () => {
      const invalidInput = {
        poemId: "test-poem-123",
        sourceLines: [],
      };
      expect(() => TranslationInputSchema.parse(invalidInput)).toThrow();
    });

    it("validates complete translation result with all 4 scripts", () => {
      const result = {
        sourceLanguage: "hinglish",
        hinglish: ["tu kisi rail si guzarti hai"],
        hindi: ["तू किसी रेल सी गुज़रती है"],
        urdu: ["تو کسی ریل سی گزرتی ہے"],
        english: ["You pass by like a train"],
      };
      const parsed = TranslationResultSchema.parse(result);
      expect(parsed.sourceLanguage).toBe("hinglish");
      expect(parsed.english[0]).toBe("You pass by like a train");
    });
  });
});
