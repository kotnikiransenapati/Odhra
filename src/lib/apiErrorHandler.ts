/**
 * Centralized API error handling with retry logic and user-friendly messages
 */

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  retryable: boolean;
}

const ERROR_MESSAGES: Record<string, string> = {
  '23505': 'This record already exists.',
  '23503': 'Referenced record not found.',
  '42501': 'You do not have permission to perform this action.',
  'PGRST301': 'Session expired. Please log in again.',
  'PGRST204': 'No data found.',
};

const HTTP_MESSAGES: Record<number, string> = {
  400: 'Invalid request. Please check your input.',
  401: 'Please log in to continue.',
  403: 'You do not have permission for this action.',
  404: 'The requested resource was not found.',
  409: 'A conflict occurred. Please refresh and try again.',
  429: 'Too many requests. Please wait a moment.',
  500: 'Server error. Please try again later.',
  502: 'Service temporarily unavailable.',
  503: 'Service is under maintenance. Please try again shortly.',
};

/**
 * Parse a Supabase/fetch error into a user-friendly ApiError
 */
export function parseApiError(error: unknown): ApiError {
  if (error instanceof Error) {
    // Supabase PostgREST errors
    const supaError = error as any;
    if (supaError.code && ERROR_MESSAGES[supaError.code]) {
      return {
        message: ERROR_MESSAGES[supaError.code],
        code: supaError.code,
        retryable: false,
      };
    }

    // Network errors
    if (error.message === 'Failed to fetch' || error.message.includes('NetworkError')) {
      return {
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
        retryable: true,
      };
    }

    // Timeout
    if (error.message.includes('timeout') || error.message.includes('AbortError')) {
      return {
        message: 'Request timed out. Please try again.',
        code: 'TIMEOUT',
        retryable: true,
      };
    }

    return {
      message: error.message || 'An unexpected error occurred.',
      retryable: false,
    };
  }

  // HTTP response errors
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as any).status as number;
    return {
      message: HTTP_MESSAGES[status] || 'An unexpected error occurred.',
      status,
      retryable: status >= 500 || status === 429,
    };
  }

  return {
    message: 'An unexpected error occurred.',
    retryable: false,
  };
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelay?: number; onRetry?: (attempt: number) => void } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, onRetry } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const apiError = parseApiError(error);

      if (attempt === maxRetries || !apiError.retryable) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500;
      onRetry?.(attempt + 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error('Max retries exceeded');
}

/**
 * Safe wrapper for Supabase queries that throws on error
 */
export function throwOnError<T>(result: { data: T | null; error: any }): T {
  if (result.error) {
    throw result.error;
  }
  if (result.data === null) {
    throw new Error('No data returned');
  }
  return result.data;
}
