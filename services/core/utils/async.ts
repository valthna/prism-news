/**
 * Utilitaires pour les opérations asynchrones
 */

import { TimeoutError } from '../errors';

/**
 * Encapsule une promesse avec un timeout
 */
export const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  onTimeout?: () => void
): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      onTimeout?.();
      reject(new TimeoutError(
        `Opération timeout après ${timeoutMs}ms`,
        timeoutMs
      ));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
};

/**
 * Attend un certain temps
 */
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Exécute une fonction avec retry et backoff exponentiel
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelayMs?: number;
    shouldRetry?: (error: unknown, attempt: number) => boolean;
    onRetry?: (error: unknown, attempt: number) => void;
  } = {}
): Promise<T> => {
  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    shouldRetry = () => true,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts || !shouldRetry(error, attempt)) {
        throw error;
      }

      onRetry?.(error, attempt);

      // Backoff exponentiel
      const delay = baseDelayMs * attempt;
      await sleep(delay);
    }
  }

  throw lastError;
};

/**
 * Exécute des promesses en séquence avec un délai entre chaque
 */
export const sequentialWithDelay = async <T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  delayMs: number
): Promise<R[]> => {
  const results: R[] = [];

  for (let i = 0; i < items.length; i++) {
    if (i > 0 && delayMs > 0) {
      await sleep(delayMs);
    }
    results.push(await fn(items[i], i));
  }

  return results;
};

/**
 * Exécute des promesses en parallèle avec une limite de concurrence
 */
export const parallelWithLimit = async <T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  limit: number
): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  const executeNext = async (): Promise<void> => {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      try {
        results[index] = await fn(items[index]);
      } catch (error) {
        results[index] = undefined as any;
        console.warn(`[parallelWithLimit] Item ${index} failed:`, error);
      }
    }
  };

  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    executeNext()
  );

  await Promise.all(workers);
  return results;
};

