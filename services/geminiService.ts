import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { Bias, NewsArticle, Sentiment, Source, UserComment } from '../types';
import { getImagenService, SUPABASE_IMAGE_BUCKET } from './imagenService';
import { supabase } from './supabaseClient';

console.log("GeminiService Module Loaded");

const TILE_RETENTION_MS = 2 * 24 * 60 * 60 * 1000; // 2 jours
const MINIMUM_REUSABLE_TILES = 4;
const TILE_PIPELINE_VERSION = 'g3-image-preview-v1';
const bucketPublicBaseUrl = process.env.SUPABASE_URL
  ? `${process.env.SUPABASE_URL}/storage/v1/object/public/${SUPABASE_IMAGE_BUCKET}/`
  : null;

const SUPABASE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 heures
const LOCAL_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const RATE_LIMIT_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
const LOCAL_CACHE_PREFIX = 'prism-cache:';

const MIN_ARTICLES = 10;
const MIN_SOURCES_PER_ARTICLE = 5;
const TARGET_SOURCES_PER_ARTICLE = 8;

type CuratedSourceProfile = {
  name: string;
  bias: Bias;
  position: number;
  defaultSummary: string;
};

const curatedSourcePool: Record<Bias, CuratedSourceProfile[]> = {
  left: [
    { name: 'lemonde.fr', bias: 'left', position: 30, defaultSummary: 'Décryptage social de {topic} par Le Monde.' },
    { name: 'theguardian.com', bias: 'left', position: 28, defaultSummary: 'Perspective société civile du Guardian sur {topic}.' },
    { name: 'mediapart.fr', bias: 'left', position: 22, defaultSummary: 'Contre-enquête indépendante de Mediapart autour de {topic}.' },
    { name: 'vox.com', bias: 'left', position: 35, defaultSummary: 'Analyse progressiste de Vox appliquée à {topic}.' }
  ],
  center: [
    { name: 'reuters.com', bias: 'center', position: 50, defaultSummary: 'Dépêche factuelle de Reuters consacrée à {topic}.' },
    { name: 'apnews.com', bias: 'center', position: 48, defaultSummary: 'Synthèse Associated Press sur {topic}.' },
    { name: 'ft.com', bias: 'center', position: 55, defaultSummary: 'Lecture marchés et gouvernance du Financial Times sur {topic}.' },
    { name: 'politico.eu', bias: 'center', position: 53, defaultSummary: 'Analyse politique européenne de Politico liée à {topic}.' }
  ],
  right: [
    { name: 'lefigaro.fr', bias: 'right', position: 70, defaultSummary: 'Lecture conservatrice française proposée par Le Figaro sur {topic}.' },
    { name: 'wsj.com', bias: 'right', position: 75, defaultSummary: 'Perspective pro-business du Wall Street Journal appliquée à {topic}.' },
    { name: 'foxnews.com', bias: 'right', position: 90, defaultSummary: 'Traitement éditorial conservateur de Fox News autour de {topic}.' },
    { name: 'lesechos.fr', bias: 'right', position: 68, defaultSummary: 'Analyse économique libérale de Les Échos au sujet de {topic}.' }
  ],
  neutral: [
    { name: 'afp.com', bias: 'neutral', position: 50, defaultSummary: 'Fil d’actualité AFP sur {topic}.' },
    { name: 'who.int', bias: 'neutral', position: 45, defaultSummary: 'Données techniques multilatérales de l’OMS liées à {topic}.' },
    { name: 'worldbank.org', bias: 'neutral', position: 55, defaultSummary: 'Lecture macro-économique de la Banque mondiale autour de {topic}.' },
    { name: 'oecd.org', bias: 'neutral', position: 52, defaultSummary: 'Étude comparative produite par l’OCDE au sujet de {topic}.' }
  ]
};

const biasRotationOrder: Bias[] = ['left', 'right', 'center', 'neutral'];

const defaultPositionByBias: Record<Bias, number> = {
  left: 30,
  center: 50,
  right: 70,
  neutral: 50
};

const sanitizeBias = (bias?: string): Bias => {
  if (!bias) return 'neutral';
  const lower = bias.toLowerCase();
  if (lower.includes('left') || lower.includes('gauche')) return 'left';
  if (lower.includes('right') || lower.includes('droite')) return 'right';
  if (lower.includes('center') || lower.includes('centre') || lower.includes('neutral')) return 'center';
  return 'neutral';
};

const normalizeSourceName = (name: string): string =>
  name.toLowerCase().trim();

const createLogoUrl = (rawName: string): string => {
  const normalized = rawName.toLowerCase().replace(/\s+/g, '');
  if (!normalized) {
    return 'https://logo.clearbit.com/reuters.com';
  }
  const domain = normalized.includes('.') ? normalized : `${normalized}.com`;
  return `https://logo.clearbit.com/${domain}`;
};

const createGoogleSearchUrl = (headline: string, sourceName: string): string =>
  `https://www.google.com/search?q=${encodeURIComponent(`${headline} ${sourceName}`)}`;

const enrichCoverageSummary = (summary: string | undefined, sourceName: string, headline: string, fallbackSummary: string): string => {
  if (summary && summary.trim().length > 0) {
    return summary.trim();
  }
  const topic = fallbackSummary || headline;
  return `Analyse complémentaire proposée par ${sourceName} sur ${topic}.`;
};

const dedupeSources = (sources: Source[]): Source[] => {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const key = normalizeSourceName(source.name);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const buildBiasPriorityQueue = (sources: Source[]): Bias[] => {
  const presence: Record<Bias, boolean> = {
    left: false,
    right: false,
    center: false,
    neutral: false
  };

  sources.forEach((source) => {
    presence[source.bias] = true;
  });

  const queue: Bias[] = [];
  (['left', 'right', 'center'] as Bias[]).forEach((bias) => {
    if (!presence[bias]) {
      queue.push(bias);
    }
  });

  return queue.concat(biasRotationOrder);
};

const ensureSourceFloor = (headline: string, summary: string, initialSources: Source[]): Source[] => {
  const deduped = dedupeSources(
    initialSources.map((source) => {
      const bias = sanitizeBias(source.bias);
      return {
        ...source,
        bias,
        position: typeof source.position === 'number' ? source.position : defaultPositionByBias[bias],
        coverageSummary: enrichCoverageSummary(source.coverageSummary, source.name, headline, summary),
        logoUrl: source.logoUrl || createLogoUrl(source.name),
        url: source.url || createGoogleSearchUrl(headline, source.name)
      };
    })
  );

  const usedNames = new Set(deduped.map((source) => normalizeSourceName(source.name)));
  const baselineTarget = deduped.length >= TARGET_SOURCES_PER_ARTICLE ? deduped.length : TARGET_SOURCES_PER_ARTICLE;
  const target = Math.max(MIN_SOURCES_PER_ARTICLE, baselineTarget);

  const biasQueue = buildBiasPriorityQueue(deduped);
  let attempts = 0;

  while (deduped.length < target && attempts < 40) {
    const bias = biasQueue[attempts % biasQueue.length];
    const candidates = curatedSourcePool[bias] || [];
    const candidate = candidates.find((profile) => !usedNames.has(normalizeSourceName(profile.name)));
    if (candidate) {
      deduped.push({
        name: candidate.name,
        bias,
        position: candidate.position,
        logoUrl: createLogoUrl(candidate.name),
        coverageSummary: candidate.defaultSummary.replace('{topic}', summary || headline),
        url: createGoogleSearchUrl(headline, candidate.name)
      });
      usedNames.add(normalizeSourceName(candidate.name));
    }
    attempts += 1;
  }

  if (deduped.length < MIN_SOURCES_PER_ARTICLE) {
    for (const bias of biasRotationOrder) {
      const candidates = curatedSourcePool[bias] || [];
      for (const candidate of candidates) {
        if (deduped.length >= MIN_SOURCES_PER_ARTICLE) break;
        if (usedNames.has(normalizeSourceName(candidate.name))) continue;
        deduped.push({
          name: candidate.name,
          bias,
          position: candidate.position,
          logoUrl: createLogoUrl(candidate.name),
          coverageSummary: candidate.defaultSummary.replace('{topic}', summary || headline),
          url: createGoogleSearchUrl(headline, candidate.name)
        });
        usedNames.add(normalizeSourceName(candidate.name));
      }
      if (deduped.length >= MIN_SOURCES_PER_ARTICLE) break;
    }
  }

  return deduped;
};

const sortArticlesBySourceRichness = (articles: NewsArticle[]): NewsArticle[] =>
  [...articles].sort((a, b) => {
    const diff = (b.sources?.length || 0) - (a.sources?.length || 0);
    if (diff !== 0) {
      return diff;
    }
    return (a.headline || '').localeCompare(b.headline || '');
  });

const hydrateRawSource = (rawSource: any, headline: string, summary: string): Source => {
  const rawName = collapseWhitespace(rawSource?.name) || 'Source non identifiée';
  const bias = sanitizeBias(rawSource?.bias);
  const position = typeof rawSource?.position === 'number' ? rawSource.position : defaultPositionByBias[bias];
  const coverageSummary = enrichCoverageSummary(rawSource?.coverageSummary, rawName, headline, summary);
  const url = typeof rawSource?.url === 'string' && rawSource.url.trim().length > 0
    ? rawSource.url
    : createGoogleSearchUrl(headline, rawName);

  return {
    name: rawName,
    bias,
    position,
    coverageSummary,
    url,
    logoUrl: rawSource?.logoUrl || createLogoUrl(rawName)
  };
};

const ensureMinimumArticleCount = (articles: NewsArticle[]): NewsArticle[] => {
  if (articles.length >= MIN_ARTICLES) {
    return articles;
  }

  const fallbackPool = buildStrategicFallbackArticles();
  const usedHeadlines = new Set(articles.map((article) => article.headline));
  const needed = MIN_ARTICLES - articles.length;
  const additions: NewsArticle[] = [];

  for (const fallback of fallbackPool) {
    if (additions.length >= needed) break;
    if (usedHeadlines.has(fallback.headline)) continue;
    additions.push(fallback);
    usedHeadlines.add(fallback.headline);
  }

  return sortArticlesBySourceRichness([...articles, ...additions]);
};

type LocalCachePayload = {
  timestamp: number;
  articles: NewsArticle[];
};

let lastRateLimitHit = 0;

const resolveApiKey = (): string | undefined => {
  const isBrowser = typeof window !== 'undefined';
  if (!isBrowser && typeof process !== 'undefined' && process.env?.API_KEY) {
    return process.env.API_KEY;
  }
  if (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.VITE_API_KEY) {
    return (import.meta as any).env.VITE_API_KEY as string;
  }
  return undefined;
};

const getLocalStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const readLocalCachePayload = (cacheKey: string): LocalCachePayload | null => {
  const storage = getLocalStorage();
  if (!storage) {
    return null;
  }
  try {
    const raw = storage.getItem(`${LOCAL_CACHE_PREFIX}${cacheKey}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalCachePayload;
    if (!parsed || !Array.isArray(parsed.articles)) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn(`[PRISM] Failed to parse local cache for ${cacheKey}:`, error);
    storage.removeItem(`${LOCAL_CACHE_PREFIX}${cacheKey}`);
    return null;
  }
};

const getLocalCache = (cacheKey: string, options: { allowStale?: boolean } = {}): NewsArticle[] | null => {
  const payload = readLocalCachePayload(cacheKey);
  if (!payload) {
    return null;
  }
  if (!options.allowStale && (Date.now() - payload.timestamp > LOCAL_CACHE_TTL_MS)) {
    return null;
  }
  return payload.articles;
};

const saveLocalCache = (cacheKey: string, articles: NewsArticle[]): void => {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }
  const payload: LocalCachePayload = {
    timestamp: Date.now(),
    articles,
  };
  try {
    storage.setItem(`${LOCAL_CACHE_PREFIX}${cacheKey}`, JSON.stringify(payload));
  } catch (error) {
    console.warn(`[PRISM] Failed to save local cache for ${cacheKey}:`, error);
  }
};

const fetchSupabaseCache = async (cacheKey: string, maxAgeMs: number): Promise<NewsArticle[] | null> => {
  if (!supabase) {
    return null;
  }
  try {
    const { data, error } = await supabase
      .from('news_cache')
      .select('articles, created_at')
      .eq('search_key', cacheKey)
      .gt('created_at', new Date(Date.now() - maxAgeMs).toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.warn("[PRISM] Cache check failed:", error);
      return null;
    }

    if (data && data.length > 0) {
      console.log(`[PRISM] Supabase cache hit for key: ${cacheKey}`);
      return data[0].articles as NewsArticle[];
    }
  } catch (err) {
    console.warn("[PRISM] Cache check failed:", err);
  }
  return null;
};

const isRateLimitError = (error: unknown): boolean => {
  if (!error) return false;
  const anyError = error as any;
  const message = typeof error === 'string'
    ? error
    : (error instanceof Error ? error.message : '');

  if (message && /429|quota|RESOURCE_EXHAUSTED/i.test(message)) {
    return true;
  }

  if (typeof anyError === 'object') {
    if (anyError?.code === 429 || anyError?.status === 429) {
      return true;
    }
    if (anyError?.error?.code === 429 || anyError?.error?.status === 'RESOURCE_EXHAUSTED') {
      return true;
    }
  }

  return false;
};

const getStoragePathFromUrl = (imageUrl?: string | null): string | null => {
  if (!imageUrl || !bucketPublicBaseUrl) {
    return null;
  }
  if (!imageUrl.startsWith(bucketPublicBaseUrl)) {
    return null;
  }
  const withoutBase = imageUrl.slice(bucketPublicBaseUrl.length);
  return withoutBase.split('?')[0] || null;
};

const persistTilesToRepository = async (articles: NewsArticle[], cacheKey: string) => {
  if (!supabase || articles.length === 0) {
    console.warn("[PRISM] Supabase indisponible pour news_tiles. Le cache persistant est désactivé.");
    return;
  }
  try {
    const payload = articles.map((article) => ({
      article_id: article.id,
      search_key: cacheKey,
      article,
      image_storage_path: getStoragePathFromUrl(article.imageUrl),
    }));
    const { error } = await supabase
      .from('news_tiles')
      .upsert(payload, { onConflict: 'article_id' });

    if (error) {
      console.warn("[PRISM] Échec upsert news_tiles:", error);
      return;
    }

    console.log(`[PRISM] Persisted ${payload.length} tiles for key: ${cacheKey}`);
  } catch (error) {
    console.warn("[PRISM] Failed to persist tiles:", error);
  }
};

const fetchTilesFromRepository = async (cacheKey: string): Promise<NewsArticle[] | null> => {
  if (!supabase) {
    return null;
  }
  try {
    const cutoffIso = new Date(Date.now() - TILE_RETENTION_MS).toISOString();
    const { data, error } = await supabase
      .from('news_tiles')
      .select('article')
      .eq('search_key', cacheKey)
      .gt('created_at', cutoffIso)
      .order('created_at', { ascending: false })
      .limit(MINIMUM_REUSABLE_TILES);

    if (error) {
      console.warn("[PRISM] Failed to fetch tiles from repository:", error);
      return null;
    }

    if (!data || data.length < MINIMUM_REUSABLE_TILES) {
      return null;
    }

    const articles = data.map((row) => row.article as NewsArticle);
    console.log(`[PRISM] Reused ${articles.length} tiles from repository for key: ${cacheKey}`);
    return articles;
  } catch (error) {
    console.warn("[PRISM] Unexpected error while reusing tiles:", error);
    return null;
  }
};

const cleanupExpiredTiles = async () => {
  if (!supabase) {
    return;
  }
  try {
    const cutoffIso = new Date(Date.now() - TILE_RETENTION_MS).toISOString();
    const { data, error } = await supabase
      .from('news_tiles')
      .select('article_id, image_storage_path, article')
      .lt('created_at', cutoffIso);

    if (error) {
      console.warn("[PRISM] Failed to fetch stale tiles:", error);
      return;
    }

    if (!data || data.length === 0) {
      return;
    }

    const articleIds = data.map((row) => row.article_id).filter(Boolean);

    if (articleIds.length > 0) {
      const { error: deleteError } = await supabase
        .from('news_tiles')
        .delete()
        .in('article_id', articleIds);
      if (deleteError) {
        console.warn("[PRISM] Failed to delete stale tiles:", deleteError);
      }
    }

    const storagePaths = data
      .map((row) => {
        if (row.image_storage_path) return row.image_storage_path;
        const article = row.article as NewsArticle | undefined;
        return getStoragePathFromUrl(article?.imageUrl);
      })
      .filter((path): path is string => Boolean(path));

    if (storagePaths.length > 0) {
      const uniquePaths = Array.from(new Set(storagePaths));
      const { error: storageError } = await supabase
        .storage
        .from(SUPABASE_IMAGE_BUCKET)
        .remove(uniquePaths);
      if (storageError) {
        console.warn("[PRISM] Failed to cleanup storage objects:", storageError);
      }
    }
  } catch (error) {
    console.warn("[PRISM] Unexpected error during tile cleanup:", error);
  }
};

const collapseWhitespace = (value?: string): string =>
  value ? value.replace(/\s+/g, ' ').trim() : '';

const buildTileBackgroundPrompt = (article: NewsArticle): string => {
  const subjectFocus =
    collapseWhitespace(article.imagePrompt) ||
    collapseWhitespace(article.headline) ||
    "current news event";
  const contextSummary = collapseWhitespace(
    `${article.detailedSummary || article.summary || ''} ${article.importance || ''}`
  );
  const moodCue = article.emoji ? `Mood cue suggested by ${article.emoji}.` : '';

  return [
    "Premium editorial background for a PRISM news tile, inspired by iconic French newspaper caricatures.",
    `Subject focus: ${subjectFocus}.`,
    contextSummary ? `Context and stakes: ${contextSummary}.` : '',
    "Scene direction: elegant portrait framing with layered depth, subtle architectural or institutional cues tied to the story, diagonal energy, soft vignette, generous breathing space for overlay text.",
    "Art direction: expressive black ink line work with selective watercolor washes, satirical tone reminiscent of Plantu, Cabu, Wolinski and Le Canard Enchaîné illustrations; bold silhouettes, witty symbolism, slightly exaggerated facial expressions.",
    "Tone: impactful, highly critical political humor with sharp wit, accurate likeness to public figures, detailed storytelling cues, never mean-spirited.",
    "Color palette: muted newsprint beige plus charcoal blacks with one or two vivid accent colours echoing the topic.",
    "Technical: 3:4 vertical composition, ultra high resolution, crisp textures, tile-friendly negative space, absolutely no text, captions, logos or UI chrome.",
    `${moodCue}Negative prompt: avoid photorealism, 3D renders, CGI artifacts, pixelation, watermarks, gore or offensive caricature tropes.`
  ]
    .filter(Boolean)
    .join(' ');
};

// Algorithme de calcul de fiabilité basé sur des données tangibles
const calculateReliability = (sources: Source[]): number => {
  let score = 50; // Score de base plus élevé

  // 1. Quantité de sources (Max +40)
  // On valorise fortement la multiplication des sources au-delà du minimum
  const quantityBase = Math.min(sources.length, MIN_SOURCES_PER_ARTICLE) * 5;
  const quantityStretch = sources.length > MIN_SOURCES_PER_ARTICLE
    ? Math.min((sources.length - MIN_SOURCES_PER_ARTICLE) * 3, 15)
    : 0;
  score += quantityBase + quantityStretch;

  // 2. Diversité du spectre (Max +20)
  const hasLeft = sources.some(s => s.bias === 'left');
  const hasRight = sources.some(s => s.bias === 'right');
  const hasCenter = sources.some(s => s.bias === 'center' || s.bias === 'neutral');

  if (hasLeft && hasRight) {
    score += 15; // Forte polarité couverte
  }
  if (hasCenter) {
    score += 5; // Point de référence neutre
  }

  // 3. Bonus "Mainstream" (si on atteint l'objectif cible)
  if (sources.length >= TARGET_SOURCES_PER_ARTICLE) score += 5;

  // 4. Pénalités
  if (sources.length < 2) score -= 30; // Pénalité critique si source unique
  if (sources.length === 2) score -= 10;

  // Bornage strict entre 20 et 98
  return Math.min(Math.max(score, 20), 98);
};

type StrategicTopicBlueprint = {
  id: string;
  emoji: string;
  category: string;
  headline: string;
  summary: string;
  detailedSummary: string;
  importance: string;
  sentiment: Sentiment;
  publishedAt: string;
  biasAnalysis: {
    left: number;
    center: number;
    right: number;
  };
  sources: Array<{
    name: string;
    bias: Bias;
    position: number;
    coverageSummary: string;
  }>;
};

const STRATEGIC_TOPIC_BLUEPRINTS: StrategicTopicBlueprint[] = [
  {
    id: 'transition-energetique-juste',
    emoji: '⚡️',
    category: 'Transition énergétique',
    headline: "Transition énergétique : la justice sociale en première ligne",
    summary: "Les plans européens de décarbonation intègrent désormais des filets sociaux plus ambitieux pour financer le basculement vers l'électrification.",
    detailedSummary: "La Commission européenne et plusieurs capitales présentent de nouveaux mécanismes de redistribution pour amortir les hausses de facture liées à la rénovation et aux carburants durables. Les opérateurs de réseau alertent toutefois sur le retard des investissements dans les infrastructures, tandis que les ONG réclament une fiscalité renforcée sur les super-profits fossiles. En parallèle, les investisseurs multiplient les stress tests climatiques pour identifier les actifs menacés.",
    importance: "Sans compensation crédible, la transition bas carbone risque de creuser les fractures territoriales. Des plans mieux financés sécurisent la stabilité sociale et accélèrent les investissements industriels.",
    sentiment: {
      positive: "La redistribution climatique crédibilise enfin les objectifs 2030.",
      negative: "Les coûts explosent et la promesse d'équité reste fragile."
    },
    publishedAt: "IL Y A 1H",
    biasAnalysis: { left: 34, center: 46, right: 20 },
    sources: [
      { name: 'iea.org', bias: 'center', position: 52, coverageSummary: "Scénarios mondiaux sur la répartition des investissements nécessaires." },
      { name: 'bnef.com', bias: 'center', position: 55, coverageSummary: "Projection des coûts actualisés pour les technologies bas carbone." },
      { name: 'rte-france.com', bias: 'center', position: 50, coverageSummary: "Analyse réseau sur la pointe hivernale et la sécurité d'approvisionnement." },
      { name: 'ademe.fr', bias: 'left', position: 35, coverageSummary: "Étude sur l'accompagnement social des ménages vulnérables." },
      { name: 'carbontracker.org', bias: 'left', position: 25, coverageSummary: "Stress tests financiers des utilities encore exposées au charbon." },
      { name: 'reuters.com', bias: 'center', position: 50, coverageSummary: "Couverture diplomatique des engagements climatiques européens." }
    ]
  },
  {
    id: 'ia-regulations-globales',
    emoji: '🤖',
    category: 'Technologies émergentes',
    headline: "IA : vers une gouvernance mondiale des modèles de fondation",
    summary: "Les régulateurs synchronisent leurs exigences sur les tests de robustesse et la transparence des modèles d'IA générative.",
    detailedSummary: "L'OCDE publie un référentiel commun pour documenter les risques systémiques des modèles, tandis que les autorités nationales affinent les obligations de reporting. Les industriels redoutent un morcellement juridique, mais les investisseurs réclament des règles claires pour sécuriser les usages critiques. Les plateformes cloud se préparent à des audits de sécurité indépendants.",
    importance: "Harmoniser les garde-fous évite la fragmentation du marché et limite les abus sur les données sensibles.",
    sentiment: {
      positive: "Des règles homogènes renforcent la confiance et l'adoption responsable.",
      negative: "La multiplication des contraintes peut ralentir l'innovation locale."
    },
    publishedAt: "IL Y A 2H",
    biasAnalysis: { left: 30, center: 50, right: 20 },
    sources: [
      { name: 'oecd.org', bias: 'neutral', position: 52, coverageSummary: "Comparatif des cadres réglementaires IA dans les pays membres." },
      { name: 'cnil.fr', bias: 'center', position: 48, coverageSummary: "Doctrine française sur les audits algorithmiques et la gestion des jeux d'entraînement." },
      { name: 'politico.eu', bias: 'center', position: 53, coverageSummary: "Suivi des compromis politiques autour de l'AI Act." },
      { name: 'wired.com', bias: 'left', position: 40, coverageSummary: "Impact sur les écosystèmes open source et la transparence des modèles." },
      { name: 'technologyreview.com', bias: 'center', position: 50, coverageSummary: "Analyse académique des méthodes d'évaluation des modèles de fondation." },
      { name: 'brookings.edu', bias: 'right', position: 60, coverageSummary: "Lecture géopolitique et risque de fragmentation normative." },
      { name: 'ft.com', bias: 'right', position: 65, coverageSummary: "Réaction des marchés financiers et des grands investisseurs." },
      { name: 'theverge.com', bias: 'left', position: 35, coverageSummary: "Implications quotidiennes pour les utilisateurs finaux." }
    ]
  },
  {
    id: 'sante-mentale-travail',
    emoji: '🧠',
    category: 'Santé & Travail',
    headline: "Santé mentale au travail : vers des obligations de résultats",
    summary: "Les autorités sanitaires actent une hausse inédite des troubles psychosociaux et imposent des plans de prévention mesurables aux employeurs.",
    detailedSummary: "L'OMS et les agences nationales recommandent des indicateurs de charge mentale intégrés dans les négociations annuelles obligatoires. Les entreprises publient des données d'engagement anonymisées tandis que les syndicats réclament un droit à la déconnexion contraignant. Les assureurs réévaluent leurs primes incapacité face à la hausse des arrêts longue durée.",
    importance: "Préserver la santé mentale conditionne la productivité, l'attractivité RH et la soutenabilité des systèmes sociaux.",
    sentiment: {
      positive: "Institutionnaliser la prévention réduit le turnover et améliore la rétention.",
      negative: "Des objectifs chiffrés peuvent alourdir les obligations administratives."
    },
    publishedAt: "IL Y A 45 MIN",
    biasAnalysis: { left: 38, center: 44, right: 18 },
    sources: [
      { name: 'who.int', bias: 'neutral', position: 45, coverageSummary: "Statistiques mondiales sur l'incidence des troubles anxieux liés au travail." },
      { name: 'inrs.fr', bias: 'neutral', position: 48, coverageSummary: "Recommandations opérationnelles pour mesurer la charge psychosociale." },
      { name: 'hbr.org', bias: 'center', position: 55, coverageSummary: "Retour d'expérience d'entreprises sur les programmes de soutien psychologique." },
      { name: 'santepubliquefrance.fr', bias: 'left', position: 42, coverageSummary: "Données épidémiologiques françaises et alertes régionales." },
      { name: 'thelancet.com', bias: 'center', position: 50, coverageSummary: "Méga-étude sur l'efficacité des dispositifs hybrides." },
      { name: 'npr.org', bias: 'left', position: 38, coverageSummary: "Témoignages salariés sur les tensions post-pandémie." },
      { name: 'gallup.com', bias: 'neutral', position: 50, coverageSummary: "Indice mondial d'engagement et corrélation avec les burn-outs." }
    ]
  },
  {
    id: 'souverainete-alimentaire',
    emoji: '🌾',
    category: 'Alimentation & Agriculture',
    headline: "Souveraineté alimentaire : les stocks stratégiques se renforcent",
    summary: "Face aux tensions climatiques et géopolitiques, plusieurs blocs régionaux reconstituent des réserves céréalières et relocalisent des intrants critiques.",
    detailedSummary: "La FAO alerte sur la volatilité des prix tandis que des fonds souverains financent des infrastructures de stockage. Les États-Unis et l'Union européenne négocient des corridors d'engrais, alors que des ONG dénoncent la dépendance persistante à l'importation de protéines. Les hubs logistiques africains accélèrent les projets de transformation locale.",
    importance: "Sécuriser les chaînes agroalimentaires limite les risques d'émeutes et stabilise l'inflation.",
    sentiment: {
      positive: "Des stocks mieux gérés amortissent les chocs climatiques.",
      negative: "Le repli protectionniste menace les pays importateurs nets."
    },
    publishedAt: "IL Y A 3H",
    biasAnalysis: { left: 33, center: 45, right: 22 },
    sources: [
      { name: 'fao.org', bias: 'neutral', position: 45, coverageSummary: "Suivi des marchés céréaliers mondiaux et des flux d'exportation." },
      { name: 'ifpri.org', bias: 'neutral', position: 48, coverageSummary: "Modélisation des politiques alimentaires et de leurs impacts sociaux." },
      { name: 'usda.gov', bias: 'right', position: 65, coverageSummary: "Projections sur les rendements agricoles américains et les aides." },
      { name: 'reuters.com', bias: 'center', position: 50, coverageSummary: "Analyses des corridors sécurisés pour les céréales ukrainiennes." },
      { name: 'mongabay.com', bias: 'left', position: 32, coverageSummary: "Conséquences écologiques des extensions de surface cultivée." },
      { name: 'grain.org', bias: 'left', position: 25, coverageSummary: "Plaidoyer pour des modèles agro-écologiques souverains." },
      { name: 'agfundernews.com', bias: 'center', position: 55, coverageSummary: "Investissements agritech dans la logistique du froid et les intrants." }
    ]
  },
  {
    id: 'cybersecurite-infrastructures',
    emoji: '🛡️',
    category: 'Cybersécurité',
    headline: "Infrastructures critiques : alerte rouge sur les rançongiciels",
    summary: "Un rapport conjoint met en évidence une hausse de 70% des attaques visant l'énergie, les hôpitaux et les transports.",
    detailedSummary: "ENISA, l'ANSSI et la CISA recommandent des plans de segmentation réseau et l'obligation de tests de restauration trimestriels. Les assureurs cyber durcissent leurs critères, tandis que des éditeurs publient des correctifs pour les équipements industriels exposés. Les opérateurs réclament un partage d'indicateurs de compromission en temps réel.",
    importance: "Un arrêt prolongé des réseaux électriques ou hospitaliers aurait des conséquences humaines et économiques majeures.",
    sentiment: {
      positive: "La coopération transatlantique accélère la diffusion des correctifs.",
      negative: "La pénurie de talents limite la mise en œuvre sur le terrain."
    },
    publishedAt: "IL Y A 30 MIN",
    biasAnalysis: { left: 28, center: 50, right: 22 },
    sources: [
      { name: 'enisa.europa.eu', bias: 'neutral', position: 48, coverageSummary: "Typologie des attaques récentes sur les opérateurs d'importance vitale." },
      { name: 'anssi.gouv.fr', bias: 'neutral', position: 47, coverageSummary: "Guides de segmentation réseau et exigences de supervision continue." },
      { name: 'cisa.gov', bias: 'center', position: 55, coverageSummary: "Alertes sur les vulnérabilités des systèmes industriels américains." },
      { name: 'darkreading.com', bias: 'center', position: 55, coverageSummary: "Analyse technique des familles de rançongiciels ciblant l'OT." },
      { name: 'kaspersky.com', bias: 'center', position: 50, coverageSummary: "Rapport sur les chaînes d'approvisionnement logicielles compromises." },
      { name: 'crowdstrike.com', bias: 'right', position: 65, coverageSummary: "Insights sur les groupes criminels et leurs tactiques." },
      { name: 'therecord.media', bias: 'center', position: 52, coverageSummary: "Chronologie des attaques majeures en Europe de l'Est." },
      { name: 'zdnet.com', bias: 'center', position: 55, coverageSummary: "Conséquences financières pour les entreprises victimes." }
    ]
  },
  {
    id: 'mobilites-bas-carbone',
    emoji: '🚉',
    category: 'Mobilités',
    headline: "Mobilités bas carbone : les villes changent d'échelle",
    summary: "Les métropoles européennes et asiatiques accélèrent les corridors express pour bus électriques et trains métropolitains.",
    detailedSummary: "L'AIE note un triplement des investissements dans les transports collectifs électriques, tandis que les ONG évaluent l'impact sanitaire des zones à faibles émissions. Les industriels présentent de nouvelles batteries solides et les banques de développement financent des hubs intermodaux. Des résistances persistent sur le partage de la voirie.",
    importance: "Réduire les émissions du transport urbain est indispensable pour tenir les budgets carbone.",
    sentiment: {
      positive: "Des financements massifs permettent de passer du pilote au déploiement massif.",
      negative: "Les classes moyennes craignent une taxation accrue de l'automobile individuelle."
    },
    publishedAt: "IL Y A 4H",
    biasAnalysis: { left: 32, center: 44, right: 24 },
    sources: [
      { name: 'iea.org', bias: 'center', position: 52, coverageSummary: "Tableaux de bord mondiaux sur les investissements transport." },
      { name: 'transportenvironment.org', bias: 'left', position: 35, coverageSummary: "Benchmark des zones à faibles émissions dans l'UE." },
      { name: 'bloomberg.com', bias: 'center', position: 55, coverageSummary: "Focus sur les marchés obligataires finançant les infrastructures." },
      { name: 'uitp.org', bias: 'neutral', position: 45, coverageSummary: "Bonnes pratiques d'exploitation des réseaux urbains." },
      { name: 'cleantechnica.com', bias: 'left', position: 30, coverageSummary: "Comparatif des bus électriques et de leurs coûts d'usage." },
      { name: 'lesechos.fr', bias: 'right', position: 68, coverageSummary: "Analyse économique pour les constructeurs automobiles." },
      { name: 'politico.eu', bias: 'center', position: 53, coverageSummary: "Débats politiques sur l'interdiction des moteurs thermiques." },
      { name: 'mckinsey.com', bias: 'right', position: 70, coverageSummary: "Business cases pour les hubs multimodaux et la logistique urbaine." }
    ]
  },
  {
    id: 'finance-durable-obligations-vertes',
    emoji: '💶',
    category: 'Finance durable',
    headline: "Obligations vertes : vers un standard de reporting commun",
    summary: "Les régulateurs alignent leurs taxonomies pour réduire le greenwashing et harmoniser les indicateurs d'impact.",
    detailedSummary: "Le Climate Bonds Initiative propose un format standardisé adopté par plusieurs bourses européennes. Les PRI et l'OCDE plaident pour intégrer des stress tests biodiversité, tandis que la Banque des règlements internationaux teste une chaîne de blocs dédiée à la traçabilité des projets. Les investisseurs exigent des audits externes des allocations de fonds.",
    importance: "Un cadre commun abaisse le coût du capital pour les projets crédibles et renforce la confiance des marchés.",
    sentiment: {
      positive: "La standardisation débloque des capitaux institutionnels massifs.",
      negative: "Les émetteurs craignent une complexité administrative supplémentaire."
    },
    publishedAt: "IL Y A 5H",
    biasAnalysis: { left: 30, center: 48, right: 22 },
    sources: [
      { name: 'climatebonds.net', bias: 'left', position: 35, coverageSummary: "Proposition de standard et certification des obligations vertes." },
      { name: 'unpri.org', bias: 'left', position: 33, coverageSummary: "Engagements des investisseurs signataires sur la transparence." },
      { name: 'msci.com', bias: 'center', position: 55, coverageSummary: "Notation ESG des portefeuilles obligataires." },
      { name: 'bloomberg.com', bias: 'center', position: 55, coverageSummary: "Données de marché sur les émissions et les spreads." },
      { name: 'ft.com', bias: 'right', position: 65, coverageSummary: "Réaction des grandes banques et du marché primaire." },
      { name: 'bis.org', bias: 'neutral', position: 50, coverageSummary: "Expérimentations technologiques pour tracer les flux." },
      { name: 'oecd.org', bias: 'neutral', position: 52, coverageSummary: "Recommandations politiques sur la labellisation." },
      { name: 'novethic.fr', bias: 'left', position: 38, coverageSummary: "Enquêtes sur les risques de greenwashing." }
    ]
  },
  {
    id: 'eau-adaptation-climatique',
    emoji: '💧',
    category: 'Climat & Ressources',
    headline: "Stress hydrique : les villes passent en mode adaptation permanente",
    summary: "Des plans d'investissement massifs apparaissent pour recycler les eaux grises, verdir les centres urbains et sécuriser l'irrigation agricole.",
    detailedSummary: "L'UNESCO publie une cartographie des mégalopoles les plus vulnérables, tandis que le WRI classe les bassins critiques. Les scientifiques de Nature Climate Change recommandent des seuils de consommation par habitant et les ONG alertent sur les conflits d'usage avec l'industrie. Les assureurs exigent des plans sécheresse pour couvrir les infrastructures.",
    importance: "L'eau devient un risque systémique pour l'alimentation, l'énergie et la santé publique.",
    sentiment: {
      positive: "L'investissement préventif réduit les coûts de crise et crée des emplois verts.",
      negative: "Les restrictions peuvent exacerber les inégalités territoriales."
    },
    publishedAt: "IL Y A 6H",
    biasAnalysis: { left: 36, center: 44, right: 20 },
    sources: [
      { name: 'unesco.org', bias: 'neutral', position: 45, coverageSummary: "Cartographie des mégalopoles en déficit hydrique." },
      { name: 'wri.org', bias: 'center', position: 50, coverageSummary: "Indice Aqueduct et scénarios de stress." },
      { name: 'nature.com', bias: 'center', position: 55, coverageSummary: "Études scientifiques sur l'impact des vagues de chaleur." },
      { name: 'nationalgeographic.com', bias: 'center', position: 52, coverageSummary: "Reportages sur les projets de réutilisation des eaux usées." },
      { name: 'theguardian.com', bias: 'left', position: 30, coverageSummary: "Alertes sur les conflits entre agriculture et industrie." },
      { name: 'wwf.org', bias: 'left', position: 28, coverageSummary: "Plaidoyer pour protéger les zones humides." },
      { name: 'insideclimatenews.org', bias: 'left', position: 32, coverageSummary: "Investigations sur les régions déjà rationnées." }
    ]
  },
  {
    id: 'logement-renovation-energetique',
    emoji: '🏠',
    category: 'Logement',
    headline: "Rénovation énergétique : la filière se structure dans l'urgence",
    summary: "Les États renforcent les incitations et imposent des audits pour accélérer la rénovation des passoires thermiques.",
    detailedSummary: "L'AIE chiffre les gains d'efficacité nécessaires tandis que l'ADEME lance un label unique pour les artisans. Les banques conditionnent certains prêts à un parcours de rénovation, alors que les médias économiques pointent la hausse des coûts des matériaux. Les plateformes de travaux cherchent à industrialiser les diagnostics carbone.",
    importance: "Décarboner le bâtiment réduit la facture énergétique et soutient l'emploi local.",
    sentiment: {
      positive: "Une filière organisée crée des emplois qualifiés et diminue les dépenses contraintes.",
      negative: "Les ménages modestes peinent à avancer les frais malgré les aides."
    },
    publishedAt: "IL Y A 2H",
    biasAnalysis: { left: 35, center: 45, right: 20 },
    sources: [
      { name: 'iea.org', bias: 'center', position: 52, coverageSummary: "Gains d'efficacité thermique attendus par région." },
      { name: 'ademe.fr', bias: 'left', position: 35, coverageSummary: "Nouveau référentiel de qualification des artisans." },
      { name: 'batiactu.com', bias: 'center', position: 55, coverageSummary: "Suivi du carnet de commande des entreprises du bâtiment." },
      { name: 'ft.com', bias: 'right', position: 65, coverageSummary: "Impact sur les foncières et les bailleurs institutionnels." },
      { name: 'euractiv.com', bias: 'center', position: 50, coverageSummary: "Négociations européennes sur les normes minimales." },
      { name: 'economist.com', bias: 'right', position: 70, coverageSummary: "Perspective macroéconomique sur l'allocation du capital." }
    ]
  },
  {
    id: 'inclusion-numerique-fracture',
    emoji: '🛰️',
    category: 'Société numérique',
    headline: "Inclusion numérique : la priorité des territoires périphériques",
    summary: "Les gouvernements déploient des pass numériques et des satellites bas débit pour connecter les zones rurales.",
    detailedSummary: "L'UIT publie un indice révisé de connectivité tandis que la Banque mondiale chiffre les gains de PIB liés à la 4G universelle. Des médias tech analysent l'efficacité des bus écoles itinérants et les ONG françaises réclament un droit à l'accompagnement humain. Les études d'opinion montrent une corrélation entre fracture numérique et abstention.",
    importance: "Sans accès fiable, les services publics digitaux excluent des millions de citoyens.",
    sentiment: {
      positive: "Les programmes multi-acteurs réduisent la fracture territoriale.",
      negative: "Les infrastructures seules ne suffisent pas sans médiation humaine."
    },
    publishedAt: "IL Y A 1H30",
    biasAnalysis: { left: 33, center: 47, right: 20 },
    sources: [
      { name: 'itu.int', bias: 'neutral', position: 45, coverageSummary: "Indice global de connectivité et cartographie des zones blanches." },
      { name: 'worldbank.org', bias: 'neutral', position: 55, coverageSummary: "Lien entre inclusion numérique et productivité." },
      { name: 'arstechnica.com', bias: 'center', position: 52, coverageSummary: "Analyse technique des constellations satellitaires low cost." },
      { name: 'numerama.com', bias: 'left', position: 35, coverageSummary: "Focus sur les médiateurs numériques et les dispositifs français." },
      { name: 'pewresearch.org', bias: 'neutral', position: 50, coverageSummary: "Sondages sur la confiance dans les services digitaux." },
      { name: 'wired.com', bias: 'center', position: 40, coverageSummary: "Retour d'expérience sur les programmes d'éducation aux médias." }
    ]
  }
];

const buildStrategicFallbackArticles = (): NewsArticle[] =>
  STRATEGIC_TOPIC_BLUEPRINTS.map((topic, index) => {
    const hydratedSources: Source[] = topic.sources.map((source) => ({
      ...source,
      logoUrl: createLogoUrl(source.name),
      url: createGoogleSearchUrl(topic.headline, source.name)
    }));

    const amplifiedSources = ensureSourceFloor(topic.headline, topic.summary, hydratedSources);
    const reliabilitySources = hydratedSources.length > 0 ? hydratedSources : amplifiedSources;

    const baseArticle: NewsArticle = {
      id: `strategic-${index}-${topic.id}`,
      headline: topic.headline,
      summary: topic.summary,
      detailedSummary: topic.detailedSummary,
      importance: topic.importance,
      emoji: topic.emoji,
      publishedAt: topic.publishedAt,
      imagePrompt: '',
      imageUrl: '',
      biasAnalysis: {
        left: topic.biasAnalysis.left,
        center: topic.biasAnalysis.center,
        right: topic.biasAnalysis.right,
        reliabilityScore: calculateReliability(reliabilitySources)
      },
      sources: amplifiedSources,
      sentiment: topic.sentiment,
      comments: [],
      category: topic.category
    };

    return {
      ...baseArticle,
      imagePrompt: buildTileBackgroundPrompt(baseArticle)
    };
  });

const fetchNewsArticles = async (query?: string, category?: string): Promise<NewsArticle[]> => {
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  let taskDescription = `Identifie les ${MIN_ARTICLES} actualités les plus importantes du moment via Google Search.`;
  if (query) {
    taskDescription = `Identifie les ${MIN_ARTICLES} actualités les plus pertinentes liées à la recherche : "${query}".`;
  } else if (category && category !== 'Général') {
    taskDescription = `Identifie les ${MIN_ARTICLES} actualités les plus importantes dans la catégorie : "${category}".`;
  }

  // --- SUPABASE CACHE CHECK ---
  const baseCacheKey = query
    ? `query:${query.toLowerCase().trim()}`
    : (category ? `category:${category.toLowerCase().trim()}` : 'general');
  const cacheKey = `${baseCacheKey}|${TILE_PIPELINE_VERSION}`;

  const localCachedArticles = getLocalCache(cacheKey);
  if (localCachedArticles) {
    console.log(`[PRISM] Local cache hit for key: ${cacheKey}`);
    return localCachedArticles;
  }

  await cleanupExpiredTiles();

  try {
    const apiKey = resolveApiKey();
    console.log("[PRISM] Checking API Key:", apiKey ? "Present" : "Missing");
    // Check for API Key inside the try block to allow fallback to mocks
    if (!apiKey) {
       throw new Error("API_KEY environment variable is not set. Switching to mock data.");
    }

    const supabaseCached = await fetchSupabaseCache(cacheKey, SUPABASE_CACHE_TTL_MS);
    if (supabaseCached) {
      saveLocalCache(cacheKey, supabaseCached);
      return supabaseCached;
    }

  const repositoryTiles = await fetchTilesFromRepository(cacheKey);
  if (repositoryTiles) {
    saveLocalCache(cacheKey, repositoryTiles);
    return repositoryTiles;
  }

  if (Date.now() - lastRateLimitHit < RATE_LIMIT_COOLDOWN_MS) {
    console.warn(`[PRISM] Gemini cooldown active for key: ${cacheKey}. Serving stale cache.`);
    const staleLocal = getLocalCache(cacheKey, { allowStale: true });
    if (staleLocal) {
      return staleLocal;
    }
    const staleSupabase = await fetchSupabaseCache(cacheKey, SUPABASE_CACHE_TTL_MS * 2);
    if (staleSupabase) {
      saveLocalCache(cacheKey, staleSupabase);
      return staleSupabase;
    }
  }

  console.log(`[PRISM] Cache NOT FOUND for key: ${cacheKey}, generating new content...`);

  const ai = new GoogleGenAI({ apiKey: resolveApiKey() || "" });

  const prompt = `
    Nous sommes le ${today} et il est ${now}.
    Tu es "PRISM", un moteur d'intelligence artificielle ultra-rapide d'analyse de l'actualité.
    
    TACHE : ${taskDescription}
    
    OBJECTIFS DE COUVERTURE :
    - Fournis ${MIN_ARTICLES} sujets distincts et classe-les par ordre décroissant du nombre de sources (le sujet avec le plus de sources arrive en premier).
    - Chaque sujet cite au minimum ${MIN_SOURCES_PER_ARTICLE} sources uniques et vise 8 à 12 références quand l'actualité le permet.
    - Jamais de doublon : si deux angles se chevauchent, fusionne-les en un seul sujet plus complet.
    
    RÈGLES IMPÉRATIVES POUR LES SOURCES :
    1. **QUANTITÉ** : Minimum ${MIN_SOURCES_PER_ARTICLE} sources distinctes par article. Cherche systématiquement à dépasser ce seuil pour maximiser la valeur éditoriale.
    2. **DIVERSITÉ** : Cherche activement des sources de GAUCHE, de DROITE et du CENTRE pour le même sujet.
    3. **PRÉCISION** : Utilise le nom de domaine racine (ex: 'lemonde.fr') pour le champ 'name'.
    4. **POSITIONNEMENT VÉRIFIÉ** : Base-toi sur des sources de référence reconnues pour déterminer le positionnement politique :
       - Pour médias internationaux : Media Bias/Fact Check, AllSides, Ad Fontes Media
       - Pour médias français : Décodex (Le Monde), études académiques
       - Le champ "position" (0-100) doit refléter ces classifications établies, pas une interprétation subjective.
       - Sois cohérent : Le Monde (~25-35), Le Figaro (~65-75), Reuters/AFP (~48-52), Fox News (~85-95), etc.
    
    RÈGLES VISUELLES :
    1. Associe à chaque article un **EMOJI UNIQUE** qui représente le sujet (ex: 🚜, 🗳️, 📉).
    2. Images: Prompt pour une **CARICATURE DE PRESSE SATIRIQUE** (Style encre, Plantu/Canard Enchaîné). Prompt en ANGLAIS.
    
    FORMAT JSON STRICT (Tableau d'objets) :
    [
      {
        "id": "unique_string",
        "headline": "Titre percutant (Max 10 mots)",
        "summary": "Résumé dense de l'info et des enjeux (Max 2 phrases)",
        "detailedSummary": "Analyse approfondie de l'événement, du contexte et des implications (3-4 phrases).",
        "importance": "Pourquoi c'est important ? Explique l'impact majeur de cette nouvelle (2 phrases).",
        "emoji": "🇪🇺",
        "publishedAt": "Temps relatif précis en Français basé sur la date réelle des articles (ex: 'IL Y A 2H', '14:30', 'HIER', 'EN DIRECT', 'IL Y A 15 MIN'). Si c'est un événement en cours, mettre 'EN DIRECT'.",
        "imagePrompt": "Political satire cartoon illustration of [subject]...",
        "imageUrl": "URL réelle ou vide",
        "biasAnalysis": { "left": 0, "center": 0, "right": 0, "reliabilityScore": 0 }, // Laisse reliabilityScore à 0, je le calculerai.
        "sources": [
          {
            "name": "lemonde.fr", 
            "bias": "left" | "center" | "right" | "neutral",
            "logoUrl": "",
            "position": number (0-100, 0=gauche, 100=droite),
            "coverageSummary": "Angle spécifique de ce média (1 phrase)",
            "url": "" // Laisse vide, je vais le générer pour éviter les 404
          },
          ... (Minimum 3 sources !)
        ],
        "sentiment": { "positive": "Argumentaire pour...", "negative": "Argumentaire contre..." }
      }
    ]
  `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.3,
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
      },
    });

    const textResponse = response.text;

    if (!textResponse) {
      throw new Error("PRISM n'a reçu aucune donnée (Blocage ou Timeout).");
    }

    let jsonString = textResponse;
    const jsonMatch = textResponse.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      jsonString = jsonMatch[1];
    } else {
      jsonString = jsonString.replace(/```/g, '').trim();
    }

    let articlesData;
    try {
      articlesData = JSON.parse(jsonString);
    } catch (e) {
      console.error("Erreur de parsing PRISM:", e);
      throw new Error("Erreur de formatage des données PRISM.");
    }

    if (!Array.isArray(articlesData)) {
      throw new Error("Structure de données invalide.");
    }

    const baseArticles: NewsArticle[] = articlesData.map((article: any, index: number) => {
      const safeId = article.id || `prism-${Date.now()}-${index}`;

      const rawSources = Array.isArray(article.sources) ? article.sources : [];
      const hydratedSources = rawSources.map((source: any) =>
        hydrateRawSource(
          source,
          article.headline || safeId,
          article.summary || article.detailedSummary || ''
        )
      );

      const amplifiedSources = ensureSourceFloor(
        article.headline || safeId,
        article.summary || article.detailedSummary || '',
        hydratedSources
      );

      const reliabilitySources = hydratedSources.length > 0 ? hydratedSources : amplifiedSources;

      // --- CALCUL DE L'INDICE DE CONFIANCE RÉEL ---
      const calculatedReliability = calculateReliability(reliabilitySources);

      // Mise à jour de l'analyse de biais avec le score calculé
      const updatedBiasAnalysis = {
        ...article.biasAnalysis,
        reliabilityScore: calculatedReliability
      };

      const initialComments: UserComment[] = [
        {
          id: `c1-${safeId}`,
          author: 'User_Alpha',
          text: article.sentiment?.positive || "Intéressant point de vue.",
          sentiment: 'positive',
          timestamp: Date.now() - 60000 * (index + 1),
          likes: Math.floor(Math.random() * 50) + 5
        },
        {
          id: `c2-${safeId}`,
          author: 'Sceptic_X',
          text: article.sentiment?.negative || "Je ne suis pas convaincu.",
          sentiment: 'negative',
          timestamp: Date.now() - 30000 * (index + 1),
          likes: Math.floor(Math.random() * 50) + 5
        }
      ];

      return {
        ...article,
        id: safeId,
        // Utilisation de la date générée par l'IA, ou fallback si manquant
        publishedAt: article.publishedAt || "RÉCENT",
        emoji: article.emoji || '📰',
        category: article.category || category || 'Général',
        sources: amplifiedSources,
        biasAnalysis: updatedBiasAnalysis,
        comments: initialComments,
        detailedSummary: article.detailedSummary || article.summary, // Fallback
        importance: article.importance || "Information clé pour comprendre l'actualité." // Fallback
      };
    });

    const articlesWithTilePrompts = baseArticles.map((article) => ({
      ...article,
      imagePrompt: buildTileBackgroundPrompt(article),
    }));

    const rankedArticles = sortArticlesBySourceRichness(articlesWithTilePrompts);
    const preparedArticles = ensureMinimumArticleCount(rankedArticles);

    // Génération des images avec Gemini 2.5 Flash Image (Nano Banana)
    try {
      const imagenService = getImagenService();
      const imagePromises = preparedArticles.map(async (article) => {
        try {
          const imageUrl = await imagenService.generateCaricature({
            prompt: article.imagePrompt,
            aspectRatio: "3:4",
            id: article.id
          });
          return { ...article, imageUrl };
        } catch (error) {
          console.error(`Échec génération image pour "${article.headline}":`, error);
          // Retourne l'article sans imageUrl, NewsCard utilisera Pollinations en fallback
          return article;
        }
      });

      // Attend toutes les générations en parallèle
      const articlesWithImages = await Promise.all(imagePromises);

      await persistTilesToRepository(articlesWithImages, cacheKey);

      // --- SAVE TO SUPABASE CACHE ---
      if (supabase) {
        try {
          const { error } = await supabase.from('news_cache').insert({
            search_key: cacheKey,
            articles: articlesWithImages
          });
          if (error) {
            console.warn("[PRISM] Failed to save to cache:", error);
          } else {
            console.log(`[PRISM] Saved to cache: ${cacheKey}`);
          }
        } catch (err) {
          console.warn("[PRISM] Failed to save to cache:", err);
        }
      }

      saveLocalCache(cacheKey, articlesWithImages);
      return articlesWithImages;
    } catch (error) {
      console.error("Erreur service Imagen, utilisation de Pollinations en fallback:", error);
      await persistTilesToRepository(preparedArticles, cacheKey);

      // --- SAVE TO SUPABASE CACHE (EVEN WITHOUT IMAGES) ---
      if (supabase) {
        try {
          const { error } = await supabase.from('news_cache').insert({
            search_key: cacheKey,
            articles: preparedArticles
          });
          if (error) {
            console.warn("[PRISM] Failed to save to cache (fallback):", error);
          }
        } catch (err) {
          console.warn("[PRISM] Failed to save to cache (fallback):", err);
        }
      }
      saveLocalCache(cacheKey, preparedArticles);
      return preparedArticles; // Retourne les articles sans images Gemini
    }

  } catch (error) {
    console.error("Erreur Service PRISM (Switch to Mock Data):", error);

    if (isRateLimitError(error)) {
      lastRateLimitHit = Date.now();
    }

    const supabaseFallback = await fetchSupabaseCache(cacheKey, SUPABASE_CACHE_TTL_MS * 2);
    if (supabaseFallback) {
      saveLocalCache(cacheKey, supabaseFallback);
      return supabaseFallback;
    }

    const repositoryFallback = await fetchTilesFromRepository(cacheKey);
    if (repositoryFallback) {
      saveLocalCache(cacheKey, repositoryFallback);
      return repositoryFallback;
    }

    const staleLocal = getLocalCache(cacheKey, { allowStale: true });
    if (staleLocal) {
      return staleLocal;
    }

    // MOCK DATA FALLBACK FOR DESIGN TESTING
    return buildStrategicFallbackArticles();
  }
};

export { fetchNewsArticles };