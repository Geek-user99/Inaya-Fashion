declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

let initializedPixelId = '';

export function initMetaPixel(pixelId: string) {
  if (!pixelId || initializedPixelId === pixelId || typeof window === 'undefined') return;
  initializedPixelId = pixelId;

  if (!window.fbq) {
    const n: ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void;
      queue?: unknown[];
      push?: (...args: unknown[]) => void;
      loaded?: boolean;
      version?: string;
    } = function (...args: unknown[]) {
      if (n.callMethod) {
        n.callMethod(...args);
      } else {
        n.queue?.push(args);
      }
    };
    if (!window._fbq) window._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
    window.fbq = n;

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
  }

  window.fbq('init', pixelId);
  window.fbq('track', 'PageView');
}

export function trackMetaEvent(
  eventName: 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'Purchase',
  params: {
    value?: number;
    contentIds?: string[];
    contentName?: string;
    eventId?: string;
  }
) {
  const eventId = params.eventId || `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  if (typeof window !== 'undefined' && window.fbq && initializedPixelId) {
    window.fbq(
      'track',
      eventName,
      {
        value: params.value || 0,
        currency: 'BDT',
        content_ids: params.contentIds || [],
        content_name: params.contentName,
        content_type: 'product',
      },
      { eventID: eventId }
    );
  }

  // Also mirror to server-side Meta Conversion API (CAPI) with matching eventId for deduplication
  void fetch('/api/tracking/meta-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventName,
      eventId,
      value: params.value || 0,
      contentIds: params.contentIds || [],
      eventSourceUrl: typeof window !== 'undefined' ? window.location.href : '',
    }),
  }).catch(() => undefined);

  return eventId;
}
