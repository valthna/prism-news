# 📋 Couverture Détaillée des Tests PRISM

Ce document décrit précisément ce que chaque test valide dans l'architecture backend.

---

## 🔧 Configuration (`config/`)

### `env.test.ts` - Gestion de l'Environnement

| Test | Ce qu'il valide |
|------|-----------------|
| `parseBoolean('1')` → `true` | Les valeurs "1", "true", "yes", "on" sont reconnues comme vraies |
| `parseBoolean('0')` → `false` | Les valeurs vides, null, undefined retournent false |
| `parseBoolean(true)` → `true` | Les booléens passent tels quels |
| `parseNumber('42', 0)` → `42` | Parse correctement les nombres entiers et décimaux |
| `parseNumber('invalid', 99)` → `99` | Retourne le fallback si la valeur n'est pas un nombre |
| `pickString(undefined, '', 'valid')` → `'valid'` | Retourne la première chaîne non-vide |
| `env.isSupabaseConfigured` | Détecte si Supabase est configuré (URL + Key) |
| `env.isGeminiConfigured` | Détecte si l'API Gemini est configurée |
| `env.forceMockData` | Lit le flag de mode mock depuis l'environnement |

**Pourquoi c'est important** : Ces fonctions sont utilisées partout pour lire la configuration. Un bug ici = comportement imprévisible dans toute l'app.

---

## 🚨 Erreurs (`core/errors/`)

### `errors.test.ts` - Hiérarchie d'Erreurs

| Classe | Ce qu'elle valide |
|--------|-------------------|
| `AppError` | Erreur de base avec code, message, contexte et sérialisation JSON |
| `NetworkError` | Erreurs réseau (fetch failed), marquées comme **retryable** |
| `RateLimitError` | Quota dépassé (429), avec délai avant retry |
| `QuotaExceededError` | Quota épuisé définitivement, **non-retryable** |
| `TimeoutError` | Opération trop longue, avec durée du timeout |
| `ParseError` | JSON invalide ou structure inattendue |
| `ValidationError` | Donnée invalide, avec nom du champ concerné |
| `ServiceDisabledError` | Service désactivé (API key manquante) |
| `StorageError` | Erreur Supabase Storage (bucket, upload) |

| Utilitaire | Ce qu'il valide |
|------------|-----------------|
| `isNetworkError(err)` | Détecte `TypeError`, "Failed to fetch", "ECONNREFUSED" |
| `isRateLimitError(err)` | Détecte status 429, "RESOURCE_EXHAUSTED" |
| `isModelNotFoundError(err)` | Détecte 404, "model not found" |
| `extractErrorMessage(err)` | Extrait le message de n'importe quel type d'erreur |
| `toAppError(err)` | Convertit n'importe quelle erreur en AppError typée |

**Pourquoi c'est important** : Une gestion d'erreurs cohérente permet de savoir quand réessayer, quand abandonner, et comment informer l'utilisateur.

---

## 🛠️ Utilitaires (`core/utils/`)

### `utils.test.ts` - Fonctions Partagées

#### Async
| Fonction | Ce qu'elle valide |
|----------|-------------------|
| `withTimeout(promise, 1000)` | Résout si la promesse termine dans le délai |
| `withTimeout(slowPromise, 100)` | Rejette avec TimeoutError si trop lent |
| `withTimeout(..., onTimeout)` | Appelle le callback si timeout atteint |
| `withRetry(fn, { maxAttempts: 3 })` | Retourne au 1er succès |
| `withRetry(failingFn)` | Réessaie N fois avant d'abandonner |
| `withRetry(..., { shouldRetry })` | Respecte le prédicat pour décider de réessayer |

#### Text
| Fonction | Ce qu'elle valide |
|----------|-------------------|
| `collapseWhitespace('a    b')` → `'a b'` | Réduit les espaces multiples |
| `cleanCitations('[cite: x] text')` | Supprime les marqueurs de citation LLM |
| `sanitizeFilename('Hello World!')` → `'hello-world'` | Nom de fichier safe |
| `normalizeSourceName('  Reuters.COM  ')` → `'reuters.com'` | Normalisation pour comparaison |
| `generateId('article')` | Génère un ID unique préfixé |
| `parseRelativeTimeToMinutes('Il y a 2H')` → `120` | Parse le temps relatif français |

#### URL
| Fonction | Ce qu'elle valide |
|----------|-------------------|
| `createLogoUrl('reuters.com')` | Génère l'URL favicon Google |
| `createGoogleSearchUrl(headline, source)` | Construit une recherche Google |
| `isDataUrl('data:image/png;base64,...')` → `true` | Détecte les data URLs |

#### Storage
| Fonction | Ce qu'elle valide |
|----------|-------------------|
| `formatBytes(1500)` → `'1.5 KB'` | Formatte les tailles lisiblement |

---

## 🌐 API Clients (`api/`)

### `gemini.test.ts` - Client IA Gemini

| Scénario | Ce qu'il valide |
|----------|-----------------|
| Génération texte réussie | Retourne le texte + modèle utilisé + métadonnées usage |
| Fallback 404 | Si le modèle n'existe pas, essaie le suivant dans la cascade |
| Fallback quota | Si quota dépassé sur un modèle, essaie le suivant |
| Tous les modèles en quota | Lance `QuotaExceededError` |
| Génération image | Retourne data URL base64 + modèle |
| Fallback image 404 | Essaie le modèle suivant |
| Retry sans haute résolution | Si "media resolution not enabled", réessaie en standard |
| Format `inline_data` | Parse le format alternatif de réponse |
| `isGeminiConfigured()` | Retourne true si API key présente |

**Cascade de modèles testée** :
```
gemini-2.5-flash-preview-05-20 → gemini-2.0-flash → gemini-1.5-flash
```

### `firecrawl.test.ts` - Client Scraping

| Scénario | Ce qu'il valide |
|----------|-----------------|
| `buildSearchVectors()` | Génère 5 vecteurs de recherche thématiques |
| Vecteurs avec query | La query utilisateur est incluse dans chaque vecteur |
| `executeSearch()` | Appelle l'API Firecrawl avec bon Authorization header |
| Résultats de recherche | Retourne la liste des résultats avec titre/url/markdown |
| Erreur API 500 | Lance une erreur |
| Erreur Firecrawl `success: false` | Lance l'erreur avec le message |
| `performMassiveDiscovery()` | Consolide les résultats de tous les vecteurs |
| Callback de progression | Appelle le callback à chaque vecteur |
| Tous les vecteurs échouent | Retourne `null` |

**Vecteurs de recherche** :
```
HEADLINES → Actualités breaking
POLITICS → Politique France/monde
ECONOMY → Économie/finance
TECH_SCI → Tech/science
SOCIETY → Société/culture
```

---

## 📦 Domain (`domain/`)

### `sources.test.ts` - Gestion des Sources

#### Pool de Sources Curées
| Test | Ce qu'il valide |
|------|-----------------|
| Sources par biais | Chaque biais (left/center/right/neutral) a des sources |
| Structure source | Chaque source a name, bias, position, defaultSummary |
| Positions valides | Toutes les positions sont entre 0-100 |
| `findKnownSourceProfile('lemonde.fr')` | Trouve les sources exactement |
| `findKnownSourceProfile('www.lemonde.fr')` | Trouve avec préfixe www |
| `findKnownSourceProfile('REUTERS.COM')` | Insensible à la casse |
| Source inconnue | Retourne undefined |

#### Enrichissement des Sources
| Fonction | Ce qu'elle valide |
|----------|-------------------|
| `sanitizeBias('gauche')` → `'left'` | Normalise les biais FR → EN |
| `sanitizeBias('unknown')` → `'neutral'` | Fallback vers neutral |
| `enrichCoverageSummary('')` | Génère un résumé si vide |
| `hydrateRawSource({name: 'lemonde.fr'})` | Ajoute bias, position, logoUrl, url, isVerified |
| Source connue override | Le biais LLM est remplacé par le biais curé |
| `dedupeSources()` | Déduplique par nom (case-insensitive) |
| `ensureSourceFloor()` | Amplifie à minimum 5 sources |
| Priorité biais manquants | Ajoute d'abord les biais non représentés |
| Sources originales vérifiées | Marquées `isVerified: true` |
| Sources amplifiées non vérifiées | Marquées `isVerified: false` |

### `reliability.test.ts` - Score de Fiabilité

| Scénario | Ce qu'il valide |
|----------|-----------------|
| Peu de sources | Score minimum (≥15) |
| Plus de sources | Score augmente |
| Echo chamber (tout left) | Score faible |
| Sources diverses (left+center+right) | Score élevé |
| Sources de confiance (Reuters, AFP) | Bonus de score |
| Jamais 100% | Plafond à 98% |
| `calculateBiasDistribution()` | Calcule % left/center/right |
| Neutral compté comme center | neutral → center dans la distribution |
| `isBalanced()` | True si aucun biais > 60% |

**Formule de fiabilité** :
```
Score = baseScore(#sources) 
      + diversityBonus(biasVariety) 
      + trustBonus(knownSources)
      * ceilingMultiplier(0.98)
```

### `articles.test.ts` - Construction d'Articles

| Fonction | Ce qu'elle valide |
|----------|-------------------|
| `buildArticle(raw)` | Construit un article complet depuis données LLM |
| ID auto-généré | Génère un ID si absent |
| Nettoyage citations | Supprime `[cite: ...]` du texte |
| Hydratation sources | Sources enrichies et amplifiées à 5+ |
| Score fiabilité | `biasAnalysis.consensusScore` calculé |
| Commentaires sentiment | Génère 2 commentaires depuis positive/negative |
| Valeurs par défaut | headline="Article sans titre", emoji="📰", etc. |
| Catégorie par défaut | Utilise la catégorie passée en option |
| Prompt image | Génère automatiquement un prompt |
| `buildArticles([...])` | Construit plusieurs articles |
| `buildTileImagePrompt(article)` | Construit le prompt depuis l'article |
| `withImageUrl(article, url)` | Retourne une copie avec nouvelle URL |
| `withImagePrompt(article)` | Régénère le prompt image |

---

## 💾 Repositories (`repositories/`)

### `cache.test.ts` - Gestion du Cache

#### Cache Local (localStorage)
| Test | Ce qu'il valide |
|------|-----------------|
| Clé inexistante | Retourne null |
| Sauvegarde + lecture | Les articles sont persistés et récupérés |
| Cache expiré | Retourne null (TTL: 15 min par défaut) |
| `allowStale: true` | Retourne le cache même expiré |
| Strip base64 | Les images data: sont vidées pour économiser l'espace |

#### Cache Supabase
| Test | Ce qu'il valide |
|------|-----------------|
| Cache hit | Retourne les articles depuis `news_cache` |
| Cache miss | Retourne null |
| Insert cache | Sauvegarde dans Supabase |

#### Cache Unifié
| Test | Ce qu'il valide |
|------|-----------------|
| Local d'abord | Vérifie le localStorage avant Supabase |
| Fallback Supabase | Si local vide, cherche dans Supabase |
| Double sauvegarde | Sauvegarde dans les deux |

### `reactions.test.ts` - Réactions Utilisateur

#### localStorage
| Test | Ce qu'il valide |
|------|-----------------|
| Pas de réactions | Retourne `{}` |
| Réactions stockées | Parse et retourne les réactions |
| Sauvegarder réaction | Persiste dans localStorage |
| Supprimer réaction | Met à null → supprime l'entrée |
| Réaction par article | Retourne la réaction spécifique |

#### Supabase
| Test | Ce qu'il valide |
|------|-----------------|
| Pas de données | Retourne les compteurs à 0 |
| Compteurs réactions | Parse les agrégats RPC |
| Multiple articles | Batch les requêtes |
| `incrementReaction()` | Appelle RPC + sauvegarde local |
| `decrementReaction()` | Appelle RPC décrémentation |
| `toggleReaction(new, old)` | Décrémente old + incrémente new |

**Types de réactions** : `fire`, `shock`, `doubt`, `angry`, `clap`

---

## 🎯 Application Services (`application/`)

### `settings.test.ts` - Paramètres Utilisateur

| Test | Ce qu'il valide |
|------|-----------------|
| Paramètres par défaut | language="Français", debateMode="moderate", etc. |
| Merge avec stockés | Les paramètres stockés écrasent les défauts |
| Sauvegarde | Persiste dans localStorage |
| Update single | Met à jour une clé sans perdre les autres |
| Reset | Remet tous les paramètres par défaut |
| Labels export | DEBATE_MODE_LABELS, SOURCE_PRIORITY_LABELS |
| TEXT_SIZE_OPTIONS | 5 options de 80% à 120% |

### `image.test.ts` - Service d'Images

| Test | Ce qu'il valide |
|------|-----------------|
| Service enabled | Vérifie la configuration |
| Génération + upload | Génère image + upload → URL publique |
| Fallback base64 | Si upload échoue → retourne data URL |
| `requireHostedImage: true` | Lance erreur si upload échoue |
| Quota exceeded | Retourne URL vide sans erreur |
| Batch generation | Génère images pour plusieurs articles |
| Callback progression | Appelle onProgress(index, total) |
| Échec individuel | Continue avec les autres articles |

### `news.test.ts` - Service Principal

| Test | Ce qu'il valide |
|------|-----------------|
| Cache hit (≥10 articles) | Retourne le cache, pas d'appel API |
| Cache insuffisant | Fallback vers la base de données |
| `forceRefresh: true` | Lance Deep Harvest même avec cache |
| Contexte Firecrawl | Utilise le contexte dans le prompt Gemini |
| Cache après succès | Sauvegarde les nouveaux articles |
| JSON "dirty" | Parse même avec ```json et commentaires |
| Échec total | Retourne tableau vide |
| Paramètre category | Passé à Firecrawl discovery |
| `buildCacheKey()` | Clés stables et différenciées |

**Flux Deep Harvest** :
```
1. Firecrawl Discovery (5 vecteurs)
2. Gemini Analysis (prompt + context)
3. Article Building (enrichissement)
4. Image Generation (optionnel)
5. Cache Persistence
```

---

## 🔗 Intégration (`integration/`)

### `news-flow.test.ts` - Flux Complet

| Test | Ce qu'il valide |
|------|-----------------|
| Raw LLM → Article complet | Transformation end-to-end |
| Données minimales | Fonctionne même avec `{}` |
| Enrichissement source | bbc.com → bias=center, position, logo |
| Source inconnue | Fallback vers neutral |
| Diversité → score élevé | Plus de biais différents = meilleur score |
| Cache key stable | Même input = même clé |
| Conversion erreurs | NetworkError, RateLimitError correctement typées |

---

## 📈 Métriques de Couverture

```
14 fichiers de test
198 tests au total

Par couche:
├── config/      :   9 tests (configuration)
├── core/        :  53 tests (erreurs + utils)
├── api/         :  26 tests (clients externes)
├── domain/      :  41 tests (logique métier)
├── repositories/:  29 tests (persistance)
├── application/ :  32 tests (orchestration)
└── integration/ :   8 tests (flux complets)
```

---

## ✅ Ce qui est couvert

- ✅ Parsing et validation des configurations
- ✅ Gestion complète des erreurs avec retry logic
- ✅ Transformations de données (text, URL, dates)
- ✅ Cascading entre modèles Gemini
- ✅ Scraping multi-vecteurs Firecrawl
- ✅ Pool de sources curées avec 50+ médias
- ✅ Calcul de fiabilité multi-facteurs
- ✅ Construction d'articles depuis données LLM
- ✅ Double cache (local + Supabase)
- ✅ Réactions temps réel avec RPC
- ✅ Paramètres utilisateur persistants
- ✅ Génération d'images avec fallback
- ✅ Flux complet de récupération de news

## ❌ Ce qui n'est PAS couvert (à ajouter)

- Tests de performance/charge
- Tests de race conditions
- Tests de migrations de schéma
- Tests E2E avec vrai Supabase
- Tests visuels des composants React

