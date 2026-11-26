import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Smartphone,
  GraduationCap,
  AlertTriangle,
  ArrowLeft,
  Eye,
  EyeOff,
  ShieldAlert,
  KeyRound,
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { HERO_BANNER_IMAGE } from '../../services/supabase';
import { normalizeArabicPhoneDigits } from '../../services/deviceLock';
import { TrackId } from '../../types';
import { SafeImage } from '../common/SafeImage';
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

  // Dedicated Teacher & Moderators Admin Portal (/admin or VITE_APP_MODE=admin)
  if (isAdminPortal) {
    return (
      <div className="min-h-[100dvh] bg-[#080E1E] flex flex-col lg:grid lg:grid-cols-12 overflow-x-hidden">
        <aside className="relative lg:col-span-5 xl:col-span-6 bg-[#0F172A] text-white overflow-hidden flex flex-col justify-between p-6 sm:p-10 lg:p-12 pt-safe">
          <SafeImage
            src={HERO_BANNER_IMAGE}
            alt="بوابة إدارة منصة الأستاذة تبارك الأزيرجاوي"
            fallbackTitle="بوابة إدارة الأستاذة تبارك الأزيرجاوي"
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080E1E] via-[#0F172A]/90 to-[#0F172A]/75" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B48A1E] text-slate-950 shadow-lg">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-white">
                منصة الأستاذة تبارك الأزيرجاوي
              </h1>
              <p className="text-xs text-[#D4AF37] font-bold">
                بوابة الإدارة الأكاديمية الخاصة (Web)
              </p>
            </div>
          </div>

          <div className="relative z-10 my-8 lg:my-0 max-w-xl space-y-4">
            <p className="text-xs font-bold text-[#D4AF37]">لوحة التحكم المركزية للأستاذة</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-snug text-white">
              إدارة الدورات، الكوزات المؤقّتة، أكواد التفعيل، واستوديو البث المباشر
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-reading">
              نسخة الويب المستقلة المخصصة للأستاذة تبارك لإدارة جميع المسارات الدراسية (المتوسطة، السادس المهني بفروعه، والكلية) ومتابعة الطلاب وفك قفل الأجهزة.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-2 border-t border-white/10 pt-4 text-xs text-slate-300">
            <ShieldCheck className="h-4 w-4 text-[#D4AF37] shrink-0" />
            <span>دخول محصور بحساب الأستاذة تبارك الأزيرجاوي فقط</span>
          </div>
        </aside>

        <main className="lg:col-span-7 xl:col-span-6 bg-slate-50 flex flex-col justify-center px-5 py-8 sm:px-10 lg:px-14 pb-safe">
          <div className="w-full max-w-md mx-auto rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm">
            <div className="mb-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0F172A] text-[#D4AF37]">
                <KeyRound className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900">
                بوابة الإدارة والمشرفين — الأستاذة تبارك
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                أدخلي رقم الهاتف الإداري أو اسم المستخدم وكلمة المرور الخاصة بكِ للدخول إلى لوحة التحكم.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800"
              >
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="admin-phone" className="block text-sm font-semibold text-slate-700 mb-1.5">
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
                    placeholder="07701234567 أو mod1"
                    className="w-full min-h-[46px] rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-left font-mono text-sm font-medium text-slate-900 tabular-nums focus:border-[#0F172A] focus:outline-none focus:ring-2 focus:ring-amber-500/25"
                  />
                  <Smartphone className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label htmlFor="admin-password" className="block text-sm font-semibold text-slate-700 mb-1.5">
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
                    className="w-full min-h-[46px] rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-left text-sm text-slate-900 focus:border-[#0F172A] focus:outline-none focus:ring-2 focus:ring-amber-500/25"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    className="absolute left-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[48px] mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F172A] px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 transition-colors disabled:opacity-60"
              >
                <span>{isSubmitting ? 'جاري التحقق...' : 'دخول إلى لوحة التحكم'}</span>
                <ArrowLeft className="h-4 w-4 text-[#D4AF37]" />
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  // Dedicated Student App Login & Registration Screen — ZERO Admin Controls
  return (
    <div className="min-h-[100dvh] bg-slate-950 flex flex-col lg:grid lg:grid-cols-12 overflow-x-hidden">
      {/* Right Showcase Column (RTL First) */}
      <aside className="relative lg:col-span-5 xl:col-span-6 bg-[#0F172A] text-white overflow-hidden flex flex-col justify-between p-6 sm:p-10 lg:p-12 pt-safe">
        <SafeImage
          src={HERO_BANNER_IMAGE}
          alt="قاعة منصة الأستاذة تبارك الأزيرجاوي"
          fallbackTitle="منصة الأستاذة تبارك الأزيرجاوي"
          className="absolute inset-0 h-full w-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080E1E] via-[#0F172A]/85 to-[#0F172A]/70" />

        {/* Brand Identity + PWA Install Button */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B48A1E] text-slate-950 shadow-lg shadow-amber-950/30">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
                منصة الأستاذة تبارك الأزيرجاوي
              </h1>
              <p className="text-xs text-amber-300/90 font-medium">
                التعليم الإلكتروني التفاعلي المحمي للطلبة
              </p>
            </div>
          </div>
          <PWAInstallButton variant="card" />
        </div>

        {/* Main Academic Value Statement */}
        <div className="relative z-10 my-8 lg:my-0 max-w-xl">
          <p className="text-xs font-semibold text-[#D4AF37] mb-3">
            مسارات وأقسام دراسية معزولة ومنظمة لكل مرحلة
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-snug text-white">
            محاضرات مسجّلة، ملازم محمية، كوزات مؤقّتة، وبث مباشر تفاعلي
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed font-reading">
            بيئة دراسية مخصصة لكل مرحلة دراسية وصف وفرع مهني أو قسم جامعي تضيفه الأستاذة تبارك، مع اختبارات إلكترونية فورية وجدول بث أسبوعي ومتابعة لولي الأمر.
          </p>

          {/* Dynamic Tracks Overview */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-white/10 pt-6">
            {availableTracks.slice(0, 6).map((item, idx) => {
              const specs = item.branches ?? item.departments ?? [];
              return (
                <div key={item.id} className="space-y-1">
                  <p className="text-xs font-bold text-[#D4AF37] tabular-nums">0{idx + 1}.</p>
                  <p className="text-sm font-bold text-white">{item.label}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {specs.length > 0
                      ? `${item.subStages.slice(0, 2).join(' · ')} — ${specs.slice(0, 4).join('، ')}`
                      : item.subStages.slice(0, 3).join(' · ')}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Device & Privacy Footer Info */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#D4AF37] shrink-0" />
            <span>حماية قفل الجهاز ومنع التصوير مفعّلة</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-slate-400 tabular-nums" dir="ltr">
            <span>{currentDeviceId}</span>
          </div>
        </div>
      </aside>

      {/* Left Student Form Column */}
      <main className="lg:col-span-7 xl:col-span-6 bg-slate-50 flex flex-col justify-center px-5 py-8 sm:px-10 lg:px-14 pb-safe">
        <div className="w-full max-w-lg mx-auto">
          {/* Device Lock Protection Alert Screen (Pure Student Notice — no Admin button) */}
          {deviceLockViolation ? (
            <div className="rounded-2xl bg-white border border-red-200 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-3 text-red-700 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 shrink-0">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    تم حظر الدخول — الجهاز غير مطابق
                  </h2>
                  <p className="text-xs text-red-700 font-medium">
                    حماية قفل الجهاز (Device ID Binding)
                  </p>
                </div>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed font-reading">
                مرحباً <span className="font-bold text-slate-900">{deviceLockViolation.studentName}</span>، حسابك مرتبط بجهاز هاتف آخر لحماية اشتراكك ومنع مشاركة الحساب. إذا قمت بتغيير هاتفك، يرجى التواصل مع{' '}
                <span className="font-bold text-slate-900">الأستاذة تبارك الأزيرجاوي</span> لفك قفل الجهاز.
              </p>

              <div className="mt-5 rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">رقم الهاتف المسجّل</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums" dir="ltr">
                    {deviceLockViolation.phone}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-2">
                  <span className="text-slate-500">معرّف الجهاز المرتبط بالحساب</span>
                  <span className="font-mono font-semibold text-red-700 tabular-nums" dir="ltr">
                    {deviceLockViolation.registeredDeviceId}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-2">
                  <span className="text-slate-500">معرّف جهازك الحالي</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums" dir="ltr">
                    {deviceLockViolation.attemptedDeviceId}
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={clearDeviceLockViolation}
                  className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F172A] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-800"
                >
                  <span>العودة لتسجيل الدخول</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-slate-200/90 p-6 sm:p-8 shadow-sm">
              {/* Segmented Mode Switch */}
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className={`min-h-[44px] rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${
                    mode === 'login'
                      ? 'bg-[#0F172A] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
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
                  className={`min-h-[44px] rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${
                    mode === 'register'
                      ? 'bg-[#0F172A] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  إنشاء حساب طالب
                </button>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-extrabold text-slate-900">
                  {mode === 'login' ? 'مرحباً بعودتك إلى المنصة' : 'تسجيل طالب جديد'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {mode === 'login'
                    ? 'أدخل رقم هاتفك العراقي وكلمة المرور للوصول إلى محاضراتك.'
                    : 'اختر مرحلتك الدراسية بدقة لعرض الدورات والملازم الخاصة بك فقط.'}
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-5 flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800"
                >
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-semibold text-slate-700 mb-1.5">
                      الاسم الثلاثي الكامل
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="مثال: سجاد كريم المالكي"
                      className="w-full min-h-[46px] rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0F172A] focus:outline-none focus:ring-2 focus:ring-amber-500/25"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="phone" className="block text-sm font-semibold text-slate-700 mb-1.5">
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
                      className="w-full min-h-[46px] rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-left font-mono text-sm font-medium text-slate-900 tabular-nums placeholder:text-slate-400 focus:border-[#0F172A] focus:outline-none focus:ring-2 focus:ring-amber-500/25"
                    />
                    <Smartphone className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {mode === 'register' && (
                  <div>
                    <label
                      htmlFor="parentPhone"
                      className="block text-sm font-semibold text-slate-700 mb-1.5"
                    >
                      رقم هاتف ولي الأمر — واتساب{' '}
                      <span className="text-xs font-normal text-slate-400">(اختياري لمتابعة المستوى)</span>
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
                        className="w-full min-h-[46px] rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-left font-mono text-sm font-medium text-slate-900 tabular-nums placeholder:text-slate-400 focus:border-[#0F172A] focus:outline-none focus:ring-2 focus:ring-amber-500/25"
                      />
                      <Smartphone className="h-4 w-4 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1.5">
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
                      className="w-full min-h-[46px] rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-left text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0F172A] focus:outline-none focus:ring-2 focus:ring-amber-500/25"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                      className="absolute left-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {mode === 'register' && selectedTrackOption && (
                  <div className="space-y-4 pt-2 border-t border-slate-100">
                    <div>
                      <span className="block text-sm font-semibold text-slate-700 mb-2">
                        اختر المسار الدراسي الرئيسي
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {availableTracks.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => handleTrackChange(option.id)}
                            className={`min-h-[46px] rounded-xl border px-2 py-2 text-xs font-bold transition-colors text-center ${
                              track === option.id
                                ? 'border-[#0F172A] bg-[#0F172A] text-white'
                                : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            {option.shortLabel}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className={selectedSpecializations.length === 0 ? 'sm:col-span-2' : ''}>
                        <label htmlFor="subStage" className="block text-xs font-semibold text-slate-600 mb-1.5">
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
                          className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 focus:border-[#0F172A] focus:outline-none"
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
                          <label htmlFor="specialization" className="block text-xs font-semibold text-slate-600 mb-1.5">
                            {selectedTrackOption.specializationLabel ||
                              (usesDepartments ? 'القسم الجامعي' : 'الفرع / التخصص')}
                          </label>
                          <select
                            id="specialization"
                            value={specialization}
                            onChange={(e) => setSpecialization(e.target.value)}
                            className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 focus:border-[#0F172A] focus:outline-none"
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
                  className="w-full min-h-[48px] mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F172A] px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-slate-800 active:scale-[0.99] disabled:opacity-60"
                >
                  <span>
                    {isSubmitting
                      ? 'جاري التحقق...'
                      : mode === 'login'
                        ? 'دخول إلى المنصة'
                        : 'إنشاء الحساب وربط الجهاز'}
                  </span>
                  <ArrowLeft className="h-4 w-4 text-[#D4AF37]" />
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
