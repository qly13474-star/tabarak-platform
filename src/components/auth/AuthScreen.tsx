import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Smartphone,
  AlertTriangle,
  ArrowLeft,
  Eye,
  EyeOff,
  ShieldAlert,
  KeyRound,
  PlayCircle,
  Radio,
  BookOpen,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { normalizeArabicPhoneDigits } from '../../services/deviceLock';
import { TrackId } from '../../types';
import { buildWhatsappSupportUrl } from '../../utils/whatsapp';
import { PWAInstallButton } from '../common/PWAInstallButton';

export const AuthScreen: React.FC = () => {
  const {
    db,
    activeAppMode,
    login,
    registerStudent,
    currentDeviceId,
    deviceLockViolation,
    clearDeviceLockViolation,
  } = usePlatform();

  const isAdminPortal = activeAppMode === 'admin';
  const availableTracks = db.tracks;
  const defaultTrackObj =
    availableTracks.find((t) => t.id === 'vocational') ?? availableTracks[0];

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [track, setTrack] = useState<TrackId>(defaultTrackObj?.id ?? 'vocational');
  const [subStage, setSubStage] = useState(defaultTrackObj?.subStages[0] ?? '');
  const [specialization, setSpecialization] = useState(
    (defaultTrackObj?.branches ?? defaultTrackObj?.departments)?.[0] ?? ''
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync fields cleanly whenever active route mode changes
  useEffect(() => {
    setError(null);
    setMode('login');
    setPhone('');
    setPassword('');
  }, [isAdminPortal]);

  const selectedTrackOption =
    availableTracks.find((t) => t.id === track) ?? availableTracks[0];
  const selectedSpecializations =
    selectedTrackOption?.branches ?? selectedTrackOption?.departments ?? [];
  const usesDepartments =
    !selectedTrackOption?.branches && Boolean(selectedTrackOption?.departments);

  // Keep selected track, subStage, and specialization synced if teacher modifies stages/classes
  useEffect(() => {
    if (!selectedTrackOption) return;
    if (selectedTrackOption.id !== track) {
      setTrack(selectedTrackOption.id);
    }
    if (
      selectedTrackOption.subStages.length > 0 &&
      !selectedTrackOption.subStages.includes(subStage)
    ) {
      setSubStage(selectedTrackOption.subStages[0]);
    }
    const specs = selectedTrackOption.branches ?? selectedTrackOption.departments ?? [];
    if (specs.length > 0 && !specs.includes(specialization)) {
      setSpecialization(specs[0]);
    } else if (specs.length === 0 && specialization !== '') {
      setSpecialization('');
    }
  }, [selectedTrackOption, track, subStage, specialization]);

  const handleTrackChange = (nextTrack: TrackId) => {
    setTrack(nextTrack);
    const opt = availableTracks.find((t) => t.id === nextTrack);
    if (opt) {
      setSubStage(opt.subStages[0] ?? '');
      const specs = opt.branches ?? opt.departments ?? [];
      setSpecialization(specs[0] ?? '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);

    try {
      if (isAdminPortal || mode === 'login') {
        const result = await login(phone, password);
        if (!result.success && !result.deviceLockViolation) {
          setError(result.error ?? 'تعذر تسجيل الدخول.');
        }
      } else {
        const result = await registerStudent({
          fullName,
          phone,
          parentPhone: parentPhone.trim() || undefined,
          password,
          track,
          subStage,
          branch: !usesDepartments && selectedSpecializations.length > 0 ? specialization : undefined,
          department: usesDepartments && selectedSpecializations.length > 0 ? specialization : undefined,
        });
        if (!result.success) {
          setError(result.error ?? 'تعذر إنشاء الحساب.');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compute dynamic WhatsApp support link from Firestore settings/platform (supportWhatsappNumber)
  const rawWhatsapp =
    db.supportWhatsappNumber ||
    db.paymentSettings?.whatsappNumber ||
    db.teacherCV?.whatsapp ||
    '07848333046';
  const whatsappSupportUrl = buildWhatsappSupportUrl(
    rawWhatsapp,
    'مرحباً، أحتاج إلى مساعدة بخصوص منصة الأستاذة تبارك الزيرجاوي التعليمية.'
  );

  const featureCards = [
    {
      title: 'محاضرات مسجلة عالية الدقة',
      subtitle: 'شرح منهجي مرتّب لكل مرحلة وصف بجودة فائقة',
      icon: PlayCircle,
      accent: 'from-purple-500/25 to-violet-600/25 border-purple-400/35 text-purple-300',
    },
    {
      title: 'كوزات مؤقتة وبث مباشر تفاعلي',
      subtitle: 'اختبارات فورية بوقت محدد وقاعات بث مباشر أسبوعية',
      icon: Radio,
      accent: 'from-fuchsia-500/25 to-purple-600/25 border-fuchsia-400/35 text-fuchsia-300',
    },
    {
      title: 'ملازم محمية ومتابعة مستمرة',
      subtitle: 'ملفات وملازم حصرية محمية مع متابعة دورية للمستوى',
      icon: BookOpen,
      accent: 'from-violet-500/25 to-indigo-600/25 border-violet-400/35 text-violet-300',
    },
  ];

  // Dedicated Teacher & Moderators Admin Portal (/admin or VITE_APP_MODE=admin)
  if (isAdminPortal) {
    return (
      <div className="min-h-[100dvh] bg-[#090712] text-white relative overflow-hidden flex flex-col justify-between">
        {/* Ambient Purple Glows */}
        <div
          className="pointer-events-none fixed inset-0 overflow-hidden"
          aria-hidden="true"
        >
          <div className="absolute -top-32 right-1/4 h-[420px] w-[420px] rounded-full bg-purple-600/25 blur-[120px]" />
          <div className="absolute bottom-0 left-1/5 h-[380px] w-[380px] rounded-full bg-fuchsia-600/15 blur-[120px]" />
        </div>

        <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:px-8">
          <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            {/* Admin Identity Showcase */}
            <aside className="lg:col-span-6 space-y-6">
              <div className="flex items-center gap-3.5">
                <img
                  src="/pwa-192x192.png"
                  alt="منصة الأستاذة تبارك الزيرجاوي"
                  className="h-14 w-14 rounded-2xl border border-purple-400/50 shadow-[0_0_28px_-4px_rgba(168,85,247,0.75)] object-cover shrink-0"
                />
                <div>
                  <h1 className="text-lg sm:text-xl font-black text-white">
                    منصة الأستاذة تبارك الزيرجاوي
                  </h1>
                  <p className="text-xs font-bold text-purple-300 mt-0.5">
                    بوابة الإدارة الأكاديمية والمشرفين
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-purple-500/15 border border-purple-400/35 px-3 py-1 text-xs font-bold text-purple-200">
                  <Sparkles className="h-3.5 w-3.5 text-fuchsia-400" />
                  <span>لوحة التحكم المركزية الآمنة</span>
                </span>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black leading-snug text-white">
                  إدارة الدورات، الكوزات المؤقّتة، أكواد التفعيل، واستوديو البث المباشر
                </h2>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                  بوابة الويب المستقلة المخصصة للأستاذة تبارك والمشرفين المصرّح لهم لإدارة جميع المراحل الدراسية والطلاب وفك قفل الأجهزة بمرونة وأمان كامل.
                </p>
              </div>

              <div className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-purple-500/20 p-4 flex items-center gap-3 text-xs text-slate-300">
                <ShieldCheck className="h-5 w-5 text-purple-400 shrink-0" />
                <span>دخول محصور بحساب السوبر أدمن (الأستاذة تبارك) والمشرفين المعتمدين فقط</span>
              </div>
            </aside>

            {/* Admin Dark Glassmorphism Login Card */}
            <main className="lg:col-span-6">
              <div className="rounded-2xl bg-white/[0.05] backdrop-blur-xl border border-purple-500/25 hover:border-purple-400/45 transition-colors p-6 sm:p-8 shadow-[0_24px_64px_-20px_rgba(124,58,237,0.45)]">
                <div className="mb-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 via-violet-600 to-fuchsia-600 text-white shadow-[0_0_24px_-4px_rgba(168,85,247,0.75)]">
                    <KeyRound className="h-6 w-6" />
                  </div>
                  <h2 className="text-xl font-black text-white">
                    بوابة الإدارة والمشرفين — الأستاذة تبارك
                  </h2>
                  <p className="mt-1 text-sm text-slate-300">
                    أدخلي رقم الهاتف الإداري أو اسم المستخدم وكلمة المرور الخاصة بكِ للدخول إلى لوحة التحكم.
                  </p>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="mb-5 flex items-start gap-2.5 rounded-xl bg-rose-500/15 border border-rose-400/40 px-4 py-3 text-sm text-rose-200"
                  >
                    <AlertTriangle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
                    <span className="whitespace-pre-line break-words leading-relaxed">{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="admin-phone"
                      className="block text-sm font-bold text-slate-200 mb-1.5"
                    >
                      رقم الهاتف أو اسم المستخدم
                    </label>
                    <div className="relative">
                      <input
                        id="admin-phone"
                        type="text"
                        dir="ltr"
                        autoComplete="username"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="07848333046 أو mod1"
                        className="w-full min-h-[48px] rounded-xl border border-purple-500/25 bg-[#110D1F]/80 pl-11 pr-4 text-left font-mono text-sm font-medium text-white tabular-nums placeholder:text-slate-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
                      />
                      <Smartphone className="h-4 w-4 text-purple-300/70 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="admin-password"
                      className="block text-sm font-bold text-slate-200 mb-1.5"
                    >
                      كلمة المرور أو الرمز السري للأستاذة
                    </label>
                    <div className="relative">
                      <input
                        id="admin-password"
                        type={showPassword ? 'text' : 'password'}
                        dir="ltr"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full min-h-[48px] rounded-xl border border-purple-500/25 bg-[#110D1F]/80 pl-11 pr-4 text-left text-sm text-white placeholder:text-slate-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                        className="absolute left-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full min-h-[50px] mt-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-black text-white shadow-[0_10px_28px_-6px_rgba(147,51,234,0.75)] hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer"
                  >
                    <span>{isSubmitting ? 'جاري التحقق...' : 'دخول إلى لوحة التحكم'}</span>
                    <ArrowLeft className="h-4 w-4 text-purple-100" />
                  </button>
                </form>
              </div>
            </main>
          </div>
        </div>

        {/* Clean Bottom Bar */}
        <footer className="relative z-10 border-t border-purple-500/20 bg-[#110D1F]/70 backdrop-blur-xl px-4 py-3.5 text-center text-xs text-slate-400">
          منصة الأستاذة تبارك الزيرجاوي التعليمية · جميع الحقوق محفوظة
        </footer>
      </div>
    );
  }

  // Dedicated Student App Login & Registration Landing Screen — Dark Luxury Purple & Glassmorphism
  return (
    <div className="min-h-[100dvh] bg-[#090712] text-white relative overflow-x-hidden flex flex-col justify-between">
      {/* Ambient Radial Purple / Violet Glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-36 right-[-10%] h-[440px] w-[440px] rounded-full bg-purple-600/25 blur-[130px]" />
        <div className="absolute top-1/3 left-[-8%] h-[360px] w-[360px] rounded-full bg-fuchsia-600/15 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-1/3 h-[340px] w-[340px] rounded-full bg-violet-700/20 blur-[120px]" />
      </div>

      {/* Top Navigation / Brand Bar */}
      <header className="relative z-10 w-full border-b border-purple-500/15 bg-[#110D1F]/65 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/pwa-192x192.png"
              alt="أيقونة منصة الأستاذة تبارك الزيرجاوي"
              className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl border border-purple-400/50 shadow-[0_0_24px_-4px_rgba(168,85,247,0.75)] object-cover shrink-0"
            />
            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg font-black tracking-tight text-white truncate">
                منصة الأستاذة تبارك الزيرجاوي
              </h1>
              <p className="text-[11px] sm:text-xs text-purple-300 font-semibold truncate">
                التعليم الإلكتروني التفاعلي المحمي للطلبة
              </p>
            </div>
          </div>

          <PWAInstallButton variant="header" />
        </div>
      </header>

      {/* Main Content Area — Perfectly Balanced on Desktop & Mobile with ZERO Empty Bottom Void */}
      <div className="relative z-10 flex-1 flex flex-col justify-center w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 gap-6 lg:gap-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
          {/* Right Hero Column (RTL First) */}
          <section className="lg:col-span-6 space-y-5">
            <div className="inline-flex items-center gap-2 rounded-2xl bg-purple-500/15 border border-purple-400/35 px-3.5 py-1.5 text-xs font-extrabold text-purple-200 shadow-[0_0_24px_-8px_rgba(168,85,247,0.65)]">
              <Sparkles className="h-3.5 w-3.5 text-fuchsia-400 shrink-0" />
              <span>مسارات وأقسام دراسية معزولة ومنظمة لكل مرحلة</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black leading-[1.35] text-white">
              تفوّقك الدراسي يبدأ من{' '}
              <span className="bg-gradient-to-l from-purple-300 via-fuchsia-300 to-violet-400 bg-clip-text text-transparent">
                منصة الأستاذة تبارك
              </span>
            </h2>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
              بيئة تعليمية فاخرة مخصصة لكل مرحلة دراسية وصف وفرع مهني أو قسم جامعي، تجمع المحاضرات المسجّلة والملازم المحمية والكوزات المؤقّتة والبث المباشر التفاعلي في مكان واحد.
            </p>

            {/* Dynamic Tracks Glass Pills Grid */}
            {availableTracks.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                {availableTracks.slice(0, 6).map((item, idx) => {
                  const specs = item.branches ?? item.departments ?? [];
                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-purple-500/20 hover:border-purple-400/45 transition-all p-3"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-black text-white truncate">
                          {item.shortLabel || item.label}
                        </span>
                        <span className="font-mono text-[10px] font-bold text-purple-300 tabular-nums">
                          0{idx + 1}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                        {specs.length > 0
                          ? `${item.subStages.slice(0, 2).join(' · ')} — ${specs.slice(0, 3).join('، ')}`
                          : item.subStages.slice(0, 3).join(' · ')}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Security & Device Binding Compact Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#110D1F]/70 border border-purple-500/20 px-4 py-2.5 text-[11px] text-slate-300">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-purple-400 shrink-0" />
                <span>حماية قفل الجهاز ومنع التصوير مفعّلة تلقائياً</span>
              </div>
              <span
                className="font-mono text-[10px] text-purple-300/80 tabular-nums"
                dir="ltr"
              >
                {currentDeviceId}
              </span>
            </div>
          </section>

          {/* Left Glassmorphism Auth Form Column */}
          <main className="lg:col-span-6 w-full max-w-lg mx-auto lg:mr-auto lg:ml-0">
            {deviceLockViolation ? (
              <div className="rounded-2xl bg-[#110D1F]/90 backdrop-blur-2xl border border-rose-500/40 p-6 sm:p-7 shadow-[0_24px_64px_-20px_rgba(244,63,94,0.35)]">
                <div className="flex items-center gap-3 text-rose-300 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 border border-rose-400/35 text-rose-400 shrink-0">
                    <ShieldAlert className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">
                      تم حظر الدخول — الجهاز غير مطابق
                    </h2>
                    <p className="text-xs text-rose-300 font-semibold">
                      حماية قفل الجهاز (Device ID Binding)
                    </p>
                  </div>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed">
                  مرحباً <span className="font-bold text-white">{deviceLockViolation.studentName}</span>، حسابك مرتبط بجهاز هاتف آخر لحماية اشتراكك ومنع مشاركة الحساب. إذا قمت بتغيير هاتفك، يرجى التواصل مع{' '}
                  <span className="font-bold text-purple-300">الأستاذة تبارك الزيرجاوي</span> لفك قفل الجهاز.
                </p>

                <div className="mt-5 rounded-2xl bg-white/[0.04] border border-purple-500/20 p-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">رقم الهاتف المسجّل</span>
                    <span className="font-mono font-semibold text-white tabular-nums" dir="ltr">
                      {deviceLockViolation.phone}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-purple-500/15 pt-2">
                    <span className="text-slate-400">معرّف الجهاز المرتبط بالحساب</span>
                    <span className="font-mono font-semibold text-rose-300 tabular-nums" dir="ltr">
                      {deviceLockViolation.registeredDeviceId}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-purple-500/15 pt-2">
                    <span className="text-slate-400">معرّف جهازك الحالي</span>
                    <span className="font-mono font-semibold text-purple-200 tabular-nums" dir="ltr">
                      {deviceLockViolation.attemptedDeviceId}
                    </span>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    type="button"
                    onClick={clearDeviceLockViolation}
                    className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 px-4 py-2.5 text-sm font-black text-white shadow-[0_8px_24px_-6px_rgba(147,51,234,0.75)] hover:brightness-110 transition-all cursor-pointer"
                  >
                    <span>العودة لتسجيل الدخول</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative rounded-2xl bg-white/[0.05] backdrop-blur-2xl border border-purple-500/25 hover:border-purple-400/45 transition-colors p-5 sm:p-7 shadow-[0_24px_70px_-20px_rgba(124,58,237,0.45)]">
                {/* Segmented Mode Switch */}
                <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl bg-[#110D1F]/90 border border-purple-500/20 mb-5">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError(null);
                    }}
                    className={`min-h-[44px] rounded-xl text-xs sm:text-sm font-black transition-all whitespace-nowrap cursor-pointer ${
                      mode === 'login'
                        ? 'bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 text-white shadow-[0_6px_20px_-4px_rgba(147,51,234,0.75)]'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    تسجيل الدخول
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setError(null);
                    }}
                    className={`min-h-[44px] rounded-xl text-xs sm:text-sm font-black transition-all whitespace-nowrap cursor-pointer ${
                      mode === 'register'
                        ? 'bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 text-white shadow-[0_6px_20px_-4px_rgba(147,51,234,0.75)]'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    إنشاء حساب طالب
                  </button>
                </div>

                <div className="mb-5">
                  <h2 className="text-lg sm:text-xl font-black text-white">
                    {mode === 'login' ? 'مرحباً بعودتك إلى المنصة' : 'تسجيل طالب جديد'}
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-slate-300">
                    {mode === 'login'
                      ? 'أدخل رقم هاتفك العراقي وكلمة المرور للوصول إلى محاضراتك.'
                      : 'اختر مرحلتك الدراسية بدقة لعرض الدورات والملازم الخاصة بك فقط.'}
                  </p>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="mb-4 flex items-start gap-2.5 rounded-xl bg-rose-500/15 border border-rose-400/40 px-4 py-3 text-xs sm:text-sm text-rose-200"
                  >
                    <AlertTriangle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
                    <span className="whitespace-pre-line break-words leading-relaxed">{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {mode === 'register' && (
                    <div>
                      <label htmlFor="fullName" className="block text-xs sm:text-sm font-bold text-slate-200 mb-1.5">
                        الاسم الثلاثي الكامل
                      </label>
                      <input
                        id="fullName"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="مثال: سجاد كريم المالكي"
                        className="w-full min-h-[46px] rounded-xl border border-purple-500/25 bg-[#110D1F]/80 px-4 text-sm text-white placeholder:text-slate-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
                      />
                    </div>
                  )}

                  <div>
                    <label htmlFor="phone" className="block text-xs sm:text-sm font-bold text-slate-200 mb-1.5">
                      رقم الهاتف العراقي (يبدأ بـ 07)
                    </label>
                    <div className="relative">
                      <input
                        id="phone"
                        type="tel"
                        inputMode="numeric"
                        dir="ltr"
                        maxLength={11}
                        value={phone}
                        onChange={(e) => setPhone(normalizeArabicPhoneDigits(e.target.value).slice(0, 11))}
                        placeholder="07809876543"
                        className="w-full min-h-[46px] rounded-xl border border-purple-500/25 bg-[#110D1F]/80 pl-11 pr-4 text-left font-mono text-sm font-medium text-white tabular-nums placeholder:text-slate-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
                      />
                      <Smartphone className="h-4 w-4 text-purple-300/70 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {mode === 'register' && (
                    <div>
                      <label
                        htmlFor="parentPhone"
                        className="block text-xs sm:text-sm font-bold text-slate-200 mb-1.5"
                      >
                        رقم هاتف ولي الأمر — واتساب{' '}
                        <span className="text-[11px] font-normal text-slate-400">(اختياري لمتابعة المستوى)</span>
                      </label>
                      <div className="relative">
                        <input
                          id="parentPhone"
                          type="tel"
                          inputMode="numeric"
                          dir="ltr"
                          maxLength={11}
                          value={parentPhone}
                          onChange={(e) =>
                            setParentPhone(normalizeArabicPhoneDigits(e.target.value).slice(0, 11))
                          }
                          placeholder="07701234567"
                          className="w-full min-h-[46px] rounded-xl border border-purple-500/25 bg-[#110D1F]/80 pl-11 pr-4 text-left font-mono text-sm font-medium text-white tabular-nums placeholder:text-slate-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
                        />
                        <Smartphone className="h-4 w-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  )}

                  <div>
                    <label htmlFor="password" className="block text-xs sm:text-sm font-bold text-slate-200 mb-1.5">
                      كلمة المرور
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        dir="ltr"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full min-h-[46px] rounded-xl border border-purple-500/25 bg-[#110D1F]/80 pl-11 pr-4 text-left text-sm text-white placeholder:text-slate-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                        className="absolute left-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {mode === 'register' && selectedTrackOption && (
                    <div className="space-y-3.5 pt-2 border-t border-purple-500/20">
                      <div>
                        <span className="block text-xs sm:text-sm font-bold text-slate-200 mb-2">
                          اختر المسار الدراسي الرئيسي
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {availableTracks.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => handleTrackChange(option.id)}
                              className={`min-h-[44px] rounded-xl border px-2.5 py-2 text-xs font-extrabold transition-all text-center cursor-pointer ${
                                track === option.id
                                  ? 'border-purple-400 bg-gradient-to-l from-purple-600/80 to-fuchsia-600/80 text-white shadow-[0_0_18px_-4px_rgba(168,85,247,0.75)]'
                                  : 'border-purple-500/20 bg-white/[0.04] text-slate-300 hover:border-purple-400/50 hover:text-white'
                              }`}
                            >
                              {option.shortLabel}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className={selectedSpecializations.length === 0 ? 'sm:col-span-2' : ''}>
                          <label htmlFor="subStage" className="block text-xs font-bold text-slate-300 mb-1.5">
                            {track === 'vocational'
                              ? 'الصف المهني (السادس المهني وزاري)'
                              : track === 'university'
                                ? 'المرحلة الجامعية'
                                : 'الصف الدراسي'}
                          </label>
                          <select
                            id="subStage"
                            value={subStage}
                            onChange={(e) => setSubStage(e.target.value)}
                            className="w-full min-h-[44px] rounded-xl border border-purple-500/25 bg-[#110D1F] px-3 text-sm font-medium text-white focus:border-purple-400 focus:outline-none"
                          >
                            {selectedTrackOption.subStages.map((stage) => (
                              <option key={stage} value={stage}>
                                {stage}
                              </option>
                            ))}
                          </select>
                        </div>

                        {selectedSpecializations.length > 0 && (
                          <div>
                            <label htmlFor="specialization" className="block text-xs font-bold text-slate-300 mb-1.5">
                              {selectedTrackOption.specializationLabel ||
                                (usesDepartments ? 'القسم الجامعي' : 'الفرع / التخصص')}
                            </label>
                            <select
                              id="specialization"
                              value={specialization}
                              onChange={(e) => setSpecialization(e.target.value)}
                              className="w-full min-h-[44px] rounded-xl border border-purple-500/25 bg-[#110D1F] px-3 text-sm font-medium text-white focus:border-purple-400 focus:outline-none"
                            >
                              {selectedSpecializations.map((spec) => (
                                <option key={spec} value={spec}>
                                  {spec}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full min-h-[50px] mt-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-black text-white shadow-[0_10px_28px_-6px_rgba(147,51,234,0.8)] hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer"
                  >
                    <span>
                      {isSubmitting
                        ? 'جاري التحقق...'
                        : mode === 'login'
                          ? 'دخول إلى المنصة'
                          : 'إنشاء الحساب وربط الجهاز'}
                    </span>
                    <ArrowLeft className="h-4 w-4 text-purple-100" />
                  </button>
                </form>
              </div>
            )}
          </main>
        </div>

        {/* 3 Compact, Glowing Horizontal Feature Cards — Fills Lower Viewport Purposefully */}
        <section
          aria-label="مميزات منصة الأستاذة تبارك الزيرجاوي"
          className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4"
        >
          {featureCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="group relative rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 hover:border-purple-400/55 p-4 flex items-center gap-3.5 transition-all shadow-[0_10px_30px_-14px_rgba(124,58,237,0.35)] hover:shadow-[0_14px_38px_-12px_rgba(168,85,247,0.5)]"
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br border ${card.accent} shadow-inner`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-black text-white leading-snug">
                    {card.title}
                  </h3>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                    {card.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </section>
      </div>

      {/* Clean Bottom Bar — WhatsApp Support + Glowing Install App Button */}
      <footer className="relative z-10 w-full border-t border-purple-500/20 bg-[#110D1F]/80 backdrop-blur-xl pb-safe">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-slate-300">
            <span className="h-2 w-2 rounded-full bg-purple-400 shadow-[0_0_10px_#A855F7]" />
            <span className="font-bold text-white">منصة الأستاذة تبارك الزيرجاوي</span>
            <span className="hidden sm:inline text-slate-500">·</span>
            <span className="hidden sm:inline text-slate-400">دعم فني مباشر للطلبة</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 w-full sm:w-auto">
            <a
              href={whatsappSupportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-extrabold text-emerald-100 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/35 hover:border-emerald-300/60 shadow-[0_0_20px_-6px_rgba(16,185,129,0.5)] transition-all"
            >
              <MessageCircle className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>تواصل مع الدعم (واتساب)</span>
            </a>

            <PWAInstallButton variant="banner" />
          </div>
        </div>
      </footer>
    </div>
  );
};
