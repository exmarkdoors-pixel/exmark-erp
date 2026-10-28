'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    // If in development mode (or on localhost), unregister any active service worker
    // and clear cache to permanently prevent Fast Refresh / Turbopack reload loops!
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      if (
        process.env.NODE_ENV === 'development' ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'
      ) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister().then(() => {
              console.log('[EXMARK ERP PWA] Service Worker unregistered on localhost/dev to ensure clean Fast Refresh.');
            });
          }
        });
        if ('caches' in window) {
          caches.keys().then((keys) => {
            for (const key of keys) {
              if (key.startsWith('exmark-')) {
                caches.delete(key);
              }
            }
          });
        }
        return;
      }

      // Production only: Register Service Worker
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[EXMARK ERP PWA] Service Worker registered with scope:', registration.scope);
        })
        .catch((err) => {
          console.error('[EXMARK ERP PWA] Service Worker registration failed:', err);
        });
    }

    // Capture install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      console.log('[EXMARK ERP PWA] App installed successfully');
    }
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  if (!showInstallBanner) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-[#0B132B] text-white p-3.5 rounded-xl border border-red-500/40 shadow-2xl flex items-center gap-3 max-w-sm animate-in slide-in-from-bottom duration-300">
      <div className="p-2 bg-red-600 rounded-lg shrink-0">
        <Download className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 text-xs">
        <strong className="block font-bold">Install EXMARK App</strong>
        <span className="text-[11px] text-slate-300">
          Fast offline access on Android, iOS &amp; Desktop
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleInstall}
          className="px-2.5 py-1 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Install
        </button>
        <button
          onClick={() => setShowInstallBanner(false)}
          className="p-1 text-slate-400 hover:text-white rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
