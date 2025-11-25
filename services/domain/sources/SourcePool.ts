/**
 * Pool de sources curées avec positionnement politique vérifié
 *
 * Positionnement basé sur :
 * - Media Bias/Fact Check (MBFC)
 * - AllSides Media Bias Ratings
 * - Décodex (Le Monde)
 * - Ad Fontes Media
 *
 * Échelle : 0 (extrême gauche) ← 50 (centre) → 100 (extrême droite)
 */

import { Bias, Source } from '../../../types';

// ============================================================================
// TYPES
// ============================================================================

export interface CuratedSourceProfile {
  name: string;
  bias: Bias;
  position: number;
  defaultSummary: string;
}

// ============================================================================
// SOURCE POOLS
// ============================================================================

export const CURATED_SOURCE_POOL: Record<Bias, CuratedSourceProfile[]> = {
  left: [
    {
      name: 'lemonde.fr',
      bias: 'left',
      position: 35,
      defaultSummary: 'Décryptage social de {topic} par Le Monde.',
    },
    {
      name: 'theguardian.com',
      bias: 'left',
      position: 30,
      defaultSummary: 'Perspective société civile du Guardian sur {topic}.',
    },
    {
      name: 'mediapart.fr',
      bias: 'left',
      position: 25,
      defaultSummary: 'Contre-enquête indépendante de Mediapart autour de {topic}.',
    },
    {
      name: 'liberation.fr',
      bias: 'left',
      position: 28,
      defaultSummary: 'Analyse sociale et politique de Libération sur {topic}.',
    },
    {
      name: 'humanite.fr',
      bias: 'left',
      position: 20,
      defaultSummary: "Perspective ouvrière de L'Humanité concernant {topic}.",
    },
    {
      name: 'vox.com',
      bias: 'left',
      position: 32,
      defaultSummary: 'Analyse progressiste de Vox appliquée à {topic}.',
    },
  ],

  center: [
    {
      name: 'reuters.com',
      bias: 'center',
      position: 50,
      defaultSummary: 'Dépêche factuelle de Reuters consacrée à {topic}.',
    },
    {
      name: 'apnews.com',
      bias: 'center',
      position: 50,
      defaultSummary: 'Synthèse Associated Press sur {topic}.',
    },
    {
      name: 'afp.com',
      bias: 'center',
      position: 50,
      defaultSummary: "Fil d'actualité AFP sur {topic}.",
    },
    {
      name: 'bbc.com',
      bias: 'center',
      position: 48,
      defaultSummary: 'Couverture BBC de {topic}.',
    },
    {
      name: 'politico.eu',
      bias: 'center',
      position: 52,
      defaultSummary: 'Analyse politique européenne de Politico liée à {topic}.',
    },
    {
      name: 'axios.com',
      bias: 'center',
      position: 50,
      defaultSummary: "Synthèse concise d'Axios concernant {topic}.",
    },
  ],

  right: [
    {
      name: 'lefigaro.fr',
      bias: 'right',
      position: 65,
      defaultSummary:
        'Lecture conservatrice française proposée par Le Figaro sur {topic}.',
    },
    {
      name: 'wsj.com',
      bias: 'right',
      position: 68,
      defaultSummary:
        'Perspective pro-business du Wall Street Journal appliquée à {topic}.',
    },
    {
      name: 'lesechos.fr',
      bias: 'right',
      position: 67,
      defaultSummary: 'Analyse économique libérale de Les Échos au sujet de {topic}.',
    },
    {
      name: 'economist.com',
      bias: 'right',
      position: 63,
      defaultSummary: 'Analyse économique The Economist portant sur {topic}.',
    },
    {
      name: 'foxnews.com',
      bias: 'right',
      position: 80,
      defaultSummary:
        'Traitement éditorial conservateur de Fox News autour de {topic}.',
    },
    {
      name: 'nypost.com',
      bias: 'right',
      position: 72,
      defaultSummary: 'Couverture New York Post de {topic}.',
    },
  ],

  neutral: [
    {
      name: 'afp.com',
      bias: 'neutral',
      position: 50,
      defaultSummary: "Fil d'actualité AFP sur {topic}.",
    },
    {
      name: 'who.int',
      bias: 'neutral',
      position: 50,
      defaultSummary: "Données techniques multilatérales de l'OMS liées à {topic}.",
    },
    {
      name: 'worldbank.org',
      bias: 'neutral',
      position: 50,
      defaultSummary:
        'Lecture macro-économique de la Banque mondiale autour de {topic}.',
    },
    {
      name: 'oecd.org',
      bias: 'neutral',
      position: 50,
      defaultSummary: "Étude comparative produite par l'OCDE au sujet de {topic}.",
    },
    {
      name: 'un.org',
      bias: 'neutral',
      position: 50,
      defaultSummary: "Position institutionnelle de l'ONU sur {topic}.",
    },
  ],
};

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_POSITION_BY_BIAS: Record<Bias, number> = {
  left: 30,
  center: 50,
  right: 70,
  neutral: 50,
};

export const BIAS_ROTATION_ORDER: Bias[] = ['left', 'right', 'center', 'neutral'];

// ============================================================================
// LOOKUP FUNCTIONS
// ============================================================================

/**
 * Trouve un profil de source connu par son nom
 */
export const findKnownSourceProfile = (
  rawName: string
): CuratedSourceProfile | undefined => {
  const normalized = rawName.toLowerCase().trim();

  for (const biasKey of Object.keys(CURATED_SOURCE_POOL) as Bias[]) {
    const found = CURATED_SOURCE_POOL[biasKey].find((p) => {
      const pName = p.name.toLowerCase();
      return (
        pName === normalized ||
        normalized.includes(pName) ||
        pName.includes(normalized)
      );
    });
    if (found) return found;
  }

  return undefined;
};

/**
 * Retourne les sources disponibles pour un biais donné
 */
export const getSourcesByBias = (bias: Bias): CuratedSourceProfile[] => {
  return CURATED_SOURCE_POOL[bias] || [];
};

