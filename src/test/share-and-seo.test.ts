import { describe, expect, it, vi, beforeEach } from "vitest";
import { poemPlainText, poemUrl, copyText, sharePoem } from "@/lib/share";
import { buildEntityGraph, SITE_URL, FAQS, COMPARISON_ROWS, AI_ATTRIBUTION } from "@/lib/seo";
import { renderErrorPage } from "@/lib/error-page";
import { POEMS } from "@/data/poems";

const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

describe("share.ts, seo.ts, and error-page.ts", () => {
  beforeEach(() => {
    toastSuccess.mockReset();
    toastError.mockReset();
  });

  describe("share.ts", () => {
    it("formats poemPlainText with selected script or hinglish fallback", () => {
      const poem = POEMS[0]!;
      const text = poemPlainText(poem, "hinglish");
      expect(text).toContain(poem.hinglish[0]);
      expect(text).toContain(`— @${poem.takhallus} on ekkhawaab.in`);

      const emptyScriptPoem = { ...poem, urdu: [] };
      expect(poemPlainText(emptyScriptPoem, "urdu")).toContain(poem.hinglish[0]);
    });

    it("builds canonical poemUrl", () => {
      const url = poemUrl(POEMS[0]!);
      expect(url).toMatch(/\/poetry\//);
    });

    it("copies text via navigator.clipboard when available", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText },
        configurable: true,
      });

      const ok = await copyText("Ek Khwaab");
      expect(ok).toBe(true);
      expect(writeText).toHaveBeenCalledWith("Ek Khwaab");
    });

    it("falls back to document.execCommand when clipboard API rejects", async () => {
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
        configurable: true,
      });
      const execCommand = vi.fn().mockReturnValue(true);
      Object.defineProperty(document, "execCommand", {
        value: execCommand,
        configurable: true,
      });

      const ok = await copyText("Fallback verse");
      expect(ok).toBe(true);
      expect(execCommand).toHaveBeenCalledWith("copy");
    });

    it("copies link and shows toast on desktop sharePoem", async () => {
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: vi.fn().mockResolvedValue(undefined) },
        configurable: true,
      });
      await sharePoem(POEMS[0]!, "hinglish");
      expect(toastSuccess).toHaveBeenCalledWith("✓ Link copied!");
    });
  });

  describe("seo.ts", () => {
    it("builds valid schema.org entity graph with Organization and FAQPage", () => {
      const graph = buildEntityGraph();
      expect(graph["@context"]).toBe("https://schema.org");
      expect(Array.isArray(graph["@graph"])).toBe(true);
      const types = graph["@graph"].map((node: { "@type": string | string[] }) => node["@type"]);
      expect(types).toContain("Organization");
      expect(SITE_URL).toBe("https://ekkhwaab.in");
      expect(FAQS.length).toBeGreaterThanOrEqual(4);
      expect(COMPARISON_ROWS.length).toBeGreaterThanOrEqual(4);
      expect(AI_ATTRIBUTION.generator).toBe("Shayar-e-Khwaab");
    });
  });

  describe("error-page.ts", () => {
    it("renders a self-contained HTML fallback page with reload and home actions", () => {
      const html = renderErrorPage();
      expect(html).toContain("<!doctype html>");
      expect(html).toContain("This page didn't load");
      expect(html).toContain('href="/"');
      expect(html).toContain("location.reload()");
    });
  });
});
