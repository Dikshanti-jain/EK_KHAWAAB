import { describe, expect, it } from "vitest";
import { detectLughat } from "@/lib/lughat-detect";

describe("Lughat detection in a verse", () => {
  it("finds Hinglish dictionary words", () => {
    const words = detectLughat(["Tera tagaful bhi ek ada thi", "Ab har khamoshi ko teri baat samajh lete hain"]);
    expect(words.map((w) => w.roman)).toContain("Tagaful");
    expect(words.map((w) => w.roman)).toContain("Khamoshi");
  });

  it("does not fire a short word inside a longer one", () => {
    const words = detectLughat(["Shabnam si thi teri pehli baat"]);
    expect(words.map((w) => w.roman)).not.toContain("Shab");
  });

  it("matches compound entries as whole phrases", () => {
    const words = detectLughat(["Shab-e-gham ki sehar nahi hoti"]);
    expect(words.map((w) => w.roman)).toContain("Shab-e-Gham");
  });

  it("finds words written in Devanagari", () => {
    const words = detectLughat(["हिज्र की शब भी गुज़र जाती है"]);
    expect(words.map((w) => w.roman)).toContain("Hijr");
  });

  it("returns nothing for a verse without dictionary words", () => {
    expect(detectLughat(["the quick brown fox"])).toEqual([]);
  });
});
