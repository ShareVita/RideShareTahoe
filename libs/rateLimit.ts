import type { Database } from '@/types/database.types';

interface SupabaseRateLimitResult {
  allowed: boolean;
  remaining: number;
  reset_at: string;
}

interface SupabaseRateLimitOptions {
  maxRequests?: number;
  windowSeconds?: number;
  message?: string;
}

/* eslint-disable no-unused-vars */
type SupabaseRpcFunction = (
  fn: 'check_rate_limit',
  params: Database['public']['Functions']['check_rate_limit']['Args']
) => PromiseLike<{ data: unknown; error: unknown }>;
/* eslint-enable no-unused-vars */

/** Shared atomic quota across serverless instances and cold starts. */
export async function checkSupabaseRateLimit(
  supabase: { rpc: SupabaseRpcFunction },
  key: string,
  endpoint: string,
  options: SupabaseRateLimitOptions = {}
): Promise<{ success: boolean; error?: { message: string; retryAfter: number } }> {
  const {
    maxRequests = 20,
    windowSeconds = 3600,
    message = 'Too many requests. Please try again later.',
  } = options;

  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_key: key,
      p_endpoint: endpoint,
      p_max_requests: maxRequests,
      p_window_seconds: windowSeconds,
    });
    if (error) throw error;
    const result = data as SupabaseRateLimitResult;
    if (!result.allowed) {
      const retryAfter = Math.ceil((new Date(result.reset_at).getTime() - Date.now()) / 1000);
      return { success: false, error: { message, retryAfter: Math.max(retryAfter, 1) } };
    }
    return { success: true };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // A quota outage must not turn into unlimited message or bulk-email sends.
    return {
      success: false,
      error: {
        message: 'Temporarily unable to check request limits. Please try again.',
        retryAfter: 60,
      },
    };
  }
}
