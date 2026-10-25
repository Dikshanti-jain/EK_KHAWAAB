<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- App state (user incl. private vault fields, liked, saved, letters) lives in a React context persisted to localStorage (`src/lib/store.tsx`) — demo-ready with no auth backend yet.
- Seed poems and lughat live in `src/data/`; every poem carries hinglish/hindi/urdu/english line arrays so script switching is instant.
- Card Studio renders and exports through a single canvas draw function so preview and PNG are identical; canvas colours are literal hex by necessity.
- AI Poet runs server-side in `src/lib/shayar.functions.ts` (Lovable AI Responses API, structured output) taking seed words + situation + style; prompts must use `instructions`, not system messages (AI SDK 7). Seed highlighting logic is in `src/lib/seeds.ts` with tests.
