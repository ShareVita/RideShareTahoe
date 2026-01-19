import { NextRequest } from 'next/server';
import { apiRateLimit } from '@/libs/rateLimit';

/** @public */
export class APIError extends Error {
  statusCode: number;
  code: string | null;

  constructor(message: string, statusCode: number = 500, code: string | null = null) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

interface ErrorLike {
  message?: string;
  stack?: string;
  code?: string | null;
  statusCode?: number;
}

/** @public */
export const handleAPIError = (err: unknown, request?: Request) => {
  const error = err as ErrorLike;
  console.error('API Error:', {
    message: error.message,
    stack: error.stack,
    url: request?.url,
    method: request?.method,
    timestamp: new Date().toISOString(),
  });

  // Handle known error types
  if (error instanceof APIError) {
    return {
      error: error.message,
      code: error.code,
      status: error.statusCode,
    };
  }

  // Handle Supabase errors
  if (error.code && error.message) {
    return {
      error: error.message,
      code: error.code,
      status: 400,
    };
  }

  // Handle validation errors
  if (error.message?.includes('Validation failed')) {
    return {
      error: error.message,
      status: 400,
    };
  }

  // Handle authentication errors
  if (error.message?.includes('Unauthorized')) {
    return {
      error: 'Authentication required',
      status: 401,
    };
  }

  // Handle rate limiting errors
  if (error.message?.includes('Too many requests')) {
    return {
      error: error.message,
      status: 429,
    };
  }

  // Default error
  return {
    error: 'Internal server error',
    status: 500,
  };
};

export const withErrorHandling = <TContext>(
  // Accept a request-like object to support frameworks (NextRequest, Request, etc.)
  // Handler may be strongly-typed (e.g. (request: NextRequest) => ...) — use a
  // flexible `any` rest-args to avoid strict-function-type incompatibilities.
  // eslint-disable-next-line no-unused-vars
  handler: (request?: Request | NextRequest, context?: TContext) => Promise<Response>
) => {
  return async (...args: unknown[]) => {
    const request = args[0] as NextRequest | undefined;
    const context = args[1] as TContext | undefined;

    // Apply a global API rate limit for all routes wrapped with this helper.
    try {
      if (request) {
        const rl = apiRateLimit(request as unknown as Request);
        if (!rl.success) {
          return new Response(JSON.stringify({ error: rl.error?.message }), {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': (rl.error?.retryAfter || 60).toString(),
            },
          });
        }
      }
    } catch (e) {
      // If rate limit check itself fails, log and continue (fail-open)
      console.error('API rate limit check failed:', e);
    }

    try {
      return await handler(request as unknown as Request | undefined, context);
    } catch (error) {
      const errorResponse = handleAPIError(error, request as Request | undefined);

      return new Response(
        JSON.stringify({
          error: errorResponse.error,
          code: errorResponse.code,
          timestamp: new Date().toISOString(),
        }),
        {
          status: errorResponse.status,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  };
};

/**
 * Creates a standardized error response for API errors.
 *
 * @param message The error message to return.
 * @param status The HTTP status code (default is 500).
 * @param code An optional error code.
 * @returns A Response object with the error details.
 *
 * @public
 */
export const createErrorResponse = (
  message: string,
  status: number = 500,
  code: string | null = null
) => {
  return new Response(
    JSON.stringify({
      error: message,
      code,
      timestamp: new Date().toISOString(),
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
};

/**
 * Creates a standardized success response for API calls.
 *
 * @param data The data to include in the response.
 * @param status The HTTP status code (default is 200).
 * @returns A Response object with the success data.
 *
 * @public
 */
export const createSuccessResponse = (data: unknown, status: number = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};
