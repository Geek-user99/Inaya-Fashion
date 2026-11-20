import fs from 'fs';
import path from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  Category,
  Coupon,
  Order,
  OrderStatus,
  Product,
  Review,
  StoreDatabase,
} from '../src/types';
import { initialSeedData } from './seedData';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mtngwbrcywmmxfwrumxb.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let supabaseAdmin: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function ensureLocalStore(): StoreDatabase {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialSeedData, null, 2), 'utf-8');
    return structuredClone(initialSeedData);
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as StoreDatabase;
    return {
      settings: { ...initialSeedData.settings, ...(parsed.settings || {}) },
      categories: Array.isArray(parsed.categories) ? parsed.categories : initialSeedData.categories,
      products: Array.isArray(parsed.products) ? parsed.products : initialSeedData.products,
      reviews: Array.isArray(parsed.reviews) ? parsed.reviews : initialSeedData.reviews,
      coupons: Array.isArray(parsed.coupons) ? parsed.coupons : initialSeedData.coupons,
      orders: Array.isArray(parsed.orders) ? parsed.orders : initialSeedData.orders,
    };
  } catch {
    return structuredClone(initialSeedData);
  }
}

function saveLocalStore(db: StoreDatabase): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

export function isSupabaseServiceConfigured(): boolean {
  return Boolean(supabaseAdmin);
}

// Helper to check if Supabase tables are reachable when service key is configured
async function trySupabaseRead(): Promise<StoreDatabase | null> {
  if (!supabaseAdmin) return null;
  try {
    const [settingsRes, catRes, prodRes, revRes, coupRes, ordRes] = await Promise.all([
      supabaseAdmin.from('store_settings').select('*').eq('id', 1).maybeSingle(),
      supabaseAdmin.from('categories').select('*').order('display_order', { ascending: true }),
      supabaseAdmin.from('products').select('*').order('display_order', { ascending: true }),
      supabaseAdmin.from('reviews').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('coupons').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('orders').select('*').order('created_at', { ascending: false }),
    ]);

    if (catRes.error || prodRes.error) {
      return null;
    }

    const s = settingsRes.data;
    const settings = s
      ? {
          storeName: s.store_name,
          topbarEnabled: s.topbar_enabled,
          topbarText: s.topbar_text,
          deliveryEnabled: s.delivery_enabled,
          deliveryInsideDhaka: s.delivery_inside_dhaka,
          deliveryOutsideDhaka: s.delivery_outside_dhaka,
          freeDeliveryThreshold: s.free_delivery_threshold,
          socialLinks: s.social_links || initialSeedData.settings.socialLinks,
          metaPixelId: s.meta_pixel_id || '',
          metaCapiToken: s.meta_capi_token || '',
          metaTestEventCode: s.meta_test_event_code || '',
          steadfastBaseUrl: s.steadfast_base_url || 'https://portal.packzy.com/api/v1',
          steadfastApiKey: s.steadfast_api_key || '',
          steadfastSecretKey: s.steadfast_secret_key || '',
          steadfastSandboxMode: s.steadfast_sandbox_mode ?? true,
          cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || 'djshdhau',
          cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '235488738718854',
          cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
          cloudinaryUploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || '',
        }
      : initialSeedData.settings;

    const categories: Category[] = (catRes.data || []).map((c: Record<string, unknown>) => ({
      id: String(c.id),
      name: String(c.name),
      slug: String(c.slug),
      description: String(c.description || ''),
      displayOrder: Number(c.display_order ?? 0),
    }));

    const products: Product[] = (prodRes.data || []).map((p: Record<string, unknown>) => ({
      id: String(p.id),
      name: String(p.name),
      slug: String(p.slug),
      categoryId: String(p.category_id || ''),
      description: String(p.description || ''),
      fabricCare: String(p.fabric_care || ''),
      price: Number(p.price),
      compareAtPrice: p.compare_at_price != null ? Number(p.compare_at_price) : null,
      images: (p.images as string[]) || [],
      sizes: (p.sizes as Product['sizes']) || [],
      colors: (p.colors as Product['colors']) || [],
      comingSoon: Boolean(p.coming_soon),
      showOnHomepage: Boolean(p.show_on_homepage),
      displayOrder: Number(p.display_order ?? 0),
      createdAt: String(p.created_at || new Date().toISOString()),
    }));

    const reviews: Review[] = (revRes.data || []).map((r: Record<string, unknown>) => ({
      id: String(r.id),
      productId: String(r.product_id),
      reviewerName: String(r.reviewer_name),
      location: String(r.location || 'Dhaka'),
      rating: Number(r.rating),
      comment: String(r.comment),
      verifiedPurchase: Boolean(r.verified_purchase),
      createdAt: String(r.created_at || new Date().toISOString()),
    }));

    const coupons: Coupon[] = (coupRes.data || []).map((c: Record<string, unknown>) => ({
      id: String(c.id),
      code: String(c.code),
      discountType: c.discount_type === 'fixed' ? 'fixed' : 'percentage',
      discountValue: Number(c.discount_value),
      minOrderAmount: Number(c.min_order_amount ?? 0),
      active: Boolean(c.active),
      expiresAt: c.expires_at ? String(c.expires_at) : null,
    }));

    const orders: Order[] = (ordRes.data || []).map((o: Record<string, unknown>) => ({
      id: String(o.id),
      invoice: String(o.invoice),
      customerName: String(o.customer_name),
      customerPhone: String(o.customer_phone),
      customerAddress: String(o.customer_address),
      deliveryZone: o.delivery_zone === 'outside_dhaka' ? 'outside_dhaka' : 'inside_dhaka',
      note: String(o.note || ''),
      items: (o.items as Order['items']) || [],
      subtotal: Number(o.subtotal),
      discountAmount: Number(o.discount_amount ?? 0),
      couponCode: o.coupon_code ? String(o.coupon_code) : null,
      deliveryCharge: Number(o.delivery_charge ?? 0),
      totalAmount: Number(o.total_amount),
      orderStatus: (o.order_status as OrderStatus) || 'pending',
      steadfastConsignmentId: o.steadfast_consignment_id ? String(o.steadfast_consignment_id) : null,
      steadfastTrackingCode: o.steadfast_tracking_code ? String(o.steadfast_tracking_code) : null,
      steadfastStatus: o.steadfast_status ? String(o.steadfast_status) : null,
      steadfastSentAt: o.steadfast_sent_at ? String(o.steadfast_sent_at) : null,
      createdAt: String(o.created_at || new Date().toISOString()),
    }));

    return { settings, categories, products, reviews, coupons, orders };
  } catch {
    return null;
  }
}

export async function getStoreDb(): Promise<StoreDatabase> {
  const supa = await trySupabaseRead();
  if (supa && supa.products.length > 0) {
    return supa;
  }
  return ensureLocalStore();
}

export async function updateSettings(partial: Partial<StoreDatabase['settings']>): Promise<StoreDatabase['settings']> {
  const db = await getStoreDb();
  db.settings = { ...db.settings, ...partial };
  saveLocalStore(db);

  if (supabaseAdmin) {
    await supabaseAdmin
      .from('store_settings')
      .upsert({
        id: 1,
        store_name: db.settings.storeName,
        topbar_enabled: db.settings.topbarEnabled,
        topbar_text: db.settings.topbarText,
        delivery_enabled: db.settings.deliveryEnabled,
        delivery_inside_dhaka: db.settings.deliveryInsideDhaka,
        delivery_outside_dhaka: db.settings.deliveryOutsideDhaka,
        free_delivery_threshold: db.settings.freeDeliveryThreshold,
        social_links: db.settings.socialLinks,
        meta_pixel_id: db.settings.metaPixelId,
        meta_capi_token: db.settings.metaCapiToken,
        meta_test_event_code: db.settings.metaTestEventCode,
        steadfast_base_url: db.settings.steadfastBaseUrl,
        steadfast_api_key: db.settings.steadfastApiKey,
        steadfast_secret_key: db.settings.steadfastSecretKey,
        steadfast_sandbox_mode: db.settings.steadfastSandboxMode,
        updated_at: new Date().toISOString(),
      })
      .then(() => undefined, () => undefined);
  }
  return db.settings;
}

export async function saveProduct(product: Product): Promise<Product> {
  const db = ensureLocalStore();
  const idx = db.products.findIndex((p) => p.id === product.id);
  if (idx >= 0) {
    db.products[idx] = product;
  } else {
    db.products.push(product);
  }
  db.products.sort((a, b) => a.displayOrder - b.displayOrder);
  saveLocalStore(db);

  if (supabaseAdmin) {
    await supabaseAdmin
      .from('products')
      .upsert({
        id: product.id,
        name: product.name,
        slug: product.slug,
        category_id: product.categoryId || null,
        description: product.description,
        fabric_care: product.fabricCare,
        price: product.price,
        compare_at_price: product.compareAtPrice ?? null,
        images: product.images,
        sizes: product.sizes,
        colors: product.colors,
        coming_soon: product.comingSoon,
        show_on_homepage: product.showOnHomepage,
        display_order: product.displayOrder,
        updated_at: new Date().toISOString(),
      })
      .then(() => undefined, () => undefined);
  }
  return product;
}

export async function deleteProduct(id: string): Promise<void> {
  const db = ensureLocalStore();
  db.products = db.products.filter((p) => p.id !== id);
  db.reviews = db.reviews.filter((r) => r.productId !== id);
  saveLocalStore(db);

  if (supabaseAdmin) {
    await supabaseAdmin.from('products').delete().eq('id', id).then(() => undefined, () => undefined);
  }
}

export async function reorderProducts(orderedIds: string[]): Promise<Product[]> {
  const db = ensureLocalStore();
  const orderMap = new Map<string, number>();
  orderedIds.forEach((id, index) => orderMap.set(id, index + 1));
  db.products = db.products
    .map((p) => ({
      ...p,
      displayOrder: orderMap.get(p.id) ?? p.displayOrder,
    }))
    .sort((a, b) => a.displayOrder - b.displayOrder);
  saveLocalStore(db);

  if (supabaseAdmin) {
    await Promise.all(
      db.products.map((p) =>
        supabaseAdmin!.from('products').update({ display_order: p.displayOrder }).eq('id', p.id)
      )
    ).catch(() => undefined);
  }
  return db.products;
}

export async function saveCategory(category: Category): Promise<Category> {
  const db = ensureLocalStore();
  const idx = db.categories.findIndex((c) => c.id === category.id);
  if (idx >= 0) {
    db.categories[idx] = category;
  } else {
    db.categories.push(category);
  }
  db.categories.sort((a, b) => a.displayOrder - b.displayOrder);
  saveLocalStore(db);

  if (supabaseAdmin) {
    await supabaseAdmin
      .from('categories')
      .upsert({
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        display_order: category.displayOrder,
      })
      .then(() => undefined, () => undefined);
  }
  return category;
}

export async function deleteCategory(id: string): Promise<void> {
  const db = ensureLocalStore();
  db.categories = db.categories.filter((c) => c.id !== id);
  saveLocalStore(db);

  if (supabaseAdmin) {
    await supabaseAdmin.from('categories').delete().eq('id', id).then(() => undefined, () => undefined);
  }
}

export async function saveCoupon(coupon: Coupon): Promise<Coupon> {
  const db = ensureLocalStore();
  const normalized = { ...coupon, code: coupon.code.trim().toUpperCase() };
  const idx = db.coupons.findIndex((c) => c.id === normalized.id);
  if (idx >= 0) {
    db.coupons[idx] = normalized;
  } else {
    db.coupons.unshift(normalized);
  }
  saveLocalStore(db);

  if (supabaseAdmin) {
    await supabaseAdmin
      .from('coupons')
      .upsert({
        id: normalized.id,
        code: normalized.code,
        discount_type: normalized.discountType,
        discount_value: normalized.discountValue,
        min_order_amount: normalized.minOrderAmount,
        active: normalized.active,
        expires_at: normalized.expiresAt ?? null,
      })
      .then(() => undefined, () => undefined);
  }
  return normalized;
}

export async function deleteCoupon(id: string): Promise<void> {
  const db = ensureLocalStore();
  db.coupons = db.coupons.filter((c) => c.id !== id);
  saveLocalStore(db);

  if (supabaseAdmin) {
    await supabaseAdmin.from('coupons').delete().eq('id', id).then(() => undefined, () => undefined);
  }
}

export async function saveReview(review: Review): Promise<Review> {
  const db = ensureLocalStore();
  db.reviews.unshift(review);
  saveLocalStore(db);

  if (supabaseAdmin) {
    await supabaseAdmin
      .from('reviews')
      .upsert({
        id: review.id,
        product_id: review.productId,
        reviewer_name: review.reviewerName,
        location: review.location,
        rating: review.rating,
        comment: review.comment,
        verified_purchase: review.verifiedPurchase,
        created_at: review.createdAt,
      })
      .then(() => undefined, () => undefined);
  }
  return review;
}

export async function deleteReview(id: string): Promise<void> {
  const db = ensureLocalStore();
  db.reviews = db.reviews.filter((r) => r.id !== id);
  saveLocalStore(db);

  if (supabaseAdmin) {
    await supabaseAdmin.from('reviews').delete().eq('id', id).then(() => undefined, () => undefined);
  }
}

export async function createOrderRecord(order: Order): Promise<Order> {
  const db = ensureLocalStore();
  db.orders.unshift(order);
  saveLocalStore(db);

  if (supabaseAdmin) {
    await supabaseAdmin
      .from('orders')
      .insert({
        id: order.id,
        invoice: order.invoice,
        customer_name: order.customerName,
        customer_phone: order.customerPhone,
        customer_address: order.customerAddress,
        delivery_zone: order.deliveryZone,
        note: order.note,
        items: order.items,
        subtotal: order.subtotal,
        discount_amount: order.discountAmount,
        coupon_code: order.couponCode ?? null,
        delivery_charge: order.deliveryCharge,
        total_amount: order.totalAmount,
        order_status: order.orderStatus,
        created_at: order.createdAt,
      })
      .then(() => undefined, () => undefined);
  }
  return order;
}

export async function updateOrderRecord(id: string, patch: Partial<Order>): Promise<Order | null> {
  const db = ensureLocalStore();
  const idx = db.orders.findIndex((o) => o.id === id);
  if (idx < 0) return null;
  db.orders[idx] = { ...db.orders[idx], ...patch };
  saveLocalStore(db);

  if (supabaseAdmin) {
    const o = db.orders[idx];
    await supabaseAdmin
      .from('orders')
      .update({
        order_status: o.orderStatus,
        steadfast_consignment_id: o.steadfastConsignmentId ?? null,
        steadfast_tracking_code: o.steadfastTrackingCode ?? null,
        steadfast_status: o.steadfastStatus ?? null,
        steadfast_sent_at: o.steadfastSentAt ?? null,
      })
      .eq('id', id)
      .then(() => undefined, () => undefined);
  }
  return db.orders[idx];
}
