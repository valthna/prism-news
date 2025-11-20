# 🍌 Migration vers Gemini 2.5 Flash Image (Nano Banana)

## Changements effectués

### 1. **Service Imagen** (`/services/imagenService.ts`)
- Modèle : `gemini-2.5-flash-image` (Nano Banana 🍌)
- Style : **Caricatures satiriques** à la française (Plantu, Cabu, Wolinski)
- Format : 16:9 par défaut (optimisé pour desktop)
- Génération : Rapide et fiable avec Google Gemini

### 2. **Intégration dans le flux** (`/services/geminiService.ts`)
- Les images sont **pré-générées** lors de la récupération des articles
- Génération **en parallèle** pour tous les articles (performance optimale)
- **Fallback automatique** vers Pollinations si échec Gemini

### 3. **NewsCard** (`/components/NewsCard.tsx`)
- Style de prompt adapté aux caricatures
- Fallback robuste vers Pollinations en cas d’échec
- Format optimisé : 1920x1080 (16:9)

## Fonctionnement

1. **Gemini génère l’analyse** (texte, sources, headlines)
2. **Gemini Image génère les caricatures** en parallèle pour chaque article
3. Les images sont intégrées comme `base64 data URLs`
4. Si échec : **Pollinations prend le relais** automatiquement

## Avantages

✅ **Style cohérent** : Caricatures satiriques françaises  
✅ **Vitesse** : Modèle Flash ultra-rapide  
✅ **Fiabilité** : Double fallback (Gemini → Pollinations)  
✅ **Qualité** : Gemini pour les caricatures > Flux-pro pour photos  

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
  aspectRatio: "16:9"
});

console.log(imageUrl); // data:image/png;base64,...
```

## Notes importantes

- Les images sont en **base64** donc plus volumineuses en mémoire
- Limite : **10 images par prompt** selon la doc Gemini
- Ratio supportés : `1:1`, `3:4`, `4:3`, `9:16`, `16:9`, `21:9`
- Watermark **SynthID** invisible sur toutes les images Gemini
