import { useEffect, useRef } from 'react';

interface CapacitorAppPlugin {
  addListener: (
    eventName: 'backButton',
    listenerFunc: (event: { canGoBack: boolean }) => void
  ) => Promise<{ remove: () => Promise<void> }> | { remove: () => void };
}

interface CapacitorGlobal {
  Plugins?: {
    App?: CapacitorAppPlugin;
  };
}

/**
 * Unified Hardware Back Button & Browser Popstate Hook
 *
 * - Listens to Capacitor Android Hardware Back Button (`Capacitor.Plugins.App.addListener('backButton', ...)`)
 *   without requiring a hard build-time import of `@capacitor/app` (works seamlessly both in Web preview and Android APK).
 * - Also supports Cordova-style `backbutton` DOM events and browser `popstate` navigation.
 * - `onBack` should return `true` if it handled the back navigation internally, or `false` if already at root.
 */
export function useHardwareBackButton(onBack: () => boolean, enabled = true): void {
  const handlerRef = useRef(onBack);
  handlerRef.current = onBack;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    let capacitorHandle: { remove: () => void | Promise<void> } | null = null;
    let isDisposed = false;

    const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
    if (cap?.Plugins?.App?.addListener) {
      const maybePromise = cap.Plugins.App.addListener('backButton', () => {
        handlerRef.current();
      });

      if (maybePromise && typeof (maybePromise as Promise<{ remove: () => Promise<void> }>).then === 'function') {
        (maybePromise as Promise<{ remove: () => Promise<void> }>)
          .then((handle) => {
            if (isDisposed) {
              void handle.remove();
            } else {
              capacitorHandle = handle;
            }
          })
          .catch(() => {
            // Ignore when App plugin is unavailable in web browser
          });
      } else if (maybePromise && typeof (maybePromise as { remove: () => void }).remove === 'function') {
        capacitorHandle = maybePromise as { remove: () => void };
      }
    }

    const handleCordovaBack = (event: Event) => {
      const handled = handlerRef.current();
      if (handled) {
        event.preventDefault();
      }
    };

    const handlePopState = () => {
      handlerRef.current();
    };

    document.addEventListener('backbutton', handleCordovaBack, false);
    window.addEventListener('popstate', handlePopState);

    return () => {
      isDisposed = true;
      document.removeEventListener('backbutton', handleCordovaBack, false);
      window.removeEventListener('popstate', handlePopState);
      if (capacitorHandle) {
        void capacitorHandle.remove();
      }
    };
  }, [enabled]);
}
