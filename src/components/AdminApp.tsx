import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Bell,
  Bluetooth,
  CheckCircle2,
  Edit3,
  ExternalLink,
  FolderTree,
  LogOut,
  Megaphone,
  Moon,
  Package,
  Plus,
  Printer,
  RefreshCw,
  Settings,
  ShieldAlert,
  ShoppingBag,
  Sun,
  Trash2,
  Truck,
} from 'lucide-react';
import type {
  AdminSettings,
  Category,
  Coupon,
  Order,
  OrderStatus,
  Product,
  Review,
} from '../types';
import { supabase } from '../lib/supabase';
import {
  requestOrderNotificationPermission,
  triggerNativeOrderAlert,
} from '../lib/notifications';
import {
  connectThermalPrinter,
  disconnectThermalPrinter,
  getConnectedPrinterDebugInfo,
  getConnectedPrinterName,
  printTestThermalPage,
} from '../lib/thermalPrinter';
import { BrandLogo } from './BrandLogo';
import { PWAInstallButton } from './PWAInstallButton';
import { AdminProductModal } from './AdminProductModal';
import { BarcodeLabelModal } from './BarcodeLabelModal';
import { apiUrl, resolveAssetUrl } from '../lib/paths';
import {
  adminAddReviewFallback,
  adminBookSteadfastSandboxFallback,
  adminCreateCouponFallback,
  adminDeleteCategoryFallback,
  adminDeleteCouponFallback,
  adminDeleteProductFallback,
  adminDeleteReviewFallback,
  adminReorderProductsFallback,
  adminSaveCategoryFallback,
  adminSaveProductFallback,
  adminSaveSettingsFallback,
  adminUpdateOrderStatusFallback,
  fetchAdminBootstrapSupabaseFallback,
  tryExpressApi,
} from '../lib/fallbackStorefront';

type AdminTab = 'orders' | 'products' | 'categories' | 'marketing' | 'system';

interface AdminAppProps {
  darkMode: boolean;
  onToggleDark: () => void;
  onExitToStore: () => void;
  onStorefrontDataChanged: () => void;
}

export const AdminApp: React.FC<AdminAppProps> = ({
  darkMode,
  onToggleDark,
  onExitToStore,
  onStorefrontDataChanged,
}) => {
  const [authToken, setAuthToken] = useState<string>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [staticHostNotice, setStaticHostNotice] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('orders');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  // Modals & Interactive States
  const [editingProduct, setEditingProduct] = useState<Product | null | undefined>(undefined);
  const [labelOrder, setLabelOrder] = useState<Order | null>(null);
  const [sendingSteadfastId, setSendingSteadfastId] = useState<string | null>(null);
  const [fraudResults, setFraudResults] = useState<Record<string, string>>({});
  const [unreadOrderAlerts, setUnreadOrderAlerts] = useState(0);

  // Category Form
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  // Coupon Form
  const [couponCode, setCouponCode] = useState('');
  const [couponType, setCouponType] = useState<'percentage' | 'fixed'>('percentage');
  const [couponVal, setCouponVal] = useState('10');
  const [couponMin, setCouponMin] = useState('1000');

  // Review Form
  const [revProdId, setRevProdId] = useState('');
  const [revName, setRevName] = useState('');
  const [revLocation, setRevLocation] = useState('Dhaka');
  const [revComment, setRevComment] = useState('');

  // Secret write-only inputs for settings
  const [steadfastApiKeyInput, setSteadfastApiKeyInput] = useState('');
  const [steadfastSecretKeyInput, setSteadfastSecretKeyInput] = useState('');
  const [metaCapiTokenInput, setMetaCapiTokenInput] = useState('');
  const [cloudinarySecretInput, setCloudinarySecretInput] = useState('');
  const [steadfastBalance, setSteadfastBalance] = useState<number | null>(null);
  const [printerName, setPrinterName] = useState<string | null>(() => getConnectedPrinterName());
  const [testingPrinter, setTestingPrinter] = useState(false);
  const [notifPerm, setNotifPerm] = useState<string>(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  const showToast = useCallback((type: 'ok' | 'err', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3800);
  }, []);

  useEffect(() => {
    localStorage.removeItem('inaya_admin_token');

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.access_token) {
        setAuthToken(data.session.access_token);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthToken(session?.access_token || '');
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const loadBootstrap = useCallback(async () => {
    if (!authToken) return;
    setLoading(true);
    try {
      const resp = await tryExpressApi('/api/admin/bootstrap', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (!resp) {
        const fallback = await fetchAdminBootstrapSupabaseFallback();
        setSettings(fallback.settings);
        setCategories(fallback.categories);
        setProducts(fallback.products);
        setReviews(fallback.reviews);
        setCoupons(fallback.coupons);
        setOrders(fallback.orders);
        setStaticHostNotice(true);
        if (fallback.products[0] && !revProdId) {
          setRevProdId(fallback.products[0].id);
        }
        return;
      }

      if (resp.status === 401) {
        await supabase.auth.signOut().catch(() => undefined);
        setAuthToken('');
        return;
      }

      const data = (await resp.json()) as {
        settings: AdminSettings;
        categories: Category[];
        products: Product[];
        reviews: Review[];
        coupons: Coupon[];
        orders: Order[];
      };
      setStaticHostNotice(false);
      setSettings(data.settings);
      setCategories(data.categories);
      setProducts(data.products);
      setReviews(data.reviews);
      setCoupons(data.coupons);
      setOrders(data.orders);
      if (data.products[0] && !revProdId) {
        setRevProdId(data.products[0].id);
      }
    } catch {
      showToast('err', 'Failed to load admin workspace.');
    } finally {
      setLoading(false);
    }
  }, [authToken, revProdId, showToast]);

  useEffect(() => {
    if (authToken) {
      void loadBootstrap();
    }
  }, [authToken, loadBootstrap]);

  // Real-time SSE Order Notification Stream (active when Express backend is connected)
  useEffect(() => {
    if (!authToken || staticHostNotice) return;
    const evtSource = new EventSource(apiUrl(`/api/admin/events?token=${encodeURIComponent(authToken)}`));
    evtSource.addEventListener('new_order', (e) => {
      try {
        const payload = JSON.parse((e as MessageEvent).data) as {
          invoice: string;
          customerName: string;
          totalAmount: number;
        };
        setUnreadOrderAlerts((c) => c + 1);
        void triggerNativeOrderAlert(payload);
        showToast('ok', `New order ${payload.invoice} from ${payload.customerName} (৳${payload.totalAmount})`);
        void loadBootstrap();
      } catch {
        // ignore parse issues
      }
    });
    return () => evtSource.close();
  }, [authToken, staticHostNotice, loadBootstrap, showToast]);

  const handleSupabaseLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setLoggingIn(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session?.access_token) {
        setAuthError(error?.message || 'Invalid email or password.');
        return;
      }
      setAuthToken(data.session.access_token);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    setAuthToken('');
    await supabase.auth.signOut().catch(() => undefined);
  };

  const handleSendToSteadfast = async (orderId: string) => {
    setSendingSteadfastId(orderId);
    try {
      const resp = await tryExpressApi('/api/admin/steadfast/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ orderId }),
      });

      if (!resp) {
        const target = orders.find((o) => o.id === orderId);
        if (!target) return;
        if (!settings?.steadfastSandboxMode) {
          showToast(
            'err',
            'Live Steadfast API requires the Express server backend. Enable Sandbox Mode to test booking on GitHub Pages.'
          );
          return;
        }
        const fallback = await adminBookSteadfastSandboxFallback(target);
        if (fallback.error || !fallback.order) {
          showToast('err', fallback.error || 'Sandbox booking failed.');
          return;
        }
        setOrders((prev) => prev.map((o) => (o.id === orderId ? fallback.order! : o)));
        showToast('ok', `Sandbox booked! CID: ${fallback.order.steadfastConsignmentId}`);
        return;
      }

      const data = (await resp.json()) as { order?: Order; message?: string; error?: string };
      if (!resp.ok || !data.order) {
        showToast('err', data.error || 'Steadfast booking failed.');
        return;
      }
      setOrders((prev) => prev.map((o) => (o.id === orderId ? data.order! : o)));
      showToast('ok', `Booked on Steadfast! CID: ${data.order.steadfastConsignmentId}`);
    } finally {
      setSendingSteadfastId(null);
    }
  };

  const handleSyncSteadfastStatus = async (orderId: string) => {
    try {
      const resp = await tryExpressApi(`/api/admin/steadfast/status/${orderId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!resp) {
        const target = orders.find((o) => o.id === orderId);
        showToast('ok', `Parcel status: ${target?.steadfastStatus || 'in_review'} (Sandbox)`);
        return;
      }
      const data = (await resp.json()) as { order?: Order; delivery_status?: string; error?: string };
      if (!resp.ok) {
        showToast('err', data.error || 'Status check failed');
        return;
      }
      if (data.order) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? data.order! : o)));
      }
      showToast('ok', `Steadfast status: ${data.delivery_status}`);
    } catch {
      showToast('err', 'Unable to sync status.');
    }
  };

  const handleFraudCheck = async (orderId: string, phone: string) => {
    try {
      const resp = await tryExpressApi(`/api/admin/steadfast/fraud-check/${encodeURIComponent(phone)}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!resp) {
        setFraudResults((prev) => ({
          ...prev,
          [orderId]: 'Sandbox Mode · Live courier score requires Express backend',
        }));
        return;
      }
      const data = (await resp.json()) as {
        total_parcels?: number;
        delivered?: number;
        cancelled?: number;
        success_rate?: string;
        error?: string;
      };
      if (!resp.ok) {
        showToast('err', data.error || 'Fraud lookup failed');
        return;
      }
      setFraudResults((prev) => ({
        ...prev,
        [orderId]: `${data.delivered ?? 0}/${data.total_parcels ?? 0} delivered (${data.success_rate || 'N/A'})`,
      }));
    } catch {
      showToast('err', 'Fraud check failed.');
    }
  };

  const handleOrderStatusChange = async (orderId: string, orderStatus: OrderStatus) => {
    const resp = await tryExpressApi(`/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ orderStatus }),
    });
    if (!resp) {
      const fallback = await adminUpdateOrderStatusFallback(orderId, orderStatus);
      if (fallback.ok) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, orderStatus } : o)));
        showToast('ok', `Order updated to ${orderStatus}`);
      } else {
        showToast('err', fallback.error || 'Could not update order status.');
      }
      return;
    }
    if (resp.ok) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, orderStatus } : o)));
      showToast('ok', `Order updated to ${orderStatus}`);
    }
  };

  const handleMoveProduct = async (index: number, dir: -1 | 1) => {
    const targetIdx = index + dir;
    if (targetIdx < 0 || targetIdx >= products.length) return;
    const next = [...products];
    const [moved] = next.splice(index, 1);
    next.splice(targetIdx, 0, moved);
    const reindexed = next.map((p, i) => ({ ...p, displayOrder: i + 1 }));
    setProducts(reindexed);
    const resp = await tryExpressApi('/api/admin/products/reorder', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ orderedIds: reindexed.map((p) => p.id) }),
    });
    if (!resp) {
      await adminReorderProductsFallback(reindexed);
    }
    onStorefrontDataChanged();
  };

  const handleQuickToggleProduct = async (product: Product, field: 'comingSoon' | 'showOnHomepage') => {
    const resp = await tryExpressApi(`/api/admin/products/${product.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ [field]: !product[field] }),
    });
    if (!resp) {
      const updated = { ...product, [field]: !product[field] };
      const fallback = await adminSaveProductFallback(updated);
      if (fallback.product) {
        setProducts((prev) => prev.map((p) => (p.id === product.id ? fallback.product! : p)));
        onStorefrontDataChanged();
        showToast('ok', `Updated ${product.name}`);
      } else {
        showToast('err', fallback.error || 'Failed to update product.');
      }
      return;
    }
    if (resp.ok) {
      const data = (await resp.json()) as { product: Product };
      setProducts((prev) => prev.map((p) => (p.id === product.id ? data.product : p)));
      onStorefrontDataChanged();
      showToast('ok', `Updated ${product.name}`);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    const resp = await tryExpressApi(`/api/admin/products/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!resp) {
      const fallback = await adminDeleteProductFallback(id);
      if (fallback.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        onStorefrontDataChanged();
        showToast('ok', 'Product removed.');
      } else {
        showToast('err', fallback.error || 'Failed to remove product.');
      }
      return;
    }
    if (resp.ok) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      onStorefrontDataChanged();
      showToast('ok', 'Product removed.');
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    const url = editingCatId ? `/api/admin/categories/${editingCatId}` : '/api/admin/categories';
    const method = editingCatId ? 'PUT' : 'POST';
    const resp = await tryExpressApi(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ name: catName, description: catDesc }),
    });
    if (!resp) {
      const fallback = await adminSaveCategoryFallback({
        id: editingCatId,
        name: catName,
        description: catDesc,
      });
      if (!fallback.ok) {
        showToast('err', fallback.error || 'Failed to save category.');
        return;
      }
      setCatName('');
      setCatDesc('');
      setEditingCatId(null);
      await loadBootstrap();
      onStorefrontDataChanged();
      showToast('ok', 'Category saved.');
      return;
    }
    if (resp.ok) {
      setCatName('');
      setCatDesc('');
      setEditingCatId(null);
      await loadBootstrap();
      onStorefrontDataChanged();
      showToast('ok', 'Category saved.');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const resp = await tryExpressApi(`/api/admin/categories/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!resp) {
      const fallback = await adminDeleteCategoryFallback(id);
      if (fallback.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== id));
        onStorefrontDataChanged();
      } else {
        showToast('err', fallback.error || 'Failed to delete category.');
      }
      return;
    }
    if (resp.ok) {
      setCategories((prev) => prev.filter((c) => c.id !== id));
      onStorefrontDataChanged();
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      code: couponCode,
      discountType: couponType,
      discountValue: Number(couponVal),
      minOrderAmount: Number(couponMin),
      active: true,
    };
    const resp = await tryExpressApi('/api/admin/coupons', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });
    if (!resp) {
      const fallback = await adminCreateCouponFallback(payload);
      if (!fallback.ok) {
        showToast('err', fallback.error || 'Could not create coupon.');
        return;
      }
      setCouponCode('');
      await loadBootstrap();
      showToast('ok', 'Coupon saved.');
      return;
    }
    if (resp.ok) {
      setCouponCode('');
      await loadBootstrap();
      showToast('ok', 'Coupon saved.');
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    const resp = await tryExpressApi(`/api/admin/coupons/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!resp) {
      const fallback = await adminDeleteCouponFallback(id);
      if (fallback.ok) {
        setCoupons((prev) => prev.filter((c) => c.id !== id));
      }
      return;
    }
    if (resp.ok) {
      setCoupons((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revProdId || !revName.trim() || !revComment.trim()) return;
    const payload = {
      productId: revProdId,
      reviewerName: revName,
      location: revLocation,
      rating: 5,
      comment: revComment,
    };
    const resp = await tryExpressApi('/api/admin/reviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });
    if (!resp) {
      const fallback = await adminAddReviewFallback(payload);
      if (!fallback.ok) {
        showToast('err', fallback.error || 'Could not publish review.');
        return;
      }
      setRevName('');
      setRevComment('');
      await loadBootstrap();
      onStorefrontDataChanged();
      showToast('ok', 'Review published.');
      return;
    }
    if (resp.ok) {
      setRevName('');
      setRevComment('');
      await loadBootstrap();
      onStorefrontDataChanged();
      showToast('ok', 'Review published.');
    }
  };

  const handleDeleteReview = async (id: string) => {
    const resp = await tryExpressApi(`/api/admin/reviews/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!resp) {
      const fallback = await adminDeleteReviewFallback(id);
      if (fallback.ok) {
        setReviews((prev) => prev.filter((r) => r.id !== id));
        onStorefrontDataChanged();
      }
      return;
    }
    if (resp.ok) {
      setReviews((prev) => prev.filter((r) => r.id !== id));
      onStorefrontDataChanged();
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    const payload: Record<string, unknown> = {
      ...settings,
    };
    if (steadfastApiKeyInput.trim()) payload.steadfastApiKey = steadfastApiKeyInput.trim();
    if (steadfastSecretKeyInput.trim()) payload.steadfastSecretKey = steadfastSecretKeyInput.trim();
    if (metaCapiTokenInput.trim()) payload.metaCapiToken = metaCapiTokenInput.trim();
    if (cloudinarySecretInput.trim()) payload.cloudinaryApiSecret = cloudinarySecretInput.trim();

    const resp = await tryExpressApi('/api/admin/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });
    if (!resp) {
      const fallback = await adminSaveSettingsFallback(settings);
      if (!fallback.ok) {
        showToast('err', fallback.error || 'Failed to save settings to Supabase.');
        return;
      }
      onStorefrontDataChanged();
      showToast('ok', 'Public store settings saved to Supabase.');
      return;
    }
    if (resp.ok) {
      const data = (await resp.json()) as { settings: AdminSettings };
      setSettings(data.settings);
      setSteadfastApiKeyInput('');
      setSteadfastSecretKeyInput('');
      setMetaCapiTokenInput('');
      setCloudinarySecretInput('');
      onStorefrontDataChanged();
      showToast('ok', 'Store & integration settings saved.');
    } else {
      showToast('err', 'Failed to save settings.');
    }
  };

  const handleCheckBalance = async () => {
    const resp = await tryExpressApi('/api/admin/steadfast/balance', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!resp) {
      showToast('ok', 'Sandbox Mode active — deploy Node server for live Steadfast wallet balance.');
      return;
    }
    const data = (await resp.json()) as { current_balance?: number; error?: string };
    if (resp.ok && data.current_balance !== undefined) {
      setSteadfastBalance(data.current_balance);
      showToast('ok', `Steadfast balance: ৳${data.current_balance.toLocaleString()}`);
    } else {
      showToast('err', data.error || 'Unable to fetch Steadfast balance.');
    }
  };

  const handleConnectPrinter = async () => {
    try {
      const name = await connectThermalPrinter();
      setPrinterName(name);
      showToast('ok', `Connected to ${name}`);
    } catch (err) {
      showToast('err', err instanceof Error ? err.message : 'Bluetooth printer pairing failed.');
    }
  };

  const handlePrintTestSticker = async () => {
    setTestingPrinter(true);
    try {
      await printTestThermalPage();
      showToast('ok', 'Test sticker sent to thermal printer!');
    } catch (err) {
      showToast('err', err instanceof Error ? err.message : 'Test print failed');
    } finally {
      setTestingPrinter(false);
    }
  };

  const handleEnableNotifications = async () => {
    const perm = await requestOrderNotificationPermission();
    setNotifPerm(perm);
    if (perm === 'granted') {
      void triggerNativeOrderAlert({
        invoice: 'INY-TEST-ALERT',
        customerName: 'Notification Check',
        totalAmount: 1350,
      });
    }
  };

  // ============================================================================
  // LOGIN SCREEN (Supabase Auth Only)
  // ============================================================================
  if (!authToken) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#0F0F0E] flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#161513] border border-[#E6E1D8] dark:border-[#2A2824] p-7 shadow-xl space-y-6">
          <div className="flex flex-col items-center text-center space-y-2">
            <BrandLogo subtitle="Merchant App" />
            <p className="text-xs text-[#6E6A63] dark:text-[#A39E93] pt-1">
              Sign in with your Supabase Admin account to manage orders, Steadfast courier dispatch, thermal stickers & inventory.
            </p>
          </div>

          {authError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs">
              {authError}
            </div>
          )}

          <form onSubmit={handleSupabaseLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1">Admin Email</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@inayafashion.com"
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#D8D2C7] dark:border-[#35322C] bg-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Password</label>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#D8D2C7] dark:border-[#35322C] bg-transparent text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loggingIn}
              className="w-full min-h-[46px] rounded-xl bg-[#171614] dark:bg-[#D9B675] text-white dark:text-[#121110] text-sm font-semibold"
            >
              {loggingIn ? 'Authenticating...' : 'Sign In with Supabase'}
            </button>
          </form>

          <div className="pt-2 flex items-center justify-between text-xs text-[#6E6A63] dark:text-[#A39E93]">
            <button onClick={onExitToStore} className="hover:underline">
              ← Return to Storefront
            </button>
            <PWAInstallButton />
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MOBILE-APP NATIVE ADMIN SHELL
  // ============================================================================
  const tabs: Array<{ id: AdminTab; label: string; icon: React.ReactNode; badge?: number }> = [
    {
      id: 'orders',
      label: 'Orders',
      icon: <ShoppingBag className="w-5 h-5" />,
      badge: unreadOrderAlerts > 0 ? unreadOrderAlerts : orders.filter((o) => o.orderStatus === 'pending').length,
    },
    { id: 'products', label: 'Products', icon: <Package className="w-5 h-5" /> },
    { id: 'categories', label: 'Categories', icon: <FolderTree className="w-5 h-5" /> },
    { id: 'marketing', label: 'Marketing', icon: <Megaphone className="w-5 h-5" /> },
    { id: 'system', label: 'Courier', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#F5F3EE] dark:bg-[#0E0D0C] text-[#171614] dark:text-[#F4F2EE] flex flex-col">
      {/* Native Mobile Top App Bar (56px) */}
      <header className="sticky top-0 z-30 h-14 px-4 bg-[#FAF9F6]/90 dark:bg-[#151412]/90 backdrop-blur-md border-b border-[#E6E1D8] dark:border-[#262420] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <BrandLogo compact subtitle="Admin App" />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <PWAInstallButton />
          <button
            onClick={handleEnableNotifications}
            title="Enable Order Push Alerts"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/5 relative"
          >
            <Bell className={`w-4 h-4 ${notifPerm === 'granted' ? 'text-[#9E7B42]' : ''}`} />
            {unreadOrderAlerts > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-600" />
            )}
          </button>
          <button
            onClick={onToggleDark}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/5"
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={onExitToStore}
            title="View Storefront"
            className="min-h-[40px] px-2.5 hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-[#D8D2C7] dark:border-[#322F29] text-xs font-medium"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Store</span>
          </button>
          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-[#6E6A63] hover:text-red-600"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-lg text-xs font-medium bg-[#171614] text-white dark:bg-[#F4F2EE] dark:text-[#171614] flex items-center gap-2 max-w-[90vw]">
          <CheckCircle2 className="w-4 h-4 text-[#D9B675] dark:text-[#9E7B42] shrink-0" />
          <span className="truncate">{toast.text}</span>
        </div>
      )}

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Desktop Side Navigation Rail */}
        <aside className="hidden lg:flex flex-col w-60 shrink-0 p-4 border-r border-[#E6E1D8] dark:border-[#262420] space-y-1.5">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'orders') setUnreadOrderAlerts(0);
                }}
                className={`min-h-[46px] px-3.5 rounded-xl flex items-center justify-between text-sm font-medium transition ${
                  active
                    ? 'bg-[#171614] text-white dark:bg-[#D9B675] dark:text-[#121110]'
                    : 'text-[#6E6A63] dark:text-[#A39E93] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <span className="flex items-center gap-3">
                  {tab.icon}
                  <span>{tab.label}</span>
                </span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="font-mono-tabular text-xs font-semibold px-1.5">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </aside>

        {/* Main Scrollable App Body */}
        <main className="flex-1 p-4 sm:p-6 pb-24 lg:pb-10 overflow-x-hidden">
          {loading && !settings ? (
            <div className="py-20 text-center text-sm text-[#6E6A63]">Loading Inaya Admin...</div>
          ) : (
            <>
              {/* ============================================================
                  TAB 1: ORDERS & STEADFAST COURIER DISPATCH
              ============================================================ */}
              {activeTab === 'orders' && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h1 className="font-display text-2xl sm:text-3xl font-semibold">Incoming Orders</h1>
                      <p className="text-xs text-[#6E6A63] dark:text-[#A39E93]">
                        One-click Steadfast booking & instant 58mm thermal sticker printing.
                      </p>
                    </div>
                    <button
                      onClick={() => loadBootstrap()}
                      className="min-h-[40px] px-3.5 rounded-xl border border-[#D8D2C7] dark:border-[#322F29] bg-white dark:bg-[#171614] text-xs font-medium inline-flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {/* Quick KPI Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-4 rounded-2xl bg-white dark:bg-[#171614] border border-[#E6E1D8] dark:border-[#262420]">
                      <div className="text-xs text-[#6E6A63] dark:text-[#A39E93]">Total Orders</div>
                      <div className="font-mono-tabular text-2xl font-bold mt-1">{orders.length}</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white dark:bg-[#171614] border border-[#E6E1D8] dark:border-[#262420]">
                      <div className="text-xs text-[#6E6A63] dark:text-[#A39E93]">Pending Dispatch</div>
                      <div className="font-mono-tabular text-2xl font-bold mt-1 text-[#9E7B42] dark:text-[#D9B675]">
                        {orders.filter((o) => !o.steadfastConsignmentId).length}
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white dark:bg-[#171614] border border-[#E6E1D8] dark:border-[#262420]">
                      <div className="text-xs text-[#6E6A63] dark:text-[#A39E93]">Steadfast Booked</div>
                      <div className="font-mono-tabular text-2xl font-bold mt-1">
                        {orders.filter((o) => Boolean(o.steadfastConsignmentId)).length}
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white dark:bg-[#171614] border border-[#E6E1D8] dark:border-[#262420]">
                      <div className="text-xs text-[#6E6A63] dark:text-[#A39E93]">Order Value</div>
                      <div className="font-mono-tabular text-2xl font-bold mt-1">
                        ৳{orders.reduce((s, o) => s + o.totalAmount, 0).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#171614] border border-[#E6E1D8] dark:border-[#262420] space-y-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-mono-tabular font-bold text-sm">{order.invoice}</span>
                              <span aria-hidden="true" className="text-[#8A857C]">·</span>
                              <span className="text-[#6E6A63] dark:text-[#A39E93]">
                                {new Date(order.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-sm font-semibold mt-1">
                              {order.customerName} ·{' '}
                              <span className="font-mono-tabular text-[#9E7B42] dark:text-[#D9B675]">
                                {order.customerPhone}
                              </span>
                            </div>
                            <div className="text-xs text-[#6E6A63] dark:text-[#A39E93] mt-0.5">
                              {order.customerAddress} ({order.deliveryZone === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'})
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <select
                              value={order.orderStatus}
                              onChange={(e) =>
                                handleOrderStatusChange(order.id, e.target.value as OrderStatus)
                              }
                              className="min-h-[38px] px-3 rounded-xl border border-[#D8D2C7] dark:border-[#322F29] bg-[#FAF9F6] dark:bg-[#1E1C18] text-xs font-medium capitalize"
                            >
                              <option value="pending">Pending</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                            <div className="text-right font-mono-tabular font-bold text-base">
                              ৳{order.totalAmount.toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div className="text-xs space-y-1 bg-[#FAF9F6] dark:bg-[#121110] p-3 rounded-xl">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between">
                              <span>
                                {item.productName} ({item.size} / {item.color}) × {item.quantity}
                              </span>
                              <span className="font-mono-tabular">৳{(item.price * item.quantity).toLocaleString()}</span>
                            </div>
                          ))}
                          {order.note && (
                            <div className="pt-1 text-[#6E6A63] dark:text-[#A39E93]">
                              Note: {order.note}
                            </div>
                          )}
                        </div>

                        {fraudResults[order.id] && (
                          <div className="text-xs text-[#6E6A63] dark:text-[#A39E93] flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5 text-[#9E7B42]" />
                            <span>Steadfast Delivery Score: <strong>{fraudResults[order.id]}</strong></span>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                          {order.steadfastConsignmentId ? (
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="font-mono-tabular font-semibold text-emerald-700 dark:text-emerald-400">
                                Steadfast CID: {order.steadfastConsignmentId}
                              </span>
                              {order.steadfastStatus && (
                                <span className="text-[#6E6A63] dark:text-[#A39E93] capitalize">
                                  · {order.steadfastStatus.replace(/_/g, ' ')}
                                </span>
                              )}
                              <button
                                onClick={() => handleSyncSteadfastStatus(order.id)}
                                className="px-2.5 py-1.5 rounded-lg border border-[#D8D2C7] dark:border-[#322F29] hover:bg-black/5 dark:hover:bg-white/5 inline-flex items-center gap-1"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>Sync</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleSendToSteadfast(order.id)}
                              disabled={sendingSteadfastId === order.id}
                              className="min-h-[42px] px-4 rounded-xl bg-[#171614] dark:bg-[#D9B675] text-white dark:text-[#121110] text-xs font-semibold inline-flex items-center gap-2"
                            >
                              <Truck className="w-4 h-4" />
                              <span>
                                {sendingSteadfastId === order.id ? 'Booking...' : 'Send to Steadfast (1-Click)'}
                              </span>
                            </button>
                          )}

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleFraudCheck(order.id, order.customerPhone)}
                              className="min-h-[40px] px-3 rounded-xl border border-[#D8D2C7] dark:border-[#322F29] text-xs font-medium inline-flex items-center gap-1.5"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>Risk Check</span>
                            </button>
                            <button
                              onClick={() => setLabelOrder(order)}
                              className="min-h-[40px] px-3.5 rounded-xl border border-[#171614] dark:border-[#D9B675] text-xs font-semibold inline-flex items-center gap-1.5"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Print Sticker</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ============================================================
                  TAB 2: PRODUCTS, ORDERING, STOCKOUT MATRIX & REVIEWS
              ============================================================ */}
              {activeTab === 'products' && (
                <div className="space-y-8">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h1 className="font-display text-2xl sm:text-3xl font-semibold">Products & Inventory</h1>
                      <p className="text-xs text-[#6E6A63] dark:text-[#A39E93]">
                        Recommended upload size: 1200 × 1600 px (3:4 portrait). Reorder products to control homepage sequence.
                      </p>
                    </div>
                    <button
                      onClick={() => setEditingProduct(null)}
                      className="min-h-[44px] px-4 rounded-xl bg-[#171614] dark:bg-[#D9B675] text-white dark:text-[#121110] text-xs font-semibold inline-flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Product</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {products.map((prod, idx) => (
                      <div
                        key={prod.id}
                        className="p-4 rounded-2xl bg-white dark:bg-[#171614] border border-[#E6E1D8] dark:border-[#262420] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <img
                            src={resolveAssetUrl(prod.images[0] || '')}
                            alt={prod.name}
                            className="w-16 h-20 object-cover rounded-xl bg-[#EFECE5] shrink-0"
                          />
                          <div className="min-w-0 space-y-1">
                            <div className="text-xs text-[#6E6A63] dark:text-[#A39E93] font-mono-tabular">
                              #{idx + 1} · /{prod.slug}
                            </div>
                            <h3 className="text-sm font-semibold truncate">{prod.name}</h3>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                              <span className="font-mono-tabular font-semibold">৳{prod.price.toLocaleString()}</span>
                              <span className="text-[#6E6A63] dark:text-[#A39E93]">
                                Sizes: {prod.sizes.filter((s) => s.inStock).map((s) => s.size).join(', ') || 'All Out'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleMoveProduct(idx, -1)}
                            disabled={idx === 0}
                            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl border border-[#D8D2C7] dark:border-[#322F29] disabled:opacity-30"
                            title="Move Earlier"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleMoveProduct(idx, 1)}
                            disabled={idx === products.length - 1}
                            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl border border-[#D8D2C7] dark:border-[#322F29] disabled:opacity-30"
                            title="Move Later"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleQuickToggleProduct(prod, 'showOnHomepage')}
                            className={`min-h-[38px] px-3 rounded-xl text-xs font-medium border ${
                              prod.showOnHomepage
                                ? 'border-emerald-600/40 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                                : 'border-[#D8D2C7] dark:border-[#322F29] text-[#6E6A63]'
                            }`}
                          >
                            {prod.showOnHomepage ? 'On Home' : 'Hidden Home'}
                          </button>
                          <button
                            onClick={() => handleQuickToggleProduct(prod, 'comingSoon')}
                            className={`min-h-[38px] px-3 rounded-xl text-xs font-medium border ${
                              prod.comingSoon
                                ? 'border-[#9E7B42] bg-[#9E7B42]/10 text-[#9E7B42] dark:text-[#D9B675]'
                                : 'border-[#D8D2C7] dark:border-[#322F29] text-[#6E6A63]'
                            }`}
                          >
                            {prod.comingSoon ? 'Coming Soon' : 'Live'}
                          </button>
                          <button
                            onClick={() => setEditingProduct(prod)}
                            className="min-h-[38px] px-3 rounded-xl border border-[#D8D2C7] dark:border-[#322F29] text-xs font-medium inline-flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(prod.id)}
                            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl border border-red-200 dark:border-red-900/40 text-red-600"
                            title="Delete product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Customer Reviews Management */}
                  <div className="pt-6 border-t border-[#E6E1D8] dark:border-[#262420] space-y-4">
                    <h2 className="font-display text-xl font-semibold">Manage Product Reviews</h2>
                    <form
                      onSubmit={handleAddReview}
                      className="p-4 rounded-2xl bg-white dark:bg-[#171614] border border-[#E6E1D8] dark:border-[#262420] grid grid-cols-1 sm:grid-cols-4 gap-3"
                    >
                      <select
                        value={revProdId}
                        onChange={(e) => setRevProdId(e.target.value)}
                        className="min-h-[40px] px-3 rounded-xl border border-[#D8D2C7] dark:border-[#322F29] bg-transparent text-xs"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <input
                        required
                        type="text"
                        value={revName}
                        onChange={(e) => setRevName(e.target.value)}
                        placeholder="Reviewer Name"
                        className="min-h-[40px] px-3 rounded-xl border border-[#D8D2C7] dark:border-[#322F29] bg-transparent text-xs"
                      />
                      <input
                        type="text"
                        value={revLocation}
                        onChange={(e) => setRevLocation(e.target.value)}
                        placeholder="Location (e.g. Dhaka)"
                        className="min-h-[40px] px-3 rounded-xl border border-[#D8D2C7] dark:border-[#322F29] bg-transparent text-xs"
                      />
                      <div className="flex gap-2">
                        <input
                          required
                          type="text"
                          value={revComment}
                          onChange={(e) => setRevComment(e.target.value)}
                          placeholder="Banglish / Bangla review text"
                          className="flex-1 min-h-[40px] px-3 rounded-xl border border-[#D8D2C7] dark:border-[#322F29] bg-transparent text-xs"
                        />
                        <button
                          type="submit"
                          className="px-4 min-h-[40px] rounded-xl bg-[#171614] dark:bg-[#D9B675] text-white dark:text-[#121110] text-xs font-semibold"
                        >
                          Add
                        </button>
                      </div>
                    </form>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {reviews.map((rev) => (
                        <div
                          key={rev.id}
                          className="p-3.5 rounded-xl bg-white dark:bg-[#171614] border border-[#E6E1D8] dark:border-[#262420] flex items-start justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="font-semibold">
                              {rev.reviewerName} · <span className="text-[#6E6A63] font-normal">{rev.location}</span>
                            </div>
                            <p className="text-[#4A4741] dark:text-[#C5C0B6] mt-1">{rev.comment}</p>
                          </div>
                          <button
                            onClick={() => handleDeleteReview(rev.id)}
                            className="p-1.5 text-[#8A857C] hover:text-red-600 shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================
                  TAB 3: CATEGORIES
              ============================================================ */}
              {activeTab === 'categories' && (
                <div className="space-y-6 max-w-3xl">
                  <div>
                    <h1 className="font-display text-2xl sm:text-3xl font-semibold">Categories</h1>
                    <p className="text-xs text-[#6E6A63] dark:text-[#A39E93]">
                      Each category automatically gets a Google-indexable permalink at /category/slug.
                    </p>
                  </div>

                  <form
                    onSubmit={handleSaveCategory}
                    className="p-5 rounded-2xl bg-white dark:bg-[#171614] border border-[#E6E1D8] dark:border-[#262420] space-y-3"
                  >
                    <div className="text-xs font-semibold">
                      {editingCatId ? 'Edit Category' : 'Create Category'}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        required
                        type="text"
                        value={catName}
                        onChange={(e) => setCatName(e.target.value)}
                        placeholder="Category Name"
                        className="min-h-[42px] px-3 rounded-xl border border-[#D8D2C7] dark:border-[#322F29] bg-transparent text-sm"
                      />
                      <input
                        type="text"
                        value={catDesc}
                        onChange={(e) => setCatDesc(e.target.value)}
                        placeholder="Short SEO description"
                        className="min-h-[42px] px-3 rounded-xl border border-[#D8D2C7] dark:border-[#322F29] bg-transparent text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="px-5 min-h-[40px] rounded-xl bg-[#171614] dark:bg-[#D9B675] text-white dark:text-[#121110] text-xs font-semibold"
                      >
                        {editingCatId ? 'Update Category' : 'Add Category'}
                      </button>
                      {editingCatId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCatId(null);
                            setCatName('');
                            setCatDesc('');
                          }}
                          className="px-4 min-h-[40px] rounded-xl border border-[#D8D2C7] dark:border-[#322F29] text-xs"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>

                  <div className="space-y-2.5">
                    {categories.map((c) => (
                      <div
                        key={c.id}
                        className="p-4 rounded-2xl bg-white dark:bg-[#171614] border border-[#E6E1D8] dark:border-[#262420] flex items-center justify-between gap-4"
                      >
                        <div>
                          <div className="font-semibold text-sm">{c.name}</div>
                          <div className="text-xs text-[#6E6A63] dark:text-[#A39E93] font-mono-tabular">
                            /category/{c.slug}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingCatId(c.id);
                              setCatName(c.name);
                              setCatDesc(c.description);
                            }}
                            className="min-h-[38px] px-3 rounded-xl border border-[#D8D2C7] dark:border-[#322F29] text-xs"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(c.id)}
                            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl border border-red-200 dark:border-red-900/40 text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ============================================================
                  TAB 4: MARKETING (TOPBAR, DELIVERY, COUPONS, SOCIAL, META)
              ============================================================ */}
              {activeTab === 'marketing' && settings && (
                <div className="space-y-8 max-w-4xl">
                  <form onSubmit={handleSaveSettings} className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h1 className="font-display text-2xl sm:text-3xl font-semibold">
                          Marketing, Delivery & Tracking
                        </h1>
                        <p className="text-xs text-[#6E6A63] dark:text-[#A39E93]">
                          Configure topbar marquee, shipping charges, social links & Meta Pixel + CAPI.
                        </p>
                      </div>
                      <button
                        type="submit"
                        className="min-h-[42px] px-5 rounded-xl bg-[#171614] dark:bg-[#D9B675] text-white dark:text-[#121110] text-xs font-semibold"
                      >
                        Save All
                      </button>
                    </div>

                    {/* Topbar Marquee */}
                    <div className="p-5 rounded-2xl bg-white dark:bg-[#171614] border border-[#E6E1D8] dark:border-[#262420] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">Topbar Marquee Banner (Right to Left)</span>
                        <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.topbarEnabled}
                            onChange={(e) =>
                              setSettings({ ...settings, topbarEnabled: e.target.checked })
                            }
                            className="w-4 h-4 accent-[#9E7B42]"
                          />
                          <span>{settings.topbarEnabled ? 'Enabled' : 'Disabled'}</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        value={settings.topbarText}
                        onChange={(e) => setSettings({ ...settings, topbarText: e.target.value })}
                        className="w-full min-h-[42px] px-3.5 rounded-xl border border-[#D8D2C7] dark:border-[#322F29] bg-transparent text-xs"
                      />
                    </div>

                    {/* Delivery Charge Settings */}
                    <div className="p-5 rounded-2xl bg-white dark:bg-[#171614] border border-[#E6E1D8] dark:border-[#262420] space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">Delivery Charge Rules</span>
                        <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.deliveryEnabled}
                            onChange={(e) =>
                              setSettings({ ...settings, deliveryEnabled: e.target.checked })
                            }
                            className="w-4 h-4 accent-[#9E7B42]"
                          />
                          <span>{settings.deliveryEnabled ? 'Charge Active' : 'Free Delivery Everywhere'}</span>
                        </label>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-[#6E6A63] mb-1">Inside Dhaka (৳)</label>
                          <input
                            type="number"
                            value={settings.deliveryInsideDhaka}
                            onChange={(e) =>
                              setSettings({ ...settings, deliveryInsideDhaka: Number(e.target.value) })
                            }
                            className="w-full min-h-[42px] px-3 rounded-xl border border-[#D8D2C7] dark:border-[#322F29] bg-transparent text-sm font-mono-tabular"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#6E6A63] mb-1">Outside Dhaka (৳)</label>
                          <input
                            type="number"
                            value={settings.deliveryOutsideDhaka}
                            onChange={(e) =>
                              setSettings({ ...settings, deliveryOutsideDhaka: Number(e.target.value) })
                            }
                            className="w-full min-h-[42px] px-3 rounded-xl border border-[#D8D2C7] dark:border-[#322F29] bg-transparent text-sm font-mono-tabular"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#6E6A63] mb-1">
                            Free Delivery Above (৳, 0 = off)
                          </label>
                          <input
                            type="number"
                            value={settings.freeDeliveryThreshold}
                            onChange={(e) =>
                              setSettings({ ...settings, freeDeliveryThreshold: Number(e.target.value) })
                            }
                            className="w-full min-h-[42px] px-3 rounded-xl border border-[#D8D2C7] dark:border-[#322F29] bg-transparent text-sm font-mono-tabular"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Social Media Links */}
                    <div className="p-5 rounded-2xl bg-white dark:bg-[#171614] border border-[#E6E1D8] dark:border-[#262420] space-y-3">
                      <span className="text-sm font-semibold block">Social Media Account Links</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {(
                          [
                            ['facebook', 'Facebook Page URL'],
                            ['instagram', 'Instagram URL'],
                            ['tiktok', 'TikTok URL'],
                            ['whatsapp', 'WhatsApp Link (wa.me/...)'],
                            ['youtube', 'YouTube Channel URL'],
                          ] as const
                        ).map(([key, label]) => (
                          <div key={key}>
                            <label className="block text-[#6E6A63] mb-1">{label}</label>
                            <input
                              type="text"
                              value={settings.socialLinks[key] || ''}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  socialLinks: { ...settings.socialLinks, [key]: e.target.value },
                                })
                              }
                              className="w-full min-h-[40px] px-3 rounded-xl border border-[#D8D2C7] dark:border-[#322F29] bg-transparent"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Meta Pixel & Conversion API */}
                    <div className="p-5 rounded-2xl bg-white dark:bg-[#171614] border border-[#E6E1D8] dark:border-[#262420] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">Meta Pixel & Server Conversion API (CAPI)</span>
                        <span className="text-xs text-[#6E6A63]">
                          CAPI Token: {settings.hasMetaCapiToken ? 'Configured (Secured on Server)' : 'Not set'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <label className="block text-[#6E6A63] mb-1">Meta Pixel ID</label>
                          <input
                            type="text"
                            value={settings.metaPixelId}
                            onChange={(e) => setSettings({ ...settings, metaPixelId: e.target.value })}
                            placeholder="e.g. 123456789012345"
                            className="w-full min-h-[40px] px-3 rounded-xl border border-[#D8D2C7] dark:border-[#322F29] bg-transparent font-mono-tabular"
                          />
                        </div>
                        <div>
                          <label className="block text-[#6E6A63] mb-1">
                            Server CAPI Access Token (Write-only)
                          </label>
                          <input
                            type="password"
                            value={metaCapiTokenInput}
                            onChange={(e) => setMetaCapiTokenInput(e.target.value)}
                            placeholder={settings.hasMetaCapiToken ? '•••••••• (leave blank to keep)' : 'EAAB...'}
                            className="w-full min-h-[40px] px-3 rounded-xl border border-[#D8D2C7] dark:border-[#322F29] bg-transparent font-mono-tabular"
                          />
                        </div>
                        <div>
                          <label className="block text-[#6E6A63] mb-1">Test Event Code (Optional)</label>
                          <input
                            type="text"
                            value={settings.metaTestEventCode}
                            onChange={(e) =>
                              setSettings({ ...settings, metaTestEventCode: e.target.value })
                            }
                            placeholder="TEST12345"
                            className="w-full min-h-[40px] px-3 rounded-xl border border-[#D8D2C7] dark:border-[#322F29] bg-transparent font-mono-tabular"
                          />
                        </div>
                      </div>
                    </div>
                  </form>

                  {/* Coupons Manager */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-[#171614] border border-[#E6E1D8] dark:border-[#262420] space-y-4">
                    <span className="text-sm font-semibold block">Discount Coupons</span>
                    <form onSubmit={handleCreateCoupon} className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      <input
                        required
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="Code (e.g. EID15)"
                        className="min-h-[40px] px-3 rounded-xl border border-[#D8D2C7] dark:border-[#322F29] bg-transparent text-xs uppercase font-mono-tabular"
                      />
                      <select
                        value={couponType}
                        onChange={(e) => setCouponType(e.target.value as 'percentage' | 'fixed')}
                        className="min-h-[40px] px-3 rounded-xl border border-[#D8D2C7] dark:border-[#322F29] bg-transparent text-xs"
                      >
                        <option value="percentage">% Percent</option>
                        <option value="fixed">৳ Fixed BDT</option>
                      </select>
                      <input
                        required
                        type="number"
                        value={couponVal}
                        onChange={(e) => setCouponVal(e.target.value)}
                        placeholder="Value"
                        className="min-h-[40px] px-3 rounded-xl border border-[#D8D2C7] dark:border-[#322F29] bg-transparent text-xs font-mono-tabular"
                      />
                      <input
                        type="number"
                        value={couponMin}
                        onChange={(e) => setCouponMin(e.target.value)}
                        placeholder="Min Spend ৳"
                        className="min-h-[40px] px-3 rounded-xl border border-[#D8D2C7] dark:border-[#322F29] bg-transparent text-xs font-mono-tabular"
                      />
                      <button
                        type="submit"
                        className="col-span-2 sm:col-span-1 min-h-[40px] rounded-xl bg-[#171614] dark:bg-[#D9B675] text-white dark:text-[#121110] text-xs font-semibold"
                      >
                        Create
                      </button>
                    </form>

                    <div className="divide-y divide-[#E6E1D8] dark:divide-[#262420]">
                      {coupons.map((c) => (
                        <div key={c.id} className="py-3 flex items-center justify-between text-xs">
                          <div>
                            <strong className="font-mono-tabular text-sm">{c.code}</strong>
                            <span className="text-[#6E6A63] dark:text-[#A39E93] ml-2">
                              {c.discountType === 'percentage' ? `${c.discountValue}% off` : `৳${c.discountValue} off`} · Min ৳{c.minOrderAmount}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteCoupon(c.id)}
                            className="p-1.5 text-[#8A857C] hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================
                  TAB 5: STEADFAST COURIER, THERMAL PRINTER & APK SETUP
              ============================================================ */}
              {activeTab === 'system' && settings && (
                <div className="space-y-6 max-w-4xl">
                  <div>
                    <h1 className="font-display text-2xl sm:text-3xl font-semibold">
                      Courier, Thermal Printer & App Setup
                    </h1>
                    <p className="text-xs text-[#6E6A63] dark:text-[#A39E93]">
                      All API secrets are stored server-side only and never sent to the storefront browser.
                    </p>
                  </div>

                  {/* Bluetooth Mini Thermal Printer Card */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-[#171614] border border-[#E6E1D8] dark:border-[#262420] space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-semibold flex items-center gap-2">
                          <Bluetooth className="w-4 h-4 text-[#9E7B42]" />
                          <span>Bluetooth Mini Thermal Printer (58mm / 80mm ESC/POS)</span>
                        </h2>
                        <p className="text-xs text-[#6E6A63] dark:text-[#A39E93] mt-0.5">
                          {printerName
                            ? `Connected to ${printerName}${
                                getConnectedPrinterDebugInfo() ? ` (${getConnectedPrinterDebugInfo()})` : ''
                              } — Ready for instant 58mm sticker printing.`
                            : 'Pair any portable BLE thermal printer to print Steadfast stickers directly from mobile or laptop.'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {printerName ? (
                          <>
                            <button
                              type="button"
                              disabled={testingPrinter}
                              onClick={handlePrintTestSticker}
                              className="min-h-[40px] px-3.5 rounded-xl bg-[#171614] dark:bg-[#D9B675] text-white dark:text-[#121110] text-xs font-semibold disabled:opacity-50"
                            >
                              {testingPrinter ? 'Sending...' : 'Print Test Sticker'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                disconnectThermalPrinter();
                                setPrinterName(null);
                              }}
                              className="min-h-[40px] px-3.5 rounded-xl border border-[#D8D2C7] dark:border-[#322F29] text-xs"
                            >
                              Disconnect
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={handleConnectPrinter}
                            className="min-h-[42px] px-4 rounded-xl bg-[#171614] dark:bg-[#D9B675] text-white dark:text-[#121110] text-xs font-semibold inline-flex items-center gap-2"
                          >
                            <Bluetooth className="w-4 h-4" />
                            <span>Pair Bluetooth Printer</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Steadfast API & Cloudinary Form */}
                  <form onSubmit={handleSaveSettings} className="space-y-6">
                    <div className="p-5 rounded-2xl bg-white dark:bg-[#171614] border border-[#E6E1D8] dark:border-[#262420] space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h2 className="text-sm font-semibold">Steadfast Courier API v1</h2>
                          <p className="text-xs text-[#6E6A63] dark:text-[#A39E93]">
                            {settings.hasSteadfastKeys
                              ? `API Key linked (${settings.steadfastApiKeyMasked})`
                              : 'Using Sandbox simulation until live Api-Key & Secret-Key are added.'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings.steadfastSandboxMode}
                              onChange={(e) =>
                                setSettings({ ...settings, steadfastSandboxMode: e.target.checked })
                              }
                              className="w-4 h-4 accent-[#9E7B42]"
                            />
                            <span>Sandbox Mode</span>
                          </label>
                          <button
                            type="button"
                            onClick={handleCheckBalance}
                            className="min-h-[38px] px-3 rounded-xl border border-[#D8D2C7] dark:border-[#322F29] text-xs font-medium"
                          >
                            {steadfastBalance !== null
                              ? `Balance: ৳${steadfastBalance.toLocaleString()}`
                              : 'Check Balance'}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <label className="block text-[#6E6A63] mb-1">Base URL</label>
                          <input
                            type="text"
                            value={settings.steadfastBaseUrl}
                            onChange={(e) =>
                              setSettings({ ...settings, steadfastBaseUrl: e.target.value })
                            }
                            className="w-full min-h-[40px] px-3 rounded-xl border border-[#D8D2C7] dark:border-[#322F29] bg-transparent font-mono-tabular"
                          />
                        </div>
                        <div>
                          <label className="block text-[#6E6A63] mb-1">Api-Key (Write-only)</label>
                          <input
                            type="password"
                            value={steadfastApiKeyInput}
                            onChange={(e) => setSteadfastApiKeyInput(e.target.value)}
                            placeholder={settings.steadfastApiKeyMasked || 'Enter Api-Key'}
                            className="w-full min-h-[40px] px-3 rounded-xl border border-[#D8D2C7] dark:border-[#322F29] bg-transparent font-mono-tabular"
                          />
                        </div>
                        <div>
                          <label className="block text-[#6E6A63] mb-1">Secret-Key (Write-only)</label>
                          <input
                            type="password"
                            value={steadfastSecretKeyInput}
                            onChange={(e) => setSteadfastSecretKeyInput(e.target.value)}
                            placeholder={settings.hasSteadfastKeys ? '•••••••• (saved)' : 'Enter Secret-Key'}
                            className="w-full min-h-[40px] px-3 rounded-xl border border-[#D8D2C7] dark:border-[#322F29] bg-transparent font-mono-tabular"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-white dark:bg-[#171614] border border-[#E6E1D8] dark:border-[#262420] space-y-4">
                      <div>
                        <h2 className="text-sm font-semibold">Cloudinary Media CDN</h2>
                        <p className="text-xs text-[#6E6A63] dark:text-[#A39E93]">
                          Cloud Name: <strong className="font-mono-tabular">{settings.cloudinaryCloudName}</strong> · API Secret:{' '}
                          {settings.hasCloudinarySecret ? 'Configured' : 'Add secret or unsigned preset below'}
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <label className="block text-[#6E6A63] mb-1">Cloud Name</label>
                          <input
                            type="text"
                            value={settings.cloudinaryCloudName}
                            onChange={(e) =>
                              setSettings({ ...settings, cloudinaryCloudName: e.target.value })
                            }
                            className="w-full min-h-[40px] px-3 rounded-xl border border-[#D8D2C7] dark:border-[#322F29] bg-transparent font-mono-tabular"
                          />
                        </div>
                        <div>
                          <label className="block text-[#6E6A63] mb-1">Upload Preset (Optional)</label>
                          <input
                            type="text"
                            value={settings.cloudinaryUploadPreset}
                            onChange={(e) =>
                              setSettings({ ...settings, cloudinaryUploadPreset: e.target.value })
                            }
                            placeholder="Unsigned preset name"
                            className="w-full min-h-[40px] px-3 rounded-xl border border-[#D8D2C7] dark:border-[#322F29] bg-transparent font-mono-tabular"
                          />
                        </div>
                        <div>
                          <label className="block text-[#6E6A63] mb-1">API Secret (Write-only)</label>
                          <input
                            type="password"
                            value={cloudinarySecretInput}
                            onChange={(e) => setCloudinarySecretInput(e.target.value)}
                            placeholder={settings.hasCloudinarySecret ? '•••••••• (saved)' : 'Enter API Secret'}
                            className="w-full min-h-[40px] px-3 rounded-xl border border-[#D8D2C7] dark:border-[#322F29] bg-transparent font-mono-tabular"
                          />
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          type="submit"
                          className="min-h-[44px] px-6 rounded-xl bg-[#171614] dark:bg-[#D9B675] text-white dark:text-[#121110] text-xs font-semibold"
                        >
                          Save Courier & Media Keys
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* Native Android APK & Push Notifications Info */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-[#171614] border border-[#E6E1D8] dark:border-[#262420] space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Capacitor Admin APK & Native Order Alerts</span>
                      <button
                        type="button"
                        onClick={handleEnableNotifications}
                        className="px-3 py-1.5 rounded-lg bg-[#9E7B42]/15 text-[#9E7B42] dark:text-[#D9B675] font-semibold"
                      >
                        Test Order Notification
                      </button>
                    </div>
                    <p className="text-[#6E6A63] dark:text-[#A39E93] leading-relaxed">
                      Pushing code to <code className="font-mono-tabular">main</code> automatically runs{' '}
                      <code className="font-mono-tabular">.github/workflows/deploy-and-build-apk.yml</code>, deploys your storefront, and builds{' '}
                      <strong>Inaya-Admin-APK</strong> wrapped around <code className="font-mono-tabular">CAPACITOR_ADMIN_URL</code> with Bluetooth & Notification permissions.
                      Database status: <strong>{settings.supabaseConfigured ? 'Connected to Supabase PostgreSQL' : 'Local Preview Storage (add SUPABASE_SERVICE_ROLE_KEY & run supabase/schema.sql for live Supabase sync)'}</strong>.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar (5 Tabs in Thumb Zone) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#FAF9F6]/95 dark:bg-[#151412]/95 backdrop-blur-md border-t border-[#E6E1D8] dark:border-[#262420] grid grid-cols-5 h-16 pb-safe">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'orders') setUnreadOrderAlerts(0);
              }}
              className={`relative flex flex-col items-center justify-center min-h-[44px] transition-colors ${
                active
                  ? 'text-[#9E7B42] dark:text-[#D9B675]'
                  : 'text-[#6E6A63] dark:text-[#A39E93]'
              }`}
            >
              {tab.icon}
              <span className="text-[10px] font-medium tracking-tight mt-1">{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="absolute top-1.5 right-3 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white font-mono-tabular text-[10px] font-bold flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Modals */}
      {editingProduct !== undefined && (
        <AdminProductModal
          product={editingProduct}
          categories={categories}
          authToken={authToken}
          cloudinaryCloudName={settings?.cloudinaryCloudName}
          cloudinaryUploadPreset={settings?.cloudinaryUploadPreset}
          onClose={() => setEditingProduct(undefined)}
          onSaved={() => {
            setEditingProduct(undefined);
            void loadBootstrap();
            onStorefrontDataChanged();
            showToast('ok', 'Product saved successfully.');
          }}
        />
      )}

      {labelOrder && (
        <BarcodeLabelModal order={labelOrder} onClose={() => setLabelOrder(null)} />
      )}
    </div>
  );
};
