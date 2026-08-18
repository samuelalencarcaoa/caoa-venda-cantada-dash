const DEFAULT_RETRY_ATTEMPTS = 1;
const DEFAULT_RETRY_DELAY_MS = 250;
const DEFAULT_MAX_RETRY_DELAY_MS = 1000;

function getPrismaErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' && code.trim() ? code : null;
}

export function isPrismaErrorCode(error: unknown, expectedCode: string) {
  return getPrismaErrorCode(error) === expectedCode;
}

export function isPrismaPoolTimeoutError(error: unknown) {
  return isPrismaErrorCode(error, 'P2024');
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildRetryDelay(attempt: number, baseDelayMs: number, maxDelayMs: number) {
  const exponentialDelay = baseDelayMs * 2 ** attempt;
  const boundedDelay = Math.min(exponentialDelay, maxDelayMs);
  const jitter = Math.round(boundedDelay * 0.2 * Math.random());

  return boundedDelay + jitter;
}

export async function withPrismaRetry<T>(operation: () => Promise<T>) {
  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (!isPrismaPoolTimeoutError(error) || attempt >= DEFAULT_RETRY_ATTEMPTS) {
        throw error;
      }

      const delay = buildRetryDelay(attempt, DEFAULT_RETRY_DELAY_MS, DEFAULT_MAX_RETRY_DELAY_MS);
      attempt += 1;
      await sleep(delay);
    }
  }
}
