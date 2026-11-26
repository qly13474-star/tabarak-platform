import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  ImagePlus,
  Lock,
  MessageCircle,
  Send,
  XCircle,
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import {
  buildWhatsAppPaymentUrl,
  evaluateStudentSubscription,
  formatIqd,
} from '../../utils/subscription';
import { PlatformSubPageBar } from '../common/PlatformThemeUI';

interface StudentPaymentViewProps {
  onBack?: () => void;
}

export const StudentPaymentView: React.FC<StudentPaymentViewProps> = ({ onBack }) => {
  const { db, currentUser, submitRenewalRequest } = usePlatform();
  const [copiedCard, setCopiedCard] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string>('');
  const [note, setNote] = useState('');
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const myRequests = useMemo(() => {
    if (!currentUser) return [];
    return db.renewalRequests.filter((r) => r.studentId === currentUser.id);
  }, [db.renewalRequests, currentUser]);

  if (!currentUser) return null;

  const settings = db.paymentSettings;
  const sub = evaluateStudentSubscription(
    currentUser.subscriptionDueDate,
    settings.gracePeriodDays
  );
  const whatsappUrl = buildWhatsAppPaymentUrl(settings, currentUser, sub.dueDate);

  const handleCopyCard = async () => {
    try {
      await navigator.clipboard.writeText(settings.cardNumber.replace(/\s+/g, ''));
      setCopiedCard(true);
      window.setTimeout(() => setCopiedCard(false), 2500);
    } catch {
      setCopiedCard(true);
      window.setTimeout(() => setCopiedCard(false), 2500);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setReceiptPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAttachSampleReceipt = () => {
    const svgData =
      'data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="260" viewBox="0 0 440 260">
          <rect width="440" height="260" rx="14" fill="#0F172A"/>
          <rect x="14" y="14" width="412" height="232" rx="10" fill="#FFFFFF"/>
          <rect x="14" y="14" width="412" height="50" rx="10" fill="#0F172A"/>
          <text x="404" y="45" text-anchor="end" font-family="sans-serif" font-size="15" font-weight="bold" fill="#D4AF37">وصل تحويل اشتراك شهري</text>
          <text x="404" y="96" text-anchor="end" font-family="sans-serif" font-size="20" font-weight="bold" fill="#0F172A">${formatIqd(settings.monthlyFeeIqd)}</text>
          <text x="404" y="132" text-anchor="end" font-family="sans-serif" font-size="13" fill="#334155">الطالب: ${currentUser.fullName}</text>
          <text x="404" y="160" text-anchor="end" font-family="sans-serif" font-size="12" fill="#475569">إلى: ${settings.cardHolderName}</text>
          <text x="404" y="210" text-anchor="end" font-family="monospace" font-size="11" fill="#059669">REF #IQ-${Date.now().toString().slice(-6)}</text>
        </svg>`
      );
    setReceiptPreview(svgData);
    setReceiptFileName('transfer-receipt-sample.png');
  };

  const handleSubmitReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptPreview) return;
    submitRenewalRequest({
      receiptImageDataUrl: receiptPreview,
      receiptFileName,
      note,
    });
    setReceiptPreview(null);
    setReceiptFileName('');
    setNote('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setUploadFeedback(
      'تم إرسال صورة وصل التحويل إلى الأستاذة تبارك بنجاح! سيُحدَّث اشتراكك تلقائياً فور الموافقة.'
    );
    window.setTimeout(() => setUploadFeedback(null), 5000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {onBack && (
        <PlatformSubPageBar onBack={onBack} sectionLabel="الدفع والاشتراك الشهري" />
      )}
      {/* Status Header Banner */}
      <section
        className={`rounded-2xl border p-5 sm:p-6 space-y-4 ${
          sub.status === 'locked'
            ? 'bg-red-50 border-red-300'
            : sub.status === 'grace_period'
              ? 'bg-orange-50 border-orange-300'
              : sub.status === 'expiring_soon'
                ? 'bg-amber-50 border-amber-300'
                : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-extrabold">
              {sub.status === 'locked' ? (
                <span className="inline-flex items-center gap-1.5 text-red-700">
                  <Lock className="h-4 w-4" />
                  <span>حالة الاشتراك: منتهي ومقفول</span>
                </span>
              ) : sub.status === 'grace_period' ? (
                <span className="inline-flex items-center gap-1.5 text-orange-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span>حالة الاشتراك: فترة السماح الإضافية (5 أيام)</span>
                </span>
              ) : sub.status === 'expiring_soon' ? (
                <span className="inline-flex items-center gap-1.5 text-amber-800">
                  <Clock className="h-4 w-4" />
                  <span>حالة الاشتراك: ينتهي قريباً</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>حالة الاشتراك: نشط ومفعّل</span>
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              الدفع الشهري وتجديد الاشتراك
            </h1>
            <p className="text-xs sm:text-sm text-slate-700 font-reading">{sub.shortHint}</p>
          </div>

          <div className="text-right sm:text-left shrink-0">
            <span className="block text-xs text-slate-500">قيمة الاشتراك الشهري</span>
            <strong className="font-mono text-xl sm:text-2xl font-extrabold text-[#0F172A] tabular-nums">
              {formatIqd(settings.monthlyFeeIqd)}
            </strong>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-black/10 text-xs">
          <div className="rounded-xl bg-white/90 border border-slate-200/80 p-3.5">
            <span className="block text-slate-500">تاريخ الاستحقاق (المحدد من الأستاذة)</span>
            <strong
              className="mt-1 inline-flex items-center gap-1.5 font-mono text-sm font-extrabold text-slate-900 tabular-nums"
              dir="ltr"
            >
              <Calendar className="h-3.5 w-3.5 text-[#B48A1E]" />
              {sub.dueDate}
            </strong>
          </div>

          <div className="rounded-xl bg-white/90 border border-slate-200/80 p-3.5">
            <span className="block text-slate-500">نهاية مهلة السماح (+5 أيام / 35 يوماً)</span>
            <strong
              className="mt-1 block font-mono text-sm font-extrabold text-slate-900 tabular-nums"
              dir="ltr"
            >
              {sub.graceEndDate}
            </strong>
          </div>

          <div className="rounded-xl bg-white/90 border border-slate-200/80 p-3.5">
            <span className="block text-slate-500">الأيام المتبقية</span>
            <strong
              className={`mt-1 block text-sm font-extrabold tabular-nums ${
                sub.isLocked
                  ? 'text-red-700'
                  : sub.status === 'grace_period'
                    ? 'text-orange-700'
                    : sub.status === 'expiring_soon'
                      ? 'text-amber-700'
                      : 'text-emerald-700'
              }`}
            >
              {sub.isLocked
                ? '0 أيام (مقفول تلقائياً)'
                : sub.status === 'grace_period'
                  ? `${sub.graceDaysRemaining} أيام متبقية في مهلة السماح`
                  : `${sub.daysUntilDue} أيام على الاستحقاق`}
            </strong>
          </div>
        </div>
      </section>

      {/* MasterCard Card + One-Tap Copy + WhatsApp CTA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Royal Navy & Gold MasterCard Box */}
        <section className="lg:col-span-7 rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#1B2B4B] to-[#080E1E] text-white p-6 border border-[#D4AF37]/50 shadow-lg flex flex-col justify-between gap-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-[#D4AF37]">بيانات التحويل الرسمية</p>
              <h2 className="mt-0.5 text-base font-extrabold text-white">{settings.cardType}</h2>
            </div>
            <CreditCard className="h-6 w-6 text-[#D4AF37] shrink-0" />
          </div>

          <div className="rounded-xl bg-white/10 border border-white/15 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="block text-[11px] text-slate-300">رقم بطاقة الأستاذة تبارك</span>
              <p
                className="mt-1 font-mono text-lg sm:text-2xl font-extrabold tracking-widest text-white tabular-nums text-left"
                dir="ltr"
              >
                {settings.cardNumber}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyCard}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#D4AF37] to-[#F59E0B] px-4 text-xs sm:text-sm font-extrabold text-slate-950 hover:brightness-105 whitespace-nowrap shrink-0"
            >
              {copiedCard ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>تم النسخ ✓</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>نسخ الرقم</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 text-xs border-t border-white/10 pt-4">
            <div>
              <span className="block text-slate-400">اسم صاحب البطاقة</span>
              <strong className="text-sm font-bold text-white">{settings.cardHolderName}</strong>
            </div>
            <div className="text-left">
              <span className="block text-slate-400">واتساب الأستاذة الرسمي</span>
              <strong className="font-mono text-sm font-bold text-amber-300 tabular-nums" dir="ltr">
                {settings.whatsappNumber}
              </strong>
            </div>
          </div>
        </section>

        {/* Direct WhatsApp Verification Card */}
        <section className="lg:col-span-5 rounded-2xl bg-white border border-slate-200 p-6 flex flex-col justify-between gap-5">
          <div className="space-y-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <MessageCircle className="h-6 w-6" />
            </div>
            <h2 className="text-base font-extrabold text-slate-900">
              إرسال صورة الوصل عبر الواتساب
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-reading leading-relaxed">
              بعد التحويل على رقم البطاقة، اضغط على الزر بالأسفل لفتح محادثة الواتساب الرسمية للأستاذة تبارك مع رسالة جاهزة تحتوي تلقائياً على اسمك الثلاثي، رقم هاتفك، ومرحلتك الدراسية.
            </p>
          </div>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-extrabold text-white hover:bg-emerald-700 transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            <span>إرسال صورة التحويل عبر الواتساب</span>
          </a>
        </section>
      </div>

      {/* In-App Receipt Upload Form */}
      <section className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              رفع صورة وصل التحويل من داخل التطبيق
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              يصل الوصل مباشرة إلى قسم «طلبات التجديد» في لوحة تحكم الأستاذة تبارك للموافقة وتجديد اشتراكك.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAttachSampleReceipt}
            className="min-h-[36px] rounded-xl bg-amber-50 border border-amber-300 px-3 text-xs font-extrabold text-slate-900 hover:bg-amber-100 whitespace-nowrap"
          >
            إرفاق وصل تجريبي سريع
          </button>
        </div>

        {uploadFeedback && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs sm:text-sm font-semibold text-emerald-900"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{uploadFeedback}</span>
          </div>
        )}

        <form onSubmit={handleSubmitReceipt} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="receipt-file-upload"
              />
              <label
                htmlFor="receipt-file-upload"
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:border-[#0F172A] hover:bg-slate-100/70 transition-colors p-6 cursor-pointer text-center min-h-[150px]"
              >
                <ImagePlus className="h-7 w-7 text-[#B48A1E]" />
                <span className="text-xs sm:text-sm font-extrabold text-slate-800">
                  {receiptFileName || 'اضغط لاختيار صورة وصل التحويل من جهازك'}
                </span>
                <span className="text-[11px] text-slate-500">PNG / JPG · لقطة شاشة سوبر كي أو زين كاش</span>
              </label>
            </div>

            {receiptPreview ? (
              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-900">
                <img
                  src={receiptPreview}
                  alt="معاينة صورة الوصل"
                  className="w-full h-[150px] object-cover"
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 min-h-[150px] flex flex-col justify-center text-xs text-slate-500 space-y-1.5">
                <p className="font-bold text-slate-700">تلميح سريع:</p>
                <p>
                  احرص على أن يكون رقم العملية والمبلغ وتاريخ التحويل واضحة في الصورة لتسريع موافقة الأستاذة وتجديد حسابك فوراً.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="ملاحظة اختيارية (مثلاً: رقم العملية أو اسم المرسل)"
              className="flex-1 min-h-[46px] rounded-xl border border-slate-300 px-4 text-sm focus:border-[#0F172A] focus:outline-none"
            />
            <button
              type="submit"
              disabled={!receiptPreview}
              className="min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F172A] px-6 text-sm font-extrabold text-white hover:bg-slate-800 disabled:opacity-40 whitespace-nowrap"
            >
              <Send className="h-4 w-4 text-[#D4AF37]" />
              <span>رفع وصل التحويل للأستاذة</span>
            </button>
          </div>
        </form>
      </section>

      {/* Student Renewal Request History */}
      {myRequests.length > 0 && (
        <section className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 text-xs font-extrabold text-slate-900">
            سجل طلبات التجديد الخاصة بك ({myRequests.length})
          </div>
          <div className="divide-y divide-slate-100">
            {myRequests.map((req) => (
              <div
                key={req.id}
                className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <p className="font-extrabold text-slate-900">
                    طلب تجديد بقيمة {formatIqd(req.amountIqd)}
                  </p>
                  <p className="text-slate-500 font-mono tabular-nums" dir="ltr">
                    {req.submittedAt}
                  </p>
                </div>

                {req.status === 'pending' ? (
                  <span className="inline-flex items-center gap-1 font-extrabold text-amber-700">
                    <Clock className="h-3.5 w-3.5" />
                    <span>قيد المراجعة من الأستاذة</span>
                  </span>
                ) : req.status === 'approved' ? (
                  <span className="inline-flex items-center gap-1 font-extrabold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>تمت الموافقة والتجديد حتى {req.newDueDate}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-extrabold text-red-700">
                    <XCircle className="h-3.5 w-3.5" />
                    <span>مرفوض — يرجى إعادة إرسال الوصل</span>
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
