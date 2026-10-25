# Ek Khawaab — Build Plan

A literary poetry sanctuary with 9 views, built from your brief. Everything works out of the box with rich seed poetry (10 couplets in Hinglish, Devanagari, Urdu + English).

## Pages (each its own address)
1. `/` Dehleez — landing: manifesto hero, live demo card (script switch, tap-to-Lughat, paper toggle), 4-pillar bento grid, scrolling couplet ticker, footer.
2. `/auth` Takhallus onboarding — Naya Shayar (pen-name spinner + availability check, 6 ink sigils, 4-word Tijori key with copy/download), Wapsi login (password or Tijori key), one-click Mehmaan guest entry.
3. `/mehfil` Feed — 3 columns: nav rail, feed with format + mood filters and global script toggle, cards with per-card script switch, Lughat popovers, reactions (Daad ripple, Muqarrar, Hashiya replies, Basta save, open in Studio, send as Khat). Right rail: Lafz-e-Roz, trending tags.
4. `/studio` Nigaar-Khana — 9:16 / 1:1 / 4:5, 8 paper themes, font, size, spacing, alignment, 4 dividers, watermark; real PNG download via Canvas, copy link, post to Mehfil.
5. `/khat` Khawaab Khat — compose (poem, 2 clues, secret answer, seal color + emblem) and receiver simulator (break wax seal, read letter, unlock clues, 3 guesses, Jawaabi Sher reply).
6. `/shayar` AI co-writer — situation input, 4 Ustaad personas, 4 forms; output in 3 scripts + English essence, Kaafiya/Radif highlighting, Alfaaz Upgrade suggestions, send to Studio / publish.
7. `/diwan` Profile — stats, tabs for Rachnayein, Basta folders, Maswada drafts editor.
8. `/lughat` Dictionary — 30+ searchable words with spellings, pronunciation (browser speech), meaning, example sher; themed collections.
9. `/adab`, `/privacy`, and a poetic "Gumshuda Warq" 404.

No chat inbox — private contact only through Khawaab Khat.

## Design
Exact palette from the brief (Kora Kagaz paper, Siyahi ink, Laakh wax red) plus Shab-e-Mehfil night mode with gilded gold. Fonts: Cormorant Garamond, Plus Jakarta Sans, Tiro Devanagari Hindi / Rozha One, Noto Nastaliq Urdu (RTL, line-height 2.4), JetBrains Mono. Paper-grain overlay, double hairline frames, wax-seal medallions.

## Saving and AI
- First version stores accounts, reactions, saved poems, drafts, and letters in the browser, so it works immediately for demos and judges.
- AI co-writer: real poetry generation via Lovable AI (needs Lovable Cloud, which is having a platform issue right now). If Cloud can't be enabled yet, the co-writer ships with curated persona-based results and switches to live AI once Cloud is up.

## Technical details
- TanStack routes per view, shared app shell in `__root.tsx`, per-route head() metadata.
- Global store (React context + localStorage) for script preference, theme, user, reactions, basta, drafts, khats.
- `src/data/` for poems (with vocabulary tags), lughat, personas, takhallus parts.
- Poem renderer component that wraps glossary words in Lughat popovers and handles RTL.
- Card export: draw to canvas at 1080-wide resolution with `document.fonts.ready`, then `toBlob` download.
- AI: `createServerFn` calling the AI gateway with structured JSON output (3 scripts, translation, kaafiya, radif, upgrades).
