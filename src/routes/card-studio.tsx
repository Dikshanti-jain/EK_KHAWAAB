import { createFileRoute } from "@tanstack/react-router";
import { Studio } from "./studio";
import { useDocumentSEO } from "@/hooks/useDocumentSEO";

export const Route = createFileRoute("/card-studio")({
  head: () => ({
    meta: [
      { title: "Poetry & Shayari Card Maker – Download HD 9:16 & 1:1 Cards | Ek Khawaab" },
      {
        name: "description",
        content: "Create and download high-resolution Hindi, Urdu, and Hinglish shayari quote cards for Instagram Stories, WhatsApp Status, and square posts.",
      },
      { property: "og:title", content: "Poetry & Shayari Card Maker – Download HD 9:16 & 1:1 Cards | Ek Khawaab" },
      {
        property: "og:description",
        content: "Create and download high-resolution Hindi, Urdu, and Hinglish shayari quote cards for Instagram Stories, WhatsApp Status, and square posts.",
      },
      { property: "og:url", content: "https://ekkhawaab.in/card-studio" },
    ],
    links: [
      { rel: "canonical", href: "https://ekkhawaab.in/card-studio" },
    ],
  }),
  component: CardStudioPage,
});

function CardStudioPage() {
  useDocumentSEO({
    title: "Poetry & Shayari Card Maker – Download HD 9:16 & 1:1 Cards | Ek Khawaab",
    description: "Create and download high-resolution Hindi, Urdu, and Hinglish shayari quote cards for Instagram Stories, WhatsApp Status, and square posts.",
    canonicalPath: "/card-studio",
  });
  return <Studio />;
}
