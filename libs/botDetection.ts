/**
 * Bot Detection Utility
 *
 * Identifies and blocks malicious bots while allowing legitimate crawlers.
 * Used in middleware.ts for early bot filtering.
 */

const BLOCKED_USER_AGENTS = [
  // Scrapers and crawlers
  /scrapy/i,
  /python-requests/i,
  /curl/i,
  /wget/i,
  /ahrefs/i,
  /semrush/i,

  // Known bad bots
  /mj12bot/i,
  /dotbot/i,
  /rogerbot/i,
  /exabot/i,
  /facebot/i,
  /ia_archiver/i,

  // Generic scanners
  /scanner/i,
  /spider/i,
  /crawler/i,
  /bot/i,

  // HTTP libraries often used by bots
  /axios/i,
  /node-fetch/i,
  /got/i,
];

const ALLOWED_BOTS = [
  // Search engines (we want these)
  /googlebot/i,
  /bingbot/i,
  /duckduckbot/i,
  /slurp/i, // Yahoo
  /baiduspider/i,
  /yandexbot/i,

  // Social media crawlers
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
  /whatsapp/i,
  /slackbot/i,
  /telegrambot/i,

  // Monitoring & uptime
  /uptimerobot/i,
  /pingdom/i,
  /newrelic/i,
  /datadog/i,
];

/**
 * Check if a user agent string appears to be from a malicious bot.
 * Returns true if the bot should be blocked.
 */
export function isMaliciousBot(userAgent: string | null): boolean {
  if (!userAgent) {
    // No user agent is suspicious, but some legitimate clients don't send it
    // For now, allow it but log it
    return false;
  }

  const ua = userAgent.toLowerCase();

  // First, check if it's an allowed bot (takes precedence)
  for (const pattern of ALLOWED_BOTS) {
    if (pattern.test(ua)) {
      return false; // Explicitly allowed
    }
  }

  // Then check if it matches blocked patterns
  for (const pattern of BLOCKED_USER_AGENTS) {
    if (pattern.test(ua)) {
      return true; // Blocked
    }
  }

  return false; // Not blocked
}

/**
 * Get IP address from request headers (works with Vercel)
 */
export function getClientIp(headers: Headers): string {
  // Vercel provides x-forwarded-for and x-real-ip
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return 'unknown';
}

/**
 * Check if request has suspicious characteristics beyond user agent
 */
export function hasSuspiciousCharacteristics(request: Request): boolean {
  const headers = request.headers;

  // Check for missing common headers
  const hasAccept = headers.get('accept');
  const hasAcceptLanguage = headers.get('accept-language');

  // Most real browsers send both accept and accept-language
  if (!hasAccept && !hasAcceptLanguage) {
    return true;
  }

  // Check for suspicious accept headers (e.g., "*/*" with no other headers)
  if (hasAccept === '*/*' && !hasAcceptLanguage) {
    return true;
  }

  return false;
}
