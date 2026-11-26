import { describe, expect, it, vi } from "vitest";
import { draw, RATIOS, THEMES, FONT } from "@/lib/card-render";

function createMockCanvas() {
  const fillTextCalls: Array<{ text: string; x: number; y: number }> = [];
  const ctx = {
    fillStyle: "",
    font: "",
    textBaseline: "",
    direction: "ltr",
    textAlign: "left",
    globalAlpha: 1,
    fillRect: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 25 })),
    fillText: vi.fn((text: string, x: number, y: number) => {
      fillTextCalls.push({ text, x, y });
    }),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
  };

  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ctx),
  } as unknown as HTMLCanvasElement;

  return { canvas, ctx, fillTextCalls };
}

describe("card-render draw()", () => {
  it("sets canvas dimensions according to the selected ratio", () => {
    for (const [ratio, [w, h]] of Object.entries(RATIOS)) {
      const { canvas } = createMockCanvas();
      draw(canvas, {
        ratio: ratio as keyof typeof RATIOS,
        theme: "Pure White Editorial",
        lines: ["Ek khwaab"],
        sign: "Mirza",
        id: "#EK-1001",
        showId: true,
        size: 64,
        align: "center",
        script: "hinglish",
      });
      expect(canvas.width).toBe(w);
      expect(canvas.height).toBe(h);
    }
  });

  it("wraps long lines when measureText exceeds maxW and draws attribution", () => {
    const { canvas, ctx, fillTextCalls } = createMockCanvas();
    const longLine = "Yeh jo halka halka suroor hai yeh teri nazar ka qusoor hai";
    draw(canvas, {
      ratio: "1:1 Square",
      theme: "Midnight Sanctuary",
      lines: [longLine],
      sign: "Noor",
      id: "#EK-2048",
      showId: true,
      size: 60,
      align: "center",
      script: "hinglish",
    });

    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1080, 1080);
    expect(ctx.arc).toHaveBeenCalledTimes(1);
    const renderedTexts = fillTextCalls.map((c) => c.text);
    // Wrapped into multiple lines, plus @Noor, #EK-2048, and watermark
    expect(renderedTexts.length).toBeGreaterThan(4);
    expect(renderedTexts).toContain("@Noor");
    expect(renderedTexts).toContain("#EK-2048");
    expect(renderedTexts).toContain("ekkhwaab.in");
  });

  it("omits @sign and poet id when showId is false and uses RTL for Urdu", () => {
    const { canvas, ctx, fillTextCalls } = createMockCanvas();
    draw(canvas, {
      ratio: "4:5 Portrait",
      theme: "Warm Cashmere",
      lines: ["دلِ ناداں تجھے ہوا کیا ہے"],
      sign: "Ghalib",
      id: "#EK-9999",
      showId: false,
      size: 54,
      align: "left",
      script: "urdu",
    });

    expect(ctx.font).toContain("Plus Jakarta Sans"); // final watermark font
    expect(fillTextCalls.map((c) => c.text)).not.toContain("@Ghalib");
    expect(fillTextCalls.map((c) => c.text)).not.toContain("#EK-9999");
    expect(THEMES["Warm Cashmere"].bg).toBe("#FAF6F0");
    expect(FONT.urdu).toBe("Noto Nastaliq Urdu");
  });
});
