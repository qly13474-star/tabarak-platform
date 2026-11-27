import React, { useMemo, useState } from 'react';
import {
  Search,
  Smartphone,
  RotateCcw,
  Ban,
  CheckCircle2,
  ShieldAlert,
  Clock,
  AlertTriangle,
  Lock,
  RefreshCw,
  Trash2,
  MessageCircle,
  Phone,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { TrackId } from '../../types';
import {
  computeNextMonthDueDate,
  evaluateStudentSubscription,
} from '../../utils/subscription';
import {
  buildParentWhatsAppReportUrl,
  computeStudentPerformance,
} from '../../utils/parentReport';
import { SecurityPinModal } from './SecurityPinModal';

export const AdminStudents: React.FC = () => {
  const {
    db,
    getTrackName,
    toggleStudentActive,
    resetStudentDevice,
    updateStudentProfile,
    deleteStudent,
    updateStudentDueDate,
    renewStudentSubscription,
    updateStudentParentPhone,
  } = usePlatform();
  const [searchPhone, setSearchPhone] = useState('');
  const [trackFilter, setTrackFilter] = useState<'all' | 'vocational6' | TrackId>('all');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [renewingStudentId, setRenewingStudentId] = useState<string | null>(null);
  const [customRenewDate, setCustomRenewDate] = useState<string>('');
  const [editingParentId, setEditingParentId] = useState<string | null>(null);
  const [parentPhoneDraft, setParentPhoneDraft] = useState<string>('');
  const [parentPhoneError, setParentPhoneError] = useState<string | null>(null);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editStudentName, setEditStudentName] = useState('');
  const [editStudentPhone, setEditStudentPhone] = useState('');
  const [editStudentTrack, setEditStudentTrack] = useState<TrackId>('vocational');
  const [editStudentSubStage, setEditStudentSubStage] = useState('');
  const [editStudentBranch, setEditStudentBranch] = useState('');
  const [editStudentError, setEditStudentError] = useState<string | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<{ id: string; name: string; phone: string } | null>(null);

  const students = useMemo(() => {
    const q = searchPhone.trim().toLowerCase();
    return db.users
      .filter((u) => u.role === 'student')
      .filter((u) => {
        if (trackFilter === 'all') return true;
        if (trackFilter === 'vocational6') {
          return u.track === 'vocational' && u.subStage.includes('السادس المهني');
        }
        return u.track === trackFilter;
      })
      .filter((u) => {
        if (!q) return true;
        return (
          u.phone.includes(q) ||
          u.fullName.toLowerCase().includes(q) ||
          (u.branch ?? '').toLowerCase().includes(q)
        );
      });
  }, [db.users, searchPhone, trackFilter]);

  const showToast = (msg: string) => {
    setActionFeedback(msg);
    window.setTimeout(() => setActionFeedback(null), 4500);
  };

  const handleResetDevice = (studentId: string, name: string) => {
    resetStudentDevice(studentId);
    showToast(`تم فك قفل الجهاز للطالب «${name}». يمكنه الآن الدخول من هاتفه الجديد.`);
  };

  const handleToggleStatus = (studentId: string, name: string, currentlyActive: boolean) => {
    toggleStudentActive(studentId);
    showToast(
      currentlyActive ? `تم حظر حساب الطالب «${name}» مؤقتاً.` : `تم تفعيل حساب الطالب «${name}» بنجاح.`
    );
  };

  const handleQuickAddMonth = (studentId: string, name: string) => {
    const nextDate = renewStudentSubscription(studentId);
    setRenewingStudentId(null);
    showToast(`تم تجديد اشتراك الطالب «${name}» لمدة شهر جديد حتى تاريخ ${nextDate}.`);
  };

  const handleSaveCustomRenew = (studentId: string, name: string) => {
    if (!customRenewDate) return;
    const nextDate = renewStudentSubscription(studentId, customRenewDate);
    setRenewingStudentId(null);
    showToast(`تم تجديد اشتراك الطالب «${name}» وتعيين الاستحقاق الجديد إلى ${nextDate}.`);
  };

  const handleSaveParentPhone = (studentId: string, name: string) => {
    setParentPhoneError(null);
    const res = updateStudentParentPhone(studentId, parentPhoneDraft);
    if (!res.success) {
      setParentPhoneError(res.error ?? 'رقم غير صحيح');
      return;
    }
    setEditingParentId(null);
    showToast(`تم حفظ رقم ولي أمر الطالب «${name}» بنجاح.`);
  };

  const openEditStudentRow = (studentId: string) => {
    const stu = db.users.find((u) => u.id === studentId);
    if (!stu) return;
    setEditingStudentId(stu.id);
    setEditStudentName(stu.fullName);
    setEditStudentPhone(stu.phone);
    setEditStudentTrack(stu.track);
    setEditStudentSubStage(stu.subStage);
    setEditStudentBranch(stu.branch ?? stu.department ?? '');
    setEditStudentError(null);
  };

  const handleSaveStudentEdit = (studentId: string) => {
    setEditStudentError(null);
    const trackObj = db.tracks.find((t) => t.id === editStudentTrack);
    const usesDept = !trackObj?.branches && Boolean(trackObj?.departments);
    const res = updateStudentProfile(studentId, {
      fullName: editStudentName,
      phone: editStudentPhone,
      track: editStudentTrack,
      subStage: editStudentSubStage,
      branch: !usesDept ? editStudentBranch : '',
      department: usesDept ? editStudentBranch : '',
    });
    if (!res.success) {
      setEditStudentError(res.error ?? 'تعذر حفظ التعديلات.');
      return;
    }
    setEditingStudentId(null);
    showToast(`تم تحديث بيانات الطالب «${editStudentName.trim()}» وحفظها بنجاح.`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white">
          إدارة الطلاب، الحضور وتقارير أولياء الأمور، والاشتراكات
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          تابعي حضور وغياب كل طالب ودرجات كوزاته، أرسلي تقرير ولي الأمر عبر واتساب بضغطة زر، وحدّدي مواعيد الدفع وفك قفل الأجهزة.
        </p>
      </div>

      {actionFeedback && (
        <div
          role="status"
          className="rounded-xl bg-emerald-500/15 border border-emerald-400/35 px-4 py-3 text-xs sm:text-sm font-semibold text-emerald-200"
        >
          {actionFeedback}
        </div>
      )}

      <div className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 overflow-hidden">
        {/* Search & Track Filter Bar */}
        <div className="p-4 border-b border-purple-500/20 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'جميع المراحل' },
              ...(db.tracks.some((t) => t.id === 'vocational')
                ? [{ id: 'vocational6', label: 'السادس المهني (وزاري)' }]
                : []),
              ...db.tracks.map((t) => ({ id: t.id, label: t.shortLabel || t.label })),
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTrackFilter(item.id)}
                className={`min-h-[40px] rounded-xl px-3.5 text-xs font-bold transition-colors whitespace-nowrap ${
                  trackFilter === item.id
                    ? 'bg-[#110D1F] text-white'
                    : 'bg-white/[0.06] text-slate-200 hover:bg-white/15'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-72">
            <input
              type="text"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              placeholder="بحث برقم الهاتف (07...) أو الاسم"
              className="w-full min-h-[42px] rounded-xl border border-purple-500/25 bg-white/[0.04] pr-9 pl-3 text-xs text-white focus:border-purple-400 focus:bg-[#161029] focus:outline-none"
            />
            <Search className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Students Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-sm">
            <thead>
              <tr className="border-b border-purple-500/20 bg-white/[0.04] text-xs font-bold text-slate-300">
                <th className="py-3 px-4">الطالب والمسار</th>
                <th className="py-3 px-4">الحضور والمستوى وولي الأمر</th>
                <th className="py-3 px-4">تاريخ الاستحقاق (يدوي)</th>
                <th className="py-3 px-4">حالة الاشتراك (+5 أيام سماح)</th>
                <th className="py-3 px-4">الجهاز</th>
                <th className="py-3 px-4 text-left">التحكم والتجديد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-500/15">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-slate-400">
                    لا يوجد طلاب مطابقون للبحث الحالي.
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  const sub = evaluateStudentSubscription(
                    student.subscriptionDueDate,
                    db.paymentSettings.gracePeriodDays
                  );
                  const isRenewingThis = renewingStudentId === student.id;
                  const perf = computeStudentPerformance(
                    student,
                    db.attendanceRecords,
                    db.quizAttempts,
                    db.liveQuizResults
                  );
                  const parentReportUrl = student.parentPhone
                    ? buildParentWhatsAppReportUrl(
                        student.parentPhone,
                        student,
                        getTrackName(student.track),
                        perf
                      )
                    : null;
                  const isEditingParent = editingParentId === student.id;

                  return (
                    <React.Fragment key={student.id}>
                      <tr className="hover:bg-white/[0.06]">
                        <td className="py-3.5 px-4">
                          <p className="text-xs sm:text-sm font-bold text-white">
                            {student.fullName}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            <span className="font-mono font-semibold text-slate-200" dir="ltr">
                              {student.phone}
                            </span>{' '}
                            · {getTrackName(student.track)} · {student.subStage}
                            {student.branch ? ` (${student.branch})` : ''}
                            {student.department ? ` (${student.department})` : ''}
                          </p>
                        </td>

                        {/* Attendance, Quiz Performance & Parent WhatsApp */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-xs tabular-nums">
                              <span className="font-bold text-emerald-300">
                                حضور {perf.attendedCount}
                              </span>
                              <span className="text-slate-300">·</span>
                              <span
                                className={`font-bold ${
                                  perf.absentCount > 0 ? 'text-purple-300' : 'text-slate-400'
                                }`}
                              >
                                غياب {perf.absentCount}
                              </span>
                              <span className="text-slate-300">·</span>
                              <span className="font-mono font-extrabold text-white">
                                {perf.averageScorePercentage !== null
                                  ? `${perf.averageScorePercentage}%`
                                  : '—'}
                              </span>
                            </div>

                            {isEditingParent ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="tel"
                                    dir="ltr"
                                    value={parentPhoneDraft}
                                    onChange={(e) => setParentPhoneDraft(e.target.value)}
                                    placeholder="07XXXXXXXXX"
                                    className="w-32 min-h-[30px] rounded-lg border border-purple-500/25 bg-white/[0.045] backdrop-blur-xl px-2 font-mono text-xs text-white"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSaveParentPhone(student.id, student.fullName)
                                    }
                                    aria-label="حفظ رقم ولي الأمر"
                                    className="h-7 w-7 inline-flex items-center justify-center rounded-lg bg-emerald-600 text-white"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingParentId(null);
                                      setParentPhoneError(null);
                                    }}
                                    aria-label="إلغاء"
                                    className="h-7 w-7 inline-flex items-center justify-center rounded-lg border border-purple-500/25 bg-white/[0.045] backdrop-blur-xl text-slate-300"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                {parentPhoneError && (
                                  <p className="text-[10px] font-bold text-rose-300 whitespace-normal max-w-[200px]">
                                    {parentPhoneError}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                                <Phone className="h-3 w-3 text-purple-300 shrink-0" />
                                <span className="font-mono" dir="ltr">
                                  {student.parentPhone || 'بدون رقم ولي أمر'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingParentId(student.id);
                                    setParentPhoneDraft(student.parentPhone ?? '');
                                    setParentPhoneError(null);
                                  }}
                                  className="text-slate-400 hover:text-white p-0.5"
                                  aria-label={`تعديل رقم ولي أمر ${student.fullName}`}
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                              </div>
                            )}

                            {parentReportUrl ? (
                              <a
                                href={parentReportUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="min-h-[32px] inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 text-[11px] font-extrabold text-white hover:bg-emerald-700 transition-colors"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                                <span>إرسال تقرير لولي الأمر (واتساب)</span>
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingParentId(student.id);
                                  setParentPhoneDraft('');
                                  setParentPhoneError(null);
                                }}
                                className="text-[11px] font-bold text-purple-300 hover:underline"
                              >
                                + إضافة رقم واتساب ولي الأمر
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Manual Date Picker + Auto Grace End Date */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <input
                              type="date"
                              dir="ltr"
                              value={sub.dueDate}
                              onChange={(e) => {
                                updateStudentDueDate(student.id, e.target.value);
                                showToast(
                                  `تم تعديل موعد دفع «${student.fullName}» إلى ${e.target.value}.`
                                );
                              }}
                              aria-label={`تاريخ استحقاق ${student.fullName}`}
                              className="min-h-[36px] rounded-lg border border-purple-500/25 bg-[#110D1F]/85 px-2.5 font-mono text-xs font-bold text-white tabular-nums focus:border-purple-400 focus:outline-none"
                            />
                            <p className="text-[10px] text-slate-400 font-mono tabular-nums">
                              نهاية السماح (35 يوم): <span dir="ltr">{sub.graceEndDate}</span>
                            </p>
                          </div>
                        </td>

                        {/* Clear Subscription Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="space-y-0.5">
                            {sub.status === 'active' && (
                              <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-300">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>نشط</span>
                              </span>
                            )}
                            {sub.status === 'expiring_soon' && (
                              <span className="inline-flex items-center gap-1 text-xs font-extrabold text-amber-300">
                                <Clock className="h-3.5 w-3.5" />
                                <span>ينتهي قريباً</span>
                              </span>
                            )}
                            {sub.status === 'grace_period' && (
                              <span className="inline-flex items-center gap-1 text-xs font-extrabold text-amber-300">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                <span>ضمن مهلة السماح 5 أيام</span>
                              </span>
                            )}
                            {sub.status === 'locked' && (
                              <span className="inline-flex items-center gap-1 text-xs font-extrabold text-rose-300">
                                <Lock className="h-3.5 w-3.5" />
                                <span>منتهي ومقفول</span>
                              </span>
                            )}
                            <p className="text-[11px] text-slate-400">{sub.shortHint}</p>
                            {!student.isActive && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-300">
                                <ShieldAlert className="h-3 w-3" />
                                <span>الحساب محظور إدارياً</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Device Lock ID */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {student.deviceId ? (
                            <span
                              className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-200 tabular-nums"
                              dir="ltr"
                            >
                              <Smartphone className="h-3.5 w-3.5 text-purple-300" />
                              {student.deviceId}
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-amber-300">
                              مفتوح (بانتظار جهاز)
                            </span>
                          )}
                        </td>

                        {/* Quick Actions */}
                        <td className="py-3.5 px-4 text-left whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (isRenewingThis) {
                                  setRenewingStudentId(null);
                                } else {
                                  setRenewingStudentId(student.id);
                                  setCustomRenewDate(
                                    computeNextMonthDueDate(student.subscriptionDueDate)
                                  );
                                }
                              }}
                              className="min-h-[36px] inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 px-3 text-xs font-extrabold text-white hover:brightness-105 whitespace-nowrap"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              <span>تجديد الاشتراك</span>
                            </button>

                            <button
                              type="button"
                              disabled={!student.deviceId}
                              onClick={() => handleResetDevice(student.id, student.fullName)}
                              className="min-h-[36px] inline-flex items-center gap-1 rounded-lg bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 shadow-[0_8px_22px_-6px_rgba(147,51,234,0.65)] px-2.5 text-xs font-bold text-white hover:brightness-110 disabled:opacity-40 whitespace-nowrap"
                            >
                              <RotateCcw className="h-3.5 w-3.5 text-purple-300" />
                              <span>فك الجهاز</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleToggleStatus(student.id, student.fullName, student.isActive)
                              }
                              className={`min-h-[36px] inline-flex items-center gap-1 rounded-lg border px-2.5 text-xs font-bold whitespace-nowrap transition-colors ${
                                student.isActive
                                  ? 'border-rose-400/35 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25'
                                  : 'border-emerald-400/35 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-100'
                              }`}
                            >
                              <Ban className="h-3.5 w-3.5" />
                              <span>{student.isActive ? 'حظر' : 'تفعيل'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                editingStudentId === student.id
                                  ? setEditingStudentId(null)
                                  : openEditStudentRow(student.id)
                              }
                              className="min-h-[36px] inline-flex items-center gap-1 rounded-lg border border-purple-400/35 bg-purple-500/15 px-2.5 text-xs font-bold text-purple-200 hover:bg-purple-500/25 whitespace-nowrap"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span>تعديل</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setStudentToDelete({
                                  id: student.id,
                                  name: student.fullName,
                                  phone: student.phone,
                                })
                              }
                              aria-label={`حذف الطالب ${student.fullName}`}
                              className="min-h-[36px] inline-flex items-center gap-1 rounded-lg border border-rose-400/40 bg-red-600 px-2.5 text-xs font-bold text-white hover:bg-red-700 whitespace-nowrap transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>حذف</span>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Inline Manual Student Profile Edit Row */}
                      {editingStudentId === student.id && (
                        <tr className="bg-purple-500/10">
                          <td colSpan={6} className="px-4 py-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-extrabold text-purple-200">
                                  تعديل بيانات الطالب «{student.fullName}»
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setEditingStudentId(null)}
                                  className="text-xs font-bold text-slate-300 hover:text-white"
                                >
                                  إغلاق
                                </button>
                              </div>
                              {editStudentError && (
                                <p className="rounded-lg bg-rose-500/15 border border-rose-400/35 px-3 py-2 text-xs font-bold text-rose-200">
                                  {editStudentError}
                                </p>
                              )}
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                                <input
                                  type="text"
                                  value={editStudentName}
                                  onChange={(e) => setEditStudentName(e.target.value)}
                                  placeholder="الاسم الثلاثي الكامل"
                                  className="min-h-[38px] rounded-lg border border-purple-500/25 bg-[#110D1F] px-3 text-xs font-bold text-white"
                                />
                                <input
                                  type="tel"
                                  dir="ltr"
                                  value={editStudentPhone}
                                  onChange={(e) => setEditStudentPhone(e.target.value)}
                                  placeholder="07XXXXXXXXX"
                                  className="min-h-[38px] rounded-lg border border-purple-500/25 bg-[#110D1F] px-3 text-left font-mono text-xs font-bold text-white"
                                />
                                <select
                                  value={editStudentTrack}
                                  onChange={(e) => {
                                    const next = e.target.value as TrackId;
                                    setEditStudentTrack(next);
                                    const trk = db.tracks.find((t) => t.id === next);
                                    if (trk) {
                                      setEditStudentSubStage(trk.subStages[0] ?? '');
                                      const specs = trk.branches ?? trk.departments ?? [];
                                      setEditStudentBranch(specs[0] ?? '');
                                    }
                                  }}
                                  className="min-h-[38px] rounded-lg border border-purple-500/25 bg-[#110D1F] px-2.5 text-xs font-bold text-white"
                                >
                                  {db.tracks.map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {t.label}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  value={editStudentSubStage}
                                  onChange={(e) => setEditStudentSubStage(e.target.value)}
                                  className="min-h-[38px] rounded-lg border border-purple-500/25 bg-[#110D1F] px-2.5 text-xs font-bold text-white"
                                >
                                  {(db.tracks.find((t) => t.id === editStudentTrack)?.subStages ?? []).map((st) => (
                                    <option key={st} value={st}>
                                      {st}
                                    </option>
                                  ))}
                                </select>
                                <div className="flex items-center gap-2">
                                  {((db.tracks.find((t) => t.id === editStudentTrack)?.branches ??
                                    db.tracks.find((t) => t.id === editStudentTrack)?.departments ??
                                    []).length > 0) && (
                                    <select
                                      value={editStudentBranch}
                                      onChange={(e) => setEditStudentBranch(e.target.value)}
                                      className="flex-1 min-h-[38px] rounded-lg border border-purple-500/25 bg-[#110D1F] px-2 text-xs font-bold text-white"
                                    >
                                      {(
                                        db.tracks.find((t) => t.id === editStudentTrack)?.branches ??
                                        db.tracks.find((t) => t.id === editStudentTrack)?.departments ??
                                        []
                                      ).map((sp) => (
                                        <option key={sp} value={sp}>
                                          {sp}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleSaveStudentEdit(student.id)}
                                    className="min-h-[38px] rounded-lg bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 px-4 text-xs font-extrabold text-white hover:brightness-110 whitespace-nowrap"
                                  >
                                    حفظ
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* Inline Quick Renew Row (Add +1 Month OR Pick Custom Date) */}
                      {isRenewingThis && (
                        <tr className="bg-amber-500/12">
                          <td colSpan={6} className="px-4 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="font-extrabold text-white">
                                  تجديد اشتراك «{student.fullName}»:
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleQuickAddMonth(student.id, student.fullName)}
                                  className="min-h-[36px] rounded-lg bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 shadow-[0_8px_22px_-6px_rgba(147,51,234,0.65)] px-3.5 text-xs font-extrabold text-purple-300 hover:brightness-110"
                                >
                                  + إضافة شهر بضغطة زر (30 يوماً)
                                </button>
                                <span className="text-slate-400">أو اختاري تاريخاً يدوياً:</span>
                                <input
                                  type="date"
                                  dir="ltr"
                                  value={customRenewDate}
                                  onChange={(e) => setCustomRenewDate(e.target.value)}
                                  className="min-h-[36px] rounded-lg border border-purple-500/25 bg-white/[0.045] backdrop-blur-xl px-2.5 font-mono text-xs font-bold text-white tabular-nums"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveCustomRenew(student.id, student.fullName)}
                                  className="min-h-[36px] rounded-lg bg-emerald-600 px-3.5 text-xs font-extrabold text-white hover:bg-emerald-700"
                                >
                                  حفظ التاريخ وتجديد
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => setRenewingStudentId(null)}
                                className="text-xs font-bold text-slate-300 hover:text-white"
                              >
                                إغلاق
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SecurityPinModal
        isOpen={Boolean(studentToDelete)}
        title="حذف حساب طالب نهائياً"
        itemLabel={
          studentToDelete ? `${studentToDelete.name} (${studentToDelete.phone})` : ''
        }
        warningDetail="سيتم حذف حساب الطالب وجميع طلبات التجديد ونتائج الكوزات المرتبطة به نهائياً من المنصة ولا يمكن التراجع عن ذلك."
        onConfirm={() => {
          if (!studentToDelete) return;
          deleteStudent(studentToDelete.id);
          showToast(`تم حذف حساب الطالب «${studentToDelete.name}» نهائياً بنجاح.`);
          setStudentToDelete(null);
        }}
        onCancel={() => setStudentToDelete(null)}
      />
    </div>
  );
};
