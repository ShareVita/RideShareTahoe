/**
 * Maps provider errors to internal application error codes.
 * This prevents arbitrary string injection into our UI.
 */
const OAUTH_ERROR_MAP: Record<string, string> = {
  access_denied: 'auth_denied',
  temporarily_unavailable: 'auth_unavailable',
  server_error: 'auth_server_error',
};

export function getSafeError(error: string | null): string {
  if (!error) return 'unknown_error';
  return OAUTH_ERROR_MAP[error] || 'oauth_failed';
}
