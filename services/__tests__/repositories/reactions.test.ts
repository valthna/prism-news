/**
 * Tests pour le ReactionsRepository
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockSupabaseClient } from '../setup';

const mockSupabase = createMockSupabaseClient();

vi.mock('../../api/supabase', () => ({
  getSupabaseClient: () => mockSupabase,
  isSupabaseActive: () => true,
  withSupabaseErrorHandling: async (
    _op: string,
    fn: (client: any) => Promise<any>
  ) => {
    try {
      return await fn(mockSupabase);
    } catch {
      return null;
    }
  },
}));

describe('Repositories - ReactionsRepository', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    // Reset localStorage mock
    const storage: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => storage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        storage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete storage[key];
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Local Storage Operations', () => {
    describe('getUserReactions', () => {
      it('should return empty object when no reactions stored', async () => {
        const { getUserReactions } = await import(
          '../../repositories/ReactionsRepository'
        );

        const result = getUserReactions();

        expect(result).toEqual({});
      });

      it('should return stored reactions', async () => {
        const stored = { 'article-1': 'fire', 'article-2': 'clap' };
        (localStorage.getItem as any).mockReturnValue(JSON.stringify(stored));

        const { getUserReactions } = await import(
          '../../repositories/ReactionsRepository'
        );

        const result = getUserReactions();

        expect(result).toEqual(stored);
      });
    });

    describe('saveUserReaction', () => {
      it('should save reaction to localStorage', async () => {
        const { saveUserReaction, getUserReactions } = await import(
          '../../repositories/ReactionsRepository'
        );

        saveUserReaction('article-1', 'fire');

        expect(localStorage.setItem).toHaveBeenCalled();
      });

      it('should remove reaction when null', async () => {
        const stored = { 'article-1': 'fire' };
        (localStorage.getItem as any).mockReturnValue(JSON.stringify(stored));

        const { saveUserReaction } = await import(
          '../../repositories/ReactionsRepository'
        );

        saveUserReaction('article-1', null);

        const savedCall = (localStorage.setItem as any).mock.calls[0];
        const savedData = JSON.parse(savedCall[1]);
        expect(savedData['article-1']).toBeUndefined();
      });
    });

    describe('getUserReactionForArticle', () => {
      it('should return null for no reaction', async () => {
        const { getUserReactionForArticle } = await import(
          '../../repositories/ReactionsRepository'
        );

        const result = getUserReactionForArticle('no-reaction');

        expect(result).toBeNull();
      });

      it('should return stored reaction', async () => {
        const stored = { 'article-1': 'shock' };
        (localStorage.getItem as any).mockReturnValue(JSON.stringify(stored));

        const { getUserReactionForArticle } = await import(
          '../../repositories/ReactionsRepository'
        );

        const result = getUserReactionForArticle('article-1');

        expect(result).toBe('shock');
      });
    });
  });

  describe('Supabase Operations', () => {
    describe('getArticleReactions', () => {
      it('should return default counts when no data', async () => {
        mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

        const { getArticleReactions } = await import(
          '../../repositories/ReactionsRepository'
        );

        const result = await getArticleReactions('article-1');

        expect(result).toEqual({
          fire: 0,
          shock: 0,
          doubt: 0,
          angry: 0,
          clap: 0,
        });
      });

      it('should return reaction counts', async () => {
        mockSupabase.rpc.mockResolvedValue({
          data: [
            { reaction_type: 'fire', count: 10 },
            { reaction_type: 'clap', count: 5 },
          ],
          error: null,
        });

        const { getArticleReactions } = await import(
          '../../repositories/ReactionsRepository'
        );

        const result = await getArticleReactions('article-1');

        expect(result.fire).toBe(10);
        expect(result.clap).toBe(5);
        expect(result.shock).toBe(0);
      });
    });

    describe('getMultipleArticlesReactions', () => {
      it('should return empty object for empty input', async () => {
        const { getMultipleArticlesReactions } = await import(
          '../../repositories/ReactionsRepository'
        );

        const result = await getMultipleArticlesReactions([]);

        expect(result).toEqual({});
      });

      it('should return reactions for multiple articles', async () => {
        mockSupabase.rpc.mockResolvedValue({
          data: [
            { article_id: 'art-1', reaction_type: 'fire', count: 5 },
            { article_id: 'art-2', reaction_type: 'shock', count: 3 },
          ],
          error: null,
        });

        const { getMultipleArticlesReactions } = await import(
          '../../repositories/ReactionsRepository'
        );

        const result = await getMultipleArticlesReactions(['art-1', 'art-2']);

        expect(result['art-1'].fire).toBe(5);
        expect(result['art-2'].shock).toBe(3);
      });

      it('should initialize all articles with default counts', async () => {
        mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

        const { getMultipleArticlesReactions } = await import(
          '../../repositories/ReactionsRepository'
        );

        const result = await getMultipleArticlesReactions(['art-1', 'art-2']);

        expect(result['art-1']).toEqual({
          fire: 0,
          shock: 0,
          doubt: 0,
          angry: 0,
          clap: 0,
        });
        expect(result['art-2']).toEqual({
          fire: 0,
          shock: 0,
          doubt: 0,
          angry: 0,
          clap: 0,
        });
      });
    });

    describe('incrementReaction', () => {
      it('should call RPC and return new count', async () => {
        mockSupabase.rpc.mockResolvedValue({ data: 11, error: null });

        const { incrementReaction } = await import(
          '../../repositories/ReactionsRepository'
        );

        const result = await incrementReaction('article-1', 'fire');

        expect(result).toBe(11);
        expect(mockSupabase.rpc).toHaveBeenCalledWith('increment_reaction', {
          p_article_id: 'article-1',
          p_reaction_type: 'fire',
        });
      });

      it('should save to localStorage', async () => {
        mockSupabase.rpc.mockResolvedValue({ data: 1, error: null });

        const { incrementReaction } = await import(
          '../../repositories/ReactionsRepository'
        );

        await incrementReaction('article-1', 'clap');

        expect(localStorage.setItem).toHaveBeenCalled();
      });
    });

    describe('decrementReaction', () => {
      it('should call RPC and return new count', async () => {
        mockSupabase.rpc.mockResolvedValue({ data: 9, error: null });

        const { decrementReaction } = await import(
          '../../repositories/ReactionsRepository'
        );

        const result = await decrementReaction('article-1', 'fire');

        expect(result).toBe(9);
        expect(mockSupabase.rpc).toHaveBeenCalledWith('decrement_reaction', {
          p_article_id: 'article-1',
          p_reaction_type: 'fire',
        });
      });
    });

    describe('toggleReaction', () => {
      it('should decrement old and increment new reaction', async () => {
        mockSupabase.rpc
          .mockResolvedValueOnce({ data: 9, error: null }) // decrement
          .mockResolvedValueOnce({ data: 1, error: null }); // increment

        const { toggleReaction } = await import(
          '../../repositories/ReactionsRepository'
        );

        const result = await toggleReaction('article-1', 'clap', 'fire');

        expect(result.success).toBe(true);
        expect(result.counts?.fire).toBe(9);
        expect(result.counts?.clap).toBe(1);
      });

      it('should only decrement when removing reaction', async () => {
        mockSupabase.rpc.mockResolvedValue({ data: 9, error: null });

        const { toggleReaction } = await import(
          '../../repositories/ReactionsRepository'
        );

        const result = await toggleReaction('article-1', null, 'fire');

        expect(result.success).toBe(true);
        expect(result.counts?.fire).toBe(9);
      });

      it('should only increment when no previous reaction', async () => {
        mockSupabase.rpc.mockResolvedValue({ data: 1, error: null });

        const { toggleReaction } = await import(
          '../../repositories/ReactionsRepository'
        );

        const result = await toggleReaction('article-1', 'clap', null);

        expect(result.success).toBe(true);
        expect(result.counts?.clap).toBe(1);
      });
    });
  });
});

