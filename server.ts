import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import { createServer as createViteServer } from 'vite';
import type { AdminSettings, Order, Product, PublicSettings } from './src/types';
import {
  createOrderRecord,
  deleteCategory,
  deleteCoupon,
  deleteProduct,
  deleteReview,
  getStoreDb,
  isSupabaseServiceConfigured,
  reorderProducts,
  saveCategory,
  saveCoupon,
  saveProduct,
  saveReview,
  updateOrderRecord,
  updateSettings,
} from './server/store';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mtngwbrcywmmxfwrumxb.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || 'sb_publishable_NWI2NHZk2lbI9HW9Qh0S0Q_TxR_WyEE';

const UPLOAD_DIR = path.resolve(process.cwd(), 'public', 'uploads');

// SSE Subscribers for Real-Time Admin Order Notifications
const sseClients = new Set<Response>();

function broadcastAdminEvent(eventName: string, payload: unknown) {
  const serialized = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(serialized);
    } catch {
      sseClients.delete(res);
    }
  }
}

function maskKey(value: string): string {
  if (!value) return '';
  if (value.length <= 6) return '••••••';
  return `${'•'.repeat(Math.min(12, value.length - 4))}${value.slice(-4)}`;
}

function sanitizeSteadfastText(input: string, maxLen: number): string {
  return String(input || '')
    .replace(/[{}\<\>;$]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

async function verifySupabaseJwt(token: string): Promise<{ email: string } | null> {
  try {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!resp.ok) return null;
    const user = (await resp.json()) as { email?: string; id?: string };
    if (!user?.email) return null;

    const allowlistRaw = process.env.ADMIN_EMAILS?.trim();
    if (allowlistRaw) {
      const allowed = allowlistRaw
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
      if (allowed.length > 0 && !allowed.includes(user.email.toLowerCase())) {
        return null;
      }
    }
    return { email: user.email };
  } catch {
    return null;
  }
}

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || '';
  const queryToken = typeof req.query.token === 'string' ? req.query.token : '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : queryToken;

  if (!token) {
    res.status(401).json({ error: 'Authentication required. Sign in with Supabase Auth.' });
    return;
  }

  const supaUser = await verifySupabaseJwt(token);
  if (supaUser) {
    (req as Request & { adminEmail?: string }).adminEmail = supaUser.email;
    next();
    return;
  }

  res.status(401).json({ error: 'Invalid or expired Supabase session' });
}

function sha256Hex(val: string): string {
  return crypto.createHash('sha256').update(val.trim().toLowerCase()).digest('hex');
}

async function dispatchMetaCapiEvent(params: {
  pixelId: string;
  accessToken: string;
  testEventCode?: string;
  eventName: string;
  eventId?: string;
  eventSourceUrl?: string;
  clientIp?: string;
  userAgent?: string;
  phone?: string;
  name?: string;
  value?: number;
  currency?: string;
  contentIds?: string[];
}) {
  if (!params.pixelId || !params.accessToken) return { skipped: true };

  const userData: Record<string, unknown> = {};
  if (params.clientIp) userData.client_ip_address = params.clientIp;
  if (params.userAgent) userData.client_user_agent = params.userAgent;
  if (params.phone) userData.ph = [sha256Hex(params.phone.replace(/[^0-9]/g, ''))];
  if (params.name) userData.fn = [sha256Hex(params.name)];

  const body: Record<string, unknown> = {
    data: [
      {
        event_name: params.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: params.eventId || crypto.randomUUID(),
        action_source: 'website',
        event_source_url: params.eventSourceUrl || process.env.APP_URL || 'https://demosite.com',
        user_data: userData,
        custom_data: {
          currency: params.currency || 'BDT',
          value: params.value || 0,
          content_ids: params.contentIds || [],
          content_type: 'product',
        },
      },
    ],
  };

  if (params.testEventCode) {
    body.test_event_code = params.testEventCode;
  }

  try {
    const resp = await fetch(
      `https://graph.facebook.com/v20.0/${encodeURIComponent(params.pixelId)}/events?access_token=${encodeURIComponent(params.accessToken)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );
    return await resp.json();
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Meta CAPI network failure' };
  }
}

function toPublicSettings(dbSettings: Awaited<ReturnType<typeof getStoreDb>>['settings']): PublicSettings {
  return {
    storeName: dbSettings.storeName,
    topbarEnabled: dbSettings.topbarEnabled,
    topbarText: dbSettings.topbarText,
    deliveryEnabled: dbSettings.deliveryEnabled,
    deliveryInsideDhaka: dbSettings.deliveryInsideDhaka,
    deliveryOutsideDhaka: dbSettings.deliveryOutsideDhaka,
    freeDeliveryThreshold: dbSettings.freeDeliveryThreshold,
    socialLinks: dbSettings.socialLinks,
    metaPixelId: dbSettings.metaPixelId,
  };
}

function toAdminSettings(dbSettings: Awaited<ReturnType<typeof getStoreDb>>['settings']): AdminSettings {
  return {
    ...toPublicSettings(dbSettings),
    steadfastBaseUrl: dbSettings.steadfastBaseUrl,
    steadfastSandboxMode: dbSettings.steadfastSandboxMode,
    hasSteadfastKeys: Boolean(dbSettings.steadfastApiKey && dbSettings.steadfastSecretKey),
    steadfastApiKeyMasked: maskKey(dbSettings.steadfastApiKey),
    hasMetaCapiToken: Boolean(dbSettings.metaCapiToken),
    metaTestEventCode: dbSettings.metaTestEventCode,
    cloudinaryCloudName: dbSettings.cloudinaryCloudName,
    cloudinaryApiKey: dbSettings.cloudinaryApiKey,
    cloudinaryUploadPreset: dbSettings.cloudinaryUploadPreset,
    hasCloudinarySecret: Boolean(dbSettings.cloudinaryApiSecret),
    supabaseConfigured: isSupabaseServiceConfigured(),
  };
}

async function startServer() {
  const app = express();

  // Security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  app.use(express.json({ limit: '15mb' }));
  app.use('/uploads', express.static(UPLOAD_DIR));

  // Simple in-memory rate limit for public order & auth endpoints
  const rateHits = new Map<string, { count: number; resetAt: number }>();
  function checkRateLimit(key: string, maxPerMin: number): boolean {
    const now = Date.now();
    const rec = rateHits.get(key);
    if (!rec || now > rec.resetAt) {
      rateHits.set(key, { count: 1, resetAt: now + 60_000 });
      return true;
    }
    if (rec.count >= maxPerMin) return false;
    rec.count += 1;
    return true;
  }

  // ===========================================================================
  // PUBLIC SEO ENDPOINTS (Google Indexing & Permalinks)
  // ===========================================================================
  app.get('/robots.txt', (req, res) => {
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    res.type('text/plain').send(
      [
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin',
        'Disallow: /api/',
        `Sitemap: ${baseUrl}/sitemap.xml`,
      ].join('\n')
    );
  });

  app.get('/sitemap.xml', async (req, res) => {
    const db = await getStoreDb();
    const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    const today = new Date().toISOString().split('T')[0];

    const urls = [
      { loc: `${baseUrl}/`, priority: '1.0', changefreq: 'daily' },
      { loc: `${baseUrl}/shop`, priority: '0.9', changefreq: 'daily' },
      { loc: `${baseUrl}/track-order`, priority: '0.6', changefreq: 'weekly' },
      ...db.categories.map((c) => ({
        loc: `${baseUrl}/category/${c.slug}`,
        priority: '0.8',
        changefreq: 'weekly',
      })),
      ...db.products.map((p) => ({
        loc: `${baseUrl}/product/${p.slug}`,
        priority: '0.9',
        changefreq: 'daily',
      })),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

    res.type('application/xml').send(xml);
  });

  // ===========================================================================
  // PUBLIC STOREFRONT API (Zero sensitive secrets leaked)
  // ===========================================================================
  app.get('/api/storefront', async (_req, res) => {
    const db = await getStoreDb();
    const categories = [...db.categories].sort((a, b) => a.displayOrder - b.displayOrder);
    const products = [...db.products].sort((a, b) => a.displayOrder - b.displayOrder);

    res.json({
      settings: toPublicSettings(db.settings),
      categories,
      products,
      reviews: db.reviews,
    });
  });

  app.post('/api/coupons/validate', async (req, res) => {
    const { code, subtotal } = req.body as { code?: string; subtotal?: number };
    const cleanCode = String(code || '').trim().toUpperCase();
    if (!cleanCode) {
      res.status(400).json({ error: 'Please enter a coupon code.' });
      return;
    }

    const db = await getStoreDb();
    const coupon = db.coupons.find((c) => c.code.toUpperCase() === cleanCode && c.active);
    if (!coupon) {
      res.status(404).json({ error: 'Invalid or inactive coupon code.' });
      return;
    }
    if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
      res.status(400).json({ error: 'This coupon has expired.' });
      return;
    }
    const orderSubtotal = Number(subtotal || 0);
    if (orderSubtotal < coupon.minOrderAmount) {
      res.status(400).json({
        error: `Minimum order of ৳${coupon.minOrderAmount.toLocaleString()} required for ${coupon.code}.`,
      });
      return;
    }

    const discountAmount =
      coupon.discountType === 'percentage'
        ? Math.round((orderSubtotal * coupon.discountValue) / 100)
        : Math.min(orderSubtotal, coupon.discountValue);

    res.json({
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
    });
  });

  app.post('/api/orders', async (req, res) => {
    const ip = req.ip || 'unknown';
    if (!checkRateLimit(`order:${ip}`, 15)) {
      res.status(429).json({ error: 'Too many order attempts. Please wait a minute.' });
      return;
    }

    const {
      customerName,
      customerPhone,
      customerAddress,
      deliveryZone,
      note,
      items,
      couponCode,
      eventId,
      eventSourceUrl,
    } = req.body as {
      customerName?: string;
      customerPhone?: string;
      customerAddress?: string;
      deliveryZone?: 'inside_dhaka' | 'outside_dhaka';
      note?: string;
      items?: Array<{ productId: string; size: string; color: string; quantity: number }>;
      couponCode?: string;
      eventId?: string;
      eventSourceUrl?: string;
    };

    if (!customerName?.trim() || !customerPhone?.trim() || !customerAddress?.trim()) {
      res.status(400).json({ error: 'Name, mobile number, and full delivery address are required.' });
      return;
    }

    const cleanPhone = customerPhone.replace(/[^0-9+]/g, '');
    if (cleanPhone.length < 10) {
      res.status(400).json({ error: 'Please enter a valid Bangladesh mobile number (e.g. 017XXXXXXXX).' });
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Your shopping bag is empty.' });
      return;
    }

    const db = await getStoreDb();
    const verifiedItems: Order['items'] = [];
    let subtotal = 0;

    for (const item of items) {
      const product = db.products.find((p) => p.id === item.productId);
      if (!product) {
        res.status(400).json({ error: 'One or more products in your cart are no longer available.' });
        return;
      }
      if (product.comingSoon) {
        res.status(400).json({ error: `${product.name} is coming soon and cannot be ordered yet.` });
        return;
      }
      const sizeMatch = product.sizes.find((s) => s.size === item.size);
      if (sizeMatch && !sizeMatch.inStock) {
        res.status(400).json({ error: `Size ${item.size} for ${product.name} is currently out of stock.` });
        return;
      }
      const colorMatch = product.colors.find((c) => c.name === item.color);
      if (colorMatch && !colorMatch.inStock) {
        res.status(400).json({ error: `Color ${item.color} for ${product.name} is currently out of stock.` });
        return;
      }

      const qty = Math.max(1, Math.min(20, Number(item.quantity || 1)));
      verifiedItems.push({
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        image: colorMatch?.image || product.images[0] || '',
        size: item.size,
        color: item.color,
        price: product.price,
        quantity: qty,
      });
      subtotal += product.price * qty;
    }

    // Server-side coupon calculation
    let discountAmount = 0;
    let appliedCouponCode: string | null = null;
    if (couponCode?.trim()) {
      const cleanCode = couponCode.trim().toUpperCase();
      const coupon = db.coupons.find((c) => c.code.toUpperCase() === cleanCode && c.active);
      if (
        coupon &&
        (!coupon.expiresAt || new Date(coupon.expiresAt).getTime() >= Date.now()) &&
        subtotal >= coupon.minOrderAmount
      ) {
        appliedCouponCode = coupon.code;
        discountAmount =
          coupon.discountType === 'percentage'
            ? Math.round((subtotal * coupon.discountValue) / 100)
            : Math.min(subtotal, coupon.discountValue);
      }
    }

    // Server-side delivery calculation
    const zone = deliveryZone === 'outside_dhaka' ? 'outside_dhaka' : 'inside_dhaka';
    const afterDiscount = Math.max(0, subtotal - discountAmount);
    let deliveryCharge = 0;
    if (db.settings.deliveryEnabled) {
      const freeAbove = db.settings.freeDeliveryThreshold;
      if (freeAbove > 0 && afterDiscount >= freeAbove) {
        deliveryCharge = 0;
      } else {
        deliveryCharge =
          zone === 'inside_dhaka' ? db.settings.deliveryInsideDhaka : db.settings.deliveryOutsideDhaka;
      }
    }

    const totalAmount = afterDiscount + deliveryCharge;
    const now = new Date();
    const dateStamp = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoice = `INY-${dateStamp}-${randSuffix}`;

    const newOrder: Order = {
      id: crypto.randomUUID(),
      invoice,
      customerName: customerName.trim(),
      customerPhone: cleanPhone,
      customerAddress: customerAddress.trim(),
      deliveryZone: zone,
      note: String(note || '').trim(),
      items: verifiedItems,
      subtotal,
      discountAmount,
      couponCode: appliedCouponCode,
      deliveryCharge,
      totalAmount,
      orderStatus: 'pending',
      steadfastConsignmentId: null,
      steadfastTrackingCode: null,
      steadfastStatus: null,
      steadfastSentAt: null,
      createdAt: now.toISOString(),
    };

    await createOrderRecord(newOrder);

    // Trigger Real-Time Admin Notification via SSE
    broadcastAdminEvent('new_order', {
      id: newOrder.id,
      invoice: newOrder.invoice,
      customerName: newOrder.customerName,
      totalAmount: newOrder.totalAmount,
      itemCount: verifiedItems.reduce((acc, i) => acc + i.quantity, 0),
      createdAt: newOrder.createdAt,
    });

    // Server-side Meta Conversion API Purchase event
    if (db.settings.metaPixelId && db.settings.metaCapiToken) {
      void dispatchMetaCapiEvent({
        pixelId: db.settings.metaPixelId,
        accessToken: db.settings.metaCapiToken,
        testEventCode: db.settings.metaTestEventCode,
        eventName: 'Purchase',
        eventId: eventId || newOrder.invoice,
        eventSourceUrl,
        clientIp: req.ip,
        userAgent: req.get('user-agent'),
        phone: newOrder.customerPhone,
        name: newOrder.customerName,
        value: newOrder.totalAmount,
        contentIds: verifiedItems.map((i) => i.productId),
      });
    }

    res.status(201).json({ order: newOrder });
  });

  app.get('/api/orders/track/:invoice', async (req, res) => {
    const invoiceQuery = String(req.params.invoice || '').trim().toUpperCase();
    const db = await getStoreDb();
    const order = db.orders.find(
      (o) => o.invoice.toUpperCase() === invoiceQuery || o.customerPhone.endsWith(invoiceQuery)
    );
    if (!order) {
      res.status(404).json({ error: 'No order found matching that invoice or phone number.' });
      return;
    }

    res.json({
      invoice: order.invoice,
      customerName: order.customerName,
      deliveryZone: order.deliveryZone,
      items: order.items,
      totalAmount: order.totalAmount,
      orderStatus: order.orderStatus,
      steadfastConsignmentId: order.steadfastConsignmentId,
      steadfastTrackingCode: order.steadfastTrackingCode,
      steadfastStatus: order.steadfastStatus,
      createdAt: order.createdAt,
    });
  });

  app.post('/api/tracking/meta-event', async (req, res) => {
    const { eventName, eventId, value, contentIds, eventSourceUrl } = req.body as {
      eventName?: string;
      eventId?: string;
      value?: number;
      contentIds?: string[];
      eventSourceUrl?: string;
    };
    const db = await getStoreDb();
    if (!db.settings.metaPixelId || !db.settings.metaCapiToken) {
      res.json({ ok: true, skipped: true });
      return;
    }
    const result = await dispatchMetaCapiEvent({
      pixelId: db.settings.metaPixelId,
      accessToken: db.settings.metaCapiToken,
      testEventCode: db.settings.metaTestEventCode,
      eventName: eventName || 'PageView',
      eventId,
      eventSourceUrl,
      clientIp: req.ip,
      userAgent: req.get('user-agent'),
      value,
      contentIds,
    });
    res.json({ ok: true, result });
  });

  app.post('/api/reviews', async (req, res) => {
    const ip = req.ip || 'unknown';
    if (!checkRateLimit(`review:${ip}`, 10)) {
      res.status(429).json({ error: 'Too many review submissions. Please wait a minute.' });
      return;
    }
    const { productId, reviewerName, location, rating, comment } = req.body as {
      productId?: string;
      reviewerName?: string;
      location?: string;
      rating?: number;
      comment?: string;
    };
    if (!productId || !reviewerName?.trim() || !comment?.trim()) {
      res.status(400).json({ error: 'Product, name, and review comment are required.' });
      return;
    }
    const review = await saveReview({
      id: crypto.randomUUID(),
      productId,
      reviewerName: reviewerName.trim().slice(0, 60),
      location: (location?.trim() || 'Dhaka').slice(0, 60),
      rating: Math.max(1, Math.min(5, Number(rating || 5))),
      comment: comment.trim().slice(0, 500),
      verifiedPurchase: false,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ review });
  });

  // ===========================================================================
  // PROTECTED ADMIN ROUTES (Supabase Auth Only)
  // ===========================================================================
  app.get('/api/admin/events', requireAdmin, (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    res.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);

    sseClients.add(res);
    const keepAlive = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(keepAlive);
      }
    }, 25_000);

    req.on('close', () => {
      clearInterval(keepAlive);
      sseClients.delete(res);
    });
  });

  app.get('/api/admin/bootstrap', requireAdmin, async (_req, res) => {
    const db = await getStoreDb();
    res.json({
      settings: toAdminSettings(db.settings),
      categories: [...db.categories].sort((a, b) => a.displayOrder - b.displayOrder),
      products: [...db.products].sort((a, b) => a.displayOrder - b.displayOrder),
      reviews: db.reviews,
      coupons: db.coupons,
      orders: db.orders,
    });
  });

  app.put('/api/admin/settings', requireAdmin, async (req, res) => {
    const body = req.body as Record<string, unknown>;
    const db = await getStoreDb();
    const patch: Partial<typeof db.settings> = {};

    if (typeof body.storeName === 'string') patch.storeName = body.storeName.trim();
    if (typeof body.topbarEnabled === 'boolean') patch.topbarEnabled = body.topbarEnabled;
    if (typeof body.topbarText === 'string') patch.topbarText = body.topbarText.trim();
    if (typeof body.deliveryEnabled === 'boolean') patch.deliveryEnabled = body.deliveryEnabled;
    if (body.deliveryInsideDhaka !== undefined) patch.deliveryInsideDhaka = Number(body.deliveryInsideDhaka);
    if (body.deliveryOutsideDhaka !== undefined) patch.deliveryOutsideDhaka = Number(body.deliveryOutsideDhaka);
    if (body.freeDeliveryThreshold !== undefined)
      patch.freeDeliveryThreshold = Number(body.freeDeliveryThreshold);
    if (body.socialLinks && typeof body.socialLinks === 'object') {
      patch.socialLinks = body.socialLinks as typeof db.settings.socialLinks;
    }
    if (typeof body.metaPixelId === 'string') patch.metaPixelId = body.metaPixelId.trim();
    if (typeof body.metaCapiToken === 'string' && body.metaCapiToken.trim()) {
      patch.metaCapiToken = body.metaCapiToken.trim();
    }
    if (typeof body.metaTestEventCode === 'string') patch.metaTestEventCode = body.metaTestEventCode.trim();
    if (typeof body.steadfastBaseUrl === 'string' && body.steadfastBaseUrl.trim()) {
      patch.steadfastBaseUrl = body.steadfastBaseUrl.trim().replace(/\/$/, '');
    }
    if (typeof body.steadfastSandboxMode === 'boolean') {
      patch.steadfastSandboxMode = body.steadfastSandboxMode;
    }
    if (typeof body.steadfastApiKey === 'string' && body.steadfastApiKey.trim()) {
      patch.steadfastApiKey = body.steadfastApiKey.trim();
    }
    if (typeof body.steadfastSecretKey === 'string' && body.steadfastSecretKey.trim()) {
      patch.steadfastSecretKey = body.steadfastSecretKey.trim();
    }
    if (typeof body.cloudinaryCloudName === 'string' && body.cloudinaryCloudName.trim()) {
      patch.cloudinaryCloudName = body.cloudinaryCloudName.trim();
    }
    if (typeof body.cloudinaryApiKey === 'string' && body.cloudinaryApiKey.trim()) {
      patch.cloudinaryApiKey = body.cloudinaryApiKey.trim();
    }
    if (typeof body.cloudinaryUploadPreset === 'string') {
      patch.cloudinaryUploadPreset = body.cloudinaryUploadPreset.trim();
    }
    if (typeof body.cloudinaryApiSecret === 'string' && body.cloudinaryApiSecret.trim()) {
      patch.cloudinaryApiSecret = body.cloudinaryApiSecret.trim();
    }

    const updated = await updateSettings(patch);
    res.json({ settings: toAdminSettings(updated) });
  });

  // Cloudinary Server-Side Upload Proxy (keeps API Secret strictly on server!)
  app.post('/api/admin/upload', requireAdmin, async (req, res) => {
    const { imageBase64, fileName } = req.body as { imageBase64?: string; fileName?: string };
    if (!imageBase64) {
      res.status(400).json({ error: 'No image data provided.' });
      return;
    }

    const db = await getStoreDb();
    const cloudName = db.settings.cloudinaryCloudName || 'djshdhau';
    const apiKey = db.settings.cloudinaryApiKey || '235488738718854';
    const apiSecret = db.settings.cloudinaryApiSecret || process.env.CLOUDINARY_API_SECRET || '';
    const uploadPreset = db.settings.cloudinaryUploadPreset || process.env.CLOUDINARY_UPLOAD_PRESET || '';

    // 1. Signed Cloudinary Upload (if API secret is present)
    if (apiSecret) {
      try {
        const timestamp = Math.floor(Date.now() / 1000);
        const folder = 'inaya-fashion/products';
        const signatureString = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
        const signature = crypto.createHash('sha1').update(signatureString).digest('hex');

        const form = new URLSearchParams();
        form.append('file', imageBase64);
        form.append('api_key', apiKey);
        form.append('timestamp', String(timestamp));
        form.append('folder', folder);
        form.append('signature', signature);

        const resp = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: form,
        });
        const data = (await resp.json()) as { secure_url?: string; error?: { message: string } };
        if (!resp.ok || !data.secure_url) {
          res.status(400).json({ error: data.error?.message || 'Cloudinary upload failed.' });
          return;
        }
        // Apply crisp 3:4 auto-crop optimization URL
        const optimizedUrl = data.secure_url.replace('/upload/', '/upload/f_auto,q_auto,c_fill,ar_3:4,w_1200/');
        res.json({ url: optimizedUrl, provider: 'cloudinary' });
        return;
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Cloudinary request failed' });
        return;
      }
    }

    // 2. Unsigned preset Cloudinary Upload (if preset configured)
    if (uploadPreset) {
      try {
        const form = new URLSearchParams();
        form.append('file', imageBase64);
        form.append('upload_preset', uploadPreset);
        form.append('folder', 'inaya-fashion/products');

        const resp = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: form,
        });
        const data = (await resp.json()) as { secure_url?: string; error?: { message: string } };
        if (resp.ok && data.secure_url) {
          const optimizedUrl = data.secure_url.replace('/upload/', '/upload/f_auto,q_auto,c_fill,ar_3:4,w_1200/');
          res.json({ url: optimizedUrl, provider: 'cloudinary' });
          return;
        }
      } catch {
        // Fall through to local storage fallback
      }
    }

    // 3. Safe local disk fallback when Cloudinary secret/preset is not yet configured in preview
    try {
      if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      }
      const match = imageBase64.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (!match) {
        res.status(400).json({ error: 'Invalid image base64 format.' });
        return;
      }
      const ext = match[1] === 'jpeg' ? 'jpg' : match[1].replace(/[^a-z0-9]/gi, '');
      const base = path
        .basename(fileName || 'product', path.extname(fileName || ''))
        .replace(/[^a-z0-9-_]/gi, '-')
        .toLowerCase();
      const targetName = `${base}-${Date.now()}.${ext || 'jpg'}`;
      fs.writeFileSync(path.join(UPLOAD_DIR, targetName), Buffer.from(match[2], 'base64'));
      res.json({
        url: `/uploads/${targetName}`,
        provider: 'local-fallback',
        notice:
          'Saved locally for preview. Add CLOUDINARY_API_SECRET or an unsigned upload preset in Settings for live Cloudinary CDN.',
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Upload failed' });
    }
  });

  // Products CRUD & Reordering
  app.post('/api/admin/products', requireAdmin, async (req, res) => {
    const body = req.body as Partial<Product>;
    if (!body.name?.trim() || !body.price) {
      res.status(400).json({ error: 'Product name and price are required.' });
      return;
    }
    const db = await getStoreDb();
    const slug =
      (body.slug || body.name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') +
      '-' +
      Math.floor(100 + Math.random() * 900);

    const product: Product = {
      id: body.id || crypto.randomUUID(),
      name: body.name.trim(),
      slug: body.slug?.trim() || slug,
      categoryId: body.categoryId || db.categories[0]?.id || '',
      description: body.description || '',
      fabricCare: body.fabricCare || '',
      price: Number(body.price),
      compareAtPrice: body.compareAtPrice ? Number(body.compareAtPrice) : null,
      images: Array.isArray(body.images) ? body.images : [],
      sizes: Array.isArray(body.sizes) ? body.sizes : [{ size: 'M', inStock: true }],
      colors: Array.isArray(body.colors) ? body.colors : [],
      comingSoon: Boolean(body.comingSoon),
      showOnHomepage: body.showOnHomepage ?? true,
      displayOrder: Number(body.displayOrder ?? db.products.length + 1),
      createdAt: body.createdAt || new Date().toISOString(),
    };

    const saved = await saveProduct(product);
    res.status(201).json({ product: saved });
  });

  app.put('/api/admin/products/:id', requireAdmin, async (req, res) => {
    const db = await getStoreDb();
    const existing = db.products.find((p) => p.id === req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    const body = req.body as Partial<Product>;
    const updated: Product = {
      ...existing,
      ...body,
      id: existing.id,
      price: body.price !== undefined ? Number(body.price) : existing.price,
      compareAtPrice:
        body.compareAtPrice !== undefined
          ? body.compareAtPrice
            ? Number(body.compareAtPrice)
            : null
          : existing.compareAtPrice,
      displayOrder: body.displayOrder !== undefined ? Number(body.displayOrder) : existing.displayOrder,
    };
    const saved = await saveProduct(updated);
    res.json({ product: saved });
  });

  app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
    await deleteProduct(String(req.params.id));
    res.json({ ok: true });
  });

  app.patch('/api/admin/products/reorder', requireAdmin, async (req, res) => {
    const { orderedIds } = req.body as { orderedIds?: string[] };
    if (!Array.isArray(orderedIds)) {
      res.status(400).json({ error: 'orderedIds array required.' });
      return;
    }
    const products = await reorderProducts(orderedIds);
    res.json({ products });
  });

  // Categories CRUD
  app.post('/api/admin/categories', requireAdmin, async (req, res) => {
    const body = req.body as { id?: string; name?: string; slug?: string; description?: string; displayOrder?: number };
    if (!body.name?.trim()) {
      res.status(400).json({ error: 'Category name is required.' });
      return;
    }
    const db = await getStoreDb();
    const slug = (body.slug || body.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const cat = await saveCategory({
      id: body.id || crypto.randomUUID(),
      name: body.name.trim(),
      slug,
      description: body.description || '',
      displayOrder: Number(body.displayOrder ?? db.categories.length + 1),
    });
    res.status(201).json({ category: cat });
  });

  app.put('/api/admin/categories/:id', requireAdmin, async (req, res) => {
    const db = await getStoreDb();
    const existing = db.categories.find((c) => c.id === req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Category not found.' });
      return;
    }
    const body = req.body as { name?: string; slug?: string; description?: string; displayOrder?: number };
    const updated = await saveCategory({
      ...existing,
      name: body.name?.trim() || existing.name,
      slug: body.slug?.trim() || existing.slug,
      description: body.description !== undefined ? body.description : existing.description,
      displayOrder: body.displayOrder !== undefined ? Number(body.displayOrder) : existing.displayOrder,
    });
    res.json({ category: updated });
  });

  app.delete('/api/admin/categories/:id', requireAdmin, async (req, res) => {
    await deleteCategory(String(req.params.id));
    res.json({ ok: true });
  });

  // Coupons CRUD
  app.post('/api/admin/coupons', requireAdmin, async (req, res) => {
    const body = req.body as {
      id?: string;
      code?: string;
      discountType?: 'percentage' | 'fixed';
      discountValue?: number;
      minOrderAmount?: number;
      active?: boolean;
      expiresAt?: string | null;
    };
    if (!body.code?.trim() || !body.discountValue) {
      res.status(400).json({ error: 'Coupon code and discount value are required.' });
      return;
    }
    const coupon = await saveCoupon({
      id: body.id || crypto.randomUUID(),
      code: body.code.trim().toUpperCase(),
      discountType: body.discountType === 'fixed' ? 'fixed' : 'percentage',
      discountValue: Number(body.discountValue),
      minOrderAmount: Number(body.minOrderAmount || 0),
      active: body.active ?? true,
      expiresAt: body.expiresAt || null,
    });
    res.status(201).json({ coupon });
  });

  app.delete('/api/admin/coupons/:id', requireAdmin, async (req, res) => {
    await deleteCoupon(String(req.params.id));
    res.json({ ok: true });
  });

  // Reviews CRUD
  app.post('/api/admin/reviews', requireAdmin, async (req, res) => {
    const body = req.body as {
      productId?: string;
      reviewerName?: string;
      location?: string;
      rating?: number;
      comment?: string;
    };
    if (!body.productId || !body.reviewerName?.trim() || !body.comment?.trim()) {
      res.status(400).json({ error: 'Product, reviewer name, and comment are required.' });
      return;
    }
    const review = await saveReview({
      id: crypto.randomUUID(),
      productId: body.productId,
      reviewerName: body.reviewerName.trim(),
      location: body.location?.trim() || 'Dhaka',
      rating: Math.max(1, Math.min(5, Number(body.rating || 5))),
      comment: body.comment.trim(),
      verifiedPurchase: true,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ review });
  });

  app.delete('/api/admin/reviews/:id', requireAdmin, async (req, res) => {
    await deleteReview(String(req.params.id));
    res.json({ ok: true });
  });

  // Orders Management
  app.patch('/api/admin/orders/:id/status', requireAdmin, async (req, res) => {
    const { orderStatus } = req.body as { orderStatus?: Order['orderStatus'] };
    if (!orderStatus) {
      res.status(400).json({ error: 'orderStatus is required.' });
      return;
    }
    const updated = await updateOrderRecord(String(req.params.id), { orderStatus });
    if (!updated) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    res.json({ order: updated });
  });

  // ===========================================================================
  // STEADFAST COURIER API v1 INTEGRATION (Server-Side Only)
  // ===========================================================================
  app.post('/api/admin/steadfast/create-order', requireAdmin, async (req, res) => {
    const { orderId } = req.body as { orderId?: string };
    const db = await getStoreDb();
    const order = db.orders.find((o) => o.id === orderId);
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    if (order.steadfastConsignmentId) {
      res.json({ order, alreadyBooked: true });
      return;
    }

    const useSandbox =
      db.settings.steadfastSandboxMode || !db.settings.steadfastApiKey || !db.settings.steadfastSecretKey;

    if (useSandbox) {
      // Simulates exact Steadfast Packzy API v1 response when Sandbox Mode is active
      const simCid = String(Math.floor(10000000 + Math.random() * 89999999));
      const simTracking = `SF${Math.floor(1000000 + Math.random() * 8999999)}BD`;
      const updated = await updateOrderRecord(order.id, {
        orderStatus: 'confirmed',
        steadfastConsignmentId: simCid,
        steadfastTrackingCode: simTracking,
        steadfastStatus: 'in_review',
        steadfastSentAt: new Date().toISOString(),
      });
      res.json({
        order: updated,
        sandbox: true,
        message: 'Booked in Steadfast Sandbox mode. Add live API-Key & Secret-Key in Settings for production.',
      });
      return;
    }

    try {
      const itemSummary = order.items.map((i) => `${i.productName} (${i.size}/${i.color}) x${i.quantity}`).join(', ');
      const payload = {
        invoice: sanitizeSteadfastText(order.invoice, 100),
        recipient_name: sanitizeSteadfastText(order.customerName, 100),
        recipient_phone: sanitizeSteadfastText(order.customerPhone, 40),
        recipient_address: sanitizeSteadfastText(order.customerAddress, 490),
        cod_amount: order.totalAmount,
        note: sanitizeSteadfastText(order.note || itemSummary, 480),
      };

      const resp = await fetch(`${db.settings.steadfastBaseUrl}/create_order`, {
        method: 'POST',
        headers: {
          'Api-Key': db.settings.steadfastApiKey,
          'Secret-Key': db.settings.steadfastSecretKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = (await resp.json()) as {
        status?: number;
        message?: string;
        errors?: Record<string, string[]>;
        consignment?: {
          consignment_id?: number | string;
          tracking_code?: string;
          status?: string;
        };
      };

      if (!resp.ok || !data.consignment) {
        const errMsg =
          data.message ||
          (data.errors ? Object.values(data.errors).flat().join('; ') : '') ||
          `Steadfast returned HTTP ${resp.status}`;
        res.status(resp.status >= 400 ? resp.status : 400).json({ error: errMsg });
        return;
      }

      const updated = await updateOrderRecord(order.id, {
        orderStatus: 'confirmed',
        steadfastConsignmentId: String(data.consignment.consignment_id || ''),
        steadfastTrackingCode: String(data.consignment.tracking_code || ''),
        steadfastStatus: String(data.consignment.status || 'in_review'),
        steadfastSentAt: new Date().toISOString(),
      });

      res.json({ order: updated, sandbox: false });
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Unable to reach Steadfast API.',
      });
    }
  });

  app.get('/api/admin/steadfast/status/:orderId', requireAdmin, async (req, res) => {
    const db = await getStoreDb();
    const order = db.orders.find((o) => o.id === req.params.orderId);
    if (!order || !order.steadfastConsignmentId) {
      res.status(404).json({ error: 'No Steadfast consignment ID attached to this order.' });
      return;
    }

    if (
      db.settings.steadfastSandboxMode ||
      !db.settings.steadfastApiKey ||
      !db.settings.steadfastSecretKey
    ) {
      res.json({
        delivery_status: order.steadfastStatus || 'in_review',
        sandbox: true,
        order,
      });
      return;
    }

    try {
      const resp = await fetch(
        `${db.settings.steadfastBaseUrl}/status_by_cid/${encodeURIComponent(order.steadfastConsignmentId)}`,
        {
          headers: {
            'Api-Key': db.settings.steadfastApiKey,
            'Secret-Key': db.settings.steadfastSecretKey,
          },
        }
      );
      const data = (await resp.json()) as { delivery_status?: string; message?: string };
      if (!resp.ok) {
        res.status(resp.status).json({ error: data.message || 'Status lookup failed.' });
        return;
      }

      const nextStatus = data.delivery_status || order.steadfastStatus;
      let orderStatus = order.orderStatus;
      if (nextStatus === 'delivered') orderStatus = 'delivered';
      if (nextStatus === 'cancelled') orderStatus = 'cancelled';

      const updated = await updateOrderRecord(order.id, {
        steadfastStatus: nextStatus,
        orderStatus,
      });
      res.json({ delivery_status: nextStatus, order: updated });
    } catch (err) {
      res.status(502).json({ error: err instanceof Error ? err.message : 'Steadfast status check failed.' });
    }
  });

  app.get('/api/admin/steadfast/balance', requireAdmin, async (_req, res) => {
    const db = await getStoreDb();
    if (
      db.settings.steadfastSandboxMode ||
      !db.settings.steadfastApiKey ||
      !db.settings.steadfastSecretKey
    ) {
      res.json({ status: 200, current_balance: 14850, sandbox: true });
      return;
    }
    try {
      const resp = await fetch(`${db.settings.steadfastBaseUrl}/get_balance`, {
        headers: {
          'Api-Key': db.settings.steadfastApiKey,
          'Secret-Key': db.settings.steadfastSecretKey,
        },
      });
      const data = await resp.json();
      res.status(resp.status).json(data);
    } catch (err) {
      res.status(502).json({ error: err instanceof Error ? err.message : 'Balance check failed.' });
    }
  });

  app.get('/api/admin/steadfast/fraud-check/:phone', requireAdmin, async (req, res) => {
    const phone = String(req.params.phone || '').replace(/[^0-9]/g, '');
    const db = await getStoreDb();
    if (
      db.settings.steadfastSandboxMode ||
      !db.settings.steadfastApiKey ||
      !db.settings.steadfastSecretKey
    ) {
      res.json({
        sandbox: true,
        phone,
        total_parcels: 14,
        delivered: 13,
        cancelled: 1,
        success_rate: '93%',
      });
      return;
    }
    try {
      const resp = await fetch(
        `${db.settings.steadfastBaseUrl}/fraud_check/score/${encodeURIComponent(phone)}`,
        {
          headers: {
            'Api-Key': db.settings.steadfastApiKey,
            'Secret-Key': db.settings.steadfastSecretKey,
          },
        }
      );
      const data = await resp.json();
      res.status(resp.status).json(data);
    } catch (err) {
      res.status(502).json({ error: err instanceof Error ? err.message : 'Fraud score check failed.' });
    }
  });

  // ===========================================================================
  // VITE / PRODUCTION STATIC SERVING
  // ===========================================================================
  if (process.env.NODE_ENV !== 'production') {
    app.get('/@vite/client', (_req, res) => {
      res.type('application/javascript').send(`
const sheetsMap = new Map();
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    document.head.appendChild(style);
    sheetsMap.set(id, style);
  } else {
    style.textContent = content;
  }
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    document.head.removeChild(style);
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}
export function injectQuery(url) { return url; }
export class ErrorOverlay {}
`);
    });
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Inaya Fashion server running on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
