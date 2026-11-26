import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Award,
  RotateCcw,
  Clock,
  Play,
  Trophy,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { Quiz, QuizAttempt, UserProfile } from '../../types';
import {
  formatDurationMMSS,
  getGradeEvaluation,
  getLevelLabel,
  sortQuizLeaderboard,
} from '../../utils/quizRanking';
import { BackButton } from '../common/BackButton';

interface CourseQuizViewProps {
  quiz: Quiz;
  courseId: string;
  currentUser: UserProfile;
  allAttemptsForQuiz: QuizAttempt[];
  onComplete: (attempt: QuizAttempt) => void;
  onBack?: () => void;
}

type QuizPhase = 'intro' | 'active' | 'result';

export const CourseQuizView: React.FC<CourseQuizViewProps> = ({
  quiz,
  courseId,
  currentUser,
  allAttemptsForQuiz,
  onComplete,
  onBack,
}) => {
  const totalSeconds = Math.max(60, quiz.timeLimitMinutes * 60);

  const [phase, setPhase] = useState<QuizPhase>('intro');
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number>(totalSeconds);
  const [lastSubmittedAttempt, setLastSubmittedAttempt] = useState<QuizAttempt | null>(null);

  const selectedAnswersRef = useRef<Record<string, number>>({});
  selectedAnswersRef.current = selectedAnswers;

  const submittedLockRef = useRef(false);

  // Reset cleanly when switching to a different quiz
  useEffect(() => {
    setPhase('intro');
    setSelectedAnswers({});
    setRemainingSeconds(Math.max(60, quiz.timeLimitMinutes * 60));
    setLastSubmittedAttempt(null);
    submittedLockRef.current = false;
  }, [quiz.id, quiz.timeLimitMinutes]);

  const finalizeAndSubmit = useCallback(
    (autoSubmitted: boolean, secondsLeftSnapshot: number) => {
      if (submittedLockRef.current) return;
      submittedLockRef.current = true;

      const answers = selectedAnswersRef.current;
      const total = quiz.questions.length;
      const score = quiz.questions.reduce(
        (acc, q) => acc + (answers[q.id] === q.correctIndex ? 1 : 0),
        0
      );
      const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
      const spent = Math.max(1, totalSeconds - secondsLeftSnapshot);
      const now = new Date();
      const timestamp = `${now.toISOString().slice(0, 10)} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const attempt: QuizAttempt = {
        id: `att-${Date.now()}`,
        quizId: quiz.id,
        courseId,
        studentId: currentUser.id,
        studentName: currentUser.fullName,
        studentPhone: currentUser.phone,
        track: currentUser.track,
        subStage: currentUser.subStage,
        score,
        total,
        percentage,
        timeSpentSeconds: spent,
        completedAt: timestamp,
        autoSubmitted,
      };

      setLastSubmittedAttempt(attempt);
      setPhase('result');
      onComplete(attempt);
    },
    [quiz, courseId, currentUser, totalSeconds, onComplete]
  );

  // Live Countdown Timer while quiz is active -> Auto-Submit at 00:00
  useEffect(() => {
    if (phase !== 'active') return;
    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          finalizeAndSubmit(true, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [phase, finalizeAndSubmit]);

  const handleStartQuiz = () => {
    submittedLockRef.current = false;
    setSelectedAnswers({});
    setRemainingSeconds(totalSeconds);
    setLastSubmittedAttempt(null);
    setPhase('active');
  };

  const leaderboard = useMemo(
    () => sortQuizLeaderboard(allAttemptsForQuiz),
    [allAttemptsForQuiz]
  );

  const myPreviousAttempt = useMemo(
    () => leaderboard.find((a) => a.studentId === currentUser.id) ?? null,
    [leaderboard, currentUser.id]
  );

  const activeResult = lastSubmittedAttempt ?? myPreviousAttempt;
  const myRankIndex = activeResult
    ? leaderboard.findIndex((a) => a.studentId === currentUser.id)
    : -1;

  const totalQuestions = quiz.questions.length;
  const answeredCount = Object.keys(selectedAnswers).length;
  const timeProgressPercent = Math.round((remainingSeconds / totalSeconds) * 100);
  const isTimeLow = remainingSeconds <= 60;
  const isTimeCritical = remainingSeconds <= 20;

  return (
    <div className="space-y-6">
      {/* Phase 1: Pre-Start Intro + Preview Leaderboard */}
      {phase === 'intro' && (
        <div className="space-y-5">
          <div className="rounded-2xl bg-[#0F172A] text-white p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2.5 max-w-2xl">
              {onBack && (
                <div className="mb-2">
                  <BackButton onClick={onBack} label="رجوع" variant="dark" size="sm" />
                </div>
              )}
              <p className="text-xs font-bold text-[#D4AF37]">اختبار إلكتروني مؤقّت مع تصحيح فوري</p>
              <h3 className="text-xl sm:text-2xl font-extrabold leading-snug">{quiz.title}</h3>
              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-300 pt-1">
                <span className="tabular-nums">{totalQuestions} أسئلة اختيار من متعدد</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1.5 text-amber-300 font-bold tabular-nums">
                  <Clock className="h-4 w-4" />
                  مدة الكوز: {quiz.timeLimitMinutes} دقائق
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{leaderboard.length} طالب أدّوا الاختبار</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-reading pt-1">
                بمجرد الضغط على «بدء الكوز الآن» سيبدأ العداد التنازلي فوراً. وعند انتهاء الوقت يتم تسليم الإجابات تلقائياً وحساب درجتك وترتيبك في لوحة الشرف والمستويات دون إمكانية التعديل بعد الانتهاء.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleStartQuiz}
                className="min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#D4AF37] to-[#F59E0B] px-6 py-3 text-sm font-extrabold text-slate-950 hover:brightness-105 transition-all whitespace-nowrap"
              >
                <Play className="h-4 w-4 fill-slate-950" />
                <span>{myPreviousAttempt ? 'إعادة الكوز ورفع المستوى' : 'بدء الكوز الآن'}</span>
              </button>

              {myPreviousAttempt && (
                <button
                  type="button"
                  onClick={() => setPhase('result')}
                  className="min-h-[42px] rounded-xl border border-white/15 bg-white/5 px-4 text-xs font-bold text-white hover:bg-white/10 whitespace-nowrap"
                >
                  عرض نتيجتي السابقة ({myPreviousAttempt.percentage}%)
                </button>
              )}
            </div>
          </div>

          {/* Current Leaderboard Preview */}
          {leaderboard.length > 0 && (
            <LeaderboardCard
              leaderboard={leaderboard}
              currentStudentId={currentUser.id}
              title="لوحة الشرف والمستويات الحالية لهذا الكوز"
            />
          )}
        </div>
      )}

      {/* Phase 2: Active Timed Exam */}
      {phase === 'active' && (
        <div className="space-y-5">
          {/* Sticky Countdown Timer Header */}
          <div className="sticky top-16 z-20 rounded-2xl bg-[#0F172A] text-white p-4 sm:p-5 shadow-lg border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <BackButton
                  onClick={() => setPhase('intro')}
                  label="رجوع"
                  variant="dark"
                  size="sm"
                />
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-extrabold truncate">{quiz.title}</h3>
                  <p className="text-xs text-slate-400 tabular-nums mt-0.5">
                    أجبت على {answeredCount} من {totalQuestions} أسئلة · يتم التسليم تلقائياً عند 00:00
                  </p>
                </div>
              </div>

              <div
                className={`flex items-center gap-2 rounded-xl px-4 py-2 font-mono text-lg sm:text-xl font-extrabold tabular-nums ${
                  isTimeCritical
                    ? 'bg-red-600 text-white'
                    : isTimeLow
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-[#D4AF37]'
                }`}
                dir="ltr"
              >
                <Clock className="h-5 w-5 shrink-0" />
                <span>{formatDurationMMSS(remainingSeconds)}</span>
              </div>
            </div>

            {/* Linear Time Progress Bar */}
            <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-700 ${
                  isTimeCritical
                    ? 'bg-red-500'
                    : isTimeLow
                      ? 'bg-amber-400'
                      : 'bg-[#D4AF37]'
                }`}
                style={{ width: `${timeProgressPercent}%` }}
              />
            </div>
          </div>

          {/* Active Questions (Telegram Quiz Bot style: lock answer immediately on first click, reveal nothing until final submission) */}
          <div className="space-y-4">
            {quiz.questions.map((q, qIdx) => {
              const chosen = selectedAnswers[q.id];
              const isQuestionLocked = chosen !== undefined;
              return (
                <div
                  key={q.id}
                  className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-6 space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm sm:text-base font-bold text-slate-900 leading-relaxed">
                      <span className="font-mono text-[#B48A1E] ml-2 tabular-nums">
                        {String(qIdx + 1).padStart(2, '0')}.
                      </span>
                      {q.question}
                    </p>
                    {isQuestionLocked && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 whitespace-nowrap shrink-0">
                        <Lock className="h-3.5 w-3.5 text-[#B48A1E]" />
                        <span>إجابة مقفلة</span>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {q.options.map((opt, optIdx) => {
                      const isSelected = chosen === optIdx;
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          disabled={isQuestionLocked}
                          onClick={() =>
                            setSelectedAnswers((prev) => {
                              if (prev[q.id] !== undefined) return prev;
                              return {
                                ...prev,
                                [q.id]: optIdx,
                              };
                            })
                          }
                          className={`min-h-[48px] flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-right text-sm transition-colors disabled:cursor-not-allowed ${
                            isSelected
                              ? 'border-[#0F172A] bg-[#0F172A] text-white font-bold'
                              : isQuestionLocked
                                ? 'border-slate-200 bg-slate-50/70 text-slate-400'
                                : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-[#0F172A] hover:bg-white'
                          }`}
                        >
                          <span>{opt}</span>
                          <span className="font-mono text-xs opacity-65 shrink-0">
                            {['أ', 'ب', 'ج', 'د'][optIdx]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Submit Footer */}
          <div className="rounded-2xl bg-white border border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-600 tabular-nums">
              الإجابات المختارة: {answeredCount} من {totalQuestions}
            </span>
            <button
              type="button"
              onClick={() => finalizeAndSubmit(false, remainingSeconds)}
              className="w-full sm:w-auto min-h-[48px] rounded-xl bg-[#0F172A] px-6 py-3 text-sm font-bold text-white hover:bg-slate-800 transition-colors"
            >
              تسليم الإجابات وإظهار النتيجة والمستوى
            </button>
          </div>
        </div>
      )}

      {/* Phase 3: Auto-Graded Result Screen + Leaderboard & Read-Only Review */}
      {phase === 'result' && activeResult && (
        <div className="space-y-6">
          {/* Auto-Submitted Notice if timer expired */}
          {activeResult.autoSubmitted && (
            <div
              role="status"
              className="flex items-center gap-2.5 rounded-xl bg-amber-50 border border-amber-300 px-4 py-3 text-xs sm:text-sm font-bold text-amber-950"
            >
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>
                انتهى وقت الكوز وتم تسليم إجاباتك تلقائياً دون إمكانية التعديل بعد انتهاء الوقت.
              </span>
            </div>
          )}

          {/* Professional Result Summary Card */}
          {(() => {
            const evaluation = getGradeEvaluation(activeResult.percentage);
            const myLevel = myRankIndex >= 0 ? getLevelLabel(myRankIndex) : null;
            return (
              <div className="rounded-2xl bg-gradient-to-l from-[#0F172A] via-[#1B2B4B] to-[#0F172A] text-white p-6 sm:p-8 border border-[#D4AF37]/40 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#D4AF37]/20 text-[#D4AF37] shrink-0">
                      <Award className="h-8 w-8" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#D4AF37]">
                        نتيجة التصحيح التلقائي · {quiz.title}
                      </p>
                      <h3 className="mt-1 text-2xl sm:text-3xl font-extrabold">
                        {evaluation.title}
                      </h3>
                      <p className="mt-1 text-xs sm:text-sm text-slate-300 font-reading">
                        {evaluation.subtitle}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleStartQuiz}
                    className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#D4AF37] px-5 py-2.5 text-sm font-extrabold text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>إعادة المحاولة</span>
                  </button>
                </div>

                {/* 4 Clean Result Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-white/10">
                  <div className="rounded-xl bg-white/5 p-4">
                    <span className="block text-[11px] text-slate-400">الإجابات الصحيحة</span>
                    <strong className="mt-1 block font-mono text-2xl font-extrabold text-white tabular-nums">
                      {activeResult.score} / {activeResult.total}
                    </strong>
                  </div>

                  <div className="rounded-xl bg-white/5 p-4">
                    <span className="block text-[11px] text-slate-400">النسبة المئوية</span>
                    <strong className="mt-1 block font-mono text-2xl font-extrabold text-[#F59E0B] tabular-nums">
                      {activeResult.percentage}%
                    </strong>
                  </div>

                  <div className="rounded-xl bg-white/5 p-4">
                    <span className="block text-[11px] text-slate-400">ترتيبك في الكوز</span>
                    <strong className="mt-1 block text-lg font-extrabold text-white">
                      {myLevel ? `${myLevel.label} ${myLevel.medal ?? ''}` : 'تم التسجيل'}
                    </strong>
                  </div>

                  <div className="rounded-xl bg-white/5 p-4">
                    <span className="block text-[11px] text-slate-400">الوقت المستغرق</span>
                    <strong
                      className="mt-1 block font-mono text-2xl font-extrabold text-white tabular-nums"
                      dir="ltr"
                    >
                      {formatDurationMMSS(activeResult.timeSpentSeconds)}
                    </strong>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Honor Board & Levels Leaderboard */}
          <LeaderboardCard
            leaderboard={leaderboard}
            currentStudentId={currentUser.id}
            title="لوحة الشرف والمستويات (الترتيب التلقائي للطلاب)"
          />

          {/* Read-Only Answer Review (only when completed in current session) */}
          {lastSubmittedAttempt && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-extrabold text-slate-900">
                  مراجعة الإجابات النموذجية
                </h4>
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                  <Lock className="h-3.5 w-3.5" />
                  <span>مغلقة بعد التسليم</span>
                </span>
              </div>

              {quiz.questions.map((q, qIdx) => {
                const chosen = selectedAnswers[q.id];
                const isCorrect = chosen === q.correctIndex;
                return (
                  <div
                    key={q.id}
                    className="rounded-2xl bg-white border border-slate-200 p-5 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-bold text-slate-900 leading-relaxed">
                        <span className="font-mono text-[#B48A1E] ml-2 tabular-nums">
                          {String(qIdx + 1).padStart(2, '0')}.
                        </span>
                        {q.question}
                      </p>
                      {isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 shrink-0" />
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                      {q.options.map((opt, optIdx) => {
                        const isRightOpt = optIdx === q.correctIndex;
                        const isChosenWrong = chosen === optIdx && !isRightOpt;
                        return (
                          <div
                            key={optIdx}
                            className={`rounded-xl border px-3.5 py-2.5 flex items-center justify-between ${
                              isRightOpt
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold'
                                : isChosenWrong
                                  ? 'border-red-400 bg-red-50 text-red-900 font-semibold'
                                  : 'border-slate-200 bg-slate-50 text-slate-600'
                            }`}
                          >
                            <span>{opt}</span>
                            <span className="font-mono text-[11px] opacity-65">
                              {['أ', 'ب', 'ج', 'د'][optIdx]}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <p className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-xs text-slate-700 font-reading">
                        <strong className="font-sans text-slate-900 ml-1">التوضيح:</strong>
                        {q.explanation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface LeaderboardCardProps {
  leaderboard: QuizAttempt[];
  currentStudentId: string;
  title: string;
}

const LeaderboardCard: React.FC<LeaderboardCardProps> = ({
  leaderboard,
  currentStudentId,
  title,
}) => {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Trophy className="h-5 w-5 text-[#B48A1E] shrink-0" />
          <h4 className="text-sm sm:text-base font-extrabold text-slate-900">{title}</h4>
        </div>
        <span className="text-xs text-slate-500 tabular-nums">{leaderboard.length} طلاب</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold text-slate-500">
              <th className="py-3 px-4">الترتيب / المستوى</th>
              <th className="py-3 px-4">اسم الطالب الثلاثي</th>
              <th className="py-3 px-4">الدرجة</th>
              <th className="py-3 px-4">النسبة المئوية</th>
              <th className="py-3 px-4 text-left">الوقت</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leaderboard.map((entry, idx) => {
              const level = getLevelLabel(idx);
              const isMe = entry.studentId === currentStudentId;
              return (
                <tr
                  key={entry.id}
                  className={
                    isMe ? 'bg-amber-50/80 font-bold' : idx < 3 ? 'bg-slate-50/40' : 'hover:bg-slate-50'
                  }
                >
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-slate-900">
                      <span>{level.label}</span>
                      {level.medal && <span aria-hidden="true">{level.medal}</span>}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-xs sm:text-sm font-bold text-slate-900">
                      {entry.studentName}
                    </span>
                    {isMe && (
                      <span className="mr-2 text-[11px] font-bold text-[#B48A1E]">(أنت)</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap" dir="ltr">
                    {entry.score}/{entry.total}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-sm font-extrabold text-[#0F172A] tabular-nums whitespace-nowrap">
                    {entry.percentage}%
                  </td>
                  <td className="py-3.5 px-4 text-left font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap" dir="ltr">
                    {formatDurationMMSS(entry.timeSpentSeconds)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
