# Architecture Backend PRISM

## Vue d'ensemble

L'architecture backend de PRISM suit une **architecture en couches** inspirée des patterns Domain-Driven Design (DDD) et Clean Architecture.

```
┌─────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER                        │
│  (NewsService, ImageService, SettingsService)                │
│  → Orchestration, business workflows                         │
├─────────────────────────────────────────────────────────────┤
│                      DOMAIN LAYER                            │
│  (Sources, Articles, Reliability)                            │
│  → Logique métier pure, règles business                      │
├─────────────────────────────────────────────────────────────┤
│                   REPOSITORY LAYER                           │
│  (NewsRepository, CacheRepository, ReactionsRepository)      │
│  → Accès aux données, persistance                            │
├─────────────────────────────────────────────────────────────┤
│                       API LAYER                              │
│  (GeminiClient, FirecrawlClient, SupabaseClient)             │
│  → Communication avec services externes                      │
├─────────────────────────────────────────────────────────────┤
│                      CORE LAYER                              │
│  (Errors, Utils, Config)                                     │
│  → Infrastructure transversale                               │
└─────────────────────────────────────────────────────────────┘
```

## Structure des dossiers

```
services/
├── config/                    # Configuration centralisée
│   ├── env.ts                 # Gestion des variables d'environnement
│   ├── constants.ts           # Constantes de l'application
│   └── index.ts               # Export principal
│
├── core/                      # Infrastructure transversale
│   ├── errors/                # Classes d'erreurs personnalisées
│   │   ├── AppError.ts        # Hiérarchie d'erreurs typées
│   │   └── index.ts
│   ├── utils/                 # Utilitaires partagés
│   │   ├── async.ts           # withTimeout, withRetry, sleep
│   │   ├── text.ts            # Manipulation de texte
│   │   ├── url.ts             # Construction d'URLs
│   │   ├── storage.ts         # LocalStorage helpers
│   │   └── index.ts
│   └── index.ts
│
├── api/                       # Clients API externes
│   ├── gemini/                # Client Google Gemini
│   │   ├── client.ts          # Génération texte/image
│   │   ├── types.ts           # Types TypeScript
│   │   └── index.ts
│   ├── firecrawl/             # Client Firecrawl (scraping)
│   │   ├── client.ts          # Recherche web massive
│   │   └── index.ts
│   ├── supabase/              # Client Supabase
│   │   ├── client.ts          # Singleton avec gestion d'état
│   │   └── index.ts
│   └── index.ts
│
├── repositories/              # Accès aux données (Pattern Repository)
│   ├── CacheRepository.ts     # Cache local + Supabase
│   ├── NewsRepository.ts      # Table news_tiles
│   ├── ReactionsRepository.ts # Réactions utilisateur
│   ├── ImageRepository.ts     # Storage Supabase
│   └── index.ts
│
├── domain/                    # Logique métier pure
│   ├── sources/               # Gestion des sources média
│   │   ├── SourcePool.ts      # Pool de sources curées
│   │   ├── SourceEnricher.ts  # Hydratation et amplification
│   │   └── index.ts
│   ├── reliability/           # Calcul de fiabilité
│   │   ├── calculator.ts      # Score quantifié
│   │   └── index.ts
│   ├── articles/              # Construction d'articles
│   │   ├── ArticleBuilder.ts  # Factory pattern
│   │   └── index.ts
│   └── index.ts
│
├── application/               # Services applicatifs (Orchestration)
│   ├── NewsService.ts         # Workflow principal de news
│   ├── ImageService.ts        # Génération et hébergement d'images
│   ├── SettingsService.ts     # Préférences utilisateur
│   └── index.ts
│
├── index.ts                   # Export public unifié
└── ARCHITECTURE.md            # Ce fichier
```

## Principes clés

### 1. Séparation des responsabilités (SRP)

Chaque module a une responsabilité unique :
- **Config** : Uniquement la configuration
- **API** : Uniquement la communication HTTP
- **Repository** : Uniquement la persistance
- **Domain** : Uniquement la logique métier
- **Application** : Uniquement l'orchestration

### 2. Injection de dépendances implicite

Les dépendances sont résolues via des imports explicites, permettant un couplage lâche et une testabilité accrue.

### 3. Gestion d'erreurs centralisée

Hiérarchie d'erreurs typées :
- `AppError` : Classe de base
- `NetworkError` : Problèmes réseau (retryable)
- `RateLimitError` : Quota dépassé
- `QuotaExceededError` : Limite API atteinte
- `TimeoutError` : Opération trop longue
- `ParseError` : JSON invalide
- `ValidationError` : Données invalides
- `StorageError` : Problèmes de stockage
- `ServiceDisabledError` : Service indisponible

### 4. Configuration centralisée

Toutes les variables d'environnement sont lues via `env.ts` :
```typescript
import { env } from './config';

// Utilisation
if (env.isGeminiConfigured) {
  // ...
}
```

### 5. Pattern Repository

Abstraction de la persistance :
```typescript
import { getCachedArticles, cacheArticles } from './repositories';

// Lecture
const articles = await getCachedArticles(cacheKey);

// Écriture
await cacheArticles(cacheKey, articles);
```

## Migration depuis l'ancien code

Les anciens fichiers sont conservés pour la rétrocompatibilité :
- `geminiService.ts` → `application/NewsService.ts`
- `imagenService.ts` → `application/ImageService.ts`
- `reactionsService.ts` → `repositories/ReactionsRepository.ts`
- `settingsService.ts` → `application/SettingsService.ts`
- `supabaseClient.ts` → `api/supabase/client.ts`

Des wrappers de compatibilité (`*.new.ts`) sont disponibles pendant la transition.

## Usage recommandé

Pour les nouveaux développements, importez depuis le point d'entrée principal :

```typescript
import {
  fetchNewsArticles,
  generateArticleImage,
  loadSettings,
  progressTracker,
} from './services';
```

Ou importez directement depuis les modules spécifiques :

```typescript
import { calculateReliability } from './services/domain/reliability';
import { hydrateRawSource } from './services/domain/sources';
```

## Tests

Les tests unitaires ciblent chaque couche indépendamment :
- Tests API : Mock des appels HTTP
- Tests Repository : Mock de Supabase
- Tests Domain : Tests purs sans I/O
- Tests Application : Tests d'intégration

