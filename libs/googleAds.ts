/**
 * Google Ads conversion tracking for the ShareVita Ad Grants account.
 *
 * The Google tag (gtag.js) is loaded once in app/layout.tsx and configured for
 * both GA4 and the Ads account. This module only fires conversion events.
 */

export const GOOGLE_ADS_TAG_ID = 'AW-18056537904';

/** "RideShareTahoe Sign-up" conversion action in Google Ads. */
const SIGNUP_CONVERSION_SEND_TO = `${GOOGLE_ADS_TAG_ID}/g4hMCMaQopAdELDOg6JD`;

/**
 * Report a completed sign-up to Google Ads.
 * Call this once, when a first-time user finishes creating their profile.
 * Safe to call when the tag has not loaded (for example with an ad blocker).
 */
export function trackSignupConversion(): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', 'conversion', { send_to: SIGNUP_CONVERSION_SEND_TO });
}
