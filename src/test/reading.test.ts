import { describe, expect, it } from "vitest";
import { isVerseScale, nextVerseScale } from "@/lib/reading";

describe("reader text scale", () => {
  it("cycles Standard → Large → Extra Large → Standard", () => {
    expect(nextVerseScale("standard")).toBe("large");
    expect(nextVerseScale("large")).toBe("xlarge");
    expect(nextVerseScale("xlarge")).toBe("standard");
  });

  it("rejects unknown stored values", () => {
    expect(isVerseScale("huge")).toBe(false);
    expect(isVerseScale(null)).toBe(false);
    expect(isVerseScale("large")).toBe(true);
  });
});
