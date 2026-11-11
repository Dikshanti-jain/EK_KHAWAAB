import { createFileRoute } from "@tanstack/react-router";
import { Feed } from "./feed";
import { useDocumentSEO } from "@/hooks/useDocumentSEO";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore Hindi, Urdu & Hinglish Shayari, Ghazals & Poems | Ek Khawaab" },
      {
        name: "description",
        content:
          "Browse trending two-line shayari, heartbreak poetry, late-night tanhai couplets, and unspoken love ghazals in Hinglish, Devanagari Hindi, and Nastaliq Urdu.",
      },
      { property: "og:title", content: "Explore Hindi, Urdu & Hinglish Shayari | Created by Dikshanti Jain | Ek Khawaab" },
      {
        property: "og:description",
        content:
          "Browse trending two-line shayari, heartbreak poetry, late-night tanhai couplets, and unspoken love ghazals in Hinglish, Devanagari Hindi, and Nastaliq Urdu.",
      },
      { property: "og:url", content: "https://ekkhawaab.in/explore" },
    ],
    links: [
      { rel: "canonical", href: "https://ekkhawaab.in/feed" },
    ],
  }),
  component: ExplorePage,
});

function ExplorePage() {
  useDocumentSEO({
    title: "Explore Hindi, Urdu & Hinglish Shayari, Ghazals & Poems | Ek Khawaab",
    description: "Browse trending two-line shayari, heartbreak poetry, late-night tanhai couplets, and unspoken love ghazals in Hinglish, Devanagari Hindi, and Nastaliq Urdu.",
    canonicalPath: "/feed",
  });
  return <Feed />;
}
