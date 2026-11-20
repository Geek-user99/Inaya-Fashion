import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, Eye, ShieldCheck, Star, Truck } from 'lucide-react';
import type { Category, Product, PublicSettings, Review } from '../types';
import { getRealisticViewerCount } from '../lib/visitors';
import { trackMetaEvent } from '../lib/metaPixel';
import { updatePageSeo } from '../lib/seo';
import { resolveAssetUrl } from '../lib/paths';

interface ProductDetailViewProps {
  product: Product;
  category?: Category;
  reviews: Review[];
  settings: PublicSettings;
  onBack: () => void;
  onAddToCart: (item: {
    product: Product;
    size: string;
    color: string;
    image: string;
  }, openBag: boolean) => void;
  onReviewAdded: (review: Review) => void;
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  product,
  category,
  reviews,
  settings,
  onBack,
  onAddToCart,
  onReviewAdded,
}) => {
  const firstAvailableColor = product.colors.find((c) => c.inStock) || product.colors[0];
  const firstAvailableSize = product.sizes.find((s) => s.inStock) || product.sizes[0];

  const [selectedColor, setSelectedColor] = useState(firstAvailableColor?.name || 'Default');
  const [selectedSize, setSelectedSize] = useState(firstAvailableSize?.size || 'M');
  const [activeImage, setActiveImage] = useState(firstAvailableColor?.image || product.images[0] || '');
  const [viewerTick, setViewerTick] = useState(0);
  const [addedFeedback, setAddedFeedback] = useState(false);

  // Customer Review Submission State
  const [revName, setRevName] = useState('');
  const [revLocation, setRevLocation] = useState('');
  const [revRating, setRevRating] = useState(5);
  const [revComment, setRevComment] = useState('');
  const [submittingRev, setSubmittingRev] = useState(false);

  useEffect(() => {
    const colorObj = product.colors.find((c) => c.inStock) || product.colors[0];
    const sizeObj = product.sizes.find((s) => s.inStock) || product.sizes[0];
    setSelectedColor(colorObj?.name || 'Default');
    setSelectedSize(sizeObj?.size || 'M');
    setActiveImage(colorObj?.image || product.images[0] || '');

    updatePageSeo({
      title: `${product.name} | Inaya Fashion`,
      description: product.description.slice(0, 155),
      image: product.images[0],
      path: `/product/${product.slug}`,
      product,
    });

    trackMetaEvent('ViewContent', {
      value: product.price,
      contentIds: [product.id],
      contentName: product.name,
    });
  }, [product]);

  useEffect(() => {
    const timer = setInterval(() => setViewerTick((t) => t + 1), 15_000);
    return () => clearInterval(timer);
  }, []);

  const viewerCount = getRealisticViewerCount(product.id, viewerTick);
  const currentColorObj = product.colors.find((c) => c.name === selectedColor);
  const currentSizeObj = product.sizes.find((s) => s.size === selectedSize);

  const isSelectedColorOut = currentColorObj ? !currentColorObj.inStock : false;
  const isSelectedSizeOut = currentSizeObj ? !currentSizeObj.inStock : false;
  const canPurchase = !product.comingSoon && !isSelectedColorOut && !isSelectedSizeOut;

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : '5.0';

  const handleAdd = (openBag: boolean) => {
    if (!canPurchase) return;
    trackMetaEvent('AddToCart', {
      value: product.price,
      contentIds: [product.id],
      contentName: product.name,
    });
    onAddToCart(
      {
        product,
        size: selectedSize,
        color: selectedColor,
        image: activeImage || product.images[0] || '',
      },
      openBag
    );
    if (!openBag) {
      setAddedFeedback(true);
      setTimeout(() => setAddedFeedback(false), 1800);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revName.trim() || !revComment.trim()) return;
    setSubmittingRev(true);
    try {
      const localRev: Review = {
        id: `rev-${Date.now()}`,
        productId: product.id,
        reviewerName: revName.trim(),
        location: revLocation.trim() || 'Dhaka',
        rating: revRating,
        comment: revComment.trim(),
        verifiedPurchase: false,
        createdAt: new Date().toISOString(),
      };
      onReviewAdded(localRev);
      setRevName('');
      setRevLocation('');
      setRevComment('');
    } finally {
      setSubmittingRev(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-28 md:pb-16">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-medium text-[#6E6A63] dark:text-[#A39E93] hover:text-[#171614] dark:hover:text-[#F4F2EE] mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Collection</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Sticky Gallery Left */}
        <div className="lg:col-span-6 lg:sticky lg:top-24 space-y-3">
          <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl bg-[#EFECE5] dark:bg-[#1C1A17] border border-[#E6E1D8] dark:border-[#272420]">
            <img
              src={resolveAssetUrl(activeImage || product.images[0] || '')}
              alt={`${product.name} - ${selectedColor}`}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>

          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {product.images.map((img, i) => (
                <button
                  key={`${img}-${i}`}
                  type="button"
                  onClick={() => setActiveImage(img)}
                  className={`aspect-[3/4] rounded-xl overflow-hidden border transition ${
                    activeImage === img
                      ? 'border-[#171614] dark:border-[#D9B675] ring-1 ring-[#171614] dark:ring-[#D9B675]'
                      : 'border-[#E6E1D8] dark:border-[#272420] opacity-75 hover:opacity-100'
                  }`}
                >
                  <img
                    src={resolveAssetUrl(img)}
                    alt={`${product.name} view ${i + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Contiguous Purchase Module Right */}
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-2 border-b border-[#E6E1D8] dark:border-[#272420] pb-5">
            <div className="flex items-center gap-2 text-xs text-[#6E6A63] dark:text-[#A39E93]">
              <span>{category?.name || 'Inaya Essentials'}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-[#C6A15B] text-[#C6A15B]" />
                <span className="font-mono-tabular font-medium text-[#171614] dark:text-[#F4F2EE]">
                  {avgRating}
                </span>
                <span>({reviews.length} reviews)</span>
              </span>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#171614] dark:text-[#F4F2EE] leading-tight text-balance">
              {product.name}
            </h1>

            <div className="flex items-baseline gap-3 pt-1 font-mono-tabular">
              <span className="text-2xl font-semibold text-[#171614] dark:text-[#F4F2EE]">
                ৳{product.price.toLocaleString()}
              </span>
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <span className="text-sm text-[#8A857C] line-through">
                  ৳{product.compareAtPrice.toLocaleString()}
                </span>
              )}
              {product.comingSoon && (
                <span className="text-xs font-sans font-medium text-[#9E7B42] dark:text-[#D9B675]">
                  · Launching Soon
                </span>
              )}
            </div>

            {/* Realistic Bangladesh Time-Aware Viewer Indicator */}
            {viewerCount > 0 && (
              <div className="flex items-center gap-2 text-xs text-[#6E6A63] dark:text-[#A39E93] pt-1">
                <Eye className="w-3.5 h-3.5 text-[#9E7B42] dark:text-[#D9B675]" />
                <span>
                  <strong className="font-mono-tabular text-[#171614] dark:text-[#F4F2EE]">
                    {viewerCount}
                  </strong>{' '}
                  {viewerCount === 1 ? 'person is' : 'people are'} viewing this piece right now
                </span>
              </div>
            )}
          </div>

          {/* Color Selector */}
          {product.colors.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[#6E6A63] dark:text-[#A39E93]">
                  Color: <strong className="text-[#171614] dark:text-[#F4F2EE]">{selectedColor}</strong>
                </span>
                {isSelectedColorOut && (
                  <span className="text-red-600 font-medium">Color Out of Stock</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2.5">
                {product.colors.map((c) => {
                  const active = selectedColor === c.name;
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => {
                        setSelectedColor(c.name);
                        if (c.image) setActiveImage(c.image);
                      }}
                      className={`min-h-[42px] px-3.5 py-2 rounded-xl border text-xs font-medium inline-flex items-center gap-2 transition ${
                        active
                          ? 'border-[#171614] dark:border-[#D9B675] bg-[#171614]/5 dark:bg-[#D9B675]/10'
                          : 'border-[#D8D2C7] dark:border-[#35322C] hover:border-[#9E7B42]'
                      } ${!c.inStock ? 'opacity-55 line-through' : ''}`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span>{c.name}</span>
                      {!c.inStock && <span className="text-[10px] no-underline">(Out)</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Size Selector */}
          {product.sizes.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[#6E6A63] dark:text-[#A39E93]">
                  Size: <strong className="text-[#171614] dark:text-[#F4F2EE]">{selectedSize}</strong>
                </span>
                {isSelectedSizeOut && (
                  <span className="text-red-600 font-medium">Size Out of Stock</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2.5">
                {product.sizes.map((s) => {
                  const active = selectedSize === s.size;
                  return (
                    <button
                      key={s.size}
                      type="button"
                      onClick={() => setSelectedSize(s.size)}
                      className={`min-h-[44px] min-w-[54px] px-4 py-2 rounded-xl border text-xs font-medium transition ${
                        active
                          ? 'border-[#171614] dark:border-[#D9B675] bg-[#171614] text-white dark:bg-[#D9B675] dark:text-[#121110]'
                          : 'border-[#D8D2C7] dark:border-[#35322C] hover:border-[#9E7B42]'
                      } ${!s.inStock ? 'opacity-45 line-through' : ''}`}
                    >
                      {s.size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Purchase CTAs */}
          <div className="space-y-3 pt-2">
            {product.comingSoon ? (
              <button
                disabled
                className="w-full min-h-[50px] rounded-xl bg-[#E6E1D8] dark:bg-[#272420] text-[#6E6A63] dark:text-[#A39E93] text-sm font-semibold cursor-not-allowed"
              >
                Coming Soon — Restocking This Week
              </button>
            ) : !canPurchase ? (
              <button
                disabled
                className="w-full min-h-[50px] rounded-xl bg-[#E6E1D8] dark:bg-[#272420] text-[#6E6A63] dark:text-[#A39E93] text-sm font-semibold cursor-not-allowed"
              >
                Selected Variant Out of Stock
              </button>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleAdd(false)}
                  className="min-h-[50px] rounded-xl border border-[#171614] dark:border-[#D9B675] text-[#171614] dark:text-[#F4F2EE] text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-[#171614]/5 dark:hover:bg-[#D9B675]/10 transition"
                >
                  {addedFeedback ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Added to Bag</span>
                    </>
                  ) : (
                    <span>Add to Bag</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleAdd(true)}
                  className="min-h-[50px] rounded-xl bg-[#171614] dark:bg-[#D9B675] text-white dark:text-[#121110] text-sm font-semibold hover:opacity-90 transition"
                >
                  Order Now (Cash on Delivery)
                </button>
              </div>
            )}
          </div>

          {/* Description & Delivery Trust */}
          <div className="space-y-4 pt-4 border-t border-[#E6E1D8] dark:border-[#272420] text-sm leading-relaxed text-[#46433E] dark:text-[#C8C3B9]">
            <p>{product.description}</p>
            {product.fabricCare && (
              <div className="text-xs text-[#6E6A63] dark:text-[#A39E93]">
                <strong className="text-[#171614] dark:text-[#F4F2EE]">Fabric & Care:</strong>{' '}
                {product.fabricCare}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[#F4F1EA] dark:bg-[#1A1815]">
                <Truck className="w-4 h-4 text-[#9E7B42] dark:text-[#D9B675] shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-[#171614] dark:text-[#F4F2EE]">
                    Steadfast Express Delivery
                  </div>
                  <div className="text-[#6E6A63] dark:text-[#A39E93] mt-0.5">
                    {settings.deliveryEnabled
                      ? `Dhaka ৳${settings.deliveryInsideDhaka} · Outside ৳${settings.deliveryOutsideDhaka}${
                          settings.freeDeliveryThreshold > 0
                            ? ` (Free over ৳${settings.freeDeliveryThreshold.toLocaleString()})`
                            : ''
                        }`
                      : 'Complimentary delivery across Bangladesh'}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[#F4F1EA] dark:bg-[#1A1815]">
                <ShieldCheck className="w-4 h-4 text-[#9E7B42] dark:text-[#D9B675] shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-[#171614] dark:text-[#F4F2EE]">
                    Cash on Delivery & Easy Exchange
                  </div>
                  <div className="text-[#6E6A63] dark:text-[#A39E93] mt-0.5">
                    Check fabric quality upon arrival before payment.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Reviews Section (Banglish & Bangla natural reviews) */}
      <section className="mt-16 pt-12 border-t border-[#E6E1D8] dark:border-[#272420]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4 space-y-4">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-semibold">
                Customer Reviews
              </h2>
              <p className="text-xs text-[#6E6A63] dark:text-[#A39E93] mt-1">
                Verified feedback from shoppers across Dhaka, Chattogram & Sylhet.
              </p>
            </div>

            <form
              onSubmit={handleReviewSubmit}
              className="p-5 rounded-2xl bg-[#F4F1EA] dark:bg-[#181614] border border-[#E6E1D8] dark:border-[#272420] space-y-3"
            >
              <div className="text-xs font-semibold">Write a Review</div>
              <input
                required
                type="text"
                value={revName}
                onChange={(e) => setRevName(e.target.value)}
                placeholder="Your Name"
                className="w-full min-h-[40px] px-3 rounded-lg border border-[#D8D2C7] dark:border-[#35322C] bg-white dark:bg-[#121110] text-xs"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={revLocation}
                  onChange={(e) => setRevLocation(e.target.value)}
                  placeholder="Area (e.g. Uttara, Dhaka)"
                  className="flex-1 min-h-[40px] px-3 rounded-lg border border-[#D8D2C7] dark:border-[#35322C] bg-white dark:bg-[#121110] text-xs"
                />
                <select
                  value={revRating}
                  onChange={(e) => setRevRating(Number(e.target.value))}
                  className="min-h-[40px] px-2.5 rounded-lg border border-[#D8D2C7] dark:border-[#35322C] bg-white dark:bg-[#121110] text-xs"
                >
                  <option value={5}>5 ★</option>
                  <option value={4}>4 ★</option>
                  <option value={3}>3 ★</option>
                </select>
              </div>
              <textarea
                required
                rows={3}
                value={revComment}
                onChange={(e) => setRevComment(e.target.value)}
                placeholder="Share how the fit and fabric felt..."
                className="w-full p-3 rounded-lg border border-[#D8D2C7] dark:border-[#35322C] bg-white dark:bg-[#121110] text-xs"
              />
              <button
                type="submit"
                disabled={submittingRev}
                className="w-full min-h-[40px] rounded-lg bg-[#171614] dark:bg-[#D9B675] text-white dark:text-[#121110] text-xs font-semibold"
              >
                Submit Review
              </button>
            </form>
          </div>

          <div className="lg:col-span-8 divide-y divide-[#E6E1D8] dark:divide-[#272420]">
            {reviews.length === 0 ? (
              <p className="text-sm text-[#6E6A63] dark:text-[#A39E93] py-6">
                No reviews yet for this piece. Be the first to share your experience.
              </p>
            ) : (
              reviews.map((rev) => (
                <div key={rev.id} className="py-5 first:pt-0 space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-[#171614] dark:text-[#F4F2EE]">
                        {rev.reviewerName}
                      </span>
                      <span aria-hidden="true" className="text-[#8A857C]">·</span>
                      <span className="text-[#6E6A63] dark:text-[#A39E93]">{rev.location}</span>
                      {rev.verifiedPurchase && (
                        <>
                          <span aria-hidden="true" className="text-[#8A857C]">·</span>
                          <span className="text-emerald-700 dark:text-emerald-400">Verified Buyer</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: rev.rating }).map((_, idx) => (
                        <Star key={idx} className="w-3.5 h-3.5 fill-[#C6A15B] text-[#C6A15B]" />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-[#3A3733] dark:text-[#D3CEC4] leading-relaxed">
                    {rev.comment}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Mobile Sticky Bottom Buy Bar */}
      {!product.comingSoon && canPurchase && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 p-3 bg-[#FAF9F6]/95 dark:bg-[#141311]/95 backdrop-blur-md border-t border-[#E6E1D8] dark:border-[#272420] flex items-center justify-between gap-3 pb-safe">
          <div>
            <div className="text-xs text-[#6E6A63] dark:text-[#A39E93] truncate max-w-[140px]">
              {selectedColor} · {selectedSize}
            </div>
            <div className="font-mono-tabular font-semibold text-base">
              ৳{product.price.toLocaleString()}
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleAdd(true)}
            className="flex-1 min-h-[44px] rounded-xl bg-[#171614] dark:bg-[#D9B675] text-white dark:text-[#121110] text-xs font-semibold"
          >
            Order Cash on Delivery
          </button>
        </div>
      )}
    </div>
  );
};
