import type { Product } from '../types';

function setMetaTag(selector: string, content: string, attrName: 'name' | 'property' = 'name', attrVal?: string) {
  let el = document.querySelector(selector) as HTMLMetaElement | null;
  if (!el && attrVal) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrVal);
    document.head.appendChild(el);
  }
  if (el) el.setAttribute('content', content);
}

export function updatePageSeo(opts: {
  title: string;
  description: string;
  image?: string;
  path?: string;
  product?: Product | null;
}) {
  if (typeof document === 'undefined') return;

  document.title = opts.title;
  setMetaTag('meta[name="description"]', opts.description, 'name', 'description');
  setMetaTag('meta[property="og:title"]', opts.title, 'property', 'og:title');
  setMetaTag('meta[property="og:description"]', opts.description, 'property', 'og:description');
  setMetaTag('meta[name="twitter:title"]', opts.title, 'name', 'twitter:title');
  setMetaTag('meta[name="twitter:description"]', opts.description, 'name', 'twitter:description');

  if (opts.image) {
    const absoluteImg = opts.image.startsWith('http')
      ? opts.image
      : `${window.location.origin}${opts.image}`;
    setMetaTag('meta[property="og:image"]', absoluteImg, 'property', 'og:image');
  }

  const canonicalUrl = `${window.location.origin}${opts.path ?? window.location.pathname}`;
  let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = canonicalUrl;
  setMetaTag('meta[property="og:url"]', canonicalUrl, 'property', 'og:url');

  // Product JSON-LD for Google Rich Results
  const existingLd = document.getElementById('inaya-product-jsonld');
  if (existingLd) existingLd.remove();

  if (opts.product) {
    const script = document.createElement('script');
    script.id = 'inaya-product-jsonld';
    script.type = 'application/ld+json';
    const hasStock =
      !opts.product.comingSoon && opts.product.sizes.some((s) => s.inStock);
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: opts.product.name,
      image: opts.product.images.map((img) =>
        img.startsWith('http') ? img : `${window.location.origin}${img}`
      ),
      description: opts.product.description,
      brand: {
        '@type': 'Brand',
        name: 'Inaya Fashion',
      },
      offers: {
        '@type': 'Offer',
        url: canonicalUrl,
        priceCurrency: 'BDT',
        price: opts.product.price,
        availability: hasStock
          ? 'https://schema.org/InStock'
          : 'https://schema.org/PreOrder',
      },
    });
    document.head.appendChild(script);
  }
}
