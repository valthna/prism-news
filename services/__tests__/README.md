# 🧪 Tests PRISM

Architecture de tests complète pour le backend PRISM.

## 📁 Structure

```
services/__tests__/
├── setup.ts                    # Configuration globale et mocks
├── config/
│   └── env.test.ts            # Tests configuration environnement
├── core/
│   ├── errors.test.ts         # Tests classes d'erreurs
│   └── utils.test.ts          # Tests utilitaires (async, text, url, storage)
├── api/
│   ├── gemini.test.ts         # Tests client Gemini API
│   └── firecrawl.test.ts      # Tests client Firecrawl API
├── domain/
│   ├── sources.test.ts        # Tests logique métier sources
│   ├── reliability.test.ts    # Tests calcul fiabilité
│   └── articles.test.ts       # Tests construction articles
├── repositories/
│   ├── cache.test.ts          # Tests cache local/Supabase
│   └── reactions.test.ts      # Tests réactions utilisateur
├── application/
│   ├── news.test.ts           # Tests service principal news
│   ├── image.test.ts          # Tests service images
│   └── settings.test.ts       # Tests service paramètres
└── integration/
    └── news-flow.test.ts      # Tests d'intégration end-to-end
```

## 🚀 Exécution

```bash
# Tous les tests
npm test

# Tests avec couverture
npm test -- --coverage

# Tests en watch mode
npm test -- --watch

# Tests spécifiques
npm test -- services/__tests__/domain/sources.test.ts

# Pattern matching
npm test -- --filter "Sources"
```

## 📊 Couverture

Les métriques de couverture sont générées dans `coverage/`:
- `coverage/index.html` - Rapport HTML interactif
- `coverage/lcov.info` - Format LCOV pour CI

## 🎯 Conventions

### Nommage
- Fichiers: `*.test.ts`
- Describe: Nom du module (`Domain - Sources`)
- It: Description comportementale (`should sanitize bias strings`)

### Structure d'un test

```typescript
describe('Module - Component', () => {
  beforeEach(() => {
    // Setup commun
  });

  describe('functionName', () => {
    it('should do something specific', () => {
      // Arrange
      const input = createInput();
      
      // Act
      const result = functionUnderTest(input);
      
      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

### Mocking

Le fichier `setup.ts` fournit des factories pour les mocks courants:

```typescript
import { 
  createMockSupabaseClient,
  createMockGeminiResponse,
  fixtures 
} from '../setup';

const mockSupabase = createMockSupabaseClient();
```

### Fixtures

Des données de test réutilisables sont disponibles:

```typescript
fixtures.article     // Article complet
fixtures.rawArticle  // Article brut LLM
fixtures.source      // Source avec tous les champs
```

## 🔧 Configuration

- `vitest.config.ts` - Configuration principale Vitest
- `services/__tests__/setup.ts` - Setup global et mocks

## 📝 Checklist Nouveau Test

- [ ] Placer dans le bon dossier selon la couche
- [ ] Importer les mocks depuis `setup.ts`
- [ ] Utiliser `vi.resetModules()` dans `beforeEach`
- [ ] Nettoyer les stubs dans `afterEach`
- [ ] Tester les cas nominaux ET les erreurs
- [ ] Vérifier l'isolation (pas d'effets de bord)

