export function sanitizeLocation(input: unknown): string {
  const s = String(input ?? '');

  return s
    .normalize('NFKC')
    .replace(/\p{Cc}/gu, '')
    .replace(/[<>]/g, '')
    .replace(/[^a-zA-Z0-9\s.,'’-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}
