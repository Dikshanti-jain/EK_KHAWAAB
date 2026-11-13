-- ============================================================================
-- EK KHWAAB - LISTEN TOGETHER ROOM SCHEMA
-- File: 2026111303_rooms.sql
--
-- Additive and independently reversible. Requires
-- 2026111301_high_concurrency_tx.sql (current_shayar_uid).
--
-- This is a quota probe, not an analytics table: rows exist only while a
-- visible tab is inside a room. The 45 s TTL on a 20 s heartbeat absorbs two
-- missed beats plus scheduling jitter.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.room_sessions (
  room_code text        NOT NULL CHECK (room_code ~ '^[2-9A-HJKMNP-Z]{6}$'),
  user_uid  text        NOT NULL,
  role      text        NOT NULL CHECK (role IN ('host', 'guest')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_code, user_uid)
);

CREATE INDEX IF NOT EXISTS idx_room_sessions_seen
  ON public.room_sessions (last_seen DESC);

ALTER TABLE public.room_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS room_sessions_own ON public.room_sessions;
CREATE POLICY room_sessions_own ON public.room_sessions
  FOR ALL TO authenticated
  USING (user_uid = public.current_shayar_uid())
  WITH CHECK (user_uid = public.current_shayar_uid());

-- ----------------------------------------------------------------------------
-- One round trip: upsert my presence, return project-wide active sessions.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.room_heartbeat(p_code text, p_role text)
RETURNS TABLE (active integer, capacity integer, ok boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid      text := public.current_shayar_uid();
  v_active   integer;
  v_capacity integer := 120;   -- 60% of the 200-socket free-tier quota
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '28000';
  END IF;

  IF p_code !~ '^[2-9A-HJKMNP-Z]{6}$' THEN
    RAISE EXCEPTION 'invalid room code';
  END IF;

  IF p_role NOT IN ('host', 'guest') THEN
    RAISE EXCEPTION 'invalid role';
  END IF;

  INSERT INTO public.room_sessions (room_code, user_uid, role, last_seen)
  VALUES (p_code, v_uid, p_role, now())
  ON CONFLICT (room_code, user_uid)
  DO UPDATE SET last_seen = now(), role = EXCLUDED.role;

  -- Opportunistic cleanup: 1 in 50 heartbeats sweeps hard-killed tabs.
  IF random() < 0.02 THEN
    DELETE FROM public.room_sessions
     WHERE last_seen < now() - interval '10 minutes';
  END IF;

  SELECT count(DISTINCT user_uid) INTO v_active
  FROM public.room_sessions
  WHERE last_seen > now() - interval '45 seconds';

  RETURN QUERY SELECT v_active, v_capacity, v_active <= v_capacity;
END;
$$;

CREATE OR REPLACE FUNCTION public.room_leave(p_code text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  DELETE FROM public.room_sessions
  WHERE room_code = p_code
    AND user_uid = public.current_shayar_uid();
$$;

REVOKE ALL ON FUNCTION public.room_heartbeat(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.room_leave(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.room_heartbeat(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.room_leave(text) TO authenticated;

-- ----------------------------------------------------------------------------
-- Optional scheduled cleanup. Wrapped so a project without pg_cron still
-- applies the rest of the migration; the opportunistic sweep above is the
-- backstop.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'room-sessions-cleanup',
      '*/5 * * * *',
      $cron$ DELETE FROM public.room_sessions WHERE last_seen < now() - interval '10 minutes'; $cron$
    );
  END IF;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'pg_cron present but not schedulable from this role; relying on the opportunistic sweep.';
  WHEN undefined_table THEN
    RAISE NOTICE 'pg_cron schema not visible; relying on the opportunistic sweep.';
END;
$$;
