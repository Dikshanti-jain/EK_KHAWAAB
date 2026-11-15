import { createFileRoute } from "@tanstack/react-router";
import { Feed } from "./feed";
import { useDocumentSEO } from "@/hooks/useDocumentSEO";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Poetry by Mood — Ishq, Hijr, Tanhai & Philosophy | Ek Khwaab" },
      {
        name: "description",
        content:
          "Browse Ek Khwaab poetry by mood: heartbreak and hijr, unspoken love, late-night tanhai, and life philosophy. Every verse reads in Hinglish, Devanagari Hindi, and Nastaliq Urdu.",
      },
      { property: "og:title", content: "Poetry by Mood — Ishq, Hijr, Tanhai & Philosophy | Ek Khwaab" },
      {
        property: "og:description",
        content:
          "A mood-first lens on the multi-script poetry feed: heartbreak, love, solitude and philosophy.",
      },
      { property: "og:url", content: "https://ekkhwaab.in/explore" },
    ],
    links: [
      { rel: "canonical", href: "https://ekkhwaab.in/feed" },
    ],
  }),
  component: ExplorePage,
});

function ExplorePage() {
  useDocumentSEO({
    title: "Poetry by Mood — Ishq, Hijr, Tanhai & Philosophy | Ek Khwaab",
    description:
      "Browse Ek Khwaab poetry by mood: heartbreak and hijr, unspoken love, late-night tanhai, and life philosophy. Every verse reads in Hinglish, Devanagari Hindi, and Nastaliq Urdu.",
    canonicalPath: "/feed",
  });
  return <Feed />;
}
