# ✨ Migration vers Gemini 3 Pro Image Preview

## Changements effectués

### 1. **Service Imagen** (`/services/imagenService.ts`)
- Modèle : `gemini-3-pro-image-preview`
- Style : **Caricatures satiriques** à la française (Plantu, Cabu, Wolinski)
- Format : 3:4 portrait par défaut (aligné mobile & desktop)
- Génération : via **tools.googleSearch**, `imageSize: "4K"` et `mediaResolution: high` pour préserver la lisibilité
- Le modèle raisonne avant rendu (penser à prévoir quelques secondes supplémentaires)

### 2. **Intégration dans le flux** (`/services/geminiService.ts`)
- Les images sont **pré-générées** lors de la récupération des articles
- Génération **en parallèle** pour tous les articles (performance optimale)
- **Fallback automatique** vers Pollinations si échec Gemini
- Clé de cache versionnée (`g3-image-preview-v1`) pour forcer la régénération des visuels dans `news_cache` et `news_tiles`

### 3. **NewsCard** (`/components/NewsCard.tsx`)
- Style de prompt adapté aux caricatures
- Fallback robuste vers Pollinations en cas d’échec
- Format optimisé : 1080x1440 (3:4 portrait)

## Fonctionnement

1. **Gemini génère l’analyse** (texte, sources, headlines)
2. **Gemini Image génère les caricatures** en parallèle pour chaque article
3. Les images sont intégrées comme `base64 data URLs`
4. Si échec : **Pollinations prend le relais** automatiquement

## Avantages

✅ **Style cohérent** : Caricatures satiriques françaises  
✅ **Raisonnement visuel** : Gemini 3 améliore l’OCR implicite et la fidélité via `media_resolution_high`  
✅ **Fiabilité** : Double fallback (Gemini → Pollinations)  
✅ **Qualité** : Génération native en 4K avec text rendering propre  

## Exemple de prompt généré

```
Political satire cartoon in the style of French press illustrators (Plantu, Cabu, Wolinski). 
Black ink drawing, editorial cartoon, satirical illustration. 
Subject: [Image prompt de l'article]. 
Style: bold lines, exaggerated features, minimalist, newspaper editorial style, 
high contrast black and white with selective color accents.
```

## Test manuel

Pour tester la génération d'une image :

```typescript
import { getImagenService } from './services/imagenService';

const service = getImagenService();
const imageUrl = await service.generateCaricature({
  prompt: "Macron and Trump shaking hands",
  aspectRatio: "3:4"
});

console.log(imageUrl); // data:image/png;base64,...
```

## Notes importantes

- Les images sont en **base64** donc plus volumineuses en mémoire
- Limite : **10 images par prompt** selon la doc Gemini
- Ratio supportés : `1:1`, `3:4`, `4:3`, `9:16`, `16:9`, `21:9`
- Watermark **SynthID** invisible sur toutes les images Gemini
