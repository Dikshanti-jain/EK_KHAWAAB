import type { Script } from "@/data/poems";

/**
 * One canvas painter for both Card Studio and the card's Quick Download.
 * Preview and exported PNG stay byte-for-byte identical because every surface
 * routes through `draw()`.
 *
 * Canvas paints raw pixels, so theme colours are literal hex here by necessity.
 */
export const THEMES = {
  "Pure White Editorial": { bg: "#FFFFFF", ink: "#0F172A", accent: "#BE123C" },
  "Soft Ivory Paper": { bg: "#FAF8F5", ink: "#1E3A8A", accent: "#BE123C" },
  "Royal Ink Blue": { bg: "#1E3A8A", ink: "#FFFFFF", accent: "#FFF1F2" },
  "Velvet Crimson Red": { bg: "#9F1239", ink: "#FFFFFF", accent: "#FFF1F2" },
  "Blush Rose Mist": { bg: "#FFF1F2", ink: "#881337", accent: "#BE123C" },
  "Ice Blue Sanctuary": { bg: "#EFF6FF", ink: "#1E3A8A", accent: "#2563EB" },
  "Warm Cashmere": { bg: "#FAF6F0", ink: "#1B365D", accent: "#C5A059" },
  "Midnight Sanctuary": { bg: "#101B33", ink: "#F8FAFC", accent: "#C5A059" },
} as const;

export type Theme = keyof typeof THEMES;

export const RATIOS = {
  "9:16 Story": [1080, 1920],
  "1:1 Square": [1080, 1080],
  "4:5 Portrait": [1080, 1350],
} as const;

export type Ratio = keyof typeof RATIOS;

export const FONT: Record<Script, string> = {
  hinglish: "Playfair Display",
  hindi: "Noto Serif Devanagari",
  urdu: "Noto Nastaliq Urdu",
  english: "Playfair Display",
};

export type DrawOptions = {
  ratio: Ratio;
  theme: Theme;
  lines: string[];
  sign: string;
  id: string;
  showId: boolean;
  size: number;
  align: "center" | "left";
  script: Script;
};

export function draw(c: HTMLCanvasElement, o: DrawOptions) {
  const [W, H] = RATIOS[o.ratio];
  c.width = W;
  c.height = H;
  const x = c.getContext("2d")!;
  const t = THEMES[o.theme];
  x.fillStyle = t.bg;
  x.fillRect(0, 0, W, H);
  const font = FONT[o.script];
  const lh = o.size * (o.script === "urdu" ? 2.2 : 1.55);
  x.font = `${o.script === "hinglish" || o.script === "english" ? "italic 500" : "400"} ${o.size}px "${font}"`;
  x.fillStyle = t.ink;
  x.textBaseline = "middle";
  const rtl = o.script === "urdu";
  x.direction = rtl ? "rtl" : "ltr";
  x.textAlign = o.align === "center" ? "center" : rtl ? "right" : "left";
  const pad = 140,
    maxW = W - pad * 2;
  const wrapped: string[] = [];
  o.lines.forEach((ln) => {
    let cur = "";
    ln.split(" ").forEach((w) => {
      const test = cur ? `${cur} ${w}` : w;
      if (x.measureText(test).width > maxW && cur) {
        wrapped.push(cur);
        cur = w;
      } else cur = test;
    });
    wrapped.push(cur);
  });
  const block = wrapped.length * lh + (o.showId ? 140 : 0);
  let y = H / 2 - block / 2 + lh / 2;
  const tx = o.align === "center" ? W / 2 : rtl ? W - pad : pad;
  wrapped.forEach((l) => {
    x.fillText(l, tx, y);
    y += lh;
  });
  x.direction = "ltr";
  // accent mark
  x.fillStyle = t.accent;
  x.beginPath();
  const mx = o.align === "center" ? W / 2 : pad + 6;
  x.arc(mx, y + 10, 7, 0, Math.PI * 2);
  x.fill();
  if (o.showId) {
    x.textAlign = o.align === "center" ? "center" : "left";
    x.fillStyle = t.ink;
    x.font = `600 34px "Plus Jakarta Sans"`;
    x.fillText(`@${o.sign}`, o.align === "center" ? W / 2 : pad, y + 80);
    x.globalAlpha = 0.65;
    x.font = `500 26px "JetBrains Mono"`;
    x.fillText(o.id, o.align === "center" ? W / 2 : pad, y + 126);
    x.globalAlpha = 1;
  }
  x.globalAlpha = 0.45;
  x.fillStyle = t.ink;
  x.textAlign = "center";
  x.font = `500 22px "Plus Jakarta Sans"`;
  x.fillText("ekkhwaab.in", W / 2, H - 80);
  x.globalAlpha = 1;
}

export type RenderCardOptions = {
  lines: string[];
  script: Script;
  penName: string;
  id: string;
  theme?: Theme;
  ratio?: Ratio;
  showId?: boolean;
  size?: number;
  align?: "center" | "left";
};

async function waitForFonts(script: Script): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load(`${script === "urdu" ? 54 : 64}px "${FONT[script]}"`),
      document.fonts.load(`34px "Plus Jakarta Sans"`),
      document.fonts.load(`26px "JetBrains Mono"`),
    ]);
    await document.fonts.ready;
  } catch {
    // A fallback face still produces a readable card.
  }
}

/** Render an off-screen card and return it as a PNG blob. Browser only. */
export async function renderCardBlob(o: RenderCardOptions): Promise<Blob> {
  await waitForFonts(o.script);
  const canvas = document.createElement("canvas");
  draw(canvas, {
    ratio: o.ratio ?? "9:16 Story",
    theme: o.theme ?? "Pure White Editorial",
    lines: o.lines.filter((l) => l.trim().length > 0),
    sign: o.penName || "Anonymous",
    id: o.id,
    showId: o.showId ?? true,
    size: o.size ?? (o.script === "urdu" ? 54 : 64),
    align: o.align ?? "center",
    script: o.script,
  });
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not paint the card."));
    }, "image/png");
  });
}

/** Save a blob with a friendly filename; revokes the object URL afterwards. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
