/**
 * Global `gtag` function installed by the inline Google tag snippet in app/layout.tsx.
 */
interface Window {
  gtag?: (
    command: 'config' | 'event' | 'js' | 'set',
    targetOrEventName: string | Date,
    params?: Record<string, string | number | boolean>
  ) => void;
}
