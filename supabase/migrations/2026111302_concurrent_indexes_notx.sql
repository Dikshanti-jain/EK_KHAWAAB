-- ============================================================================
-- EK KHWAAB - HIGH-CONCURRENCY INDEXES (NON-TRANSACTIONAL HALF)
-- File: 2026111302_concurrent_indexes_notx.sql
--
-- Apply AFTER 2026111301_high_concurrency_tx.sql.
--
-- ============================ HOW TO RUN ====================================
-- `CREATE INDEX CONCURRENTLY` cannot run inside a transaction block, so the
-- Supabase SQL Editor will reject this file if it wraps the whole script.
-- Two supported ways to run it:
--
--   1. psql (recommended, one autocommit per statement):
--        psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 \
--          -f supabase/migrations/2026111302_concurrent_indexes_notx.sql
--
--   2. Supabase SQL Editor, ONE statement at a time:
--        select a single statement, press Run, wait for it to finish, repeat.
--        Do not press "Run" on the whole file.
--
-- If a build is interrupted, Postgres leaves an INVALID index behind. Detect
-- and rebuild it with the verification block at the bottom; do not drop it in
-- a panic during traffic.
--
-- Indexes intentionally NOT created (columns/tables do not exist in this
-- schema, so the packet's SQL would fail):
--   * idx_poems_slug            - public.poems has no `slug` column; poem URLs
--                                 are derived client-side from the first line.
--   * idx_poems_translation_pending - no `translation_status` column; the
--                                 write-once translation job is a follow-up.
--   * idx_khat_attempts_ip_time - no `khat_attempts` table; brute-force lockout
--                                 is row-level on secret_khats (failed_attempts
--                                 + locked_until).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Feed keyset pagination
-- ----------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_poems_feed_cursor
  ON public.poems (created_at DESC, id DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_poems_mood_cursor
  ON public.poems (mood_tag, created_at DESC, id DESC);

-- ----------------------------------------------------------------------------
-- 2. Comments: the RPC fetches the newest 3 per poem
-- ----------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_poem_created
  ON public.comments (poem_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 3. Profile and library reads
-- ----------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_poem_likes_shayar
  ON public.poem_likes (shayar_uid, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_poems_shayar_created
  ON public.poems (shayar_uid, created_at DESC);

-- ----------------------------------------------------------------------------
-- 4. Trigram search (optional but cheap: poem writes are capped at 10/hour)
--
-- Requires pg_trgm. On Supabase enable it from Dashboard -> Database ->
-- Extensions if the CREATE EXTENSION below is rejected.
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_poems_hinglish_trgm
  ON public.poems USING gin (
    (hinglish_text || ' ' || COALESCE(english_translation, '')) gin_trgm_ops
  );

-- ----------------------------------------------------------------------------
-- 5. Verification - run after every index above has finished
-- ----------------------------------------------------------------------------
-- SELECT c.relname
--   FROM pg_index i
--   JOIN pg_class c ON c.oid = i.indexrelid
--  WHERE NOT i.indisvalid;
-- Expect 0 rows. If an index is invalid:
--   DROP INDEX CONCURRENTLY <name>;
--   then re-run that single CREATE INDEX CONCURRENTLY statement.
--
-- SELECT indexname, indexdef
--   FROM pg_indexes
--  WHERE schemaname = 'public'
--    AND indexname IN (
--      'idx_poems_feed_cursor', 'idx_poems_mood_cursor',
--      'idx_comments_poem_created', 'idx_poem_likes_shayar',
--      'idx_poems_shayar_created', 'idx_poems_hinglish_trgm'
--    )
--  ORDER BY indexname;
