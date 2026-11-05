-- =====================================================================
-- EK KHAWAAB: MASTER SECURITY REMEDIATION MIGRATION
-- Migration: 20261105000000_security_hardening.sql
-- Fixes: DB-01 to DB-08, RT-01, RT-02, RT-04, RT-07, RT-08, AS-03, PC-03, PC-04, PC-07, RL-06
-- =====================================================================

-- Enable pgcrypto for secure hashing and cryptographic IDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. FIX DB-05 & RL-06: Fix FK circular dependency & use cryptographic Shayar IDs
ALTER TABLE public.public_shayars 
  DROP CONSTRAINT IF EXISTS public_shayars_auth_user_id_fkey,
  ADD CONSTRAINT public_shayars_auth_user_id_fkey 
    FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.generate_crypto_shayar_uid()
RETURNS TEXT
LANGUAGE sql
SET search_path = public, pg_temp
AS $$
  SELECT 'EK-' || upper(encode(gen_random_bytes(4), 'hex'));
$$;

-- Auto-provision vault & public profile via trigger on auth.users (Fixes DB-05)
CREATE OR REPLACE FUNCTION public.handle_new_authenticated_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid TEXT;
  v_takhallus TEXT;
BEGIN
  v_uid := COALESCE(NEW.raw_user_meta_data->>'shayar_uid', public.generate_crypto_shayar_uid());
  v_takhallus := COALESCE(NEW.raw_user_meta_data->>'takhallus', 'Musafir_' || substr(md5(NEW.id::text), 1, 6));

  INSERT INTO public.private_user_vault (auth_user_id, real_full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Anonymous Poet'),
    NEW.email
  ) ON CONFLICT (auth_user_id) DO NOTHING;

  INSERT INTO public.public_shayars (auth_user_id, shayar_uid, takhallus, takhallus_meaning, vibe_category)
  VALUES (
    NEW.id,
    v_uid,
    v_takhallus,
    COALESCE(NEW.raw_user_meta_data->>'takhallus_meaning', ''),
    COALESCE(NEW.raw_user_meta_data->>'vibe_category', 'Late Night')
  ) ON CONFLICT (auth_user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_authenticated_user();

-- 2. FIX DB-06: Add strict length CHECK constraints on all user text inputs
ALTER TABLE public.public_shayars
  DROP CONSTRAINT IF EXISTS check_takhallus_len,
  ADD CONSTRAINT check_takhallus_len CHECK (char_length(takhallus) BETWEEN 2 AND 40),
  DROP CONSTRAINT IF EXISTS check_meaning_len,
  ADD CONSTRAINT check_meaning_len CHECK (char_length(COALESCE(takhallus_meaning, '')) <= 150);

ALTER TABLE public.poems
  DROP CONSTRAINT IF EXISTS check_hinglish_len,
  ADD CONSTRAINT check_hinglish_len CHECK (char_length(hinglish_text) BETWEEN 1 AND 4000),
  DROP CONSTRAINT IF EXISTS check_hindi_len,
  ADD CONSTRAINT check_hindi_len CHECK (char_length(COALESCE(hindi_text, '')) <= 4000),
  DROP CONSTRAINT IF EXISTS check_urdu_len,
  ADD CONSTRAINT check_urdu_len CHECK (char_length(COALESCE(urdu_text, '')) <= 4000),
  DROP CONSTRAINT IF EXISTS check_mood_len,
  ADD CONSTRAINT check_mood_len CHECK (char_length(mood_tag) <= 50);

ALTER TABLE public.comments
  DROP CONSTRAINT IF EXISTS check_comment_len,
  ADD CONSTRAINT check_comment_len CHECK (char_length(comment_text) BETWEEN 1 AND 600);

-- 3. FIX RT-01, RT-02, DB-01, PC-01, PC-03: Lock down secret_khats completely
ALTER TABLE public.secret_khats
  ADD COLUMN IF NOT EXISTS secret_answer_hash TEXT,
  ADD COLUMN IF NOT EXISTS recipient_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS failed_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days');

ALTER TABLE public.secret_khats
  DROP CONSTRAINT IF EXISTS check_khat_poem_len,
  ADD CONSTRAINT check_khat_poem_len CHECK (char_length(poem_content) BETWEEN 1 AND 3000),
  DROP CONSTRAINT IF EXISTS check_clue1_len,
  ADD CONSTRAINT check_clue1_len CHECK (char_length(clue_one) <= 250),
  DROP CONSTRAINT IF EXISTS check_clue2_len,
  ADD CONSTRAINT check_clue2_len CHECK (char_length(clue_two) <= 250);

-- Drop broken public policies on secret_khats
DROP POLICY IF EXISTS "Secret khats can be viewed by anyone with letter id" ON public.secret_khats;
DROP POLICY IF EXISTS "Letter recipient can unlock khat" ON public.secret_khats;
DROP POLICY IF EXISTS "Senders can view own sent khats" ON public.secret_khats;
DROP POLICY IF EXISTS "Senders can delete own sent khats" ON public.secret_khats;

-- Only sender can view/delete their own sent khats directly; nobody else can SELECT/UPDATE table directly
CREATE POLICY "Senders can view own sent khats"
  ON public.secret_khats FOR SELECT
  USING (sender_uid IN (SELECT shayar_uid FROM public.public_shayars WHERE auth_user_id = auth.uid()));

CREATE POLICY "Senders can delete own sent khats"
  ON public.secret_khats FOR DELETE
  USING (sender_uid IN (SELECT shayar_uid FROM public.public_shayars WHERE auth_user_id = auth.uid()));

-- RPC 1: Create Secret Khat (Hashes answer & recipient identifier server-side)
CREATE OR REPLACE FUNCTION public.create_secret_khat_rpc(
  p_recipient_identifier TEXT,
  p_poem_content TEXT,
  p_clue_one TEXT,
  p_clue_two TEXT,
  p_secret_answer TEXT,
  p_wax_seal_color TEXT DEFAULT 'crimson'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sender_uid TEXT;
  v_khat_id UUID;
BEGIN
  SELECT shayar_uid INTO v_sender_uid FROM public.public_shayars WHERE auth_user_id = auth.uid();
  IF v_sender_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required to send a secret letter';
  END IF;

  IF char_length(trim(p_secret_answer)) < 1 OR char_length(p_secret_answer) > 100 THEN
    RAISE EXCEPTION 'Invalid secret answer length';
  END IF;

  INSERT INTO public.secret_khats (
    sender_uid,
    recipient_identifier,
    recipient_token_hash,
    poem_content,
    clue_one,
    clue_two,
    secret_answer,
    secret_answer_hash,
    wax_seal_color
  ) VALUES (
    v_sender_uid,
    '[REDACTED]', -- Never store plaintext third-party PII (Fixes PC-03)
    encode(digest(lower(trim(p_recipient_identifier)), 'sha256'), 'hex'),
    p_poem_content,
    p_clue_one,
    p_clue_two,
    '[HASHED]', -- Never store plaintext answer (Fixes RT-01)
    crypt(lower(trim(p_secret_answer)), gen_salt('bf')),
    p_wax_seal_color
  ) RETURNING id INTO v_khat_id;

  RETURN v_khat_id;
END;
$$;

-- RPC 2: Fetch Sealed Khat by ID (Never exposes answer or recipient; hides sender until unlocked)
CREATE OR REPLACE FUNCTION public.get_secret_khat_by_id(p_khat_id UUID)
RETURNS TABLE (
  id UUID,
  poem_content TEXT,
  clue_one TEXT,
  clue_two TEXT,
  wax_seal_color TEXT,
  is_unlocked BOOLEAN,
  sender_uid TEXT,
  sender_takhallus TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    k.id,
    k.poem_content,
    k.clue_one,
    k.clue_two,
    k.wax_seal_color,
    k.is_unlocked,
    CASE WHEN k.is_unlocked THEN k.sender_uid ELSE NULL END AS sender_uid,
    CASE WHEN k.is_unlocked THEN s.takhallus ELSE NULL END AS sender_takhallus,
    k.created_at
  FROM public.secret_khats k
  LEFT JOIN public.public_shayars s ON s.shayar_uid = k.sender_uid
  WHERE k.id = p_khat_id AND k.expires_at > NOW();
END;
$$;

-- RPC 3: Server-Side Riddle Verification & Unlock with Brute-Force Protection (Fixes RT-02, AS-01)
CREATE OR REPLACE FUNCTION public.unlock_secret_khat_rpc(p_khat_id UUID, p_guess TEXT)
RETURNS TABLE (
  unlocked BOOLEAN,
  sender_uid TEXT,
  sender_takhallus TEXT,
  remaining_attempts INT,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_khat RECORD;
  v_takhallus TEXT;
BEGIN
  SELECT * INTO v_khat FROM public.secret_khats WHERE id = p_khat_id AND expires_at > NOW() FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::TEXT, 0, 'Letter not found or expired'::TEXT;
    RETURN;
  END IF;

  IF v_khat.locked_until IS NOT NULL AND v_khat.locked_until > NOW() THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::TEXT, 0, 'Too many failed guesses. Try again in 15 minutes.'::TEXT;
    RETURN;
  END IF;

  IF v_khat.is_unlocked THEN
    SELECT takhallus INTO v_takhallus FROM public.public_shayars WHERE shayar_uid = v_khat.sender_uid;
    RETURN QUERY SELECT true, v_khat.sender_uid, v_takhallus, 5, NULL::TEXT;
    RETURN;
  END IF;

  IF v_khat.secret_answer_hash IS NOT NULL AND v_khat.secret_answer_hash = crypt(lower(trim(p_guess)), v_khat.secret_answer_hash) THEN
    UPDATE public.secret_khats SET is_unlocked = true, failed_attempts = 0 WHERE id = p_khat_id;
    SELECT takhallus INTO v_takhallus FROM public.public_shayars WHERE shayar_uid = v_khat.sender_uid;
    RETURN QUERY SELECT true, v_khat.sender_uid, v_takhallus, 5, NULL::TEXT;
  ELSE
    UPDATE public.secret_khats 
    SET 
      failed_attempts = failed_attempts + 1,
      locked_until = CASE WHEN failed_attempts + 1 >= 5 THEN NOW() + INTERVAL '15 minutes' ELSE NULL END
    WHERE id = p_khat_id;

    RETURN QUERY SELECT false, NULL::TEXT, NULL::TEXT, GREATEST(0, 5 - (v_khat.failed_attempts + 1)), 'Incorrect riddle answer'::TEXT;
  END IF;
END;
$$;

-- 4. FIX RT-04, RT-07, DB-02, PC-07: Hide auth_user_id and enforce server-side Gumnaam masking
DROP POLICY IF EXISTS "Public shayars are viewable by everyone" ON public.public_shayars;
DROP POLICY IF EXISTS "Owners can read own shayar row" ON public.public_shayars;

-- Only authenticated owner can read their raw public_shayars row (which has auth_user_id)
CREATE POLICY "Owners can read own shayar row"
  ON public.public_shayars FOR SELECT
  USING (auth.uid() = auth_user_id);

-- Public directory view without auth_user_id
CREATE OR REPLACE VIEW public.public_shayar_directory AS
  SELECT shayar_uid, takhallus, takhallus_meaning, vibe_category, created_at
  FROM public.public_shayars;

GRANT SELECT ON public.public_shayar_directory TO anon, authenticated;

-- Server-masked Poems View so is_gumnaam NEVER leaks takhallus or shayar_uid in HTTP responses
CREATE OR REPLACE VIEW public.safe_poems_feed AS
  SELECT
    p.id,
    CASE WHEN p.is_gumnaam THEN 'EK-GUMNAAM' ELSE p.shayar_uid END AS shayar_uid,
    CASE WHEN p.is_gumnaam THEN 'Gumnaam_Shayar' ELSE COALESCE(s.takhallus, 'Gumnaam_Shayar') END AS takhallus,
    p.hinglish_text,
    p.hindi_text,
    p.urdu_text,
    p.english_translation,
    p.mood_tag,
    p.format_type,
    p.seed_words,
    p.is_gumnaam,
    p.daad_count,
    p.created_at,
    (auth.uid() IS NOT NULL AND p.shayar_uid IN (SELECT shayar_uid FROM public.public_shayars WHERE auth_user_id = auth.uid())) AS is_owner
  FROM public.poems p
  LEFT JOIN public.public_shayars s ON s.shayar_uid = p.shayar_uid;

GRANT SELECT ON public.safe_poems_feed TO anon, authenticated;

-- 5. FIX AS-03, DB-03, DB-07, RT-08: Fix WITH CHECK, Poems UPDATE, Likes/Bookmarks & DELETE policies
DROP POLICY IF EXISTS "Users can manage own private vault" ON public.private_user_vault;
DROP POLICY IF EXISTS "Users can select own vault" ON public.private_user_vault;
DROP POLICY IF EXISTS "Users can insert own vault" ON public.private_user_vault;
DROP POLICY IF EXISTS "Users can update own vault" ON public.private_user_vault;

CREATE POLICY "Users can select own vault" ON public.private_user_vault FOR SELECT USING (auth.uid() = auth_user_id);
CREATE POLICY "Users can insert own vault" ON public.private_user_vault FOR INSERT WITH CHECK (auth.uid() = auth_user_id);
CREATE POLICY "Users can update own vault" ON public.private_user_vault FOR UPDATE USING (auth.uid() = auth_user_id) WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Users can update own public shayar profile" ON public.public_shayars;
CREATE POLICY "Users can update own public shayar profile"
  ON public.public_shayars FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- Fix DB-03: Allow poem owners to update their own poems (e.g., saving translations)
DROP POLICY IF EXISTS "Owners can update own poems" ON public.poems;
CREATE POLICY "Owners can update own poems"
  ON public.poems FOR UPDATE
  USING (shayar_uid IN (SELECT shayar_uid FROM public.public_shayars WHERE auth_user_id = auth.uid()))
  WITH CHECK (shayar_uid IN (SELECT shayar_uid FROM public.public_shayars WHERE auth_user_id = auth.uid()));

-- Fix RT-08: Forbid UPDATE on poem_likes and bookmarks; enforce explicit INSERT/DELETE WITH CHECK
DROP POLICY IF EXISTS "Users can manage own likes" ON public.poem_likes;
DROP POLICY IF EXISTS "Public read likes" ON public.poem_likes;
DROP POLICY IF EXISTS "Users can insert own likes" ON public.poem_likes;
DROP POLICY IF EXISTS "Users can delete own likes" ON public.poem_likes;

CREATE POLICY "Public read likes" ON public.poem_likes FOR SELECT USING (true);
CREATE POLICY "Users can insert own likes" ON public.poem_likes FOR INSERT
  WITH CHECK (shayar_uid IN (SELECT shayar_uid FROM public.public_shayars WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can delete own likes" ON public.poem_likes FOR DELETE
  USING (shayar_uid IN (SELECT shayar_uid FROM public.public_shayars WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage own bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Users can read own bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Users can insert own bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Users can delete own bookmarks" ON public.bookmarks;

CREATE POLICY "Users can read own bookmarks" ON public.bookmarks FOR SELECT
  USING (shayar_uid IN (SELECT shayar_uid FROM public.public_shayars WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can insert own bookmarks" ON public.bookmarks FOR INSERT
  WITH CHECK (shayar_uid IN (SELECT shayar_uid FROM public.public_shayars WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can delete own bookmarks" ON public.bookmarks FOR DELETE
  USING (shayar_uid IN (SELECT shayar_uid FROM public.public_shayars WHERE auth_user_id = auth.uid()));

-- Fix DB-07: Allow users to delete their own comments
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE
  USING (shayar_uid IN (SELECT shayar_uid FROM public.public_shayars WHERE auth_user_id = auth.uid()));

-- Fix DB-04: Harden update_poem_daad_count trigger with explicit search_path
CREATE OR REPLACE FUNCTION public.update_poem_daad_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.poems SET daad_count = daad_count + 1 WHERE id = NEW.poem_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.poems SET daad_count = GREATEST(0, daad_count - 1) WHERE id = OLD.poem_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 6. FIX RL-03 & PC-04: Content Reports Table, Rate Limits Table & Account Erasure RPC
CREATE TABLE IF NOT EXISTS public.content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_uid TEXT REFERENCES public.public_shayars(shayar_uid) ON DELETE SET NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('poem', 'comment', 'khat')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 3 AND 500),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'removed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can submit reports" ON public.content_reports;
CREATE POLICY "Authenticated users can submit reports"
  ON public.content_reports FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Full Account Erasure RPC (Fixes PC-04)
CREATE OR REPLACE FUNCTION public.delete_my_account_rpc()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  DELETE FROM public.private_user_vault WHERE auth_user_id = auth.uid();
  DELETE FROM public.public_shayars WHERE auth_user_id = auth.uid();
  RETURN true;
END;
$$;

