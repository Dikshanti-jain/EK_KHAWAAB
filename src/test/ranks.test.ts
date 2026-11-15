import { describe, expect, it } from "vitest";
import { rankFor, rankLabel, rankProgress } from "@/lib/ranks";

describe("poet ranks", () => {
  it("starts every reader as a Musafir", () => {
    expect(rankLabel(0)).toBe("Musafir (Seeker)");
    expect(rankFor(2).key).toBe("musafir");
  });

  it("becomes a Shayar at three published verses", () => {
    expect(rankFor(3).key).toBe("shayar");
    expect(rankFor(9).english).toBe("Poet");
  });

  it("becomes a Sukhanwar at ten published verses", () => {
    expect(rankFor(10).name).toBe("Sukhanwar");
    expect(rankFor(140).key).toBe("sukhanwar");
  });

  it("never reports negative or non-finite counts as progress", () => {
    expect(rankFor(-4).key).toBe("musafir");
    expect(rankFor(Number.NaN).key).toBe("musafir");
    expect(rankProgress(-4)).toBe(0);
    expect(rankProgress(10)).toBe(1);
  });
});
