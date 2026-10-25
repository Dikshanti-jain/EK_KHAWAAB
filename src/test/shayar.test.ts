import { describe, expect, it } from "vitest";
import { composeFallbackPoem, STYLES } from "@/lib/shayar.functions";

describe("composeFallbackPoem engine", () => {
  it("generates 4-line poetry in 3 scripts incorporating seeds for all styles in compose mode", () => {
    for (const style of STYLES) {
      const res = composeFallbackPoem({
        mode: "words",
        seeds: ["Chai", "Baarish"],
        situation: "Remembering old conversations",
        style,
      });

      expect(res.hinglish.length).toBe(4);
      expect(res.hindi.length).toBe(4);
      expect(res.urdu.length).toBe(4);
      expect(res.english).toBeTruthy();
      expect(res.seedsUsed).toEqual(["Chai", "Baarish"]);
      expect(res.hinglish.some((line) => line.includes("Chai"))).toBe(true);
      expect(res.hinglish.some((line) => line.includes("Baarish"))).toBe(true);
    }
  });

  it("handles additional seed words beyond 2 properly", () => {
    const res = composeFallbackPoem({
      mode: "words",
      seeds: ["Window", "December", "Silence"],
      situation: "Cold evening",
      style: "Modern Hinglish",
    });

    expect(res.seedsUsed).toEqual(["Window", "December", "Silence"]);
    expect(res.hinglish.some((line) => line.includes("Window"))).toBe(true);
    expect(res.hinglish.some((line) => line.includes("December"))).toBe(true);
  });

  it("polishes user draft in improve mode and preserves originalDraft reference", () => {
    const userDraft = "Mohabbat ka safar ajeeb mod par aa gaya";
    const res = composeFallbackPoem({
      mode: "improve",
      draftText: userDraft,
      style: "Mirza Ghalib",
    });

    expect(res.originalDraft).toBe(userDraft);
    expect(res.hinglish.length).toBeGreaterThanOrEqual(2);
    expect(res.hindi.length).toBeGreaterThanOrEqual(2);
    expect(res.urdu.length).toBeGreaterThanOrEqual(2);
    expect(res.english).toBeTruthy();
  });

  it("generates multiple distinct poetic continuations in complete mode", () => {
    const openingLine = "Main chup raha to usne samjha ke gila nahi hai";
    const res = composeFallbackPoem({
      mode: "complete",
      draftText: openingLine,
      style: "Jaun Elia",
    });

    expect(res.originalDraft).toBe(openingLine);
    expect(res.hinglish[0]).toBe(openingLine);
    expect(res.continuations).toBeDefined();
    expect(res.continuations?.length).toBe(3);
    expect(res.continuations?.[0]?.hinglish).toBeTruthy();
    expect(res.continuations?.[0]?.hindi).toBeTruthy();
    expect(res.continuations?.[0]?.urdu).toBeTruthy();
  });
});
