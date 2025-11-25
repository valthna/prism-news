-- =============================================
-- SUPABASE REACTIONS TABLE SETUP
-- =============================================
-- Table pour stocker les compteurs de réactions par article
-- =============================================

-- Table principale des réactions agrégées par article
CREATE TABLE IF NOT EXISTS article_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    article_id TEXT NOT NULL,
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('fire', 'shock', 'doubt', 'angry', 'clap')),
    count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(article_id, reaction_type)
);

-- Index pour recherche rapide par article
CREATE INDEX IF NOT EXISTS idx_article_reactions_article_id ON article_reactions(article_id);

-- Fonction pour mettre à jour le timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour auto-update du timestamp
DROP TRIGGER IF EXISTS update_article_reactions_updated_at ON article_reactions;
CREATE TRIGGER update_article_reactions_updated_at
    BEFORE UPDATE ON article_reactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE article_reactions ENABLE ROW LEVEL SECURITY;

-- Policy: Lecture publique
CREATE POLICY "Allow public read on article_reactions"
    ON article_reactions
    FOR SELECT
    TO anon
    USING (true);

-- Policy: Insertion publique
CREATE POLICY "Allow public insert on article_reactions"
    ON article_reactions
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Policy: Mise à jour publique
CREATE POLICY "Allow public update on article_reactions"
    ON article_reactions
    FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (true);

-- =============================================
-- Fonction RPC pour incrémenter une réaction
-- =============================================
CREATE OR REPLACE FUNCTION increment_reaction(
    p_article_id TEXT,
    p_reaction_type TEXT
)
RETURNS INTEGER AS $$
DECLARE
    new_count INTEGER;
BEGIN
    -- Upsert: insert ou update si existe
    INSERT INTO article_reactions (article_id, reaction_type, count)
    VALUES (p_article_id, p_reaction_type, 1)
    ON CONFLICT (article_id, reaction_type)
    DO UPDATE SET count = article_reactions.count + 1
    RETURNING count INTO new_count;
    
    RETURN new_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Fonction RPC pour décrémenter une réaction
-- =============================================
CREATE OR REPLACE FUNCTION decrement_reaction(
    p_article_id TEXT,
    p_reaction_type TEXT
)
RETURNS INTEGER AS $$
DECLARE
    new_count INTEGER;
BEGIN
    UPDATE article_reactions
    SET count = GREATEST(0, count - 1)
    WHERE article_id = p_article_id AND reaction_type = p_reaction_type
    RETURNING count INTO new_count;
    
    -- Si aucune ligne affectée, retourner 0
    IF new_count IS NULL THEN
        RETURN 0;
    END IF;
    
    RETURN new_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Fonction RPC pour récupérer toutes les réactions d'un article
-- =============================================
CREATE OR REPLACE FUNCTION get_article_reactions(p_article_id TEXT)
RETURNS TABLE (reaction_type TEXT, count INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT ar.reaction_type, ar.count
    FROM article_reactions ar
    WHERE ar.article_id = p_article_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Fonction RPC pour récupérer les réactions de plusieurs articles
-- =============================================
CREATE OR REPLACE FUNCTION get_multiple_articles_reactions(p_article_ids TEXT[])
RETURNS TABLE (article_id TEXT, reaction_type TEXT, count INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT ar.article_id, ar.reaction_type, ar.count
    FROM article_reactions ar
    WHERE ar.article_id = ANY(p_article_ids);
END;
$$ LANGUAGE plpgsql;

