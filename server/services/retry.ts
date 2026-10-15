export interface WithRetryOptions {
  /** Total number of attempts (including the first). */
  attempts?: number;
  /** Base backoff in ms; delay grows linearly as `attempt * baseDelayMs`. */
  baseDelayMs?: number;
  /** Predicate deciding whether a thrown error is worth retrying. */
  isRetryable?: (err: unknown) => boolean;
}

/**
 * Runs `fn`, retrying on errors for which `isRetryable` returns true.
 * The delay before retry N is `N * baseDelayMs` (linear backoff).
 * Resolves with the first successful result; throws the last error when
 * attempts are exhausted or the error is not retryable.
 */
export async function withRetry<T>(fn: () => Promise<T>, opts: WithRetryOptions = {}): Promise<T> {
  const maxAttempts = opts.attempts ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 50;
  const isRetryable = opts.isRetryable ?? (() => false);

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      if (isRetryable(err) && attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * baseDelayMs));
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}
