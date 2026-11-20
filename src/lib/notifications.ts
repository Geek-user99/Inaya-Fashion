export async function requestOrderNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') return 'granted';
  return await Notification.requestPermission();
}

export function playOrderChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [587.33, 880, 1174.66];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + idx * 0.11;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.14, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.36);
    });
  } catch {
    // Ignore autoplay restriction errors
  }
}

export async function triggerNativeOrderAlert(params: {
  invoice: string;
  customerName: string;
  totalAmount: number;
}) {
  playOrderChime();

  const title = `New Order ${params.invoice}`;
  const body = `${params.customerName} placed a COD order of ৳${params.totalAmount.toLocaleString()}`;

  // 1. Capacitor LocalNotifications bridge (when running inside Android APK)
  try {
    const cap = (window as unknown as {
      Capacitor?: {
        Plugins?: {
          LocalNotifications?: {
            schedule: (opts: unknown) => Promise<void>;
          };
        };
      };
    }).Capacitor;
    if (cap?.Plugins?.LocalNotifications) {
      await cap.Plugins.LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: Math.floor(Date.now() % 100000),
            schedule: { at: new Date(Date.now() + 200) },
          },
        ],
      });
      return;
    }
  } catch {
    // Fall through to Web Notification API
  }

  // 2. Web / PWA Notification API
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      const reg = await navigator.serviceWorker?.ready;
      if (reg) {
        await reg.showNotification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: params.invoice,
        });
      } else {
        new Notification(title, { body, icon: '/pwa-192x192.png' });
      }
    } catch {
      // Fallback safely
    }
  }
}
