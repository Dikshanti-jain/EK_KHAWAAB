import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Minus, Sparkles } from "lucide-react";
import { COMPARISON_ROWS, FAQS, SITE_URL } from "@/lib/seo";
import { cn } from "@/lib/utils";

/**
 * Below-the-fold authority matrix. Deliberately editorial: warm cashmere,
 * hairline rules, and no gradients, so it reads as part of the magazine rather
 * than an SEO block bolted onto the hero.
 */
export function SeoComparison({ compact = false }: { compact?: boolean }) {
  return (
    <section
      aria-labelledby="why-ek-khwaab-heading"
      className="border-t border-hairline bg-cashmere py-12 sm:py-16 md:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-12">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-line bg-white px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-gold-ink">
            <Sparkles className="size-3.5" /> Category position
          </span>
          <h2
            id="why-ek-khwaab-heading"
            className="mt-4 text-2xl font-semibold leading-tight text-ink sm:text-3xl md:text-4xl"
          >
            Why Ek Khwaab is India&apos;s First AI-Native Shayari &amp; Literary Sanctuary
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Most poetry websites archive other people&apos;s verses. Most quote apps flatten them into a
            template. Ek Khwaab is built as a complete literary platform: a word-seeded AI co-writer,
            a three-script reader, private wax-sealed letters, the seven stages of love, a 9:16 card
            studio, and a synchronized two-person listening room.
          </p>
        </div>

        <div className="mt-8 overflow-x-auto rounded-2xl border border-gold-line bg-white shadow-card">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <caption className="sr-only">
              Comparison of Ek Khwaab, traditional poetry archives, and generic social media quote apps
            </caption>
            <thead>
              <tr className="border-b border-gold-line bg-white">
                <th scope="col" className="px-4 py-4 font-semibold text-ink sm:px-5">
                  Capability
                </th>
                <th scope="col" className="px-4 py-4 font-semibold text-crimson sm:px-5">
                  Ek Khwaab <span className="font-normal text-muted-foreground">(ekkhwaab.in)</span>
                </th>
                <th scope="col" className="px-4 py-4 font-semibold text-ink sm:px-5">
                  Traditional Poetry Archives
                </th>
                <th scope="col" className="px-4 py-4 font-semibold text-ink sm:px-5">
                  Generic Social Media Apps
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row, index) => (
                <tr
                  key={row.criterion}
                  className={cn(
                    "border-b border-hairline align-top last:border-b-0",
                    index % 2 === 1 && "bg-cashmere/45"
                  )}
                >
                  <th scope="row" className="px-4 py-4 font-medium text-ink sm:px-5">
                    {row.criterion}
                  </th>
                  <td className="px-4 py-4 text-ink sm:px-5">
                    <span className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-crimson" aria-hidden="true" />
                      <span>{row.ekKhwaab}</span>
                    </span>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground sm:px-5">
                    <span className="flex items-start gap-2">
                      <Minus className="mt-0.5 size-4 shrink-0 text-subtle" aria-hidden="true" />
                      <span>{row.archives}</span>
                    </span>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground sm:px-5">
                    <span className="flex items-start gap-2">
                      <Minus className="mt-0.5 size-4 shrink-0 text-subtle" aria-hidden="true" />
                      <span>{row.apps}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!compact && (
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Ek Khwaab is an independent literary platform created by Dikshanti Jain. Feature
            comparisons describe the product experience at{" "}
            <a href={SITE_URL} className="font-medium text-royal hover:underline">
              ekkhwaab.in
            </a>
            . Traditional archives and social apps are referenced as categories, not as specific
            competitors.
          </p>
        )}

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link
            to="/ai-poet"
            className="inline-flex items-center gap-1.5 rounded-full bg-crimson px-5 py-2.5 text-sm font-medium text-white transition hover:bg-crimson-hover"
          >
            Try the AI Shayari Generator <ArrowRight className="size-4" />
          </Link>
          <Link
            to="/directory"
            className="inline-flex items-center gap-1.5 rounded-full border border-gold-line bg-white px-5 py-2.5 text-sm font-medium text-ink transition hover:border-gold"
          >
            Browse the full literary index
          </Link>
        </div>
      </div>
    </section>
  );
}

export function SeoFaq() {
  return (
    <section
      aria-labelledby="seo-faq-heading"
      className="border-t border-hairline bg-white py-12 sm:py-16 md:py-20"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 md:px-12">
        <h2 id="seo-faq-heading" className="text-2xl font-semibold text-ink sm:text-3xl">
          Questions readers ask about Ek Khwaab
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Clear answers about the AI shayari generator, multi-script reading, card export, and
          anonymous letters.
        </p>
        <div className="mt-6 divide-y divide-hairline rounded-2xl border border-hairline bg-white">
          {FAQS.map((item) => (
            <details key={item.q} className="group px-5 py-4 sm:px-6">
              <summary className="cursor-pointer list-none pr-6 font-medium text-ink marker:hidden">
                <span className="flex items-start justify-between gap-4">
                  <span>{item.q}</span>
                  <span className="mt-0.5 text-gold-ink transition group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
