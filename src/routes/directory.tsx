import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Compass, Feather, Library, Sparkles } from "lucide-react";
import { safeJsonLd } from "@/lib/security";
import { POEMS, getPoemSlug, type Poem } from "@/data/poems";
import { LUGHAT, getWordSlug } from "@/data/lughat";
import { TOPICS } from "@/data/topics";
import { LOVE_STAGES } from "@/data/stages";
import { SITE_URL, buildBreadcrumb } from "@/lib/seo";
import { PageHead, card } from "@/components/kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/directory")({
  head: () => ({
    meta: [
      { title: "Literary Directory — Every Poem, Topic & Lughat Word | Ek Khwaab" },
      {
        name: "description",
        content:
          "A crawlable HTML index of Ek Khwaab: all 8 shayari topic hubs, 16 multi-script poems, 35 Urdu Lughat words, the 7 stages of love, the AI Poet, Card Studio, Khwaab Khat, and Hum-Nawa.",
      },
      { name: "keywords", content: "Ek Khwaab directory, shayari index, urdu poetry index, hindi poetry directory, urdu lughat words, 7 stages of love" },
      { property: "og:title", content: "Literary Directory — Every Poem, Topic & Lughat Word | Ek Khwaab" },
      {
        property: "og:description",
        content: "Every public poem, topic hub, Lughat word, and literary feature in one HTML index.",
      },
      { property: "og:url", content: `${SITE_URL}/directory` },
      { name: "twitter:title", content: "Ek Khwaab Literary Directory" },
      { name: "twitter:description", content: "Browse all poems, topics, and Urdu poetry vocabulary in one place." },
    ],
    links: [
      { rel: "canonical", href: `${SITE_URL}/directory` },
    ],
  }),
  component: DirectoryPage,
});

const CORE_HUBS = [
  { to: "/feed", label: "Poetry Feed", desc: "Every public verse, filterable by mood and script." },
  { to: "/ai-poet", label: "AI Poet — Shayar-e-Khwaab", desc: "Word-seeded shayari, ghazals and nazms in three scripts." },
  { to: "/card-studio", label: "Card Studio", desc: "9:16 and 1:1 shayari cards, exported at high resolution." },
  { to: "/letters", label: "Khwaab Khat", desc: "Wax-sealed anonymous letters with a three-clue riddle." },
  { to: "/stages-of-love", label: "7 Stages of Love", desc: "Saat Muqaam-e-Ishq from Dilkashi to Fanaa." },
  { to: "/listen-together", label: "Hum-Nawa", desc: "Two-person synchronized music and poetry room." },
  { to: "/dictionary", label: "Lughat Dictionary", desc: "Urdu poetic vocabulary with pronunciation and examples." },
  { to: "/directory", label: "Literary Directory", desc: "This complete HTML index of the platform." },
] as const;

const MOOD_ORDER = ["Heartbreak & Hijr", "Unspoken Love", "Late Night Tanhai", "Life & Philosophy"];

function groupPoems(): { mood: string; poems: Poem[] }[] {
  return MOOD_ORDER.map((mood) => ({
    mood,
    poems: POEMS.filter((poem) => poem.mood === mood),
  })).filter((group) => group.poems.length > 0);
}

function DirectoryPage() {
  const groups = groupPoems();
  const canonical = `${SITE_URL}/directory`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      buildBreadcrumb([
        { name: "Home", path: "/" },
        { name: "Literary Directory", path: "/directory" },
      ]),
      {
        "@type": "CollectionPage",
        "@id": `${canonical}#collection`,
        url: canonical,
        name: "Ek Khwaab Literary Directory",
        description:
          "A complete HTML index of Ek Khwaab poems, shayari topic hubs, Lughat words, and literary features.",
        inLanguage: ["en-IN", "hi", "ur"],
        isPartOf: { "@id": `${SITE_URL}/#website` },
        hasPart: [
          {
            "@type": "ItemList",
            name: "Shayari Topic Hubs",
            numberOfItems: Object.keys(TOPICS).length,
            itemListElement: Object.values(TOPICS).map((topic, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: topic.title,
              url: `${SITE_URL}/topic/${topic.slug}`,
            })),
          },
          {
            "@type": "ItemList",
            name: "Public Poems",
            numberOfItems: POEMS.length,
            itemListElement: POEMS.map((poem, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: poem.hinglish[0],
              url: `${SITE_URL}/poetry/${getPoemSlug(poem)}`,
            })),
          },
          {
            "@type": "ItemList",
            name: "Lughat Words",
            numberOfItems: LUGHAT.length,
            itemListElement: LUGHAT.map((word, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: word.roman,
              url: `${SITE_URL}/dictionary/${getWordSlug(word)}`,
            })),
          },
        ],
      },
    ],
  };

  return (
    <div className="mx-auto max-w-6xl px-3.5 py-6 sm:px-6 md:px-12 md:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-ink">Home</Link>
        <span>/</span>
        <span className="font-semibold text-ink">Literary Directory</span>
      </nav>

      <PageHead
        kicker="HTML LITERARY INDEX"
        title="Every poem, topic and word in one place"
        sub="A human-readable and crawler-friendly index of the entire Ek Khwaab library. Every link below is a real HTML anchor, one or two clicks from the homepage."
      />

      <div className="mb-10 flex flex-wrap gap-2 text-xs">
        {[
          ["#core-hubs", "Core hubs"],
          ["#topic-hubs", "8 topic hubs"],
          ["#stages", "7 stages of love"],
          ["#poems", "All poems"],
          ["#lughat", "All 35 words"],
          ["#feeds", "Sitemap & RSS"],
        ].map(([href, label]) => (
          <a
            key={href}
            href={href}
            className="rounded-full border border-hairline bg-card px-3 py-1.5 text-muted-foreground transition hover:border-royal hover:text-royal"
          >
            {label}
          </a>
        ))}
      </div>

      {/* Core feature hubs */}
      <section id="core-hubs" aria-labelledby="core-hubs-heading" className="scroll-mt-24">
        <h2 id="core-hubs-heading" className="flex items-center gap-2 text-xl font-semibold text-ink sm:text-2xl">
          <Compass className="size-5 text-crimson" /> Core Feature Hubs
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CORE_HUBS.map((hub) => (
            <Link
              key={hub.to + hub.label}
              to={hub.to}
              className={cn(card, "group p-4 transition hover:border-gold hover:shadow-card")}
            >
              <h3 className="text-sm font-semibold text-ink group-hover:text-crimson">{hub.label}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{hub.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* 8 topic hubs */}
      <section id="topic-hubs" aria-labelledby="topic-hubs-heading" className="mt-12 scroll-mt-24">
        <h2 id="topic-hubs-heading" className="flex items-center gap-2 text-xl font-semibold text-ink sm:text-2xl">
          <Sparkles className="size-5 text-crimson" /> High-Intent Shayari Topic Hubs
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Each hub carries 350+ words of original commentary, multi-script couplets, Lughat vocabulary, and an AI writing prompt.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.values(TOPICS).map((topic) => (
            <Link
              key={topic.slug}
              to="/topic/$topic"
              params={{ topic: topic.slug }}
              className={cn(card, "group p-4 transition hover:border-gold hover:shadow-card")}
            >
              <h3 className="text-sm font-semibold text-ink group-hover:text-crimson">{topic.title}</h3>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{topic.sub}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* 7 stages of love */}
      <section id="stages" aria-labelledby="stages-heading" className="mt-12 scroll-mt-24">
        <h2 id="stages-heading" className="flex items-center gap-2 text-xl font-semibold text-ink sm:text-2xl">
          <Feather className="size-5 text-crimson" /> Saat Muqaam-e-Ishq — The 7 Stages of Love
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          The traditional arc from the first glance to the dissolution of the self. Each stage opens directly on the full essay.
        </p>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {LOVE_STAGES.map((stage) => (
            <li key={stage.id}>
              <Link
                to="/stages-of-love"
                hash={`muqaam-${stage.number}`}
                className={cn(card, "group flex h-full flex-col p-4 transition hover:border-gold hover:shadow-card")}
              >
                <span className="font-mono text-[11px] font-semibold text-gold-ink">STAGE {stage.number}</span>
                <span className="mt-1 text-sm font-semibold text-ink group-hover:text-crimson">{stage.roman}</span>
                <span className="text-xs text-muted-foreground">
                  {stage.hindi} · {stage.english}
                </span>
                <span className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{stage.meaning}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* All poems */}
      <section id="poems" aria-labelledby="poems-heading" className="mt-12 scroll-mt-24">
        <h2 id="poems-heading" className="flex items-center gap-2 text-xl font-semibold text-ink sm:text-2xl">
          <Library className="size-5 text-crimson" /> All Public Poems ({POEMS.length})
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Grouped by mood. Every poem page carries Hinglish, Devanagari Hindi, Nastaliq Urdu, English meaning, and Lughat links.
        </p>
        <div className="mt-4 space-y-8">
          {groups.map((group) => (
            <div key={group.mood}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-royal">{group.mood}</h3>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {group.poems.map((poem) => (
                  <li key={poem.id}>
                    <Link
                      to="/poetry/$slug"
                      params={{ slug: getPoemSlug(poem) }}
                      className="group flex items-start gap-2 rounded-xl border border-hairline bg-card px-3.5 py-3 transition hover:border-royal hover:shadow-sm"
                    >
                      <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-crimson" />
                      <span>
                        <span className="block font-serif text-sm italic text-ink group-hover:text-crimson">
                          {poem.hinglish[0]}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                          @{poem.takhallus} · {poem.format}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* All Lughat words */}
      <section id="lughat" aria-labelledby="lughat-heading" className="mt-12 scroll-mt-24">
        <h2 id="lughat-heading" className="flex items-center gap-2 text-xl font-semibold text-ink sm:text-2xl">
          <BookOpen className="size-5 text-crimson" /> All {LUGHAT.length} Lughat Words
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Urdu and Hindi poetic vocabulary with pronunciation, etymology, nuance, and classical couplet examples.
        </p>
        <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {LUGHAT.map((word) => (
            <li key={word.roman}>
              <Link
                to="/dictionary/$word"
                params={{ word: getWordSlug(word) }}
                className="block rounded-xl border border-hairline bg-card px-3 py-2.5 transition hover:border-royal hover:bg-wash"
              >
                <span className="block text-sm font-semibold text-ink">{word.roman}</span>
                <span className="block text-[11px] text-muted-foreground">
                  <span className="deva">{word.hindi}</span> · {word.meaning.split(",")[0]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Feeds */}
      <section id="feeds" aria-labelledby="feeds-heading" className="mt-12 scroll-mt-24 rounded-3xl border border-gold-line bg-cashmere p-6 sm:p-8">
        <h2 id="feeds-heading" className="text-xl font-semibold text-ink sm:text-2xl">
          Machine-readable indexes
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          For search engines, RSS readers, and AI assistants that cite the platform.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <a href="/sitemap.xml" className="rounded-full border border-gold-line bg-white px-4 py-2 font-medium text-ink hover:border-gold">
            sitemap.xml
          </a>
          <a href="/rss.xml" className="rounded-full border border-gold-line bg-white px-4 py-2 font-medium text-ink hover:border-gold">
            rss.xml
          </a>
          <a href="/llms.txt" className="rounded-full border border-gold-line bg-white px-4 py-2 font-medium text-ink hover:border-gold">
            llms.txt
          </a>
          <a href="/llms-full.txt" className="rounded-full border border-gold-line bg-white px-4 py-2 font-medium text-ink hover:border-gold">
            llms-full.txt
          </a>
          <a href="/robots.txt" className="rounded-full border border-gold-line bg-white px-4 py-2 font-medium text-ink hover:border-gold">
            robots.txt
          </a>
        </div>
      </section>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link to="/ai-poet" className="inline-flex items-center gap-1.5 rounded-full bg-crimson px-6 py-2.5 text-sm font-medium text-white hover:bg-crimson-hover">
          Write with the AI Poet <ArrowRight className="size-4" />
        </Link>
        <Link to="/feed" className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-card px-6 py-2.5 text-sm font-medium text-ink hover:border-royal">
          Open the poetry feed
        </Link>
      </div>
    </div>
  );
}
