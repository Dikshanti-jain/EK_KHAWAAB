-- =====================================================================
-- EK KHAWAAB: AUTH TRIGGER & USER VAULT REPAIR MIGRATION
-- Migration: 20261110000000_fix_auth_triggers_and_rls.sql
-- Fixes: User IDs not saving, confirmation redirects, auto-provisioning
-- =====================================================================

-- 1. Enable pgcrypto for secure hashing and cryptographic IDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Cryptographic Shayar ID generator
CREATE OR REPLACE FUNCTION public.generate_crypto_shayar_uid()
RETURNS TEXT
LANGUAGE sql
SET search_path = public, pg_temp
AS $$
  SELECT 'EK-' || upper(encode(gen_random_bytes(4), 'hex'));
$$;

-- 3. Automatic User Provisioning Trigger on auth.users
-- This runs with SECURITY DEFINER when any user signs up (even if unconfirmed)
CREATE OR REPLACE FUNCTION public.handle_new_authenticated_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid TEXT;
  v_takhallus TEXT;
  v_full_name TEXT;
  v_meaning TEXT;
  v_vibe TEXT;
BEGIN
  v_uid := COALESCE(NEW.raw_user_meta_data->>'shayar_uid', public.generate_crypto_shayar_uid());
  v_takhallus := COALESCE(NEW.raw_user_meta_data->>'takhallus', 'Musafir_' || substr(md5(NEW.id::text), 1, 6));
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Anonymous Poet');
  v_meaning := COALESCE(NEW.raw_user_meta_data->>'takhallus_meaning', '');
  v_vibe := COALESCE(NEW.raw_user_meta_data->>'vibe_category', 'Late Night Solitude');

  -- Ensure shayar_uid starts with # for consistency if not present
  IF NOT v_uid LIKE '#%' THEN
    v_uid := '#' || v_uid;
  END IF;

  -- 3a. Insert into private_user_vault
  INSERT INTO public.private_user_vault (auth_user_id, real_full_name, email)
  VALUES (
    NEW.id,
    v_full_name,
    NEW.email
  )
  ON CONFLICT (auth_user_id) DO UPDATE
    SET email = EXCLUDED.email,
        real_full_name = COALESCE(EXCLUDED.real_full_name, private_user_vault.real_full_name);

  -- 3b. Insert into public_shayars
  INSERT INTO public.public_shayars (auth_user_id, shayar_uid, takhallus, takhallus_meaning, vibe_category)
  VALUES (
    NEW.id,
    v_uid,
    v_takhallus,
    v_meaning,
    v_vibe
  )
  ON CONFLICT (auth_user_id) DO UPDATE
    SET takhallus = COALESCE(EXCLUDED.takhallus, public_shayars.takhallus),
        takhallus_meaning = COALESCE(EXCLUDED.takhallus_meaning, public_shayars.takhallus_meaning),
        vibe_category = COALESCE(EXCLUDED.vibe_category, public_shayars.vibe_category);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never abort auth.users creation if profile provision has an edge collision
  RAISE WARNING 'handle_new_authenticated_user encountered error: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_authenticated_user();

-- 4. Self-Healing RPC callable by authenticated users to ensure their profile exists
CREATE OR REPLACE FUNCTION public.sync_current_user_profile(
  p_takhallus TEXT DEFAULT NULL,
  p_shayar_uid TEXT DEFAULT NULL,
  p_full_name TEXT DEFAULT NULL
)
RETURNS TABLE (
  shayar_uid TEXT,
  takhallus TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_uid TEXT;
  v_tak TEXT;
  v_fn TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to sync profile';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;

  -- Read existing or fallback
  SELECT s.shayar_uid, s.takhallus INTO v_uid, v_tak
  FROM public.public_shayars s WHERE s.auth_user_id = v_user_id;

  IF v_uid IS NULL THEN
    v_uid := COALESCE(p_shayar_uid, public.generate_crypto_shayar_uid());
    IF NOT v_uid LIKE '#%' THEN
      v_uid := '#' || v_uid;
    END IF;
    v_tak := COALESCE(p_takhallus, 'Musafir_' || substr(md5(v_user_id::text), 1, 6));
    v_fn := COALESCE(p_full_name, 'Anonymous Poet');

    INSERT INTO public.private_user_vault (auth_user_id, real_full_name, email)
    VALUES (v_user_id, v_fn, v_email)
    ON CONFLICT (auth_user_id) DO NOTHING;

    INSERT INTO public.public_shayars (auth_user_id, shayar_uid, takhallus)
    VALUES (v_user_id, v_uid, v_tak)
    ON CONFLICT (auth_user_id) DO NOTHING;
  END IF;

  RETURN QUERY SELECT v_uid, v_tak;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_current_user_profile(TEXT, TEXT, TEXT) TO authenticated;

-- 5. Row Level Security Policies on private_user_vault and public_shayars
ALTER TABLE public.private_user_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_shayars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own vault" ON public.private_user_vault;
DROP POLICY IF EXISTS "Users can insert own vault" ON public.private_user_vault;
DROP POLICY IF EXISTS "Users can update own vault" ON public.private_user_vault;

CREATE POLICY "Users can select own vault" ON public.private_user_vault FOR SELECT USING (auth.uid() = auth_user_id);
CREATE POLICY "Users can insert own vault" ON public.private_user_vault FOR INSERT WITH CHECK (auth.uid() = auth_user_id);
CREATE POLICY "Users can update own vault" ON public.private_user_vault FOR UPDATE USING (auth.uid() = auth_user_id) WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Public shayar profiles are publicly readable" ON public.public_shayars;
DROP POLICY IF EXISTS "Public shayars are viewable by everyone" ON public.public_shayars;
DROP POLICY IF EXISTS "Owners can read own shayar row" ON public.public_shayars;
DROP POLICY IF EXISTS "Users can insert their own public shayar profile" ON public.public_shayars;
DROP POLICY IF EXISTS "Users can update own public shayar profile" ON public.public_shayars;

-- Anyone can see public shayar profiles (pen name, UID, vibe, bio)
CREATE POLICY "Public shayar profiles are publicly readable"
  ON public.public_shayars FOR SELECT
  USING (true);

-- Authenticated users can insert their own public shayar record
CREATE POLICY "Users can insert their own public shayar profile"
  ON public.public_shayars FOR INSERT
  WITH CHECK (auth.uid() = auth_user_id);

-- Authenticated users can update their own public shayar record
CREATE POLICY "Users can update own public shayar profile"
  ON public.public_shayars FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- 6. Public Directory View and Safe Poems Feed View
CREATE OR REPLACE VIEW public.public_shayar_directory AS
  SELECT shayar_uid, takhallus, takhallus_meaning, vibe_category, created_at
  FROM public.public_shayars;

GRANT SELECT ON public.public_shayar_directory TO anon, authenticated;

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
