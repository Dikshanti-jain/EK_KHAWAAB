import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, Share2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { POEMS, type Script } from "@/data/poems";
import { useStore, uid, type Letter } from "@/lib/store";
import { createSecretKhat, attemptUnlockKhat, fetchSecretKhat } from "@/lib/khats.service";
import { IdBadge, PageHead, ScriptSwitch, Seal, Verse, btnOutline, btnPrimary, card, chip, input, label } from "@/components/kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/letters")({
  validateSearch: (s: Record<string, unknown>) => ({
    id: typeof s["id"] === "string" ? s["id"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Secret Letters — Wax-Sealed Poems | Ek Khawaab" },
      { name: "description", content: "Dedicate a poem anonymously with a wax seal and a 3-clue guessing cipher." },
      { property: "og:title", content: "Secret Letters — Ek Khawaab" },
      { property: "og:description", content: "Send a sealed poem. They have to guess it's you." },
    ],
  }),
  component: Letters,
});

const DEMO: Letter = {
  id: "demo",
  lines: POEMS[4]!.hinglish,
  clue1: "We sit in the same row in the 9 AM lecture.",
  clue2: "You lent me your umbrella on a rainy day.",
  answer: "Library",
  seal: "crimson",
  from: "Shab_e_Farda",
};

function Letters() {
  const { id: queryLetterId } = Route.useSearch();
  const { studio, letters, set, user } = useStore();
  const [tab, setTab] = useState<"send" | "preview">("send");
  const [l, setL] = useState<Letter>({
    ...DEMO,
    id: "",
    lines: studio?.lines ?? POEMS[0]!.hinglish,
    clue1: "",
    clue2: "",
    answer: "",
    from: user?.penName ?? "Anonymous",
  });
  const [active, setActive] = useState<Letter>(DEMO);
  const [copied, setCopied] = useState(false);
  const ready = l.clue1.trim() && l.clue2.trim() && l.answer.trim().length >= 2 && l.lines.join("").trim();

  // If URL has ?id=<letterId>, automatically fetch and display recipient experience
  useEffect(() => {
    if (queryLetterId) {
      fetchSecretKhat(queryLetterId).then((fetched) => {
        if (fetched) {
          setActive(fetched);
          setTab("preview");
          toast("Secret Letter loaded for you");
        }
      });
    }
  }, [queryLetterId]);

  const seal = async () => {
    const nl = await createSecretKhat({
      senderUid: user?.poetId || "#EK-7492",
      recipientIdentifier: "Anonymous_Recipient",
      lines: l.lines,
      clue1: l.clue1,
      clue2: l.clue2,
      answer: l.answer,
      seal: l.seal,
      from: user?.penName ?? "Anonymous",
    });
    set((s) => ({ letters: [nl, ...s.letters] }));
    setActive(nl);
    setTab("preview");
    toast("Letter sealed — copy the link to send it");
  };

  const copyLetterLink = (letterId: string) => {
    const url = `${window.location.origin}/letters?id=${encodeURIComponent(letterId)}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Secret dedication link copied to clipboard!");
    } else {
      toast(url);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 md:px-12">
      <PageHead
        kicker="SECRET LETTERS"
        title="Say it in verse. Stay a mystery."
        sub="Seal a poem with wax and a riddle. The recipient has to guess it was you."
      />
      <div className="mb-10 inline-flex rounded-full bg-muted p-1 text-sm font-medium">
        {(
          [
            ["send", "Send a Secret Letter"],
            ["preview", "Preview Receiver Experience"],
          ] as const
        ).map(([k, t]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cn("rounded-full px-5 py-2", tab === k ? "bg-background shadow-sm" : "text-muted-foreground")}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "send" ? (
        <div className="grid gap-8 lg:grid-cols-2">
          <div className={cn(card, "space-y-5 p-8")}>
            <div>
              <label className={label}>Choose a poem</label>
              <select
                onChange={(e) => {
                  const p = POEMS.find((x) => x.id === e.target.value);
                  if (p) setL({ ...l, lines: p.hinglish });
                }}
                className={input}
                defaultValue=""
              >
                <option value="" disabled>Pick from the feed…</option>
                {POEMS.map((p) => (
                  <option key={p.id} value={p.id}>{p.hinglish[0]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Or write your own</label>
              <textarea
                value={l.lines.join("\n")}
                onChange={(e) => setL({ ...l, lines: e.target.value.split("\n") })}
                rows={4}
                className={cn(input, "font-serif text-base")}
              />
            </div>
            <div>
              <label className={label}>Wax Seal</label>
              <div className="flex gap-2">
                <button onClick={() => setL({ ...l, seal: "crimson" })} className={chip(l.seal === "crimson")}>Crimson Red</button>
                <button onClick={() => setL({ ...l, seal: "royal" })} className={chip(l.seal === "royal")}>Ink Blue</button>
              </div>
            </div>
            <div className="space-y-3 rounded-2xl bg-secondary p-5">
              <p className="text-sm font-semibold text-ink">3-Clue Guessing Cipher</p>
              <div><label className={label}>Clue 1: Where we first met</label><input value={l.clue1} onChange={(e) => setL({ ...l, clue1: e.target.value })} className={input} placeholder="e.g. Same bench at the rain cafe" /></div>
              <div><label className={label}>Clue 2: An inside joke</label><input value={l.clue2} onChange={(e) => setL({ ...l, clue2: e.target.value })} className={input} placeholder="e.g. The cold chai we forgot" /></div>
              <div><label className={label}>Unlock Answer: Secret keyword or name</label><input value={l.answer} onChange={(e) => setL({ ...l, answer: e.target.value })} className={input} placeholder="Secret word to unlock your name" /></div>
            </div>
            <button disabled={!ready} onClick={seal} className={cn(btnPrimary, "w-full py-3")}>Seal & Send Letter</button>
          </div>
          <div className={cn(card, "flex flex-col items-center justify-center p-10")}>
            <p className="mb-6 text-xs font-medium uppercase tracking-wider text-subtle">Letter preview</p>
            <Verse lines={l.lines} script="hinglish" />
            <Seal tone={l.seal} className="mt-10" />
          </div>
          {letters.length > 0 && (
            <div className="lg:col-span-2">
              <p className={label}>Letters you've sealed</p>
              <div className="flex flex-wrap gap-2">
                {letters.map((x) => (
                  <div key={x.id} className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setActive(x);
                        setTab("preview");
                      }}
                      className={btnOutline}
                    >
                      Letter #{x.id.slice(0, 6).toUpperCase()}
                    </button>
                    <button
                      title="Copy Shareable Link"
                      onClick={() => copyLetterLink(x.id)}
                      className="rounded-full border border-hairline p-2 text-subtle hover:bg-muted hover:text-ink"
                    >
                      <Share2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {active.id && active.id !== "demo" && (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-hairline bg-card p-4">
              <span className="text-xs font-medium text-muted-foreground">
                Secret Dedication ID: <b className="font-mono text-ink">#{active.id.slice(0, 8).toUpperCase()}</b>
              </span>
              <button
                onClick={() => copyLetterLink(active.id)}
                className={cn(btnOutline, "py-1.5 text-xs")}
              >
                {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                {copied ? "Link Copied!" : "Copy Share Link"}
              </button>
            </div>
          )}
          <Receiver key={active.id} l={active} />
        </div>
      )}
    </div>
  );
}

function Receiver({ l }: { l: Letter }) {
  const [step, setStep] = useState<"sealed" | "breaking" | "open">("sealed");
  const [script, setScript] = useState<Script>("hinglish");
  const [clues, setClues] = useState(0);
  const [guess, setGuess] = useState("");
  const [tries, setTries] = useState(3);
  const [won, setWon] = useState(false);
  const match = POEMS.find((p) => p.hinglish.join() === l.lines.join());
  const open = () => {
    setStep("breaking");
    setTimeout(() => setStep("open"), 700);
  };
  const tryGuess = async () => {
    if (l.id && l.id !== "demo") {
      const res = await attemptUnlockKhat(l.id, guess);
      if (res.correct) {
        setWon(true);
        toast("You guessed it!");
        setGuess("");
        return;
      }
    }
    if (guess.trim().toLowerCase() === l.answer.trim().toLowerCase()) {
      setWon(true);
      toast("You guessed it!");
    } else {
      setTries((t) => t - 1);
      toast(tries - 1 > 0 ? `Not quite — ${tries - 1} attempts left` : "The secret stays sealed");
    }
    setGuess("");
  };

  if (step !== "open")
    return (
      <div className="flex flex-col items-center py-6">
        <div className="relative flex h-72 w-full max-w-lg items-center justify-center overflow-hidden rounded-3xl border border-hairline bg-card shadow-float">
          <div className="absolute inset-x-0 top-0 h-1/2 bg-secondary [clip-path:polygon(0_0,100%_0,50%_100%)]" />
          <button
            aria-label="Break wax seal"
            onClick={open}
            className={cn("relative z-10", step === "breaking" && "seal-break")}
          >
            <Seal tone={l.seal} className="size-24 text-3xl" />
          </button>
        </div>
        <button onClick={open} className={cn(btnPrimary, "mt-8 px-7 py-3")}>
          Break Wax Seal to Read
        </button>
      </div>
    );

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className={cn(card, "p-10")}>
        <div className="flex justify-end">{match && <ScriptSwitch value={script} onChange={setScript} />}</div>
        <div className="py-10">
          <Verse lines={match ? match[script] : l.lines} script={match ? script : "hinglish"} />
        </div>
        <p className="text-center text-sm text-subtle">
          — {won ? <span className="font-semibold text-ink">@{l.from}</span> : "A secret admirer"}
        </p>
      </div>
      <div className={cn(card, "space-y-4 p-8")}>
        <h3 className="text-2xl font-semibold">Who sent this?</h3>
        {[l.clue1, l.clue2].map((c, i) =>
          clues > i ? (
            <p key={i} className="rounded-xl bg-wash p-3 text-sm text-wash-foreground">
              <b>Clue {i + 1}:</b> {c}
            </p>
          ) : (
            <button key={i} disabled={clues < i} onClick={() => setClues(i + 1)} className={cn(btnOutline, "w-full")}>
              <Lock className="size-4" /> Reveal Clue {i + 1}
            </button>
          )
        )}
        {won ? (
          <div className="rounded-xl bg-blush p-4 text-crimson">
            <p className="font-semibold">It was @{l.from}</p>
            <div className="mt-1">
              <IdBadge id="Identity revealed by sender's riddle" />
            </div>
          </div>
        ) : tries > 0 ? (
          <div className="space-y-2">
            <input
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && tryGuess()}
              className={input}
              placeholder="Type your guess…"
            />
            <button onClick={tryGuess} className={cn(btnPrimary, "w-full")}>
              Submit Guess ({tries} left)
            </button>
            {l.id === "demo" && <p className="text-xs text-subtle">Demo hint: where books live.</p>}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No attempts left. The sender's identity stays a secret.</p>
        )}
      </div>
    </div>
  );
}
