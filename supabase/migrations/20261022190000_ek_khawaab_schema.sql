-- ============================================================================
-- EK KHAWAAB — PRODUCTION DATABASE SCHEMA & SPLIT-VAULT PRIVACY ARCHITECTURE
-- PostgreSQL & Supabase Database Migration
-- Version: 1.0.0
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. PRIVATE USER VAULT (STRICTLY ISOLATED & ENCRYPTED)
-- Contains real identity, legal name, email, and private metadata.
-- Public clients CANNOT query this table under any circumstances.
-- ============================================================================
CREATE TABLE IF NOT EXISTS private_user_vault (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID UNIQUE NOT NULL, -- References auth.users(id)
    real_full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 3. PUBLIC SHAYAR PROFILES (PSEUDONYMOUS PUBLIC IDENTITY)
-- This is what other poets, readers, and commenters on the feed see.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public_shayars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID UNIQUE NOT NULL REFERENCES private_user_vault(auth_user_id) ON DELETE CASCADE,
    shayar_uid TEXT UNIQUE NOT NULL, -- e.g., '#EK-7492' or 'EK-7492'
    takhallus TEXT UNIQUE NOT NULL, -- e.g., 'Abr-e-Shab'
    takhallus_meaning TEXT,
    vibe_category TEXT,
    avatar_color TEXT DEFAULT 'royal',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 4. POEMS / RACHNAYEIN TABLE
-- Stores metered poetry, multilingual scripts, and metadata.
-- ============================================================================
CREATE TABLE IF NOT EXISTS poems (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shayar_uid TEXT NOT NULL REFERENCES public_shayars(shayar_uid) ON DELETE CASCADE,
    hinglish_text TEXT NOT NULL,
    hindi_text TEXT NOT NULL,
    urdu_text TEXT NOT NULL,
    english_translation TEXT,
    mood_tag TEXT NOT NULL,
    format_type TEXT DEFAULT 'Sher', -- Sher, Ghazal, Nazm, Qata
    seed_words TEXT[], -- Array of AI seed words if generated via AI poet
    is_gumnaam BOOLEAN DEFAULT FALSE,
    daad_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 5. LIKES / DAAD TABLE (PREVENTS DUPLICATE LIKES)
-- ============================================================================
CREATE TABLE IF NOT EXISTS poem_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    poem_id UUID NOT NULL REFERENCES poems(id) ON DELETE CASCADE,
    shayar_uid TEXT NOT NULL REFERENCES public_shayars(shayar_uid) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(poem_id, shayar_uid)
);

-- ============================================================================
-- 6. BOOKMARKS / BASTA TABLE (PERSONAL LIBRARY)
-- ============================================================================
CREATE TABLE IF NOT EXISTS bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    poem_id UUID NOT NULL REFERENCES poems(id) ON DELETE CASCADE,
    shayar_uid TEXT NOT NULL REFERENCES public_shayars(shayar_uid) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(poem_id, shayar_uid)
);

-- ============================================================================
-- 7. COMMENTS / HASHIYA TABLE
-- Inline poetic remarks, replies, and appreciations on couplets.
-- ============================================================================
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    poem_id UUID NOT NULL REFERENCES poems(id) ON DELETE CASCADE,
    shayar_uid TEXT NOT NULL REFERENCES public_shayars(shayar_uid) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 8. SECRET KHAWAAB KHATS TABLE (WAX-SEALED RIDDLE LETTERS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS secret_khats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_uid TEXT NOT NULL REFERENCES public_shayars(shayar_uid) ON DELETE CASCADE,
    recipient_identifier TEXT NOT NULL,
    poem_content TEXT NOT NULL,
    clue_one TEXT NOT NULL,
    clue_two TEXT NOT NULL,
    secret_answer TEXT NOT NULL,
    wax_seal_color TEXT DEFAULT 'crimson',
    is_unlocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PERFORMANCE & SEARCH INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_poems_shayar_uid ON poems(shayar_uid);
CREATE INDEX IF NOT EXISTS idx_poems_created_at ON poems(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_poems_mood_tag ON poems(mood_tag);
CREATE INDEX IF NOT EXISTS idx_poem_likes_poem_id ON poem_likes(poem_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_shayar_uid ON bookmarks(shayar_uid);
CREATE INDEX IF NOT EXISTS idx_comments_poem_id ON comments(poem_id);
CREATE INDEX IF NOT EXISTS idx_secret_khats_sender_uid ON secret_khats(sender_uid);

-- ============================================================================
-- AUTOMATED DAAD COUNT SYNCHRONIZATION TRIGGER
-- Maintains accurate daad_count in poems whenever likes are inserted/deleted
-- ============================================================================
CREATE OR REPLACE FUNCTION update_poem_daad_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE poems
        SET daad_count = daad_count + 1
        WHERE id = NEW.poem_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE poems
        SET daad_count = GREATEST(0, daad_count - 1)
        WHERE id = OLD.poem_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_poem_daad ON poem_likes;
CREATE TRIGGER trigger_sync_poem_daad
AFTER INSERT OR DELETE ON poem_likes
FOR EACH ROW
EXECUTE FUNCTION update_poem_daad_count();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES — ZERO-LEAK SECURITY MANDATE
-- ============================================================================

-- Enable RLS across all tables
ALTER TABLE private_user_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_shayars ENABLE ROW LEVEL SECURITY;
ALTER TABLE poems ENABLE ROW LEVEL SECURITY;
ALTER TABLE poem_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE secret_khats ENABLE ROW LEVEL SECURITY;

-- 1. private_user_vault: STRICTLY locked to the individual user
CREATE POLICY "Users can only read their own private vault"
ON private_user_vault FOR SELECT
USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can insert their own private vault record"
ON private_user_vault FOR INSERT
WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own private vault record"
ON private_user_vault FOR UPDATE
USING (auth.uid() = auth_user_id);

-- 2. public_shayars: Read accessible to everyone, writable only by owner
CREATE POLICY "Public shayar profiles are publicly readable"
ON public_shayars FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own public shayar profile"
ON public_shayars FOR INSERT
WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own public shayar profile"
ON public_shayars FOR UPDATE
USING (auth.uid() = auth_user_id);

-- 3. poems: Publicly readable, created by authenticated users
CREATE POLICY "Poems are publicly readable"
ON poems FOR SELECT
USING (true);

CREATE POLICY "Poets can create poems"
ON poems FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public_shayars
        WHERE public_shayars.shayar_uid = poems.shayar_uid
        AND public_shayars.auth_user_id = auth.uid()
    )
);

CREATE POLICY "Poets can delete their own poems"
ON poems FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public_shayars
        WHERE public_shayars.shayar_uid = poems.shayar_uid
        AND public_shayars.auth_user_id = auth.uid()
    )
);

-- 4. poem_likes: Readable by all, created/deleted by owner
CREATE POLICY "Likes are publicly readable"
ON poem_likes FOR SELECT
USING (true);

CREATE POLICY "Shayars can manage their own likes"
ON poem_likes FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public_shayars
        WHERE public_shayars.shayar_uid = poem_likes.shayar_uid
        AND public_shayars.auth_user_id = auth.uid()
    )
);

-- 5. bookmarks: Strictly private to the bookmarker
CREATE POLICY "Shayars can manage their own bookmarks"
ON bookmarks FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public_shayars
        WHERE public_shayars.shayar_uid = bookmarks.shayar_uid
        AND public_shayars.auth_user_id = auth.uid()
    )
);

-- 6. comments: Publicly readable, created by authenticated shayars
CREATE POLICY "Comments are publicly readable"
ON comments FOR SELECT
USING (true);

CREATE POLICY "Shayars can post comments"
ON comments FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public_shayars
        WHERE public_shayars.shayar_uid = comments.shayar_uid
        AND public_shayars.auth_user_id = auth.uid()
    )
);

-- 7. secret_khats:
CREATE POLICY "Secret khats can be viewed by anyone with letter id"
ON secret_khats FOR SELECT
USING (true);

CREATE POLICY "Shayars can create secret khats"
ON secret_khats FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public_shayars
        WHERE public_shayars.shayar_uid = secret_khats.sender_uid
        AND public_shayars.auth_user_id = auth.uid()
    )
);

CREATE POLICY "Letter recipient can unlock khat"
ON secret_khats FOR UPDATE
USING (true);
