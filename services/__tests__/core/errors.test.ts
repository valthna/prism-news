/**
 * Tests pour les classes d'erreurs
 */

import { describe, it, expect } from 'vitest';
import {
  AppError,
  NetworkError,
  RateLimitError,
  QuotaExceededError,
  TimeoutError,
  ParseError,
  ValidationError,
  ServiceDisabledError,
  StorageError,
  isNetworkError,
  isRateLimitError,
  isModelNotFoundError,
  extractErrorMessage,
  toAppError,
} from '../../core/errors';

describe('Core - Errors', () => {
  describe('AppError', () => {
    it('should create error with code and message', () => {
      const error = new AppError('UNKNOWN_ERROR', 'Something went wrong');

      expect(error.code).toBe('UNKNOWN_ERROR');
      expect(error.message).toBe('Something went wrong');
      expect(error.name).toBe('AppError');
      expect(error.isRetryable).toBe(false);
    });

    it('should include context', () => {
      const error = new AppError('NETWORK_ERROR', 'Failed', {
        context: { service: 'gemini', operation: 'generate' },
      });

      expect(error.context.service).toBe('gemini');
      expect(error.context.operation).toBe('generate');
    });

    it('should serialize to JSON', () => {
      const error = new AppError('TIMEOUT', 'Timeout', { isRetryable: true });
      const json = error.toJSON();

      expect(json.code).toBe('TIMEOUT');
      expect(json.isRetryable).toBe(true);
    });
  });

  describe('NetworkError', () => {
    it('should be retryable by default', () => {
      const error = new NetworkError('Connection failed');

      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.isRetryable).toBe(true);
      expect(error.name).toBe('NetworkError');
    });
  });

  describe('RateLimitError', () => {
    it('should include retry after info', () => {
      const error = new RateLimitError('Too many requests', {
        retryAfterMs: 60000,
      });

      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.retryAfterMs).toBe(60000);
      expect(error.isRetryable).toBe(true);
    });
  });

  describe('QuotaExceededError', () => {
    it('should not be retryable', () => {
      const error = new QuotaExceededError('Quota reached');

      expect(error.code).toBe('QUOTA_EXCEEDED');
      expect(error.isRetryable).toBe(false);
    });
  });

  describe('TimeoutError', () => {
    it('should include timeout duration', () => {
      const error = new TimeoutError('Operation timed out', 30000);

      expect(error.code).toBe('TIMEOUT');
      expect(error.timeoutMs).toBe(30000);
      expect(error.isRetryable).toBe(true);
    });
  });

  describe('ParseError', () => {
    it('should not be retryable', () => {
      const error = new ParseError('Invalid JSON');

      expect(error.code).toBe('PARSE_ERROR');
      expect(error.isRetryable).toBe(false);
    });
  });

  describe('ValidationError', () => {
    it('should include field name', () => {
      const error = new ValidationError('Invalid email', 'email');

      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.field).toBe('email');
    });
  });

  describe('ServiceDisabledError', () => {
    it('should format service name in message', () => {
      const error = new ServiceDisabledError('ImageService', 'No API key');

      expect(error.message).toContain('ImageService');
      expect(error.message).toContain('No API key');
      expect(error.isRetryable).toBe(false);
    });
  });

  describe('StorageError', () => {
    it('should handle different storage error codes', () => {
      const bucketError = new StorageError('Not found', 'BUCKET_NOT_FOUND');
      const uploadError = new StorageError('Upload failed', 'UPLOAD_FAILED');

      expect(bucketError.code).toBe('BUCKET_NOT_FOUND');
      expect(bucketError.isRetryable).toBe(false);

      expect(uploadError.code).toBe('UPLOAD_FAILED');
      expect(uploadError.isRetryable).toBe(true);
    });
  });

  describe('Error detection utilities', () => {
    describe('isNetworkError', () => {
      it('should detect NetworkError instances', () => {
        expect(isNetworkError(new NetworkError('test'))).toBe(true);
      });

      it('should detect TypeError', () => {
        expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true);
      });

      it('should detect network error messages', () => {
        expect(isNetworkError({ message: 'Failed to fetch' })).toBe(true);
        expect(isNetworkError({ message: 'Network error' })).toBe(true);
        expect(isNetworkError({ message: 'ECONNREFUSED' })).toBe(true);
      });

      it('should return false for other errors', () => {
        expect(isNetworkError(new Error('Random error'))).toBe(false);
        expect(isNetworkError(null)).toBe(false);
      });
    });

    describe('isRateLimitError', () => {
      it('should detect RateLimitError instances', () => {
        expect(isRateLimitError(new RateLimitError('test'))).toBe(true);
      });

      it('should detect 429 status codes', () => {
        expect(isRateLimitError({ status: 429 })).toBe(true);
        expect(isRateLimitError({ code: 429 })).toBe(true);
      });

      it('should detect quota messages', () => {
        expect(isRateLimitError({ message: 'RESOURCE_EXHAUSTED' })).toBe(true);
        expect(isRateLimitError({ message: 'quota exceeded' })).toBe(true);
      });
    });

    describe('isModelNotFoundError', () => {
      it('should detect 404 errors', () => {
        expect(isModelNotFoundError({ status: 404 })).toBe(true);
        expect(isModelNotFoundError({ message: '404 not found' })).toBe(true);
        expect(isModelNotFoundError({ message: 'Model not found' })).toBe(true);
      });
    });

    describe('extractErrorMessage', () => {
      it('should extract from Error instances', () => {
        expect(extractErrorMessage(new Error('Test error'))).toBe('Test error');
      });

      it('should handle string errors', () => {
        expect(extractErrorMessage('String error')).toBe('String error');
      });

      it('should handle objects with message', () => {
        expect(extractErrorMessage({ message: 'Object message' })).toBe('Object message');
      });

      it('should handle objects with details', () => {
        expect(extractErrorMessage({ details: 'Detail message' })).toBe('Detail message');
      });

      it('should handle null/undefined', () => {
        expect(extractErrorMessage(null)).toBe('');
        expect(extractErrorMessage(undefined)).toBe('');
      });
    });

    describe('toAppError', () => {
      it('should return AppError instances unchanged', () => {
        const original = new AppError('TIMEOUT', 'test');
        expect(toAppError(original)).toBe(original);
      });

      it('should convert network errors', () => {
        const result = toAppError(new TypeError('Failed to fetch'));
        expect(result).toBeInstanceOf(NetworkError);
      });

      it('should convert rate limit errors', () => {
        const result = toAppError({ status: 429, message: 'Too many requests' });
        expect(result).toBeInstanceOf(RateLimitError);
      });

      it('should convert unknown errors to AppError', () => {
        const result = toAppError(new Error('Unknown'));
        expect(result).toBeInstanceOf(AppError);
        expect(result.code).toBe('UNKNOWN_ERROR');
      });
    });
  });
});

