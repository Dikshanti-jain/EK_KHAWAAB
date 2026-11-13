# Packet 01 — Database High-Concurrency Migration

**Owner:** Ayaan · **Risk:** medium · **Time:** 3 h · **Reversible:** yes

Full SQL lives in [`ARCHITECTURE_AND_SCALING_BLUEPRINT.md` §4](../../ARCHITECTURE_AND_SCALING_BLUEPRINT.md#4-database--sql-high-concurrency-upgrade-script). This packet is the execution runbook: what to split, what order, how to verify, how to undo.

## 0. Why this cannot be one `supabase db push`

`CREATE INDEX CONCURRENTLY` cannot run inside a transaction. Supabase's SQL editor and migration runner wrap statements in one. Apply with `psql -f`, which autocommits per statement.

```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 \
  -f supabase/migrations/20261115000000_ccu1000_schema.sql

psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 \
  -f supabase/migrations/20261115000001_ccu1000_indexes.sql
```

Two files, applied in order:

| File | Contents | Transactional? |
|---|---|---|
| `..._schema.sql` | functions, policies, view, tables, triggers, grants, timeouts | yes (safe) |
| `..._indexes.sql` | every `CREATE INDEX CONCURRENTLY` | **no** |

If you prefer the CLI, apply the schema file via `supabase db push` and the index file with `psql`.

## 1. Pre-flight (10 min)

```sql
-- record the baseline
SELECT count(*) AS poems FROM public.poems;
SELECT count(*) AS likes FROM public.poem_likes;
SELECT count(*) AS comments FROM public.comments;
SELECT pg_size_pretty(pg_total_relation_size('public.poems')) AS poems_size;

-- who can read what today (this is the F-02/F-07 evidence)
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('poems', 'public_shayars', 'comments', 'secret_khats')
  AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, grantee, privilege_type;

-- any invalid index from a previous failed run?
SELECT c.relname FROM pg_index i
JOIN pg_class c ON c.oid = i.indexrelid
WHERE NOT i.indisvalid;
```

Save the output. You will compare against it in §6.

Also capture the current plan:

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM public.safe_poems_feed ORDER BY created_at DESC LIMIT 21;
```

Expect a `SubPlan` or `InitPlan` for the ownership predicate and a heap fetch of wide rows. If it is already < 5 ms, the win here is still real (it removes the per-row probe and the write amplification), but do not expect a dramatic latency drop on a small dataset.

## 2. Schema file (excerpt — full text in blueprint §4)

The order matters. `current_shayar_uid()` must exist before the policies that call it; `poem_stats` must exist before the view references it.

```sql
-- 2.1 helper
CREATE OR REPLACE FUNCTION public.current_shayar_uid()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT shayar_uid FROM public.public_shayars WHERE auth_user_id = (SELECT auth.uid());
$$;
REVOKE ALL ON FUNCTION public.current_shayar_uid() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_shayar_uid() TO anon, authenticated;

-- 2.2 policies: replace every `shayar_uid IN (SELECT ... auth.uid())`
--     with `shayar_uid = public.current_shayar_uid()`
--     (full list of 10 DROP/CREATE pairs in blueprint §4.2)

-- 2.3 narrow counter table
CREATE TABLE IF NOT EXISTS public.poem_stats (
  poem_id uuid PRIMARY KEY REFERENCES public.poems(id) ON DELETE CASCADE,
  daad_count integer NOT NULL DEFAULT 0 CHECK (daad_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.poem_stats (poem_id, daad_count)
SELECT id, COALESCE(daad_count, 0) FROM public.poems
ON CONFLICT (poem_id) DO NOTHING;

ALTER TABLE public.poem_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Poem stats are publicly readable"
  ON public.poem_stats FOR SELECT USING (true);

-- 2.4 trigger now touches the narrow row, not the 4 kB poem row
CREATE OR REPLACE FUNCTION public.update_poem_daad_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.poem_stats (poem_id, daad_count, updated_at)
    VALUES (NEW.poem_id, 1, now())
    ON CONFLICT (poem_id) DO UPDATE
      SET daad_count = public.poem_stats.daad_count + 1, updated_at = now();
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.poem_stats
       SET daad_count = GREATEST(0, daad_count - 1), updated_at = now()
     WHERE poem_id = OLD.poem_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trigger_sync_poem_daad ON public.poem_likes;
CREATE TRIGGER trigger_sync_poem_daad
  AFTER INSERT OR DELETE ON public.poem_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_poem_daad_count();

-- 2.5 feed view: LATERAL ownership probe, COALESCE, stats join
CREATE OR REPLACE VIEW public.safe_poems_feed AS
SELECT
  p.id,
  CASE WHEN p.is_gumnaam THEN 'EK-GUMNAAM' ELSE p.shayar_uid END AS shayar_uid,
  CASE WHEN p.is_gumnaam THEN 'Gumnaam_Shayar' ELSE COALESCE(s.takhallus, 'Gumnaam_Shayar') END AS takhallus,
  p.hinglish_text, p.hindi_text, p.urdu_text, p.english_translation,
  p.mood_tag, p.format_type, p.seed_words, p.is_gumnaam,
  COALESCE(st.daad_count, p.daad_count, 0) AS daad_count,
  p.created_at,
  COALESCE(me.shayar_uid IS NOT NULL AND p.shayar_uid = me.shayar_uid, false) AS is_owner
FROM public.poems p
LEFT JOIN public.public_shayars s ON s.shayar_uid = p.shayar_uid
LEFT JOIN public.poem_stats st ON st.poem_id = p.id
LEFT JOIN LATERAL (
  SELECT shayar_uid FROM public.public_shayars
  WHERE auth_user_id = (SELECT auth.uid())
) me ON true;

GRANT SELECT ON public.safe_poems_feed TO anon, authenticated;
```

> ❌ **Do not add `security_barrier = true` to this view.** It would stop PostgreSQL from pushing the `created_at`/`mood_tag` predicates into the view, turning keyset pagination into a full view materialisation. The masking is in the SELECT list, not in a `WHERE`, so the barrier buys nothing here.

## 3. Index file (all `CONCURRENTLY`)

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_poems_feed_cursor
  ON public.poems (created_at DESC, id DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_poems_mood_cursor
  ON public.poems (mood_tag, created_at DESC, id DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_poem_created
  ON public.comments (poem_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_poem_likes_shayar
  ON public.poem_likes (shayar_uid, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_poems_shayar_created
  ON public.poems (shayar_uid, created_at DESC);

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_poems_hinglish_trgm
  ON public.poems USING gin (
    (hinglish_text || ' ' || COALESCE(english_translation, '')) gin_trgm_ops
  );

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_poems_slug
  ON public.poems (slug) WHERE slug IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_poems_translation_pending
  ON public.poems (created_at) WHERE translation_status IN ('pending','failed');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_khat_attempts_ip_time
  ON public.khat_attempts (ip_hash, created_at DESC);
```

Check for invalid builds before moving on:

```sql
SELECT c.relname FROM pg_index i
JOIN pg_class c ON c.oid = i.indexrelid
WHERE NOT i.indisvalid;
-- must return 0 rows. If not: DROP INDEX CONCURRENTLY <name>; then rebuild.
```

## 4. The one-query feed RPC

The goal is to replace **two** sequential PostgREST calls (poems, then all comments for those poems) with **one** call that returns at most 3 comments per poem.

```sql
CREATE OR REPLACE FUNCTION public.get_feed_page(
  p_cursor_created_at timestamptz DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL,
  p_mood text DEFAULT NULL,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid, shayar_uid text, takhallus text,
  hinglish_text text, hindi_text text, urdu_text text, english_translation text,
  mood_tag text, format_type text, seed_words text[], is_gumnaam boolean,
  daad_count integer, created_at timestamptz, is_owner boolean,
  recent_comments jsonb
)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public, pg_temp AS $$
  SELECT f.*, COALESCE(c.items, '[]'::jsonb)
  FROM (
    SELECT * FROM public.safe_poems_feed
    WHERE (p_mood IS NULL OR mood_tag = p_mood)
      AND (p_cursor_created_at IS NULL
           OR created_at < p_cursor_created_at
           OR (created_at = p_cursor_created_at AND id < p_cursor_id))
    ORDER BY created_at DESC, id DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 50)
  ) f
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(x ORDER BY x.created_at DESC) AS items
    FROM (
      SELECT c.id, c.comment_text, c.created_at, s.takhallus
      FROM public.comments c
      LEFT JOIN public.public_shayars s ON s.shayar_uid = c.shayar_uid
      WHERE c.poem_id = f.id
      ORDER BY c.created_at DESC
      LIMIT 3
    ) x
  ) c ON true
  ORDER BY f.created_at DESC, f.id DESC;
$$;

GRANT EXECUTE ON FUNCTION
  public.get_feed_page(timestamptz, uuid, text, integer) TO anon, authenticated;
```

`STABLE SECURITY INVOKER` is intentional: the function must run as the caller so `current_shayar_uid()` sees the caller's `auth.uid()`. A `SECURITY DEFINER` here would compute `is_owner` as false for everyone (or worse, true for the definer).

## 5. Write-once translation columns

```sql
DO $$ BEGIN
  CREATE TYPE public.translation_state AS ENUM ('pending','processing','complete','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.poems
  ADD COLUMN IF NOT EXISTS translation_status public.translation_state NOT NULL DEFAULT 'complete',
  ADD COLUMN IF NOT EXISTS source_script text NOT NULL DEFAULT 'hinglish',
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS translated_at timestamptz;
```

`DEFAULT 'complete'` is correct for existing rows; new inserts must explicitly pass `'pending'` (packet 03 / `createPoem`). The partial index keeps the pending-sweep cheap.

## 6. Grant lockdown (the privacy fix)

**Deploy order:** client must already read the view/RPC, not the base tables. The current client does (`poems.service.ts` uses `safe_poems_feed`), so this is safe today. The one exception is `store.tsx` selecting `public_shayars` — covered by the column grant below.

```sql
REVOKE ALL ON public.poems        FROM anon;
REVOKE ALL ON public.public_shayars FROM anon;
REVOKE ALL ON public.comments     FROM anon;
REVOKE ALL ON public.poem_likes   FROM anon;
REVOKE ALL ON public.bookmarks    FROM anon;

GRANT SELECT ON public.safe_poems_feed      TO anon;
GRANT SELECT ON public.public_shayar_directory TO anon;

-- authenticated keeps SELECT on poems (needed for .insert().select())
-- but loses the auth_user_id column on public_shayars
REVOKE SELECT (auth_user_id) ON public.public_shayars FROM authenticated;
GRANT SELECT (shayar_uid, takhallus, takhallus_meaning, vibe_category,
              avatar_color, created_at, updated_at)
  ON public.public_shayars TO authenticated;
```

> ✅ Verify this does not break signup: `auth.service.ts` does an `upsert` (INSERT path), not a SELECT of `auth_user_id`. It is unaffected by a SELECT column revoke.

> ❌ Do not `REVOKE SELECT ON public.poems FROM authenticated` — `createPoem` calls `.insert(...).select()` and needs the RETURNING read.

## 7. Throttles

```sql
-- 10 poems / hour / shayar
CREATE OR REPLACE FUNCTION public.enforce_poem_publish_rate()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE recent int;
BEGIN
  SELECT count(*) INTO recent FROM public.poems
   WHERE shayar_uid = NEW.shayar_uid AND created_at > now() - interval '1 hour';
  IF recent >= 10 THEN
    RAISE EXCEPTION 'Publish limit reached (10 poems/hour).';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trigger_poem_publish_rate ON public.poems;
CREATE TRIGGER trigger_poem_publish_rate
  BEFORE INSERT ON public.poems
  FOR EACH ROW EXECUTE FUNCTION public.enforce_poem_publish_rate();

-- 20 comments / hour / shayar
CREATE OR REPLACE FUNCTION public.enforce_comment_rate()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE recent int;
BEGIN
  SELECT count(*) INTO recent FROM public.comments
   WHERE shayar_uid = NEW.shayar_uid AND created_at > now() - interval '1 hour';
  IF recent >= 20 THEN
    RAISE EXCEPTION 'Comment limit reached (20/hour).';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trigger_comment_rate ON public.comments;
CREATE TRIGGER trigger_comment_rate
  BEFORE INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_comment_rate();
```

## 8. Statement budgets

```sql
ALTER ROLE authenticated SET statement_timeout = '8s';
ALTER ROLE anon          SET statement_timeout = '5s';
```

This does not affect PostgREST's own pool; it protects against a pathological query (an unbounded comment join, a missing index during a deploy) holding a backend.

## 9. Post-flight verification

```sql
-- 9.1 ownership is O(1)
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM public.safe_poems_feed ORDER BY created_at DESC, id DESC LIMIT 21;
-- want: Index Scan using idx_poems_feed_cursor; no SubPlan loops=21

-- 9.2 mood + cursor
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM public.safe_poems_feed
WHERE mood_tag = 'Nostalgic'
ORDER BY created_at DESC, id DESC LIMIT 21;
-- want: idx_poems_mood_cursor

-- 9.3 RPC returns ≤3 comments
SELECT id, jsonb_array_length(recent_comments) AS n
FROM public.get_feed_page(NULL, NULL, NULL, 20)
ORDER BY n DESC LIMIT 5;

-- 9.4 counter mirror
SELECT p.id, p.daad_count, st.daad_count
FROM public.poems p JOIN public.poem_stats st ON st.poem_id = p.id
WHERE p.daad_count <> st.daad_count
LIMIT 10;  -- must be empty
```

Anonymous grant probe (run from a browser console with the **anon** key, or curl):

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  "$SUPABASE_URL/rest/v1/poems?select=shayar_uid&limit=1" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
# expect 401 or 403
```

```bash
curl -s "$SUPABASE_URL/rest/v1/safe_poems_feed?select=shayar_uid,takhallus,is_gumnaam&is_gumnaam=eq.true&limit=3" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
# expect shayar_uid = "EK-GUMNAAM", takhallus = "Gumnaam_Shayar"
```

If either probe fails, **stop** and roll back §6 only.

## 10. Rollback

```sql
-- restore the previous view (blueprint §4.1)
CREATE OR REPLACE VIEW public.safe_poems_feed AS
  SELECT p.id,
    CASE WHEN p.is_gumnaam THEN 'EK-GUMNAAM' ELSE p.shayar_uid END AS shayar_uid,
    CASE WHEN p.is_gumnaam THEN 'Gumnaam_Shayar' ELSE COALESCE(s.takhallus,'Gumnaam_Shayar') END AS takhallus,
    p.hinglish_text, p.hindi_text, p.urdu_text, p.english_translation,
    p.mood_tag, p.format_type, p.seed_words, p.is_gumnaam, p.daad_count, p.created_at,
    (auth.uid() IS NOT NULL AND p.shayar_uid IN (
      SELECT shayar_uid FROM public.public_shayars WHERE auth_user_id = auth.uid()
    )) AS is_owner
  FROM public.poems p
  LEFT JOIN public.public_shayars s ON s.shayar_uid = p.shayar_uid;

GRANT ALL ON public.poems TO anon;
GRANT ALL ON public.public_shayars TO anon;
GRANT ALL ON public.comments TO anon;
GRANT ALL ON public.poem_likes TO anon;

DROP TRIGGER IF EXISTS trigger_poem_publish_rate ON public.poems;
DROP TRIGGER IF EXISTS trigger_comment_rate ON public.comments;
```

Keep `poem_stats`, the helper function, and all indexes. They are additive and cost nothing after a revert. Dropping an index during an incident is how a slow query becomes an outage.

## 11. Acceptance

- [ ] `EXPLAIN` shows an index scan and no per-row `SubPlan`
- [ ] `get_feed_page` returns ≤ 3 comments per poem
- [ ] `poem_stats.daad_count` equals `poems.daad_count` after 10 test likes
- [ ] anon cannot read `poems`, `public_shayars`, `comments`, `poem_likes`
- [ ] anon can read `safe_poems_feed` and `public_shayar_directory`
- [ ] no response contains `auth_user_id`
- [ ] gumnaam probe returns masked values
- [ ] 11th poem in an hour is rejected
- [ ] `pg_index.indisvalid` true for every new index
