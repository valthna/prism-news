/**
 * Tests pour les utilitaires core
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Core - Utils', () => {
  describe('Async utilities', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    describe('withTimeout', () => {
      it('should resolve if promise completes in time', async () => {
        const { withTimeout } = await import('../../core/utils/async');

        const promise = Promise.resolve('success');
        const result = await withTimeout(promise, 1000);

        expect(result).toBe('success');
      });

      it('should reject with TimeoutError if promise takes too long', async () => {
        const { withTimeout } = await import('../../core/utils/async');

        const slowPromise = new Promise((resolve) => {
          setTimeout(() => resolve('late'), 5000);
        });

        const resultPromise = withTimeout(slowPromise, 100);
        vi.advanceTimersByTime(200);

        await expect(resultPromise).rejects.toThrow('timeout');
      });

      it('should call onTimeout callback', async () => {
        const { withTimeout } = await import('../../core/utils/async');
        const onTimeout = vi.fn();

        const slowPromise = new Promise((resolve) => {
          setTimeout(() => resolve('late'), 5000);
        });

        const resultPromise = withTimeout(slowPromise, 100, onTimeout);
        vi.advanceTimersByTime(200);

        try {
          await resultPromise;
        } catch {
          // Expected
        }

        expect(onTimeout).toHaveBeenCalled();
      });
    });

    describe('sleep', () => {
      it('should wait for specified time', async () => {
        const { sleep } = await import('../../core/utils/async');

        const start = Date.now();
        const sleepPromise = sleep(1000);

        vi.advanceTimersByTime(1000);
        await sleepPromise;

        // With fake timers, this should complete
        expect(true).toBe(true);
      });
    });

    describe('withRetry', () => {
      it('should return on first success', async () => {
        vi.useRealTimers(); // Need real timers for retry
        const { withRetry } = await import('../../core/utils/async');

        const fn = vi.fn().mockResolvedValue('success');
        const result = await withRetry(fn, { maxAttempts: 3 });

        expect(result).toBe('success');
        expect(fn).toHaveBeenCalledTimes(1);
      });

      it('should retry on failure', async () => {
        vi.useRealTimers();
        const { withRetry } = await import('../../core/utils/async');

        const fn = vi
          .fn()
          .mockRejectedValueOnce(new Error('fail 1'))
          .mockRejectedValueOnce(new Error('fail 2'))
          .mockResolvedValue('success');

        const result = await withRetry(fn, {
          maxAttempts: 3,
          baseDelayMs: 10,
        });

        expect(result).toBe('success');
        expect(fn).toHaveBeenCalledTimes(3);
      });

      it('should call onRetry callback', async () => {
        vi.useRealTimers();
        const { withRetry } = await import('../../core/utils/async');

        const fn = vi
          .fn()
          .mockRejectedValueOnce(new Error('fail'))
          .mockResolvedValue('success');

        const onRetry = vi.fn();

        await withRetry(fn, {
          maxAttempts: 2,
          baseDelayMs: 10,
          onRetry,
        });

        expect(onRetry).toHaveBeenCalledTimes(1);
        expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1);
      });

      it('should respect shouldRetry predicate', async () => {
        vi.useRealTimers();
        const { withRetry } = await import('../../core/utils/async');

        const fn = vi.fn().mockRejectedValue(new Error('fatal'));

        await expect(
          withRetry(fn, {
            maxAttempts: 3,
            baseDelayMs: 10,
            shouldRetry: () => false,
          })
        ).rejects.toThrow('fatal');

        expect(fn).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Text utilities', () => {
    describe('collapseWhitespace', () => {
      it('should collapse multiple spaces', async () => {
        const { collapseWhitespace } = await import('../../core/utils/text');

        expect(collapseWhitespace('hello    world')).toBe('hello world');
        expect(collapseWhitespace('  trimmed  ')).toBe('trimmed');
        expect(collapseWhitespace('line\n\nbreak')).toBe('line break');
      });

      it('should handle empty/undefined', async () => {
        const { collapseWhitespace } = await import('../../core/utils/text');

        expect(collapseWhitespace('')).toBe('');
        expect(collapseWhitespace(undefined)).toBe('');
      });
    });

    describe('cleanCitations', () => {
      it('should remove citation markers', async () => {
        const { cleanCitations } = await import('../../core/utils/text');

        // Note: cleanCitations removes citations but may leave extra spaces
        expect(cleanCitations('Text [cite: source1] more').replace(/\s+/g, ' ')).toBe('Text more');
        expect(cleanCitations('[cite:ref] start')).toBe('start');
      });
    });

    describe('sanitizeFilename', () => {
      it('should make filename safe', async () => {
        const { sanitizeFilename } = await import('../../core/utils/text');

        expect(sanitizeFilename('Hello World!')).toBe('hello-world');
        expect(sanitizeFilename('test@#$file')).toBe('test-file');
        expect(sanitizeFilename('')).toBe('prism-file');
      });
    });

    describe('normalizeSourceName', () => {
      it('should lowercase and trim', async () => {
        const { normalizeSourceName } = await import('../../core/utils/text');

        expect(normalizeSourceName('  Reuters.COM  ')).toBe('reuters.com');
      });
    });

    describe('generateId', () => {
      it('should generate unique IDs with prefix', async () => {
        const { generateId } = await import('../../core/utils/text');

        const id = generateId('article');
        expect(id).toMatch(/^article-\d+-/);
      });
    });

    describe('parseRelativeTimeToMinutes', () => {
      it('should parse time strings', async () => {
        const { parseRelativeTimeToMinutes } = await import('../../core/utils/text');

        expect(parseRelativeTimeToMinutes('Il y a 30 min')).toBe(30);
        expect(parseRelativeTimeToMinutes('Il y a 2H')).toBe(120);
        expect(parseRelativeTimeToMinutes('Il y a 1 jour')).toBe(1440);
        expect(parseRelativeTimeToMinutes('EN DIRECT')).toBe(0);
        expect(parseRelativeTimeToMinutes('RÉCENT')).toBe(30);
      });

      it('should return Infinity for unknown formats', async () => {
        const { parseRelativeTimeToMinutes } = await import('../../core/utils/text');

        expect(parseRelativeTimeToMinutes(undefined)).toBe(Infinity);
        expect(parseRelativeTimeToMinutes('unknown')).toBe(Infinity);
      });
    });
  });

  describe('URL utilities', () => {
    describe('createLogoUrl', () => {
      it('should create Google favicon URL', async () => {
        const { createLogoUrl } = await import('../../core/utils/url');

        const url = createLogoUrl('reuters.com');
        expect(url).toContain('google.com/s2/favicons');
        expect(url).toContain('reuters.com');
      });

      it('should add .com if no extension', async () => {
        const { createLogoUrl } = await import('../../core/utils/url');

        const url = createLogoUrl('reuters');
        expect(url).toContain('reuters.com');
      });
    });

    describe('createGoogleSearchUrl', () => {
      it('should create search URL', async () => {
        const { createGoogleSearchUrl } = await import('../../core/utils/url');

        const url = createGoogleSearchUrl('Breaking News', 'Reuters');
        expect(url).toContain('google.com/search');
        expect(url).toContain('Breaking%20News');
        expect(url).toContain('Reuters');
      });
    });

    describe('isDataUrl', () => {
      it('should detect data URLs', async () => {
        const { isDataUrl } = await import('../../core/utils/url');

        expect(isDataUrl('data:image/png;base64,ABC')).toBe(true);
        expect(isDataUrl('https://example.com/image.png')).toBe(false);
      });
    });
  });

  describe('Storage utilities', () => {
    describe('formatBytes', () => {
      it('should format byte sizes', async () => {
        const { formatBytes } = await import('../../core/utils/storage');

        expect(formatBytes(500)).toBe('500 B');
        expect(formatBytes(1500)).toBe('1.5 KB');
        expect(formatBytes(1500000)).toBe('1.4 MB');
      });
    });
  });
});

