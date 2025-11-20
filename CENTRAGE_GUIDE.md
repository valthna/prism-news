# Guide de Centrage Parfait - PRISM

Ce guide explique comment utiliser les utilitaires de centrage parfait pour les logos et miniatures.

## 🎯 Classes Utilitaires Disponibles

### 1. **`.center-perfect`** (RECOMMANDÉ)
La méthode la plus simple et moderne utilisant CSS Grid.

```html
<!-- Logo centré -->
<div class="center-perfect w-32 h-32 bg-black">
  <img src="/logo.png" alt="Logo PRISM" />
</div>

<!-- Emoji centré -->
<div class="center-perfect w-10 h-10 rounded-full bg-white/5">
  {article.emoji}
</div>
```

**Quand l'utiliser :** 
- ✅ Pour tous vos besoins de centrage (logos, icônes, emoji)
- ✅ Le plus simple et performant
- ✅ Support parfait pour le contenu de toute taille

---

### 2. **`.center-flex`** 
Alternative utilisant Flexbox (si vous préférez cette approche).

```html
<div class="center-flex w-full h-full">
  <span>Contenu centré</span>
</div>
```

**Quand l'utiliser :**
- ✅ Si vous avez déjà du code flexbox
- ✅ Compatible avec gap, flex-wrap, etc.

---

### 3. **`.center-absolute`**
Centrage avec position absolue (pour overlays).

```html
<div class="relative w-full h-64">
  <div class="center-absolute">Overlay centré</div>
</div>
```

**Quand l'utiliser :**
- ✅ Pour des overlays au-dessus d'images
- ✅ Pour des badges ou indicateurs flottants
- ⚠️ Le parent doit avoir `position: relative`

---

## 📸 Classes Spéciales pour Images

### **`.image-center-cover`**
Centrage + `object-fit: cover` (remplit tout l'espace).

```html
<div class="image-center-cover w-full h-96 rounded-2xl overflow-hidden">
  <img src={article.imageUrl} alt="Article" />
</div>
```

**Idéal pour :**
- ✅ Images de fond / hero images
- ✅ Miniatures d'articles
- ✅ Cartes d'actualités

---

### **`.image-center-contain`**
Centrage + `object-fit: contain` (image complète visible).

```html
<div class="image-center-contain w-32 h-32 bg-gray-900">
  <img src="/logo.svg" alt="Logo" />
</div>
```

**Idéal pour :**
- ✅ Logos (pas de crop)
- ✅ Icônes vectorielles
- ✅ Préserver les proportions exactes

---

### **`.logo-center`**
Centrage avec padding de 1rem pour les logos.

```html
<div class="logo-center w-20 h-20 bg-black rounded-full">
  <img src="/prism-logo.svg" alt="PRISM" />
</div>
```

---

## 🎨 Classes Bonus

### **`.center-square`**
Force un ratio 1:1 (carré parfait) avec centrage.

```html
<div class="center-square w-16 bg-white/10 rounded-xl">
  <ChatIcon />
</div>
```

---

### **`.center-animate`**
Centrage avec animation au hover (effet zoom subtil).

```html
<button class="center-animate w-12 h-12 rounded-full bg-white/10">
  <SettingsIcon />
</button>
```

---

## 📝 Exemples Pratiques PRISM

### Exemple 1: Logo dans le Header
```jsx
// App.tsx - Header Logo
<div className="center-perfect h-16">
  <span className="text-2xl font-black italic chromatic-aberration" data-text="PRISM">
    PRISM
  </span>
</div>
```

### Exemple 2: Emoji dans les Cards
```jsx
// NewsCard.tsx - Emoji Badge
<div className="center-perfect w-10 h-10 rounded-full bg-white/5 border border-white/10 shadow-lg">
  <span className="text-xl">{article.emoji}</span>
</div>
```

### Exemple 3: Miniature d'Article (Desktop)
```jsx
// NewsCard.tsx - Desktop Image
<div className="image-center-cover h-full rounded-[24px] overflow-hidden">
  <img 
    src={imageSrc} 
    alt="Article Poster"
    className="transition-transform duration-500 hover:scale-105"
  />
</div>
```

### Exemple 4: Logo de Source dans Modal
```jsx
// SourceDetailModal.tsx - Logo centré
<div className="logo-center w-24 h-24 bg-gray-900 rounded-2xl border border-white/10">
  <img src={source.logoUrl} alt={source.name} />
</div>
```

### Exemple 5: Loading Screen - Particules
```jsx
// App.tsx - Vortex Center
<div className="center-perfect w-48 h-48">
  <div className="center-perfect w-14 h-14 rounded-full bg-black border border-white/30">
    <div className="w-3 h-3 bg-white rounded-full shadow-glow animate-ping" />
  </div>
</div>
```

---

## 🎯 Tableau de Décision Rapide

| Use Case | Classe Recommandée | Raison |
|----------|-------------------|--------|
| Logo simple | `.center-perfect` | Le plus simple |
| Logo SVG (préserver ratio) | `.image-center-contain` | Pas de déformation |
| Image article (crop OK) | `.image-center-cover` | Remplit l'espace |
| Badge circulaire | `.center-square` | Ratio 1:1 garanti |
| Bouton avec icône | `.center-perfect` | Minimal et efficace |
| Overlay sur image | `.center-absolute` | Positionnement libre |
| Animation au hover | `.center-animate` | Effet premium |

---

## 🔥 Tips & Best Practices

1. **Toujours définir width/height** sur le conteneur parent :
   ```jsx
   ✅ <div className="center-perfect w-32 h-32">...</div>
   ❌ <div className="center-perfect">...</div>  // Risque d'affichage incorrect
   ```

2. **Pour les images, toujours ajouter `alt`** :
   ```jsx
   ✅ <img src="..." alt="Description" />
   ❌ <img src="..." />
   ```

3. **Combiner avec vos classes existantes** :
   ```jsx
   <div className="center-perfect w-10 h-10 rounded-full bg-white/5 border border-white/10 shadow-lg">
     {content}
   </div>
   ```

4. **Responsive sizing** avec Tailwind :
   ```jsx
   <div className="center-perfect w-8 h-8 md:w-12 md:h-12 lg:w-16 lg:h-16">
     <Logo />
   </div>
   ```

---

## 💡 Exemple COMPLET : Logo PRISM avec effet Glitch

```jsx
<div className="logo-center w-40 h-40 bg-black rounded-3xl border border-white/20 shadow-2xl">
  <span 
    className="text-5xl font-black italic chromatic-aberration" 
    data-text="PRISM"
  >
    PRISM
  </span>
</div>
```

Résultat : Logo **parfaitement centré**, avec **padding uniforme**, et **effet glitch** chromatic aberration ! 🎨

---

**Créé pour PRISM - L'Actu Spectrale**  
*Centrage parfait, design premium.* ✨
