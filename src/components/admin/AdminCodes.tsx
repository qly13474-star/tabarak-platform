import React, { useMemo, useState } from 'react';
import {
  KeyRound,
  Copy,
  Check,
  PlusCircle,
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  Wallet,
  BookOpen,
  Video,
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { formatIqd } from '../../utils/subscription';
import { SecurityPinModal } from './SecurityPinModal';

export const AdminCodes: React.FC = () => {
  const { db, getTrackName, generateCodes, deleteActivationCode } = usePlatform();

  const initialCourse = db.courses[0];
  const [targetType, setTargetType] = useState<'course' | 'lesson'>('course');
  const [selectedCourseId, setSelectedCourseId] = useState(initialCourse?.id ?? '');
  const [selectedLessonId, setSelectedLessonId] = useState(
    initialCourse?.lessons[0]?.id ?? ''
  );
  const [codePriceIqd, setCodePriceIqd] = useState<number>(initialCourse?.priceIqd ?? 50000);
  const [quantity, setQuantity] = useState<number>(10);
  const [statusFilter, setStatusFilter] = useState<'all' | 'unused' | 'used'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [generatedBanner, setGeneratedBanner] = useState<string | null>(null);
  const [codeToDelete, setCodeToDelete] = useState<{ id: string; code: string } | null>(null);

  const selectedCourse =
    db.courses.find((c) => c.id === selectedCourseId) ?? db.courses[0];
  const availableLessons = selectedCourse?.lessons ?? [];

  const handleSelectCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    const course = db.courses.find((c) => c.id === courseId);
    if (!course) return;
    if (targetType === 'lesson') {
      const firstLesson = course.lessons[0];
      setSelectedLessonId(firstLesson?.id ?? '');
      setCodePriceIqd(firstLesson?.priceIqd ?? 10000);
    } else {
      setCodePriceIqd(course.priceIqd ?? 50000);
    }
  };

  const handleSwitchTargetType = (nextType: 'course' | 'lesson') => {
    setTargetType(nextType);
    if (!selectedCourse) return;
    if (nextType === 'lesson') {
      const firstLesson = selectedCourse.lessons[0];
      setSelectedLessonId(firstLesson?.id ?? '');
      setCodePriceIqd(firstLesson?.priceIqd ?? 10000);
    } else {
      setCodePriceIqd(selectedCourse.priceIqd ?? 50000);
    }
  };

  const handleSelectLesson = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    const lesson = availableLessons.find((l) => l.id === lessonId);
    if (lesson) {
      setCodePriceIqd(lesson.priceIqd ?? 0);
    }
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;
    if (targetType === 'lesson' && !selectedLessonId) return;

    const created = generateCodes({
      courseId: selectedCourse.id,
      lessonId: targetType === 'lesson' ? selectedLessonId : undefined,
      count: quantity,
      priceIqd: codePriceIqd,
    });
    const lesson =
      targetType === 'lesson'
        ? selectedCourse.lessons.find((l) => l.id === selectedLessonId)
        : undefined;
    setGeneratedBanner(
      lesson
        ? `تم توليد ${created.length} كود خاص بالمحاضرة «${lesson.title}» بسعر ${codePriceIqd === 0 ? 'مجاني' : formatIqd(codePriceIqd)} لكل كود.`
        : `تم توليد ${created.length} كود لدورة «${selectedCourse.title}» بسعر ${codePriceIqd === 0 ? 'مجاني' : formatIqd(codePriceIqd)} لكل كود.`
    );
    window.setTimeout(() => setGeneratedBanner(null), 5000);
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback ignored in restricted clipboard environments
    }
    setCopiedId(id);
    window.setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2000);
  };

  // Financial Sales & Value Summary
  const financialStats = useMemo(() => {
    let usedRevenue = 0;
    let unusedValue = 0;
    let usedCount = 0;
    let unusedCount = 0;

    for (const item of db.activationCodes) {
      const course = db.courses.find((c) => c.id === item.courseId);
      const effectivePrice =
        item.priceIqd !== undefined ? item.priceIqd : course?.priceIqd ?? 0;
      if (item.isUsed) {
        usedCount += 1;
        usedRevenue += effectivePrice;
      } else {
        unusedCount += 1;
        unusedValue += effectivePrice;
      }
    }

    return {
      usedRevenue,
      unusedValue,
      totalValue: usedRevenue + unusedValue,
      usedCount,
      unusedCount,
    };
  }, [db.activationCodes, db.courses]);

  const filteredCodes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return db.activationCodes.filter((item) => {
      if (statusFilter === 'unused' && item.isUsed) return false;
      if (statusFilter === 'used' && !item.isUsed) return false;
      if (!q) return true;
      const courseTitle =
        db.courses.find((c) => c.id === item.courseId)?.title.toLowerCase() ?? '';
      return (
        item.code.toLowerCase().includes(q) ||
        courseTitle.includes(q) ||
        (item.lessonTitle ?? '').toLowerCase().includes(q) ||
        (item.usedByPhone ?? '').includes(q) ||
        (item.usedByStudentName ?? '').toLowerCase().includes(q)
      );
    });
  }, [db.activationCodes, db.courses, statusFilter, searchQuery]);

  const handleCopyAllUnused = () => {
    const unusedList = filteredCodes
      .filter((c) => !c.isUsed)
      .map((c) => c.code)
      .join('\n');
    if (unusedList) {
      void handleCopy(unusedList, 'bulk-unused');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
          إدارة وتوليد أكواد التفعيل والمبيعات
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          ولّدي أكواداً لدورة كاملة أو لمحاضرة فردية محددة مع ربط سعر الكود واحتساب إجمالي قيمة الأكواد المباعة والمستخدمة.
        </p>
      </div>

      {/* Revenue & Codes Value Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-[#0F172A] text-white p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-amber-300 font-bold">
            <span>إجمالي قيمة الأكواد المباعة والمستخدمة</span>
            <Wallet className="h-4 w-4 text-[#D4AF37]" />
          </div>
          <p className="font-mono text-2xl font-extrabold text-white tabular-nums">
            {formatIqd(financialStats.usedRevenue)}
          </p>
          <p className="text-xs text-slate-300 tabular-nums">
            {financialStats.usedCount} كود مستخدم ومفعّل لدى الطلبة
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-1.5">
          <span className="block text-xs font-bold text-slate-500">
            قيمة الأكواد المتاحة للتوزيع
          </span>
          <p className="font-mono text-2xl font-extrabold text-emerald-700 tabular-nums">
            {formatIqd(financialStats.unusedValue)}
          </p>
          <p className="text-xs text-slate-500 tabular-nums">
            {financialStats.unusedCount} كود جاهز للتفعيل
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-1.5">
          <span className="block text-xs font-bold text-slate-500">
            القيمة الإجمالية لجميع الأكواد
          </span>
          <p className="font-mono text-2xl font-extrabold text-slate-900 tabular-nums">
            {formatIqd(financialStats.totalValue)}
          </p>
          <p className="text-xs text-slate-500 tabular-nums">
            إجمالي {db.activationCodes.length} كود مسجّل في المنصة
          </p>
        </div>
      </div>

      {/* Generator Panel */}
      <form
        onSubmit={handleGenerate}
        className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-6 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[#B48A1E]" />
            <h2 className="text-sm font-extrabold text-slate-900">مولّد أكواد تفعيل جديد</h2>
          </div>

          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100">
            <button
              type="button"
              onClick={() => handleSwitchTargetType('course')}
              className={`min-h-[36px] inline-flex items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-colors ${
                targetType === 'course'
                  ? 'bg-[#0F172A] text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5 text-[#D4AF37]" />
              <span>كود لدورة كاملة</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchTargetType('lesson')}
              className={`min-h-[36px] inline-flex items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-colors ${
                targetType === 'lesson'
                  ? 'bg-[#0F172A] text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Video className="h-3.5 w-3.5 text-[#D4AF37]" />
              <span>كود لمحاضرة محددة</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className={targetType === 'lesson' ? 'md:col-span-6' : 'md:col-span-5'}>
            <label htmlFor="code-course" className="block text-xs font-bold text-slate-700 mb-1.5">
              اختر الدورة
            </label>
            <select
              id="code-course"
              value={selectedCourse?.id ?? ''}
              onChange={(e) => handleSelectCourse(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900"
            >
              {db.courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title} ({getTrackName(course.track)} ·{' '}
                  {(course.priceIqd ?? 0) === 0 ? 'مجانية' : formatIqd(course.priceIqd ?? 0)})
                </option>
              ))}
            </select>
          </div>

          {targetType === 'lesson' && (
            <div className="md:col-span-6">
              <label htmlFor="code-lesson" className="block text-xs font-bold text-slate-700 mb-1.5">
                اختر المحاضرة المحددة
              </label>
              <select
                id="code-lesson"
                value={selectedLessonId}
                onChange={(e) => handleSelectLesson(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900"
              >
                {availableLessons.length === 0 ? (
                  <option value="">لا توجد محاضرات في هذه الدورة بعد</option>
                ) : (
                  availableLessons.map((lesson) => (
                    <option key={lesson.id} value={lesson.id}>
                      {lesson.title} (
                      {(lesson.priceIqd ?? 0) === 0 ? 'مجانية' : formatIqd(lesson.priceIqd ?? 0)})
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          <div className={targetType === 'lesson' ? 'md:col-span-4' : 'md:col-span-3'}>
            <label htmlFor="code-price" className="block text-xs font-bold text-slate-700 mb-1.5">
              سعر الكود (د.ع)
            </label>
            <input
              id="code-price"
              type="number"
              min={0}
              step={1000}
              dir="ltr"
              value={codePriceIqd}
              onChange={(e) => setCodePriceIqd(Math.max(0, Number(e.target.value)))}
              className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-left font-mono text-sm font-bold text-slate-900 tabular-nums"
            />
          </div>

          <div className={targetType === 'lesson' ? 'md:col-span-4' : 'md:col-span-2'}>
            <span className="block text-xs font-bold text-slate-700 mb-1.5">عدد الأكواد</span>
            <div className="flex items-center gap-1">
              {[10, 25, 50].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setQuantity(preset)}
                  className={`flex-1 min-h-[44px] rounded-xl border font-mono text-xs font-bold tabular-nums transition-colors ${
                    quantity === preset
                      ? 'bg-[#0F172A] text-white border-[#0F172A]'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className={targetType === 'lesson' ? 'md:col-span-4' : 'md:col-span-2'}>
            <button
              type="submit"
              disabled={targetType === 'lesson' && availableLessons.length === 0}
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0F172A] px-3 text-xs sm:text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              <PlusCircle className="h-4 w-4 text-[#D4AF37]" />
              <span>توليد {quantity} كود</span>
            </button>
          </div>
        </div>

        {generatedBanner && (
          <div
            role="status"
            className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-xs font-semibold text-emerald-900"
          >
            {generatedBanner}
          </div>
        )}
      </form>

      {/* Filters & Search */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'all', label: `الكل (${db.activationCodes.length})` },
                { id: 'unused', label: `غير مستخدم (${financialStats.unusedCount})` },
                { id: 'used', label: `مستخدم (${financialStats.usedCount})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`min-h-[40px] rounded-xl px-3.5 text-xs font-bold transition-colors tabular-nums whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-[#0F172A] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالكود أو الدورة أو المحاضرة أو الطالب..."
                className="w-full sm:w-64 min-h-[40px] rounded-xl border border-slate-300 bg-slate-50 pr-9 pl-3 text-xs text-slate-900 focus:border-[#0F172A] focus:bg-white focus:outline-none"
              />
              <Search className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={handleCopyAllUnused}
              className="min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 text-xs font-bold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              {copiedId === 'bulk-unused' ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span>تم نسخ المتاحة</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>نسخ غير المستخدمة</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
                <th className="py-3 px-4">الكود</th>
                <th className="py-3 px-4">الدورة / المحاضرة</th>
                <th className="py-3 px-4">سعر الكود</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4">المستخدم</th>
                <th className="py-3 px-4 text-left">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCodes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-slate-500">
                    لا توجد أكواد مطابقة للبحث الحالي.
                  </td>
                </tr>
              ) : (
                filteredCodes.map((entry) => {
                  const course = db.courses.find((c) => c.id === entry.courseId);
                  const effectivePrice =
                    entry.priceIqd !== undefined ? entry.priceIqd : course?.priceIqd ?? 0;

                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/70">
                      <td
                        className="py-3 px-4 font-mono text-xs font-bold text-slate-900 tabular-nums whitespace-nowrap"
                        dir="ltr"
                      >
                        {entry.code}
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs font-bold text-slate-900">
                          {course?.title ?? 'دورة محذوفة'}
                        </p>
                        {entry.targetType === 'lesson' && entry.lessonTitle ? (
                          <p className="text-[11px] font-bold text-[#B48A1E] mt-0.5">
                            محاضرة فردية: {entry.lessonTitle}
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-500">
                            دورة كاملة · {getTrackName(entry.track)} · أُنشئ {entry.createdAt}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs font-extrabold text-slate-900 tabular-nums whitespace-nowrap">
                        {effectivePrice === 0 ? 'مجاني' : formatIqd(effectivePrice)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {entry.isUsed ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500">
                            <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />
                            <span>مستخدم</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                            <Clock className="h-3.5 w-3.5 text-emerald-600" />
                            <span>جاهز للتفعيل</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                        {entry.isUsed ? (
                          <div>
                            <span className="block font-semibold text-slate-800">
                              {entry.usedByStudentName}
                            </span>
                            <span
                              className="font-mono text-[11px] text-slate-500 tabular-nums"
                              dir="ltr"
                            >
                              {entry.usedByPhone}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-left whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopy(entry.code, entry.id)}
                            className="min-h-[34px] inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 hover:border-[#0F172A] hover:text-slate-950"
                          >
                            {copiedId === entry.id ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                <span>تم</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>نسخ</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => setCodeToDelete({ id: entry.id, code: entry.code })}
                            aria-label={`حذف الكود ${entry.code}`}
                            className="min-h-[34px] inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 px-2.5 text-xs font-bold text-red-700 hover:bg-red-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mandatory Security PIN Confirmation Modal */}
      <SecurityPinModal
        isOpen={Boolean(codeToDelete)}
        title="حذف كود تفعيل"
        itemLabel={codeToDelete?.code ?? ''}
        warningDetail="سيتم إزالة هذا الكود من سجل الأكواد والمبيعات نهائياً ولن يتمكن أي طالب من استخدامه."
        onConfirm={() => {
          if (!codeToDelete) return;
          deleteActivationCode(codeToDelete.id);
          setGeneratedBanner(`تم حذف الكود ${codeToDelete.code} نهائياً.`);
          window.setTimeout(() => setGeneratedBanner(null), 4000);
          setCodeToDelete(null);
        }}
        onCancel={() => setCodeToDelete(null)}
      />
    </div>
  );
};
