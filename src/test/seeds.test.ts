import { describe, expect, it } from "vitest";
import { highlightSeeds } from "@/lib/seeds";

describe("seed word highlighting", () => {
  it("flags every seed word the user gave, ignoring case", () => {
    const parts = highlightSeeds("Chai thandi ho gayi, baarish ruki nahi", ["chai", "Baarish"]);
    expect(parts.filter((p) => p.seed).map((p) => p.t)).toEqual(["Chai", "baarish"]);
  });
  it("does not flag words that were not seeds", () => {
    const parts = highlightSeeds("Window pe raat", ["Chai"]);
    expect(parts.some((p) => p.seed)).toBe(false);
  });
});
