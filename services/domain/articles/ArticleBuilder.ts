/**
 * Constructeur et transformateur d'articles
 */

import { NewsArticle, Source, UserComment, BiasAnalysis } from '../../../types';
import { cleanCitations, generateId, collapseWhitespace } from '../../core/utils/text';
import { hydrateRawSource, ensureSourceFloor } from '../sources';
import { calculateReliability, calculateBiasDistribution } from '../reliability';
import { PRISM_PROMPTS } from '../../prompts';

// ============================================================================
// TYPES
// ============================================================================

export interface RawArticleData {
  id?: string;
  headline?: string;
  summary?: string;
  detailedSummary?: string;
  importance?: string;
  emoji?: string;
  publishedAt?: string;
  imagePrompt?: string;
  imageUrl?: string;
  category?: string;
  biasAnalysis?: Partial<BiasAnalysis>;
  sources?: any[];
  sentiment?: {
    positive?: string;
    negative?: string;
  };
}

// ============================================================================
// COMMENT GENERATION
// ============================================================================

/**
 * Génère des commentaires initiaux basés sur le sentiment
 */
const generateInitialComments = (
  articleId: string,
  sentiment?: { positive?: string; negative?: string },
  index = 0
): UserComment[] => {
  return [
    {
      id: `c1-${articleId}`,
      author: 'User_Alpha',
      text: sentiment?.positive || 'Intéressant point de vue.',
      sentiment: 'positive' as const,
      timestamp: Date.now() - 60000 * (index + 1),
      likes: Math.floor(Math.random() * 50) + 5,
    },
    {
      id: `c2-${articleId}`,
      author: 'Sceptic_X',
      text: sentiment?.negative || 'Je ne suis pas convaincu.',
      sentiment: 'negative' as const,
      timestamp: Date.now() - 30000 * (index + 1),
      likes: Math.floor(Math.random() * 50) + 5,
    },
  ];
};

// ============================================================================
// IMAGE PROMPT
// ============================================================================

/**
 * Construit le prompt pour la génération d'image d'une tuile
 */
export const buildTileImagePrompt = (article: NewsArticle): string => {
  const subjectFocus =
    collapseWhitespace(article.imagePrompt) ||
    collapseWhitespace(article.headline) ||
    'current news event';

  const contextSummary = collapseWhitespace(
    `${article.detailedSummary || article.summary || ''} ${article.importance || ''}`
  );

  const moodCue = article.emoji ? `Mood cue suggested by ${article.emoji}.` : '';

  return PRISM_PROMPTS.IMAGE_GENERATION.buildPrompt(subjectFocus, contextSummary, moodCue);
};

// ============================================================================
// ARTICLE BUILDER
// ============================================================================

/**
 * Construit un article complet à partir de données brutes
 */
export const buildArticle = (
  raw: RawArticleData,
  options: {
    index?: number;
    defaultCategory?: string;
  } = {}
): NewsArticle => {
  const { index = 0, defaultCategory = 'Général' } = options;

  // ID
  const safeId = raw.id || generateId('article');

  // Textes nettoyés
  const summary = cleanCitations(raw.summary || raw.detailedSummary || '');
  const detailedSummary = cleanCitations(raw.detailedSummary || raw.summary || '');

  // Sources hydratées et amplifiées
  const rawSources = Array.isArray(raw.sources) ? raw.sources : [];
  const hydratedSources: Source[] = rawSources.map((source) =>
    hydrateRawSource(source, raw.headline || safeId, summary)
  );
  const amplifiedSources = ensureSourceFloor(
    raw.headline || safeId,
    summary,
    hydratedSources
  );

  // Calcul de fiabilité
  const reliabilitySources = hydratedSources.length > 0 ? hydratedSources : amplifiedSources;
  const calculatedReliability = calculateReliability(reliabilitySources);
  const biasDistribution = calculateBiasDistribution(reliabilitySources);

  // Bias Analysis mise à jour
  const biasAnalysis: BiasAnalysis = {
    left: raw.biasAnalysis?.left ?? biasDistribution.left,
    center: raw.biasAnalysis?.center ?? biasDistribution.center,
    right: raw.biasAnalysis?.right ?? biasDistribution.right,
    consensusScore: calculatedReliability,
  };

  // Commentaires initiaux
  const comments = generateInitialComments(safeId, raw.sentiment, index);

  // Article de base
  const article: NewsArticle = {
    id: safeId,
    headline: raw.headline || 'Article sans titre',
    summary,
    detailedSummary,
    importance: raw.importance || "Information clé pour comprendre l'actualité.",
    emoji: raw.emoji || '📰',
    publishedAt: raw.publishedAt || 'RÉCENT',
    imagePrompt: raw.imagePrompt || '',
    imageUrl: raw.imageUrl || '',
    category: raw.category || defaultCategory,
    biasAnalysis,
    sources: amplifiedSources,
    sentiment: {
      positive: raw.sentiment?.positive || 'Point de vue positif.',
      negative: raw.sentiment?.negative || 'Point de vue critique.',
    },
    comments,
  };

  // Ajouter le prompt d'image si non fourni
  if (!article.imagePrompt) {
    article.imagePrompt = buildTileImagePrompt(article);
  }

  return article;
};

/**
 * Construit plusieurs articles à partir de données brutes
 */
export const buildArticles = (
  rawArticles: RawArticleData[],
  options: { defaultCategory?: string } = {}
): NewsArticle[] => {
  return rawArticles.map((raw, index) =>
    buildArticle(raw, { index, ...options })
  );
};

// ============================================================================
// ARTICLE TRANSFORMERS
// ============================================================================

/**
 * Met à jour l'image d'un article
 */
export const withImageUrl = (article: NewsArticle, imageUrl: string): NewsArticle => ({
  ...article,
  imageUrl,
});

/**
 * Met à jour le prompt d'image d'un article
 */
export const withImagePrompt = (article: NewsArticle): NewsArticle => ({
  ...article,
  imagePrompt: buildTileImagePrompt(article),
});

