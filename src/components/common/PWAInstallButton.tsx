import React, { useState } from 'react';
import { Download, Share, PlusSquare, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'card' | 'drawer';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Hide completely when already running in standalone installed mode
  if (isInstalled) {
    return null;
  }

  // Only render when native install prompt is available or on iOS Safari
  if (!isInstallable && !isIOS) {
    return null;
  }

  const handleClick = () => {
    if (isInstallable) {
      void install();
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  const buttonClasses =
    variant === 'drawer'
      ? 'w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F172A] px-4 py-2.5 text-xs font-extrabold text-[#D4AF37] hover:bg-slate-800 transition-colors'
      : variant === 'card'
        ? 'inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-[#D4AF37]/50 bg-[#0F172A] px-3.5 py-2 text-xs font-extrabold text-[#D4AF37] hover:bg-slate-800 transition-colors whitespace-nowrap'
        : 'min-h-[38px] inline-flex items-center gap-1.5 rounded-xl bg-slate-800 border border-[#D4AF37]/40 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-extrabold text-[#D4AF37] hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0';

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label="تثبيت تطبيق منصة الأستاذة تبارك"
        className={`${buttonClasses} ${className}`}
      >
        <Download className="h-3.5 w-3.5 shrink-0" />
        <span>{isIOS ? 'تثبيت على الآيفون' : 'تثبيت التطبيق'}</span>
      </button>

      {showIOSGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-install-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl text-right">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F172A] text-[#D4AF37] shrink-0">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 id="ios-install-title" className="text-base font-extrabold text-slate-900">
                    تثبيت منصة الأستاذة تبارك
                  </h3>
                  <p className="text-xs text-slate-500">يعمل بملء الشاشة على الآيفون والآيباد</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                aria-label="إغلاق"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ol className="mt-5 space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed font-reading">
              <li className="flex items-start gap-2.5 rounded-xl bg-slate-50 border border-slate-200 p-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#0F172A] text-[#D4AF37] font-mono text-xs font-bold shrink-0">
                  1
                </span>
                <span>
                  اضغط على زر <strong className="text-slate-900">المشاركة (Share)</strong>{' '}
                  <Share className="inline h-3.5 w-3.5 text-[#0F172A] mx-0.5" /> في أسفل متصفح Safari.
                </span>
              </li>
              <li className="flex items-start gap-2.5 rounded-xl bg-slate-50 border border-slate-200 p-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#0F172A] text-[#D4AF37] font-mono text-xs font-bold shrink-0">
                  2
                </span>
                <span>
                  مرّر للأسفل واضغط على{' '}
                  <strong className="text-slate-900">إضافة إلى الشاشة الرئيسية</strong>{' '}
                  <PlusSquare className="inline h-3.5 w-3.5 text-[#0F172A] mx-0.5" /> ثم اضغط{' '}
                  <strong className="text-slate-900">إضافة (Add)</strong>.
                </span>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full min-h-[44px] rounded-xl bg-[#0F172A] text-sm font-bold text-[#D4AF37] hover:bg-slate-800 transition-colors"
            >
              فهمت، إغلاق
            </button>
          </div>
        </div>
      )}
    </>
  );
};
