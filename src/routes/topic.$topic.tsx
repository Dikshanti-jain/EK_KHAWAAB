import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Heart, Sparkles, BookOpen } from "lucide-react";
import { POEMS, getPoemSlug, type Poem } from "@/data/poems";
import { TOPICS, type TopicConfig } from "@/data/topics";
import { PageHead, card, btnOutline, btnPrimary, IdBadge } from "@/components/kit";
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
    const canonical = `https://ekkhwaab.in/topic/${topic.slug}`;

    return {
      meta: [
        { title: topic.seoTitle },
        { name: "description", content: topic.description },
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

  return (
    <div className="mx-auto max-w-5xl px-3.5 py-6 sm:px-6 md:px-12 md:py-14">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-ink">Home</Link>
        <span>/</span>
        <Link to="/feed" className="hover:text-ink">Explore Feed</Link>
        <span>/</span>
        <span className="font-semibold text-ink">{topic.title}</span>
      </nav>

      <PageHead
        kicker="TOPIC DIRECTORY"
        title={topic.heading}
        sub={topic.sub}
      />

      {/* Editorial Introduction */}
      <div className="mb-10 rounded-2xl border border-hairline bg-card p-6 sm:p-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-royal mb-2">The Poetic Tradition</h2>
        <p className="text-sm leading-relaxed text-ink/90">{topic.intro}</p>
      </div>

      {/* Topic Poems Grid */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-ink">
          Featured {topic.title} ({poems.length} Verses)
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {poems.map((poem) => {
            const slug = getPoemSlug(poem);
            return (
              <article key={poem.id} className={cn(card, "p-6 flex flex-col justify-between transition hover:shadow-float")}>
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                    <span className="font-mono">@{poem.takhallus}</span>
                    <span className="rounded-full bg-wash px-2.5 py-0.5 text-royal font-medium">{poem.format}</span>
                  </div>
                  <div className="font-serif text-lg italic text-ink leading-relaxed space-y-1">
                    {poem.hinglish.map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                  <div className="mt-3 text-sm deva text-muted-foreground">
                    {poem.hindi[0]}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-hairline flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{poem.daad > 0 ? poem.daad : "Appreciate"}</span>
                  <Link
                    to="/poetry/$slug"
                    params={{ slug }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-crimson hover:underline"
                  >
                    <span>Read in All Scripts & Tashreeh</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* Explore other topics */}
      <section className="mt-14 pt-10 border-t border-hairline">
        <h2 className="text-lg font-semibold text-ink mb-4">Explore More Topics</h2>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {Object.values(TOPICS).filter((t) => t.slug !== topic.slug).map((t) => (
            <Link
              key={t.slug}
              to="/topic/$topic"
              params={{ topic: t.slug }}
              className="rounded-2xl border border-hairline bg-card p-4 transition hover:border-royal hover:shadow-sm"
            >
              <h3 className="font-semibold text-sm text-ink">{t.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{t.sub}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Back to Feed */}
      <div className="mt-10 text-center">
        <Link to="/feed" className={cn(btnOutline, "px-6 py-2.5")}>
          <ArrowLeft className="size-4" /> Back to Full Feed
        </Link>
      </div>
    </div>
  );
}

