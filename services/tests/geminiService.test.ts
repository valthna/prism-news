import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchNewsArticles } from '../geminiService';

// --- MOCKS ---

// Mock de GoogleGenAI
const mockGenerateContent = vi.fn();
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    get models() {
      return {
        generateContent: mockGenerateContent
      };
    }
  },
  HarmCategory: { HARM_CATEGORY_HARASSMENT: 'HARM_CATEGORY_HARASSMENT' },
  HarmBlockThreshold: { BLOCK_NONE: 'BLOCK_NONE' }
}));

// Mock de Supabase (pour éviter les appels DB)
vi.mock('../services/supabaseClient', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ gt: () => ({ order: () => ({ limit: () => ({ data: [], error: null }) }) }) }) }),
      insert: () => ({ error: null }),
      upsert: () => ({ error: null }),
      delete: () => ({ in: () => ({ error: null }) }),
    }),
    storage: {
        from: () => ({
            upload: () => ({ error: null }),
            getPublicUrl: () => ({ data: { publicUrl: 'https://mock.url/img.png' } })
        })
    }
  }
}));

// Mock des variables d'environnement
const originalEnv = process.env;

describe('PRISM Gemini Service', () => {
  
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    process.env = { ...originalEnv, API_KEY: 'fake-gemini-key' };
    
    // Mock global fetch pour Firecrawl
    global.fetch = vi.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.useRealTimers();
  });

  it('should trigger Deep Harvest when Firecrawl API Key is present', async () => {
    process.env.FIRECRAWL_API_KEY = 'fake-fc-key';

    // Mock Firecrawl Response (Success)
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [{ title: 'Test News', url: 'https://test.com', markdown: 'Content' }] })
    });

    // Mock Gemini Response (Success)
    mockGenerateContent.mockResolvedValue({
      text: () => JSON.stringify([{
        id: '1',
        headline: 'Test Article',
        sources: [{ name: 'source.com', bias: 'center' }]
      }])
    });

    const articles = await fetchNewsArticles('test query');

    // Vérifie que fetch a été appelé (Deep Harvest)
    const firecrawlCalls = (global.fetch as any).mock.calls.filter((call: any) => 
      call[0].includes('api.firecrawl.dev')
    );
    expect(firecrawlCalls.length).toBeGreaterThan(0);
    
    // Vérifie que Gemini a été appelé
    expect(mockGenerateContent).toHaveBeenCalled();
    
    // Vérifie le retour (min 10 articles grâce au fallback stratégique)
    expect(articles.length).toBeGreaterThanOrEqual(1);
    // Le premier article devrait être celui mocké si le tri est correct, ou au moins présent
    const found = articles.find(a => a.headline === 'Test Article');
    expect(found).toBeDefined();
  });

  it('should fallback to Google Search Tool if Firecrawl fails or key is missing', async () => {
    delete process.env.FIRECRAWL_API_KEY;

    // Mock Gemini Response
    mockGenerateContent.mockResolvedValue({
      text: () => JSON.stringify([{ id: '1', headline: 'Fallback News', sources: [] }])
    });

    await fetchNewsArticles('test query');

    // Fetch vers Firecrawl ne doit PAS être appelé
    const firecrawlCalls = (global.fetch as any).mock.calls.filter((call: any) => 
      typeof call[0] === 'string' && call[0].includes('api.firecrawl.dev')
    );
    expect(firecrawlCalls.length).toBe(0);

    // Gemini doit être appelé avec l'outil googleSearch
    expect(mockGenerateContent).toHaveBeenCalled();
    const callArgs = mockGenerateContent.mock.calls[0][0];
    // Vérifie la présence de l'outil dans la config envoyée à Gemini
    expect(JSON.stringify(callArgs.config)).toContain('googleSearch');
  });

  it('should retry Gemini call on failure (Model Cascading)', async () => {
    // 1er appel : Fail (404 Model Not Found)
    mockGenerateContent.mockRejectedValueOnce({ message: '404 models/gemini-2.0-flash not found' });
    // 2ème appel : Success
    mockGenerateContent.mockResolvedValueOnce({
      text: () => JSON.stringify([{ id: '1', headline: 'Success After Retry', sources: [] }])
    });

    await fetchNewsArticles('retry test');

    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it('should clean and parse dirty JSON response from LLM', async () => {
    const dirtyJson = `
      Here is the json:
      \`\`\`json
      [
        {
          "id": "1",
          "headline": "Cleaned Article",
          "sources": []
        }
      ]
      \`\`\`
      Hope this helps.
    `;

    mockGenerateContent.mockResolvedValue({
      text: () => dirtyJson
    });

    const articles = await fetchNewsArticles('json test');
    expect(articles[0].headline).toBe('Cleaned Article');
  });
});

