# Ek Khawaab — Clean White Editorial Redesign

Restyle the whole app to the new brief: crisp white, ink blue and crimson, rounded floating cards, and all interface text in plain English. Only the poem lines change when you switch Hinglish / Hindi / Urdu.

## What changes everywhere
- New palette exactly as the brief: white / #F8FAFC backgrounds, ink #0F172A, royal #1E3A8A, crimson #BE123C, slate greys. Beige paper, grain, double frames removed.
- Night mode button and the scrolling couplet strip removed.
- Pill-shaped buttons, rounded-2xl cards with soft shadow and hairline border; no boxes inside boxes.
- Fonts: Plus Jakarta Sans (interface), Playfair Display (headings and poems), Noto Serif Devanagari, Noto Nastaliq Urdu, JetBrains Mono (poet IDs).
- Every poet gets a unique ID badge like `#EK-4829`, shown next to their pen name everywhere, including comments.
- Navbar: Home, Explore Feed, AI Poet, Card Studio, Secret Letters, Dictionary; right side Sign In + Get Started. Profile reachable from the pen name once signed in.

## Page by page
1. **Home** — new hero copy, single floating poem card (@Abr_e_Shab, script toggle, tap-for-meaning words, Appreciate / Customize Card / Share), and the 4-card feature grid.
2. **Sign In / Get Started** — Step 1 private details (name, email, phone, password); Step 2 pen name: auto ID with Regenerate, vibe filters, 6 suggested names with English meanings, Shuffle, custom name, and the "Hidden in Vault / Visible on Feed" comparison. Complete Setup + Quick Demo Login. Sign In tab for returning users.
3. **Explore Feed** — English mood/format pills, "Read Poems In" selector, "+ Write a Poem" (quick compose box), cards with Appreciate, Comments drawer, Save, Open in Card Studio, Send as Secret Letter, plus English Meaning toggle.
4. **AI Poet** — seed-word chip input (2–6 words, with suggestion chips), situation field, 4 style cards (Modern Hinglish, Jaun Elia, Gulzar, Ghalib). Generated poem highlights your seed words in crimson pills. Post to Feed, Customize & Download Card, Regenerate.
5. **Card Studio** — script, 3 ratios, the 6 new themes as pills, font size, center/left, "Show Pen Name & #EK-ID" toggle, Download HD PNG.
6. **Secret Letters** — Send tab (poem, crimson or ink blue seal, Clue 1, Clue 2, unlock answer) and Preview Receiver tab (Break Wax Seal to Read, script switch, guessing box).
7. **My Profile** — Public Poet Profile, Saved Collection, Private Vault Settings showing your real details behind an "Encrypted Private Vault" badge.
8. **Dictionary**, Guidelines, Privacy and 404 restyled with English headings.

## Things to know
- The brief replaces the earlier rules about beige paper, the poetic reaction names (now "Appreciate", "Comments", "Save") and phone-free sign-up. I'll update the saved project rules to match.
- Real name, email and phone are kept only in the visitor's own browser for now — nothing is sent anywhere, so the "vault" is genuinely private but not a real account yet. Real accounts can be added later.
- No-DM rule stays: private contact remains through Secret Letters only.

## Technical details
- Rewrite tokens in `src/styles.css` (light only, drop `.dark` usage and grain/frame utilities); add a card shadow token.
- Update `__root.tsx` nav/footer/fonts; remove night toggle from store.
- Add `poetId` to poems, comments and user; extend `User` with private fields (name, email, phone).
- AI server function: add `seeds: string[]` and the new style list; prompt requires every seed word appear; return list of used seeds for highlighting.
- Studio: replace theme table with the 6 presets, drop dividers/watermark controls not in the brief, add ID toggle.
- Update `mem://index.md` and AGENTS.md rule for the AI input shape.
