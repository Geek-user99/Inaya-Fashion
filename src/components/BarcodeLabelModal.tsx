import React, { useState } from 'react';
import { Bluetooth, Printer, X, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Order } from '../types';
import { BarcodeSvg } from './BarcodeSvg';
import {
  connectThermalPrinter,
  getConnectedPrinterName,
  isWebBluetoothSupported,
  printOrderToBluetoothThermal,
} from '../lib/thermalPrinter';

interface BarcodeLabelModalProps {
  order: Order;
  onClose: () => void;
}

export const BarcodeLabelModal: React.FC<BarcodeLabelModalProps> = ({ order, onClose }) => {
  const [printerName, setPrinterName] = useState<string | null>(() => getConnectedPrinterName());
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [printing, setPrinting] = useState(false);

  const handleBluetoothPrint = async () => {
    setStatusMsg(null);
    setPrinting(true);
    try {
      let current = getConnectedPrinterName();
      if (!current) {
        current = await connectThermalPrinter();
        setPrinterName(current);
      }
      await printOrderToBluetoothThermal(order);
      setStatusMsg({ type: 'ok', text: `Sticker sent to ${current}` });
    } catch (err) {
      setStatusMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Bluetooth printer connection failed.',
      });
    } finally {
      setPrinting(false);
    }
  };

  const handleSystemPrint = () => {
    window.print();
  };

  const barcodeCode = order.steadfastConsignmentId || order.invoice;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#171614] border border-[#E6E1D8] dark:border-[#2C2A26] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E6E1D8] dark:border-[#2C2A26]">
          <div>
            <h3 className="text-base font-semibold text-[#171614] dark:text-[#F4F2EE]">
              Shipping Sticker Label
            </h3>
            <p className="text-xs text-[#6E6A63] dark:text-[#A39E93]">
              58mm / 80mm Thermal & Steadfast Consignment Slip
            </p>
          </div>
          <button
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[#6E6A63]"
            aria-label="Close label modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 bg-[#F4F1EA] dark:bg-[#100F0E] flex justify-center max-h-[60vh] overflow-y-auto">
          {/* Printable 58mm Thermal Sticker Preview */}
          <div
            id="thermal-label-print-area"
            className="w-[260px] bg-white text-black p-4 border border-dashed border-neutral-300 shadow-sm text-xs leading-snug"
          >
            <div className="text-center border-b border-black pb-2 mb-2">
              <div className="font-display text-lg font-bold tracking-[0.18em]">INAYA FASHION</div>
              <div className="text-[10px] text-neutral-600">Dhaka, Bangladesh · Cash on Delivery</div>
            </div>

            <div className="flex justify-between font-mono-tabular text-[11px] mb-1">
              <span className="font-semibold">INV:</span>
              <span>{order.invoice}</span>
            </div>

            {order.steadfastConsignmentId ? (
              <div className="bg-black text-white px-2 py-1 text-center font-mono-tabular text-[12px] font-bold tracking-wider mb-2">
                STEADFAST CID: {order.steadfastConsignmentId}
              </div>
            ) : (
              <div className="border border-black px-2 py-1 text-center text-[10px] font-medium mb-2">
                Not yet booked on Steadfast
              </div>
            )}

            {order.steadfastTrackingCode && (
              <div className="flex justify-between font-mono-tabular text-[10px] mb-2">
                <span>TRACKING:</span>
                <span className="font-semibold">{order.steadfastTrackingCode}</span>
              </div>
            )}

            <div className="border-t border-b border-black py-2 my-2 space-y-0.5">
              <div className="font-bold text-[12px]">{order.customerName}</div>
              <div className="font-mono-tabular font-semibold">{order.customerPhone}</div>
              <div className="text-[11px] text-neutral-800">{order.customerAddress}</div>
            </div>

            <div className="space-y-1 mb-2">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-[11px]">
                  <span className="truncate max-w-[170px]">
                    {item.productName} ({item.size}/{item.color}) x{item.quantity}
                  </span>
                  <span className="font-mono-tabular font-medium">৳{item.price * item.quantity}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-black pt-2 mb-3 flex items-center justify-between font-bold text-sm">
              <span>COD PAYABLE</span>
              <span className="font-mono-tabular">৳{order.totalAmount.toLocaleString()}</span>
            </div>

            <div className="pt-1">
              <BarcodeSvg value={barcodeCode} height={42} />
            </div>
          </div>
        </div>

        <div className="p-5 space-y-3 border-t border-[#E6E1D8] dark:border-[#2C2A26]">
          {statusMsg && (
            <div
              className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
                statusMsg.type === 'ok'
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : 'bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-300'
              }`}
            >
              {statusMsg.type === 'ok' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              onClick={handleBluetoothPrint}
              disabled={printing}
              className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#171614] dark:bg-[#D9B675] text-white dark:text-[#121110] text-xs font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              <Bluetooth className="w-4 h-4" />
              <span>
                {printing
                  ? 'Sending...'
                  : printerName
                  ? `Print (${printerName.slice(0, 12)})`
                  : isWebBluetoothSupported()
                  ? 'Bluetooth Thermal Print'
                  : 'Pair Bluetooth Printer'}
              </span>
            </button>

            <button
              onClick={handleSystemPrint}
              className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#D8D2C7] dark:border-[#36332D] text-[#171614] dark:text-[#F4F2EE] text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              <Printer className="w-4 h-4" />
              <span>System / PDF Print</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
