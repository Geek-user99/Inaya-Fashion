import React, { useState } from 'react';
import { Plus, Trash2, Upload, X, Image as ImageIcon } from 'lucide-react';
import type { Category, ColorOption, Product, SizeOption } from '../types';
import { apiUrl, resolveAssetUrl } from '../lib/paths';

interface AdminProductModalProps {
  product: Product | null;
  categories: Category[];
  authToken: string;
  onClose: () => void;
  onSaved: (product: Product) => void;
}

export const AdminProductModal: React.FC<AdminProductModalProps> = ({
  product,
  categories,
  authToken,
  onClose,
  onSaved,
}) => {
  const [name, setName] = useState(product?.name || '');
  const [slug, setSlug] = useState(product?.slug || '');
  const [categoryId, setCategoryId] = useState(product?.categoryId || categories[0]?.id || '');
  const [price, setPrice] = useState(String(product?.price || 1350));
  const [compareAtPrice, setCompareAtPrice] = useState(
    product?.compareAtPrice ? String(product.compareAtPrice) : ''
  );
  const [description, setDescription] = useState(product?.description || '');
  const [fabricCare, setFabricCare] = useState(product?.fabricCare || '');
  const [images, setImages] = useState<string[]>(product?.images || []);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [sizes, setSizes] = useState<SizeOption[]>(
    product?.sizes?.length
      ? product.sizes
      : [
          { size: 'S', inStock: true },
          { size: 'M', inStock: true },
          { size: 'L', inStock: true },
          { size: 'XL', inStock: true },
        ]
  );
  const [newSizeInput, setNewSizeInput] = useState('');
  const [colors, setColors] = useState<ColorOption[]>(product?.colors || []);
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#1C2E4A');
  const [newColorImage, setNewColorImage] = useState('');
  const [comingSoon, setComingSoon] = useState(product?.comingSoon || false);
  const [showOnHomepage, setShowOnHomepage] = useState(product?.showOnHomepage ?? true);
  const [displayOrder, setDisplayOrder] = useState(String(product?.displayOrder || 1));

  const [uploading, setUploading] = useState(false);
  const [uploadHint, setUploadHint] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const uploadToServer = async (file: File): Promise<string | null> => {
    setUploading(true);
    setUploadHint('');
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      const resp = await fetch(apiUrl('/api/admin/upload'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ imageBase64: base64, fileName: file.name }),
      });
      const data = (await resp.json()) as { url?: string; notice?: string; error?: string };
      if (!resp.ok || !data.url) {
        setError(data.error || 'Image upload failed');
        return null;
      }
      if (data.notice) setUploadHint(data.notice);
      return data.url;
    } catch {
      setError('Upload failed.');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadToServer(file);
    if (url) {
      setImages((prev) => [...prev, url]);
    }
  };

  const handleColorImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadToServer(file);
    if (url) {
      setNewColorImage(url);
      if (!images.includes(url)) setImages((prev) => [...prev, url]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const endpoint = product ? `/api/admin/products/${product.id}` : '/api/admin/products';
      const method = product ? 'PUT' : 'POST';
      const resp = await fetch(apiUrl(endpoint), {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name,
          slug: slug.trim() || undefined,
          categoryId,
          price: Number(price),
          compareAtPrice: compareAtPrice ? Number(compareAtPrice) : null,
          description,
          fabricCare,
          images,
          sizes,
          colors,
          comingSoon,
          showOnHomepage,
          displayOrder: Number(displayOrder || 1),
        }),
      });
      const data = (await resp.json()) as { product?: Product; error?: string };
      if (!resp.ok || !data.product) {
        setError(data.error || 'Could not save product.');
        return;
      }
      onSaved(data.product);
    } catch {
      setError('Network error saving product.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4">
      <div className="w-full max-w-2xl max-h-[92vh] rounded-t-3xl sm:rounded-2xl bg-[#FAF9F6] dark:bg-[#151412] border border-[#E6E1D8] dark:border-[#2A2824] flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E6E1D8] dark:border-[#2A2824]">
          <h3 className="text-base font-semibold">
            {product ? 'Edit Product' : 'Add New Product'}
          </h3>
          <button
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs">
              {error}
            </div>
          )}

          {/* Recommended Image Spec */}
          <div className="p-3.5 rounded-xl bg-[#F2EFE8] dark:bg-[#1E1C18] border border-[#E6E1D8] dark:border-[#2A2824] flex items-start gap-3 text-xs">
            <ImageIcon className="w-4 h-4 text-[#9E7B42] dark:text-[#D9B675] shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Recommended Product Image Size: 1200 × 1600 px (3:4 Portrait)</div>
              <div className="text-[#6E6A63] dark:text-[#A39E93] mt-0.5">
                Upload JPG/WEBP under 2 MB. Cloudinary automatically crops and optimizes photos to 3:4 portrait ratio so cards stay uniform.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1">Product Name</label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Women's Ribbed Knit Turtleneck Sweater"
                className="w-full min-h-[42px] px-3 rounded-xl border border-[#D8D2C7] dark:border-[#35322C] bg-white dark:bg-[#1C1A17] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">SEO Permalink Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="auto-generated-from-name"
                className="w-full min-h-[42px] px-3 rounded-xl border border-[#D8D2C7] dark:border-[#35322C] bg-white dark:bg-[#1C1A17] text-xs font-mono-tabular"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full min-h-[42px] px-3 rounded-xl border border-[#D8D2C7] dark:border-[#35322C] bg-white dark:bg-[#1C1A17] text-sm"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Selling Price (৳ BDT)</label>
              <input
                required
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full min-h-[42px] px-3 rounded-xl border border-[#D8D2C7] dark:border-[#35322C] bg-white dark:bg-[#1C1A17] text-sm font-mono-tabular"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Compare-at Price (Optional)</label>
              <input
                type="number"
                value={compareAtPrice}
                onChange={(e) => setCompareAtPrice(e.target.value)}
                placeholder="e.g. 1650"
                className="w-full min-h-[42px] px-3 rounded-xl border border-[#D8D2C7] dark:border-[#35322C] bg-white dark:bg-[#1C1A17] text-sm font-mono-tabular"
              />
            </div>
          </div>

          {/* Visibility & Ordering Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-white dark:bg-[#1C1A17] border border-[#E6E1D8] dark:border-[#2A2824]">
            <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={showOnHomepage}
                onChange={(e) => setShowOnHomepage(e.target.checked)}
                className="w-4 h-4 accent-[#9E7B42]"
              />
              <span>Show on Homepage</span>
            </label>
            <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={comingSoon}
                onChange={(e) => setComingSoon(e.target.checked)}
                className="w-4 h-4 accent-[#9E7B42]"
              />
              <span>Mark Coming Soon</span>
            </label>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium shrink-0">Order Priority:</span>
              <input
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                className="w-16 min-h-[34px] px-2 rounded-lg border border-[#D8D2C7] dark:border-[#35322C] bg-transparent font-mono-tabular"
              />
            </div>
          </div>

          {/* Product Images & Cloudinary Upload */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium">Product Photos (Cloudinary Upload)</label>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#171614] dark:bg-[#D9B675] text-white dark:text-[#121110] text-xs font-semibold cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>{uploading ? 'Uploading...' : 'Upload Photo'}</span>
                <input type="file" accept="image/*" onChange={handleMainImageUpload} className="hidden" />
              </label>
            </div>
            {uploadHint && <p className="text-[11px] text-[#9E7B42]">{uploadHint}</p>}

            <div className="flex gap-2">
              <input
                type="text"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                placeholder="Or paste image URL..."
                className="flex-1 min-h-[38px] px-3 rounded-lg border border-[#D8D2C7] dark:border-[#35322C] bg-white dark:bg-[#1C1A17] text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  if (imageUrlInput.trim()) {
                    setImages((prev) => [...prev, imageUrlInput.trim()]);
                    setImageUrlInput('');
                  }
                }}
                className="px-3 rounded-lg border border-[#D8D2C7] dark:border-[#35322C] text-xs font-medium"
              >
                Add URL
              </button>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {images.map((img, i) => (
                <div key={`${img}-${i}`} className="relative w-20 h-24 rounded-lg overflow-hidden border border-[#D8D2C7] dark:border-[#35322C]">
                  <img src={resolveAssetUrl(img)} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/75 text-white flex items-center justify-center"
                    aria-label="Remove photo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Size Stockout Matrix */}
          <div className="space-y-2.5">
            <label className="block text-xs font-medium">
              Sizes & Stock Status (Click size badge to toggle In Stock / Stock Out)
            </label>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s, idx) => (
                <div
                  key={s.size}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs ${
                    s.inStock
                      ? 'border-emerald-600/40 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
                      : 'border-red-500/40 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setSizes((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, inStock: !item.inStock } : item))
                      )
                    }
                    className="font-semibold"
                  >
                    {s.size} · {s.inStock ? 'In Stock' : 'Stock Out'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSizes((prev) => prev.filter((_, i) => i !== idx))}
                    className="opacity-60 hover:opacity-100"
                    aria-label="Remove size"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSizeInput}
                onChange={(e) => setNewSizeInput(e.target.value)}
                placeholder="Add size (e.g. XXL or Free Size)"
                className="flex-1 min-h-[38px] px-3 rounded-lg border border-[#D8D2C7] dark:border-[#35322C] bg-white dark:bg-[#1C1A17] text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  if (newSizeInput.trim()) {
                    setSizes((prev) => [...prev, { size: newSizeInput.trim(), inStock: true }]);
                    setNewSizeInput('');
                  }
                }}
                className="px-3 rounded-lg border border-[#D8D2C7] dark:border-[#35322C] text-xs font-medium inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Size
              </button>
            </div>
          </div>

          {/* Color Variants & Stockout Matrix */}
          <div className="space-y-2.5">
            <label className="block text-xs font-medium">
              Color Variants & Per-Color Stock Status
            </label>
            <div className="space-y-2">
              {colors.map((c, idx) => (
                <div
                  key={`${c.name}-${idx}`}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white dark:bg-[#1C1A17] border border-[#E6E1D8] dark:border-[#2A2824] text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-5 h-5 rounded-full border border-black/20 shrink-0"
                      style={{ backgroundColor: c.hex }}
                    />
                    <span className="font-medium truncate">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setColors((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, inStock: !item.inStock } : item))
                        )
                      }
                      className={`px-2.5 py-1 rounded-lg font-medium ${
                        c.inStock
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300'
                      }`}
                    >
                      {c.inStock ? 'In Stock' : 'Stock Out'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setColors((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-1 text-[#8A857C] hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
              <input
                type="text"
                value={newColorName}
                onChange={(e) => setNewColorName(e.target.value)}
                placeholder="Color name (e.g. Midnight Navy)"
                className="sm:col-span-5 min-h-[38px] px-3 rounded-lg border border-[#D8D2C7] dark:border-[#35322C] bg-white dark:bg-[#1C1A17] text-xs"
              />
              <div className="sm:col-span-2 flex items-center gap-1.5 px-2 rounded-lg border border-[#D8D2C7] dark:border-[#35322C] bg-white dark:bg-[#1C1A17]">
                <input
                  type="color"
                  value={newColorHex}
                  onChange={(e) => setNewColorHex(e.target.value)}
                  className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer"
                />
                <span className="text-[10px] font-mono-tabular">{newColorHex}</span>
              </div>
              <label className="sm:col-span-3 min-h-[38px] px-2.5 rounded-lg border border-[#D8D2C7] dark:border-[#35322C] flex items-center justify-center gap-1 text-xs cursor-pointer truncate">
                <Upload className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{newColorImage ? 'Photo Ready' : 'Color Photo'}</span>
                <input type="file" accept="image/*" onChange={handleColorImageUpload} className="hidden" />
              </label>
              <button
                type="button"
                onClick={() => {
                  if (!newColorName.trim()) return;
                  setColors((prev) => [
                    ...prev,
                    {
                      name: newColorName.trim(),
                      hex: newColorHex,
                      image: newColorImage || images[0] || '',
                      inStock: true,
                    },
                  ]);
                  setNewColorName('');
                  setNewColorImage('');
                }}
                className="sm:col-span-2 min-h-[38px] rounded-lg bg-[#171614] dark:bg-[#D9B675] text-white dark:text-[#121110] text-xs font-semibold"
              >
                Add Color
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1">Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 rounded-xl border border-[#D8D2C7] dark:border-[#35322C] bg-white dark:bg-[#1C1A17] text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Fabric & Care Note</label>
              <input
                type="text"
                value={fabricCare}
                onChange={(e) => setFabricCare(e.target.value)}
                placeholder="e.g. 72% Viscose, 28% Nylon · Cold gentle wash"
                className="w-full min-h-[40px] px-3 rounded-xl border border-[#D8D2C7] dark:border-[#35322C] bg-white dark:bg-[#1C1A17] text-xs"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 min-h-[44px] rounded-xl border border-[#D8D2C7] dark:border-[#35322C] text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 min-h-[44px] rounded-xl bg-[#171614] dark:bg-[#D9B675] text-white dark:text-[#121110] text-xs font-semibold"
            >
              {saving ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
