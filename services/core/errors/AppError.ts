/**
 * Classes d'erreurs personnalisées pour PRISM
 * Permet une gestion d'erreurs cohérente et typée
 */

export type ErrorCode =
  | 'NETWORK_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'API_KEY_MISSING'
  | 'MODEL_NOT_FOUND'
  | 'QUOTA_EXCEEDED'
  | 'TIMEOUT'
  | 'PARSE_ERROR'
  | 'VALIDATION_ERROR'
  | 'STORAGE_ERROR'
  | 'BUCKET_NOT_FOUND'
  | 'UPLOAD_FAILED'
  | 'CACHE_ERROR'
  | 'SERVICE_DISABLED'
  | 'UNKNOWN_ERROR';

export interface ErrorContext {
  service?: string;
  operation?: string;
  model?: string;
  cacheKey?: string;
  [key: string]: unknown;
}

/**
 * Classe de base pour toutes les erreurs PRISM
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly context: ErrorContext;
  public readonly isRetryable: boolean;
  public readonly originalError?: Error;

  constructor(
    code: ErrorCode,
    message: string,
    options: {
      context?: ErrorContext;
      isRetryable?: boolean;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.context = options.context ?? {};
    this.isRetryable = options.isRetryable ?? false;
    this.originalError = options.cause;

    // Maintient la stack trace correcte
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      isRetryable: this.isRetryable,
    };
  }
}

/**
 * Erreur réseau (connexion, fetch failed, etc.)
 */
export class NetworkError extends AppError {
  constructor(message: string, context?: ErrorContext, cause?: Error) {
    super('NETWORK_ERROR', message, {
      context: { ...context, service: context?.service ?? 'network' },
      isRetryable: true,
      cause,
    });
    this.name = 'NetworkError';
  }
}

/**
 * Erreur de rate limiting (429, quota)
 */
export class RateLimitError extends AppError {
  public readonly retryAfterMs?: number;

  constructor(
    message: string,
    options: { context?: ErrorContext; retryAfterMs?: number; cause?: Error } = {}
  ) {
    super('RATE_LIMIT_EXCEEDED', message, {
      context: options.context,
      isRetryable: true,
      cause: options.cause,
    });
    this.name = 'RateLimitError';
    this.retryAfterMs = options.retryAfterMs;
  }
}

/**
 * Erreur de quota épuisé
 */
export class QuotaExceededError extends AppError {
  constructor(message: string, context?: ErrorContext, cause?: Error) {
    super('QUOTA_EXCEEDED', message, {
      context,
      isRetryable: false,
      cause,
    });
    this.name = 'QuotaExceededError';
  }
}

/**
 * Erreur de timeout
 */
export class TimeoutError extends AppError {
  public readonly timeoutMs: number;

  constructor(message: string, timeoutMs: number, context?: ErrorContext) {
    super('TIMEOUT', message, {
      context: { ...context, timeoutMs },
      isRetryable: true,
    });
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Erreur de parsing (JSON malformé, etc.)
 */
export class ParseError extends AppError {
  constructor(message: string, context?: ErrorContext, cause?: Error) {
    super('PARSE_ERROR', message, {
      context,
      isRetryable: false,
      cause,
    });
    this.name = 'ParseError';
  }
}

/**
 * Erreur de validation
 */
export class ValidationError extends AppError {
  public readonly field?: string;

  constructor(message: string, field?: string, context?: ErrorContext) {
    super('VALIDATION_ERROR', message, {
      context: { ...context, field },
      isRetryable: false,
    });
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Erreur de service désactivé
 */
export class ServiceDisabledError extends AppError {
  constructor(serviceName: string, reason?: string) {
    super(
      'SERVICE_DISABLED',
      `Service "${serviceName}" est désactivé${reason ? `: ${reason}` : ''}`,
      {
        context: { service: serviceName, reason },
        isRetryable: false,
      }
    );
    this.name = 'ServiceDisabledError';
  }
}

/**
 * Erreur de stockage
 */
export class StorageError extends AppError {
  constructor(
    message: string,
    code: 'STORAGE_ERROR' | 'BUCKET_NOT_FOUND' | 'UPLOAD_FAILED' = 'STORAGE_ERROR',
    context?: ErrorContext,
    cause?: Error
  ) {
    super(code, message, {
      context: { ...context, service: 'storage' },
      isRetryable: code !== 'BUCKET_NOT_FOUND',
      cause,
    });
    this.name = 'StorageError';
  }
}

// ============================================================================
// ERROR DETECTION UTILITIES
// ============================================================================

/**
 * Détecte si une erreur est une erreur réseau
 */
export const isNetworkError = (error: unknown): boolean => {
  if (!error) return false;
  if (error instanceof NetworkError) return true;
  if (error instanceof TypeError) return true;

  const message = extractErrorMessage(error);
  return /failed to fetch|network\s?error|TypeError|ECONNREFUSED|ETIMEDOUT/i.test(message);
};

/**
 * Détecte si une erreur est un rate limit
 */
export const isRateLimitError = (error: unknown): boolean => {
  if (!error) return false;
  if (error instanceof RateLimitError) return true;

  const anyError = error as any;
  const message = extractErrorMessage(error);

  if (/429|quota|RESOURCE_EXHAUSTED/i.test(message)) return true;
  if (anyError?.code === 429 || anyError?.status === 429) return true;
  if (anyError?.error?.code === 429 || anyError?.error?.status === 'RESOURCE_EXHAUSTED') return true;

  return false;
};

/**
 * Détecte si un modèle n'est pas trouvé (404)
 */
export const isModelNotFoundError = (error: unknown): boolean => {
  if (!error) return false;

  const anyError = error as any;
  const message = extractErrorMessage(error);

  return message.includes('404') ||
    message.toLowerCase().includes('not found') ||
    anyError?.status === 404;
};

/**
 * Extrait le message d'une erreur de n'importe quel type
 */
export const extractErrorMessage = (error: unknown): string => {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;

  const anyError = error as any;
  if (typeof anyError?.message === 'string') return anyError.message;
  if (typeof anyError?.details === 'string') return anyError.details;
  if (typeof anyError?.error?.message === 'string') return anyError.error.message;

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

/**
 * Convertit une erreur inconnue en AppError
 */
export const toAppError = (error: unknown, context?: ErrorContext): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (isNetworkError(error)) {
    return new NetworkError(
      extractErrorMessage(error),
      context,
      error instanceof Error ? error : undefined
    );
  }

  if (isRateLimitError(error)) {
    return new RateLimitError(extractErrorMessage(error), {
      context,
      cause: error instanceof Error ? error : undefined,
    });
  }

  const message = extractErrorMessage(error);
  return new AppError('UNKNOWN_ERROR', message || 'Une erreur inattendue est survenue', {
    context,
    cause: error instanceof Error ? error : undefined,
  });
};

