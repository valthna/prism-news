/**
 * Script pour corriger les URLs de logos (clearbit → google favicons)
 * 
 * Usage: npx tsx services/scripts/fix-logo-urls.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Variables SUPABASE_URL et SUPABASE_KEY requises');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const createGoogleFaviconUrl = (domain: string): string => {
  const normalized = domain.toLowerCase().replace(/\s+/g, '');
  const finalDomain = normalized.includes('.') ? normalized : `${normalized}.com`;
  return `https://www.google.com/s2/favicons?domain=${finalDomain}&sz=128`;
};

const fixLogoUrls = async () => {
  console.log('🔄 Récupération des articles avec URLs Clearbit...');

  // Récupérer les tiles
  const { data: tiles, error: tilesError } = await supabase
    .from('news_tiles')
    .select('id, article');

  if (tilesError) {
    console.error('❌ Erreur récupération tiles:', tilesError);
    return;
  }

  let updatedCount = 0;

  for (const tile of tiles || []) {
    const article = tile.article;
    if (!article?.sources) continue;

    let needsUpdate = false;
    const updatedSources = article.sources.map((source: any) => {
      if (source.logoUrl?.includes('clearbit.com')) {
        needsUpdate = true;
        return {
          ...source,
          logoUrl: createGoogleFaviconUrl(source.name),
        };
      }
      return source;
    });

    if (needsUpdate) {
      const updatedArticle = { ...article, sources: updatedSources };
      
      const { error: updateError } = await supabase
        .from('news_tiles')
        .update({ article: updatedArticle })
        .eq('id', tile.id);

      if (updateError) {
        console.error(`❌ Erreur update tile ${tile.id}:`, updateError);
      } else {
        updatedCount++;
        console.log(`✅ Tile ${tile.id} mis à jour`);
      }
    }
  }

  // Même chose pour news_cache
  const { data: cacheEntries, error: cacheError } = await supabase
    .from('news_cache')
    .select('id, articles');

  if (!cacheError && cacheEntries) {
    for (const entry of cacheEntries) {
      if (!Array.isArray(entry.articles)) continue;

      let needsUpdate = false;
      const updatedArticles = entry.articles.map((article: any) => {
        if (!article.sources) return article;

        const updatedSources = article.sources.map((source: any) => {
          if (source.logoUrl?.includes('clearbit.com')) {
            needsUpdate = true;
            return {
              ...source,
              logoUrl: createGoogleFaviconUrl(source.name),
            };
          }
          return source;
        });

        return { ...article, sources: updatedSources };
      });

      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('news_cache')
          .update({ articles: updatedArticles })
          .eq('id', entry.id);

        if (updateError) {
          console.error(`❌ Erreur update cache ${entry.id}:`, updateError);
        } else {
          updatedCount++;
          console.log(`✅ Cache ${entry.id} mis à jour`);
        }
      }
    }
  }

  console.log(`\n🎉 Terminé! ${updatedCount} entrées mises à jour.`);
};

fixLogoUrls().catch(console.error);

