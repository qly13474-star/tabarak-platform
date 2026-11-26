import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Edit3,
  Send,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { AssignmentPriority, DailyAssignment, TrackId } from '../../types';
import {
  getAudienceLabel,
  getRelativeDateISO,
  isAssignmentForStudent,
} from '../../services/supabase';
import { SecurityPinModal } from './SecurityPinModal';

function formatArabicDateLabel(dueDate: string): string {
  const today = getRelativeDateISO(0);
  const tomorrow = getRelativeDateISO(1);
  if (dueDate === today) return `اليوم (${dueDate})`;
  if (dueDate === tomorrow) return `غداً (${dueDate})`;
  if (dueDate < today) return `سابق (${dueDate})`;
  return dueDate;
}

export const AdminAssignments: React.FC = () => {
  const { db, createAssignment, updateAssignment, deleteAssignment } = usePlatform();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<TrackId>(
    () => db.tracks[0]?.id ?? 'vocational'
  );
  const [subStage, setSubStage] = useState<string>('جميع الصفوف');
  const [branch, setBranch] = useState<string>('الجميع');
  const [subject, setSubject] = useState<string>('');
  const [courseId, setCourseId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [dueDate, setDueDate] = useState<string>(() => getRelativeDateISO(0));
  const [priority, setPriority] = useState<AssignmentPriority>('urgent');

  const [filterTrackId, setFilterTrackId] = useState<'all' | TrackId>('all');
  const [pendingDeleteAssignment, setPendingDeleteAssignment] =
    useState<DailyAssignment | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const selectedTrackObj = useMemo(
    () => db.tracks.find((t) => t.id === selectedTrackId) ?? db.tracks[0],
    [db.tracks, selectedTrackId]
  );
  const availableSpecs = useMemo(
    () => selectedTrackObj?.branches ?? selectedTrackObj?.departments ?? [],
    [selectedTrackObj]
  );
  const availableSubjects = useMemo(
    () => selectedTrackObj?.subjects ?? [],
    [selectedTrackObj]
  );
  const students = useMemo(() => db.users.filter((u) => u.role === 'student'), [db.users]);

  // Filter courses matching selected dynamic stage (and branch/department if chosen)
  const matchingCourses = useMemo(() => {
    const activeTrack = selectedTrackObj?.id ?? selectedTrackId;
    return db.courses.filter((c) => {
      if (c.track !== activeTrack) return false;
      if (branch !== 'الجميع' && c.branch && c.branch !== branch) {
        return false;
      }
      return true;
    });
  }, [db.courses, selectedTrackObj, selectedTrackId, branch]);

  // Live count of students who will immediately receive this notification
  const estimatedRecipientsCount = useMemo(() => {
    const activeTrack = selectedTrackObj?.id ?? selectedTrackId;
    const previewAssignment: DailyAssignment = {
      id: 'preview',
      title: title || 'تحضير',
      details,
      audience: activeTrack,
      track: activeTrack,
      subStage: subStage !== 'جميع الصفوف' ? subStage : undefined,
      branch: availableSpecs.length > 0 && branch !== 'الجميع' ? branch : undefined,
      subject: subject.trim() || undefined,
      courseId: courseId || undefined,
      dueDate,
      priority,
      createdAt: '',
    };
    return students.filter((s) => isAssignmentForStudent(previewAssignment, s)).length;
  }, [
    students,
    selectedTrackObj,
    selectedTrackId,
    subStage,
    branch,
    availableSpecs.length,
    subject,
    courseId,
    dueDate,
    priority,
    title,
    details,
  ]);

  const filteredAssignments = useMemo(() => {
    const list =
      filterTrackId === 'all'
        ? db.assignments
        : db.assignments.filter((a) => a.track === filterTrackId || a.audience === filterTrackId);
    return [...list].sort((a, b) => {
      if (a.dueDate !== b.dueDate) return b.dueDate.localeCompare(a.dueDate);
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [db.assignments, filterTrackId]);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setDetails('');
    setSubject('');
    setCourseId('');
    setDueDate(getRelativeDateISO(0));
    setPriority('normal');
    setFormError(null);
  };

  const handleTrackChange = (nextTrackId: TrackId) => {
    setSelectedTrackId(nextTrackId);
    setSubStage('جميع الصفوف');
    setBranch('الجميع');
    setSubject('');
    setCourseId('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (title.trim().length < 4) {
      setFormError('يرجى كتابة عنوان واضح للتحضير أو الواجب.');
      return;
    }
    if (details.trim().length < 6) {
      setFormError('يرجى كتابة تفاصيل التحضير والملاحظات المهمة للطلاب.');
      return;
    }
    if (!dueDate) {
      setFormError('يرجى تحديد تاريخ التسليم أو موعد التحضير القادم.');
      return;
    }

    const activeTrack = selectedTrackObj?.id ?? selectedTrackId;
    const payload = {
      title,
      details,
      audience: activeTrack,
      track: activeTrack,
      subStage: subStage !== 'جميع الصفوف' ? subStage : undefined,
      branch: availableSpecs.length > 0 && branch !== 'الجميع' ? branch : undefined,
      subject: subject.trim() || undefined,
      courseId: courseId || undefined,
      dueDate,
      priority,
    };

    if (editingId) {
      updateAssignment(editingId, payload);
      setFeedbackMessage('تم حفظ تعديلات التحضير وتحديثه لدى جميع الطلبة المستهدفين فوراً.');
      resetForm();
    } else {
      createAssignment(payload);
      setFeedbackMessage(
        `تم إرسال التحضير بنجاح وإشعار ${estimatedRecipientsCount} طالب/طالبة في «${selectedTrackObj?.label || getAudienceLabel(activeTrack, db.tracks)}» فوراً.`
      );
      resetForm();
    }

    window.setTimeout(() => setFeedbackMessage(null), 5000);
  };

  const handleStartEdit = (assignment: DailyAssignment) => {
    setEditingId(assignment.id);
    setSelectedTrackId(assignment.track);
    setSubStage(assignment.subStage || 'جميع الصفوف');
    setBranch(assignment.branch || 'الجميع');
    setSubject(assignment.subject || '');
    setCourseId(assignment.courseId || '');
    setTitle(assignment.title);
    setDetails(assignment.details);
    setDueDate(assignment.dueDate);
    setPriority(assignment.priority);
    setFormError(null);
    setPendingDeleteAssignment(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConfirmDelete = (assignmentId: string) => {
    deleteAssignment(assignmentId);
    if (editingId === assignmentId) {
      resetForm();
    }
    setPendingDeleteAssignment(null);
    setFeedbackMessage('تم حذف التحضير من سجل المنصة ومن جداول الطلبة.');
    window.setTimeout(() => setFeedbackMessage(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-[#B48A1E]">المتابعة اليومية والإشعارات الفورية</p>
          <h1 className="mt-1 text-xl sm:text-2xl font-extrabold text-slate-900">
            التحاضير والواجبات اليومية
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            أرسلي التحاضير والواجبات لمرحلة أو فرع أو دورة محددة ليصل الإشعار فوراً إلى جرس التنبيهات لدى الطلبة المستهدفين فقط.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-600 tabular-nums shrink-0">
          <span>
            إجمالي التحاضير: <strong className="text-slate-900 font-mono">{db.assignments.length}</strong>
          </span>
          <span className="text-slate-300">·</span>
          <span>
            عاجلة:{' '}
            <strong className="text-red-700 font-mono">
              {db.assignments.filter((a) => a.priority === 'urgent').length}
            </strong>
          </span>
        </div>
      </div>

      {feedbackMessage && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm font-semibold text-emerald-900"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-xs text-emerald-700 hover:underline shrink-0"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Create / Edit Assignment Form */}
      <section className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 bg-[#0F172A] text-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <BellRing className="h-4 w-4 text-[#D4AF37]" />
            <h2 className="text-sm font-extrabold">
              {editingId ? 'تعديل التحضير المرسل' : 'إرسال تحضير أو واجب يومي جديد'}
            </h2>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 text-amber-300 tabular-nums">
              <Users className="h-3.5 w-3.5" />
              <span>سيصل الإشعار إلى {estimatedRecipientsCount} طالب/طالبة</span>
            </span>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold text-white hover:bg-white/20"
              >
                <X className="h-3.5 w-3.5" />
                <span>إلغاء التعديل</span>
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          {/* Dynamic Stage Selection (100% from AdminStages) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              1. المرحلة / المسار الدراسي المستهدف
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {db.tracks.map((trk) => {
                const selected = (selectedTrackObj?.id ?? selectedTrackId) === trk.id;
                return (
                  <button
                    key={trk.id}
                    type="button"
                    onClick={() => handleTrackChange(trk.id)}
                    className={`min-h-[56px] rounded-xl border p-3 text-right transition-colors ${
                      selected
                        ? 'border-[#0F172A] bg-[#0F172A] text-white'
                        : 'border-slate-200 bg-slate-50/70 text-slate-800 hover:border-slate-400'
                    }`}
                  >
                    <p className={`text-xs font-extrabold ${selected ? 'text-[#D4AF37]' : 'text-slate-900'}`}>
                      {trk.label}
                    </p>
                    <p
                      className={`mt-0.5 text-[11px] leading-snug truncate ${
                        selected ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {trk.subStages.join(' · ')}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic SubStage, Branch/Department, Subject & Course Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                الصف / المرحلة الفرعية
              </label>
              <select
                value={subStage}
                onChange={(e) => setSubStage(e.target.value)}
                className="w-full min-h-[46px] rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-900 focus:border-[#0F172A] focus:outline-none"
              >
                <option value="جميع الصفوف">جميع صفوف هذه المرحلة</option>
                {(selectedTrackObj?.subStages ?? []).map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>

            {availableSpecs.length > 0 && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  {selectedTrackObj?.specializationLabel || 'الفرع / القسم المستهدف'}
                </label>
                <select
                  value={branch}
                  onChange={(e) => {
                    setBranch(e.target.value);
                    setCourseId('');
                  }}
                  className="w-full min-h-[46px] rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-900 focus:border-[#0F172A] focus:outline-none"
                >
                  <option value="الجميع">جميع الفروع والأقسام</option>
                  {availableSpecs.map((br) => (
                    <option key={br} value={br}>
                      {br}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                المادة الدراسية (اختياري)
              </label>
              <input
                type="text"
                list="assignment-subjects-list"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="اختاري مادة من القائمة أو اكتبيها يدوياً..."
                className="w-full min-h-[46px] rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-900 focus:border-[#0F172A] focus:outline-none"
              />
              <datalist id="assignment-subjects-list">
                {availableSubjects.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                الدورة الدراسية (اختياري)
              </label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full min-h-[46px] rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-900 focus:border-[#0F172A] focus:outline-none"
              >
                <option value="">تحضير عام للمرحلة (بدون ربط بدورة محددة)</option>
                {matchingCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignment Title */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              2. عنوان التحضير أو الواجب اليومي
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: تحضير الفصل الثاني - من صفحة 15 إلى 22"
              className="w-full min-h-[46px] rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-[#0F172A] focus:outline-none"
            />
          </div>

          {/* Details & Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              3. تفاصيل التحضير والملاحظات المهمة للطلاب
            </label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="اذكري الصفحات المطلوبة، المسائل الواجب حلها في الدفتر، أو أي تنبيه يخص الامتحان اليومي القادم..."
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0F172A] focus:outline-none font-reading leading-relaxed"
            />
          </div>

          {/* Due Date & Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                4. تاريخ التسليم / موعد التحضير القادم
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  dir="ltr"
                  className="flex-1 min-w-[160px] min-h-[46px] rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-mono font-bold text-slate-900 tabular-nums focus:border-[#0F172A] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setDueDate(getRelativeDateISO(0))}
                  className={`min-h-[42px] rounded-xl border px-3 text-xs font-bold whitespace-nowrap ${
                    dueDate === getRelativeDateISO(0)
                      ? 'border-[#0F172A] bg-[#0F172A] text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400'
                  }`}
                >
                  اليوم
                </button>
                <button
                  type="button"
                  onClick={() => setDueDate(getRelativeDateISO(1))}
                  className={`min-h-[42px] rounded-xl border px-3 text-xs font-bold whitespace-nowrap ${
                    dueDate === getRelativeDateISO(1)
                      ? 'border-[#0F172A] bg-[#0F172A] text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400'
                  }`}
                >
                  غداً
                </button>
                <button
                  type="button"
                  onClick={() => setDueDate(getRelativeDateISO(2))}
                  className={`min-h-[42px] rounded-xl border px-3 text-xs font-bold whitespace-nowrap ${
                    dueDate === getRelativeDateISO(2)
                      ? 'border-[#0F172A] bg-[#0F172A] text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400'
                  }`}
                >
                  بعد يومين
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                5. مستوى الأهمية
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPriority('normal')}
                  className={`min-h-[46px] rounded-xl border px-3.5 text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                    priority === 'normal'
                      ? 'border-[#0F172A] bg-[#0F172A] text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                  }`}
                >
                  <ClipboardList className="h-4 w-4" />
                  <span>تحضير عادي</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPriority('urgent')}
                  className={`min-h-[46px] rounded-xl border px-3.5 text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                    priority === 'urgent'
                      ? 'border-red-700 bg-red-700 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-red-300'
                  }`}
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span>مهم وعاجل</span>
                </button>
              </div>
            </div>
          </div>

          {formError && (
            <p className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
              {formError}
            </p>
          )}

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              عند الإرسال، سيظهر التحضير فوراً في جرس الإشعارات وجدول التحاضير الخاص بطلبة الفئة المختارة فقط.
            </p>
            <div className="flex items-center gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="min-h-[46px] rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  إلغاء
                </button>
              )}
              <button
                type="submit"
                className="min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#D4AF37] to-[#F59E0B] px-6 text-sm font-extrabold text-slate-950 shadow-sm hover:brightness-105 transition-all whitespace-nowrap"
              >
                <Send className="h-4 w-4" />
                <span>
                  {editingId ? 'حفظ التعديلات وتحديث الإشعار' : 'إرسال التحضير وإشعار الطلاب فوراً'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Sent Assignments Log */}
      <section className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">
              سجل التحاضير والواجبات المرسلة ({filteredAssignments.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              يمكنكِ تعديل أي تحضير أو حذفه ومتابعة نسبة إكمال الطلبة لكل واجب.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterTrackId('all')}
              className={`min-h-[36px] rounded-xl px-3 text-xs font-bold whitespace-nowrap ${
                filterTrackId === 'all'
                  ? 'bg-[#0F172A] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              الكل ({db.assignments.length})
            </button>
            {db.tracks.map((trk) => (
              <button
                key={trk.id}
                type="button"
                onClick={() => setFilterTrackId(trk.id)}
                className={`min-h-[36px] rounded-xl px-3 text-xs font-bold whitespace-nowrap ${
                  filterTrackId === trk.id
                    ? 'bg-[#0F172A] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {trk.shortLabel || trk.label}
              </button>
            ))}
          </div>
        </div>

        {filteredAssignments.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            لا توجد تحاضير مرسلة لهذه الفئة حتى الآن.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredAssignments.map((asg) => {
              const targetStudents = students.filter((s) => isAssignmentForStudent(asg, s));
              const completedCount = targetStudents.filter((s) =>
                (db.completedAssignments[s.id] ?? []).includes(asg.id)
              ).length;
              const isEditingThis = editingId === asg.id;

              return (
                <article
                  key={asg.id}
                  className={`p-5 transition-colors ${
                    isEditingThis ? 'bg-amber-50/50' : 'hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {asg.priority === 'urgent' ? (
                          <span className="inline-flex items-center gap-1 font-extrabold text-red-700">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>مهم وعاجل</span>
                          </span>
                        ) : (
                          <span className="font-bold text-slate-600">تحضير عادي</span>
                        )}
                        <span className="text-slate-300">·</span>
                        <span className="font-bold text-[#0F172A]">
                          {getAudienceLabel(asg.audience, db.tracks)}
                          {asg.subStage ? ` · ${asg.subStage}` : ''}
                          {asg.branch ? ` — ${asg.branch}` : ''}
                        </span>
                        {(asg.subject || asg.courseTitle) && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="text-[#B48A1E] font-semibold">
                              {asg.subject || asg.courseTitle}
                            </span>
                          </>
                        )}
                      </div>

                      <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                        {asg.title}
                      </h3>

                      <p className="text-xs sm:text-sm text-slate-600 font-reading leading-relaxed">
                        {asg.details}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500 tabular-nums">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                          <Calendar className="h-3.5 w-3.5 text-[#B48A1E]" />
                          <span>موعد التحضير: {formatArabicDateLabel(asg.dueDate)}</span>
                        </span>
                        <span className="text-slate-300">·</span>
                        <span>
                          الإكمال:{' '}
                          <strong className="font-mono text-emerald-700">
                            {completedCount} / {targetStudents.length}
                          </strong>{' '}
                          طالب
                        </span>
                        <span className="text-slate-300">·</span>
                        <span dir="ltr" className="font-mono text-[11px] text-slate-400">
                          {asg.createdAt}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(asg)}
                        className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-800 hover:border-[#0F172A]"
                      >
                        <Edit3 className="h-3.5 w-3.5 text-[#B48A1E]" />
                        <span>تعديل</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPendingDeleteAssignment(asg)}
                        className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-red-700 hover:border-red-300 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>حذف</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <SecurityPinModal
        isOpen={Boolean(pendingDeleteAssignment)}
        title="تأكيد حذف التحضير اليومي"
        itemLabel={pendingDeleteAssignment?.title ?? ''}
        warningDetail="سيتم حذف هذا التحضير نهائياً من سجل المنصة ومن جداول الطلبة."
        onCancel={() => setPendingDeleteAssignment(null)}
        onConfirm={() => {
          if (pendingDeleteAssignment) {
            handleConfirmDelete(pendingDeleteAssignment.id);
          }
        }}
      />
    </div>
  );
};
