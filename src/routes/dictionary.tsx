import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Volume2 } from "lucide-react";
import { LUGHAT } from "@/data/lughat";
import { PageHead, card, input } from "@/components/kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dictionary")({
  head: () => ({ meta: [
    { title: "Poetry Dictionary — Urdu & Hindi Words | Ek Khawaab" },
    { name: "description", content: "Search 30+ poetic Urdu and Hindi words with spellings, pronunciation, meaning and examples." },
    { property: "og:title", content: "Poetry Dictionary — Ek Khawaab" },
    { property: "og:description", content: "Understand every word in a sher." },
  ] }),
  component: Dictionary,
});

const speak = (t: string) => { const u = new SpeechSynthesisUtterance(t); u.lang = "hi-IN"; u.rate = 0.8; speechSynthesis.speak(u); };

function Dictionary() {
  const [q, setQ] = useState("");
  const list = LUGHAT.filter((w) => [w.roman, w.hindi, w.urdu, w.meaning].some((f) => f.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="mx-auto max-w-6xl px-6 py-16 md:px-12">
      <PageHead kicker="DICTIONARY" title="The words behind the verses" sub="Spellings in three scripts, pronunciation, meaning and how poets use each word." />
      <div className="relative mb-10 max-w-xl">
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-subtle" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search — hijr, longing, क़ुर्बत, فراق…" className={cn(input, "rounded-full py-3 pl-11")} />
      </div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {list.map((w) => (
          <div key={w.roman} className={cn(card, "p-7")}>
            <div className="flex items-start justify-between">
              <h3 className="text-2xl font-semibold">{w.roman}</h3>
              <button aria-label={`Pronounce ${w.roman}`} onClick={() => speak(w.hindi)} className="rounded-full p-2 text-royal hover:bg-wash"><Volume2 className="size-4" /></button>
            </div>
            <p className="text-sm text-subtle"><span className="deva">{w.hindi}</span> · <span className="font-urdu">{w.urdu}</span> · <span className="font-mono text-xs">/{w.say}/</span></p>
            <p className="mt-4 font-medium text-royal">{w.meaning}</p>
            <p className="mt-1 text-sm text-muted-foreground">{w.context}</p>
            <p className="mt-4 rounded-xl bg-secondary p-3 font-serif italic text-ink">"{w.example}"</p>
          </div>
        ))}
      </div>
      {!list.length && <p className="py-12 text-center text-muted-foreground">No word matches that search yet.</p>}
    </div>
  );
}
