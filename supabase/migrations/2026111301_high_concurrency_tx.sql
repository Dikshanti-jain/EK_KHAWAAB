-- ============================================================================
-- EK KHWAAB - HIGH-CONCURRENCY MIGRATION (TRANSACTIONAL HALF)
-- File: 2026111301_high_concurrency_tx.sql
--
-- Apply this file FIRST, then 2026111302_concurrent_indexes_notx.sql.
--
-- This file is safe to paste into the Supabase SQL Editor as one block: every
-- statement is transactional. It contains no CREATE INDEX CONCURRENTLY.
--
-- Deploy order note: section 9 revokes anonymous access to the base tables.
-- The client must already read `safe_poems_feed` / `get_feed_page` (it does
-- after packet 03). During a rolling deploy the worst case is that the old
-- client loses the comment author join for a few minutes; the feed still
-- renders because it reads the view.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Extensions (pg_trgm is used by the optional search index)
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. Identity helper
--
-- Replaces every `shayar_uid IN (SELECT ... WHERE auth_user_id = auth.uid())`
-- with a single indexed equality. SECURITY DEFINER so the lookup is not
-- filtered by public_shayars RLS (the function is the boundary, not the table).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_shayar_uid()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT shayar_uid
  FROM public.public_shayars
  WHERE auth_user_id = (SELECT auth.uid());
$$;

REVOKE ALL ON FUNCTION public.current_shayar_uid() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_shayar_uid() TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. Policy rewrites
--
-- Each policy below previously re-ran a correlated subquery per candidate row.
-- The semantics are identical; the plan is not.
-- ----------------------------------------------------------------------------

-- 2.1 poems: INSERT
DROP POLICY IF EXISTS "Poets can create poems" ON public.poems;
CREATE POLICY "Poets can create poems"
  ON public.poems FOR INSERT
  WITH CHECK (shayar_uid = public.current_shayar_uid());

-- 2.2 poems: DELETE
DROP POLICY IF EXISTS "Poets can delete their own poems" ON public.poems;
CREATE POLICY "Poets can delete their own poems"
  ON public.poems FOR DELETE
  USING (shayar_uid = public.current_shayar_uid());

-- 2.3 poems: UPDATE (translations)
DROP POLICY IF EXISTS "Owners can update own poems" ON public.poems;
CREATE POLICY "Owners can update own poems"
  ON public.poems FOR UPDATE
  USING (shayar_uid = public.current_shayar_uid())
  WITH CHECK (shayar_uid = public.current_shayar_uid());

-- 2.4 poem_likes: INSERT
DROP POLICY IF EXISTS "Users can insert own likes" ON public.poem_likes;
CREATE POLICY "Users can insert own likes"
  ON public.poem_likes FOR INSERT
  WITH CHECK (shayar_uid = public.current_shayar_uid());

-- 2.5 poem_likes: DELETE
DROP POLICY IF EXISTS "Users can delete own likes" ON public.poem_likes;
CREATE POLICY "Users can delete own likes"
  ON public.poem_likes FOR DELETE
  USING (shayar_uid = public.current_shayar_uid());

-- 2.6 bookmarks: SELECT
DROP POLICY IF EXISTS "Users can read own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can read own bookmarks"
  ON public.bookmarks FOR SELECT
  USING (shayar_uid = public.current_shayar_uid());

-- 2.7 bookmarks: INSERT
DROP POLICY IF EXISTS "Users can insert own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can insert own bookmarks"
  ON public.bookmarks FOR INSERT
  WITH CHECK (shayar_uid = public.current_shayar_uid());

-- 2.8 bookmarks: DELETE
DROP POLICY IF EXISTS "Users can delete own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can delete own bookmarks"
  ON public.bookmarks FOR DELETE
  USING (shayar_uid = public.current_shayar_uid());

-- 2.9 comments: INSERT
DROP POLICY IF EXISTS "Shayars can post comments" ON public.comments;
CREATE POLICY "Shayars can post comments"
  ON public.comments FOR INSERT
  WITH CHECK (shayar_uid = public.current_shayar_uid());

-- 2.10 comments: DELETE
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
CREATE POLICY "Users can delete own comments"
  ON public.comments FOR DELETE
  USING (shayar_uid = public.current_shayar_uid());

-- 2.11 secret_khats: SELECT / DELETE / INSERT
DROP POLICY IF EXISTS "Senders can view own sent khats" ON public.secret_khats;
CREATE POLICY "Senders can view own sent khats"
  ON public.secret_khats FOR SELECT
  USING (sender_uid = public.current_shayar_uid());

DROP POLICY IF EXISTS "Senders can delete own sent khats" ON public.secret_khats;
CREATE POLICY "Senders can delete own sent khats"
  ON public.secret_khats FOR DELETE
  USING (sender_uid = public.current_shayar_uid());

DROP POLICY IF EXISTS "Shayars can create secret khats" ON public.secret_khats;
CREATE POLICY "Shayars can create secret khats"
  ON public.secret_khats FOR INSERT
  WITH CHECK (sender_uid = public.current_shayar_uid());

-- ----------------------------------------------------------------------------
-- 3. Narrow counter table
--
-- `poems` rows are wide (three scripts + translation). A like previously
-- rewrote the whole row, producing a new MVCC version and TOAST churn for a
-- counter. poem_stats keeps the hot write on a 32-byte row.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.poem_stats (
  poem_id    uuid PRIMARY KEY REFERENCES public.poems(id) ON DELETE CASCADE,
  daad_count integer NOT NULL DEFAULT 0 CHECK (daad_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.poem_stats (poem_id, daad_count)
SELECT id, COALESCE(daad_count, 0) FROM public.poems
ON CONFLICT (poem_id) DO NOTHING;

ALTER TABLE public.poem_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Poem stats are publicly readable" ON public.poem_stats;
CREATE POLICY "Poem stats are publicly readable"
  ON public.poem_stats FOR SELECT USING (true);

-- 3.1 Trigger now touches the narrow row, not the poem row.
CREATE OR REPLACE FUNCTION public.update_poem_daad_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.poem_stats (poem_id, daad_count, updated_at)
    VALUES (NEW.poem_id, 1, now())
    ON CONFLICT (poem_id) DO UPDATE
      SET daad_count = public.poem_stats.daad_count + 1,
          updated_at = now();
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.poem_stats
       SET daad_count = GREATEST(0, daad_count - 1),
           updated_at = now()
     WHERE poem_id = OLD.poem_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_poem_daad ON public.poem_likes;
CREATE TRIGGER trigger_sync_poem_daad
  AFTER INSERT OR DELETE ON public.poem_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_poem_daad_count();

-- ----------------------------------------------------------------------------
-- 4. Feed view
--
-- Changes vs. the previous definition:
--   * ownership is a LATERAL probe evaluated once, not a per-row SubPlan
--   * daad_count comes from poem_stats when available
--   * COALESCE keeps a missing profile from turning takhallus into NULL
--
-- Do NOT add `security_barrier = true`: it would stop the planner from pushing
-- `created_at` / `mood_tag` into the view and turn keyset pagination into a
-- full materialisation. The masking lives in the SELECT list, not a WHERE.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.safe_poems_feed AS
SELECT
  p.id,
  CASE WHEN p.is_gumnaam THEN 'EK-GUMNAAM' ELSE p.shayar_uid END AS shayar_uid,
  CASE WHEN p.is_gumnaam THEN 'Gumnaam_Shayar'
       ELSE COALESCE(s.takhallus, 'Gumnaam_Shayar') END AS takhallus,
  p.hinglish_text,
  p.hindi_text,
  p.urdu_text,
  p.english_translation,
  p.mood_tag,
  p.format_type,
  p.seed_words,
  p.is_gumnaam,
  COALESCE(st.daad_count, p.daad_count, 0) AS daad_count,
  p.created_at,
  COALESCE(me.shayar_uid IS NOT NULL AND p.shayar_uid = me.shayar_uid, false) AS is_owner
FROM public.poems p
LEFT JOIN public.public_shayars s ON s.shayar_uid = p.shayar_uid
LEFT JOIN public.poem_stats st ON st.poem_id = p.id
LEFT JOIN LATERAL (
  SELECT shayar_uid
  FROM public.public_shayars
  WHERE auth_user_id = (SELECT auth.uid())
) me ON true;

-- The view is the security boundary. Run it with owner rights so anon never
-- needs SELECT on the base tables (section 9 revokes them).
ALTER VIEW public.safe_poems_feed SET (security_invoker = false);
GRANT SELECT ON public.safe_poems_feed TO anon, authenticated;

-- The public directory is also owner-rights for the same reason.
ALTER VIEW public.public_shayar_directory SET (security_invoker = false);
GRANT SELECT ON public.public_shayar_directory TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5. One-query feed RPC
--
-- Replaces two sequential PostgREST round trips (poems, then all comments)
-- with one call that returns at most 3 comments per poem.
--
-- SECURITY DEFINER is required: section 9 revokes `comments` from anon, and
-- the lateral below reads it to attach the newest three hashiya lines. Running
-- as the owner is safe because the function is read-only, has a pinned
-- search_path, and returns only public comment text. `auth.uid()` still reads
-- the caller's JWT, so the view's is_owner predicate stays correct.
--
-- Comment authors are read from public_shayar_directory, not public_shayars,
-- so the function needs no grant on the base profile table either.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_feed_page(
  p_cursor_created_at timestamptz DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL,
  p_mood text DEFAULT NULL,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  shayar_uid text,
  takhallus text,
  hinglish_text text,
  hindi_text text,
  urdu_text text,
  english_translation text,
  mood_tag text,
  format_type text,
  seed_words text[],
  is_gumnaam boolean,
  daad_count integer,
  created_at timestamptz,
  is_owner boolean,
  recent_comments jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT f.*, COALESCE(c.items, '[]'::jsonb)
  FROM (
    SELECT *
    FROM public.safe_poems_feed f
    WHERE (p_mood IS NULL OR f.mood_tag = p_mood)
      AND (
        p_cursor_created_at IS NULL
        OR f.created_at < p_cursor_created_at
        OR (f.created_at = p_cursor_created_at AND f.id < p_cursor_id)
      )
    ORDER BY f.created_at DESC, f.id DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 50)
  ) f
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(x ORDER BY x.created_at DESC) AS items
    FROM (
      SELECT c.id, c.comment_text, c.created_at, d.takhallus
      FROM public.comments c
      LEFT JOIN public.public_shayar_directory d ON d.shayar_uid = c.shayar_uid
      WHERE c.poem_id = f.id
      ORDER BY c.created_at DESC
      LIMIT 3
    ) x
  ) c ON true
  ORDER BY f.created_at DESC, f.id DESC;
$$;

REVOKE ALL ON FUNCTION public.get_feed_page(timestamptz, uuid, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_feed_page(timestamptz, uuid, text, integer) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 6. Self-profile RPCs
--
-- The client must never need SELECT on public_shayars.auth_user_id to find its
-- own row. These two functions are the only supported path.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_shayar_profile()
RETURNS TABLE (shayar_uid text, takhallus text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT s.shayar_uid, s.takhallus
  FROM public.public_shayars s
  WHERE s.auth_user_id = (SELECT auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.update_my_takhallus(
  p_takhallus text,
  p_meaning text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_clean text := trim(p_takhallus);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '28000';
  END IF;
  IF char_length(v_clean) < 2 OR char_length(v_clean) > 40 THEN
    RAISE EXCEPTION 'pen name must be between 2 and 40 characters';
  END IF;

  UPDATE public.public_shayars
     SET takhallus = v_clean,
         takhallus_meaning = NULLIF(trim(COALESCE(p_meaning, '')), ''),
         updated_at = now()
   WHERE auth_user_id = v_uid;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_shayar_profile() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_my_takhallus(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_shayar_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_takhallus(text, text) TO authenticated;

-- ----------------------------------------------------------------------------
-- 7. Publish / comment throttles
--
-- Application-level checks are advisory; these are the enforcement.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_poem_publish_rate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  recent int;
BEGIN
  SELECT count(*) INTO recent
  FROM public.poems
  WHERE shayar_uid = NEW.shayar_uid
    AND created_at > now() - interval '1 hour';

  IF recent >= 10 THEN
    RAISE EXCEPTION 'Publish limit reached (10 poems/hour).';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_poem_publish_rate ON public.poems;
CREATE TRIGGER trigger_poem_publish_rate
  BEFORE INSERT ON public.poems
  FOR EACH ROW EXECUTE FUNCTION public.enforce_poem_publish_rate();

CREATE OR REPLACE FUNCTION public.enforce_comment_rate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  recent int;
BEGIN
  SELECT count(*) INTO recent
  FROM public.comments
  WHERE shayar_uid = NEW.shayar_uid
    AND created_at > now() - interval '1 hour';

  IF recent >= 20 THEN
    RAISE EXCEPTION 'Comment limit reached (20/hour).';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_comment_rate ON public.comments;
CREATE TRIGGER trigger_comment_rate
  BEFORE INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_comment_rate();

-- ----------------------------------------------------------------------------
-- 8. Statement budgets
--
-- A pathological query must not hold a PostgREST backend indefinitely. The
-- DO block keeps the migration from failing on a role the current user may
-- not be allowed to alter (e.g. a restricted SQL editor session).
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  EXECUTE 'ALTER ROLE authenticated SET statement_timeout = ''8s''';
  EXECUTE 'ALTER ROLE anon SET statement_timeout = ''5s''';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping statement_timeout: current role lacks privilege. Set it from the Supabase dashboard instead.';
END;
$$;

-- ----------------------------------------------------------------------------
-- 9. Grant lockdown (the privacy fix)
--
-- anon loses the base tables entirely. It keeps:
--   * safe_poems_feed        (masked, owner-rights view)
--   * public_shayar_directory (no auth_user_id)
--   * column-level SELECT on public_shayars public fields, which the legacy
--     comments embed still needs during a rolling deploy
--
-- authenticated keeps SELECT on poems (createPoem uses .insert().select())
-- but loses the auth_user_id column. get_my_shayar_profile() and
-- update_my_takhallus() replace every client-side read/write of that column.
-- ----------------------------------------------------------------------------
REVOKE ALL ON public.poems         FROM anon;
REVOKE ALL ON public.comments      FROM anon;
REVOKE ALL ON public.poem_likes    FROM anon;
REVOKE ALL ON public.bookmarks     FROM anon;
REVOKE ALL ON public.secret_khats  FROM anon;
REVOKE ALL ON public.public_shayars FROM anon;

GRANT SELECT (
  shayar_uid, takhallus, takhallus_meaning, vibe_category,
  avatar_color, created_at, updated_at
) ON public.public_shayars TO anon;

-- Column-level REVOKE does not subtract from a table-level grant, so the
-- table grant must go first and the public columns be granted back explicitly.
REVOKE SELECT ON public.public_shayars FROM authenticated;
GRANT SELECT (
  shayar_uid, takhallus, takhallus_meaning, vibe_category,
  avatar_color, created_at, updated_at
) ON public.public_shayars TO authenticated;

GRANT SELECT ON public.safe_poems_feed TO anon;
GRANT SELECT ON public.public_shayar_directory TO anon;

-- ----------------------------------------------------------------------------
-- 10. Acceptance probes (run manually after the migration)
-- ----------------------------------------------------------------------------
-- EXPLAIN (ANALYZE, BUFFERS)
--   SELECT * FROM public.safe_poems_feed ORDER BY created_at DESC, id DESC LIMIT 21;
--   -- expect an index scan and no per-row SubPlan
--
-- SELECT id, jsonb_array_length(recent_comments) AS n
--   FROM public.get_feed_page(NULL, NULL, NULL, 20) ORDER BY n DESC LIMIT 5;
--   -- expect n <= 3
--
-- SELECT p.id, p.daad_count, st.daad_count
--   FROM public.poems p JOIN public.poem_stats st ON st.poem_id = p.id
--  WHERE p.daad_count <> st.daad_count LIMIT 10;
--   -- expect 0 rows
