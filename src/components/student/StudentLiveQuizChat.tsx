import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Lock,
  Sparkles,
  Square,
  Users,
  XCircle,
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { getAudienceLabel } from '../../services/platformData';
import { DEMO_LIVE_QUIZ_QUESTIONS } from '../../services/liveQuizChat';
import { formatDurationMMSS } from '../../utils/quizRanking';
import { LiveQuizLeaderboardCard } from '../common/LiveQuizLeaderboardCard';
import { BackButton } from '../common/BackButton';

const OPTION_LETTERS = ['أ', 'ب', 'ج', 'د'];

interface StudentLiveQuizChatProps {
  onLeave: () => void;
}

export const StudentLiveQuizChat: React.FC<StudentLiveQuizChatProps> = ({ onLeave }) => {
  const {
    currentUser,
    liveQuizRoom,
    submitLiveQuizAnswer,
    sendLiveQuizQuestion,
    endLiveQuizRoom,
    startDemoLiveQuizPreview,
  } = usePlatform();

  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (liveQuizRoom.status !== 'active') return;
    const interval = window.setInterval(() => setNowMs(Date.now()), 150);
    return () => window.clearInterval(interval);
  }, [liveQuizRoom.status]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveQuizRoom.questions.length, liveQuizRoom.status]);

  if (!currentUser) return null;

  if (liveQuizRoom.status === 'idle') {
    return (
      <div className="max-w-2xl mx-auto rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-8 text-center space-y-4">
        <p className="text-base font-extrabold text-white">
          لا توجد جلسة محادثة كوزات مباشرة نشطة حالياً
        </p>
        <p className="text-xs sm:text-sm text-slate-400 font-reading">
          عندما تفتح الأستاذة تبارك جلسة كوزات مباشرة لمرحلتك سيظهر لك تنبيه فوري للانضمام، أو يمكنك تجربة المعاينة التفاعلية الآن.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={startDemoLiveQuizPreview}
            className="min-h-[46px] inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 px-5 text-xs sm:text-sm font-extrabold text-white"
          >
            <Sparkles className="h-4 w-4" />
            <span>معاينة محادثة كوز مباشر</span>
          </button>
          <BackButton onClick={onLeave} label="رجوع" variant="light" />
        </div>
      </div>
    );
  }

  const sessionRemainingSec =
    liveQuizRoom.status === 'active'
      ? Math.max(0, Math.ceil((liveQuizRoom.endsAt - nowMs) / 1000))
      : 0;

  const demoPresets =
    DEMO_LIVE_QUIZ_QUESTIONS[liveQuizRoom.audience] ?? DEMO_LIVE_QUIZ_QUESTIONS.vocational6;
  const nextDemoPreset = demoPresets[liveQuizRoom.questions.length];

  const handleSendNextDemoQuestion = () => {
    if (!nextDemoPreset) return;
    sendLiveQuizQuestion(nextDemoPreset);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Top Sticky Room Header */}
      <div className="rounded-2xl bg-[#110D1F] text-white p-4 sm:p-5 border border-purple-400/40 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <BackButton onClick={onLeave} label="رجوع" variant="dark" size="sm" />

          <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <Users className="h-3.5 w-3.5" />
              <span>{liveQuizRoom.participants.length} متصل</span>
            </span>
            <span className="text-slate-300">·</span>
            <span
              className={`inline-flex items-center gap-1 font-extrabold ${
                sessionRemainingSec <= 60 && liveQuizRoom.status === 'active'
                  ? 'text-red-400'
                  : 'text-purple-300'
              }`}
              dir="ltr"
            >
              <Clock className="h-3.5 w-3.5" />
              {liveQuizRoom.status === 'active' ? formatDurationMMSS(sessionRemainingSec) : '00:00'}
            </span>
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
            {liveQuizRoom.status === 'active' ? (
              <span className="inline-flex items-center gap-1.5 text-red-400">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span>محادثة كوز مباشر جارية الآن</span>
              </span>
            ) : (
              <span className="text-emerald-400">انتهت الجلسة — ظهرت النتائج النهائية</span>
            )}
            <span className="text-slate-400">·</span>
            <span className="text-purple-300">
              {getAudienceLabel(liveQuizRoom.audience)}
              {liveQuizRoom.branch ? ` (${liveQuizRoom.branch})` : ''}
            </span>
          </div>
          <h1 className="mt-1 text-base sm:text-lg font-extrabold text-white">
            {liveQuizRoom.title}
          </h1>
        </div>
      </div>

      {/* Chat Stream of Interactive Question Cards */}
      <div className="space-y-4">
        {liveQuizRoom.systemMessages.map((msg) => (
          <div
            key={msg.id}
            className="rounded-xl bg-slate-200/75 px-4 py-2.5 text-center text-xs font-semibold text-slate-200"
          >
            <span>{msg.text}</span>
            <span className="mr-2 font-mono text-[10px] text-slate-400">{msg.timestamp}</span>
          </div>
        ))}

        {liveQuizRoom.questions.length === 0 && liveQuizRoom.status === 'active' && (
          <div className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-8 text-center space-y-2">
            <Clock className="h-7 w-7 text-purple-300 mx-auto" />
            <p className="text-sm font-extrabold text-white">
              أنت الآن داخل غرفة الكوزات المباشرة
            </p>
            <p className="text-xs text-slate-400">
              بانتظار إرسال الأستاذة تبارك للسؤال الأول — استعد للإجابة السريعة فور ظهوره!
            </p>
          </div>
        )}

        {liveQuizRoom.questions.map((q) => {
          const isSessionEnded = liveQuizRoom.status === 'ended';
          const remainingMs = Math.max(0, q.expiresAt - nowMs);
          const remainingSec = Math.ceil(remainingMs / 1000);
          const isExpired = isSessionEnded || remainingMs <= 0;
          const progressPct = Math.max(
            0,
            Math.min(100, (remainingMs / (q.durationSeconds * 1000)) * 100)
          );
          const myAnswer = q.answers[currentUser.id];
          const answeredTotal = Object.keys(q.answers).length;
          const isLocked = Boolean(myAnswer) || isExpired;

          return (
            <article
              key={q.id}
              className={`rounded-2xl bg-white/[0.045] backdrop-blur-xl border p-5 space-y-4 shadow-xs transition-colors ${
                isExpired && !myAnswer
                  ? 'border-purple-500/25 bg-white/[0.035]'
                  : myAnswer
                    ? 'border-purple-500/20'
                    : 'border-purple-400/60'
              }`}
            >
              {/* Teacher Sender Header + Rapid Countdown */}
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-white">
                    الأستاذة تبارك · السؤال #{q.order}
                  </span>
                </div>

                {!isExpired ? (
                  <span
                    className={`inline-flex items-center gap-1 font-mono text-sm font-extrabold tabular-nums ${
                      remainingSec <= 5 ? 'text-rose-400' : 'text-purple-300'
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    <span>{remainingSec} ث</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-400">
                    <Lock className="h-3.5 w-3.5" />
                    <span>مغلق</span>
                  </span>
                )}
              </div>

              {/* Smooth Shrinking Countdown Progress Bar */}
              <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className={`h-full transition-all duration-150 ${
                    isExpired
                      ? 'bg-slate-300'
                      : remainingSec <= 5
                        ? 'bg-red-600'
                        : 'bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600'
                  }`}
                  style={{ width: `${isExpired ? 0 : progressPct}%` }}
                />
              </div>

              {/* Question Text */}
              <h2 className="text-base sm:text-lg font-extrabold text-white leading-snug">
                {q.question}
              </h2>

              {/* Uniform Answer Options — Zero hints before or during the session; locks immediately on first tap */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {q.options.map((opt, idx) => {
                  const isMyChoice = myAnswer?.selectedIndex === idx;
                  const isCorrectOption = isSessionEnded && idx === q.correctIndex;

                  let buttonClasses =
                    'border-purple-500/20 bg-white/[0.04] text-white hover:border-purple-400/60 hover:bg-white/10';

                  if (isSessionEnded) {
                    if (isCorrectOption) {
                      buttonClasses =
                        'border-emerald-500 bg-emerald-500/15 text-emerald-200 font-extrabold';
                    } else if (isMyChoice && !isCorrectOption) {
                      buttonClasses = 'border-red-400 bg-rose-500/15 text-red-900 font-bold';
                    } else {
                      buttonClasses = 'border-purple-500/20 bg-white/[0.035] text-slate-400';
                    }
                  } else if (isMyChoice) {
                    buttonClasses = 'border-purple-400 bg-[#110D1F] text-white font-extrabold';
                  } else if (isLocked) {
                    buttonClasses = 'border-purple-500/20 bg-white/[0.035] text-slate-400';
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isLocked}
                      onClick={() => submitLiveQuizAnswer(q.id, idx)}
                      className={`min-h-[50px] rounded-xl border px-3.5 py-2.5 text-right text-xs sm:text-sm transition-colors flex items-center justify-between gap-2 disabled:cursor-not-allowed ${buttonClasses}`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-extrabold shrink-0 ${
                            isSessionEnded && isCorrectOption
                              ? 'bg-emerald-600 text-white'
                              : isSessionEnded && isMyChoice && !isCorrectOption
                                ? 'bg-red-600 text-white'
                                : isMyChoice
                                  ? 'bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 text-white'
                                  : 'bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 text-slate-200'
                          }`}
                        >
                          {OPTION_LETTERS[idx]}
                        </span>
                        <span className="leading-snug">{opt}</span>
                      </span>

                      {!isSessionEnded && isMyChoice && (
                        <Lock className="h-3.5 w-3.5 text-purple-300 shrink-0" />
                      )}
                      {isSessionEnded && isCorrectOption && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      )}
                      {isSessionEnded && isMyChoice && !isCorrectOption && (
                        <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Status Footer — Keeps correctness strictly secret until teacher ends the entire session */}
              <div className="pt-2 border-t border-purple-500/15 flex flex-wrap items-center justify-between gap-2 text-xs">
                {myAnswer ? (
                  isSessionEnded ? (
                    <span
                      className={`inline-flex items-center gap-1.5 font-extrabold ${
                        myAnswer.isCorrect ? 'text-emerald-300' : 'text-rose-300'
                      }`}
                    >
                      {myAnswer.isCorrect ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          <span>
                            إجابة صحيحة خلال {(myAnswer.responseTimeMs / 1000).toFixed(1)} ثانية
                          </span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4" />
                          <span>إجابة غير صحيحة — تم توضيح الجواب الصحيح أعلاه.</span>
                        </>
                      )}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 font-bold text-white">
                      <Lock className="h-3.5 w-3.5 text-purple-300" />
                      <span>
                        تم قفل إجابتك ({(myAnswer.responseTimeMs / 1000).toFixed(1)} ث) — ستظهر النتيجة بعد إنهاء الجلسة
                      </span>
                    </span>
                  )
                ) : isExpired ? (
                  <span className="inline-flex items-center gap-1.5 font-extrabold text-slate-300">
                    <AlertTriangle className="h-4 w-4 text-rose-400" />
                    <span>انتهى الوقت — تم إغلاق السؤال تلقائياً (بدون إجابة)</span>
                  </span>
                ) : (
                  <span className="font-semibold text-slate-300">
                    اختر إجابة واحدة بدقة — تُقفل إجابتك فور الضغط ولا يمكن تغييرها.
                  </span>
                )}

                <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                  أجاب {answeredTotal}/{liveQuizRoom.participants.length} طالب
                </span>
              </div>
            </article>
          );
        })}

        {/* Demo Preview Interactive Controls (Only when launched via "معاينة محادثة كوز مباشر") */}
        {liveQuizRoom.status === 'active' && liveQuizRoom.isDemoPreview && (
          <div className="rounded-2xl bg-[#110D1F] text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-purple-500/25">
            <div className="text-xs">
              <p className="font-extrabold text-purple-300">محاكاة المعاينة التفاعلية</p>
              <p className="text-slate-300 mt-0.5">
                {nextDemoPreset
                  ? 'جرّب الإجابة ثم استلم السؤال التالي من الأستاذة أو أنهِ الجلسة لعرض لوحة المستويات.'
                  : 'تم استلام جميع أسئلة المعاينة — اضغط لإنهاء الجلسة وعرض الإحصائيات وحفظها في حسابك.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {nextDemoPreset && (
                <button
                  type="button"
                  onClick={handleSendNextDemoQuestion}
                  className="min-h-[42px] inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 px-4 text-xs font-extrabold text-white hover:brightness-105 whitespace-nowrap"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>السؤال التالي ({liveQuizRoom.questions.length + 1}/{demoPresets.length})</span>
                </button>
              )}
              <button
                type="button"
                onClick={endLiveQuizRoom}
                className="min-h-[42px] inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 text-xs font-extrabold text-white hover:bg-red-700 whitespace-nowrap"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                <span>إنهاء الجلسة وعرض النتائج</span>
              </button>
            </div>
          </div>
        )}

        {/* Final Leaderboard Card directly inside chat when session ends */}
        {liveQuizRoom.status === 'ended' && (
          <LiveQuizLeaderboardCard
            sessionTitle={liveQuizRoom.title}
            totalQuestions={liveQuizRoom.questions.length}
            entries={liveQuizRoom.finalLeaderboard}
            highlightStudentId={currentUser.id}
          />
        )}

        <div ref={chatBottomRef} />
      </div>
    </div>
  );
};
