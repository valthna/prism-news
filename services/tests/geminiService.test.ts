import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let fetchNewsArticles: typeof import('../geminiService').fetchNewsArticles;

// --- MOCKS ---

// Mock de GoogleGenAI
const mockGenerateContent = vi.fn();
const recordGeminiUsageMock = vi.fn();
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
vi.mock('../aiUsageLogger', () => ({
  recordGeminiUsage: recordGeminiUsageMock,
  recordImagenUsage: vi.fn(),
}));

const mockImagenGenerate = vi.fn();
const isImagenServiceEnabledMock = vi.fn(() => false);
const getImagenServiceMock = vi.fn(() => ({ generateCaricature: mockImagenGenerate }));

vi.mock('../imagenService', () => ({
  SUPABASE_IMAGE_BUCKET: 'news-images',
  getImagenService: getImagenServiceMock,
  isImagenServiceEnabled: isImagenServiceEnabledMock,
}));

const createQueryChain = () => {
  const chain: any = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.gt = vi.fn(() => chain);
  chain.lt = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(async () => ({ data: [], error: null }));
  chain.delete = vi.fn(() => chain);
  chain.in = vi.fn(async () => ({ error: null }));
  chain.upsert = vi.fn(async () => ({ error: null }));
  chain.insert = vi.fn(async () => ({ error: null }));
  return chain;
};

const newsCacheQuery = createQueryChain();
const newsTilesQuery = createQueryChain();
const supabaseUpsertMock = newsTilesQuery.upsert;

const mockStorageUpload = vi.fn(async () => ({ error: null }));
const mockStorageGetUrl = vi.fn(() => ({ data: { publicUrl: 'https://mock.url/img.png' } }));
const mockStorageRemove = vi.fn(async () => ({ error: null }));

vi.mock('../supabaseClient', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'news_cache') return newsCacheQuery;
      if (table === 'news_tiles') return newsTilesQuery;
      return createQueryChain();
    },
    storage: {
      from: () => ({
        upload: mockStorageUpload,
        getPublicUrl: mockStorageGetUrl,
        remove: mockStorageRemove,
      })
    }
  }
}));

const originalEnv = process.env;

const resetQueryChain = (chain: any) => {
  chain.select.mockImplementation(() => chain);
  chain.eq.mockImplementation(() => chain);
  chain.gt.mockImplementation(() => chain);
  chain.lt.mockImplementation(() => chain);
  chain.order.mockImplementation(() => chain);
  chain.limit.mockImplementation(async () => ({ data: [], error: null }));
  chain.delete.mockImplementation(() => chain);
  chain.in.mockImplementation(async () => ({ error: null }));
};

describe('PRISM Gemini Service', () => {
  
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();

    resetQueryChain(newsCacheQuery);
    resetQueryChain(newsTilesQuery);
    supabaseUpsertMock.mockImplementation(async () => ({ error: null }));
    mockStorageUpload.mockImplementation(async () => ({ error: null }));
    mockStorageGetUrl.mockImplementation(() => ({ data: { publicUrl: 'https://mock.url/img.png' } }));
    mockStorageRemove.mockImplementation(async () => ({ error: null }));
    mockGenerateContent.mockReset();
    recordGeminiUsageMock.mockReset();
    mockImagenGenerate.mockReset();
    getImagenServiceMock.mockReturnValue({ generateCaricature: mockImagenGenerate });
    isImagenServiceEnabledMock.mockReset();
    isImagenServiceEnabledMock.mockReturnValue(false);

    const baseEnv = { ...originalEnv };
    delete (baseEnv as any).FIRECRAWL_API_KEY;
    delete (baseEnv as any).VITE_FIRECRAWL_API_KEY;
    process.env = { ...baseEnv, API_KEY: 'fake-gemini-key', DISABLE_IMAGE_GENERATION: '1' };
    
    const defaultVectorResponse = {
      ok: true,
      json: async () => ({
        success: true,
        data: [{ title: 'Mock Headline', url: 'https://source.test/mock', markdown: 'mock content' }]
      })
    };
    global.fetch = vi.fn(() => Promise.resolve(defaultVectorResponse));
    ({ fetchNewsArticles } = await import('../geminiService'));
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.useRealTimers();
  });

  it('should trigger Deep Harvest when Firecrawl API Key is present', async () => {
    process.env.FIRECRAWL_API_KEY = 'fake-fc-key';

    (global.fetch as any).mockImplementation(() => Promise.resolve({
      ok: true,
      json: async () => ({ success: true, data: [{ title: 'Test News', url: 'https://test.com', markdown: 'Content' }] })
    }));

    mockGenerateContent.mockResolvedValue({
      text: () => JSON.stringify([{
        id: '1',
        headline: 'Test Article',
        sources: [{ name: 'source.com', bias: 'center' }]
      }])
    });

    const articles = await fetchNewsArticles('test query');

    const firecrawlCalls = (global.fetch as any).mock.calls.filter((call: any) => 
      typeof call[0] === 'string' && call[0].includes('api.firecrawl.dev')
    );
    expect(firecrawlCalls.length).toBeGreaterThan(0);
    
    expect(mockGenerateContent).toHaveBeenCalled();
    expect(articles.length).toBeGreaterThanOrEqual(1);
    const found = articles.find(a => a.headline === 'Test Article');
    expect(found).toBeDefined();
  });

  it('should fallback to Google Search Tool when Firecrawl request échoue', async () => {
    process.env.FIRECRAWL_API_KEY = 'failing-key';
    (global.fetch as any).mockImplementation(() => Promise.reject(new Error('firecrawl down')));

    mockGenerateContent.mockResolvedValue({
      text: () => JSON.stringify([{ id: '1', headline: 'Fallback News', sources: [] }])
    });

    await fetchNewsArticles('test query');

    const firecrawlCalls = (global.fetch as any).mock.calls.filter((call: any) => 
      typeof call[0] === 'string' && call[0].includes('api.firecrawl.dev')
    );
    expect(firecrawlCalls.length).toBeGreaterThan(0);

    expect(mockGenerateContent).toHaveBeenCalled();
    const callArgs = mockGenerateContent.mock.calls[0][0];
    expect(JSON.stringify(callArgs.config)).toContain('googleSearch');
  });

  it('should retry Gemini call on failure (Model Cascading)', async () => {
    mockGenerateContent.mockRejectedValueOnce({ message: '404 models/gemini-2.0-flash not found' });
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

  it('envoie la requête Firecrawl avec les bons headers et payload', async () => {
    process.env.FIRECRAWL_API_KEY = 'vector-key';
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [{ title: 'Vector News', url: 'https://vector.test', markdown: 'snippet' }] })
    });

    mockGenerateContent.mockResolvedValue({
      text: () => JSON.stringify([{ id: '1', headline: 'Vector Result', sources: [{ name: 'source.com', bias: 'center' }] }])
    });

    await fetchNewsArticles('breaking news');

    const firecrawlCall = (global.fetch as any).mock.calls.find(
      (call: any) => typeof call[0] === 'string' && call[0].includes('api.firecrawl.dev')
    );
    expect(firecrawlCall).toBeDefined();
    const [, options] = firecrawlCall!;
    expect(options.headers.Authorization).toBe('Bearer vector-key');
    const body = JSON.parse(options.body);
    expect(body.limit).toBe(20);
    expect(body.query).toBeTruthy();
  });

  it('persiste les tuiles dans Supabase avec le payload attendu', async () => {
    delete process.env.FIRECRAWL_API_KEY;

    mockGenerateContent.mockResolvedValue({
      text: () => JSON.stringify([
        { id: 'art-1', headline: 'Article 1', sources: [], summary: '', emoji: '' },
        { id: 'art-2', headline: 'Article 2', sources: [], summary: '', emoji: '' }
      ])
    });

    await fetchNewsArticles('supabase test');

    expect(supabaseUpsertMock).toHaveBeenCalled();
    const firstPayload = supabaseUpsertMock.mock.calls[0][0];
    expect(firstPayload.length).toBeLessThanOrEqual(2);
    expect(firstPayload[0]).toHaveProperty('article_id', 'art-1');
    expect(firstPayload[0]).toHaveProperty('search_key');
    expect(firstPayload[0].article.headline).toBe('Article 1');
  });

  it('force la génération d’images hébergées quand Supabase est actif', async () => {
    delete process.env.FIRECRAWL_API_KEY;
    isImagenServiceEnabledMock.mockReturnValue(true);
    mockImagenGenerate.mockResolvedValue('https://supabase.mock/image.png');

    mockGenerateContent.mockResolvedValue({
      text: () => JSON.stringify([
        { id: 'img-1', headline: 'Image Test', sources: [], summary: '', emoji: '' }
      ])
    });

    const promise = fetchNewsArticles('image generation test');
    await vi.runAllTimersAsync();
    await promise;

    expect(mockImagenGenerate).toHaveBeenCalled();
    mockImagenGenerate.mock.calls.forEach(([args]: any[]) => {
      expect(args.requireHostedImage).toBe(true);
    });
    const generatedIds = mockImagenGenerate.mock.calls.map(([args]: any[]) => args.id);
    expect(generatedIds).toContain('img-1');
  });

  it('retourne le fallback si une image ne peut pas être hébergée', async () => {
    delete process.env.FIRECRAWL_API_KEY;
    isImagenServiceEnabledMock.mockReturnValue(true);
    mockImagenGenerate.mockRejectedValue(new Error('IMAGEN_UPLOAD_REQUIRED'));

    mockGenerateContent.mockResolvedValue({
      text: () => JSON.stringify([
        { id: 'img-err', headline: 'Image Failure', sources: [], summary: '', emoji: '' }
      ])
    });

    const promise = fetchNewsArticles('image failure');
    await vi.runAllTimersAsync();
    const articles = await promise;
    expect(articles[0].id.startsWith('strategic-')).toBe(true);
  });

  it('désactive Supabase après un échec réseau lors de l’upsert', async () => {
    delete process.env.FIRECRAWL_API_KEY;

    supabaseUpsertMock.mockImplementationOnce(async () => ({ error: new TypeError('Failed to fetch') }));
    supabaseUpsertMock.mockImplementation(async () => ({ error: null }));

    mockGenerateContent.mockResolvedValue({
      text: () => JSON.stringify([
        { id: 'art-1', headline: 'Article 1', sources: [], summary: '', emoji: '' },
        { id: 'art-2', headline: 'Article 2', sources: [], summary: '', emoji: '' },
        { id: 'art-3', headline: 'Article 3', sources: [], summary: '', emoji: '' }
      ])
    });

    const articles = await fetchNewsArticles('supabase fail test');
    expect(articles[0].id.startsWith('strategic-')).toBe(true);
    expect(supabaseUpsertMock).toHaveBeenCalledTimes(1);
  });
});

