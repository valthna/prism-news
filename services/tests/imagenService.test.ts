import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let getImagenService: typeof import('../imagenService').getImagenService;

const mockGenerateContent = vi.fn();
const recordImagenUsageMock = vi.fn();

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    get models() {
      return {
        generateContent: mockGenerateContent,
      };
    }
  },
}));
vi.mock('../aiUsageLogger', () => ({
  recordImagenUsage: recordImagenUsageMock,
  recordGeminiUsage: vi.fn(),
}));

const mockStorageUpload = vi.fn(async () => ({ error: null }));
const mockStorageGetPublicUrl = vi.fn(() => ({ data: { publicUrl: 'https://supabase.mock/image.png' } }));
const mockStorageRemove = vi.fn(async () => ({ error: null }));

vi.mock('../supabaseClient', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: mockStorageUpload,
        getPublicUrl: mockStorageGetPublicUrl,
        remove: mockStorageRemove,
      })
    }
  }
}));

const originalEnv = process.env;

const buildImageResponse = (base64 = 'AAAABBBB') => ({
  candidates: [
    {
      content: {
        parts: [
          {
            inlineData: {
              data: base64,
              mimeType: 'image/png'
            }
          }
        ]
      }
    }
  ]
});

describe('ImagenService – APIs externes', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    mockGenerateContent.mockReset();
    recordImagenUsageMock.mockReset();
    mockStorageUpload.mockImplementation(async () => ({ error: null }));
    mockStorageGetPublicUrl.mockImplementation(() => ({ data: { publicUrl: 'https://supabase.mock/image.png' } }));

    vi.stubGlobal('crypto', {
      randomUUID: () => 'test-uuid',
    });

    process.env = { ...originalEnv, API_KEY: 'fake-imagen-key' };

    ({ getImagenService } = await import('../imagenService'));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = originalEnv;
  });

  it('uploade l’image sur Supabase quand Gemini renvoie des données inline', async () => {
    const imagenService = getImagenService();
    mockGenerateContent.mockResolvedValue(buildImageResponse());

    const imageUrl = await imagenService.generateCaricature({ prompt: 'Test upload' });

    expect(mockGenerateContent).toHaveBeenCalled();
    expect(mockStorageUpload).toHaveBeenCalledTimes(1);
    expect(imageUrl).toBe('https://supabase.mock/image.png');
  });

  it('bascule en base64 et coupe les uploads après un échec réseau Supabase', async () => {
    const imagenService = getImagenService();
    mockGenerateContent.mockResolvedValue(buildImageResponse('CCCCDDDD'));
    mockStorageUpload.mockResolvedValueOnce({ error: new TypeError('Failed to fetch') });

    const fallbackImage = await imagenService.generateCaricature({ prompt: 'Test fallback' });
    expect(fallbackImage.startsWith('data:image/png;base64,')).toBe(true);
    expect(mockStorageUpload).toHaveBeenCalledTimes(1);

    const secondImage = await imagenService.generateCaricature({ prompt: 'Test fallback 2' });
    expect(secondImage.startsWith('data:image/png;base64,')).toBe(true);
    expect(mockStorageUpload).toHaveBeenCalledTimes(1);
  });

  it('jette une erreur quand requireHostedImage=true et que l’upload échoue', async () => {
    const imagenService = getImagenService();
    mockGenerateContent.mockResolvedValue(buildImageResponse('EEEFFFFF'));
    mockStorageUpload.mockResolvedValueOnce({ error: new TypeError('Failed to fetch') });

    await expect(
      imagenService.generateCaricature({ prompt: 'Hosted only', requireHostedImage: true })
    ).rejects.toThrow('IMAGEN_UPLOAD_REQUIRED');
  });
});

