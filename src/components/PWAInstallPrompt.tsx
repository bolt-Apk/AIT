import { useState, useEffect, useCallback } from 'react';
import { Download, X, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    const stored = localStorage.getItem('pwa-install-dismissed');
    if (stored) {
      const ts = parseInt(stored, 10);
      if (Date.now() - ts < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
        return;
      }
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    if (isIOS()) {
      const timer = setTimeout(() => setShowIOSHint(true), 3000);
      return () => {
        window.removeEventListener('beforeinstallprompt', handler);
        clearTimeout(timer);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    setDeferredPrompt(null);
    setShowIOSHint(false);
    localStorage.setItem('pwa-install-dismissed', String(Date.now()));
  }, []);

  if (dismissed || isStandalone()) return null;
  if (!deferredPrompt && !showIOSHint) return null;

  return (
    <div className="fixed bottom-[calc(62px+env(safe-area-inset-bottom))] left-4 right-4 z-[9999] sm:left-auto sm:right-6 sm:bottom-6 sm:w-80 animate-msg-in">
      <div className="bg-white dark:bg-gray-900 border border-slate-200/60 dark:border-gray-800/60 rounded-2xl shadow-2xl shadow-black/20 dark:shadow-black/40 p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
            <Download className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-gray-100">
              Установить приложение
            </p>
            {showIOSHint ? (
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 leading-relaxed">
                Нажмите <Share className="w-3.5 h-3.5 inline-block text-blue-500 -mt-0.5" /> внизу экрана, затем «На экран Домой»
              </p>
            ) : (
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                Быстрый доступ с главного экрана
              </p>
            )}
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 p-2.5 -m-1 rounded-xl text-slate-400 dark:text-gray-500 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {deferredPrompt && (
          <button
            onClick={handleInstall}
            className="mt-3 w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-semibold hover:from-cyan-400 hover:to-blue-400 transition-all duration-200 active:scale-[0.98]"
          >
            Установить
          </button>
        )}
      </div>
    </div>
  );
}
