import { useEffect, useState } from "react";
import {
  VERSE_SCALES,
  applyVerseScale,
  nextVerseScale,
  readVerseScale,
  type VerseScale,
} from "@/lib/reading";
import { cn } from "@/lib/utils";

/** A quiet Aa control. Standard → Large → Extra Large, remembered locally. */
export function VerseScaleControl({ className }: { className?: string }) {
  const [scale, setScale] = useState<VerseScale>("standard");

  useEffect(() => {
    const saved = readVerseScale();
    setScale(saved);
    applyVerseScale(saved);
  }, []);

  const meta = VERSE_SCALES.find((s) => s.value === scale) ?? VERSE_SCALES[0]!;

  const cycle = () => {
    const next = nextVerseScale(scale);
    setScale(next);
    applyVerseScale(next);
  };

  return (
    <button
      type="button"
      onClick={cycle}
      title={meta.label}
      aria-label={`Verse text size: ${meta.label}. Tap to change.`}
      className={cn(
        "inline-flex h-7 min-w-8 items-center justify-center rounded-full border border-hairline bg-card px-2 font-serif font-semibold text-muted-foreground transition hover:border-border hover:text-ink",
        scale !== "standard" && "border-gold-line bg-cashmere text-gold-ink",
        className
      )}
    >
      <span
        className={cn(
          scale === "standard" ? "text-[11px]" : scale === "large" ? "text-[13px]" : "text-[15px]"
        )}
      >
        Aa
      </span>
    </button>
  );
}
