import type { AdminSettings, Category, Coupon, Order, Product, PublicSettings, Review } from '../types';
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
    const [{ data: catRows }, { data: prodRows }, { data: revRows }] = await Promise.all([
      supabase.from('categories').select('*').order('display_order'),
      supabase.from('products').select('*').order('display_order'),
      supabase.from('reviews').select('*').order('created_at', { ascending: false }),
    ]);

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

    return { settings: defaultSettings, categories, products, reviews };
  } catch {
    return {
      settings: defaultSettings,
      categories: STATIC_CATEGORIES,
      products: STATIC_PRODUCTS,
      reviews: STATIC_REVIEWS,
    };
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
