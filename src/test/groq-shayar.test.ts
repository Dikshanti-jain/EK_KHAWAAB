import { describe, it, expect } from "vitest";
import {
  buildCreativeBrief,
  validateRequiredPhrases,
  callGroqShayar,
  type ShayarRequest,
} from "@/lib/groq.service";

describe("Groq Shayar-e-Khawaab Service Tests", () => {
  it("builds a thorough creative brief with all semantic constraints", () => {
    const req: ShayarRequest = {
      situation: "College library silence, eye contact but no conversation",
      phrases: ["Baarish", "Khamoshi"],
      isPhraseMandatory: true,
      tags: ["#Intezaar", "#UnspokenFeelings"],
      poetryType: "shayari",
      primaryLanguage: "hinglish",
      mood: "Quiet longing",
      intensity: "Moderate",
      length: "couplet",
      vocabComplexity: "conversational",
      rhymePreference: "rhymed",
      radif: "rehti hai",
      qafiya: "teri",
      metaphorDensity: "moderate",
      perspective: "first_person",
      avoidWords: "bewafa, maut",
      draftText: "",
      poeticStyleLens: "Jaun Elia existential irony",
    };

    const brief = buildCreativeBrief(req);
    expect(brief).toContain("POETRY TYPE: SHAYARI");
    expect(brief).toContain("DESIRED MOOD: Quiet longing");
    expect(brief).toContain('USER PHRASES [MANDATORY (MUST be incorporated naturally into the verse)]: "Baarish", "Khamoshi"');
    expect(brief).toContain("SEMANTIC THEME TAGS: #Intezaar, #UnspokenFeelings");
    expect(brief).toContain('DESIRED RADIF (REFRAIN): "rehti hai"');
    expect(brief).toContain("WORDS OR CLICHÉS TO AVOID: bewafa, maut");
    expect(brief).toContain("College library silence, eye contact but no conversation");
  });

  it("validates presence of mandatory phrases accurately", () => {
    const lines = [
      "Ek pyali chai aur khidki par bikhri shabnam",
      "Tera naam lia to waqt thahar gaya aahista",
    ];

    expect(validateRequiredPhrases(lines, ["chai"])).toBe(true);
    expect(validateRequiredPhrases(lines, ["waqt"])).toBe(true);
    expect(validateRequiredPhrases(lines, ["samundar"])).toBe(false);
  });

  it("executes live Groq request and returns verified structured 3-script output", async () => {
    const req: ShayarRequest = {
      situation: "I see her every day in college, but cannot start a conversation. I don't want to make her uncomfortable.",
      phrases: ["library", "silent"],
      isPhraseMandatory: false,
      tags: ["#UnspokenFeelings", "#Intezaar"],
      poetryType: "shayari",
      primaryLanguage: "hinglish",
      mood: "Soft & tender",
      intensity: "Moderate",
      length: "couplet",
      vocabComplexity: "conversational",
      rhymePreference: "rhymed",
      radif: "",
      qafiya: "",
      metaphorDensity: "moderate",
      perspective: "first_person",
      avoidWords: "bewafa, dhokha",
      draftText: "",
      poeticStyleLens: "Conversational Hindustani with quiet restraint",
    };

    const res = await callGroqShayar(req);

    expect(res.requestId).toBeTruthy();
    expect(res.poetryType).toBe("shayari");
    expect(res.hinglish.length).toBeGreaterThanOrEqual(2);
    expect(res.hindi.length).toBeGreaterThanOrEqual(2);
    expect(res.urdu.length).toBeGreaterThanOrEqual(2);
    expect(res.english).toBeTruthy();
    expect(res.validation.structureValid).toBe(true);

    // Verify it doesn't invent toxic or dramatic heartbreak clichés
    const combined = res.hinglish.join(" ").toLowerCase();
    expect(combined).not.toContain("bewafa");
    expect(combined).not.toContain("dhokha");
  }, 25000);

  it("personalization counterfactual test: ensures distinct situations produce distinct imagery", async () => {
    const reqA: ShayarRequest = {
      situation: "I see her every day in college, but cannot start a conversation. I don't want to make her uncomfortable.",
      phrases: [],
      isPhraseMandatory: false,
      tags: ["#Dard"],
      poetryType: "shayari",
      primaryLanguage: "hinglish",
      mood: "Quiet longing",
      intensity: "Moderate",
      length: "couplet",
      vocabComplexity: "conversational",
      rhymePreference: "rhymed",
      radif: "",
      qafiya: "",
      metaphorDensity: "moderate",
      perspective: "first_person",
      avoidWords: "",
      draftText: "",
      poeticStyleLens: "",
    };

    const reqB: ShayarRequest = {
      situation: "My best friend is leaving Jaipur, and I want to write about our memories without making it sound like a goodbye forever.",
      phrases: [],
      isPhraseMandatory: false,
      tags: ["#Dard"],
      poetryType: "shayari",
      primaryLanguage: "hinglish",
      mood: "Quiet longing",
      intensity: "Moderate",
      length: "couplet",
      vocabComplexity: "conversational",
      rhymePreference: "rhymed",
      radif: "",
      qafiya: "",
      metaphorDensity: "moderate",
      perspective: "first_person",
      avoidWords: "",
      draftText: "",
      poeticStyleLens: "",
    };

    const resA = await callGroqShayar(reqA);
    await new Promise((resolve) => setTimeout(resolve, 800));
    const resB = await callGroqShayar(reqB);

    const textA = resA.hinglish.join(" ");
    const textB = resB.hinglish.join(" ");

    // The two poems must NOT be identical despite having the same #Dard tag!
    expect(textA).not.toBe(textB);
    expect(resA.hinglish.length).toBeGreaterThanOrEqual(2);
    expect(resB.hinglish.length).toBeGreaterThanOrEqual(2);
  }, 35000);
});
