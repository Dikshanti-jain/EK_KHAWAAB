# Packet 03 — Frontend: SWR Feed, Render Isolation & Chunk Budget

**Owner:** Zoya · **Risk:** low · **Time:** 1 day · **Reversible:** yes (per stage)

The frontend is the source of the database load. 1,000 users × 1.5 transitions/min × 2 sequential queries = **26 QPS of avoidable traffic**, and ~50 GB/month of egress against a 5 GB free Supabase allowance. This packet removes the amplification before the database work in packet 01 is asked to absorb it.

Measured baseline (from `.output/public/assets/`):

| Asset | Raw | Gzip |
|---|---|---|
| entry `index-*.js` | 755.0 kB | **216.8 kB** |
| `kit-*.js` | — | 19.6 kB |
| CSS | 94.2 kB | 17 kB |
| `dist/index.html` | 64.5 kB | — |
| `dist/feed/index.html` | 151.9 kB | — |

TanStack Query is installed and `QueryClientProvider` is mounted, with **zero call sites**. The cache is already paid for; this packet uses it.

## Why two stages

| Stage | Change | Fixes | Does **not** fix |
|---|---|---|---|
| **1** | `useInfiniteQuery` fetch layer, memoised filter, `useDeferredValue`, chunk split | network amplification, 2-RTT waterfall, INP, bundle size | 36-card re-render on like |
| **2** | cache as render source + per-poem interaction slice | like/comment re-render blast radius, `poems` array cloning | — |

Ship stage 1 before launch. Stage 2 is a post-launch hardening; it is included because the checklist item "liking one card does not re-render all cards" cannot pass without it. `React.memo(PoemCard)` alone does nothing while the card subscribes to the whole store context — that is the trap this packet exists to document.

---

## Stage 1

### 1. `src/lib/feed-cache.ts` — new file

This replaces the two-query `fetchPoems()` path with one RPC call (packet 01 §4) and a real cache key.

```ts
import {
  useInfiniteQuery,
  keepPreviousData,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { POEMS, type Poem, type Script } from "@/data/poems";
import { detectScript } from "./translation.service";

export type FeedCursor = { createdAt: string; id: string };
export type FeedPage = { poems: Poem[]; nextCursor: FeedCursor | null; error: string | null };

const PAGE_SIZE = 20;

/* ------------------------------ cursor codec ----------------------------- */
// base64url so the cursor survives a URL and a React key without escaping.
export function encodeCursor(c: FeedCursor): string {
  const b64 = btoa(JSON.stringify(c));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeCursor(s: string): FeedCursor | null {
  try {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const parsed = JSON.parse(atob(padded));
    if (typeof parsed?.createdAt !== "string" || typeof parsed?.id !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

/* -------------------------------- row type ------------------------------- */
type FeedRow = {
  id: string;
  shayar_uid: string;
  takhallus: string | null;
  hinglish_text: string | null;
  hindi_text: string | null;
  urdu_text: string | null;
  english_translation: string | null;
  mood_tag: string | null;
  format_type: string | null;
  seed_words: string[] | null;
  is_gumnaam: boolean;
  daad_count: number;
  created_at: string;
  is_owner: boolean;
  recent_comments:
    | { id: string; comment_text: string; created_at: string; takhallus: string | null }[]
    | null;
};

const lines = (v: string | null) => (v ? v.split("\n") : []);

function toPoem(row: FeedRow): Poem {
  const hinglish = lines(row.hinglish_text);
  const hindi = lines(row.hindi_text);
  const urdu = lines(row.urdu_text);
  const english = lines(row.english_translation);
  const source = detectScript(row.hinglish_text || row.hindi_text || row.urdu_text || "");

  const tagSource = row.seed_words?.length
    ? row.seed_words.map((w) => (w.startsWith("#") ? w : `#${w}`))
    : [`#${(row.mood_tag || "Shayari").replace(/\s+/g, "")}`];

  return {
    id: row.id,
    takhallus: row.takhallus || "Gumnaam_Shayar",
    shayarUid: row.shayar_uid,
    isOwner: Boolean(row.is_owner),
    format: row.format_type || "Sher",
    mood: row.mood_tag || "Unspoken Love",
    style: "Modern",
    paper: "kora",
    hinglish,
    hindi,
    urdu,
    english,
    sourceLanguage: source,
    translationStatus: {
      hinglish: hinglish.length ? "completed" : "pending",
      hindi: hindi.length ? "completed" : "pending",
      urdu: urdu.length ? "completed" : "pending",
      english: english.length ? "completed" : "pending",
    } as Record<Script, "completed" | "pending">,
    daad: row.daad_count ?? 0,
    muqarrar: Math.floor((row.daad_count ?? 0) / 4),
    hashiya: (row.recent_comments ?? []).map((c) => ({
      by: c.takhallus || "Reader",
      text: c.comment_text,
    })),
    tags: tagSource,
  };
}

function mergeSeeds(poems: Poem[]): Poem[] {
  const ids = new Set(poems.map((p) => p.id));
  return [...poems, ...POEMS.filter((p) => !ids.has(p.id))];
}

/* ------------------------------- fetch page ------------------------------ */
export async function fetchFeedPage(cursor: FeedCursor | null): Promise<FeedPage> {
  const { data, error } = await supabase.rpc("get_feed_page", {
    p_cursor_created_at: cursor?.createdAt ?? null,
    p_cursor_id: cursor?.id ?? null,
    p_mood: null,
    p_limit: PAGE_SIZE + 1,
  });

  if (error) {
    console.error("[feed] rpc failed:", error.message);
    // First page still renders the curated corpus; later pages just stop.
    return cursor
      ? { poems: [], nextCursor: null, error: error.message }
      : { poems: POEMS, nextCursor: null, error: error.message };
  }

  const rows = (data ?? []) as FeedRow[];
  const hasMore = rows.length > PAGE_SIZE;
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

  const last = page[page.length - 1];
  return {
    poems: page.map(toPoem),
    nextCursor: hasMore && last ? { createdAt: last.created_at, id: last.id } : null,
    error: null,
  };
}

/* --------------------------------- hooks --------------------------------- */
export function useFeed(scope: string) {
  return useInfiniteQuery({
    queryKey: ["feed", scope],
    queryFn: ({ pageParam }) => fetchFeedPage(pageParam),
    initialPageParam: null as FeedCursor | null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 45_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    select: (data) => {
      const all = data.pages.flatMap((p) => p.poems);
      return {
        poems: mergeSeeds(all),
        error: data.pages.find((p) => p.error)?.error ?? null,
      };
    },
  });
}

/* ------------------------- cache mutation helpers ------------------------ */
// Needed because the feed is now cached: a delete that only touches the
// Zustand-style store reappears when the user navigates back inside staleTime.

type FeedData = InfiniteData<FeedPage, FeedCursor | null>;

function mapPages(qc: QueryClient, fn: (p: FeedPage, i: number) => FeedPage) {
  qc.setQueriesData<FeedData>({ queryKey: ["feed"] }, (old) =>
    old ? { ...old, pages: old.pages.map(fn) } : old
  );
}

export function patchFeedPoem(qc: QueryClient, id: string, patch: Partial<Poem>) {
  mapPages(qc, (p) => ({
    ...p,
    poems: p.poems.map((poem) => (poem.id === id ? { ...poem, ...patch } : poem)),
  }));
}

export function removeFeedPoem(qc: QueryClient, id: string) {
  mapPages(qc, (p) => ({ ...p, poems: p.poems.filter((poem) => poem.id !== id) }));
}

export function prependFeedPoem(qc: QueryClient, poem: Poem) {
  mapPages(qc, (p, i) => (i === 0 ? { ...p, poems: [poem, ...p.poems] } : p));
}
```

Notes:

- `p_limit: PAGE_SIZE + 1` is the "has more" probe. The RPC clamps to 50, so do not exceed 49 here.
- The cursor is `(created_at, id)`, not `created_at` alone. Two poems published in the same millisecond would otherwise be skipped or repeated — a real bug in the current `lt("created_at")` cursor.
- `select` merges seeds and dedupes by id. Seeds appear exactly once, on the first page.
- The RPC error path is intentional: before packet 01 lands, the function does not exist, and the feed still renders 16 curated poems instead of an empty screen.
- `supabase` is typed with the generated `Database` schema. If `get_feed_page` is not in that file yet, regenerate it (`supabase gen types typescript --project-id <ref> > src/integrations/supabase/types.ts`) or the `.rpc()` call will be a type error. Casting to `any` here hides real argument-name mistakes; regenerate instead.

### 2. `queryClient` defaults — `src/router.tsx`

```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 2,
      retryDelay: (i) => Math.min(1000 * 2 ** i, 8_000),
      refetchOnWindowFocus: false,
      networkMode: "offlineFirst",
    },
    mutations: { retry: 0 },
  },
});
```

`refetchOnWindowFocus: false` is deliberate. This is a poetry feed, not a trading terminal; a tab switch must not cost a query. `networkMode: "offlineFirst"` means a flaky connection serves the cached page instead of an error.

### 3. `src/routes/feed.tsx` — the read path

Remove:

- `nextCursor` and `loadingMore` state (lines 48–49)
- the `fetchPoems()` effect (lines 69–80)
- the `loadMore` function (lines 82–94)

Add:

```tsx
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useFeed, prependFeedPoem } from "@/lib/feed-cache";

const qc = useQueryClient();
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useFeed(
  user?.poetId ?? "anon"
);
const poems = data?.poems ?? POEMS;

const deferredQuery = useDeferredValue(search.trim().toLowerCase());

const list = useMemo(
  () =>
    poems.filter((p) => {
      if (!matchFilter(p, f)) return false;
      if (!deferredQuery) return true;
      return (
        poetId(p.takhallus).toLowerCase().includes(deferredQuery) ||
        p.takhallus.toLowerCase().includes(deferredQuery) ||
        p.mood.toLowerCase().includes(deferredQuery) ||
        p.format.toLowerCase().includes(deferredQuery) ||
        [...p.hinglish, ...p.hindi, ...p.urdu, ...p.english, ...(p.tags || [])]
          .join(" ")
          .toLowerCase()
          .includes(deferredQuery)
      );
    }),
  [poems, f, deferredQuery]
);

const sentinel = useRef<HTMLDivElement>(null);
useEffect(() => {
  const el = sentinel.current;
  if (!el || !hasNextPage) return;
  const io = new IntersectionObserver(
    ([e]) => {
      if (e.isIntersecting && !isFetchingNextPage) fetchNextPage();
    },
    { rootMargin: "600px 0px" }
  );
  io.observe(el);
  return () => io.disconnect();
}, [hasNextPage, isFetchingNextPage, fetchNextPage]);
```

Render the sentinel where "Load more" lives today:

```tsx
<div ref={sentinel} className="h-10" aria-hidden />
{isFetchingNextPage && <Loader2 className="mx-auto size-5 animate-spin text-subtle" />}
```

`useDeferredValue` is the INP fix. Typing stays responsive because the expensive filter runs against a deferred query; React renders the stale list for one frame instead of blocking the keystroke.

`isLoading` is only true on a cold cache. Do **not** gate the list on it — the fallback (`POEMS`, or the store bridge below) already gives the first paint content.

### 4. Keep the store in sync (stage-1 bridge)

`feed.tsx` still renders `poems` from `useStore()` today, and `PoemCard` mutates that array on like/comment/delete. The least invasive bridge is to write fetched pages into the store, not to rewrite every card in the same deploy. The existing destructure on line 41 becomes:

```tsx
const { poems: storePoems, script, set, updatePoem, user } = useStore();
const poems = data?.poems ?? storePoems ?? POEMS;

useEffect(() => {
  if (data?.poems) set({ poems: data.poems });
}, [data?.poems, set]);
```

This is a bridge, not the destination. It costs one extra render per fetched page (not per keystroke) and keeps every existing `PoemCard` working. Stage 2 removes it. If you apply §3 and §4 in the same PR, keep exactly one `const poems = …` declaration — the bridge version above replaces the one in §3.

The three cache mutations that **must** be wired now, or the cache will resurrect deleted rows:

| Action | Today | Add |
|---|---|---|
| delete poem | `store.set({ poems: filter })` | `removeFeedPoem(qc, poem.id)` |
| add comment | `store.set({ poems: map })` | `patchFeedPoem(qc, poem.id, { hashiya: [...] })` |
| publish new poem | `set({ poems: [newPoem, ...] })` | `prependFeedPoem(qc, newPoem)` and/or `qc.invalidateQueries({ queryKey: ["feed"] })` |

`PoemCard` already has access to `useQueryClient()` (it is inside the provider). Add the one-line calls next to the existing `store.set`.

### 5. `src/lib/store.tsx` — split contexts

Keep `useStore()` working so no route changes in this deploy. Add two narrower hooks for new code:

```tsx
type Actions = {
  set: Ctx["set"];
  updatePoem: Ctx["updatePoem"];
  clearLocalData: () => void;
};

const StateCtx = createContext<State | null>(null);
const ActionsCtx = createContext<Actions | null>(null);
// kept for compatibility:
const CompatCtx = createContext<Ctx | null>(null);

// inside the provider:
const actions = useMemo<Actions>(
  () => ({ set, updatePoem, clearLocalData }),
  [set, updatePoem, clearLocalData]        // all three are already useCallback-stable
);
const compat = useMemo<Ctx>(() => ({ ...s, ...actions }), [s, actions]);

return (
  <ActionsCtx.Provider value={actions}>
    <StateCtx.Provider value={s}>
      <CompatCtx.Provider value={compat}>{children}</CompatCtx.Provider>
    </StateCtx.Provider>
  </ActionsCtx.Provider>
);

export const useStoreActions = () => {
  const a = useContext(ActionsCtx);
  if (!a) throw new Error("useStoreActions outside StoreProvider");
  return a;
};
```

What this buys today: `useStoreActions()` consumers never re-render when state changes. `PoemCard` can adopt it for `set`/`updatePoem` while still reading `liked`/`saved` from `useStore()`. That is a partial win — the card still re-renders on `liked` — which is exactly why stage 2 exists.

Cost of `compat`: one extra object per state change, ~200 bytes. Acceptable for the compatibility window; remove after stage 2.

### 6. `vite.config.ts` — chunks

Vite 8 is Rolldown-based. `manualChunks` is the Rollup-compatible API and is what the blueprint specifies; if the build warns that it is deprecated, the native `advancedChunks` form is in the comment below. Use one, not both.

```ts
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const nitroPreset = process.env["NITRO_PRESET"] || (process.env["VERCEL"] ? "vercel" : undefined);

export default defineConfig({
  tanstackStart: { server: { entry: "server" } },
  ...(nitroPreset ? { nitro: { preset: nitroPreset } } : {}),

  vite: {
    build: {
      target: "es2020",
      cssCodeSplit: true,
      reportCompressedSize: true,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom", "scheduler"],
            tanstack: ["@tanstack/react-router", "@tanstack/react-query"],
            supabase: ["@supabase/supabase-js"],
            icons: ["lucide-react"],
            sonner: ["sonner"],
          },
          // Rolldown-native alternative. Use this instead if the build warns
          // that manualChunks is deprecated/ignored:
          // advancedChunks: {
          //   groups: [
          //     { name: "react", test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
          //     { name: "tanstack", test: /node_modules[\\/]@tanstack[\\/]/ },
          //     { name: "supabase", test: /node_modules[\\/]@supabase[\\/]/ },
          //     { name: "radix", test: /node_modules[\\/]@radix-ui[\\/]/ },
          //     { name: "icons", test: /node_modules[\\/]lucide-react[\\/]/ },
          //     { name: "sonner", test: /node_modules[\\/]sonner[\\/]/ },
          //   ],
          // },
        },
      },
    },
  },
});
```

> ✅ DO keep React and React-DOM in the same group. Splitting them is the classic cause of `Cannot read properties of undefined (reading 'createContext')` and chunk cycles.
>
> ❌ DON'T put `@tanstack/react-start` in the client `tanstack` group. It is a server/build package; grouping it pulls server-only code toward the client graph.

Studio lazy-loading: the route is already split, so verify rather than assume. Run `npx vite build --mode development` and inspect whether `studio` appears in the entry's import graph. If the canvas engine is in a shared chunk, convert it:

```tsx
const StudioCanvas = lazy(() => import("@/components/StudioCanvas"));
```

Do this only if the analyzer proves it; a blind `lazy()` around a route that is already split adds a request for no benefit.

### 7. Bundle budget in CI

`scripts/check-bundle-budget.mjs`:

```js
import { readdirSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const DIR = ".output/public/assets";
const ENTRY_LIMIT = 95 * 1024;
const CHUNK_LIMIT = 120 * 1024;

const files = readdirSync(DIR).filter((f) => f.endsWith(".js"));
let failed = false;

for (const f of files) {
  const raw = readFileSync(join(DIR, f));
  const gz = gzipSync(raw, { level: 9 }).length;
  const isEntry = /^index-/.test(f);
  const limit = isEntry ? ENTRY_LIMIT : CHUNK_LIMIT;
  const status = gz <= limit ? "ok" : "FAIL";
  if (gz > limit) failed = true;
  console.log(`${status.padEnd(4)} ${f.padEnd(40)} ${(raw.length / 1024).toFixed(1)} kB raw  ${(gz / 1024).toFixed(1)} kB gz  (limit ${(limit / 1024).toFixed(0)})`);
}

if (failed) {
  console.error("\nBundle budget exceeded. Split the chunk or remove the import.");
  process.exit(1);
}
```

Add to `package.json`:

```json
"build": "npx tsx scripts/generate-sitemap.ts && vite build && node scripts/prerender-seo.mjs && node scripts/check-bundle-budget.mjs"
```

The budget is the only thing that prevents the next feature from silently re-inflating the entry to 216 kB.

---

## Stage 2 (post-launch hardening)

### 8. Cache as the render source

Remove the store bridge. `feed.tsx` renders `data.poems` directly. `PoemCard` no longer calls `store.updatePoem` for feed poems; it calls the cache helpers.

### 9. Per-poem interaction slice

A context cannot provide per-card isolation: every consumer re-renders when the provider value changes. The fix is a tiny external store with per-id subscriptions. `src/lib/interactions.ts`:

```ts
import { useSyncExternalStore } from "react";

export type Interaction = { liked: boolean; saved: boolean; daadDelta: number };

const EMPTY: Interaction = { liked: false, saved: false, daadDelta: 0 };
const state = new Map<string, Interaction>();
const listeners = new Map<string, Set<() => void>>();
let version = 0;
const globalListeners = new Set<() => void>();

function emit(id: string) {
  version++;
  listeners.get(id)?.forEach((l) => l());
  globalListeners.forEach((l) => l());
}

export function getInteraction(id: string): Interaction {
  return state.get(id) ?? EMPTY;
}

export function setInteraction(id: string, patch: Partial<Interaction>) {
  state.set(id, { ...getInteraction(id), ...patch });
  emit(id);
}

export function bumpDaad(id: string, delta: number) {
  const cur = getInteraction(id);
  setInteraction(id, { daadDelta: cur.daadDelta + delta });
}

export function hydrate(liked: string[], saved: string[]) {
  for (const id of liked) setInteraction(id, { liked: true });
  for (const id of saved) setInteraction(id, { saved: true });
}

export function useInteraction(id: string): Interaction {
  return useSyncExternalStore(
    (cb) => {
      let set = listeners.get(id);
      if (!set) listeners.set(id, (set = new Set()));
      set.add(cb);
      return () => set!.delete(cb);
    },
    () => getInteraction(id),
    () => EMPTY
  );
}

export function useInteractionVersion() {
  return useSyncExternalStore(
    (cb) => {
      globalListeners.add(cb);
      return () => globalListeners.delete(cb);
    },
    () => version,
    () => 0
  );
}
```

`PoemCard` changes:

```tsx
const { liked, saved, daadDelta } = useInteraction(poem.id);
const { set } = useStoreActions();

// render
<span>{poem.daad + daadDelta}</span>
```

`StoreProvider` calls `hydrate(s.liked, s.saved)` after loading localStorage and persists `interactions` back on change (debounced 1 s). This is the only place the two representations meet; after the migration, `liked`/`saved` can be removed from `State` entirely.

Result: liking one card notifies exactly one listener. The other 35 cards do not render.

**Risk:** `profile.tsx` and `poetry.$slug.tsx` still read `s.liked`/`s.saved`. Keep the store arrays mirrored during the transition, or migrate those two call sites in the same PR. Do not ship a half-migrated state where the same like is counted twice.

---

## Verify

```bash
npm run build
node scripts/check-bundle-budget.mjs
```

- [ ] `/` → `/feed` → `/` → `/feed` within 45 s issues **one** `get_feed_page` request (Network tab)
- [ ] the request returns ≤ 20 poems and ≤ 3 comments per poem
- [ ] scrolling to the sentinel fetches exactly one next page; no duplicate ids
- [ ] typing in search keeps INP < 100 ms at 4× CPU throttle
- [ ] entry chunk < 95 kB gzip; no chunk > 120 kB gzip
- [ ] `/studio` chunk is not requested on `/feed`
- [ ] delete a poem → navigate away and back → it stays deleted
- [ ] comment on a poem → navigate away and back → comment is present
- [ ] offline (DevTools) → feed shows seeds, no blank screen

## Rollback

| Stage | Rollback | Time |
|---|---|---|
| chunk split | revert `vite.config.ts`; chunks are hashed, no data migration | 5 min |
| feed RPC | revert `useFeed` to `fetchPoems`; the store bridge keeps rendering identical data | 10 min |
| store split | `useStore()` is unchanged, so reverting the provider is internal | 5 min |
| interaction slice | revert `PoemCard` imports; `store.liked` still authoritative | 10 min |

The bridge in §4 exists so that every stage-1 change can be reverted independently without touching `PoemCard`. Keep it until stage 2 is proven.

## Expected effect

| Metric | Today | Stage 1 | Stage 2 |
|---|---|---|---|
| Feed requests per mount | 2 (serial) | 1 | 1 |
| Requests for `/`→`/feed`→`/`→`/feed` | 4 | 1 | 1 |
| Entry gzip | 216.8 kB | ~90–100 kB | same |
| INP on search (4× throttle) | > 300 ms | < 100 ms | < 100 ms |
| Cards re-rendered on one like | 36 | 36 | 1 |
| Supabase egress at 1,000 CCU | ~50 GB/mo | ~12 GB/mo | ~12 GB/mo |

The last row assumes the edge cache in packet 04 is also live. Without it, the client cache still cuts requests by ~60%, but the origin and egress numbers remain dominated by HTML and asset delivery.
