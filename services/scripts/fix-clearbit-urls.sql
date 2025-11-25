-- =============================================================================
-- Script pour corriger les URLs Clearbit → Google Favicons dans Supabase
-- Exécuter dans: Supabase Dashboard → SQL Editor
-- =============================================================================

-- 1. Créer une fonction pour remplacer les URLs
CREATE OR REPLACE FUNCTION fix_clearbit_logo_url(logo_url TEXT, source_name TEXT)
RETURNS TEXT AS $$
BEGIN
  IF logo_url LIKE '%clearbit.com%' THEN
    RETURN 'https://www.google.com/s2/favicons?domain=' || 
           LOWER(REGEXP_REPLACE(source_name, '\s+', '')) || 
           CASE WHEN source_name NOT LIKE '%.%' THEN '.com' ELSE '' END ||
           '&sz=128';
  END IF;
  RETURN logo_url;
END;
$$ LANGUAGE plpgsql;

-- 2. Mettre à jour news_tiles
UPDATE news_tiles
SET article = jsonb_set(
  article,
  '{sources}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN source->>'logoUrl' LIKE '%clearbit.com%' 
        THEN jsonb_set(
          source,
          '{logoUrl}',
          to_jsonb(
            'https://www.google.com/s2/favicons?domain=' || 
            LOWER(REGEXP_REPLACE(source->>'name', '\s+', '', 'g')) ||
            CASE WHEN source->>'name' NOT LIKE '%.%' THEN '.com' ELSE '' END ||
            '&sz=128'
          )
        )
        ELSE source
      END
    )
    FROM jsonb_array_elements(article->'sources') AS source
  )
)
WHERE article->'sources' IS NOT NULL
  AND article::text LIKE '%clearbit.com%';

-- 3. Mettre à jour news_cache
UPDATE news_cache
SET articles = (
  SELECT jsonb_agg(
    CASE 
      WHEN article->'sources' IS NOT NULL AND article::text LIKE '%clearbit.com%'
      THEN jsonb_set(
        article,
        '{sources}',
        (
          SELECT jsonb_agg(
            CASE 
              WHEN source->>'logoUrl' LIKE '%clearbit.com%' 
              THEN jsonb_set(
                source,
                '{logoUrl}',
                to_jsonb(
                  'https://www.google.com/s2/favicons?domain=' || 
                  LOWER(REGEXP_REPLACE(source->>'name', '\s+', '', 'g')) ||
                  CASE WHEN source->>'name' NOT LIKE '%.%' THEN '.com' ELSE '' END ||
                  '&sz=128'
                )
              )
              ELSE source
            END
          )
          FROM jsonb_array_elements(article->'sources') AS source
        )
      )
      ELSE article
    END
  )
  FROM jsonb_array_elements(articles) AS article
)
WHERE articles::text LIKE '%clearbit.com%';

-- 4. Vérifier le résultat
SELECT 
  'news_tiles' as table_name,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE article::text LIKE '%clearbit.com%') as with_clearbit
FROM news_tiles
UNION ALL
SELECT 
  'news_cache',
  COUNT(*),
  COUNT(*) FILTER (WHERE articles::text LIKE '%clearbit.com%')
FROM news_cache;

-- 5. Nettoyer la fonction temporaire
DROP FUNCTION IF EXISTS fix_clearbit_logo_url;

