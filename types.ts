
export type Bias = 'left' | 'center' | 'right' | 'neutral';

export interface Source {
  name: string;
  bias: Bias;
  logoUrl: string;
  position: number; // Position on spectrum from 0 (left) to 100 (right)
  coverageSummary: string; // Detailed analysis of the source's angle on the story
  url: string; // Link to the actual article
  isVerified?: boolean; // True si la source a réellement couvert le sujet (non amplifiée)
}

export interface BiasAnalysis {
  left: number;
  center: number;
  right: number;
  consensusScore: number;
}

export interface Sentiment {
  positive: string; // Representative positive/supportive comment
  negative: string; // Representative negative/critical comment
}

export interface UserComment {
  id: string;
  author: string;
  text: string;
  sentiment: 'positive' | 'negative';
  timestamp: number;
  likes: number;
}

export interface NewsArticle {
  id: string;
  headline: string;
  summary: string;
  publishedAt?: string; // Heure ou date de publication (ex: "LIVE", "Il y a 2h")
  emoji: string; // New: Single emoji representing the topic
  category?: string; // Catégorie éditoriale (Politique, Économie, etc.)
  imagePrompt: string;
  imageUrl?: string; // URL réelle de l'image si trouvée
  biasAnalysis: BiasAnalysis;
  sources: Source[];
  sentiment: Sentiment; // Added sentiment analysis
  comments: UserComment[]; // List of user comments
  detailedSummary?: string; // Detailed analysis of the article
  importance?: string; // Why this news is important
}

export interface ChatMessagePart {
  text: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: ChatMessagePart[];
}
