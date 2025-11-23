# 📊 Documentation Technique : Fiabilité et Positionnement Médias

## 🎯 Vue d'ensemble

Ce document détaille les trois systèmes critiques de PRISM :
1. **Positionnement des médias** sur le spectre politique
2. **Calcul du score de fiabilité**
3. **Génération d'images caricaturales**

---

## 1. 🗺️ Positionnement des Médias

### Sources de référence utilisées

Le positionnement de chaque média sur le spectre politique (0-100) est basé sur **4 organismes indépendants reconnus** :

- **Media Bias/Fact Check (MBFC)** : Base de données collaborative avec méthodologie transparente
- **AllSides Media Bias Ratings** : Notation participative + comité éditorial
- **Décodex (Le Monde)** : Vérification des sources françaises
- **Ad Fontes Media** : Analyse graphique fiabilité × biais

### Échelle de positionnement

```
0 ←──────── 25 ────── 50 ────── 75 ──────→ 100
Extrême    Gauche   Centre   Droite   Extrême
Gauche                                 Droite
```

### Exemples de positionnement vérifiés

#### Gauche (20-40)
- **L'Humanité** : 20 (Left selon Décodex)
- **Mediapart** : 25 (Left selon Décodex)  
- **The Guardian** : 30 (Left selon AllSides)
- **Vox** : 32 (Left selon AllSides)
- **Le Monde** : 35 (Center-Left selon MBFC)

#### Centre (45-55)
- **BBC** : 48 (Center selon AllSides)
- **Reuters, AP, AFP** : 50 (Least Biased selon MBFC)
- **Politico** : 52 (Center selon MBFC)

#### Droite (60-80)
- **The Economist** : 63 (Center-Right selon MBFC)
- **Le Figaro** : 65 (Right-Center selon MBFC)
- **Les Échos** : 67 (Right-Center économique)
- **WSJ** : 68 (Center-Right selon AllSides)
- **NY Post** : 72 (Right selon AllSides)
- **Fox News** : 80 (Right selon AllSides)

---

## 2. 📈 Score de Fiabilité

### Méthodologie en 4 piliers

Le score de fiabilité (20-95%) est calculé selon la méthodologie affichée à l'utilisateur :

#### **Pilier 1 : Couverture médiatique (40%)**
*Actuellement implémenté avec données réelles*

- **Quantité de sources** (20 points max)
  - 8+ sources : 20 pts (excellente)
  - 5-7 sources : 15 pts (bonne)
  - 3-4 sources : 10 pts (acceptable)
  - 2 sources : 5 pts (faible)
  - 1 source : 0 pt (insuffisante)

- **Diversité du spectre** (20 points max)
  - Gauche + Centre + Droite : 20 pts (spectre complet)
  - Deux orientations : 12 pts (bonne diversité)
  - Une seule orientation : 5 pts (diversité limitée)

#### **Pilier 2 : Scores organismes indépendants (35%)**
*À implémenter via APIs MBFC, AllSides, RSF*

Score par défaut : **25 points** (71% de 35)

**TODO** :
- Intégrer l'API Media Bias/Fact Check
- Intégrer l'API AllSides
- Intégrer les données Reporters Sans Frontières

#### **Pilier 3 : Historique de corrections (15%)**
*À implémenter via tracking des errata*

Score par défaut : **12 points** (80% de 15)

**TODO** :
- Tracker les corrections publiées par chaque source
- Construire un historique des errata sur 6 mois
- Appliquer pénalités selon fréquence

#### **Pilier 4 : Signal fact-check temps réel (10%)**
*À implémenter via IFCN et AFP Factuel*

Score par défaut : **8 points** (80% de 10)

**TODO** :
- Intégrer l'API IFCN (International Fact-Checking Network)
- Intégrer AFP Factuel
- Croiser les alertes en temps réel

### Calcul final

```typescript
score = coverageScore (0-40) 
      + independentOrgScore (0-35)
      + correctionHistoryScore (0-15)
      + factCheckScore (0-10)

// Bornage : min 20%, max 95%
finalScore = Math.min(Math.max(score, 20), 95)
```

### Exemples de scores

| Sources | Gauche | Centre | Droite | Score attendu |
|---------|--------|--------|--------|---------------|
| 8+, spectre complet | ✓ | ✓ | ✓ | 85-95% |
| 5-7, deux orientations | ✓ | ✗ | ✓ | 72-82% |
| 3-4, diversité limitée | ✓ | ✓ | ✗ | 62-72% |
| 2, faible couverture | ✓ | ✗ | ✗ | 50-60% |
| 1, source unique | ✓ | ✗ | ✗ | 20-38% |

---

## 3. 🎨 Génération d'Images Caricaturales

### Modèle utilisé

**`gemini-2.0-flash-exp-image-preview`**

- Modèle multimodal optimisé pour la génération d'images
- Spécialisé dans les illustrations conceptuelles
- Meilleur rendu pour le style satirique/éditorial

### Configuration

```typescript
{
  model: "gemini-2.0-flash-exp-image-preview",
  temperature: 0.7,  // Créativité accrue pour les caricatures
  responseModalities: ["image"],
  aspectRatio: "3:4"  // Format portrait optimal
}
```

### Style de prompt

Les prompts suivent la structure définie dans `PRISM_PROMPTS.IMAGE_GENERATION` :

- **Style** : Illustration éditoriale conceptuelle
- **Technique** : Encre + aquarelle
- **Composition** : Métaphores visuelles, symbolique
- **Éviter** : Portraits littéraux, poignées de main, photos réalistes

**Exemple de prompt enrichi** :
```
Premium conceptual illustration for a PRISM news tile. 
Political satire cartoon style. 
Subject: EU regulation on AI systems.
Surrealist metaphor: Giant clockwork mechanism suspended over 
European Parliament building. 
Ink linework with selective watercolor. 
No text, no photorealism, no men in suits.
```

---

## 📋 Checklist de vérification

### ✅ Implémenté

- [x] Positionnement médias basé sur MBFC, AllSides, Décodex
- [x] Calcul fiabilité Pilier 1 (Couverture médiatique)
- [x] Génération images via gemini-2.0-flash-exp-image-preview
- [x] Upload Supabase pour persistance images
- [x] Affichage sources de vérification dans UI

### ⏳ En attente d'intégration

- [ ] API Media Bias/Fact Check (Pilier 2)
- [ ] API AllSides Media Bias (Pilier 2)
- [ ] Données Reporters Sans Frontières (Pilier 2)
- [ ] Tracking historique corrections (Pilier 3)
- [ ] API IFCN / AFP Factuel (Pilier 4)

---

## 🔍 Tests de vérification

### Test 1 : Vérifier le positionnement

```typescript
// Vérifier qu'un média connu est bien positionné
const leMonde = sources.find(s => s.name === 'lemonde.fr');
console.assert(leMonde.position === 35, "Le Monde doit être à 35");
console.assert(leMonde.bias === 'left', "Le Monde doit être classé 'left'");
```

### Test 2 : Vérifier la fiabilité

```typescript
// Spectre complet avec 8 sources
const sources = [
  { bias: 'left', ... },    // x3
  { bias: 'center', ... },  // x3
  { bias: 'right', ... },   // x2
];
const score = calculateReliability(sources);
console.assert(score >= 85, "8 sources avec spectre complet = score élevé");
```

### Test 3 : Vérifier le modèle d'image

```typescript
// Le modèle doit être gemini-2.0-flash-exp-image-preview
const modelName = imagenService.getCurrentModel();
console.assert(
  modelName === "gemini-2.0-flash-exp-image-preview",
  "Le modèle d'image doit être gemini-2.0-flash-exp-image-preview"
);
```

---

**Dernière mise à jour** : 2025-11-22  
**Version** : 2.0  
**Auteur** : PRISM Team
