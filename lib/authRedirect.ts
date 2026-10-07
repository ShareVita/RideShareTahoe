/** Accept only internal destinations, never auth-entry loops or URL parser tricks. */
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null;
  try {
    const decoded = decodeURIComponent(value);
    const hasUnsafeCharacter = [...decoded].some(
      (char) => char === '\\' || char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127
    );
    if (/[/\\]{2}/.test(decoded.split(/[?#]/)[0]) || hasUnsafeCharacter) return null;
    // Nested escapes in the pathname can bypass route checks after another decode.
    if (/%[0-9a-f]{2}/i.test(decoded.split(/[?#]/)[0])) return null;
    const url = new URL(decoded, 'https://internal.invalid');
    if (url.origin !== 'https://internal.invalid') return null;
    if (/^\/(?:login|auth|api\/auth)(?:\/|$)/i.test(url.pathname)) return null;
    return value;
  } catch {
    return null;
  }
}

/** Carry a validated destination across a required intermediate page. */
export function withNextPath(path: string, next: string | null | undefined): string {
  const safe = safeNextPath(next);
  return safe ? `${path}?next=${encodeURIComponent(safe)}` : path;
}
