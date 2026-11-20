import React, { useState } from 'react';
import { PackageSearch, Truck } from 'lucide-react';
import type { OrderItem } from '../types';

interface TrackedOrderResult {
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
}

export const TrackOrderView: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackedOrderResult | null>(null);
  const [error, setError] = useState('');

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const resp = await fetch(`/api/orders/track/${encodeURIComponent(query.trim())}`);
      const data = (await resp.json()) as TrackedOrderResult & { error?: string };
      if (!resp.ok) {
        setError(data.error || 'Order not found.');
      } else {
        setResult(data);
      }
    } catch {
      setError('Unable to check order status right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-14">
      <div className="text-center space-y-2 mb-8">
        <PackageSearch className="w-8 h-8 mx-auto text-[#9E7B42] dark:text-[#D9B675]" />
        <h1 className="font-display text-3xl sm:text-4xl font-semibold">Track Your Parcel</h1>
        <p className="text-sm text-[#6E6A63] dark:text-[#A39E93]">
          Enter your Invoice Number (e.g. INY-261119-1001) or the last digits of your phone number.
        </p>
      </div>

      <form onSubmit={handleTrack} className="flex gap-2.5">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Invoice # or Mobile Number"
          className="flex-1 min-h-[48px] px-4 rounded-xl border border-[#D8D2C7] dark:border-[#35322C] bg-white dark:bg-[#171614] text-sm font-mono-tabular"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 min-h-[48px] rounded-xl bg-[#171614] dark:bg-[#D9B675] text-white dark:text-[#121110] text-sm font-semibold whitespace-nowrap"
        >
          {loading ? 'Checking...' : 'Track'}
        </button>
      </form>

      {error && (
        <div className="mt-5 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-8 p-6 rounded-2xl bg-[#F4F1EA] dark:bg-[#181614] border border-[#E6E1D8] dark:border-[#272420] space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E1D8] dark:border-[#272420] pb-4">
            <div>
              <div className="text-xs text-[#6E6A63] dark:text-[#A39E93]">Invoice</div>
              <div className="font-mono-tabular font-semibold text-base">{result.invoice}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-[#6E6A63] dark:text-[#A39E93]">Current Status</div>
              <div className="text-sm font-semibold capitalize text-[#9E7B42] dark:text-[#D9B675]">
                {result.steadfastStatus ? result.steadfastStatus.replace(/_/g, ' ') : result.orderStatus}
              </div>
            </div>
          </div>

          {result.steadfastConsignmentId && (
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white dark:bg-[#121110] text-xs">
              <Truck className="w-4 h-4 text-[#9E7B42] shrink-0" />
              <div className="space-y-0.5">
                <div className="font-semibold">Steadfast Courier Booked</div>
                <div className="font-mono-tabular text-[#6E6A63] dark:text-[#A39E93]">
                  Consignment ID: {result.steadfastConsignmentId}
                  {result.steadfastTrackingCode ? ` · Tracking: ${result.steadfastTrackingCode}` : ''}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2 text-xs">
            {result.items.map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <span>
                  {item.productName} ({item.size} / {item.color}) × {item.quantity}
                </span>
                <span className="font-mono-tabular font-medium">
                  ৳{(item.price * item.quantity).toLocaleString()}
                </span>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t border-[#E6E1D8] dark:border-[#272420] font-semibold text-sm">
              <span>COD Amount</span>
              <span className="font-mono-tabular">৳{result.totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
