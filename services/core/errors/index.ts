/**
 * Errors module - Export principal
 */

export {
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
} from './AppError';

export type { ErrorCode, ErrorContext } from './AppError';

