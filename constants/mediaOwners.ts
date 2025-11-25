/**
 * Mapping des médias français vers leurs groupes propriétaires
 * Permet d'afficher des "couronnes" colorées sur les miniatures
 */

export type MediaOwnerGroup =
  | 'bollore'
  | 'bouygues'
  | 'niel_pigasse_kretinsky'
  | 'arnault'
  | 'dassault'
  | 'drahi'
  | 'public'
  | 'independent';

export interface MediaOwnerInfo {
  group: MediaOwnerGroup;
  label: string;
  color: string;
  description: string;
}

// Configuration des groupes propriétaires avec leurs couleurs et labels
export const MEDIA_OWNER_CONFIG: Record<MediaOwnerGroup, MediaOwnerInfo> = {
  bollore: {
    group: 'bollore',
    label: 'Bolloré',
    color: '#FF6B00',
    description: 'Groupe Vivendi (Vincent Bolloré)',
  },
  bouygues: {
    group: 'bouygues',
    label: 'Bouygues',
    color: '#00D4FF',
    description: 'Groupe Bouygues (Martin Bouygues)',
  },
  niel_pigasse_kretinsky: {
    group: 'niel_pigasse_kretinsky',
    label: 'Niel/Pigasse/Kretinsky',
    color: '#00C896',
    description: 'Xavier Niel, Matthieu Pigasse, Daniel Kretinsky',
  },
  arnault: {
    group: 'arnault',
    label: 'Arnault',
    color: '#FFD700',
    description: 'Groupe LVMH (Bernard Arnault)',
  },
  dassault: {
    group: 'dassault',
    label: 'Dassault',
    color: '#C41E3A',
    description: 'Groupe Dassault (Famille Dassault)',
  },
  drahi: {
    group: 'drahi',
    label: 'Drahi',
    color: '#E91E8C',
    description: 'Groupe Altice (Patrick Drahi)',
  },
  public: {
    group: 'public',
    label: 'Public',
    color: '#6B7280',
    description: 'Médias du service public français',
  },
  independent: {
    group: 'independent',
    label: 'Indépendant',
    color: '#9CA3AF',
    description: 'Média indépendant ou propriétaire non identifié',
  },
};

// Mapping des noms de médias vers leurs propriétaires
// Utilise des patterns pour matcher partiellement les noms
const MEDIA_OWNER_MAPPING: Array<{ patterns: string[]; owner: MediaOwnerGroup }> = [
  // Bolloré (Vivendi/Canal+)
  {
    patterns: [
      'cnews', 'c news', 'c-news',
      'c8',
      'canal+', 'canal +', 'canal plus', 'canalplus',
      'europe 1', 'europe1',
      'jdd', 'journal du dimanche',
      'paris match', 'parismatch',
      'cstar', 'c star',
    ],
    owner: 'bollore',
  },
  // Bouygues
  {
    patterns: [
      'tf1',
      'lci',
      'tmc',
      'tfx',
      'tf1 info',
    ],
    owner: 'bouygues',
  },
  // Niel/Pigasse/Kretinsky
  {
    patterns: [
      'le monde', 'lemonde',
      'l\'obs', 'lobs', 'nouvel obs', 'nouvelobs',
      'télérama', 'telerama',
      'courrier international',
      'huffpost', 'huffington post', 'huff post',
      'la vie',
    ],
    owner: 'niel_pigasse_kretinsky',
  },
  // Arnault (LVMH)
  {
    patterns: [
      'le parisien', 'leparisien',
      'les échos', 'les echos', 'lesechos',
      'radio classique',
    ],
    owner: 'arnault',
  },
  // Dassault
  {
    patterns: [
      'le figaro', 'lefigaro', 'figaro',
    ],
    owner: 'dassault',
  },
  // Drahi (Altice)
  {
    patterns: [
      'bfm', 'bfmtv', 'bfm tv', 'bfm business',
      'rmc', 'rmcsport', 'rmc sport',
      'l\'express', 'lexpress', 'express',
    ],
    owner: 'drahi',
  },
  // Médias publics
  {
    patterns: [
      'france info', 'franceinfo', 'france-info',
      'france inter', 'franceinter',
      'france 24', 'france24',
      'france 2', 'france2',
      'france 3', 'france3',
      'france 5', 'france5',
      'france tv', 'francetv', 'france télévisions',
      'arte',
      'afp', 'agence france presse', 'agence france-presse',
      'radio france',
      'public sénat', 'public senat',
      'la chaîne parlementaire', 'lcp',
    ],
    owner: 'public',
  },
];

/**
 * Détecte le groupe propriétaire d'un média à partir de son nom
 */
export function getMediaOwner(mediaName: string): MediaOwnerInfo {
  const normalizedName = mediaName.toLowerCase().trim();

  for (const mapping of MEDIA_OWNER_MAPPING) {
    for (const pattern of mapping.patterns) {
      if (normalizedName.includes(pattern) || pattern.includes(normalizedName)) {
        return MEDIA_OWNER_CONFIG[mapping.owner];
      }
    }
  }

  // Par défaut, retourne "indépendant"
  return MEDIA_OWNER_CONFIG.independent;
}

/**
 * Retourne la couleur du propriétaire pour un média donné
 */
export function getMediaOwnerColor(mediaName: string): string {
  return getMediaOwner(mediaName).color;
}

/**
 * Retourne le label du propriétaire pour un média donné
 */
export function getMediaOwnerLabel(mediaName: string): string {
  return getMediaOwner(mediaName).label;
}

/**
 * Liste tous les groupes propriétaires pour la légende
 */
export function getAllOwnerGroups(): MediaOwnerInfo[] {
  return Object.values(MEDIA_OWNER_CONFIG);
}

/**
 * Retourne la liste des autres médias appartenant au même groupe
 */
export function getSiblingMedias(mediaName: string): string[] {
  const normalizedName = mediaName.toLowerCase().trim();
  
  for (const mapping of MEDIA_OWNER_MAPPING) {
    for (const pattern of mapping.patterns) {
      if (normalizedName.includes(pattern) || pattern.includes(normalizedName)) {
        // Retourner les autres patterns du même groupe (noms représentatifs)
        return mapping.patterns
          .filter(p => !normalizedName.includes(p) && !p.includes(normalizedName))
          .map(p => {
            // Capitaliser les noms proprement
            return p.split(' ').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
          })
          .slice(0, 5); // Limiter à 5 médias
      }
    }
  }
  
  return [];
}

/**
 * Informations détaillées sur les médias (année de création, type, etc.)
 */
export interface MediaDetails {
  founded?: number;
  type: 'tv' | 'radio' | 'press' | 'digital' | 'agency';
  typeLabel: string;
  factualityScore?: number; // 0-100
  transparencyScore?: number; // 0-100
}

const MEDIA_DETAILS: Record<string, MediaDetails> = {
  // Presse
  'le monde': { founded: 1944, type: 'press', typeLabel: 'Presse quotidienne', factualityScore: 85, transparencyScore: 80 },
  'le figaro': { founded: 1826, type: 'press', typeLabel: 'Presse quotidienne', factualityScore: 75, transparencyScore: 70 },
  'libération': { founded: 1973, type: 'press', typeLabel: 'Presse quotidienne', factualityScore: 75, transparencyScore: 75 },
  'les echos': { founded: 1908, type: 'press', typeLabel: 'Presse économique', factualityScore: 85, transparencyScore: 80 },
  'le parisien': { founded: 1944, type: 'press', typeLabel: 'Presse quotidienne', factualityScore: 70, transparencyScore: 65 },
  'l\'humanité': { founded: 1904, type: 'press', typeLabel: 'Presse quotidienne', factualityScore: 65, transparencyScore: 70 },
  'mediapart': { founded: 2008, type: 'digital', typeLabel: 'Pure player', factualityScore: 85, transparencyScore: 90 },
  
  // TV
  'tf1': { founded: 1975, type: 'tv', typeLabel: 'Chaîne TV', factualityScore: 65, transparencyScore: 55 },
  'france 2': { founded: 1992, type: 'tv', typeLabel: 'Service public TV', factualityScore: 80, transparencyScore: 85 },
  'bfmtv': { founded: 2005, type: 'tv', typeLabel: 'Chaîne info', factualityScore: 60, transparencyScore: 50 },
  'cnews': { founded: 2017, type: 'tv', typeLabel: 'Chaîne info', factualityScore: 50, transparencyScore: 45 },
  'lci': { founded: 1994, type: 'tv', typeLabel: 'Chaîne info', factualityScore: 65, transparencyScore: 55 },
  'arte': { founded: 1991, type: 'tv', typeLabel: 'Chaîne culturelle', factualityScore: 90, transparencyScore: 90 },
  
  // Radio
  'france info': { founded: 1987, type: 'radio', typeLabel: 'Radio info', factualityScore: 85, transparencyScore: 90 },
  'france inter': { founded: 1963, type: 'radio', typeLabel: 'Radio généraliste', factualityScore: 80, transparencyScore: 85 },
  'europe 1': { founded: 1955, type: 'radio', typeLabel: 'Radio généraliste', factualityScore: 60, transparencyScore: 55 },
  'rmc': { founded: 1943, type: 'radio', typeLabel: 'Radio généraliste', factualityScore: 55, transparencyScore: 50 },
  'rtl': { founded: 1933, type: 'radio', typeLabel: 'Radio généraliste', factualityScore: 70, transparencyScore: 65 },
  
  // Agences
  'afp': { founded: 1944, type: 'agency', typeLabel: 'Agence de presse', factualityScore: 95, transparencyScore: 90 },
  'reuters': { founded: 1851, type: 'agency', typeLabel: 'Agence de presse', factualityScore: 95, transparencyScore: 85 },
  
  // Digital
  'huffpost': { founded: 2012, type: 'digital', typeLabel: 'Pure player', factualityScore: 65, transparencyScore: 60 },
};

/**
 * Obtenir les détails d'un média
 */
export function getMediaDetails(mediaName: string): MediaDetails | null {
  const normalizedName = mediaName.toLowerCase().trim();
  
  for (const [key, details] of Object.entries(MEDIA_DETAILS)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return details;
    }
  }
  
  return null;
}

