import { useEffect } from 'react';

let capacitorInitialized = false;

async function initCapacitor() {
  if (capacitorInitialized) return;
  capacitorInitialized = true;

  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;

    const [{ StatusBar, Style }, { SplashScreen }, { Keyboard }, { App }] = await Promise.all([
      import('@capacitor/status-bar'),
      import('@capacitor/splash-screen'),
      import('@capacitor/keyboard'),
      import('@capacitor/app'),
    ]);

    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#030712' });

    await SplashScreen.hide({ fadeOutDuration: 300 });

    Keyboard.addListener('keyboardWillShow', () => {
      document.documentElement.classList.add('keyboard-open');
    });
    Keyboard.addListener('keyboardWillHide', () => {
      document.documentElement.classList.remove('keyboard-open');
    });

    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      }
    });
  } catch {
    // Not running inside Capacitor
  }
}

export function useCapacitor() {
  useEffect(() => {
    initCapacitor();
  }, []);
}
