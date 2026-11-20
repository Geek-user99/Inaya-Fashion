const rawBase = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

export function getBasePath(): string {
  if (rawBase && rawBase !== '/') return rawBase;
  if (typeof window !== 'undefined') {
    if (window.location.pathname.startsWith('/Inaya-Fashion')) return '/Inaya-Fashion';
    if (window.location.pathname.startsWith('/Inaya_Fashion')) return '/Inaya_Fashion';
  }
  return '';
}

export function stripBasePath(pathname: string): string {
  const base = getBasePath();
  let clean = pathname || '/';
  if (base && clean.startsWith(base)) {
    clean = clean.slice(base.length) || '/';
  }
  if (!clean.startsWith('/')) clean = `/${clean}`;
  return clean;
}

export function withBasePath(path: string): string {
  if (!path) return getBasePath() || '/';
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  const base = getBasePath();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (base && normalized.startsWith(`${base}/`)) return normalized;
  return `${base}${normalized}`;
}

export function resolveAssetUrl(src: string): string {
  if (!src) return '';
  if (/^(https?:|data:|blob:)/i.test(src)) return src;
  return withBasePath(src);
}

export function apiUrl(endpoint: string): string {
  const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return apiBase ? `${apiBase}${cleanEndpoint}` : cleanEndpoint;
}
