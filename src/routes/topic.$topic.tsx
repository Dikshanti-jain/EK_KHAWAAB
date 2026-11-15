import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { safeJsonLd } from "@/lib/security";
import { POEMS, getPoemSlug } from "@/data/poems";
import { TOPICS } from "@/data/topics";
import { LUGHAT, getWordSlug } from "@/data/lughat";
import { PageHead, card, btnOutline, btnPrimary, btnRoyal } from "@/components/kit";
import { SITE_URL, buildBreadcrumb } from "@/lib/seo";
import { cn } from "@/lib/utils";

export { TOPICS };

export const Route = createFileRoute("/topic/$topic")({
  loader: ({ params }) => {
    const topic = TOPICS[params.topic];
    if (!topic) {
      throw notFound();
    }
    const matching = POEMS.filter(topic.filter);
    const { filter: _ignored, ...serializableTopic } = topic;
    return { topic: serializableTopic, poems: matching };
  },
  head: ({ loaderData }) => {
    if (!loaderData?.topic) {
      return { meta: [{ title: "Topic Not Found — Ek Khwaab" }] };
    }
    const { topic } = loaderData;
    const canonical = `${SITE_URL}/topic/${topic.slug}`;

    return {
      meta: [
        { title: topic.seoTitle },
        { name: "description", content: topic.description },
        { name: "keywords", content: `${topic.title}, ${topic.shortLabel}, hindi shayari, urdu shayari, hinglish shayari, AI shayari, Ek Khwaab` },
        { property: "og:title", content: topic.seoTitle },
        { property: "og:description", content: topic.description },
        { property: "og:url", content: canonical },
        { property: "og:type", content: "website" },
        { name: "twitter:title", content: topic.seoTitle },
        { name: "twitter:description", content: topic.description },
      ],
      links: [
        { rel: "canonical", href: canonical },
      ],
    };
  },
  component: TopicPage,
});

function TopicPage() {
  const { topic, poems } = Route.useLoaderData();
  const relatedWords = topic.relatedWords
    .map((slug) => LUGHAT.find((word) => getWordSlug(word) === slug))
    .filter((word): word is (typeof LUGHAT)[number] => Boolean(word));
  const canonical = `${SITE_URL}/topic/${topic.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      buildBreadcrumb([
        { name: "Home", path: "/" },
        { name: "Explore Feed", path: "/feed" },
        { name: topic.title, path: `/topic/${topic.slug}` },
      ]),
      {
        "@type": "CollectionPage",
        "@id": `${canonical}#collection`,
        url: canonical,
        name: topic.seoTitle,
        description: topic.description,
        inLanguage: ["en-IN", "hi", "ur"],
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: {
          "@type": "Thing",
          name: topic.title,
          description: topic.intro,
        },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: poems.length,
          itemListElement: poems.slice(0, 20).map((poem, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: poem.hinglish[0],
            url: `${SITE_URL}/poetry/${getPoemSlug(poem)}`,
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

      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-ink">Home</Link>
        <span>/</span>
        <Link to="/feed" className="hover:text-ink">Explore Feed</Link>
        <span>/</span>
        <Link to="/directory" className="hover:text-ink">Directory</Link>
        <span>/</span>
        <span className="font-semibold text-ink">{topic.title}</span>
      </nav>

      <PageHead
        kicker="SHAYARI TOPIC HUB"
        title={topic.heading}
        sub={topic.sub}
      />

      {/* Editorial Introduction */}
      <div className="mb-8 rounded-2xl border border-gold-line bg-cashmere p-6 sm:p-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gold-ink">The Poetic Tradition</h2>
        <p className="text-sm leading-relaxed text-ink/90">{topic.intro}</p>
      </div>

      {/* 350+ word original literary commentary, fully server-rendered. */}
      <section aria-labelledby="topic-commentary" className="mb-10 rounded-2xl border border-hairline bg-card p-6 sm:p-8">
        <h2 id="topic-commentary" className="text-xl font-semibold text-ink sm:text-2xl">
          Understanding {topic.title}
        </h2>
        <div className="mt-4 space-y-4">
          {topic.content.map((paragraph) => (
            <p key={paragraph.slice(0, 48)} className="text-sm leading-relaxed text-ink/85 sm:text-[15px]">
              {paragraph}
            </p>
          ))}
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-hairline pt-6">
          <Link
            to="/ai-poet"
            className={cn(btnPrimary, "px-4 py-2.5 text-xs sm:text-sm")}
          >
            <Sparkles className="size-3.5" /> Generate a {topic.shortLabel} verse
          </Link>
          <Link to="/card-studio" className={cn(btnOutline, "px-4 py-2.5 text-xs sm:text-sm")}>
            Make a 9:16 card
          </Link>
          <Link to="/directory" className={cn(btnOutline, "px-4 py-2.5 text-xs sm:text-sm")}>
            Full literary index
          </Link>
        </div>
      </section>

      {/* Matching poems, each rendered in all four readings. */}
      <section aria-labelledby="topic-poems" className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="topic-poems" className="text-xl font-semibold text-ink sm:text-2xl">
            {topic.title} — {poems.length} Multi-Script Verses
          </h2>
          <span className="text-xs text-muted-foreground">Hinglish · हिन्दी · اردو · English</span>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {poems.map((poem) => {
            const slug = getPoemSlug(poem);
            return (
              <article key={poem.id} className={cn(card, "flex flex-col justify-between p-5 sm:p-6 transition hover:shadow-float")}>
                <div>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">@{poem.takhallus}</span>
                    <span className="rounded-full bg-wash px-2.5 py-0.5 font-medium text-royal">{poem.format}</span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Hinglish</span>
                      <div className="mt-1 space-y-0.5 font-serif text-base italic leading-relaxed text-ink">
                        {poem.hinglish.map((line, i) => <p key={i}>{line}</p>)}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-crimson">हिन्दी</span>
                      <div className="deva mt-1 space-y-0.5 text-sm leading-relaxed text-ink/90">
                        {poem.hindi.map((line, i) => <p key={i}>{line}</p>)}
                      </div>
                    </div>
                    <div dir="rtl">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-royal" dir="ltr">اردو</span>
                      <div className="urdu mt-1 space-y-0.5 text-base leading-loose text-ink/90">
                        {poem.urdu.map((line, i) => <p key={i}>{line}</p>)}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-gold-ink">English meaning</span>
                      <div className="mt-1 space-y-0.5 font-serif text-xs italic leading-relaxed text-muted-foreground">
                        {poem.english.map((line, i) => <p key={i}>{line}</p>)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-hairline pt-4">
                  <span className="text-xs text-muted-foreground">{poem.mood}</span>
                  <Link
                    to="/poetry/$slug"
                    params={{ slug }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-crimson hover:underline"
                  >
                    Read in all scripts &amp; tashreeh
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Related Lughat words */}
      {relatedWords.length > 0 && (
        <section aria-labelledby="topic-vocab" className="mt-12 rounded-3xl border border-hairline bg-card p-6 sm:p-8">
          <h2 id="topic-vocab" className="flex items-center gap-2 text-base font-semibold text-ink">
            <BookOpen className="size-4 text-royal" /> Vocabulary behind {topic.title}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Each word links to its pronunciation, etymology, literary nuance, and a classical couplet.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {relatedWords.map((word) => (
              <Link
                key={word.roman}
                to="/dictionary/$word"
                params={{ word: getWordSlug(word) }}
                className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-secondary/50 px-3.5 py-1.5 text-xs text-ink transition hover:border-royal hover:bg-wash"
              >
                <span className="font-semibold">{word.roman}</span>
                <span className="text-[11px] text-muted-foreground">({word.hindi})</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Topic-specific AEO questions */}
      {topic.faq.length > 0 && (
        <section aria-labelledby="topic-faq" className="mt-12">
          <h2 id="topic-faq" className="text-xl font-semibold text-ink sm:text-2xl">
            {topic.title} — Frequently Asked Questions
          </h2>
          <div className="mt-4 divide-y divide-hairline rounded-2xl border border-hairline bg-card">
            {topic.faq.map((item) => (
              <details key={item.q} className="group px-5 py-4 sm:px-6">
                <summary className="cursor-pointer list-none pr-6 font-medium text-ink marker:hidden">
                  <span className="flex items-start justify-between gap-4">
                    <span>{item.q}</span>
                    <span className="mt-0.5 text-gold-ink transition group-open:rotate-45" aria-hidden="true">+</span>
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Explore other topics */}
      <section className="mt-14 border-t border-hairline pt-10">
        <h2 className="mb-4 text-lg font-semibold text-ink">Explore More Shayari Topics</h2>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {Object.values(TOPICS).filter((t) => t.slug !== topic.slug).map((t) => (
            <Link
              key={t.slug}
              to="/topic/$topic"
              params={{ topic: t.slug }}
              className="rounded-2xl border border-hairline bg-card p-4 transition hover:border-royal hover:shadow-sm"
            >
              <h3 className="text-sm font-semibold text-ink">{t.title}</h3>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.sub}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Back to Feed */}
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link to="/feed" className={cn(btnOutline, "px-6 py-2.5")}>
          <ArrowLeft className="size-4" /> Back to Full Feed
        </Link>
        <Link to="/directory" className={cn(btnRoyal, "px-6 py-2.5")}>
          Browse all poems &amp; words
        </Link>
      </div>
    </div>
  );
}
