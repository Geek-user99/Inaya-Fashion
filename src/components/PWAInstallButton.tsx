import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#9E7B42] text-white text-xs font-semibold hover:opacity-90 transition whitespace-nowrap shrink-0"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install Admin App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D8D2C7] dark:border-[#35322C] text-xs font-medium whitespace-nowrap shrink-0"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Install App</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#171614] p-6 shadow-xl border border-[#E6E1D8] dark:border-[#2C2A26]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold">Install Inaya Admin on iPhone</h3>
                <button onClick={() => setShowIOSGuide(false)} className="p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-[#6E6A63] dark:text-[#A39E93] leading-relaxed space-y-1.5">
                1. Tap the <strong>Share</strong> button in Safari&apos;s toolbar.<br />
                2. Scroll down and tap <strong>Add to Home Screen</strong> to launch Inaya Admin with full-screen navigation.
              </p>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
