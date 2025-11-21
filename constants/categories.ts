export type CategoryOption = {
  value: string;
  emoji: string;
  description: string;
};

export const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    value: 'Général',
    emoji: '🛰️',
    description: 'Radar global, meilleures actualités toutes thématiques confondues.'
  },
  {
    value: 'Politique',
    emoji: '🗳️',
    description: 'Gouvernance, élections, équilibres institutionnels et diplomatiques.'
  },
  {
    value: 'Économie',
    emoji: '💹',
    description: 'Marchés, entreprises stratégiques, emploi et politiques budgétaires.'
  },
  {
    value: 'Technologie',
    emoji: '🤖',
    description: 'IA, cybersécurité, infrastructures critiques et innovation deeptech.'
  },
  {
    value: 'International',
    emoji: '🌍',
    description: 'Géopolitique, alliances, conflits et grandes dynamiques régionales.'
  },
  {
    value: 'Sciences',
    emoji: '🔬',
    description: 'Découvertes scientifiques, santé mondiale, espace et recherche avancée.'
  },
  {
    value: 'Culture',
    emoji: '🎭',
    description: 'Créations artistiques, industries culturelles, débats de société.'
  },
  {
    value: 'Sport',
    emoji: '⚽️',
    description: 'Compétitions majeures, enjeux économiques et signaux sociétaux du sport.'
  },
  {
    value: 'Environnement',
    emoji: '🌱',
    description: 'Climat, biodiversité, énergie et transitions écologiques.'
  }
];

export const DEFAULT_CATEGORY = CATEGORY_OPTIONS[0];

export const getCategoryOption = (value?: string | null): CategoryOption => {
  if (!value) {
    return DEFAULT_CATEGORY;
  }
  const normalized = value.trim().toLowerCase();
  return (
    CATEGORY_OPTIONS.find(
      (option) => option.value.toLowerCase() === normalized
    ) || DEFAULT_CATEGORY
  );
};

export const isKnownCategory = (value?: string | null): boolean =>
  !!value &&
  CATEGORY_OPTIONS.some(
    (option) => option.value.toLowerCase() === value.trim().toLowerCase()
  );

