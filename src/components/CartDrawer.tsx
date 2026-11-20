import React, { useState } from 'react';
import { Minus, Plus, ShoppingBag, Trash2, X, CheckCircle2, ArrowRight, Truck } from 'lucide-react';
import type { CartItem, Order, PublicSettings } from '../types';
import { trackMetaEvent } from '../lib/metaPixel';
import { resolveAssetUrl } from '../lib/paths';
import { createOrderFallback, tryExpressApi, validateCouponFallback } from '../lib/fallbackStorefront';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  settings: PublicSettings;
  onUpdateQty: (index: number, delta: number) => void;
  onRemoveItem: (index: number) => void;
  onClearCart: () => void;
  onOrderCreated: (order: Order) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  open,
  onClose,
  items,
  settings,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onOrderCreated,
}) => {
  const [step, setStep] = useState<'bag' | 'checkout' | 'success'>('bag');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountAmount: number } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryZone, setDeliveryZone] = useState<'inside_dhaka' | 'outside_dhaka'>('inside_dhaka');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  if (!open) return null;

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const afterDiscount = Math.max(0, subtotal - discountAmount);

  const qualifiesFreeDelivery =
    !settings.deliveryEnabled ||
    (settings.freeDeliveryThreshold > 0 && afterDiscount >= settings.freeDeliveryThreshold);

  const deliveryCharge = qualifiesFreeDelivery
    ? 0
    : deliveryZone === 'inside_dhaka'
    ? settings.deliveryInsideDhaka
    : settings.deliveryOutsideDhaka;

  const total = afterDiscount + deliveryCharge;
  const remainingForFree =
    settings.deliveryEnabled && settings.freeDeliveryThreshold > 0
      ? Math.max(0, settings.freeDeliveryThreshold - afterDiscount)
      : 0;

  const handleApplyCoupon = async () => {
    setCouponError('');
    if (!couponInput.trim()) return;
    setValidatingCoupon(true);
    try {
      const resp = await tryExpressApi('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponInput.trim(), subtotal }),
      });

      if (resp) {
        const data = (await resp.json()) as {
          valid?: boolean;
          code?: string;
          discountAmount?: number;
          error?: string;
        };
        if (!resp.ok || !data.valid || !data.code) {
          setCouponError(data.error || 'Coupon could not be applied.');
          setAppliedCoupon(null);
        } else {
          setAppliedCoupon({ code: data.code, discountAmount: data.discountAmount || 0 });
        }
        return;
      }

      const fallback = await validateCouponFallback(couponInput.trim(), subtotal);
      if (!fallback.valid || !fallback.code) {
        setCouponError(fallback.error || 'Coupon could not be applied.');
        setAppliedCoupon(null);
      } else {
        setAppliedCoupon({ code: fallback.code, discountAmount: fallback.discountAmount || 0 });
      }
    } catch {
      setCouponError('Unable to verify coupon right now.');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleProceedCheckout = () => {
    trackMetaEvent('InitiateCheckout', {
      value: afterDiscount,
      contentIds: items.map((i) => i.productId),
    });
    setStep('checkout');
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError('');
    setSubmitting(true);
    try {
      const eventId = `order-${Date.now()}`;
      const resp = await tryExpressApi('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerAddress,
          deliveryZone,
          note,
          couponCode: appliedCoupon?.code || '',
          items: items.map((i) => ({
            productId: i.productId,
            size: i.size,
            color: i.color,
            quantity: i.quantity,
          })),
          eventId,
          eventSourceUrl: window.location.href,
        }),
      });

      let placedOrder: Order | undefined;
      let orderError: string | undefined;

      if (resp) {
        const data = (await resp.json()) as { order?: Order; error?: string };
        if (!resp.ok || !data.order) {
          orderError = data.error || 'Could not place order. Please check your details.';
        } else {
          placedOrder = data.order;
        }
      } else {
        const fallback = await createOrderFallback({
          customerName,
          customerPhone,
          customerAddress,
          deliveryZone,
          note,
          couponCode: appliedCoupon?.code || '',
          items,
          settings,
        });
        placedOrder = fallback.order;
        orderError = fallback.error;
      }

      if (!placedOrder) {
        setCheckoutError(orderError || 'Could not place order. Please check your details.');
        return;
      }

      trackMetaEvent('Purchase', {
        value: placedOrder.totalAmount,
        contentIds: items.map((i) => i.productId),
        eventId: placedOrder.invoice,
      });

      setConfirmedOrder(placedOrder);
      onOrderCreated(placedOrder);
      onClearCart();
      setStep('success');
    } catch {
      setCheckoutError('Network error while submitting order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetAndClose = () => {
    if (step === 'success') {
      setStep('bag');
      setConfirmedOrder(null);
      setAppliedCoupon(null);
      setCouponInput('');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#FAF9F6] dark:bg-[#141311] text-[#171614] dark:text-[#F4F2EE] h-full flex flex-col shadow-2xl border-l border-[#E6E1D8] dark:border-[#2A2824]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E6E1D8] dark:border-[#2A2824]">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-4 h-4 text-[#9E7B42] dark:text-[#D9B675]" />
            <h2 className="font-display text-xl font-semibold">
              {step === 'bag' && `Shopping Bag (${items.reduce((s, i) => s + i.quantity, 0)})`}
              {step === 'checkout' && 'Cash on Delivery Checkout'}
              {step === 'success' && 'Order Confirmed'}
            </h2>
          </div>
          <button
            onClick={resetAndClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
            aria-label="Close bag"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {step === 'bag' && (
            <>
              {items.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <ShoppingBag className="w-10 h-10 mx-auto text-[#A39E93]" />
                  <p className="text-sm text-[#6E6A63] dark:text-[#A39E93]">
                    Your shopping bag is currently empty.
                  </p>
                </div>
              ) : (
                <>
                  {settings.deliveryEnabled && settings.freeDeliveryThreshold > 0 && (
                    <div className="px-4 py-3 rounded-xl bg-[#F2EFE8] dark:bg-[#1E1C18] text-xs flex items-center gap-2.5">
                      <Truck className="w-4 h-4 text-[#9E7B42] dark:text-[#D9B675] shrink-0" />
                      {remainingForFree > 0 ? (
                        <span>
                          Add <strong className="font-mono-tabular">৳{remainingForFree.toLocaleString()}</strong> more for complimentary nationwide delivery.
                        </span>
                      ) : (
                        <span className="font-medium text-emerald-700 dark:text-emerald-400">
                          You unlocked free nationwide delivery.
                        </span>
                      )}
                    </div>
                  )}

                  <div className="divide-y divide-[#E6E1D8] dark:divide-[#2A2824]">
                    {items.map((item, idx) => (
                      <div key={`${item.productId}-${item.size}-${item.color}`} className="py-4 flex gap-4">
                        <img
                          src={resolveAssetUrl(item.image)}
                          alt={item.name}
                          referrerPolicy="no-referrer"
                          className="w-20 h-26 object-cover rounded-lg bg-[#EFECE5] dark:bg-[#1F1D19] shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-semibold leading-snug line-clamp-2">{item.name}</h3>
                            <button
                              onClick={() => onRemoveItem(idx)}
                              className="text-[#8A857C] hover:text-red-600 p-1"
                              aria-label="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-xs text-[#6E6A63] dark:text-[#A39E93] mt-1">
                            {item.color} · Size {item.size}
                          </p>
                          <div className="flex items-center justify-between mt-3">
                            <div className="inline-flex items-center border border-[#D8D2C7] dark:border-[#35322C] rounded-lg">
                              <button
                                onClick={() => onUpdateQty(idx, -1)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-8 text-center text-xs font-mono-tabular font-medium">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => onUpdateQty(idx, 1)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5"
                                aria-label="Increase quantity"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <span className="text-sm font-mono-tabular font-semibold">
                              ৳{(item.price * item.quantity).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Coupon Box */}
                  <div className="pt-2 space-y-2">
                    <label className="block text-xs font-medium text-[#6E6A63] dark:text-[#A39E93]">
                      Promo / Coupon Code
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder="e.g. INAYA10"
                        className="flex-1 min-h-[42px] px-3.5 rounded-xl border border-[#D8D2C7] dark:border-[#35322C] bg-white dark:bg-[#1C1A17] text-sm uppercase font-mono-tabular"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={validatingCoupon}
                        className="px-4 min-h-[42px] rounded-xl bg-[#171614] dark:bg-[#F4F2EE] text-white dark:text-[#171614] text-xs font-semibold hover:opacity-90 transition whitespace-nowrap"
                      >
                        {validatingCoupon ? 'Checking...' : 'Apply'}
                      </button>
                    </div>
                    {couponError && <p className="text-xs text-red-600">{couponError}</p>}
                    {appliedCoupon && (
                      <p className="text-xs text-emerald-700 dark:text-emerald-400">
                        Coupon <strong>{appliedCoupon.code}</strong> applied (-৳{appliedCoupon.discountAmount.toLocaleString()})
                      </p>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {step === 'checkout' && (
            <form id="cod-checkout-form" onSubmit={handleSubmitOrder} className="space-y-4">
              {checkoutError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 text-xs">
                  {checkoutError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium mb-1.5">Full Name</label>
                <input
                  required
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Nusrat Jahan"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#D8D2C7] dark:border-[#35322C] bg-white dark:bg-[#1C1A17] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5">Mobile Number (Bangladesh)</label>
                <input
                  required
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#D8D2C7] dark:border-[#35322C] bg-white dark:bg-[#1C1A17] text-sm font-mono-tabular"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5">Delivery Zone</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDeliveryZone('inside_dhaka')}
                    className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-medium text-left transition ${
                      deliveryZone === 'inside_dhaka'
                        ? 'border-[#171614] dark:border-[#D9B675] bg-[#171614]/5 dark:bg-[#D9B675]/10'
                        : 'border-[#D8D2C7] dark:border-[#35322C]'
                    }`}
                  >
                    <div>Inside Dhaka</div>
                    <div className="text-[11px] text-[#6E6A63] dark:text-[#A39E93] font-mono-tabular mt-0.5">
                      {!settings.deliveryEnabled || qualifiesFreeDelivery
                        ? 'Free Delivery'
                        : `৳${settings.deliveryInsideDhaka}`}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryZone('outside_dhaka')}
                    className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-medium text-left transition ${
                      deliveryZone === 'outside_dhaka'
                        ? 'border-[#171614] dark:border-[#D9B675] bg-[#171614]/5 dark:bg-[#D9B675]/10'
                        : 'border-[#D8D2C7] dark:border-[#35322C]'
                    }`}
                  >
                    <div>Outside Dhaka</div>
                    <div className="text-[11px] text-[#6E6A63] dark:text-[#A39E93] font-mono-tabular mt-0.5">
                      {!settings.deliveryEnabled || qualifiesFreeDelivery
                        ? 'Free Delivery'
                        : `৳${settings.deliveryOutsideDhaka}`}
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5">Full Delivery Address</label>
                <textarea
                  required
                  rows={3}
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="House, Road, Area / Thana, District"
                  className="w-full p-3.5 rounded-xl border border-[#D8D2C7] dark:border-[#35322C] bg-white dark:bg-[#1C1A17] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5">Order Note (Optional)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Preferred delivery time or call instruction"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#D8D2C7] dark:border-[#35322C] bg-white dark:bg-[#1C1A17] text-sm"
                />
              </div>
            </form>
          )}

          {step === 'success' && confirmedOrder && (
            <div className="py-6 space-y-5">
              <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-7 h-7 shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold">Thank you, {confirmedOrder.customerName}</h3>
                  <p className="text-xs text-[#6E6A63] dark:text-[#A39E93]">
                    Your Cash on Delivery order is confirmed and queued for dispatch.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#F2EFE8] dark:bg-[#1E1C18] space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#6E6A63] dark:text-[#A39E93]">Invoice Number</span>
                  <span className="font-mono-tabular font-semibold">{confirmedOrder.invoice}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E6A63] dark:text-[#A39E93]">Mobile</span>
                  <span className="font-mono-tabular">{confirmedOrder.customerPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E6A63] dark:text-[#A39E93]">Payable on Delivery</span>
                  <span className="font-mono-tabular font-semibold text-sm">
                    ৳{confirmedOrder.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              <p className="text-xs text-[#6E6A63] dark:text-[#A39E93] leading-relaxed">
                Save your invoice number <strong className="font-mono-tabular">{confirmedOrder.invoice}</strong> to track live Steadfast courier updates anytime from our Track Order page.
              </p>
            </div>
          )}
        </div>

        {/* Footer Totals & CTA */}
        {step !== 'success' && items.length > 0 && (
          <div className="p-6 border-t border-[#E6E1D8] dark:border-[#2A2824] bg-[#F5F2EB] dark:bg-[#181614] space-y-3">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-[#6E6A63] dark:text-[#A39E93]">
                <span>Subtotal</span>
                <span className="font-mono-tabular">৳{subtotal.toLocaleString()}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                  <span>Discount ({appliedCoupon?.code})</span>
                  <span className="font-mono-tabular">-৳{discountAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-[#6E6A63] dark:text-[#A39E93]">
                <span>Delivery ({deliveryZone === 'inside_dhaka' ? 'Dhaka' : 'Nationwide'})</span>
                <span className="font-mono-tabular">
                  {deliveryCharge === 0 ? 'Free' : `৳${deliveryCharge}`}
                </span>
              </div>
              <div className="flex justify-between text-sm font-semibold pt-2 border-t border-[#E6E1D8] dark:border-[#2A2824]">
                <span>Total (Cash on Delivery)</span>
                <span className="font-mono-tabular">৳{total.toLocaleString()}</span>
              </div>
            </div>

            {step === 'bag' ? (
              <button
                onClick={handleProceedCheckout}
                className="w-full min-h-[48px] rounded-xl bg-[#171614] dark:bg-[#D9B675] text-white dark:text-[#121110] text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-95 transition"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setStep('bag')}
                  className="px-4 min-h-[48px] rounded-xl border border-[#D8D2C7] dark:border-[#35322C] text-xs font-semibold"
                >
                  Back
                </button>
                <button
                  type="submit"
                  form="cod-checkout-form"
                  disabled={submitting}
                  className="flex-1 min-h-[48px] rounded-xl bg-[#171614] dark:bg-[#D9B675] text-white dark:text-[#121110] text-sm font-semibold hover:opacity-95 transition disabled:opacity-50"
                >
                  {submitting ? 'Confirming Order...' : `Confirm COD Order · ৳${total.toLocaleString()}`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
