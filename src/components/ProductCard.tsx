import React, { useState } from 'react';
import { motion } from 'motion/react';
import type { Category, Product } from '../types';
import { resolveAssetUrl } from '../lib/paths';

interface ProductCardProps {
  product: Product;
  category?: Category;
  onNavigate: (path: string) => void;
  index?: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  category,
  onNavigate,
  index = 0,
}) => {
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [imgError, setImgError] = useState(false);

  const primaryImg = resolveAssetUrl(product.images[activeImageIdx] || product.images[0] || '');
  const allSizesOut = product.sizes.length > 0 && product.sizes.every((s) => !s.inStock);
  const allColorsOut = product.colors.length > 0 && product.colors.every((c) => !c.inStock);
  const isSoldOut = !product.comingSoon && (allSizesOut || allColorsOut);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.25), ease: [0.16, 1, 0.3, 1] }}
      onClick={() => onNavigate(`/product/${product.slug}`)}
      className="group cursor-pointer flex flex-col transition-transform duration-200 hover:-translate-y-0.5"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-md bg-[#EFECE5] dark:bg-[#1C1A17] border border-[#E6E1D8] dark:border-[#272420]">
        {!imgError && primaryImg ? (
          <img
            src={primaryImg}
            alt={product.name}
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-[#F2EFE8] to-[#E5DFD3] dark:from-[#1D1B18] dark:to-[#121110]">
            <span className="font-display text-base text-[#6E6A63] dark:text-[#A39E93]">{product.name}</span>
          </div>
        )}

        {(product.comingSoon || isSoldOut) && (
          <div className="absolute bottom-2.5 left-2.5 bg-white/95 dark:bg-[#141311]/95 px-2 py-0.5 rounded-sm text-[10px] font-medium tracking-wide text-[#171614] dark:text-[#F4F2EE] shadow-sm">
            {product.comingSoon ? 'Coming Soon' : 'Sold Out'}
          </div>
        )}
      </div>

      <div className="pt-2.5 space-y-1">
        <div className="flex items-center justify-between gap-2 text-[11px] text-[#6E6A63] dark:text-[#A39E93]">
          <span className="truncate">{category?.name || 'Collection'}</span>
          {product.colors.length > 1 && (
            <div
              className="flex items-center gap-1 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              {product.colors.map((c, idx) => (
                <button
                  key={c.name}
                  type="button"
                  title={c.name}
                  onClick={() => {
                    const matchedImgIdx = product.images.indexOf(c.image);
                    if (matchedImgIdx >= 0) setActiveImageIdx(matchedImgIdx);
                    else setActiveImageIdx(idx % Math.max(1, product.images.length));
                  }}
                  className={`w-3 h-3 rounded-full border transition-transform ${
                    c.inStock ? 'border-black/20 dark:border-white/30 hover:scale-110' : 'opacity-40 border-dashed border-black/40'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  aria-label={`Select color ${c.name}`}
                />
              ))}
            </div>
          )}
        </div>

        <h3 className="text-sm font-semibold text-[#171614] dark:text-[#F4F2EE] leading-snug group-hover:text-[#9E7B42] dark:group-hover:text-[#D9B675] transition-colors line-clamp-2">
          {product.name}
        </h3>

        <div className="flex items-baseline gap-2 font-mono-tabular text-xs sm:text-sm">
          <span className="font-semibold text-[#171614] dark:text-[#F4F2EE]">
            ৳{product.price.toLocaleString()}
          </span>
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <span className="text-[11px] text-[#8A857C] line-through">
              ৳{product.compareAtPrice.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </motion.article>
  );
};
