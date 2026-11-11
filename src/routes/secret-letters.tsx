import { createFileRoute } from "@tanstack/react-router";
import { Letters } from "./letters";
import { useDocumentSEO } from "@/hooks/useDocumentSEO";

export const Route = createFileRoute("/secret-letters")({
  validateSearch: (s: Record<string, unknown>) => ({
    id: typeof s["id"] === "string" ? s["id"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Khawaab Khat – Send Anonymous Wax-Sealed Poetry Letters | Ek Khwaab" },
      { name: "description", content: "Dedicate shayari secretly with interactive digital wax-sealed letters and clue-based guessing riddles." },
      { property: "og:title", content: "Khawaab Khat — Send Anonymous Wax-Sealed Poetry Letters | Ek Khwaab" },
      { property: "og:description", content: "Dedicate shayari secretly with interactive digital wax-sealed letters and clue-based guessing riddles." },
      { property: "og:url", content: "https://ekkhawaab.in/secret-letters" },
    ],
    links: [
      { rel: "canonical", href: "https://ekkhawaab.in/secret-letters" },
    ],
  }),
  component: SecretLettersPage,
});

function SecretLettersPage() {
  useDocumentSEO({
    title: "Khawaab Khat – Send Anonymous Wax-Sealed Poetry Letters | Ek Khwaab",
    description: "Dedicate shayari secretly with interactive digital wax-sealed letters and clue-based guessing riddles.",
    canonicalPath: "/secret-letters",
  });
  return <Letters />;
}
