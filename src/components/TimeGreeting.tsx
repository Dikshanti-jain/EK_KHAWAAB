import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

type Greeting = {
  emoji: string;
  label: string;
  mood?: string;
  title: string;
};

export function greetingForHour(hour: number): Greeting {
  if (hour >= 22 || hour < 5) {
    return {
      emoji: "🌙",
      label: "Late Night Sanctuary",
      mood: "Late Night Tanhai",
      title: "Open the late-night Tanhai feed",
    };
  }
  if (hour >= 5 && hour < 12) {
    return { emoji: "☀️", label: "Subah-e-Khwaab", title: "Open the morning feed" };
  }
  return { emoji: "✨", label: "Shaam-e-Meḥfil", title: "Open the evening feed" };
}

/**
 * A time-aware greeting. Computed after mount so prerendered HTML never
 * disagrees with the reader's clock. At night it carries a one-tap Tanhai
 * filter into the feed.
 */
export function TimeGreeting({ className }: { className?: string }) {
  const [greeting, setGreeting] = useState<Greeting | null>(null);

  useEffect(() => {
    setGreeting(greetingForHour(new Date().getHours()));
  }, []);

  if (!greeting) return null;

  return (
    <Link
      to="/feed"
      search={greeting.mood ? { mood: greeting.mood } : {}}
      title={greeting.title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-gold-line bg-cashmere px-3 py-1 text-[11px] font-medium text-cashmere-ink transition hover:bg-cashmere-hover hover:text-gold-ink sm:text-xs",
        className
      )}
    >
      <span aria-hidden="true">{greeting.emoji}</span>
      {greeting.label}
      {greeting.mood && <span className="text-[10px] text-gold-ink/70">· Tanhai</span>}
    </Link>
  );
}
