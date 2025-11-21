export type FirecrawlTarget = {
  /**
   * Identifiant unique, utilisé dans les logs/ID d’articles.
   */
  id: string;
  /**
   * Catégorie métier (doit correspondre aux options exposées côté UI).
   */
  category: string;
  /**
   * URL listant les articles à extraire via Firecrawl.
   */
  seedUrl: string;
  /**
   * Libellé humain de la source principale (pour affichage et analytics).
   */
  sourceName: string;
  /**
   * Emoji affiché dans les cartes de news.
   */
  emoji: string;
  /**
   * Nombre max d’articles à demander à Firecrawl pour cette source.
   */
  maxArticles?: number;
  /**
   * Hints pour les proxys (ex: cibler des pages FR).
   */
  location?: {
    country?: string;
    languages?: string[];
  };
};

/**
 * Liste de cibles par défaut. Chaque cible pointe vers une page éditoriale
 * stable qui liste les derniers articles de la thématique.
 */
export const FIRECRAWL_TARGETS: FirecrawlTarget[] = [
  {
    id: 'general-franceinfo',
    category: 'Général',
    seedUrl: 'https://www.francetvinfo.fr/monde/',
    sourceName: 'Franceinfo Monde',
    emoji: '🛰️',
    maxArticles: 15,
    location: { country: 'fr', languages: ['fr'] }
  },
  {
    id: 'politique-lemonde',
    category: 'Politique',
    seedUrl: 'https://www.lemonde.fr/politique/',
    sourceName: 'Le Monde Politique',
    emoji: '🗳️',
    maxArticles: 20,
    location: { country: 'fr', languages: ['fr'] }
  },
  {
    id: 'economie-franceinfo',
    category: 'Économie',
    seedUrl: 'https://www.francetvinfo.fr/economie/',
    sourceName: 'Franceinfo Économie',
    emoji: '💹',
    maxArticles: 18,
    location: { country: 'fr', languages: ['fr'] }
  },
  {
    id: 'technologie-numerama',
    category: 'Technologie',
    seedUrl: 'https://www.numerama.com/tech/',
    sourceName: 'Numerama Tech',
    emoji: '🤖',
    maxArticles: 15,
    location: { country: 'fr', languages: ['fr'] }
  },
  {
    id: 'international-france24',
    category: 'International',
    seedUrl: 'https://www.france24.com/fr/info-en-direct/',
    sourceName: 'France 24',
    emoji: '🌍',
    maxArticles: 20,
    location: { country: 'fr', languages: ['fr'] }
  },
  {
    id: 'sciences-futura',
    category: 'Sciences',
    seedUrl: 'https://www.futura-sciences.com/sciences/actualites/',
    sourceName: 'Futura Sciences',
    emoji: '🔬',
    maxArticles: 12,
    location: { country: 'fr', languages: ['fr'] }
  },
  {
    id: 'culture-franceinfo',
    category: 'Culture',
    seedUrl: 'https://www.francetvinfo.fr/culture/',
    sourceName: 'Franceinfo Culture',
    emoji: '🎭',
    maxArticles: 12,
    location: { country: 'fr', languages: ['fr'] }
  },
  {
    id: 'sport-franceinfo',
    category: 'Sport',
    seedUrl: 'https://www.francetvinfo.fr/sports/',
    sourceName: 'Franceinfo Sport',
    emoji: '⚽️',
    maxArticles: 16,
    location: { country: 'fr', languages: ['fr'] }
  },
  {
    id: 'environnement-reporterre',
    category: 'Environnement',
    seedUrl: 'https://reporterre.net/',
    sourceName: 'Reporterre',
    emoji: '🌱',
    maxArticles: 12,
    location: { country: 'fr', languages: ['fr'] }
  }
];


