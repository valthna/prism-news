import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
// import FirecrawlApp from 'firecrawl'; // SDK retiré pour compatibilité navigateur
import { Bias, NewsArticle, Sentiment, Source, UserComment } from '../types';
import { getImagenService, SUPABASE_IMAGE_BUCKET, isImagenServiceEnabled } from './imagenService';
import { supabase, SUPABASE_URL } from './supabaseClient';
import { PRISM_PROMPTS } from './prompts';
import { progressTracker } from './progressTracker';
import { recordGeminiUsage } from './aiUsageLogger';

console.log("GeminiService Module Loaded");

const TILE_RETENTION_MS = 2 * 24 * 60 * 60 * 1000; // 2 jours
const MINIMUM_REUSABLE_TILES = 4;
const TILE_PIPELINE_VERSION = 'g3-image-preview-v1';
const bucketPublicBaseUrl = SUPABASE_URL
  ? `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_IMAGE_BUCKET}/`
  : null;

const SUPABASE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 heures
const LOCAL_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const RATE_LIMIT_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
const LOCAL_CACHE_PREFIX = 'prism-cache:';
const GEMINI_TIMEOUT_STANDARD_MS = 180 * 1000; // 3 min par défaut pour absorber les prompts enrichis
const GEMINI_TIMEOUT_THINKING_MS = 300 * 1000; // 5 min pour Gemini 3 (mode thinking HIGH)
const truthyEnvValues = new Set(['1', 'true', 'yes', 'on']);

const isNetworkFailure = (error: unknown): boolean => {
  if (!error) return false;
  if (error instanceof TypeError) return true;
  const extractMessage = (value: unknown): string | undefined => {
    if (!value) return undefined;
    if (typeof value === 'string') return value;
    if (value instanceof Error) return value.message;
    const maybeObject = value as Record<string, unknown>;
    return (typeof maybeObject?.message === 'string'
      ? maybeObject.message as string
      : typeof maybeObject?.details === 'string'
        ? maybeObject.details as string
        : undefined);
  };
  const message = extractMessage(error);
  return typeof message === 'string' && /failed to fetch|network\s?error|TypeError/i.test(message);
};

let supabaseDisabledReason: string | null = null;

const isSupabaseActive = (): boolean => Boolean(supabase) && !supabaseDisabledReason;

const disableSupabaseForSession = (context: string, error?: unknown) => {
  if (supabaseDisabledReason) {
    return;
  }
  supabaseDisabledReason = context;
  console.warn(`[PRISM] Supabase désactivé pour cette session (${context}).`);
  if (error) {
    console.warn(error);
  }
};

const resolveGeminiTimeout = (modelName: string): number =>
  modelName?.toLowerCase().includes('gemini-3')
    ? GEMINI_TIMEOUT_THINKING_MS
    : GEMINI_TIMEOUT_STANDARD_MS;

const MIN_ARTICLES = 10;
const MIN_SOURCES_PER_ARTICLE = 5;
const TARGET_SOURCES_PER_ARTICLE = 8;

type CuratedSourceProfile = {
  name: string;
  bias: Bias;
  position: number;
  defaultSummary: string;
};

/**
 * Positionnement des médias basé sur les évaluations de :
 * - Media Bias/Fact Check (MBFC)
 * - AllSides Media Bias Ratings
 * - Décodex (Le Monde)
 * - Ad Fontes Media
 * 
 * Échelle : 0 (extrême gauche) ← 50 (centre) → 100 (extrême droite)
 */
const curatedSourcePool: Record<Bias, CuratedSourceProfile[]> = {
  left: [
    { name: 'lemonde.fr', bias: 'left', position: 35, defaultSummary: 'Décryptage social de {topic} par Le Monde.' }, // Center-Left selon MBFC
    { name: 'theguardian.com', bias: 'left', position: 30, defaultSummary: 'Perspective société civile du Guardian sur {topic}.' }, // Left selon AllSides
    { name: 'mediapart.fr', bias: 'left', position: 25, defaultSummary: 'Contre-enquête indépendante de Mediapart autour de {topic}.' }, // Left selon Décodex
    { name: 'liberation.fr', bias: 'left', position: 28, defaultSummary: 'Analyse sociale et politique de Libération sur {topic}.' }, // Left-Center selon MBFC
    { name: 'humanite.fr', bias: 'left', position: 20, defaultSummary: 'Perspective ouvrière de L\'Humanité concernant {topic}.' }, // Left selon Décodex
    { name: 'vox.com', bias: 'left', position: 32, defaultSummary: 'Analyse progressiste de Vox appliquée à {topic}.' } // Left selon AllSides
  ],
  center: [
    { name: 'reuters.com', bias: 'center', position: 50, defaultSummary: 'Dépêche factuelle de Reuters consacrée à {topic}.' }, // Least Biased selon MBFC
    { name: 'apnews.com', bias: 'center', position: 50, defaultSummary: 'Synthèse Associated Press sur {topic}.' }, // Center selon AllSides
    { name: 'afp.com', bias: 'center', position: 50, defaultSummary: 'Fil d\'actualité AFP sur {topic}.' }, // Least Biased selon MBFC
    { name: 'bbc.com', bias: 'center', position: 48, defaultSummary: 'Couverture BBC de {topic}.' }, // Center selon AllSides
    { name: 'politico.eu', bias: 'center', position: 52, defaultSummary: 'Analyse politique européenne de Politico liée à {topic}.' }, // Center selon MBFC
    { name: 'axios.com', bias: 'center', position: 50, defaultSummary: 'Synthèse concise d\'Axios concernant {topic}.' } // Center selon AllSides
  ],
  right: [
    { name: 'lefigaro.fr', bias: 'right', position: 65, defaultSummary: 'Lecture conservatrice française proposée par Le Figaro sur {topic}.' }, // Right-Center selon MBFC
    { name: 'wsj.com', bias: 'right', position: 68, defaultSummary: 'Perspective pro-business du Wall Street Journal appliquée à {topic}.' }, // Center-Right selon AllSides
    { name: 'lesechos.fr', bias: 'right', position: 67, defaultSummary: 'Analyse économique libérale de Les Échos au sujet de {topic}.' }, // Right-Center économique
    { name: 'economist.com', bias: 'right', position: 63, defaultSummary: 'Analyse économique The Economist portant sur {topic}.' }, // Center-Right selon MBFC
    { name: 'foxnews.com', bias: 'right', position: 80, defaultSummary: 'Traitement éditorial conservateur de Fox News autour de {topic}.' }, // Right selon AllSides
    { name: 'nypost.com', bias: 'right', position: 72, defaultSummary: 'Couverture New York Post de {topic}.' } // Right selon AllSides
  ],
  neutral: [
    { name: 'afp.com', bias: 'neutral', position: 50, defaultSummary: 'Fil d\'actualité AFP sur {topic}.' },
    { name: 'who.int', bias: 'neutral', position: 50, defaultSummary: 'Données techniques multilatérales de l\'OMS liées à {topic}.' },
    { name: 'worldbank.org', bias: 'neutral', position: 50, defaultSummary: 'Lecture macro-économique de la Banque mondiale autour de {topic}.' },
    { name: 'oecd.org', bias: 'neutral', position: 50, defaultSummary: 'Étude comparative produite par l\'OCDE au sujet de {topic}.' },
    { name: 'un.org', bias: 'neutral', position: 50, defaultSummary: 'Position institutionnelle de l\'ONU sur {topic}.' }
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
  // Sources réelles marquées comme vérifiées
  const deduped = dedupeSources(
    initialSources.map((source) => {
      const bias = sanitizeBias(source.bias);
      return {
        ...source,
        bias,
        position: typeof source.position === 'number' ? source.position : defaultPositionByBias[bias],
        coverageSummary: enrichCoverageSummary(source.coverageSummary, source.name, headline, summary),
        logoUrl: source.logoUrl || createLogoUrl(source.name),
        url: source.url || createGoogleSearchUrl(headline, source.name),
        isVerified: true // Source réelle qui a couvert le sujet
      };
    })
  );

  const usedNames = new Set(deduped.map((source) => normalizeSourceName(source.name)));
  const baselineTarget = deduped.length >= TARGET_SOURCES_PER_ARTICLE ? deduped.length : TARGET_SOURCES_PER_ARTICLE;
  const target = Math.max(MIN_SOURCES_PER_ARTICLE, baselineTarget);

  const biasQueue = buildBiasPriorityQueue(deduped);
  let attempts = 0;

  // Sources amplifiées (génériques) marquées comme non vérifiées
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
        url: createGoogleSearchUrl(headline, candidate.name),
        isVerified: false // Source amplifiée - n'a pas forcément couvert ce sujet
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
          url: createGoogleSearchUrl(headline, candidate.name),
          isVerified: false // Source amplifiée
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
  
  // Recherche de profil connu pour forcer la position et le biais corrects
  let knownProfile: CuratedSourceProfile | undefined;
  const normalizedRawName = normalizeSourceName(rawName);
  
  for (const biasKey of Object.keys(curatedSourcePool) as Bias[]) {
      const found = curatedSourcePool[biasKey].find(p => {
          const pName = normalizeSourceName(p.name);
          return pName === normalizedRawName || normalizedRawName.includes(pName) || pName.includes(normalizedRawName);
      });
      if (found) {
          knownProfile = found;
          break;
      }
  }

  const bias = knownProfile ? knownProfile.bias : sanitizeBias(rawSource?.bias);
  const position = knownProfile ? knownProfile.position : (typeof rawSource?.position === 'number' ? rawSource.position : defaultPositionByBias[bias]);
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
  // On retourne les articles tels quels - pas de padding avec des mock data
  // Si on n'a pas assez d'articles, on accepte ce qu'on a
  if (articles.length < MIN_ARTICLES) {
    console.log(`[PRISM] Only ${articles.length} articles available (minimum: ${MIN_ARTICLES})`);
  }
  return sortArticlesBySourceRichness(articles);
};

type LocalCachePayload = {
  timestamp: number;
  articles: NewsArticle[];
};

let lastRateLimitHit = 0;

const parseBooleanFlag = (value?: string | boolean | null): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return truthyEnvValues.has(value.trim().toLowerCase());
  }
  return false;
};

const detectMockMode = (): boolean => {
  try {
    const globalFlag = (globalThis as any)?.__PRISM_FORCE_MOCK__;
    if (parseBooleanFlag(globalFlag)) {
      return true;
    }
  } catch {
    // ignore
  }
  if (typeof process !== 'undefined') {
    if (parseBooleanFlag(process.env?.FORCE_MOCK_DATA)) {
      return true;
    }
    if (parseBooleanFlag(process.env?.USE_MOCK_DATA)) {
      return true;
    }
  }
  if (typeof import.meta !== 'undefined' && (import.meta as any)?.env) {
    const browserEnv = (import.meta as any).env as Record<string, string | boolean>;
    if (parseBooleanFlag(browserEnv.VITE_FORCE_MOCK_DATA)) {
      return true;
    }
    if (parseBooleanFlag(browserEnv.VITE_USE_MOCK_DATA)) {
      return true;
    }
  }
  return false;
};

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

const FORCE_MOCK_DATA = detectMockMode();

const resolveFirecrawlKey = (): string | undefined => {
  const isBrowser = typeof window !== 'undefined';
  if (!isBrowser && typeof process !== 'undefined' && process.env?.FIRECRAWL_API_KEY) {
    return process.env.FIRECRAWL_API_KEY;
  }
  if (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.VITE_FIRECRAWL_API_KEY) {
    return (import.meta as any).env.VITE_FIRECRAWL_API_KEY as string;
  }
  return undefined;
};

const performFirecrawlDiscovery = async (query: string | undefined, category: string | undefined): Promise<string | null> => {
  const apiKey = resolveFirecrawlKey();
  if (!apiKey) {
    console.warn("[PRISM ⚠️] No Firecrawl API Key found.");
    return null;
  }

  progressTracker.emit({
    phase: 'firecrawl_start',
    progress: 5,
    message: 'Scan Sources Mondiales',
    detail: 'Lancement de la collecte parallèle...'
  });

  console.log("[PRISM 🕷️] Firecrawl active - Engaging 'Massive Parallel Harvest'...");

  const baseQuery = query || '';
  const context = category && category !== 'Général' ? `in ${category}` : 'world news';

  // 5 Vecteurs pour atteindre ~100 sources brutes
  const searchVectors = [
    { name: "HEADLINES", q: query ? `${baseQuery} news facts` : `breaking news headlines ${context} today`, emoji: "📰" },
    { name: "POLITICS", q: query ? `${baseQuery} political analysis` : `political analysis opinion editorials ${context}`, emoji: "🏛️" },
    { name: "ECONOMY", q: query ? `${baseQuery} market trends` : `financial markets business economy ${context}`, emoji: "💹" },
    { name: "TECH_SCI", q: query ? `${baseQuery} technology science` : `technology science innovation ${context}`, emoji: "🔬" },
    { name: "SOCIETY", q: query ? `${baseQuery} social issues` : `social issues environment culture ${context}`, emoji: "🌍" }
  ];

  try {
    const executeVectorSearch = async (vectorName: string, searchQuery: string, vectorEmoji: string, vectorIndex: number) => {
      const progressBase = 10 + (vectorIndex * 10); // 10, 20, 30, 40, 50

      progressTracker.emit({
        phase: 'firecrawl_vector',
        progress: progressBase,
        message: 'Scan Sources Mondiales',
        detail: `${vectorEmoji} Vecteur ${vectorName} en cours...`,
        metadata: { vectorName }
      });

      console.log(`[PRISM 🕷️] Vector '${vectorName}' launching...`);
      const startV = Date.now();
      
      // Ajout d'un timeout court (15s) pour éviter de bloquer l'interface
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const response = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: searchQuery,
            limit: 20,
            scrapeOptions: {
              formats: ['markdown'],
              onlyMainContent: true
            }
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[PRISM 🕷️] Vector '${vectorName}' API Error: ${response.status}`);
          throw new Error(`API responded with ${response.status}: ${errorText}`);
        }

        const json = await response.json();
        if (!json.success) {
          throw new Error(json.error || 'Unknown Firecrawl error');
        }

        const foundCount = json.data?.length || 0;
        console.log(`[PRISM 🕷️] Vector '${vectorName}' completed in ${(Date.now() - startV) / 1000}s. Found ${foundCount} items.`);

        return { vector: vectorName, data: json.data || [] };
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
           console.warn(`[PRISM ⚠️] Vector ${vectorName} TIMED OUT after 15s`);
        } else {
           console.warn(`[PRISM ⚠️] Vector ${vectorName} failed:`, err);
        }
        return { vector: vectorName, data: [] };
      }
    };

    // Exécution PARALLÈLE
    const vectorPromises = searchVectors.map(async (vector, index) => {
      try {
        return await executeVectorSearch(vector.name, vector.q, vector.emoji, index);
      } catch (err) {
        console.warn(`[PRISM ⚠️] Vector ${vector.name} failed:`, err);
        return { vector: vector.name, data: [] };
      }
    });

    const results = await Promise.all(vectorPromises);

    let totalSources = 0;
    const consolidatedContext = results.map(r => {
      if (r.data.length === 0) return '';
      totalSources += r.data.length;

      const vectorContent = r.data.map((item: any, idx: number) => `
[SOURCE_REF: ${r.vector}_${idx + 1}]
TITLE: ${item.title}
URL: ${item.url}
SOURCE: ${new URL(item.url).hostname.replace('www.', '')}
CONTENT_SNIPPET:
${item.markdown ? item.markdown.slice(0, 1200).replace(/\n+/g, ' ') : 'No content.'}
`).join('\n'); // Snippets réduits à 1200 chars pour faire rentrer 100 sources dans le contexte

      return `### SECTEUR ${r.vector} ###\n${vectorContent}`;
    }).join('\n\n');

    if (totalSources === 0) {
      console.warn("[PRISM ⚠️] Firecrawl Harvest returned 0 results.");
      return null;
    }

    progressTracker.emit({
      phase: 'firecrawl_complete',
      progress: 60,
      message: 'Agrégation Données',
      detail: `${totalSources} sources collectées et consolidées`,
      metadata: { sourcesFound: totalSources }
    });

    console.log(`[PRISM 📦] Harvest Complete. Ingested ${totalSources} raw sources.`);
    return consolidatedContext;

  } catch (error) {
    console.warn("[PRISM 💥] Firecrawl Critical Failure:", error);
    return null;
  }
};

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  onTimeout?: () => void
): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      onTimeout?.();
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
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
  // Strip base64 images to prevent LocalStorage quota exceeded errors
  const safeArticles = articles.map(a => {
    if (a.imageUrl && a.imageUrl.startsWith('data:')) {
        // On ne met pas en cache le base64 lourd, on le perd au refresh mais on sauve l'app
        return { ...a, imageUrl: '' };
    }
    return a;
  });

  const payload: LocalCachePayload = {
    timestamp: Date.now(),
    articles: safeArticles,
  };
  try {
    storage.setItem(`${LOCAL_CACHE_PREFIX}${cacheKey}`, JSON.stringify(payload));
  } catch (error) {
    console.warn(`[PRISM] Failed to save local cache for ${cacheKey}:`, error);
  }
};

const fetchSupabaseCache = async (cacheKey: string, maxAgeMs: number): Promise<NewsArticle[] | null> => {
  if (!isSupabaseActive()) {
    return null;
  }

  const client = supabase;
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('news_cache')
      .select('articles, created_at')
      .eq('search_key', cacheKey)
      .gt('created_at', new Date(Date.now() - maxAgeMs).toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.warn("[PRISM] Cache check failed:", error);
      if (isNetworkFailure(error)) {
        disableSupabaseForSession('cache-read', error);
      }
      return null;
    }

    if (data && data.length > 0) {
      console.log(`[PRISM] Supabase cache hit for key: ${cacheKey}`);
      return data[0].articles as NewsArticle[];
    }
  } catch (err) {
    console.warn("[PRISM] Cache check failed:", err);
    if (isNetworkFailure(err)) {
      disableSupabaseForSession('cache-read', err);
    }
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
  if (articles.length === 0) {
    throw new Error("Aucun article à persister.");
  }
  const client = supabase;
  if (!client || !isSupabaseActive()) {
    throw new Error("Supabase indisponible pour persister les tuiles.");
  }

  // Batching pour éviter le timeout sur payload trop lourd (Base64)
  const BATCH_SIZE = 2;
  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);
    const payload = batch.map((article) => ({
      article_id: article.id,
      search_key: cacheKey,
      article,
      image_storage_path: getStoragePathFromUrl(article.imageUrl),
    }));
    
    const { error } = await client
      .from('news_tiles')
      .upsert(payload, { onConflict: 'article_id' });

    if (error) {
      if (isNetworkFailure(error)) {
        disableSupabaseForSession('news_tiles upsert', error);
      }
      throw new Error(`[PRISM] Échec upsert news_tiles (batch ${i}): ${error.message || error}`);
    }
  }

  console.log(`[PRISM] Persisted ${articles.length} tiles for key: ${cacheKey}`);
};

const fetchTilesFromRepository = async (cacheKey: string): Promise<NewsArticle[] | null> => {
  if (!isSupabaseActive()) {
    return null;
  }
  const client = supabase;
  if (!client) return null;

  try {
    const cutoffIso = new Date(Date.now() - TILE_RETENTION_MS).toISOString();
    const { data, error } = await client
      .from('news_tiles')
      .select('article')
      .eq('search_key', cacheKey)
      .gt('created_at', cutoffIso)
      .order('created_at', { ascending: false })
      .limit(MINIMUM_REUSABLE_TILES);

    if (error) {
      console.warn("[PRISM] Failed to fetch tiles from repository:", error);
      if (isNetworkFailure(error)) {
        disableSupabaseForSession('tiles-read', error);
      }
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
    if (isNetworkFailure(error)) {
      disableSupabaseForSession('tiles-read', error);
    }
    return null;
  }
};

/**
 * Parse une chaîne "Il y a X min/H/jour" en minutes pour le tri
 */
const parsePublishedAtToMinutes = (publishedAt?: string): number => {
  if (!publishedAt) return Infinity; // Articles sans date en dernier
  
  const text = publishedAt.toLowerCase().trim();
  
  // En direct = le plus récent
  if (text.includes('direct') || text.includes('live')) return 0;
  
  // Patterns: "il y a X min", "il y a XH", "il y a X jour(s)", "il y a X heure(s)"
  const minuteMatch = text.match(/(\d+)\s*min/);
  if (minuteMatch) return parseInt(minuteMatch[1], 10);
  
  const hourMatch = text.match(/(\d+)\s*h/);
  if (hourMatch) return parseInt(hourMatch[1], 10) * 60;
  
  const dayMatch = text.match(/(\d+)\s*jour/);
  if (dayMatch) return parseInt(dayMatch[1], 10) * 60 * 24;
  
  // "Récent" ou autres = assez récent
  if (text.includes('récent')) return 30;
  
  return Infinity; // Inconnu = en dernier
};

/**
 * Trie les articles du plus récent au plus ancien basé sur publishedAt
 */
const sortArticlesByRecency = (articles: NewsArticle[]): NewsArticle[] => {
  return [...articles].sort((a, b) => {
    const aMinutes = parsePublishedAtToMinutes(a.publishedAt);
    const bMinutes = parsePublishedAtToMinutes(b.publishedAt);
    return aMinutes - bMinutes; // Plus petit = plus récent = en premier
  });
};

/**
 * Fallback: Récupère les derniers articles depuis la base de données
 * sans filtrer par search_key - utilisé quand tout le reste échoue
 */
const fetchLatestArticlesFromDatabase = async (limit: number = MIN_ARTICLES): Promise<NewsArticle[] | null> => {
  if (!isSupabaseActive()) {
    console.log("[PRISM] Supabase inactive, cannot fetch latest articles");
    return null;
  }
  const client = supabase;
  if (!client) return null;

  try {
    console.log("[PRISM 🔄] Fetching latest articles from database as fallback...");
    const { data, error } = await client
      .from('news_tiles')
      .select('article')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("[PRISM] Failed to fetch latest articles:", error);
      if (isNetworkFailure(error)) {
        disableSupabaseForSession('fallback-read', error);
      }
      return null;
    }

    if (!data || data.length === 0) {
      console.log("[PRISM] No articles found in database");
      return null;
    }

    const articles = data.map((row) => row.article as NewsArticle);
    // Tri par fraîcheur (publishedAt) - du plus récent au plus ancien
    const sortedArticles = sortArticlesByRecency(articles);
    console.log(`[PRISM ✅] Fallback: Retrieved ${sortedArticles.length} latest articles from database (sorted by recency)`);
    return sortedArticles;
  } catch (error) {
    console.warn("[PRISM] Unexpected error fetching latest articles:", error);
    if (isNetworkFailure(error)) {
      disableSupabaseForSession('fallback-read', error);
    }
    return null;
  }
};

const cleanupExpiredTiles = async () => {
  if (!isSupabaseActive()) {
    return;
  }
  const client = supabase;
  if (!client) return;

  try {
    const cutoffIso = new Date(Date.now() - TILE_RETENTION_MS).toISOString();
    const { data, error } = await client
      .from('news_tiles')
      .select('article_id, image_storage_path, article')
      .lt('created_at', cutoffIso);

    if (error) {
      console.warn("[PRISM] Failed to fetch stale tiles:", error);
      if (isNetworkFailure(error)) {
        disableSupabaseForSession('cleanup-fetch', error);
      }
      return;
    }

    if (!data || data.length === 0) {
      return;
    }

    const articleIds = data.map((row) => row.article_id).filter(Boolean);

    if (articleIds.length > 0) {
      const { error: deleteError } = await client
        .from('news_tiles')
        .delete()
        .in('article_id', articleIds);
      if (deleteError) {
        console.warn("[PRISM] Failed to delete stale tiles:", deleteError);
        if (isNetworkFailure(deleteError)) {
          disableSupabaseForSession('cleanup-delete', deleteError);
          return;
        }
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
      const { error: storageError } = await client
        .storage
        .from(SUPABASE_IMAGE_BUCKET)
        .remove(uniquePaths);
      if (storageError) {
        console.warn("[PRISM] Failed to cleanup storage objects:", storageError);
        if (isNetworkFailure(storageError)) {
          disableSupabaseForSession('storage-cleanup', storageError);
        }
      }
    }
  } catch (error) {
    console.warn("[PRISM] Unexpected error during tile cleanup:", error);
    if (isNetworkFailure(error)) {
      disableSupabaseForSession('cleanup', error);
    }
  }
};

const collapseWhitespace = (value?: string): string =>
  value ? value.replace(/\s+/g, ' ').trim() : '';

const cleanCitations = (text?: string): string => {
  if (!text) return '';
  return text.replace(/\[cite:\s*[^\]]+\]/gi, '').trim();
};

const buildTileBackgroundPrompt = (article: NewsArticle): string => {
  const subjectFocus =
    collapseWhitespace(article.imagePrompt) ||
    collapseWhitespace(article.headline) ||
    "current news event";
  const contextSummary = collapseWhitespace(
    `${article.detailedSummary || article.summary || ''} ${article.importance || ''}`
  );
  const moodCue = article.emoji ? `Mood cue suggested by ${article.emoji}.` : '';

  return PRISM_PROMPTS.IMAGE_GENERATION.buildPrompt(subjectFocus, contextSummary, moodCue);
};

/**
 * Algorithme de calcul de fiabilité QUANTIFIÉ
 * 
 * Le score est maintenant strictement mathématique, basé sur des métriques observables.
 * Il n'est plus "généré" par l'IA mais calculé à postériori.
 * 
 * Score Max : 100
 * 
 * Piliers :
 * 1. Volume de sources (30pts) : Plus on a de sources, plus c'est fiable.
 * 2. Diversité politique (30pts) : Présence de sources de bords opposés.
 * 3. Qualité des sources (40pts) : Bonus pour les agences de presse (AFP, Reuters) et médias de référence.
 */
const calculateReliability = (sources: Source[]): number => {
  let score = 0;

  // --- 1. VOLUME (30 points) ---
  // 5 sources = 15 pts (le minimum)
  // 10 sources = 30 pts (le plafond)
  const count = sources.length;
  const volumeScore = Math.min(30, Math.max(0, (count - 2) * 4)); 
  score += volumeScore;

  // --- 2. DIVERSITÉ (30 points) ---
  const biasSet = new Set(sources.map(s => s.bias));
  const hasLeft = biasSet.has('left');
  const hasRight = biasSet.has('right');
  const hasCenter = biasSet.has('center') || biasSet.has('neutral');

  if (hasLeft && hasRight && hasCenter) {
    score += 30; // Full spectrum
  } else if ((hasLeft && hasRight) || (hasLeft && hasCenter) || (hasRight && hasCenter)) {
    score += 20; // Partial balance
  } else {
    score += 5; // Echo chamber penalty
  }

  // --- 3. QUALITÉ & RÉPUTATION (40 points) ---
  // On scanne les noms de domaine pour des mots-clés de haute confiance
  const trustKeywords = ['reuters', 'afp', 'apnews', 'bbc', 'ft.com', 'lemonde', 'nytimes', 'wsj', 'nature.com', 'science.org'];
  const mediumTrustKeywords = ['cnn', 'fox', 'liberation', 'figaro', 'guardian', 'politico', 'lesechos'];

  let qualityScore = 0;
  let matches = 0;

  sources.forEach(source => {
    const name = source.name.toLowerCase();
    if (trustKeywords.some(k => name.includes(k))) {
        qualityScore += 8; // 5 sources top tier = 40 pts
        matches++;
    } else if (mediumTrustKeywords.some(k => name.includes(k))) {
        qualityScore += 4;
        matches++;
    } else {
        qualityScore += 1; // Source inconnue = 1pt
    }
  });

  score += Math.min(40, qualityScore);

  // Normalisation finale (pas de 100% absolu par principe de précaution)
  return Math.min(98, Math.max(15, Math.round(score)));
};

// Mock data supprimés - fallback vers la base de données
// Voir fetchLatestArticlesFromDatabase() pour le fallback

const _MOCK_DATA_REMOVED = true; // Marker pour éviter les erreurs de référence

/*
 * MOCK DATA SUPPRIMÉES
 * Le fallback utilise maintenant fetchLatestArticlesFromDatabase()
 * 
 * Ancien contenu (~300 lignes de données statiques) supprimé.
 * Catégories couvertes: Transition énergétique, IA, Santé, Agriculture, 
 * Cybersécurité, Mobilités, Finance durable, Climat, Logement, Numérique
 */

// Placeholder pour éviter les erreurs de parsing lors de la suppression
const __MOCK_DATA_PLACEHOLDER__ = "REMOVED";

/*
MOCK_START__
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
    detailedSummary: "L'UIT publie un indice révisé de connectivité tandis que la Banque mondiale chiffre les gains de PIB liés à la 4G universelle. Des médias tech analysent l'efficacité des bus écoles itinérants et les ONG françaises réclament un droit à la déconnexion humain. Les études d'opinion montrent une corrélation entre fracture numérique et abstention.",
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
        consensusScore: calculateReliability(reliabilitySources)
      },
      sources: amplifiedSources,
      sentiment: topic.sentiment,
      comments: [],
      category: topic.category
    };

    return {
      ...baseArticle,
      imagePrompt: buildTileBackgroundPrompt(baseArticle)
__MOCK_END */

const fetchNewsArticles = async (query?: string, category?: string, forceRefresh = false): Promise<NewsArticle[]> => {
  console.log('[PRISM 🚀] fetchNewsArticles CALLED', { query, category });
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

  if (FORCE_MOCK_DATA) {
    console.warn("[PRISM] MODE MOCK activé (FORCE_MOCK_DATA). Tentative de récupération depuis la base de données...");
    const dbFallback = await fetchLatestArticlesFromDatabase();
    if (dbFallback && dbFallback.length > 0) {
      return dbFallback;
    }
    console.warn("[PRISM] Aucun article en base - retour tableau vide");
    return [];
  }

  const localCachedArticles = getLocalCache(cacheKey);
  if (!forceRefresh && localCachedArticles) {
    console.log(`[PRISM] Local cache hit for key: ${cacheKey}`);
    return localCachedArticles;
  }

  // await cleanupExpiredTiles();
  // Exécution en arrière-plan pour ne pas bloquer le chargement initial
  cleanupExpiredTiles().catch(e => console.warn("[PRISM] Background cleanup warning:", e));

  try {
    const apiKey = resolveApiKey();
    console.log("[PRISM] Checking API Key:", apiKey ? "Present" : "Missing");
    // Check for API Key inside the try block to allow fallback to mocks
    if (!apiKey) {
      throw new Error("API_KEY environment variable is not set. Switching to mock data.");
    }

    // Timeout court pour le cache Supabase (5s) afin d'éviter le blocage
    let supabaseCached = null;
    if (!forceRefresh) {
        supabaseCached = await withTimeout(
          fetchSupabaseCache(cacheKey, SUPABASE_CACHE_TTL_MS), 
          5000, 
          () => console.warn("[PRISM] Supabase cache check timed out")
        ).catch(err => {
          console.warn("[PRISM] Skipping Supabase cache due to error/timeout:", err);
          return null;
        });
    }

    if (supabaseCached) {
      saveLocalCache(cacheKey, supabaseCached);
      return supabaseCached;
    }

    let repositoryTiles = null;
    if (!forceRefresh) {
        repositoryTiles = await withTimeout(
          fetchTilesFromRepository(cacheKey),
          5000, 
          () => console.warn("[PRISM] Repository check timed out")
        ).catch(err => {
          console.warn("[PRISM] Skipping repository tiles due to error/timeout:", err);
          return null;
        });
    }

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

    // --- DEEP HARVEST UNIQUEMENT SUR REFRESH MANUEL ---
    // Si pas de forceRefresh, on retourne les derniers articles de la BDD au lieu de lancer le Deep Harvest
    if (!forceRefresh) {
      console.log(`[PRISM 🔄] Cache miss but no forceRefresh - fetching latest articles from database...`);
      const latestFromDb = await fetchLatestArticlesFromDatabase();
      if (latestFromDb && latestFromDb.length > 0) {
        console.log(`[PRISM ✅] Returning ${latestFromDb.length} cached articles from database (no Deep Harvest)`);
        saveLocalCache(cacheKey, latestFromDb);
        return latestFromDb;
      }
      // Si vraiment rien en base, on retourne un tableau vide
      console.warn(`[PRISM ⚠️] No articles in database and no forceRefresh - returning empty array`);
      return [];
    }

    console.log(`[PRISM 🧠] Cache NOT FOUND for key: ${cacheKey}. forceRefresh=true → Engaging Deep Harvest protocol...`);

    progressTracker.emit({
      phase: 'init',
      progress: 2,
      message: 'Initialisation Système',
      detail: 'Préparation du protocole Deep Harvest...'
    });

    const firecrawlContext = await performFirecrawlDiscovery(query, category);
    const ai = new GoogleGenAI({ apiKey: resolveApiKey() || "" });

    let prompt = "";
    let toolsConfig = {};

    if (firecrawlContext) {
      console.log(`[PRISM 🧠] Context Injection: ${firecrawlContext.length} characters of raw verified data.`);
      prompt = `
    ${PRISM_PROMPTS.NEWS_ANALYSIS.SYSTEM_INSTRUCTIONS(today, now)}
    
    ${PRISM_PROMPTS.NEWS_ANALYSIS.FIRECRAWL_CONTEXT_PREFIX(firecrawlContext)}
    
    ${PRISM_PROMPTS.NEWS_ANALYSIS.TASK_SYNTHESIS_INSTRUCTIONS}
    `;
      toolsConfig = { tools: [{ googleSearch: {} }] };
    } else {
      console.log("[PRISM ⚠️] Firecrawl inactive or failed. Fallback to Gemini Google Search Tool.");
      toolsConfig = { tools: [{ googleSearch: {} }] };
      prompt = `
    ${PRISM_PROMPTS.NEWS_ANALYSIS.SYSTEM_INSTRUCTIONS(today, now)}
    
    ${PRISM_PROMPTS.NEWS_ANALYSIS.TASK_FALLBACK_INSTRUCTIONS(taskDescription)}
    `;
    }

    prompt += PRISM_PROMPTS.NEWS_ANALYSIS.OUTPUT_FORMAT(MIN_ARTICLES);

    prompt += `
  IMPORTANT:
  0. LANGUAGE: Generate ALL content in FRENCH (français). Headlines, summaries, and analyses MUST be in French.
  1. Return ONLY the JSON array. NO introduction, NO markdown, NO ending comments.
  2. ESCAPE all control characters. Newlines in strings must be written as "\\n", not actual line breaks.
  3. Output MINIFIED JSON (single line) to avoid formatting errors.
  `;

    const executeGeminiCall = async (): Promise<{ result: any; model: string }> => {
      const modelsToTry = [
        "gemini-3-pro-preview",        // cf. https://ai.google.dev/gemini-api/docs/models (nov. 2025)
        "gemini-2.5-pro",
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-2.0-flash"
      ];

      for (const modelName of modelsToTry) {
        console.log(`[PRISM 🤖] Attempting generation with model: ${modelName}...`);

        progressTracker.emit({
          phase: 'gemini_generating',
          progress: 65 + (modelsToTry.indexOf(modelName) * 5),
          message: 'Détection Biais',
          detail: `IA Gemini (${modelName}) analyse les sources...`,
          metadata: { currentModel: modelName }
        });
        try {
          const startTime = Date.now();
          
          // Configuration spécifique pour Gemini 3 et le raisonnement
          const isThinkingModel = modelName.includes("gemini-3");
          const modelTimeoutMs = resolveGeminiTimeout(modelName);
          const generationConfig: any = {
            ...toolsConfig,
            temperature: 0.3,
            safetySettings: [
              { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ],
          };

          if (isThinkingModel) {
            // Selon la doc Google, un niveau MEDIUM accélère la latence sans perdre la fiabilité
            generationConfig.thinkingConfig = {
                thinkingLevel: "MEDIUM"
            };
          }

          const result = await withTimeout(
            ai.models.generateContent({
              model: modelName,
              contents: prompt,
              config: generationConfig,
            }),
            modelTimeoutMs,
            () => console.warn(`[PRISM ⏳] Timeout warning for ${modelName} après ${modelTimeoutMs / 1000}s`)
          );

          console.log(`[PRISM 🤖] Success with ${modelName} in ${(Date.now() - startTime) / 1000}s`);

          progressTracker.emit({
            phase: 'gemini_parsing',
            progress: 82,
            message: 'Génération Synthèse',
            detail: 'Analyse terminée, traitement des données...',
            metadata: { currentModel: modelName }
          });
          return { result, model: modelName }; // Succès, on retourne le résultat
        } catch (error: any) {
          const isModelError = error.message?.includes('404') || error.message?.includes('not found') || error.status === 404;
          if (isModelError) {
            console.warn(`[PRISM ⚠️] Model ${modelName} not found. Trying next...`);
            continue;
          }
          // Si c'est une 429 (Quota), on essaie aussi le modèle suivant (souvent des quotas séparés)
          if (error.message?.includes('429') || error.status === 429) {
            console.warn(`[PRISM ⚠️] Model ${modelName} Quota Exceeded. Trying next...`);
            continue;
          }
          throw error;
        }
      }
      throw new Error("All Gemini models failed to respond.");
    };

    // Implémentation d'un mécanisme de Retry (3 tentatives)
    let response: any;
    let modelUsed: string | null = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        if (attempts > 1) console.log(`[PRISM] Tentative API ${attempts}/${maxAttempts}...`);
        const { result, model } = await executeGeminiCall();
        response = result;
        modelUsed = model;
        break; // Succès, on sort de la boucle
      } catch (err) {
        console.warn(`[PRISM] Échec tentative ${attempts}:`, err);
        if (attempts === maxAttempts) throw err; // Si c'était la dernière, on remonte l'erreur
        // Petit backoff avant de réessayer (1s, 2s...)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

    if (!response || !modelUsed) {
      throw new Error("Gemini n'a retourné aucune réponse exploitable.");
    }

    Promise.resolve(recordGeminiUsage({
      model: modelUsed,
      operation: 'news_deep_harvest',
      usageMetadata: (response as any)?.usageMetadata,
      metadata: {
        cacheKey,
        query: query ?? null,
        category: category ?? null,
        forceRefresh,
        attemptCount: attempts,
        firecrawlContextPresent: Boolean(firecrawlContext),
        firecrawlContextLength: firecrawlContext?.length ?? null,
      },
    })).catch((err) => console.warn('[PRISM] AI usage logging (Gemini) failed:', err));

    const textResponse = typeof response.text === 'function' ? response.text() : response.text;

    if (!textResponse) {
      console.error("[PRISM 💥] Empty response from Gemini. Debug Info:", JSON.stringify(response, null, 2));
      throw new Error("PRISM n'a reçu aucune donnée (Blocage ou Timeout).");
    }

    // Nettoyage agressif du JSON (Markdown, commentaires, etc.)
    let jsonString = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();

    // Parfois le modèle ajoute du texte avant/après le tableau JSON
    const firstBracket = jsonString.indexOf('[');
    const lastBracket = jsonString.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1) {
      jsonString = jsonString.substring(firstBracket, lastBracket + 1);
    }

    let articlesData;
    try {
      articlesData = JSON.parse(jsonString);
    } catch (e) {
      // TENTATIVE DE SAUVETAGE : Si le JSON a des sauts de ligne non échappés dans les strings
      try {
        console.warn("Parsing JSON échoué, tentative de nettoyage des sauts de ligne...");
        // Remplacement des caractères de contrôle invalides dans le JSON (Newlines, Tabs non échappés)
        // On remplace tout saut de ligne litéral par \n car on a demandé un JSON minifié (une seule ligne)
        const sanitized = jsonString.replace(/[\u0000-\u001F]+/g, (match) => {
            if (match === '\n') return '\\n';
            if (match === '\r') return '';
            if (match === '\t') return '\\t';
            return '';
        });
        articlesData = JSON.parse(sanitized);
      } catch (e2) {
        console.error("Erreur de parsing PRISM:", e);
        console.log("Raw Text reçue:", textResponse.substring(0, 500) + "...");
        throw new Error("Erreur de formatage des données PRISM.");
      }
    }

    if (!Array.isArray(articlesData)) {
      throw new Error("Structure de données invalide.");
    }

    const baseArticles: NewsArticle[] = articlesData.map((article: any, index: number) => {
      const safeId = article.id || `prism-${Date.now()}-${index}`;

      const rawSources = Array.isArray(article.sources) ? article.sources : [];
      const summary = cleanCitations(article.summary || article.detailedSummary || '');
      const detailedSummary = cleanCitations(article.detailedSummary || article.summary || '');

      const hydratedSources = rawSources.map((source: any) =>
        hydrateRawSource(
          source,
          article.headline || safeId,
          summary
        )
      );

      const amplifiedSources = ensureSourceFloor(
        article.headline || safeId,
        summary,
        hydratedSources
      );

      const reliabilitySources = hydratedSources.length > 0 ? hydratedSources : amplifiedSources;

      // --- CALCUL DE L'INDICE DE CONFIANCE RÉEL ---
      // On calcule le score sur la base des sources réelles ou amplifiées
      const calculatedReliability = calculateReliability(reliabilitySources);

      // Mise à jour de l'analyse de biais avec le score calculé
      const updatedBiasAnalysis = {
        ...article.biasAnalysis,
        consensusScore: calculatedReliability
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
        summary,
        detailedSummary,
        importance: article.importance || "Information clé pour comprendre l'actualité." // Fallback
      };
    });

    const articlesWithTilePrompts = baseArticles.map((article) => ({
      ...article,
      imagePrompt: buildTileBackgroundPrompt(article),
    }));

    const rankedArticles = sortArticlesBySourceRichness(articlesWithTilePrompts);
    const preparedArticles = ensureMinimumArticleCount(rankedArticles);

    let articlesToPersist = preparedArticles;

    const canGenerateHostedImages = isImagenServiceEnabled() && isSupabaseActive();
    if (canGenerateHostedImages) {
      const imagenService = getImagenService();
      const articlesWithImages: NewsArticle[] = [];
      
      for (const article of preparedArticles) {
        if (articlesWithImages.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        const imageUrl = await imagenService.generateCaricature({
          prompt: article.imagePrompt,
          aspectRatio: "3:4",
          id: article.id,
          requireHostedImage: true,
        });
        articlesWithImages.push({ ...article, imageUrl });
      }
      articlesToPersist = articlesWithImages;
    } else {
      if (isImagenServiceEnabled()) {
        console.warn("[PRISM] Supabase inactif, génération d'images ignorée pour garantir la cohérence.");
      } else {
        console.warn("[PRISM] Génération d'images désactivée. Les cartes utiliseront le fallback statique.");
      }
    }

    await persistTilesToRepository(articlesToPersist, cacheKey);

    // --- SAVE TO SUPABASE CACHE ---
    if (supabase) {
      try {
        const { error } = await supabase.from('news_cache').insert({
          search_key: cacheKey,
          articles: articlesToPersist
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

    saveLocalCache(cacheKey, articlesToPersist);
    return articlesToPersist;

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

    // FALLBACK: Récupérer les derniers articles de la base de données
    const latestFromDb = await fetchLatestArticlesFromDatabase();
    if (latestFromDb && latestFromDb.length > 0) {
      console.log("[PRISM 🔄] Using latest articles from database as fallback");
      return latestFromDb;
    }

    // Dernier recours absolu: retourner un tableau vide plutôt que des mock data
    console.warn("[PRISM ⚠️] No fallback data available - returning empty array");
    return [];
  }
};

export { fetchNewsArticles };
