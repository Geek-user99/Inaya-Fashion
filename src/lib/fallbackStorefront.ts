import type { AdminSettings, CartItem, Category, Coupon, Order, OrderItem, Product, PublicSettings, Review } from '../types';
import { supabase } from './supabase';
import { apiUrl } from './paths';

export const STATIC_CATEGORIES: Category[] = [
  {
    id: 'cat-knitwear',
    name: 'Ribbed Knitwear',
    slug: 'ribbed-knitwear',
    description: 'Fine-gauge stretch ribbed sweaters crafted for breathable warmth and clean layering.',
    displayOrder: 1,
  },
  {
    id: 'cat-bottoms',
    name: 'Tailored Bottoms',
    slug: 'tailored-bottoms',
    description: 'High-waisted ribbed flare trousers engineered for an elongated, sculpted drape.',
    displayOrder: 2,
  },
  {
    id: 'cat-upcoming',
    name: 'Atelier Previews',
    slug: 'atelier-previews',
    description: 'Upcoming small-batch winter arrivals opening soon for orders.',
    displayOrder: 3,
  },
];

export const STATIC_PRODUCTS: Product[] = [
  {
    id: 'prod-turtleneck',
    name: "Women's Ribbed Knit Turtleneck Sweater",
    slug: 'womens-ribbed-knit-turtleneck-sweater',
    categoryId: 'cat-knitwear',
    description:
      'A sculpted fold-over turtleneck spun from ultra-soft fine-gauge viscose ribbed knit. Designed to hug smoothly without clinging, transitioning effortlessly from office tailoring to evening denim.',
    fabricCare: '72% Viscose, 28% Nylon fine-rib knit · Gentle cold wash, dry flat.',
    price: 1350,
    compareAtPrice: 1650,
    images: ['/assets/aistudio/WhatsApp_Image_2026-11-20_at_11.14.18_AM_c76a128d.jpeg'],
    sizes: [
      { size: 'S', inStock: true },
      { size: 'M', inStock: true },
      { size: 'L', inStock: true },
      { size: 'XL', inStock: false },
    ],
    colors: [
      {
        name: 'Ivory Cream',
        hex: '#F3EFE6',
        image: '/assets/aistudio/WhatsApp_Image_2026-11-20_at_11.14.18_AM_c76a128d.jpeg',
        inStock: true,
      },
    ],
    comingSoon: false,
    showOnHomepage: true,
    displayOrder: 1,
    createdAt: '2026-11-10T09:00:00.000Z',
  },
  {
    id: 'prod-mock-neck',
    name: 'Ribbed Mock Neck Sweater',
    slug: 'ribbed-mock-neck-sweater',
    categoryId: 'cat-knitwear',
    description:
      'Clean high mock-collar silhouette with elongated cuffs and crisp vertical ribbing. Tailored for minimalist layering under blazers or styled solo with wide-leg trousers.',
    fabricCare: '72% Viscose, 28% Nylon stretch knit · Hand wash or delicate cycle.',
    price: 1290,
    compareAtPrice: 1550,
    images: [
      '/assets/aistudio/WhatsApp_Image_2026-11-20_at_11.15.58_AM_fc2ea9ac.jpeg',
      '/assets/aistudio/WhatsApp_Image_2026-11-20_at_11.18.17_AM_2167d7f0.jpeg',
    ],
    sizes: [
      { size: 'S', inStock: true },
      { size: 'M', inStock: true },
      { size: 'L', inStock: true },
      { size: 'XL', inStock: true },
    ],
    colors: [
      {
        name: 'Midnight Navy',
        hex: '#1C2E4A',
        image: '/assets/aistudio/WhatsApp_Image_2026-11-20_at_11.15.58_AM_fc2ea9ac.jpeg',
        inStock: true,
      },
      {
        name: 'Obsidian Black',
        hex: '#181818',
        image: '/assets/aistudio/WhatsApp_Image_2026-11-20_at_11.18.17_AM_2167d7f0.jpeg',
        inStock: true,
      },
    ],
    comingSoon: false,
    showOnHomepage: true,
    displayOrder: 2,
    createdAt: '2026-11-11T09:00:00.000Z',
  },
  {
    id: 'prod-vneck-top',
    name: 'Ribbed V-Neck Sweater Top',
    slug: 'ribbed-v-neck-sweater-top',
    categoryId: 'cat-knitwear',
    description:
      'Refined architectural V-neckline framed in soft mid-weight vertical rib knit. Offers structured shoulder definition and comfortable all-day stretch suitable for Dhaka winters.',
    fabricCare: '70% Combed Viscose, 30% Polyamide · Cold wash inside out.',
    price: 1250,
    compareAtPrice: 1490,
    images: [
      '/assets/aistudio/WhatsApp_Image_2026-11-20_at_11.18.16_AM_3ca9c759.jpeg',
      '/assets/aistudio/WhatsApp_Image_2026-11-20_at_11.15.57_AM_40a2989b.jpeg',
    ],
    sizes: [
      { size: 'S', inStock: true },
      { size: 'M', inStock: true },
      { size: 'L', inStock: false },
      { size: 'XL', inStock: true },
    ],
    colors: [
      {
        name: 'Alabaster White',
        hex: '#F6F4EE',
        image: '/assets/aistudio/WhatsApp_Image_2026-11-20_at_11.18.16_AM_3ca9c759.jpeg',
        inStock: true,
      },
      {
        name: 'Cobalt Navy',
        hex: '#163B6B',
        image: '/assets/aistudio/WhatsApp_Image_2026-11-20_at_11.15.57_AM_40a2989b.jpeg',
        inStock: true,
      },
    ],
    comingSoon: false,
    showOnHomepage: true,
    displayOrder: 3,
    createdAt: '2026-11-12T09:00:00.000Z',
  },
  {
    id: 'prod-flare-pants',
    name: 'High-Waist Ribbed Flare Leg Pants',
    slug: 'high-waist-ribbed-flare-leg-pants',
    categoryId: 'cat-bottoms',
    description:
      'High-rise elasticated waistband with a sleek leg-lengthening flare from knee to hem. Crafted from heavy double-ribbed knit that holds its shape without knee bagging.',
    fabricCare: 'Heavyweight 320gsm ribbed knit · Machine wash cold in mesh bag.',
    price: 1450,
    compareAtPrice: 1750,
    images: [
      '/assets/aistudio/WhatsApp_Image_2026-11-20_at_11.21.46_AM_03567afe.jpeg',
      '/assets/aistudio/WhatsApp_Image_2026-11-20_at_11.21.47_AM_3194e092.jpeg',
    ],
    sizes: [
      { size: 'S (26-28)', inStock: true },
      { size: 'M (28-30)', inStock: true },
      { size: 'L (30-32)', inStock: true },
      { size: 'XL (32-34)', inStock: true },
    ],
    colors: [
      {
        name: 'Warm Cream',
        hex: '#EDE2CE',
        image: '/assets/aistudio/WhatsApp_Image_2026-11-20_at_11.21.46_AM_03567afe.jpeg',
        inStock: true,
      },
      {
        name: 'Espresso Brown',
        hex: '#4A3327',
        image: '/assets/aistudio/WhatsApp_Image_2026-11-20_at_11.21.47_AM_3194e092.jpeg',
        inStock: true,
      },
    ],
    comingSoon: false,
    showOnHomepage: true,
    displayOrder: 4,
    createdAt: '2026-11-13T09:00:00.000Z',
  },
  {
    id: 'prod-cashmere-upcoming',
    name: 'Oatmeal Cashmere-Blend Heavy Turtleneck',
    slug: 'oatmeal-cashmere-blend-heavy-turtleneck',
    categoryId: 'cat-upcoming',
    description:
      'Limited winter capsule release featuring a relaxed drop-shoulder silhouette and plush double-ribbed collar.',
    fabricCare: '15% Cashmere, 55% Merino Blend, 30% Nylon · Dry clean or hand wash.',
    price: 2150,
    compareAtPrice: 2450,
    images: ['/src/assets/images/coming_soon_cashmere_knit_1795187952922.jpg'],
    sizes: [
      { size: 'S', inStock: true },
      { size: 'M', inStock: true },
      { size: 'L', inStock: true },
    ],
    colors: [
      {
        name: 'Oatmeal',
        hex: '#D6CBB8',
        image: '/src/assets/images/coming_soon_cashmere_knit_1795187952922.jpg',
        inStock: true,
      },
    ],
    comingSoon: true,
    showOnHomepage: true,
    displayOrder: 5,
    createdAt: '2026-11-15T09:00:00.000Z',
  },
];

export const STATIC_REVIEWS: Review[] = [
  {
    id: 'rev-1',
    productId: 'prod-turtleneck',
    reviewerName: 'Nusrat Jahan',
    location: 'Dhanmondi, Dhaka',
    rating: 5,
    comment: 'Kapor ta khub e soft ar body te darun fit hoy, winter er jonno ekdom best. Ivory shade ta chobir thekeo shundor.',
    verifiedPurchase: true,
    createdAt: '2026-11-14T14:22:00.000Z',
  },
  {
    id: 'rev-2',
    productId: 'prod-turtleneck',
    reviewerName: 'তাসনিম তাবাসসুম',
    location: 'উত্তরা, ঢাকা',
    rating: 5,
    comment: 'ঢাকার মধ্যে ১ দিনেই ডেলিভারি পেয়েছি। রিবড ফ্যাব্রিকটা আসলেই প্রিমিয়াম, গলায় একদমই চুলকায় না।',
    verifiedPurchase: true,
    createdAt: '2026-11-16T11:10:00.000Z',
  },
  {
    id: 'rev-3',
    productId: 'prod-mock-neck',
    reviewerName: 'Sadia Afrin',
    location: 'Chattogram',
    rating: 5,
    comment: 'Midnight navy ar black duitai order korsilam. Stitching ar stretch quality onek bhalo, wash korar por o shape thik ache.',
    verifiedPurchase: true,
    createdAt: '2026-11-15T18:45:00.000Z',
  },
  {
    id: 'rev-4',
    productId: 'prod-mock-neck',
    reviewerName: 'ফারহানা রহমান',
    location: 'বনানী, ঢাকা',
    rating: 4,
    comment: 'মক নেক ডিজাইনটা অফিসের ব্লেজারের নিচে পরার জন্য দারুণ। সাইজ M একদম পারফেক্ট ফিট হয়েছে।',
    verifiedPurchase: true,
    createdAt: '2026-11-17T09:30:00.000Z',
  },
  {
    id: 'rev-5',
    productId: 'prod-vneck-top',
    reviewerName: 'Maliha Chowdhury',
    location: 'Sylhet',
    rating: 5,
    comment: 'Cobalt blue color ta pore onek classy lage. Sylhet e 2 diner moddhei Steadfast diye parcel peye gesi.',
    verifiedPurchase: true,
    createdAt: '2026-11-16T16:05:00.000Z',
  },
  {
    id: 'rev-6',
    productId: 'prod-flare-pants',
    reviewerName: 'রাইসা ইসলাম',
    location: 'মিরপুর, ঢাকা',
    rating: 5,
    comment: 'ফ্লেয়ার প্যান্টসটা পরলে অনেক লম্বা আর স্লিম লাগে। Espresso Brown কালারটা অসাধারণ, মোটেও পাতলা না।',
    verifiedPurchase: true,
    createdAt: '2026-11-18T13:15:00.000Z',
  },
];

const STATIC_COUPONS: Coupon[] = [
  {
    id: 'coup-1',
    code: 'INAYA10',
    discountType: 'percentage',
    discountValue: 10,
    minOrderAmount: 1200,
    active: true,
    expiresAt: '2026-12-31T23:59:59.000Z',
  },
  {
    id: 'coup-2',
    code: 'WINTER200',
    discountType: 'fixed',
    discountValue: 200,
    minOrderAmount: 2000,
    active: true,
    expiresAt: '2026-12-31T23:59:59.000Z',
  },
];

export async function isExpressApiJson(resp: Response): Promise<boolean> {
  const ct = resp.headers.get('content-type') || '';
  return resp.ok && ct.includes('application/json');
}

export async function fetchStorefrontFromSupabaseFallback(defaultSettings: PublicSettings): Promise<{
  settings: PublicSettings;
  categories: Category[];
  products: Product[];
  reviews: Review[];
}> {
  try {
    const [{ data: catRows }, { data: prodRows }, { data: revRows }, { data: pubSettings }] = await Promise.all([
      supabase.from('categories').select('*').order('display_order'),
      supabase.from('products').select('*').order('display_order'),
      supabase.from('reviews').select('*').order('created_at', { ascending: false }),
      supabase.rpc('get_public_store_settings'),
    ]);

    const s = pubSettings as Record<string, unknown> | null;
    const settings: PublicSettings = s
      ? {
          storeName: String(s.store_name || defaultSettings.storeName),
          topbarEnabled: s.topbar_enabled !== undefined ? Boolean(s.topbar_enabled) : defaultSettings.topbarEnabled,
          topbarText: String(s.topbar_text || defaultSettings.topbarText),
          deliveryEnabled: s.delivery_enabled !== undefined ? Boolean(s.delivery_enabled) : defaultSettings.deliveryEnabled,
          deliveryInsideDhaka: Number(s.delivery_inside_dhaka ?? defaultSettings.deliveryInsideDhaka),
          deliveryOutsideDhaka: Number(s.delivery_outside_dhaka ?? defaultSettings.deliveryOutsideDhaka),
          freeDeliveryThreshold: Number(s.free_delivery_threshold ?? defaultSettings.freeDeliveryThreshold),
          socialLinks: (s.social_links as PublicSettings['socialLinks']) || defaultSettings.socialLinks,
          metaPixelId: String(s.meta_pixel_id || ''),
        }
      : defaultSettings;

    const categories: Category[] =
      catRows && catRows.length > 0
        ? catRows.map((c: Record<string, unknown>) => ({
            id: String(c.id),
            name: String(c.name),
            slug: String(c.slug),
            description: String(c.description || ''),
            displayOrder: Number(c.display_order || 0),
          }))
        : STATIC_CATEGORIES;

    const products: Product[] =
      prodRows && prodRows.length > 0
        ? prodRows.map((p: Record<string, unknown>) => ({
            id: String(p.id),
            name: String(p.name),
            slug: String(p.slug),
            categoryId: String(p.category_id || ''),
            description: String(p.description || ''),
            fabricCare: String(p.fabric_care || ''),
            price: Number(p.price),
            compareAtPrice: p.compare_at_price ? Number(p.compare_at_price) : null,
            images: Array.isArray(p.images) ? (p.images as string[]) : [],
            sizes: Array.isArray(p.sizes) ? (p.sizes as Product['sizes']) : [],
            colors: Array.isArray(p.colors) ? (p.colors as Product['colors']) : [],
            comingSoon: Boolean(p.coming_soon),
            showOnHomepage: p.show_on_homepage !== false,
            displayOrder: Number(p.display_order || 0),
            createdAt: String(p.created_at || new Date().toISOString()),
          }))
        : STATIC_PRODUCTS;

    const reviews: Review[] =
      revRows && revRows.length > 0
        ? revRows.map((r: Record<string, unknown>) => ({
            id: String(r.id),
            productId: String(r.product_id),
            reviewerName: String(r.reviewer_name),
            location: String(r.location || 'Dhaka'),
            rating: Number(r.rating || 5),
            comment: String(r.comment || ''),
            verifiedPurchase: Boolean(r.verified_purchase ?? true),
            createdAt: String(r.created_at || new Date().toISOString()),
          }))
        : STATIC_REVIEWS;

    return { settings, categories, products, reviews };
  } catch {
    return {
      settings: defaultSettings,
      categories: STATIC_CATEGORIES,
      products: STATIC_PRODUCTS,
      reviews: STATIC_REVIEWS,
    };
  }
}

export async function validateCouponFallback(
  rawCode: string,
  subtotal: number
): Promise<{ valid: boolean; code?: string; discountAmount?: number; error?: string }> {
  const cleanCode = rawCode.trim().toUpperCase();
  if (!cleanCode) return { valid: false, error: 'Please enter a coupon code.' };

  let coupon: Coupon | undefined;
  try {
    const { data } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', cleanCode)
      .eq('active', true)
      .maybeSingle();
    if (data) {
      coupon = {
        id: String(data.id),
        code: String(data.code),
        discountType: data.discount_type === 'fixed' ? 'fixed' : 'percentage',
        discountValue: Number(data.discount_value),
        minOrderAmount: Number(data.min_order_amount || 0),
        active: Boolean(data.active),
        expiresAt: data.expires_at ? String(data.expires_at) : null,
      };
    }
  } catch {
    // ignore and check static fallback
  }

  if (!coupon) {
    coupon = STATIC_COUPONS.find((c) => c.code === cleanCode && c.active);
  }

  if (!coupon) {
    return { valid: false, error: 'Invalid or inactive coupon code.' };
  }
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
    return { valid: false, error: 'This coupon has expired.' };
  }
  if (subtotal < coupon.minOrderAmount) {
    return {
      valid: false,
      error: `Minimum order of ৳${coupon.minOrderAmount.toLocaleString()} required for ${coupon.code}.`,
    };
  }

  const discountAmount =
    coupon.discountType === 'percentage'
      ? Math.round((subtotal * coupon.discountValue) / 100)
      : Math.min(subtotal, coupon.discountValue);

  return { valid: true, code: coupon.code, discountAmount };
}

export async function createOrderFallback(params: {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  deliveryZone: 'inside_dhaka' | 'outside_dhaka';
  note: string;
  couponCode: string;
  items: CartItem[];
  settings: PublicSettings;
}): Promise<{ order?: Order; error?: string }> {
  const cleanPhone = params.customerPhone.replace(/[^0-9+]/g, '');
  if (!params.customerName.trim() || !params.customerAddress.trim()) {
    return { error: 'Name, mobile number, and delivery address are required.' };
  }
  if (cleanPhone.length < 10) {
    return { error: 'Please enter a valid Bangladesh mobile number (e.g. 017XXXXXXXX).' };
  }
  if (params.items.length === 0) {
    return { error: 'Your shopping bag is empty.' };
  }

  const orderItems: OrderItem[] = params.items.map((i) => ({
    productId: i.productId,
    productName: i.name,
    productSlug: i.slug,
    image: i.image,
    size: i.size,
    color: i.color,
    price: i.price,
    quantity: i.quantity,
  }));

  const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  let discountAmount = 0;
  let appliedCode: string | null = null;
  if (params.couponCode.trim()) {
    const res = await validateCouponFallback(params.couponCode, subtotal);
    if (res.valid && res.code && res.discountAmount) {
      appliedCode = res.code;
      discountAmount = res.discountAmount;
    }
  }

  const afterDiscount = Math.max(0, subtotal - discountAmount);
  let deliveryCharge = 0;
  if (params.settings.deliveryEnabled) {
    if (params.settings.freeDeliveryThreshold > 0 && afterDiscount >= params.settings.freeDeliveryThreshold) {
      deliveryCharge = 0;
    } else {
      deliveryCharge =
        params.deliveryZone === 'inside_dhaka'
          ? params.settings.deliveryInsideDhaka
          : params.settings.deliveryOutsideDhaka;
    }
  }

  const now = new Date();
  const dateStamp = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}`;
  const randSuffix = Math.floor(1000 + Math.random() * 9000);
  const invoice = `INY-${dateStamp}-${randSuffix}`;

  const newOrder: Order = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ord-${Date.now()}`,
    invoice,
    customerName: params.customerName.trim(),
    customerPhone: cleanPhone,
    customerAddress: params.customerAddress.trim(),
    deliveryZone: params.deliveryZone,
    note: params.note.trim(),
    items: orderItems,
    subtotal,
    discountAmount,
    couponCode: appliedCode,
    deliveryCharge,
    totalAmount: afterDiscount + deliveryCharge,
    orderStatus: 'pending',
    steadfastConsignmentId: null,
    steadfastTrackingCode: null,
    steadfastStatus: null,
    steadfastSentAt: null,
    createdAt: now.toISOString(),
  };

  try {
    const { error } = await supabase.from('orders').insert({
      id: newOrder.id,
      invoice: newOrder.invoice,
      customer_name: newOrder.customerName,
      customer_phone: newOrder.customerPhone,
      customer_address: newOrder.customerAddress,
      delivery_zone: newOrder.deliveryZone,
      note: newOrder.note,
      items: newOrder.items,
      subtotal: newOrder.subtotal,
      discount_amount: newOrder.discountAmount,
      coupon_code: newOrder.couponCode,
      delivery_charge: newOrder.deliveryCharge,
      total_amount: newOrder.totalAmount,
      order_status: newOrder.orderStatus,
      created_at: newOrder.createdAt,
    });

    if (error) {
      if (error.code === '42501') {
        return {
          error:
            'Database order permission not enabled yet. Please run the updated supabase/schema.sql in Supabase SQL Editor.',
        };
      }
      return { error: error.message || 'Could not save order to database.' };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unable to reach order database.' };
  }

  try {
    const existingRaw = localStorage.getItem('inaya_local_orders');
    const existing = existingRaw ? (JSON.parse(existingRaw) as Order[]) : [];
    localStorage.setItem('inaya_local_orders', JSON.stringify([newOrder, ...existing].slice(0, 20)));
  } catch {
    // ignore storage errors
  }

  return { order: newOrder };
}

export async function trackOrderFallback(lookupQuery: string): Promise<{
  order?: {
    invoice: string;
    customerName: string;
    deliveryZone: string;
    items: OrderItem[];
    totalAmount: number;
    orderStatus: string;
    steadfastConsignmentId?: string | null;
    steadfastTrackingCode?: string | null;
    steadfastStatus?: string | null;
    createdAt: string;
  };
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('track_order_public', {
      lookup_query: lookupQuery.trim(),
    });
    if (!error && data) {
      const r = data as Record<string, unknown>;
      return {
        order: {
          invoice: String(r.invoice),
          customerName: String(r.customer_name),
          deliveryZone: String(r.delivery_zone),
          items: Array.isArray(r.items) ? (r.items as OrderItem[]) : [],
          totalAmount: Number(r.total_amount),
          orderStatus: String(r.order_status),
          steadfastConsignmentId: r.steadfast_consignment_id ? String(r.steadfast_consignment_id) : null,
          steadfastTrackingCode: r.steadfast_tracking_code ? String(r.steadfast_tracking_code) : null,
          steadfastStatus: r.steadfast_status ? String(r.steadfast_status) : null,
          createdAt: String(r.created_at),
        },
      };
    }
  } catch {
    // check local recent orders fallback
  }

  try {
    const existingRaw = localStorage.getItem('inaya_local_orders');
    const existing = existingRaw ? (JSON.parse(existingRaw) as Order[]) : [];
    const q = lookupQuery.trim().toUpperCase();
    const match = existing.find(
      (o) => o.invoice.toUpperCase() === q || o.customerPhone.endsWith(lookupQuery.trim())
    );
    if (match) {
      return {
        order: {
          invoice: match.invoice,
          customerName: match.customerName,
          deliveryZone: match.deliveryZone,
          items: match.items,
          totalAmount: match.totalAmount,
          orderStatus: match.orderStatus,
          steadfastConsignmentId: match.steadfastConsignmentId,
          steadfastTrackingCode: match.steadfastTrackingCode,
          steadfastStatus: match.steadfastStatus,
          createdAt: match.createdAt,
        },
      };
    }
  } catch {
    // ignore
  }

  return { error: 'No order found matching that invoice or phone number.' };
}

export async function submitReviewFallback(review: Review): Promise<void> {
  try {
    await supabase.from('reviews').insert({
      id: review.id,
      product_id: review.productId,
      reviewer_name: review.reviewerName,
      location: review.location,
      rating: review.rating,
      comment: review.comment,
      verified_purchase: review.verifiedPurchase,
      created_at: review.createdAt,
    });
  } catch {
    // ignore
  }
}

export async function fetchAdminBootstrapSupabaseFallback(): Promise<{
  settings: AdminSettings;
  categories: Category[];
  products: Product[];
  reviews: Review[];
  coupons: Coupon[];
  orders: Order[];
  staticMode: boolean;
}> {
  const [storefront, { data: settingsRow }, { data: couponRows }, { data: orderRows }] =
    await Promise.all([
      fetchStorefrontFromSupabaseFallback({
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
      }),
      supabase
        .from('store_settings')
        .select(
          'store_name,topbar_enabled,topbar_text,delivery_enabled,delivery_inside_dhaka,delivery_outside_dhaka,free_delivery_threshold,social_links,meta_pixel_id,meta_test_event_code,steadfast_base_url,steadfast_sandbox_mode'
        )
        .eq('id', 1)
        .maybeSingle(),
      supabase.from('coupons').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
    ]);

  const s = settingsRow as Record<string, unknown> | null;
  const adminSettings: AdminSettings = {
    storeName: String(s?.store_name || storefront.settings.storeName),
    topbarEnabled: s ? Boolean(s.topbar_enabled) : storefront.settings.topbarEnabled,
    topbarText: String(s?.topbar_text || storefront.settings.topbarText),
    deliveryEnabled: s ? Boolean(s.delivery_enabled) : storefront.settings.deliveryEnabled,
    deliveryInsideDhaka: Number(s?.delivery_inside_dhaka ?? storefront.settings.deliveryInsideDhaka),
    deliveryOutsideDhaka: Number(s?.delivery_outside_dhaka ?? storefront.settings.deliveryOutsideDhaka),
    freeDeliveryThreshold: Number(s?.free_delivery_threshold ?? storefront.settings.freeDeliveryThreshold),
    socialLinks: (s?.social_links as AdminSettings['socialLinks']) || storefront.settings.socialLinks,
    metaPixelId: String(s?.meta_pixel_id || ''),
    steadfastBaseUrl: String(s?.steadfast_base_url || 'https://portal.packzy.com/api/v1'),
    steadfastSandboxMode: s ? Boolean(s.steadfast_sandbox_mode) : true,
    hasSteadfastKeys: false,
    steadfastApiKeyMasked: '',
    hasMetaCapiToken: false,
    metaTestEventCode: String(s?.meta_test_event_code || ''),
    cloudinaryCloudName: 'djshdhau',
    cloudinaryApiKey: '235488738718854',
    cloudinaryUploadPreset: '',
    hasCloudinarySecret: false,
    supabaseConfigured: Boolean(settingsRow || (orderRows && orderRows.length >= 0)),
  };

  return {
    settings: adminSettings,
    categories: storefront.categories,
    products: storefront.products,
    reviews: storefront.reviews,
    coupons: (couponRows || []).map((c: Record<string, unknown>) => ({
      id: String(c.id),
      code: String(c.code),
      discountType: c.discount_type === 'fixed' ? 'fixed' : 'percentage',
      discountValue: Number(c.discount_value),
      minOrderAmount: Number(c.min_order_amount || 0),
      active: Boolean(c.active),
      expiresAt: c.expires_at ? String(c.expires_at) : null,
    })),
    orders: (orderRows || []).map((o: Record<string, unknown>) => ({
      id: String(o.id),
      invoice: String(o.invoice),
      customerName: String(o.customer_name),
      customerPhone: String(o.customer_phone),
      customerAddress: String(o.customer_address),
      deliveryZone: o.delivery_zone === 'outside_dhaka' ? 'outside_dhaka' : 'inside_dhaka',
      note: String(o.note || ''),
      items: Array.isArray(o.items) ? (o.items as Order['items']) : [],
      subtotal: Number(o.subtotal),
      discountAmount: Number(o.discount_amount || 0),
      couponCode: o.coupon_code ? String(o.coupon_code) : null,
      deliveryCharge: Number(o.delivery_charge || 0),
      totalAmount: Number(o.total_amount),
      orderStatus: (o.order_status as Order['orderStatus']) || 'pending',
      steadfastConsignmentId: o.steadfast_consignment_id ? String(o.steadfast_consignment_id) : null,
      steadfastTrackingCode: o.steadfast_tracking_code ? String(o.steadfast_tracking_code) : null,
      steadfastStatus: o.steadfast_status ? String(o.steadfast_status) : null,
      steadfastSentAt: o.steadfast_sent_at ? String(o.steadfast_sent_at) : null,
      createdAt: String(o.created_at || new Date().toISOString()),
    })),
    staticMode: true,
  };
}

export async function tryExpressApi(endpoint: string, init?: RequestInit): Promise<Response | null> {
  try {
    const resp = await fetch(apiUrl(endpoint), init);
    const ct = resp.headers.get('content-type') || '';
    if (ct.includes('application/json')) return resp;
    return null;
  } catch {
    return null;
  }
}

export function isUuid(val: string | undefined | null): boolean {
  return Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));
}

function slugifyText(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `item-${Date.now()}`;
}

export async function adminUpdateOrderStatusFallback(
  orderId: string,
  orderStatus: Order['orderStatus']
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from('orders').update({ order_status: orderStatus }).eq('id', orderId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function adminBookSteadfastSandboxFallback(order: Order): Promise<{ order?: Order; error?: string }> {
  const consignmentId = String(Math.floor(10000000 + Math.random() * 89999999));
  const trackingCode = `SF${Math.floor(1000000 + Math.random() * 8999999)}BD`;
  const sentAt = new Date().toISOString();
  const { error } = await supabase
    .from('orders')
    .update({
      steadfast_consignment_id: consignmentId,
      steadfast_tracking_code: trackingCode,
      steadfast_status: 'in_review',
      steadfast_sent_at: sentAt,
      order_status: 'confirmed',
    })
    .eq('id', order.id);

  if (error) return { error: error.message };
  return {
    order: {
      ...order,
      steadfastConsignmentId: consignmentId,
      steadfastTrackingCode: trackingCode,
      steadfastStatus: 'in_review',
      steadfastSentAt: sentAt,
      orderStatus: 'confirmed',
    },
  };
}

export async function adminReorderProductsFallback(reindexed: Product[]): Promise<void> {
  for (const p of reindexed) {
    if (!isUuid(p.id)) continue;
    await supabase.from('products').update({ display_order: p.displayOrder }).eq('id', p.id);
  }
}

export async function adminSaveProductFallback(payload: {
  id?: string;
  name: string;
  slug?: string;
  categoryId?: string;
  price: number;
  compareAtPrice?: number | null;
  description: string;
  fabricCare: string;
  images: string[];
  sizes: Product['sizes'];
  colors: Product['colors'];
  comingSoon: boolean;
  showOnHomepage: boolean;
  displayOrder: number;
}): Promise<{ product?: Product; error?: string }> {
  const finalSlug = payload.slug ? slugifyText(payload.slug) : slugifyText(payload.name);
  const rowPayload = {
    name: payload.name.trim(),
    slug: finalSlug,
    category_id: isUuid(payload.categoryId) ? payload.categoryId : null,
    description: payload.description || '',
    fabric_care: payload.fabricCare || '',
    price: Number(payload.price),
    compare_at_price: payload.compareAtPrice ? Number(payload.compareAtPrice) : null,
    images: payload.images || [],
    sizes: payload.sizes || [],
    colors: payload.colors || [],
    coming_soon: Boolean(payload.comingSoon),
    show_on_homepage: payload.showOnHomepage !== false,
    display_order: Number(payload.displayOrder || 1),
    updated_at: new Date().toISOString(),
  };

  if (payload.id && isUuid(payload.id)) {
    const { data, error } = await supabase
      .from('products')
      .update(rowPayload)
      .eq('id', payload.id)
      .select()
      .single();
    if (error || !data) return { error: error?.message || 'Failed to update product in Supabase.' };
    return {
      product: {
        id: String(data.id),
        name: String(data.name),
        slug: String(data.slug),
        categoryId: String(data.category_id || ''),
        description: String(data.description || ''),
        fabricCare: String(data.fabric_care || ''),
        price: Number(data.price),
        compareAtPrice: data.compare_at_price ? Number(data.compare_at_price) : null,
        images: Array.isArray(data.images) ? (data.images as string[]) : [],
        sizes: Array.isArray(data.sizes) ? (data.sizes as Product['sizes']) : [],
        colors: Array.isArray(data.colors) ? (data.colors as Product['colors']) : [],
        comingSoon: Boolean(data.coming_soon),
        showOnHomepage: data.show_on_homepage !== false,
        displayOrder: Number(data.display_order || 1),
        createdAt: String(data.created_at || new Date().toISOString()),
      },
    };
  }

  const { data, error } = await supabase.from('products').insert(rowPayload).select().single();
  if (error || !data) return { error: error?.message || 'Failed to add product in Supabase.' };
  return {
    product: {
      id: String(data.id),
      name: String(data.name),
      slug: String(data.slug),
      categoryId: String(data.category_id || ''),
      description: String(data.description || ''),
      fabricCare: String(data.fabric_care || ''),
      price: Number(data.price),
      compareAtPrice: data.compare_at_price ? Number(data.compare_at_price) : null,
      images: Array.isArray(data.images) ? (data.images as string[]) : [],
      sizes: Array.isArray(data.sizes) ? (data.sizes as Product['sizes']) : [],
      colors: Array.isArray(data.colors) ? (data.colors as Product['colors']) : [],
      comingSoon: Boolean(data.coming_soon),
      showOnHomepage: data.show_on_homepage !== false,
      displayOrder: Number(data.display_order || 1),
      createdAt: String(data.created_at || new Date().toISOString()),
    },
  };
}

export async function adminDeleteProductFallback(id: string): Promise<{ ok: boolean; error?: string }> {
  if (!isUuid(id)) return { ok: true };
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function adminSaveCategoryFallback(payload: {
  id?: string | null;
  name: string;
  description: string;
}): Promise<{ ok: boolean; error?: string }> {
  const row = {
    name: payload.name.trim(),
    slug: slugifyText(payload.name),
    description: payload.description.trim(),
  };
  if (payload.id && isUuid(payload.id)) {
    const { error } = await supabase.from('categories').update(row).eq('id', payload.id);
    return error ? { ok: false, error: error.message } : { ok: true };
  }
  const { error } = await supabase.from('categories').insert(row);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function adminDeleteCategoryFallback(id: string): Promise<{ ok: boolean; error?: string }> {
  if (!isUuid(id)) return { ok: true };
  const { error } = await supabase.from('categories').delete().eq('id', id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function adminCreateCouponFallback(payload: {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
}): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from('coupons').upsert(
    {
      code: payload.code.trim().toUpperCase(),
      discount_type: payload.discountType,
      discount_value: payload.discountValue,
      min_order_amount: payload.minOrderAmount,
      active: true,
    },
    { onConflict: 'code' }
  );
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function adminDeleteCouponFallback(id: string): Promise<{ ok: boolean; error?: string }> {
  if (!isUuid(id)) return { ok: true };
  const { error } = await supabase.from('coupons').delete().eq('id', id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function adminAddReviewFallback(payload: {
  productId: string;
  reviewerName: string;
  location: string;
  rating: number;
  comment: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from('reviews').insert({
    product_id: isUuid(payload.productId) ? payload.productId : null,
    reviewer_name: payload.reviewerName.trim(),
    location: payload.location.trim() || 'Dhaka',
    rating: payload.rating,
    comment: payload.comment.trim(),
    verified_purchase: true,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function adminDeleteReviewFallback(id: string): Promise<{ ok: boolean; error?: string }> {
  if (!isUuid(id)) return { ok: true };
  const { error } = await supabase.from('reviews').delete().eq('id', id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function adminSaveSettingsFallback(settings: AdminSettings): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from('store_settings').upsert(
    {
      id: 1,
      store_name: settings.storeName,
      topbar_enabled: settings.topbarEnabled,
      topbar_text: settings.topbarText,
      delivery_enabled: settings.deliveryEnabled,
      delivery_inside_dhaka: settings.deliveryInsideDhaka,
      delivery_outside_dhaka: settings.deliveryOutsideDhaka,
      free_delivery_threshold: settings.freeDeliveryThreshold,
      social_links: settings.socialLinks,
      meta_pixel_id: settings.metaPixelId,
      meta_test_event_code: settings.metaTestEventCode,
      steadfast_base_url: settings.steadfastBaseUrl,
      steadfast_sandbox_mode: settings.steadfastSandboxMode,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function uploadImageStaticFallback(
  file: File,
  cloudName?: string,
  uploadPreset?: string
): Promise<{ url: string; notice?: string }> {
  if (cloudName && uploadPreset) {
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', uploadPreset);
    const resp = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: form,
    });
    if (resp.ok) {
      const json = (await resp.json()) as { secure_url?: string };
      if (json.secure_url) {
        return { url: json.secure_url };
      }
    }
  }

  // Fallback: resize/compress nicely to max 900x1200 JPEG data URL for direct Supabase storage
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.readAsDataURL(file);
  });

  const compressed = await new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxW = 900;
      const scale = img.width > maxW ? maxW / img.width : 1;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });

  return {
    url: compressed,
    notice: 'Saved optimized image directly (add an Unsigned Upload Preset in Courier/Media Settings for Cloudinary CDN upload on static hosting).',
  };
}

