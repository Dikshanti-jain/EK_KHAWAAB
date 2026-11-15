import { createFileRoute } from "@tanstack/react-router";
import { Letters } from "./letters";
import { useDocumentSEO } from "@/hooks/useDocumentSEO";

export const Route = createFileRoute("/secret-letters")({
  validateSearch: (s: Record<string, unknown>) => ({
    id: typeof s["id"] === "string" ? s["id"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Khwaab Khat — Anonymous Wax-Sealed Letter with Riddle Clues | Ek Khwaab" },
      {
        name: "description",
        content:
          "Seal a poem behind three clues and a private answer. The recipient must solve the Pehchan Kaun cipher before the sender's identity and full message are revealed.",
      },
      { property: "og:title", content: "Khwaab Khat — Anonymous Wax-Sealed Letter with Riddle Clues | Ek Khwaab" },
      {
        property: "og:description",
        content: "A poem, a wax seal, and three clues. The letter opens only when the riddle is solved.",
      },
      { property: "og:url", content: "https://ekkhwaab.in/secret-letters" },
    ],
    links: [
      { rel: "canonical", href: "https://ekkhwaab.in/letters" },
    ],
  }),
  component: SecretLettersPage,
});

function SecretLettersPage() {
  useDocumentSEO({
    title: "Khwaab Khat — Anonymous Wax-Sealed Letter with Riddle Clues | Ek Khwaab",
    description:
      "Seal a poem behind three clues and a private answer. The recipient must solve the Pehchan Kaun cipher before the sender's identity and full message are revealed.",
    canonicalPath: "/letters",
  });
  return <Letters />;
}
