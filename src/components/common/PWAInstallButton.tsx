import React, { useState } from 'react';
import {
  CheckCircle2,
  Download,
  MoreVertical,
  PlusSquare,
  Share,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  /** Compact header pill vs prominent glowing CTA button */
  variant?: 'header' | 'banner' | 'drawer';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Automatically hidden when already running as an installed standalone PWA
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) return;
    }
    // iOS Safari or browsers where native prompt hasn't fired yet -> open Arabic dark-purple glass modal
    setShowGuideModal(true);
  };

  return (
    <>
      {variant === 'drawer' ? (
        <button
          type="button"
          onClick={handleClick}
          className={`w-full flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-xs font-extrabold text-white bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 border border-purple-300/30 shadow-[0_8px_24px_-6px_rgba(147,51,234,0.75)] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer ${className}`}
        >
          <span className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 border border-white/20">
              <Download className="h-4 w-4 text-white" />
            </span>
            <span className="text-right">
              <span className="block text-xs font-black">تثبيت التطبيق</span>
              <span className="block text-[10px] font-medium text-purple-100/85">
                وصول فوري من الشاشة الرئيسية
              </span>
            </span>
          </span>
          <Sparkles className="h-4 w-4 text-purple-100 shrink-0" />
        </button>
      ) : variant === 'banner' ? (
        <button
          type="button"
          onClick={handleClick}
          className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-extrabold text-white bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 border border-purple-300/35 shadow-[0_0_24px_-4px_rgba(168,85,247,0.75)] hover:shadow-[0_0_32px_-2px_rgba(192,132,252,0.9)] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer ${className}`}
        >
          <Download className="h-4 w-4 shrink-0" />
          <span>تثبيت التطبيق</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          aria-label="تثبيت التطبيق على جهازك"
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold text-white bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 border border-purple-300/35 shadow-[0_0_20px_-4px_rgba(168,85,247,0.8)] hover:brightness-110 active:scale-95 transition-all cursor-pointer shrink-0 ${className}`}
        >
          <Download className="h-3.5 w-3.5 shrink-0" />
          <span>تثبيت التطبيق</span>
        </button>
      )}

      {/* Sleek Dark Luxury Purple Glassmorphism Install Guide Modal (iOS Safari + Fallback) */}
      {showGuideModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
          onClick={() => setShowGuideModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="تثبيت تطبيق منصة الأستاذة تبارك الزيرجاوي"
        >
          <div
            className="w-full max-w-md rounded-3xl bg-[#110D1F]/95 backdrop-blur-2xl border border-purple-500/35 shadow-[0_24px_80px_-16px_rgba(124,58,237,0.65)] overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient purple top glow */}
            <div
              className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-72 rounded-full bg-purple-600/30 blur-3xl"
              aria-hidden="true"
            />

            {/* Header */}
            <div className="relative px-5 pt-5 pb-4 border-b border-purple-500/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src="/pwa-192x192.png"
                  alt="أيقونة تطبيق الأستاذة تبارك الزيرجاوي"
                  className="h-12 w-12 rounded-2xl border border-purple-400/50 shadow-[0_0_20px_-4px_rgba(168,85,247,0.75)] object-cover shrink-0"
                />
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    تثبيت التطبيق على جهازك
                  </h3>
                  <p className="text-[11px] font-semibold text-purple-300 mt-0.5">
                    {isIOS
                      ? 'خطوات التثبيت السريع لأجهزة الآيفون والآيباد (Safari)'
                      : 'منصة الأستاذة تبارك الزيرجاوي — وصول مباشر بضغطة واحدة'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                aria-label="إغلاق نافذة التثبيت"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 border border-purple-500/25 text-slate-300 hover:text-white hover:border-purple-400/60 transition-colors cursor-pointer shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Steps */}
            <div className="relative p-5 space-y-3 text-xs sm:text-sm text-slate-200 leading-relaxed">
              {isIOS ? (
                <>
                  <div className="flex items-start gap-3 rounded-2xl bg-white/[0.04] border border-purple-500/20 p-3.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-fuchsia-600 text-xs font-black text-white shadow-md">
                      1
                    </span>
                    <div className="flex-1">
                      <p className="font-bold text-white flex items-center gap-1.5 flex-wrap">
                        <span>اضغط على زر المشاركة (Share)</span>
                        <span className="inline-flex items-center justify-center rounded-lg bg-purple-500/20 border border-purple-400/35 px-1.5 py-0.5 text-purple-200">
                          <Share className="h-3.5 w-3.5" />
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        يوجد أسفل شاشة متصفح Safari في المنتصف.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl bg-white/[0.04] border border-purple-500/20 p-3.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-fuchsia-600 text-xs font-black text-white shadow-md">
                      2
                    </span>
                    <div className="flex-1">
                      <p className="font-bold text-white flex items-center gap-1.5 flex-wrap">
                        <span>اختر «إضافة إلى الشاشة الرئيسية»</span>
                        <span className="inline-flex items-center justify-center rounded-lg bg-purple-500/20 border border-purple-400/35 px-1.5 py-0.5 text-purple-200">
                          <PlusSquare className="h-3.5 w-3.5" />
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        مرّر القائمة للأسفل واضغط على Add to Home Screen.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl bg-white/[0.04] border border-purple-500/20 p-3.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-fuchsia-600 text-xs font-black text-white shadow-md">
                      3
                    </span>
                    <div className="flex-1">
                      <p className="font-bold text-white flex items-center gap-1.5">
                        <span>اضغط «إضافة» ليظهر التطبيق على شاشتك</span>
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      </p>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        سيظهر بأيقونة «الأستاذة تبارك الزيرجاوي» ويعمل كتطبيق مستقل بالكامل.
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3 rounded-2xl bg-white/[0.04] border border-purple-500/20 p-3.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-fuchsia-600 text-xs font-black text-white shadow-md">
                      1
                    </span>
                    <div className="flex-1">
                      <p className="font-bold text-white flex items-center gap-1.5 flex-wrap">
                        <span>افتح قائمة المتصفح (Chrome / Edge)</span>
                        <span className="inline-flex items-center justify-center rounded-lg bg-purple-500/20 border border-purple-400/35 px-1.5 py-0.5 text-purple-200">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        اضغط على أيقونة النقاط الثلاث أعلى المتصفح أو أيقونة التثبيت في شريط العنوان.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl bg-white/[0.04] border border-purple-500/20 p-3.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-fuchsia-600 text-xs font-black text-white shadow-md">
                      2
                    </span>
                    <div className="flex-1">
                      <p className="font-bold text-white flex items-center gap-1.5 flex-wrap">
                        <span>اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»</span>
                        <Smartphone className="h-4 w-4 text-purple-300 shrink-0" />
                      </p>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        وعلى أجهزة الآيفون استخدم زر المشاركة (Share) في متصفح Safari ثم «إضافة إلى الشاشة الرئيسية».
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl bg-white/[0.04] border border-purple-500/20 p-3.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-fuchsia-600 text-xs font-black text-white shadow-md">
                      3
                    </span>
                    <div className="flex-1">
                      <p className="font-bold text-white flex items-center gap-1.5">
                        <span>اضغط «تثبيت» للاستمتاع بتجربة تطبيق كاملة</span>
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      </p>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        ستظهر أيقونة «الأستاذة تبارك الزيرجاوي» مباشرة على شاشة هاتفك الرئيسية.
                      </p>
                    </div>
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="w-full mt-2 rounded-2xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 py-3 text-sm font-black text-white shadow-[0_8px_24px_-6px_rgba(147,51,234,0.75)] hover:brightness-110 transition-all cursor-pointer"
              >
                فهمت، شكراً
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
