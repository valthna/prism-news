import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { NewsArticle, UserComment, Source } from '../types';
import { getImagenService } from './imagenService';
import { supabase } from './supabaseClient';

console.log("GeminiService Module Loaded");

// Algorithme de calcul de fiabilité basé sur des données tangibles
const calculateReliability = (sources: Source[]): number => {
  let score = 50; // Score de base plus élevé

  // 1. Quantité de sources (Max +25)
  // On valorise le fait d'avoir plusieurs sources pour recouper l'info
  score += Math.min(sources.length * 5, 25);

  // 2. Diversité du spectre (Max +20)
  const hasLeft = sources.some(s => s.bias === 'left');
  const hasRight = sources.some(s => s.bias === 'right');
  const hasCenter = sources.some(s => s.bias === 'center' || s.bias === 'neutral');

  if (hasLeft && hasRight) {
    score += 15; // Forte polarité couverte
  }
  if (hasCenter) {
    score += 5; // Point de référence neutre
  }

  // 3. Bonus "Mainstream" (Si sources > 4, c'est probablement une grosse info bien couverte)
  if (sources.length >= 4) score += 5;

  // 4. Pénalités
  if (sources.length < 2) score -= 30; // Pénalité critique si source unique
  if (sources.length === 2) score -= 10;

  // Bornage strict entre 20 et 98
  return Math.min(Math.max(score, 20), 98);
};

const fetchNewsArticles = async (query?: string, category?: string): Promise<NewsArticle[]> => {
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  let taskDescription = "Identifie les 4 actualités les plus importantes du moment via Google Search.";
  if (query) {
    taskDescription = `Identifie les 4 actualités les plus pertinentes liées à la recherche : "${query}".`;
  } else if (category && category !== 'Général') {
    taskDescription = `Identifie les 4 actualités les plus importantes dans la catégorie : "${category}".`;
  }

  // --- SUPABASE CACHE CHECK ---
  const cacheKey = query ? `query:${query.toLowerCase().trim()}` : (category ? `category:${category.toLowerCase().trim()}` : 'general');

  try {
    console.log("[PRISM] Checking API Key:", process.env.API_KEY ? "Present" : "Missing");
    // Check for API Key inside the try block to allow fallback to mocks
    if (!process.env.API_KEY) {
       throw new Error("API_KEY environment variable is not set. Switching to mock data.");
    }

    if (supabase) {
    try {
      const { data: cachedData, error } = await supabase
        .from('news_cache')
        .select('*')
        .eq('search_key', cacheKey)
        .gt('created_at', new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()) // Valid for 12 hours
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && cachedData && cachedData.length > 0) {
        console.log(`[PRISM] Cache hit for key: ${cacheKey}`);
        return cachedData[0].articles as NewsArticle[];
      }
    } catch (err) {
      console.warn("[PRISM] Cache check failed:", err);
    }
  }
  console.log(`[PRISM] Cache NOT FOUND for key: ${cacheKey}, generating new content...`);
  
  // FORCE MOCK FOR TESTING
  throw new Error("Forcing Mock Data for UI Test");

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

  const prompt = `
    Nous sommes le ${today} et il est ${now}.
    Tu es "PRISM", un moteur d'intelligence artificielle ultra-rapide d'analyse de l'actualité.
    
    TACHE : ${taskDescription}
    
    RÈGLES IMPÉRATIVES POUR LES SOURCES :
    1. **QUANTITÉ** : Tu dois trouver MINIMUM 3 à 5 sources distinctes pour CHAQUE article. C'est OBLIGATOIRE pour croiser les faits.
    2. **DIVERSITÉ** : Cherche activement des sources de GAUCHE, de DROITE et du CENTRE pour le même sujet.
    3. **PRÉCISION** : Utilise le nom de domaine racine (ex: 'lemonde.fr') pour le champ 'name'.
    4. **POSITIONNEMENT VÉRIFIÉ** : Base-toi sur des sources de référence reconnues pour déterminer le positionnement politique :
       - Pour médias internationaux : Media Bias/Fact Check, AllSides, Ad Fontes Media
       - Pour médias français : Décodex (Le Monde), études académiques
       - Le champ "position" (0-100) doit refléter ces classifications établies, pas une interprétation subjective.
       - Sois cohérent : Le Monde (~25-35), Le Figaro (~65-75), Reuters/AFP (~48-52), Fox News (~85-95), etc.
    
    RÈGLES VISUELLES :
    1. Associe à chaque article un **EMOJI UNIQUE** qui représente le sujet (ex: 🚜, 🗳️, 📉).
    2. Images: Prompt pour une **CARICATURE DE PRESSE SATIRIQUE** (Style encre, Plantu/Canard Enchaîné). Prompt en ANGLAIS.
    
    FORMAT JSON STRICT (Tableau d'objets) :
    [
      {
        "id": "unique_string",
        "headline": "Titre percutant (Max 10 mots)",
        "summary": "Résumé dense de l'info et des enjeux (Max 2 phrases)",
        "detailedSummary": "Analyse approfondie de l'événement, du contexte et des implications (3-4 phrases).",
        "importance": "Pourquoi c'est important ? Explique l'impact majeur de cette nouvelle (2 phrases).",
        "emoji": "🇪🇺",
        "publishedAt": "Temps relatif précis en Français basé sur la date réelle des articles (ex: 'IL Y A 2H', '14:30', 'HIER', 'EN DIRECT', 'IL Y A 15 MIN'). Si c'est un événement en cours, mettre 'EN DIRECT'.",
        "imagePrompt": "Political satire cartoon illustration of [subject]...",
        "imageUrl": "URL réelle ou vide",
        "biasAnalysis": { "left": 0, "center": 0, "right": 0, "reliabilityScore": 0 }, // Laisse reliabilityScore à 0, je le calculerai.
        "sources": [
          {
            "name": "lemonde.fr", 
            "bias": "left" | "center" | "right" | "neutral",
            "logoUrl": "",
            "position": number (0-100, 0=gauche, 100=droite),
            "coverageSummary": "Angle spécifique de ce média (1 phrase)",
            "url": "" // Laisse vide, je vais le générer pour éviter les 404
          },
          ... (Minimum 3 sources !)
        ],
        "sentiment": { "positive": "Argumentaire pour...", "negative": "Argumentaire contre..." }
      }
    ]
  `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.3,
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
      },
    });

    const textResponse = response.text;

    if (!textResponse) {
      throw new Error("PRISM n'a reçu aucune donnée (Blocage ou Timeout).");
    }

    let jsonString = textResponse;
    const jsonMatch = textResponse.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      jsonString = jsonMatch[1];
    } else {
      jsonString = jsonString.replace(/```/g, '').trim();
    }

    let articlesData;
    try {
      articlesData = JSON.parse(jsonString);
    } catch (e) {
      console.error("Erreur de parsing PRISM:", e);
      throw new Error("Erreur de formatage des données PRISM.");
    }

    if (!Array.isArray(articlesData)) {
      throw new Error("Structure de données invalide.");
    }

    const articles: NewsArticle[] = articlesData.map((article: any, index: number) => {
      const safeId = article.id || `prism-${Date.now()}-${index}`;

      const safeSources = (article.sources || []).map((source: any) => {
        // Nettoyage du nom pour les logos
        let cleanDomain = source.name.toLowerCase().replace(/\s+/g, '').replace(/[^\w.-]/g, '');
        if (!cleanDomain.includes('.')) cleanDomain += '.com';

        // CONSTRUCTION D'URL ROBUSTE (ANTI-404)
        const reliableUrl = `https://www.google.com/search?q=${encodeURIComponent(article.headline + " " + source.name)}`;

        return {
          ...source,
          logoUrl: `https://logo.clearbit.com/${cleanDomain}`,
          url: reliableUrl
        };
      });

      // --- CALCUL DE L'INDICE DE CONFIANCE RÉEL ---
      const calculatedReliability = calculateReliability(safeSources);

      // Mise à jour de l'analyse de biais avec le score calculé
      const updatedBiasAnalysis = {
        ...article.biasAnalysis,
        reliabilityScore: calculatedReliability
      };

      const initialComments: UserComment[] = [
        {
          id: `c1-${safeId}`,
          author: 'User_Alpha',
          text: article.sentiment?.positive || "Intéressant point de vue.",
          sentiment: 'positive',
          timestamp: Date.now() - 60000 * (index + 1),
          likes: Math.floor(Math.random() * 50) + 5
        },
        {
          id: `c2-${safeId}`,
          author: 'Sceptic_X',
          text: article.sentiment?.negative || "Je ne suis pas convaincu.",
          sentiment: 'negative',
          timestamp: Date.now() - 30000 * (index + 1),
          likes: Math.floor(Math.random() * 50) + 5
        }
      ];

      return {
        ...article,
        id: safeId,
        // Utilisation de la date générée par l'IA, ou fallback si manquant
        publishedAt: article.publishedAt || "RÉCENT",
        emoji: article.emoji || '📰',
        sources: safeSources,
        biasAnalysis: updatedBiasAnalysis,
        comments: initialComments,
        detailedSummary: article.detailedSummary || article.summary, // Fallback
        importance: article.importance || "Information clé pour comprendre l'actualité." // Fallback
      };
    });

    // Génération des images avec Gemini 2.5 Flash Image (Nano Banana)
    try {
      const imagenService = getImagenService();
      const imagePromises = articles.map(async (article) => {
        try {
          const imageUrl = await imagenService.generateCaricature({
            prompt: article.imagePrompt,
            aspectRatio: "16:9"
          });
          return { ...article, imageUrl };
        } catch (error) {
          console.error(`Échec génération image pour "${article.headline}":`, error);
          // Retourne l'article sans imageUrl, NewsCard utilisera Pollinations en fallback
          return article;
        }
      });

      // Attend toutes les générations en parallèle
      const articlesWithImages = await Promise.all(imagePromises);

      // --- SAVE TO SUPABASE CACHE ---
      if (supabase) {
        try {
          await supabase.from('news_cache').insert({
            search_key: cacheKey,
            articles: articlesWithImages
          });
          console.log(`[PRISM] Saved to cache: ${cacheKey}`);
        } catch (err) {
          console.warn("[PRISM] Failed to save to cache:", err);
        }
      }

      return articlesWithImages;
    } catch (error) {
      console.error("Erreur service Imagen, utilisation de Pollinations en fallback:", error);
      // --- SAVE TO SUPABASE CACHE (EVEN WITHOUT IMAGES) ---
      if (supabase) {
        try {
          await supabase.from('news_cache').insert({
            search_key: cacheKey,
            articles: articles
          });
        } catch (err) {
          console.warn("[PRISM] Failed to save to cache (fallback):", err);
        }
      }
      return articles; // Retourne les articles sans images Gemini
    }

  } catch (error) {
    console.error("Erreur Service PRISM (Switch to Mock Data):", error);

    // MOCK DATA FALLBACK FOR DESIGN TESTING
    return [
      {
        id: "mock-1",
        headline: "L'IA Générative bouleverse l'économie mondiale : Bulle ou Révolution ?",
        summary: "Alors que les investissements explosent, les experts sont divisés sur l'impact réel à long terme. Une analyse des tendances actuelles et des prévisions pour 2025.",
        detailedSummary: "L'intelligence artificielle générative connaît une croissance exponentielle, attirant des milliards de dollars d'investissements. Cependant, des voix s'élèvent pour mettre en garde contre une potentielle bulle spéculative, rappelant la bulle internet des années 2000. Les entreprises doivent désormais prouver la rentabilité de ces technologies au-delà de l'effet de mode.",
        importance: "Cette technologie a le potentiel de redéfinir le marché du travail et la productivité mondiale, mais une correction brutale pourrait déstabiliser les marchés financiers.",
        emoji: "🤖",
        publishedAt: "EN DIRECT",
        imagePrompt: "Futuristic stock market crash caused by robots, satirical style",
        imageUrl: "",
        biasAnalysis: { left: 30, center: 40, right: 30, reliabilityScore: 88 },
        sources: [
          { name: "techcrunch.com", bias: "center", logoUrl: "https://logo.clearbit.com/techcrunch.com", position: 50, coverageSummary: "Analyse technique", url: "#" },
          { name: "wsj.com", bias: "right", logoUrl: "https://logo.clearbit.com/wsj.com", position: 80, coverageSummary: "Perspective économique", url: "#" },
          { name: "guardian.co.uk", bias: "left", logoUrl: "https://logo.clearbit.com/theguardian.com", position: 20, coverageSummary: "Impact social", url: "#" }
        ],
        sentiment: { positive: "Innovation majeure", negative: "Risque de chômage" },
        comments: []
      },
      {
        id: "mock-2",
        headline: "Crise Climatique : Les nouveaux accords de Paris jugés 'insuffisants'",
        summary: "Les scientifiques alertent sur l'accélération du réchauffement malgré les promesses politiques. Les activistes demandent des actions immédiates.",
        detailedSummary: "Malgré de nouveaux engagements internationaux, les émissions de gaz à effet de serre continuent d'augmenter. Le rapport du GIEC souligne que les mesures actuelles ne permettront pas de limiter le réchauffement à 1.5°C. La pression monte sur les gouvernements pour adopter des politiques plus radicales.",
        importance: "L'avenir climatique de la planète se joue dans cette décennie. L'inaction pourrait entraîner des conséquences irréversibles sur les écosystèmes et les populations humaines.",
        emoji: "🌍",
        publishedAt: "IL Y A 2H",
        imagePrompt: "Earth melting like ice cream, political satire",
        imageUrl: "",
        biasAnalysis: { left: 60, center: 20, right: 20, reliabilityScore: 92 },
        sources: [
          { name: "lemonde.fr", bias: "left", logoUrl: "https://logo.clearbit.com/lemonde.fr", position: 30, coverageSummary: "Focus écologique", url: "#" },
          { name: "lefigaro.fr", bias: "right", logoUrl: "https://logo.clearbit.com/lefigaro.fr", position: 70, coverageSummary: "Aspect économique", url: "#" }
        ],
        sentiment: { positive: "Prise de conscience", negative: "Inaction politique" },
        comments: []
      }
    ];
  }
};

export { fetchNewsArticles };