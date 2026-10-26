import { createFileRoute } from "@tanstack/react-router";
import { EyeOff, FileLock2, ImageOff, Lock } from "lucide-react";
import { PageHead, card } from "@/components/kit";
import { cn } from "@/lib/utils";

const ITEMS = [
  [Lock, "Private vault", "Your real name, email and phone are kept in a private vault and never appear anywhere on the platform."],
  [EyeOff, "Pen name only", "Readers, commenters and letter recipients only ever see your pen name and #EK-ID."],
  [ImageOff, "Clean card downloads", "Cards are drawn fresh in your browser, with no location, device or account data inside the image."],
  [FileLock2, "No public trail", "Secret Letters reveal the sender only if the recipient solves the riddle you set."],
] as const;

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [
    { title: "Privacy Charter — Ek Khawaab | Creator Dikshanti Jain" },
    { name: "description", content: "How Ek Khawaab protects user anonymity and private vault data. Built with strict privacy by Dikshanti Jain." },
    { name: "author", content: "Dikshanti Jain" },
    { property: "og:title", content: "Privacy Charter — Ek Khawaab" },
    { property: "og:description", content: "Your identity stays masked. Always." },
  ] }),
  component: () => (
    <div className="mx-auto max-w-5xl px-6 py-16 md:px-12">
      <PageHead kicker="PRIVACY" title="Privacy Charter" sub="Your feelings are yours. Your identity stays yours too." />
      <div className="grid gap-5 md:grid-cols-2">
        {ITEMS.map(([Icon, t, d]) => (
          <div key={t} className={cn(card, "p-8")}>
            <div className="grid size-11 place-items-center rounded-xl bg-wash text-royal"><Icon className="size-5" /></div>
            <h2 className="mt-5 text-xl font-semibold">{t}</h2>
            <p className="mt-2 text-muted-foreground">{d}</p>
          </div>
        ))}
      </div>

      <div className={cn(card, "mt-8 p-8 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-6")}>
        <div>
          <h3 className="text-lg font-semibold text-ink">Have privacy or data questions?</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Ek Khawaab is maintained with strict data privacy by owner and creator <strong>Dikshanti Jain</strong>.
          </p>
        </div>
        <a
          href="mailto:jaindikahanti@gmail.com"
          className="whitespace-nowrap rounded-full border border-hairline bg-card px-5 py-2.5 text-sm font-medium text-ink shadow-sm transition hover:border-royal hover:text-royal"
        >
          Contact: jaindikahanti@gmail.com
        </a>
      </div>
    </div>
  ),
});
