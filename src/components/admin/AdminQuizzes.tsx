import React, { useMemo, useState } from 'react';
import {
  ClipboardCheck,
  Plus,
  Trash2,
  Trophy,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Pencil,
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { TrackId } from '../../types';
import {
  formatDurationMMSS,
  getLevelLabel,
  sortQuizLeaderboard,
} from '../../utils/quizRanking';
import { AdminLiveQuizChat } from './AdminLiveQuizChat';
import { SecurityPinModal } from './SecurityPinModal';

interface DraftQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
}

function createEmptyQuestion(): DraftQuestion {
  return {
    question: '',
    options: ['', '', '', ''],
    correctIndex: 0,
    explanation: '',
  };
}

export const AdminQuizzes: React.FC<{ initialMode?: 'live_chat' | 'results' | 'create' }> = ({
  initialMode,
}) => {
  const { db, liveQuizRoom, addQuizToCourse, updateQuizInCourse, deleteQuizFromCourse, getTrackName } = usePlatform();
  const [viewMode, setViewMode] = useState<'live_chat' | 'results' | 'create'>(
    initialMode ?? (liveQuizRoom.status === 'active' ? 'live_chat' : 'live_chat')
  );
  const [editingQuizTarget, setEditingQuizTarget] = useState<{
    courseId: string;
    quizId: string;
  } | null>(null);
  const [quizToDelete, setQuizToDelete] = useState<{
    courseId: string;
    quizId: string;
    title: string;
  } | null>(null);

  // Flatten all quizzes with parent course metadata
  const allQuizzes = useMemo(() => {
    return db.courses.flatMap((course) =>
      course.quizzes.map((quiz) => ({
        quiz,
        course,
      }))
    );
  }, [db.courses]);

  const [selectedQuizId, setSelectedQuizId] = useState<string>(
    allQuizzes.find((item) => item.quiz.id === 'quiz-voc-1')?.quiz.id ??
      allQuizzes[0]?.quiz.id ??
      ''
  );

  // Quiz Builder State
  const [targetTrack, setTargetTrack] = useState<TrackId>('vocational');
  const coursesInTrack = db.courses.filter((c) => c.track === targetTrack);
  const [targetCourseId, setTargetCourseId] = useState<string>(
    coursesInTrack[0]?.id ?? db.courses[0]?.id ?? ''
  );
  const [quizTitle, setQuizTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number>(10);
  const [draftQuestions, setDraftQuestions] = useState<DraftQuestion[]>([createEmptyQuestion()]);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleTrackChange = (nextTrack: TrackId) => {
    setTargetTrack(nextTrack);
    const matching = db.courses.filter((c) => c.track === nextTrack);
    if (matching.length > 0) {
      setTargetCourseId(matching[0].id);
    }
  };

  const updateQuestionField = <K extends keyof DraftQuestion>(
    index: number,
    key: K,
    value: DraftQuestion[K]
  ) => {
    setDraftQuestions((prev) =>
      prev.map((q, idx) => (idx === index ? { ...q, [key]: value } : q))
    );
  };

  const updateQuestionOption = (qIndex: number, optIndex: number, value: string) => {
    setDraftQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== qIndex) return q;
        const nextOpts = [...q.options] as [string, string, string, string];
        nextOpts[optIndex] = value;
        return { ...q, options: nextOpts };
      })
    );
  };

  const handlePublishQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!quizTitle.trim()) {
      setFormError('يرجى إدخال عنوان الكوز.');
      return;
    }
    if (!targetCourseId) {
      setFormError('يرجى اختيار الدورة المستهدفة.');
      return;
    }

    for (let i = 0; i < draftQuestions.length; i++) {
      const q = draftQuestions[i];
      if (!q.question.trim()) {
        setFormError(`يرجى كتابة نص السؤال رقم ${i + 1}.`);
        return;
      }
      if (q.options.some((opt) => !opt.trim())) {
        setFormError(`يرجى ملء جميع الخيارات الأربعة في السؤال رقم ${i + 1}.`);
        return;
      }
    }

    const normalizedQuestions = draftQuestions.map((q) => ({
      question: q.question.trim(),
      options: q.options.map((o) => o.trim()),
      correctIndex: q.correctIndex,
      explanation:
        q.explanation.trim() ||
        `الإجابة الصحيحة هي: ${q.options[q.correctIndex].trim()}.`,
    }));

    if (editingQuizTarget) {
      updateQuizInCourse(editingQuizTarget.courseId, editingQuizTarget.quizId, {
        title: quizTitle,
        timeLimitMinutes: durationMinutes,
        questions: normalizedQuestions,
      });
      setSelectedQuizId(editingQuizTarget.quizId);
      setEditingQuizTarget(null);
      setQuizTitle('');
      setDurationMinutes(10);
      setDraftQuestions([createEmptyQuestion()]);
      setViewMode('results');
      setSuccessMessage(`تم حفظ تعديلات الكوز «${quizTitle.trim()}» بنجاح!`);
      window.setTimeout(() => setSuccessMessage(null), 5000);
      return;
    }

    const created = addQuizToCourse(targetCourseId, {
      title: quizTitle,
      timeLimitMinutes: durationMinutes,
      questions: normalizedQuestions,
    });

    setQuizTitle('');
    setDurationMinutes(10);
    setDraftQuestions([createEmptyQuestion()]);
    setSelectedQuizId(created.id);
    setViewMode('results');
    setSuccessMessage(`تم إنشاء ونشر الكوز «${created.title}» للطلبة بنجاح!`);
    window.setTimeout(() => setSuccessMessage(null), 5000);
  };

  const openEditQuiz = (courseId: string, quizId: string) => {
    const course = db.courses.find((c) => c.id === courseId);
    const quiz = course?.quizzes.find((q) => q.id === quizId);
    if (!course || !quiz) return;
    setEditingQuizTarget({ courseId: course.id, quizId: quiz.id });
    setTargetTrack(course.track);
    setTargetCourseId(course.id);
    setQuizTitle(quiz.title);
    setDurationMinutes(quiz.timeLimitMinutes);
    setDraftQuestions(
      quiz.questions.length > 0
        ? quiz.questions.map((q) => ({
            question: q.question,
            options: [
              q.options[0] ?? '',
              q.options[1] ?? '',
              q.options[2] ?? '',
              q.options[3] ?? '',
            ],
            correctIndex: q.correctIndex,
            explanation: q.explanation ?? '',
          }))
        : [createEmptyQuestion()]
    );
    setFormError(null);
    setViewMode('create');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeQuizEntry =
    allQuizzes.find((item) => item.quiz.id === selectedQuizId) ?? allQuizzes[0];

  const sortedAttempts = useMemo(() => {
    if (!activeQuizEntry) return [];
    const matching = db.quizAttempts.filter((a) => a.quizId === activeQuizEntry.quiz.id);
    return sortQuizLeaderboard(matching);
  }, [db.quizAttempts, activeQuizEntry]);

  const averagePercentage = useMemo(() => {
    if (sortedAttempts.length === 0) return 0;
    const sum = sortedAttempts.reduce((acc, a) => acc + a.percentage, 0);
    return Math.round(sum / sortedAttempts.length);
  }, [sortedAttempts]);

  return (
    <div className="space-y-6">
      {/* Header & Mode Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">
            إدارة الكوزات والاختبارات الإلكترونية
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            أنشئي كوزات مؤقّتة باختيار من متعدد، وتابعي ترتيب الطلاب والنسب المئوية والوقت المستغرق تلقائياً.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-200/80 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('live_chat')}
            className={`min-h-[42px] inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 text-xs font-bold transition-colors whitespace-nowrap ${
              viewMode === 'live_chat'
                ? 'bg-[#110D1F] text-white'
                : 'text-slate-200 hover:text-white'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5 text-purple-300" />
            <span>محادثة الكوزات المباشرة</span>
            {liveQuizRoom.status === 'active' && (
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('results')}
            className={`min-h-[42px] inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 text-xs font-bold transition-colors whitespace-nowrap ${
              viewMode === 'results'
                ? 'bg-[#110D1F] text-white'
                : 'text-slate-200 hover:text-white'
            }`}
          >
            <Trophy className="h-3.5 w-3.5 text-purple-300" />
            <span>نتائج الكوزات</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingQuizTarget(null);
              setQuizTitle('');
              setDurationMinutes(10);
              setDraftQuestions([createEmptyQuestion()]);
              setViewMode('create');
            }}
            className={`min-h-[42px] inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 text-xs font-bold transition-colors whitespace-nowrap ${
              viewMode === 'create'
                ? 'bg-[#110D1F] text-white'
                : 'text-slate-200 hover:text-white'
            }`}
          >
            <Plus className="h-3.5 w-3.5 text-purple-300" />
            <span>{editingQuizTarget ? 'تعديل الكوز' : 'إنشاء كوز جديد'}</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-400/35 px-4 py-3 text-xs sm:text-sm font-semibold text-emerald-200"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Mode 0: Real-Time Live Quiz Chat Room */}
      {viewMode === 'live_chat' && <AdminLiveQuizChat />}

      {/* Mode 1: Quiz Results & Leaderboard Table */}
      {viewMode === 'results' && (
        <div className="space-y-5">
          {/* Quiz Picker & Quick Metrics */}
          <div className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-5 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="flex-1 max-w-2xl">
              <label htmlFor="admin-quiz-select" className="block text-xs font-bold text-slate-200 mb-1.5">
                اختر الكوز لعرض نتائجه ولوحة المستويات
              </label>
              <select
                id="admin-quiz-select"
                value={activeQuizEntry?.quiz.id ?? ''}
                onChange={(e) => setSelectedQuizId(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-purple-500/25 bg-white/[0.045] backdrop-blur-xl px-3.5 text-sm font-bold text-white"
              >
                {allQuizzes.map(({ quiz, course }) => {
                  const count = db.quizAttempts.filter((a) => a.quizId === quiz.id).length;
                  return (
                    <option key={quiz.id} value={quiz.id}>
                      {quiz.title} — {course.subStage}
                      {course.branch ? ` (${course.branch})` : ''} [{count} طالب]
                    </option>
                  );
                })}
              </select>
            </div>

            {activeQuizEntry && (
              <div className="flex flex-wrap items-center gap-5 text-xs border-t lg:border-t-0 border-purple-500/15 pt-3 lg:pt-0">
                <div>
                  <span className="block text-slate-400">المدة المحددة</span>
                  <strong className="font-mono text-sm text-white tabular-nums">
                    {activeQuizEntry.quiz.timeLimitMinutes} دقائق
                  </strong>
                </div>
                <div className="h-7 w-px bg-white/10" />
                <div>
                  <span className="block text-slate-400">عدد الممتحنين</span>
                  <strong className="font-mono text-sm text-white tabular-nums">
                    {sortedAttempts.length} طالب
                  </strong>
                </div>
                <div className="h-7 w-px bg-white/10" />
                <div>
                  <span className="block text-slate-400">متوسط النسبة</span>
                  <strong className="font-mono text-sm text-purple-300 tabular-nums">
                    {averagePercentage}%
                  </strong>
                </div>
                <div className="h-7 w-px bg-white/10" />
                <button
                  type="button"
                  onClick={() => openEditQuiz(activeQuizEntry.course.id, activeQuizEntry.quiz.id)}
                  className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl border border-purple-400/35 bg-purple-500/15 px-3 text-xs font-bold text-purple-200 hover:bg-purple-500/25 whitespace-nowrap"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>تعديل الكوز</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setQuizToDelete({
                      courseId: activeQuizEntry.course.id,
                      quizId: activeQuizEntry.quiz.id,
                      title: activeQuizEntry.quiz.title,
                    })
                  }
                  className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl border border-rose-400/35 bg-rose-500/15 px-3 text-xs font-bold text-rose-300 hover:bg-rose-500/25 whitespace-nowrap"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>حذف الكوز</span>
                </button>
              </div>
            )}
          </div>

          {/* Sorted Results Table (Highest -> Lowest) */}
          <div className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 overflow-hidden">
            <div className="px-5 py-4 border-b border-purple-500/15 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-purple-300" />
                <h2 className="text-sm font-extrabold text-white">
                  جدول نتائج الطلاب (مرتّب تلقائياً من الأعلى إلى الأقل)
                </h2>
              </div>
              {activeQuizEntry && (
                <span className="text-xs text-slate-400 hidden sm:inline">
                  {getTrackName(activeQuizEntry.course.track)} · {activeQuizEntry.course.subStage}
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-sm">
                <thead>
                  <tr className="border-b border-purple-500/20 bg-white/[0.04] text-xs font-bold text-slate-300">
                    <th className="py-3 px-4">الترتيب / المستوى</th>
                    <th className="py-3 px-4">اسم الطالب الثلاثي</th>
                    <th className="py-3 px-4">رقم الهاتف</th>
                    <th className="py-3 px-4">الدرجة</th>
                    <th className="py-3 px-4">النسبة المئوية</th>
                    <th className="py-3 px-4">الوقت المستغرق</th>
                    <th className="py-3 px-4 text-left">طريقة التسليم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-500/15">
                  {sortedAttempts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                        لم يؤدِّ أي طالب هذا الكوز بعد. سيظهر ترتيب الطلاب هنا تلقائياً فور التسليم.
                      </td>
                    </tr>
                  ) : (
                    sortedAttempts.map((entry, idx) => {
                      const level = getLevelLabel(idx);
                      return (
                        <tr key={entry.id} className="hover:bg-white/[0.08]">
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-white">
                              <span>{level.label}</span>
                              {level.medal && <span aria-hidden="true">{level.medal}</span>}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="text-xs sm:text-sm font-bold text-white">
                              {entry.studentName}
                            </p>
                            <p className="text-[11px] text-slate-400">{entry.subStage}</p>
                          </td>
                          <td
                            className="py-3.5 px-4 font-mono text-xs text-slate-300 tabular-nums whitespace-nowrap"
                            dir="ltr"
                          >
                            {entry.studentPhone}
                          </td>
                          <td
                            className="py-3.5 px-4 font-mono text-xs font-bold text-slate-100 tabular-nums whitespace-nowrap"
                            dir="ltr"
                          >
                            {entry.score}/{entry.total}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`font-mono text-sm font-extrabold tabular-nums ${
                                entry.percentage >= 80
                                  ? 'text-emerald-300'
                                  : entry.percentage >= 50
                                    ? 'text-purple-300'
                                    : 'text-rose-300'
                              }`}
                            >
                              {entry.percentage}%
                            </span>
                          </td>
                          <td
                            className="py-3.5 px-4 font-mono text-xs text-slate-200 tabular-nums whitespace-nowrap"
                            dir="ltr"
                          >
                            {formatDurationMMSS(entry.timeSpentSeconds)}
                          </td>
                          <td className="py-3.5 px-4 text-left whitespace-nowrap text-xs">
                            <span
                              className={
                                entry.autoSubmitted
                                  ? 'font-semibold text-amber-300'
                                  : 'text-slate-400'
                              }
                            >
                              {entry.autoSubmitted ? 'تسليم تلقائي (انتهى الوقت)' : 'تسليم يدوي'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Create New Quiz Form */}
      {viewMode === 'create' && (
        <form onSubmit={handlePublishQuiz} className="space-y-5">
          {formError && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-xl bg-rose-500/15 border border-rose-400/35 px-4 py-3 text-xs sm:text-sm font-semibold text-rose-200"
            >
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Quiz Metadata Card */}
          <div className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-extrabold text-white">
              1. إعدادات الكوز والمرحلة المستهدفة
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="new-quiz-title" className="block text-xs font-bold text-slate-200 mb-1.5">
                  عنوان الكوز
                </label>
                <input
                  id="new-quiz-title"
                  type="text"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  placeholder="مثال: كوز وزاري سريع — الفصل الأول (السادس المهني)"
                  className="w-full min-h-[44px] rounded-xl border border-purple-500/25 px-3.5 text-sm focus:border-purple-400 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="new-quiz-track" className="block text-xs font-bold text-slate-200 mb-1.5">
                  المسار الدراسي المستهدف
                </label>
                <select
                  id="new-quiz-track"
                  value={targetTrack}
                  onChange={(e) => handleTrackChange(e.target.value as TrackId)}
                  className="w-full min-h-[44px] rounded-xl border border-purple-500/25 bg-white/[0.045] backdrop-blur-xl px-3 text-sm font-medium"
                >
                  {db.tracks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="new-quiz-course" className="block text-xs font-bold text-slate-200 mb-1.5">
                  الدورة المستهدفة
                </label>
                <select
                  id="new-quiz-course"
                  value={targetCourseId}
                  onChange={(e) => setTargetCourseId(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-purple-500/25 bg-white/[0.045] backdrop-blur-xl px-3 text-sm font-medium"
                >
                  {coursesInTrack.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <span className="block text-xs font-bold text-slate-200 mb-1.5">
                  مدة الكوز بالدقائق (يُسلَّم تلقائياً عند انتهاء العداد)
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {[5, 10, 15, 20, 30].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMinutes(mins)}
                      className={`min-h-[42px] inline-flex items-center gap-1.5 rounded-xl border px-4 text-xs font-bold tabular-nums transition-colors ${
                        durationMinutes === mins
                          ? 'bg-[#110D1F] text-white border-purple-400'
                          : 'bg-white/[0.04] text-slate-200 border-purple-500/20 hover:border-purple-400/50'
                      }`}
                    >
                      <Clock className="h-3.5 w-3.5 text-purple-300" />
                      <span>{mins} دقائق</span>
                    </button>
                  ))}
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      max={180}
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Math.max(1, Number(e.target.value)))}
                      aria-label="مدة مخصصة بالدقائق"
                      className="w-20 min-h-[42px] rounded-xl border border-purple-500/25 px-3 text-center font-mono text-sm font-bold tabular-nums"
                    />
                    <span className="text-xs text-slate-400">دقيقة</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Multiple-Choice Questions Builder */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-white">
                2. أسئلة الاختيار من متعدد ({draftQuestions.length})
              </h2>
              <button
                type="button"
                onClick={() => setDraftQuestions((prev) => [...prev, createEmptyQuestion()])}
                className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-[#110D1F] px-4 text-xs font-bold text-white hover:brightness-110"
              >
                <Plus className="h-4 w-4 text-purple-300" />
                <span>إضافة سؤال جديد</span>
              </button>
            </div>

            {draftQuestions.map((draft, qIdx) => (
              <div
                key={qIdx}
                className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-5 sm:p-6 space-y-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-purple-300 tabular-nums">
                    السؤال رقم {qIdx + 1}
                  </span>
                  {draftQuestions.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setDraftQuestions((prev) => prev.filter((_, idx) => idx !== qIdx))
                      }
                      className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 hover:text-red-800"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>حذف السؤال</span>
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">
                    نص السؤال
                  </label>
                  <input
                    type="text"
                    value={draft.question}
                    onChange={(e) => updateQuestionField(qIdx, 'question', e.target.value)}
                    placeholder="اكتبي نص السؤال هنا..."
                    className="w-full min-h-[44px] rounded-xl border border-purple-500/25 px-3.5 text-sm focus:border-purple-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <span className="block text-xs font-bold text-slate-200">
                    الخيارات الأربعة المقترحة (حددي الإجابة الصحيحة بالنقر على الدائرة)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {draft.options.map((opt, optIdx) => {
                      const isCorrect = draft.correctIndex === optIdx;
                      return (
                        <div
                          key={optIdx}
                          className={`flex items-center gap-2 rounded-xl border p-2 transition-colors ${
                            isCorrect
                              ? 'border-emerald-500 bg-emerald-500/12'
                              : 'border-purple-500/20 bg-white/[0.04]'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => updateQuestionField(qIdx, 'correctIndex', optIdx)}
                            title="تحديد كإجابة صحيحة"
                            className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-extrabold shrink-0 transition-colors ${
                              isCorrect
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white/[0.045] backdrop-blur-xl border border-purple-500/25 text-slate-300 hover:border-slate-900'
                            }`}
                          >
                            {['أ', 'ب', 'ج', 'د'][optIdx]}
                          </button>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => updateQuestionOption(qIdx, optIdx, e.target.value)}
                            placeholder={`الخيار ${['الأول', 'الثاني', 'الثالث', 'الرابع'][optIdx]}`}
                            className="flex-1 min-h-[38px] bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    توضيح الإجابة الصحيحة (اختياري — يظهر للطالب بعد التسليم)
                  </label>
                  <input
                    type="text"
                    value={draft.explanation}
                    onChange={(e) => updateQuestionField(qIdx, 'explanation', e.target.value)}
                    placeholder="مثال: لأن الموجّه يعمل في الطبقة الثالثة لتوجيه عناوين IP"
                    className="w-full min-h-[42px] rounded-xl border border-purple-500/20 bg-white/[0.04] px-3.5 text-xs focus:border-purple-400 focus:bg-[#161029] focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              className="min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 shadow-[0_8px_22px_-6px_rgba(147,51,234,0.65)] px-7 py-3 text-sm font-extrabold text-white hover:brightness-110 transition-colors"
            >
              <ClipboardCheck className="h-4 w-4 text-purple-300" />
              <span>{editingQuizTarget ? 'حفظ تعديلات الكوز' : 'نشر الكوز للطلاب فوراً'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingQuizTarget(null);
                setViewMode('results');
              }}
              className="min-h-[48px] rounded-xl border border-purple-500/25 bg-white/[0.045] backdrop-blur-xl px-5 text-sm font-bold text-slate-200 hover:bg-white/[0.08]"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      <SecurityPinModal
        isOpen={Boolean(quizToDelete)}
        title="حذف الكوز نهائياً"
        itemLabel={quizToDelete?.title ?? ''}
        warningDetail="سيتم حذف الكوز وجميع نتائج الطلاب المسجلة فيه نهائياً من المنصة."
        onConfirm={() => {
          if (!quizToDelete) return;
          deleteQuizFromCourse(quizToDelete.courseId, quizToDelete.quizId);
          setSuccessMessage(`تم حذف الكوز «${quizToDelete.title}» بنجاح.`);
          window.setTimeout(() => setSuccessMessage(null), 4500);
          setQuizToDelete(null);
        }}
        onCancel={() => setQuizToDelete(null)}
      />
    </div>
  );
};
