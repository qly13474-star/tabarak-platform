import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  FileImage,
  Lock,
  RefreshCw,
  Save,
  Smartphone,
  XCircle,
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import {
  computeNextMonthDueDate,
  evaluateStudentSubscription,
  formatIqd,
  SubscriptionStatusKind,
} from '../../utils/subscription';

type PaymentsTab = 'requests' | 'settings' | 'subscriptions';

export const AdminPayments: React.FC = () => {
  const {
    db,
    getTrackName,
    updatePaymentSettings,
    updateStudentDueDate,
    renewStudentSubscription,
    approveRenewalRequest,
    rejectRenewalRequest,
  } = usePlatform();

  const pendingRequests = useMemo(
    () => db.renewalRequests.filter((r) => r.status === 'pending'),
    [db.renewalRequests]
  );

  const [activeTab, setActiveTab] = useState<PaymentsTab>(
    pendingRequests.length > 0 ? 'requests' : 'settings'
  );

  // Payment Settings Form State
  const [cardNumber, setCardNumber] = useState(db.paymentSettings.cardNumber);
  const [cardType, setCardType] = useState(db.paymentSettings.cardType);
  const [cardHolderName, setCardHolderName] = useState(db.paymentSettings.cardHolderName);
  const [whatsappNumber, setWhatsappNumber] = useState(db.paymentSettings.whatsappNumber);
  const [monthlyFeeIqd, setMonthlyFeeIqd] = useState<number>(db.paymentSettings.monthlyFeeIqd);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Per-request custom due date override state
  const [customApproveDates, setCustomApproveDates] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<'all' | SubscriptionStatusKind>('all');
  const [expandedReceiptUrl, setExpandedReceiptUrl] = useState<string | null>(null);

  const students = useMemo(
    () => db.users.filter((u) => u.role === 'student'),
    [db.users]
  );

  const evaluatedStudents = useMemo(
    () =>
      students.map((s) => ({
        student: s,
        sub: evaluateStudentSubscription(
          s.subscriptionDueDate,
          db.paymentSettings.gracePeriodDays
        ),
      })),
    [students, db.paymentSettings.gracePeriodDays]
  );

  const statusCounts = useMemo(() => {
    return {
      all: evaluatedStudents.length,
      active: evaluatedStudents.filter((x) => x.sub.status === 'active').length,
      expiring_soon: evaluatedStudents.filter((x) => x.sub.status === 'expiring_soon').length,
      grace_period: evaluatedStudents.filter((x) => x.sub.status === 'grace_period').length,
      locked: evaluatedStudents.filter((x) => x.sub.status === 'locked').length,
    };
  }, [evaluatedStudents]);

  const filteredStudents = useMemo(() => {
    if (statusFilter === 'all') return evaluatedStudents;
    return evaluatedStudents.filter((x) => x.sub.status === statusFilter);
  }, [evaluatedStudents, statusFilter]);

  const showToast = (msg: string) => {
    setFeedback(msg);
    window.setTimeout(() => setFeedback(null), 4500);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updatePaymentSettings({
      cardNumber: cardNumber.trim() || db.paymentSettings.cardNumber,
      cardType: cardType.trim() || 'ماستر كارد / سوبر كي',
      cardHolderName: cardHolderName.trim() || 'تبارك الأزيرجاوي',
      whatsappNumber: whatsappNumber.replace(/\D/g, '').slice(0, 14) || db.paymentSettings.whatsappNumber,
      monthlyFeeIqd: Math.max(1000, Number(monthlyFeeIqd) || 50000),
    });
    showToast('تم حفظ إعدادات الدفع الشهري وتحديثها فوراً لدى جميع الطلاب في التطبيق.');
  };

  const handleApprove = (requestId: string, studentName: string, currentDue?: string) => {
    const chosenDate = customApproveDates[requestId] || computeNextMonthDueDate(currentDue);
    approveRenewalRequest(requestId, chosenDate);
    showToast(`تمت الموافقة وتجديد اشتراك «${studentName}» حتى تاريخ ${chosenDate} بنجاح.`);
  };

  const handleReject = (requestId: string, studentName: string) => {
    rejectRenewalRequest(requestId);
    showToast(`تم رفض طلب التجديد الخاص بالطالب «${studentName}».`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-[#B48A1E]">
            الاشتراكات الشهرية · مهلة السماح 5 أيام (35 يوماً قبل القفل التلقائي)
          </p>
          <h1 className="mt-1 text-xl sm:text-2xl font-extrabold text-slate-900">
            إعدادات الدفع والاشتراكات الشهرية
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            إدارة رقم الماستر كارد والواتساب الرسمي، مراجعة وصولات التحويل المرفوعة من الطلبة، وتحديد تواريخ الاستحقاق يدوياً.
          </p>
        </div>

        {/* Sub-tabs Switcher */}
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-200/80 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`min-h-[42px] inline-flex items-center gap-1.5 rounded-lg px-3.5 text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'requests'
                ? 'bg-[#0F172A] text-white'
                : 'text-slate-700 hover:text-slate-950'
            }`}
          >
            <FileImage className="h-3.5 w-3.5 text-[#D4AF37]" />
            <span>طلبات التجديد</span>
            {pendingRequests.length > 0 && (
              <span className="min-w-[20px] h-5 px-1 rounded-full bg-red-600 text-[10px] font-extrabold text-white flex items-center justify-center font-mono tabular-nums">
                {pendingRequests.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`min-h-[42px] inline-flex items-center gap-1.5 rounded-lg px-3.5 text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'settings'
                ? 'bg-[#0F172A] text-white'
                : 'text-slate-700 hover:text-slate-950'
            }`}
          >
            <CreditCard className="h-3.5 w-3.5 text-[#D4AF37]" />
            <span>إعدادات البطاقة والواتساب</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('subscriptions')}
            className={`min-h-[42px] inline-flex items-center gap-1.5 rounded-lg px-3.5 text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'subscriptions'
                ? 'bg-[#0F172A] text-white'
                : 'text-slate-700 hover:text-slate-950'
            }`}
          >
            <Calendar className="h-3.5 w-3.5 text-[#D4AF37]" />
            <span>متابعة الاشتراكات ({statusCounts.locked + statusCounts.grace_period} تنبيه)</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs sm:text-sm font-semibold text-emerald-900"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{feedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs text-emerald-700 hover:underline shrink-0"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* TAB 1: Renewal Requests & Receipts */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {db.renewalRequests.length === 0 ? (
            <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center text-sm text-slate-500">
              لا توجد طلبات تجديد أو وصولات تحويل مرفوعة حتى الآن.
            </div>
          ) : (
            db.renewalRequests.map((req) => {
              const student = db.users.find((u) => u.id === req.studentId);
              const defaultNextDate = computeNextMonthDueDate(student?.subscriptionDueDate);
              const chosenDate = customApproveDates[req.id] ?? defaultNextDate;

              return (
                <article
                  key={req.id}
                  className="rounded-2xl bg-white border border-slate-200 p-5 flex flex-col lg:flex-row gap-5"
                >
                  {/* Receipt Thumbnail */}
                  <button
                    type="button"
                    onClick={() => setExpandedReceiptUrl(req.receiptImageDataUrl)}
                    className="w-full lg:w-64 aspect-[16/10] rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shrink-0 hover:opacity-95 transition-opacity text-right"
                    title="اضغطي لتكبير صورة الوصل"
                  >
                    <img
                      src={req.receiptImageDataUrl}
                      alt={`وصل تحويل ${req.studentName}`}
                      className="h-full w-full object-cover"
                    />
                  </button>

                  {/* Request Info & Approval Actions */}
                  <div className="flex-1 flex flex-col justify-between gap-4 min-w-0">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {req.status === 'pending' ? (
                            <span className="inline-flex items-center gap-1 font-extrabold text-amber-700">
                              <Clock className="h-3.5 w-3.5" />
                              <span>بانتظار المراجعة</span>
                            </span>
                          ) : req.status === 'approved' ? (
                            <span className="inline-flex items-center gap-1 font-extrabold text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>تمت الموافقة والتجديد حتى {req.newDueDate}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-extrabold text-red-700">
                              <XCircle className="h-3.5 w-3.5" />
                              <span>تم الرفض</span>
                            </span>
                          )}
                          <span className="text-slate-300">·</span>
                          <span className="font-mono text-slate-500 tabular-nums" dir="ltr">
                            {req.submittedAt}
                          </span>
                        </div>
                        <span className="font-mono text-sm font-extrabold text-[#0F172A] tabular-nums">
                          {formatIqd(req.amountIqd)}
                        </span>
                      </div>

                      <h3 className="text-base font-extrabold text-slate-900">{req.studentName}</h3>
                      <p className="text-xs text-slate-600">
                        <span className="font-mono font-bold text-slate-800" dir="ltr">
                          {req.studentPhone}
                        </span>{' '}
                        · {req.trackLabel} · {req.subStage}
                      </p>
                      {req.note && (
                        <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-reading">
                          ملاحظة الطالب: {req.note}
                        </p>
                      )}
                    </div>

                    {req.status === 'pending' && (
                      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                        <div className="space-y-1">
                          <label className="block text-[11px] font-bold text-slate-600">
                            تاريخ الاستحقاق الجديد بعد التجديد:
                          </label>
                          <input
                            type="date"
                            dir="ltr"
                            value={chosenDate}
                            onChange={(e) =>
                              setCustomApproveDates((prev) => ({
                                ...prev,
                                [req.id]: e.target.value,
                              }))
                            }
                            className="min-h-[40px] rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs font-bold text-slate-900 tabular-nums"
                          />
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              handleApprove(req.id, req.studentName, student?.subscriptionDueDate)
                            }
                            className="min-h-[42px] inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-extrabold text-white hover:bg-emerald-700 whitespace-nowrap"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            <span>موافقة وتجديد</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(req.id, req.studentName)}
                            className="min-h-[42px] inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 text-xs font-extrabold text-red-700 hover:bg-red-100 whitespace-nowrap"
                          >
                            <XCircle className="h-4 w-4" />
                            <span>رفض</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: MasterCard / SuperKey / WhatsApp Settings */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleSaveSettings}
            className="lg:col-span-7 rounded-2xl bg-white border border-slate-200 p-5 sm:p-6 space-y-4"
          >
            <h2 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3">
              بيانات استلام الدفع الشهري (تظهر في تطبيق الطالب)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  نوع البطاقة / المحفظة (ماستر كارد / سوبر كي / زين كاش)
                </label>
                <input
                  type="text"
                  value={cardType}
                  onChange={(e) => setCardType(e.target.value)}
                  placeholder="ماستر كارد الرافدين / سوبر كي (QiCard)"
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-sm font-semibold focus:border-[#0F172A] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  رقم حساب الماستر كارد أو المحفظة
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="5399 4810 2274 8891"
                  className="w-full min-h-[46px] rounded-xl border border-slate-300 px-4 text-left font-mono text-base font-extrabold tracking-wider text-slate-900 tabular-nums focus:border-[#0F172A] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  اسم صاحب البطاقة
                </label>
                <input
                  type="text"
                  value={cardHolderName}
                  onChange={(e) => setCardHolderName(e.target.value)}
                  placeholder="تبارك الأزيرجاوي"
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-sm font-semibold focus:border-[#0F172A] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  رقم الواتساب الرسمي لاستلام الوصولات
                </label>
                <input
                  type="tel"
                  dir="ltr"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, '').slice(0, 14))}
                  placeholder="07701234567"
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-left font-mono text-sm font-bold text-slate-900 tabular-nums focus:border-[#0F172A] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  قيمة الاشتراك الشهري الافتراضية (بالدينار العراقي د.ع)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1000}
                    step={5000}
                    value={monthlyFeeIqd}
                    onChange={(e) => setMonthlyFeeIqd(Number(e.target.value))}
                    className="flex-1 min-h-[46px] rounded-xl border border-slate-300 px-4 font-mono text-base font-extrabold text-slate-900 tabular-nums focus:border-[#0F172A] focus:outline-none"
                  />
                  <span className="text-sm font-bold text-slate-600 whitespace-nowrap">
                    دينار عراقي ({formatIqd(monthlyFeeIqd)})
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-900">سياسة مهلة السماح والقفل التلقائي:</strong> يظهر تنبيه أصفر للطالب قبل 3 أيام من الاستحقاق، ثم يُمنح <strong className="text-slate-900">5 أيام مهلة سماح إضافية</strong> (المجموع 35 يوماً)، وبعد انتهاء المهلة يُقفل الدخول للبث والمحاضرات تلقائياً حتى التجديد.
            </div>

            <button
              type="submit"
              className="min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#D4AF37] to-[#F59E0B] px-6 text-sm font-extrabold text-slate-950 hover:brightness-105"
            >
              <Save className="h-4 w-4" />
              <span>حفظ إعدادات الدفع الشهري</span>
            </button>
          </form>

          {/* Live Card Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#080E1E] text-white p-6 border border-[#D4AF37]/50 shadow-lg space-y-6">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-bold text-[#D4AF37]">معاينة بطاقة التحويل للطالب</p>
                  <p className="text-xs text-slate-300 mt-0.5">{cardType}</p>
                </div>
                <CreditCard className="h-6 w-6 text-[#D4AF37]" />
              </div>

              <div className="py-2">
                <p
                  className="font-mono text-xl sm:text-2xl font-extrabold tracking-widest text-white tabular-nums text-left"
                  dir="ltr"
                >
                  {cardNumber || '---- ---- ---- ----'}
                </p>
              </div>

              <div className="flex items-end justify-between gap-4 border-t border-white/10 pt-4 text-xs">
                <div>
                  <span className="block text-[10px] text-slate-400">اسم صاحب البطاقة</span>
                  <strong className="text-sm font-extrabold text-white">{cardHolderName}</strong>
                </div>
                <div className="text-left">
                  <span className="block text-[10px] text-slate-400">الاشتراك الشهري</span>
                  <strong className="font-mono text-sm font-extrabold text-[#D4AF37] tabular-nums">
                    {formatIqd(monthlyFeeIqd)}
                  </strong>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-4 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <Smartphone className="h-4 w-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="block text-slate-500">رقم الواتساب الرسمي للوصولات</span>
                  <strong className="font-mono text-sm text-slate-900 tabular-nums" dir="ltr">
                    {whatsappNumber}
                  </strong>
                </div>
              </div>
              <span className="font-bold text-emerald-700">مرتبط بتطبيق الطالب</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Quick Subscription Dates & Statuses Overview */}
      {activeTab === 'subscriptions' && (
        <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'all', label: `الكل (${statusCounts.all})` },
                { id: 'active', label: `نشط (${statusCounts.active})` },
                { id: 'expiring_soon', label: `ينتهي قريباً (${statusCounts.expiring_soon})` },
                { id: 'grace_period', label: `مهلة السماح 5 أيام (${statusCounts.grace_period})` },
                { id: 'locked', label: `منتهي ومقفول (${statusCounts.locked})` },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`min-h-[38px] rounded-xl px-3 text-xs font-bold whitespace-nowrap ${
                  statusFilter === f.id
                    ? 'bg-[#0F172A] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
                  <th className="py-3 px-4">الطالب</th>
                  <th className="py-3 px-4">تاريخ الاستحقاق (يدوي)</th>
                  <th className="py-3 px-4">نهاية مهلة الـ 5 أيام</th>
                  <th className="py-3 px-4">حالة الاشتراك</th>
                  <th className="py-3 px-4 text-left">تجديد سريع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map(({ student, sub }) => (
                  <tr key={student.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4">
                      <p className="text-xs sm:text-sm font-bold text-slate-900">
                        {student.fullName}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        <span className="font-mono" dir="ltr">
                          {student.phone}
                        </span>{' '}
                        · {getTrackName(student.track)} · {student.subStage}
                      </p>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <input
                        type="date"
                        dir="ltr"
                        value={sub.dueDate}
                        onChange={(e) => {
                          updateStudentDueDate(student.id, e.target.value);
                          showToast(
                            `تم تحديث تاريخ استحقاق «${student.fullName}» إلى ${e.target.value}.`
                          );
                        }}
                        className="min-h-[38px] rounded-lg border border-slate-300 bg-white px-2.5 font-mono text-xs font-bold text-slate-900 tabular-nums"
                      />
                    </td>

                    <td
                      className="py-3.5 px-4 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap"
                      dir="ltr"
                    >
                      {sub.graceEndDate}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <SubscriptionStatusText status={sub.status} label={sub.label} hint={sub.shortHint} />
                    </td>

                    <td className="py-3.5 px-4 text-left whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          const next = renewStudentSubscription(student.id);
                          showToast(`تم تجديد اشتراك «${student.fullName}» حتى ${next} (+شهر).`);
                        }}
                        className="min-h-[36px] inline-flex items-center gap-1.5 rounded-lg bg-[#0F172A] px-3 text-xs font-bold text-white hover:bg-slate-800 whitespace-nowrap"
                      >
                        <RefreshCw className="h-3.5 w-3.5 text-[#D4AF37]" />
                        <span>تجديد (+شهر)</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lightbox for Enlarged Receipt Image */}
      {expandedReceiptUrl && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4"
          onClick={() => setExpandedReceiptUrl(null)}
        >
          <div
            className="max-w-xl w-full rounded-2xl bg-white p-3 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={expandedReceiptUrl}
              alt="معاينة وصل التحويل"
              className="w-full rounded-xl max-h-[70vh] object-contain bg-slate-950"
            />
            <button
              type="button"
              onClick={() => setExpandedReceiptUrl(null)}
              className="w-full min-h-[42px] rounded-xl bg-[#0F172A] text-xs font-bold text-white"
            >
              إغلاق المعاينة
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const SubscriptionStatusText: React.FC<{
  status: SubscriptionStatusKind;
  label: string;
  hint: string;
}> = ({ status, label, hint }) => {
  if (status === 'active') {
    return (
      <div>
        <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>{label}</span>
        </span>
        <p className="text-[11px] text-slate-500">{hint}</p>
      </div>
    );
  }
  if (status === 'expiring_soon') {
    return (
      <div>
        <span className="inline-flex items-center gap-1 text-xs font-extrabold text-amber-700">
          <Clock className="h-3.5 w-3.5" />
          <span>{label}</span>
        </span>
        <p className="text-[11px] text-amber-800">{hint}</p>
      </div>
    );
  }
  if (status === 'grace_period') {
    return (
      <div>
        <span className="inline-flex items-center gap-1 text-xs font-extrabold text-orange-700">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>{label}</span>
        </span>
        <p className="text-[11px] text-orange-800">{hint}</p>
      </div>
    );
  }
  return (
    <div>
      <span className="inline-flex items-center gap-1 text-xs font-extrabold text-red-700">
        <Lock className="h-3.5 w-3.5" />
        <span>{label}</span>
      </span>
      <p className="text-[11px] text-red-700">{hint}</p>
    </div>
  );
};
