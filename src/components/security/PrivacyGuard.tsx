import React, { useEffect, useState } from 'react';
import { ShieldAlert, Eye } from 'lucide-react';

interface PrivacyGuardProps {
  children: React.ReactNode;
  active?: boolean;
  className?: string;
}

interface CapacitorPrivacyWindow extends Window {
  Capacitor?: {
    isNativePlatform?: () => boolean;
    Plugins?: {
      PrivacyScreen?: {
        enable: () => Promise<void>;
        disable: () => Promise<void>;
      };
    };
  };
}

/**
 * PrivacyGuard — Capacitor PrivacyScreen & Anti-Capture Wrapper
 *
 * On Android APK (via Capacitor + @capacitor-community/privacy-screen):
 * automatically enables Android FLAG_SECURE so screenshots & screen recordings
 * render a solid black screen.
 *
 * On Web preview:
 * disables right-click context menu, blocks PrintScreen / Ctrl+S / Ctrl+P,
 * and raises an immediate black privacy curtain if capture shortcuts are pressed.
 */
export const PrivacyGuard: React.FC<PrivacyGuardProps> = ({
  children,
  active = true,
  className = '',
}) => {
  const [shieldTriggered, setShieldTriggered] = useState(false);

  useEffect(() => {
    if (!active) return;

    const capWin = window as CapacitorPrivacyWindow;
    const enableNativePrivacy = async () => {
      try {
        if (capWin.Capacitor?.isNativePlatform?.() && capWin.Capacitor?.Plugins?.PrivacyScreen) {
          await capWin.Capacitor.Plugins.PrivacyScreen.enable();
        }
      } catch {
        // Ignore when running outside Capacitor native shell
      }
    };

    const disableNativePrivacy = async () => {
      try {
        if (capWin.Capacitor?.isNativePlatform?.() && capWin.Capacitor?.Plugins?.PrivacyScreen) {
          await capWin.Capacitor.Plugins.PrivacyScreen.disable();
        }
      } catch {
        // Ignore
      }
    };

    void enableNativePrivacy();

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const isCaptureCombo =
        event.key === 'PrintScreen' ||
        ((event.ctrlKey || event.metaKey) && (key === 'p' || key === 's')) ||
        ((event.ctrlKey || event.metaKey) && event.shiftKey && (key === 's' || key === '3' || key === '4'));

      if (isCaptureCombo) {
        event.preventDefault();
        setShieldTriggered(true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setShieldTriggered(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void disableNativePrivacy();
    };
  }, [active]);

  const handleContextMenu = (e: React.MouseEvent) => {
    if (active) {
      e.preventDefault();
    }
  };

  return (
    <div
      onContextMenu={handleContextMenu}
      onDragStart={(e) => active && e.preventDefault()}
      className={`relative protected-surface ${className}`}
    >
      {children}

      {active && shieldTriggered && (
        <div
          role="alertdialog"
          aria-modal="true"
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#090712]/98 backdrop-blur-xl px-6 text-center text-white"
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/20 border border-purple-400/40 text-purple-300 shadow-[0_0_24px_-4px_rgba(168,85,247,0.7)]">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-black text-white">حماية المحتوى مفعّلة</h3>
          <p className="mt-2 max-w-md text-sm text-slate-300 leading-relaxed">
            يُمنع التقاط الشاشة أو تسجيل الفيديو لحفظ حقوق الأستاذة تبارك الزيرجاوي. تم تعتيم العرض تلقائياً لحماية المحتوى التعليمي.
          </p>
          <button
            type="button"
            onClick={() => setShieldTriggered(false)}
            className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-black text-white shadow-[0_8px_24px_-6px_rgba(147,51,234,0.75)] transition-all hover:brightness-110 cursor-pointer"
          >
            <Eye className="h-4 w-4" />
            <span>العودة إلى المشاهدة</span>
          </button>
        </div>
      )}
    </div>
  );
};
