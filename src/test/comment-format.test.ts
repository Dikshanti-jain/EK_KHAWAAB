import { describe, expect, it } from "vitest";
import { formatComment, isCoupletComment, toCouplet } from "@/lib/comment-format";

describe("Jawaabi Sher formatting", () => {
  it("keeps explicit two-line comments exactly as written", () => {
    expect(toCouplet("Dil ne kaha kuch\nLabon ne kuch aur kaha")).toEqual([
      "Dil ne kaha kuch",
      "Labon ne kuch aur kaha",
    ]);
  });

  it("breaks a flowing sentence at the pause nearest its middle", () => {
    const lines = toCouplet("Teri yaad aayi, aur dil ne kaha");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe("Teri yaad aayi,");
    expect(lines[1]).toBe("aur dil ne kaha");
  });

  it("splits on a conjunction when there is no punctuation", () => {
    expect(toCouplet("Khamoshi thi aur raat bhi tanha thi")).toEqual([
      "Khamoshi thi",
      "aur raat bhi tanha thi",
    ]);
  });

  it("leaves a very short reply on one line", () => {
    expect(toCouplet("Wah! Kya kehne")).toEqual(["Wah! Kya kehne"]);
  });

  it("stores two lines only when the toggle is on", () => {
    expect(formatComment("Teri yaad aayi, aur dil ne kaha", false)).toBe(
      "Teri yaad aayi, aur dil ne kaha"
    );
    expect(formatComment("Teri yaad aayi, aur dil ne kaha", true)).toBe(
      "Teri yaad aayi,\naur dil ne kaha"
    );
  });

  it("recognizes a stored couplet", () => {
    expect(isCoupletComment("pehla misra\n\ndusra misra")).toBe(true);
    expect(isCoupletComment("ek hi line")).toBe(false);
  });
});
