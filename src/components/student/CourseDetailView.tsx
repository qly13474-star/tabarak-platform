import React, { useState } from 'react';
import {
  ArrowRight,
  PlayCircle,
  FileText,
  ClipboardCheck,
  CheckCircle2,
  Clock,
  Lock,
  KeyRound,
} from 'lucide-react';
import { Course, Lesson } from '../../types';
import { usePlatform } from '../../context/PlatformContext';
import { formatIqd } from '../../utils/subscription';
import { RecordedVideoPlayer } from './RecordedVideoPlayer';
import { ProtectedPdfViewer } from './ProtectedPdfViewer';
import { CourseQuizView } from './CourseQuizView';
import { BackButton } from '../common/BackButton';

interface CourseDetailViewProps {
  course: Course;
  isEnrolled: boolean;
  initialTab?: CourseTab;
  onBack: () => void;
  onOpenActivation: () => void;
}

type CourseTab = 'lessons' | 'notes' | 'quizzes';

export const CourseDetailView: React.FC<CourseDetailViewProps> = ({
  course,
  isEnrolled,
  initialTab = 'lessons',
  onBack,
  onOpenActivation,
}) => {
  const { db, currentUser, markLessonWatched, saveQuizAttempt } = usePlatform();
  const [activeTab, setActiveTab] = useState<CourseTab>(initialTab);
  const [selectedLessonId, setSelectedLessonId] = useState<string>(course.lessons[0]?.id ?? '');
  const [selectedNoteId, setSelectedNoteId] = useState<string>(course.notes[0]?.id ?? '');
  const [selectedQuizId, setSelectedQuizId] = useState<string>(course.quizzes[0]?.id ?? '');

  if (!currentUser) return null;

  const watchedIds = db.watchedLessons[currentUser.id] ?? [];
  const unlockedLessonIds = currentUser.unlockedLessonIds ?? [];
  const coursePrice = course.priceIqd ?? 0;
  const isCourseUnlocked = isEnrolled || coursePrice === 0;

  const isLessonUnlocked = (lesson: Lesson): boolean =>
    isCourseUnlocked ||
    (lesson.priceIqd ?? 0) === 0 ||
    unlockedLessonIds.includes(lesson.id);

  const activeLesson =
    course.lessons.find((l) => l.id === selectedLessonId) ?? course.lessons[0];
  const activeNote = course.notes.find((n) => n.id === selectedNoteId) ?? course.notes[0];
  const activeQuiz = course.quizzes.find((q) => q.id === selectedQuizId) ?? course.quizzes[0];

  const completedInCourse = course.lessons.filter((l) => watchedIds.includes(l.id)).length;
  const activeLessonUnlocked = activeLesson ? isLessonUnlocked(activeLesson) : false;

  return (
    <div className="space-y-6">
      {/* Back & Course Header */}
      <div className="rounded-2xl bg-[#110D1F] text-white p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <BackButton onClick={onBack} label="رجوع" variant="dark" />

          {!isCourseUnlocked && (
            <button
              type="button"
              onClick={onOpenActivation}
              className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 px-4 text-xs font-extrabold text-white hover:brightness-105"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>تفعيل كود دورة أو محاضرة</span>
            </button>
          )}
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-slate-300">
              {course.subStage}
              {course.branch ? ` · فرع ${course.branch}` : ''} · {course.instructor}
            </p>
            <h1 className="mt-1.5 text-xl sm:text-2xl font-extrabold leading-snug text-white">
              {course.title}
            </h1>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed font-reading">
              {course.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-5 text-xs text-slate-300 shrink-0 border-t md:border-t-0 border-purple-500/20 pt-3 md:pt-0">
            <div>
              <span className="block text-slate-400">سعر الدورة الكاملة</span>
              <strong
                className={`font-mono text-base tabular-nums ${
                  coursePrice === 0 ? 'text-emerald-400' : 'text-purple-300'
                }`}
              >
                {coursePrice === 0 ? 'مجانية' : formatIqd(coursePrice)}
              </strong>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <span className="block text-slate-400">المحاضرات</span>
              <strong className="font-mono text-base text-white tabular-nums">
                {completedInCourse}/{course.lessons.length}
              </strong>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <span className="block text-slate-400">الملازم</span>
              <strong className="font-mono text-base text-white tabular-nums">
                {course.notes.length}
              </strong>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <span className="block text-slate-400">الاختبارات</span>
              <strong className="font-mono text-base text-white tabular-nums">
                {course.quizzes.length}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Course Navigation Tabs */}
      <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-slate-200/70">
        <button
          type="button"
          onClick={() => setActiveTab('lessons')}
          className={`min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl px-3 text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${
            activeTab === 'lessons'
              ? 'bg-[#110D1F] text-white shadow-sm'
              : 'text-slate-200 hover:text-white'
          }`}
        >
          <PlayCircle className="h-4 w-4 shrink-0" />
          <span>المحاضرات المسجلة</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('notes')}
          className={`min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl px-3 text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${
            activeTab === 'notes'
              ? 'bg-[#110D1F] text-white shadow-sm'
              : 'text-slate-200 hover:text-white'
          }`}
        >
          <FileText className="h-4 w-4 shrink-0" />
          <span>الملازم (PDF)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('quizzes')}
          className={`min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl px-3 text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${
            activeTab === 'quizzes'
              ? 'bg-[#110D1F] text-white shadow-sm'
              : 'text-slate-200 hover:text-white'
          }`}
        >
          <ClipboardCheck className="h-4 w-4 shrink-0" />
          <span>الاختبارات</span>
        </button>
      </div>

      {/* Tab 1: Recorded Lectures (Always browsable with clear individual & course pricing) */}
      {activeTab === 'lessons' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-4">
            {activeLesson ? (
              activeLessonUnlocked ? (
                <>
                  <RecordedVideoPlayer
                    lesson={activeLesson}
                    studentName={currentUser.fullName}
                    studentPhone={currentUser.phone}
                    isWatched={watchedIds.includes(activeLesson.id)}
                    onMarkWatched={markLessonWatched}
                    onBack={onBack}
                  />
                  <div className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-base sm:text-lg font-extrabold text-white">
                        {activeLesson.title}
                      </h2>
                      <span className="text-xs font-extrabold text-emerald-300">
                        {(activeLesson.priceIqd ?? 0) === 0
                          ? 'محاضرة مجانية'
                          : isCourseUnlocked
                            ? 'مفتوحة ضمن الدورة'
                            : 'محاضرة مفعّلة بالكود'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed font-reading">
                      {activeLesson.description}
                    </p>
                    {activeLesson.topics.length > 0 && (
                      <div className="pt-3 border-t border-purple-500/15">
                        <p className="text-xs font-bold text-slate-200 mb-2">
                          محاور هذه المحاضرة:
                        </p>
                        <ul className="space-y-1.5 text-sm text-slate-300">
                          {activeLesson.topics.map((topic, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-purple-300 tabular-nums">
                                0{i + 1}.
                              </span>
                              <span>{topic}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-6 sm:p-8 text-center space-y-4">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-purple-300">
                    <Lock className="h-7 w-7" />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-amber-300">محاضرة مدفوعة تتطلب تفعيل</p>
                    <h2 className="text-lg font-extrabold text-white">
                      {activeLesson.title}
                    </h2>
                    <p className="text-sm text-slate-300 font-reading max-w-lg mx-auto">
                      يمكنك شراء وفتح هذه المحاضرة بشكل فردي أو تفعيل كود الدورة الكاملة لفتح جميع المحاضرات والملازم والاختبارات.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto pt-1 text-right">
                    <div className="rounded-xl bg-white/[0.04] border border-purple-500/20 p-3.5">
                      <span className="block text-[11px] text-slate-400">سعر هذه المحاضرة منفردة</span>
                      <strong className="mt-1 block font-mono text-sm font-extrabold text-white tabular-nums">
                        {formatIqd(activeLesson.priceIqd ?? 0)}
                      </strong>
                    </div>
                    <div className="rounded-xl bg-amber-500/12 border border-amber-400/35 p-3.5">
                      <span className="block text-[11px] text-amber-200">سعر الدورة الكاملة</span>
                      <strong className="mt-1 block font-mono text-sm font-extrabold text-white tabular-nums">
                        {formatIqd(coursePrice)}
                      </strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onOpenActivation}
                    className="mt-2 min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 shadow-[0_8px_22px_-6px_rgba(147,51,234,0.65)] px-6 py-3 text-sm font-bold text-white hover:brightness-110 transition-colors"
                  >
                    <KeyRound className="h-4 w-4 text-purple-300" />
                    <span>تفعيل كود دورة أو محاضرة الآن</span>
                  </button>
                </div>
              )
            ) : (
              <div className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-8 text-center text-sm text-slate-400">
                لا توجد محاضرات مسجلة مضافة لهذه الدورة بعد.
              </div>
            )}
          </div>

          {/* Lessons Playlist */}
          <div className="lg:col-span-4 rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 overflow-hidden">
            <div className="px-5 py-4 border-b border-purple-500/15 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-white">قائمة المحاضرات</h3>
              <span className="text-xs text-slate-400 tabular-nums">
                {course.lessons.length} محاضرات
              </span>
            </div>
            <div className="divide-y divide-purple-500/15">
              {course.lessons.map((lesson) => {
                const isSelected = activeLesson?.id === lesson.id;
                const watched = watchedIds.includes(lesson.id);
                const unlocked = isLessonUnlocked(lesson);
                const lessonPrice = lesson.priceIqd ?? 0;

                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => setSelectedLessonId(lesson.id)}
                    className={`w-full min-h-[68px] px-4 py-3.5 text-right flex items-start gap-3 transition-colors ${
                      isSelected ? 'bg-[#110D1F] text-white' : 'hover:bg-white/[0.08] text-white'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {!unlocked ? (
                        <Lock
                          className={`h-5 w-5 ${isSelected ? 'text-purple-300' : 'text-amber-600'}`}
                        />
                      ) : watched ? (
                        <CheckCircle2
                          className={`h-5 w-5 ${isSelected ? 'text-purple-300' : 'text-emerald-400'}`}
                        />
                      ) : (
                        <PlayCircle
                          className={`h-5 w-5 ${isSelected ? 'text-purple-300' : 'text-slate-400'}`}
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-bold leading-snug line-clamp-2">
                        {lesson.title}
                      </p>
                      <div
                        className={`mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] tabular-nums ${
                          isSelected ? 'text-slate-300' : 'text-slate-400'
                        }`}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          <span dir="ltr">{lesson.duration}</span>
                          {watched && <span>· مكتملة</span>}
                        </span>
                        <span
                          className={`font-extrabold ${
                            lessonPrice === 0
                              ? isSelected
                                ? 'text-emerald-400'
                                : 'text-emerald-300'
                              : unlocked
                                ? isSelected
                                  ? 'text-purple-300'
                                  : 'text-sky-300'
                                : isSelected
                                  ? 'text-purple-300'
                                  : 'text-purple-300'
                          }`}
                        >
                          {lessonPrice === 0
                            ? 'مجانية'
                            : unlocked
                              ? 'مفتوحة'
                              : formatIqd(lessonPrice)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Protected PDF Notes */}
      {activeTab === 'notes' && (
        !isCourseUnlocked ? (
          <div className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-6 sm:p-10 text-center max-w-2xl mx-auto">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-purple-300">
              <Lock className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-extrabold text-white">
              الملازم المحمية متاحة بعد تفعيل الدورة الكاملة
            </h2>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed font-reading">
              سعر الدورة الكاملة:{' '}
              <strong className="font-mono text-white">{formatIqd(coursePrice)}</strong> — أدخل كود الكارت لفتح جميع الملازم والمحاضرات والاختبارات.
            </p>
            <button
              type="button"
              onClick={onOpenActivation}
              className="mt-6 min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 shadow-[0_8px_22px_-6px_rgba(147,51,234,0.65)] px-6 py-3 text-sm font-bold text-white hover:brightness-110 transition-colors"
            >
              <KeyRound className="h-4 w-4 text-purple-300" />
              <span>تفعيل كود الدورة الآن</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {course.notes.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {course.notes.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setSelectedNoteId(n.id)}
                    className={`min-h-[42px] rounded-xl px-4 text-xs font-bold border transition-colors ${
                      activeNote?.id === n.id
                        ? 'bg-[#110D1F] text-white border-purple-400'
                        : 'bg-white/[0.045] backdrop-blur-xl text-slate-200 border-purple-500/20 hover:border-purple-400/50'
                    }`}
                  >
                    {n.title}
                  </button>
                ))}
              </div>
            )}

            {activeNote ? (
              <ProtectedPdfViewer
                note={activeNote}
                studentName={currentUser.fullName}
                studentPhone={currentUser.phone}
                onBack={() => setActiveTab('lessons')}
              />
            ) : (
              <div className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-10 text-center text-sm text-slate-400">
                لم يتم رفع ملازم PDF لهذه الدورة بعد.
              </div>
            )}
          </div>
        )
      )}

      {/* Tab 3: Interactive Quizzes */}
      {activeTab === 'quizzes' && (
        !isCourseUnlocked ? (
          <div className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-6 sm:p-10 text-center max-w-2xl mx-auto">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-purple-300">
              <Lock className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-extrabold text-white">
              الاختبارات الإلكترونية متاحة بعد تفعيل الدورة الكاملة
            </h2>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed font-reading">
              سعر الدورة الكاملة:{' '}
              <strong className="font-mono text-white">{formatIqd(coursePrice)}</strong> — أدخل كود الكارت لفتح جميع الكوزات ولوحة الشرف.
            </p>
            <button
              type="button"
              onClick={onOpenActivation}
              className="mt-6 min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 shadow-[0_8px_22px_-6px_rgba(147,51,234,0.65)] px-6 py-3 text-sm font-bold text-white hover:brightness-110 transition-colors"
            >
              <KeyRound className="h-4 w-4 text-purple-300" />
              <span>تفعيل كود الدورة الآن</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {course.quizzes.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {course.quizzes.map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setSelectedQuizId(q.id)}
                    className={`min-h-[42px] rounded-xl px-4 text-xs font-bold border transition-colors ${
                      activeQuiz?.id === q.id
                        ? 'bg-[#110D1F] text-white border-purple-400'
                        : 'bg-white/[0.045] backdrop-blur-xl text-slate-200 border-purple-500/20 hover:border-purple-400/50'
                    }`}
                  >
                    {q.title}
                  </button>
                ))}
              </div>
            )}

            {activeQuiz ? (
              <CourseQuizView
                quiz={activeQuiz}
                courseId={course.id}
                currentUser={currentUser}
                allAttemptsForQuiz={db.quizAttempts.filter((a) => a.quizId === activeQuiz.id)}
                onComplete={saveQuizAttempt}
                onBack={() => setActiveTab('lessons')}
              />
            ) : (
              <div className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-10 text-center text-sm text-slate-400">
                لا توجد اختبارات مضافة لهذه الدورة حالياً.
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
};

