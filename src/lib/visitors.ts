/**
 * Generates an organic, Bangladesh-time-aware live viewer count (Asia/Dhaka UTC+6).
 * Deep night / early dawn (02:00 - 06:30 BDT): drops to 0-1 visitors.
 * Morning (07:00 - 11:30 BDT): gradually rises to 3-9 visitors.
 * Afternoon & Prime Evening (12:00 - 23:30 BDT): 11-26 active shoppers.
 */
export function getRealisticViewerCount(productId: string, tick: number): number {
  const now = new Date();
  const dhakaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
  const hour = dhakaTime.getHours() + dhakaTime.getMinutes() / 60;

  let seed = 0;
  for (let i = 0; i < productId.length; i += 1) {
    seed = (seed * 31 + productId.charCodeAt(i)) % 997;
  }

  const wave = Math.sin(tick * 0.7 + (seed % 11));

  // Deep night / pre-dawn: realistically quiet (0 or occasionally 1)
  if (hour >= 2.0 && hour < 6.25) {
    if (hour >= 3.0 && hour < 5.5) {
      return (seed + tick) % 7 === 0 ? 1 : 0;
    }
    return (seed + tick) % 3 === 0 ? 1 : 0;
  }

  // Early morning ramp (6:15 AM - 9:00 AM)
  if (hour >= 6.25 && hour < 9.0) {
    const base = 1 + Math.floor(((hour - 6.25) / 2.75) * 4);
    return Math.max(0, base + Math.round(wave));
  }

  // Late morning (9:00 AM - 12:00 PM)
  if (hour >= 9.0 && hour < 12.0) {
    const base = 5 + (seed % 4);
    return Math.max(2, base + Math.round(wave * 1.5));
  }

  // Afternoon & Evening Peak (12:00 PM - 11:30 PM)
  if (hour >= 12.0 && hour < 23.5) {
    const eveningBoost = hour >= 19.0 && hour <= 22.5 ? 5 : 0;
    const base = 10 + eveningBoost + (seed % 7);
    return Math.max(6, base + Math.round(wave * 2));
  }

  // Midnight wind-down (23:30 - 02:00)
  return Math.max(1, 2 + (seed % 3) + Math.round(wave));
}
