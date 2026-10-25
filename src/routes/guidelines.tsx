import { createFileRoute } from "@tanstack/react-router";
import { PageHead, Pill, card } from "@/components/kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/guidelines")({
  head: () => ({ meta: [
    { title: "Community Guidelines — Ek Khawaab" },
    { name: "description", content: "How we keep Ek Khawaab kind, original and properly credited." },
    { property: "og:title", content: "Community Guidelines — Ek Khawaab" },
    { property: "og:description", content: "Our etiquette and anti-plagiarism policy." },
  ] }),
  component: () => (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <PageHead kicker="GUIDELINES" title="Community Guidelines" sub="Appreciate generously, critique gently, and always credit the poet." />
      <div className="space-y-4">
        {[
          ["Original or tribute — always tagged", "Every post is marked Original or Tribute. Tributes must name the poet who wrote the lines."],
          ["No misattributed forwards", "Random WhatsApp lines credited to Jaun Elia, Gulzar, Ghalib or Faraz are removed. If you don't know who wrote it, tag it Anonymous."],
          ["Comments are for appreciation", "Reply with praise or a reply couplet. No insults, and no flirting under someone's grief."],
          ["Respect anonymity", "Never try to unmask a pen name. Secret Letter riddles are play, not surveillance."],
          ["Look out for each other", "If a poem sounds like someone is in real danger, we gently share help resources."],
        ].map(([t, d]) => (
          <section key={t} className={cn(card, "p-7")}>
            <h2 className="text-xl font-semibold">{t}</h2>
            <p className="mt-2 text-muted-foreground">{d}</p>
          </section>
        ))}
      </div>
      <div className="mt-8 flex gap-2"><Pill>Original</Pill><Pill tone="red">Tribute · Ghalib</Pill><Pill tone="grey">Anonymous</Pill></div>
    </div>
  ),
});
