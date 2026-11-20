import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Menu, Moon, ShoppingBag, Star, Sun, X } from 'lucide-react';
import type { CartItem, Category, Product, PublicSettings, Review } from './types';
import { BrandLogo } from './components/BrandLogo';
import { ProductCard } from './components/ProductCard';
import { ProductDetailView } from './components/ProductDetailView';
import { TrackOrderView } from './components/TrackOrderView';
import { CartDrawer } from './components/CartDrawer';
import { AdminApp } from './components/AdminApp';
import { initMetaPixel } from './lib/metaPixel';
import { updatePageSeo } from './lib/seo';
import { resolveAssetUrl, stripBasePath, withBasePath } from './lib/paths';
import { fetchStorefrontFromSupabaseFallback, tryExpressApi } from './lib/fallbackStorefront';

const DEFAULT_SETTINGS: PublicSettings = {
  storeName: 'Inaya Fashion',
  topbarEnabled: true,
  topbarText:
    'Free nationwide delivery on orders above ৳2,500 · Cash on Delivery available across Bangladesh',
  deliveryEnabled: true,
  deliveryInsideDhaka: 70,
  deliveryOutsideDhaka: 130,
  freeDeliveryThreshold: 2500,
  socialLinks: {
    facebook: 'https://facebook.com',
    instagram: 'https://instagram.com',
    tiktok: 'https://tiktok.com',
    whatsapp: 'https://wa.me/8801700000000',
    youtube: '',
  },
  metaPixelId: '',
};

export default function App() {
  const [pathname, setPathname] = useState<string>(() => stripBasePath(window.location.pathname));
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('inaya_theme');
    return saved === 'dark'; // Default Light Mode
  });

  const [settings, setSettings] = useState<PublicSettings>(DEFAULT_SETTINGS);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem('inaya_cart');
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  // Sync theme class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('inaya_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('inaya_theme', 'light');
    }
  }, [darkMode]);

  // Persist cart
  useEffect(() => {
    localStorage.setItem('inaya_cart', JSON.stringify(cart));
  }, [cart]);

  const fetchStorefront = useCallback(async () => {
    try {
      const resp = await tryExpressApi('/api/storefront');
      if (resp && resp.ok) {
        const data = (await resp.json()) as {
          settings: PublicSettings;
          categories: Category[];
          products: Product[];
          reviews: Review[];
        };
        setSettings(data.settings);
        setCategories(data.categories);
        setProducts(data.products);
        setReviews(data.reviews);
        if (data.settings.metaPixelId) {
          initMetaPixel(data.settings.metaPixelId);
        }
        return;
      }

      const fallback = await fetchStorefrontFromSupabaseFallback(DEFAULT_SETTINGS);
      setSettings(fallback.settings);
      setCategories(fallback.categories);
      setProducts(fallback.products);
      setReviews(fallback.reviews);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStorefront();
  }, [fetchStorefront]);

  // Clean SPA Permalink Routing (works on / AND /Inaya_Fashion/)
  const navigate = useCallback((to: string) => {
    const cleanRoute = stripBasePath(to);
    const fullTarget = withBasePath(cleanRoute);
    if (window.location.pathname !== fullTarget) {
      window.history.pushState({}, '', fullTarget);
    }
    setPathname(cleanRoute);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const handlePop = () => setPathname(stripBasePath(window.location.pathname));
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  // Update SEO metadata for non-product routes
  useEffect(() => {
    if (pathname.startsWith('/product/')) return;
    if (pathname.startsWith('/admin')) {
      updatePageSeo({
        title: 'Inaya Admin – Store Operations',
        description: 'Mobile admin app for Inaya Fashion order dispatch and catalog.',
        path: '/admin',
      });
      return;
    }
    if (pathname.startsWith('/category/')) {
      const slug = pathname.replace('/category/', '').split('/')[0];
      const cat = categories.find((c) => c.slug === slug);
      updatePageSeo({
        title: `${cat?.name || 'Collection'} | Inaya Fashion`,
        description: cat?.description || 'Explore modern ribbed knitwear and tailored essentials.',
        path: pathname,
      });
      return;
    }
    updatePageSeo({
      title: 'Inaya Fashion – Modern Ribbed Knitwear & Tailored Essentials',
      description:
        'Shop modern ribbed knit turtleneck sweaters, mock necks, V-neck tops, and tailored flare leg pants at Inaya Fashion. Fast Cash on Delivery across Bangladesh.',
      path: pathname,
    });
  }, [pathname, categories]);

  const handleAddToCart = (
    payload: { product: Product; size: string; color: string; image: string },
    openBag: boolean
  ) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (i) =>
          i.productId === payload.product.id &&
          i.size === payload.size &&
          i.color === payload.color
      );
      if (existingIdx >= 0) {
        return prev.map((item, idx) =>
          idx === existingIdx ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          productId: payload.product.id,
          slug: payload.product.slug,
          name: payload.product.name,
          image: payload.image,
          price: payload.product.price,
          size: payload.size,
          color: payload.color,
          quantity: 1,
        },
      ];
    });
    if (openBag) setCartOpen(true);
  };

  // Route: /admin (Dedicated Mobile-Native Merchant App)
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return (
      <AdminApp
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((d) => !d)}
        onExitToStore={() => navigate('/')}
        onStorefrontDataChanged={() => void fetchStorefront()}
      />
    );
  }

  const totalBagItems = cart.reduce((sum, i) => sum + i.quantity, 0);

  // Route matching for Storefront
  const isProductRoute = pathname.startsWith('/product/');
  const productSlug = isProductRoute ? pathname.replace('/product/', '').split('/')[0] : '';
  const activeProduct = isProductRoute ? products.find((p) => p.slug === productSlug) : null;

  const isCategoryRoute = pathname.startsWith('/category/');
  const routeCategorySlug = isCategoryRoute ? pathname.replace('/category/', '').split('/')[0] : '';
  const isShopRoute = pathname === '/shop' || isCategoryRoute;
  const isTrackRoute = pathname === '/track-order';

  const effectiveCatSlug = isCategoryRoute ? routeCategorySlug : selectedCategorySlug;
  const filteredCatalog = products.filter((p) => {
    if (!isShopRoute && !p.showOnHomepage) return false;
    if (effectiveCatSlug === 'all') return true;
    const cat = categories.find((c) => c.slug === effectiveCatSlug);
    return cat ? p.categoryId === cat.id : true;
  });

  const activeCategoryObj = categories.find((c) => c.slug === effectiveCatSlug);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col bg-[#FAF9F6] dark:bg-[#0F0F0E] text-[#171614] dark:text-[#F4F2EE] transition-colors duration-200">
      {/* Slim Topbar Marquee (Right-to-Left, Admin Toggleable) */}
      {settings.topbarEnabled && settings.topbarText && (
        <div className="w-full max-w-full h-8 bg-[#171614] dark:bg-[#1E1C18] text-[#FAF9F6] overflow-hidden flex items-center text-[11px] tracking-wide">
          <div className="animate-marquee-rtl whitespace-nowrap">
            <span className="px-8">{settings.topbarText}</span>
            <span className="px-8" aria-hidden="true">{settings.topbarText}</span>
            <span className="px-8" aria-hidden="true">{settings.topbarText}</span>
            <span className="px-8" aria-hidden="true">{settings.topbarText}</span>
          </div>
        </div>
      )}

      {/* Clean 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 h-16 bg-[#FAF9F6]/90 dark:bg-[#0F0F0E]/90 backdrop-blur-md border-b border-[#E6E1D8] dark:border-[#24221E]">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
          {/* Zone 1: Horizontal Brand Lockup */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center rounded-lg"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                setSelectedCategorySlug('all');
                navigate('/');
              }}
              className="whitespace-nowrap shrink-0"
            >
              <BrandLogo />
            </a>
          </div>

          {/* Zone 2: 4 Single-Line Text Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#524E48] dark:text-[#C5C0B6]">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                setSelectedCategorySlug('all');
                navigate('/');
              }}
              className="hover:text-[#171614] dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Home
            </a>
            <a
              href="/shop"
              onClick={(e) => {
                e.preventDefault();
                setSelectedCategorySlug('all');
                navigate('/shop');
              }}
              className="hover:text-[#171614] dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Collection
            </a>
            <a
              href="/category/ribbed-knitwear"
              onClick={(e) => {
                e.preventDefault();
                navigate('/category/ribbed-knitwear');
              }}
              className="hover:text-[#171614] dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Knitwear
            </a>
            <a
              href="/track-order"
              onClick={(e) => {
                e.preventDefault();
                navigate('/track-order');
              }}
              className="hover:text-[#171614] dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Track Order
            </a>
          </nav>

          {/* Zone 3: Theme Toggle + Primary Bag Action */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="min-h-[42px] px-4 rounded-xl bg-[#171614] dark:bg-[#D9B675] text-white dark:text-[#121110] text-xs font-semibold inline-flex items-center gap-2 hover:opacity-90 transition whitespace-nowrap shrink-0"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Bag</span>
              <span className="font-mono-tabular">({totalBagItems})</span>
            </button>
          </div>
        </div>

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#FAF9F6] dark:bg-[#141311] border-b border-[#E6E1D8] dark:border-[#24221E] px-6 py-4 space-y-2 text-sm font-medium">
            <button
              onClick={() => {
                setSelectedCategorySlug('all');
                navigate('/');
              }}
              className="block w-full text-left py-2.5"
            >
              Home
            </button>
            <button
              onClick={() => {
                setSelectedCategorySlug('all');
                navigate('/shop');
              }}
              className="block w-full text-left py-2.5"
            >
              All Collection
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/category/${c.slug}`)}
                className="block w-full text-left py-2.5 text-[#6E6A63] dark:text-[#A39E93]"
              >
                {c.name}
              </button>
            ))}
            <button
              onClick={() => navigate('/track-order')}
              className="block w-full text-left py-2.5"
            >
              Track Order
            </button>
          </div>
        )}
      </header>

      {/* Main Content Router */}
      <main className="flex-1">
        {isProductRoute ? (
          activeProduct ? (
            <ProductDetailView
              product={activeProduct}
              category={categories.find((c) => c.id === activeProduct.categoryId)}
              reviews={reviews.filter((r) => r.productId === activeProduct.id)}
              settings={settings}
              onBack={() => navigate('/shop')}
              onAddToCart={handleAddToCart}
              onReviewAdded={(newRev) => setReviews((prev) => [newRev, ...prev])}
            />
          ) : (
            <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-4">
              <h1 className="font-display text-3xl font-semibold">Piece Not Found</h1>
              <p className="text-sm text-[#6E6A63] dark:text-[#A39E93]">
                {loading ? 'Loading collection...' : 'This garment may have been archived.'}
              </p>
              <button
                onClick={() => navigate('/shop')}
                className="px-5 py-2.5 rounded-xl bg-[#171614] dark:bg-[#D9B675] text-white dark:text-[#121110] text-xs font-semibold"
              >
                Browse Collection
              </button>
            </div>
          )
        ) : isTrackRoute ? (
          <TrackOrderView />
        ) : isShopRoute ? (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E6E1D8] dark:border-[#24221E] pb-6">
              <div>
                <div className="text-xs text-[#6E6A63] dark:text-[#A39E93]">Inaya Fashion Catalog</div>
                <h1 className="font-display text-3xl sm:text-4xl font-semibold mt-1">
                  {activeCategoryObj ? activeCategoryObj.name : 'Complete Collection'}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#F0ECE3] dark:bg-[#191815]">
                <button
                  onClick={() => {
                    setSelectedCategorySlug('all');
                    navigate('/shop');
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                    effectiveCatSlug === 'all'
                      ? 'bg-white dark:bg-[#272420] text-[#171614] dark:text-[#F4F2EE] shadow-sm'
                      : 'text-[#6E6A63] dark:text-[#A39E93]'
                  }`}
                >
                  All Pieces
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => navigate(`/category/${cat.slug}`)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                      effectiveCatSlug === cat.slug
                        ? 'bg-white dark:bg-[#272420] text-[#171614] dark:text-[#F4F2EE] shadow-sm'
                        : 'text-[#6E6A63] dark:text-[#A39E93]'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-6">
              {filteredCatalog.map((prod, idx) => (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  category={categories.find((c) => c.id === prod.categoryId)}
                  onNavigate={navigate}
                  index={idx}
                />
              ))}
            </div>
          </section>
        ) : (
          /* HOMEPAGE (Strict 3-Section Editorial Structure) */
          <>
            {/* Section 1: Expanded 16:9 Editorial Banner (Full heads visible, zero overlay text/buttons, no mobile crop) */}
            <section className="w-full bg-[#121110] border-b border-[#E6E1D8] dark:border-[#24221E] overflow-hidden">
              <motion.div
                initial={{ opacity: 0, scale: 1.01 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                className="max-w-[1600px] mx-auto"
              >
                <img
                  src={resolveAssetUrl('/src/assets/images/inaya_hero_expanded_1795190724222.jpg')}
                  alt="Inaya Fashion Ribbed Knitwear and Tailored Flare Pants"
                  className="w-full h-auto block object-contain"
                />
              </motion.div>
            </section>

            {/* Section 2: Compact Featured Collection Grid */}
            <section id="featured-collection" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="text-xs text-[#6E6A63] dark:text-[#A39E93]">Curated Signatures</div>
                  <h2 className="font-display text-2xl sm:text-3xl font-semibold">
                    The Ribbed Collection
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#F0ECE3] dark:bg-[#191815] self-start">
                  <button
                    onClick={() => setSelectedCategorySlug('all')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                      selectedCategorySlug === 'all'
                        ? 'bg-white dark:bg-[#272420] text-[#171614] dark:text-[#F4F2EE] shadow-sm'
                        : 'text-[#6E6A63] dark:text-[#A39E93]'
                    }`}
                  >
                    Featured
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategorySlug(cat.slug)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                        selectedCategorySlug === cat.slug
                          ? 'bg-white dark:bg-[#272420] text-[#171614] dark:text-[#F4F2EE] shadow-sm'
                          : 'text-[#6E6A63] dark:text-[#A39E93]'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </motion.div>

              {loading && products.length === 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                  {[1, 2, 3, 4].map((n) => (
                    <div
                      key={n}
                      className="aspect-[3/4] rounded-md bg-[#EFECE5] dark:bg-[#1C1A17] animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-6">
                  {filteredCatalog.map((prod, idx) => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      category={categories.find((c) => c.id === prod.categoryId)}
                      onNavigate={navigate}
                      index={idx}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Section 3: Right-to-Left Customer Reviews Marquee */}
            {reviews.length > 0 && (
              <section className="w-full max-w-full overflow-hidden border-t border-[#E6E1D8] dark:border-[#24221E] bg-[#F3EFE6] dark:bg-[#141311] py-12 space-y-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-baseline justify-between gap-4">
                  <div>
                    <div className="text-xs text-[#6E6A63] dark:text-[#A39E93]">Verified Shoppers</div>
                    <h2 className="font-display text-2xl sm:text-3xl font-semibold mt-0.5">
                      Loved Across Bangladesh
                    </h2>
                  </div>
                  <span className="text-xs font-mono-tabular text-[#6E6A63] dark:text-[#A39E93]">
                    4.9 / 5.0 Average
                  </span>
                </div>

                <div className="w-full overflow-hidden">
                  <div className="animate-reviews-rtl gap-4 px-4">
                    {[...reviews, ...reviews].map((rev, idx) => (
                      <div
                        key={`${rev.id}-${idx}`}
                        className="w-[290px] sm:w-[340px] shrink-0 p-4 rounded-md bg-[#FAF9F6] dark:bg-[#1A1815] border border-[#E6E1D8] dark:border-[#2A2824] flex flex-col justify-between gap-3"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: rev.rating }).map((_, starIdx) => (
                              <Star
                                key={starIdx}
                                className="w-3.5 h-3.5 fill-[#C6A15B] text-[#C6A15B]"
                              />
                            ))}
                          </div>
                          <p className="text-xs sm:text-[13px] text-[#3A3733] dark:text-[#D3CEC4] leading-relaxed line-clamp-3">
                            &ldquo;{rev.comment}&rdquo;
                          </p>
                        </div>
                        <div className="text-[11px] text-[#6E6A63] dark:text-[#A39E93] pt-2 border-t border-[#ECE7DD] dark:border-[#26231F] flex items-center justify-between gap-2">
                          <span className="font-semibold text-[#171614] dark:text-[#F4F2EE] truncate">
                            {rev.reviewerName}
                          </span>
                          <span className="truncate">{rev.location}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Clean Editorial Footer */}
      <footer className="border-t border-[#E6E1D8] dark:border-[#24221E] bg-[#FAF9F6] dark:bg-[#0F0F0E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-5 space-y-3">
            <BrandLogo />
            <p className="text-xs text-[#6E6A63] dark:text-[#A39E93] max-w-sm leading-relaxed">
              Contemporary ribbed knitwear and tailored essentials crafted for effortless everyday elegance across Bangladesh.
            </p>
          </div>

          <div className="md:col-span-3 space-y-2.5 text-xs">
            <div className="font-semibold text-[#171614] dark:text-[#F4F2EE]">Explore</div>
            <div className="flex flex-col gap-2 text-[#6E6A63] dark:text-[#A39E93]">
              <button onClick={() => navigate('/shop')} className="text-left hover:text-[#171614] dark:hover:text-white">
                Shop Collection
              </button>
              <button onClick={() => navigate('/track-order')} className="text-left hover:text-[#171614] dark:hover:text-white">
                Track Parcel
              </button>
              <button onClick={() => navigate('/admin')} className="text-left hover:text-[#171614] dark:hover:text-white">
                Merchant Admin App
              </button>
            </div>
          </div>

          <div className="md:col-span-4 space-y-2.5 text-xs">
            <div className="font-semibold text-[#171614] dark:text-[#F4F2EE]">Connect With Us</div>
            <div className="flex flex-wrap gap-4 text-[#6E6A63] dark:text-[#A39E93]">
              {settings.socialLinks.facebook && (
                <a href={settings.socialLinks.facebook} target="_blank" rel="noreferrer" className="hover:text-[#9E7B42]">
                  Facebook
                </a>
              )}
              {settings.socialLinks.instagram && (
                <a href={settings.socialLinks.instagram} target="_blank" rel="noreferrer" className="hover:text-[#9E7B42]">
                  Instagram
                </a>
              )}
              {settings.socialLinks.tiktok && (
                <a href={settings.socialLinks.tiktok} target="_blank" rel="noreferrer" className="hover:text-[#9E7B42]">
                  TikTok
                </a>
              )}
              {settings.socialLinks.whatsapp && (
                <a href={settings.socialLinks.whatsapp} target="_blank" rel="noreferrer" className="hover:text-[#9E7B42]">
                  WhatsApp
                </a>
              )}
              {settings.socialLinks.youtube && (
                <a href={settings.socialLinks.youtube} target="_blank" rel="noreferrer" className="hover:text-[#9E7B42]">
                  YouTube
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-[#E6E1D8] dark:border-[#24221E] pt-5 pb-2 px-4 sm:px-6 max-w-7xl mx-auto text-[11px] text-[#8A857C]">
          © {new Date().getFullYear()} Inaya Fashion · All rights reserved.
        </div>

        {/* Full-Width Display Wordmark Footer Signature (Light & Dark Mode Visible) */}
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pb-4 overflow-hidden select-none">
          <div
            aria-hidden="true"
            className="font-display font-bold uppercase tracking-[0.04em] leading-[0.88] text-[11.5vw] sm:text-[9.2vw] xl:text-[132px] text-[#171614]/[0.11] dark:text-[#F4F2EE]/[0.12] whitespace-nowrap"
          >
            Inaya Fashion
          </div>
        </div>
      </footer>

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart}
        settings={settings}
        onUpdateQty={(idx, delta) => {
          setCart((prev) =>
            prev
              .map((item, i) => (i === idx ? { ...item, quantity: item.quantity + delta } : item))
              .filter((item) => item.quantity > 0)
          );
        }}
        onRemoveItem={(idx) => setCart((prev) => prev.filter((_, i) => i !== idx))}
        onClearCart={() => setCart([])}
        onOrderCreated={() => undefined}
      />
    </div>
  );
}
