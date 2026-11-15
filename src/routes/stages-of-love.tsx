import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Feather, Sparkles } from "lucide-react";
import { safeJsonLd } from "@/lib/security";
import { LOVE_STAGES } from "@/data/stages";
import { LUGHAT, getWordSlug } from "@/data/lughat";
import { SITE_URL, buildBreadcrumb } from "@/lib/seo";
import { PageHead, card } from "@/components/kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/stages-of-love")({
  head: () => ({
    meta: [
      { title: "7 Stages of Love (Saat Muqaam-e-Ishq) in Urdu Poetry | Ek Khwaab" },
      {
        name: "description",
        content:
          "Explore Saat Muqaam-e-Ishq — Dilkashi, Uns, Ishq, Aqeedat, Ibadat, Junoon and Fanaa. The seven stages of love in Urdu and Sufi poetry, with multi-script couplets and Lughat vocabulary.",
      },
      { name: "keywords", content: "7 stages of love, saat muqaam e ishq, dilkashi, uns, ishq, aqeedat, ibadat, junoon, fanaa, sufi poetry, urdu poetry" },
      { property: "og:title", content: "7 Stages of Love (Saat Muqaam-e-Ishq) in Urdu Poetry | Ek Khwaab" },
      {
        property: "og:description",
        content: "From the first glance to the dissolution of the self — the seven stations of love explained with couplets.",
      },
      { property: "og:url", content: `${SITE_URL}/stages-of-love` },
      { name: "twitter:title", content: "Saat Muqaam-e-Ishq — 7 Stages of Love" },
      { name: "twitter:description", content: "Dilkashi, Uns, Ishq, Aqeedat, Ibadat, Junoon, Fanaa." },
    ],
    links: [
      { rel: "canonical", href: `${SITE_URL}/stages-of-love` },
    ],
  }),
  component: StagesOfLovePage,
});

function StagesOfLovePage() {
  const canonical = `${SITE_URL}/stages-of-love`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      buildBreadcrumb([
        { name: "Home", path: "/" },
        { name: "7 Stages of Love", path: "/stages-of-love" },
      ]),
      {
        "@type": "Article",
        "@id": `${canonical}#article`,
        headline: "7 Stages of Love (Saat Muqaam-e-Ishq) in Urdu Poetry",
        description:
          "The seven stations of love in Urdu and Sufi poetry: Dilkashi, Uns, Ishq, Aqeedat, Ibadat, Junoon and Fanaa.",
        url: canonical,
        inLanguage: ["en-IN", "hi", "ur"],
        author: { "@id": `${SITE_URL}/#creator` },
        publisher: { "@id": `${SITE_URL}/#organization` },
        isPartOf: { "@id": `${SITE_URL}/#website` },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: LOVE_STAGES.length,
          itemListElement: LOVE_STAGES.map((stage) => ({
            "@type": "ListItem",
            position: stage.number,
            name: `${stage.roman} — ${stage.english}`,
            url: `${canonical}#muqaam-${stage.number}`,
          })),
        },
      },
    ],
  };

  return (
    <div className="mx-auto max-w-5xl px-3.5 py-6 sm:px-6 md:px-12 md:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-ink">Home</Link>
        <span>/</span>
        <Link to="/directory" className="hover:text-ink">Directory</Link>
        <span>/</span>
        <span className="font-semibold text-ink">7 Stages of Love</span>
      </nav>

      <PageHead
        kicker="SAAT MUQAAM-E-ISHQ"
        title="The Seven Stages of Love in Urdu Poetry"
        sub="From the first uninvited glance to the disappearance of the self — the stations that Urdu and Sufi poetry have mapped for centuries."
      />

      <div className="rounded-2xl border border-gold-line bg-cashmere p-6 sm:p-8">
        <p className="text-sm leading-relaxed text-ink/90">
          Saat Muqaam-e-Ishq is the traditional arc of love in Urdu and Sufi literature. It begins with{" "}
          <b>Dilkashi</b>, the first pull of attraction, and ends with <b>Fanaa</b>, the dissolution of the
          lover&apos;s separate self. The stages are not a checklist. A heart can move backward, stall at
          <b> Uns</b> for years, or mistake <b>Junoon</b> for depth. What makes the map useful is not its
          certainty but its vocabulary: it gives a name to each weather inside love, so a feeling can be
          recognised instead of merely endured.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-ink/90">
          Classical poets rarely announce the stages in order. Ghalib lives in the tension between{" "}
          <b>Aqeedat</b> and <b>Junoon</b>; Mir returns again and again to the silence of <b>Uns</b>; the
          Sufi tradition understands <b>Fanaa</b> as the threshold of divine love. The seven stations below
          are therefore a reading map, not a rulebook. Follow them in sequence, or open the one that matches
          the season you are in.
        </p>
      </div>

      <ol className="mt-10 space-y-8">
        {LOVE_STAGES.map((stage) => {
          const words = stage.relatedWords
            .map((slug) => LUGHAT.find((word) => getWordSlug(word) === slug))
            .filter((word): word is (typeof LUGHAT)[number] => Boolean(word));

          return (
            <li key={stage.id} id={`muqaam-${stage.number}`} className="scroll-mt-24">
              <article className={cn(card, "p-6 sm:p-8")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="font-mono text-xs font-semibold uppercase tracking-wider text-gold-ink">
                      Muqaam {stage.number} of 7
                    </span>
                    <h2 className="mt-1 text-2xl font-semibold text-ink sm:text-3xl">
                      {stage.roman}{" "}
                      <span className="text-lg font-normal text-muted-foreground sm:text-xl">
                        ({stage.hindi} · <span className="urdu text-xl">{stage.urdu}</span>)
                      </span>
                    </h2>
                    <p className="mt-1 text-sm font-medium text-crimson">{stage.english}</p>
                  </div>
                  <span className="rounded-full bg-wash px-3 py-1 font-mono text-xs font-semibold text-royal">
                    {stage.number}/7
                  </span>
                </div>

                <p className="mt-3 text-sm font-medium text-ink">{stage.meaning}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{stage.description}</p>

                <div className="mt-5 space-y-3 rounded-2xl border border-hairline bg-secondary/50 p-4 sm:p-5">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Hinglish</span>
                    <p className="mt-1 font-serif text-base italic text-ink">{stage.line.hinglish}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-crimson">हिन्दी</span>
                    <p className="deva mt-1 text-sm text-ink">{stage.line.hindi}</p>
                  </div>
                  <div dir="rtl">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-royal" dir="ltr">اردو</span>
                    <p className="urdu mt-1 text-base text-ink">{stage.line.urdu}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gold-ink">English meaning</span>
                    <p className="mt-1 font-serif text-sm italic text-muted-foreground">{stage.line.english}</p>
                  </div>
                </div>

                {words.length > 0 && (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-medium text-muted-foreground">Lughat:</span>
                    {words.map((word) => (
                      <Link
                        key={word.roman}
                        to="/dictionary/$word"
                        params={{ word: getWordSlug(word) }}
                        className="rounded-full border border-hairline bg-card px-2.5 py-1 text-[11px] font-medium text-ink transition hover:border-royal hover:text-royal"
                      >
                        {word.roman}
                      </Link>
                    ))}
                  </div>
                )}
              </article>
            </li>
          );
        })}
      </ol>

      <section className="mt-12 rounded-3xl border border-hairline bg-card p-6 sm:p-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
          <Feather className="size-4 text-crimson" /> Write your own stage
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Take the stage that matches your present. Add three seed words from your own life — a place, an
          object, a sentence you never said — and ask Shayar-e-Khwaab for a couplet. Then read it in
          Hinglish, Hindi and Urdu before you decide which version is true.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/ai-poet" className="inline-flex items-center gap-1.5 rounded-full bg-crimson px-5 py-2.5 text-sm font-medium text-white hover:bg-crimson-hover">
            <Sparkles className="size-4" /> Generate a verse
          </Link>
          <Link to="/dictionary" className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-white px-5 py-2.5 text-sm font-medium text-ink hover:border-royal">
            Explore the Lughat <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
