import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  MessageSquare,
  Play,
  Plus,
  Send,
  Sparkles,
  Square,
  Trash2,
  Users,
  Zap,
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { TrackId } from '../../types';
import { getAudienceLabel } from '../../services/supabase';
import { computeLiveQuizLeaderboard, DEMO_LIVE_QUIZ_QUESTIONS } from '../../services/liveQuizChat';
import { formatDurationMMSS } from '../../utils/quizRanking';
import { LiveQuizLeaderboardCard } from '../common/LiveQuizLeaderboardCard';

const OPTION_LETTERS = ['أ', 'ب', 'ج', 'د'];

export const AdminLiveQuizChat: React.FC = () => {
  const {
    db,
    liveQuizRoom,
    startLiveQuizRoom,
    startDemoLiveQuizPreview,
    sendLiveQuizQuestion,
    endLiveQuizRoom,
    resetLiveQuizRoom,
  } = usePlatform();

  // Dynamic Setup Form State driven 100% by db.tracks
  const [selectedTrackId, setSelectedTrackId] = useState<TrackId>(
    () => db.tracks[0]?.id ?? 'vocational'
  );
  const [subStage, setSubStage] = useState<string>('جميع الصفوف');
  const [branch, setBranch] = useState<string>('الجميع');
  const [subject, setSubject] = useState<string>('');
  const [courseId, setCourseId] = useState<string>('');
  const [sessionTitle, setSessionTitle] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<number>(15);
  const [defaultQuestionSeconds, setDefaultQuestionSeconds] = useState<number>(15);

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

  // Active Chat Question Composer State
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState<number>(0);
  const [questionSeconds, setQuestionSeconds] = useState<number>(
    liveQuizRoom.defaultQuestionSeconds || 15
  );
  const [composerError, setComposerError] = useState<string | null>(null);
  const [presetIndex, setPresetIndex] = useState<number>(0);

  // Live clock tick for smooth countdown bars & session timer
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (liveQuizRoom.status !== 'active') return;
    const interval = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [liveQuizRoom.status]);

  useEffect(() => {
    setQuestionSeconds(liveQuizRoom.defaultQuestionSeconds || 15);
  }, [liveQuizRoom.id, liveQuizRoom.defaultQuestionSeconds]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveQuizRoom.questions.length, liveQuizRoom.status]);

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

  const liveStandings = useMemo(() => {
    if (liveQuizRoom.status === 'idle') return [];
    if (liveQuizRoom.status === 'ended') return liveQuizRoom.finalLeaderboard;
    return computeLiveQuizLeaderboard(liveQuizRoom);
  }, [liveQuizRoom]);

  const sessionRemainingSec =
    liveQuizRoom.status === 'active'
      ? Math.max(0, Math.ceil((liveQuizRoom.endsAt - nowMs) / 1000))
      : 0;

  const handleStartSession = (e: React.FormEvent) => {
    e.preventDefault();
    const activeTrack = selectedTrackObj?.id ?? selectedTrackId;
    startLiveQuizRoom({
      title: sessionTitle,
      audience: activeTrack,
      track: activeTrack,
      subStage: subStage !== 'جميع الصفوف' ? subStage : undefined,
      branch: availableSpecs.length > 0 && branch !== 'الجميع' ? branch : undefined,
      subject: subject.trim() || undefined,
      courseId: courseId || undefined,
      durationMinutes,
      defaultQuestionSeconds,
    });
    setPresetIndex(0);
  };

  const handleAddOption = () => {
    if (options.length >= 4) return;
    setOptions((prev) => [...prev, '']);
  };

  const handleRemoveOption = (idx: number) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== idx));
    if (correctIndex >= idx && correctIndex > 0) {
      setCorrectIndex((prev) => prev - 1);
    }
  };

  const handleFillPresetQuestion = () => {
    const presets =
      DEMO_LIVE_QUIZ_QUESTIONS[liveQuizRoom.audience] ?? DEMO_LIVE_QUIZ_QUESTIONS.vocational6;
    const item = presets[presetIndex % presets.length];
    setQuestionText(item.question);
    setOptions([...item.options]);
    setCorrectIndex(item.correctIndex);
    setQuestionSeconds(item.durationSeconds);
    setPresetIndex((prev) => prev + 1);
    setComposerError(null);
  };

  const handleSendQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    setComposerError(null);
    if (questionText.trim().length < 4) {
      setComposerError('يرجى كتابة نص السؤال أولاً.');
      return;
    }
    const filled = options.map((o) => o.trim());
    if (filled.some((o) => !o)) {
      setComposerError('يرجى ملء جميع خيارات الإجابة الظاهرة (أو حذف الخيار الفارغ).');
      return;
    }
    if (filled.length < 2) {
      setComposerError('يجب وجود خيارين على الأقل للسؤال.');
      return;
    }

    sendLiveQuizQuestion({
      question: questionText,
      options: filled,
      correctIndex: Math.min(correctIndex, filled.length - 1),
      durationSeconds: questionSeconds,
    });

    setQuestionText('');
    setOptions(['', '', '', '']);
    setCorrectIndex(0);
    setQuestionSeconds(liveQuizRoom.defaultQuestionSeconds || 15);
  };

  // --- STATE 1: Setup Form (Idle) ---
  if (liveQuizRoom.status === 'idle') {
    return (
      <div className="space-y-5">
        {/* Instant Demo Preview Banner */}
        <div className="rounded-2xl bg-[#0F172A] text-white p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#D4AF37]/40">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#D4AF37]">
              <Zap className="h-4 w-4" />
              <span>تجربة فورية لغرفة محادثة الكوزات المباشرة</span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-white">
              اختبري غرفة الكوزات المباشرة الآن مع طلاب تجريبيين يشاركون بالإجابة
            </h2>
            <p className="text-xs text-slate-300 font-reading">
              تفتح الغرفة فوراً بمدة 15 دقيقة وسؤال تجريبي جاهز مع 5 طلاب متصلين يجيبون في الوقت الفعلي.
            </p>
          </div>
          <button
            type="button"
            onClick={startDemoLiveQuizPreview}
            className="min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#D4AF37] to-[#F59E0B] px-5 text-xs sm:text-sm font-extrabold text-slate-950 hover:brightness-105 whitespace-nowrap shrink-0"
          >
            <Sparkles className="h-4 w-4" />
            <span>معاينة محادثة كوز مباشر</span>
          </button>
        </div>

        {/* Configure & Start Session Form */}
        <form
          onSubmit={handleStartSession}
          className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-6 space-y-5"
        >
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
            <MessageSquare className="h-5 w-5 text-[#B48A1E]" />
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                بدء جلسة محادثة كوزات مباشرة جديدة
              </h2>
              <p className="text-xs text-slate-500">
                حددي الفئة المستهدفة ومدة الجلسة والوقت الافتراضي لكل سؤال، ثم اضغطي «بدء المحادثة».
              </p>
            </div>
          </div>

          {/* Dynamic Target Stage (100% from AdminStages) */}
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
                    onClick={() => {
                      setSelectedTrackId(trk.id);
                      setSubStage('جميع الصفوف');
                      setBranch('الجميع');
                      setSubject('');
                      setCourseId('');
                    }}
                    className={`min-h-[48px] rounded-xl border px-3.5 py-2 text-right text-xs font-extrabold transition-colors ${
                      selected
                        ? 'border-[#0F172A] bg-[#0F172A] text-[#D4AF37]'
                        : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-400'
                    }`}
                  >
                    <span className="block">{trk.label}</span>
                    <span
                      className={`block mt-0.5 text-[10px] font-medium truncate ${
                        selected ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {trk.subStages.join(' · ')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Dynamic Class / SubStage */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                الصف / المرحلة الفرعية
              </label>
              <select
                value={subStage}
                onChange={(e) => setSubStage(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-semibold"
              >
                <option value="جميع الصفوف">جميع صفوف هذه المرحلة</option>
                {(selectedTrackObj?.subStages ?? []).map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>

            {/* Dynamic Branch / Department if stage has specializations */}
            {availableSpecs.length > 0 && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  {selectedTrackObj?.specializationLabel || 'الفرع / القسم'}
                </label>
                <select
                  value={branch}
                  onChange={(e) => {
                    setBranch(e.target.value);
                    setCourseId('');
                  }}
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-semibold"
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

            {/* Dynamic Subject (from AdminStages + manual entry) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                المادة الدراسية (اختياري)
              </label>
              <input
                type="text"
                list="live-quiz-subjects-list"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="اختاري مادة من القائمة أو اكتبيها يدوياً..."
                className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-semibold focus:border-[#0F172A] focus:outline-none"
              />
              <datalist id="live-quiz-subjects-list">
                {availableSubjects.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                الدورة المرتبطة (اختياري)
              </label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-semibold"
              >
                <option value="">كوز عام للمرحلة المستهدفة</option>
                {matchingCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                عنوان جلسة محادثة الكوزات (اختياري)
              </label>
              <input
                type="text"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                placeholder={`مثال: كوز مباشر سريع — ${selectedTrackObj?.label || ''}`}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 px-4 text-sm focus:border-[#0F172A] focus:outline-none"
              />
            </div>

            {/* Session Total Duration (Minutes) */}
            <div className="space-y-2">
              <span className="block text-xs font-bold text-slate-700">
                2. مدة الجلسة الكلية (بالدقائق)
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {[10, 15, 20, 30, 45].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDurationMinutes(mins)}
                    className={`min-h-[40px] rounded-xl border px-3.5 text-xs font-bold tabular-nums ${
                      durationMinutes === mins
                        ? 'border-[#0F172A] bg-[#0F172A] text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    {mins} دقيقة
                  </button>
                ))}
              </div>
            </div>

            {/* Default Question Answer Time (Seconds) */}
            <div className="space-y-2">
              <span className="block text-xs font-bold text-slate-700">
                3. مدة الإجابة الافتراضية لكل سؤال (بالثواني)
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {[10, 15, 20, 30].map((secs) => (
                  <button
                    key={secs}
                    type="button"
                    onClick={() => setDefaultQuestionSeconds(secs)}
                    className={`min-h-[40px] rounded-xl border px-3.5 text-xs font-bold tabular-nums ${
                      defaultQuestionSeconds === secs
                        ? 'border-[#0F172A] bg-[#0F172A] text-[#D4AF37]'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    {secs} ثانية
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">
                يمكنكِ تعديل عدد الثواني لأي سؤال على حدة قبل إرساله داخل المحادثة.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              فور الضغط على «بدء المحادثة» يظهر تنبيه فوري للطلاب للانضمام مع عداد المتصلين.
            </p>
            <button
              type="submit"
              className="min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F172A] px-7 text-sm font-extrabold text-white hover:bg-slate-800 whitespace-nowrap"
            >
              <Play className="h-4 w-4 text-[#D4AF37]" />
              <span>بدء المحادثة الآن</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  // --- STATE 2 & 3: Active or Ended Live Quiz Chat Room ---
  return (
    <div className="space-y-5">
      {/* Top Room Control Bar */}
      <div className="rounded-2xl bg-[#0F172A] text-white p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border border-slate-800">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            {liveQuizRoom.status === 'active' ? (
              <span className="inline-flex items-center gap-1.5 text-red-400">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                <span>غرفة كوزات مباشرة نشطة</span>
              </span>
            ) : (
              <span className="text-emerald-400">انتهت الجلسة · تم إعلان النتائج</span>
            )}
            <span className="text-slate-600">·</span>
            <span className="text-[#D4AF37]">
              {getAudienceLabel(liveQuizRoom.audience, db.tracks)}
              {liveQuizRoom.subStage ? ` · ${liveQuizRoom.subStage}` : ''}
              {liveQuizRoom.branch ? ` (${liveQuizRoom.branch})` : ''}
              {liveQuizRoom.subject ? ` · ${liveQuizRoom.subject}` : ''}
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-extrabold text-white truncate">
            {liveQuizRoom.title}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Session Countdown */}
          <div className="rounded-xl bg-slate-800/90 border border-white/10 px-3.5 py-2 flex items-center gap-2 text-xs">
            <Clock className="h-4 w-4 text-[#D4AF37]" />
            <div>
              <span className="block text-[10px] text-slate-400">المتبقي للجلسة</span>
              <strong className="font-mono text-sm font-extrabold text-white tabular-nums" dir="ltr">
                {liveQuizRoom.status === 'active' ? formatDurationMMSS(sessionRemainingSec) : '00:00'}
              </strong>
            </div>
          </div>

          {/* Connected Students Counter */}
          <div className="rounded-xl bg-slate-800/90 border border-white/10 px-3.5 py-2 flex items-center gap-2 text-xs">
            <Users className="h-4 w-4 text-emerald-400" />
            <div>
              <span className="block text-[10px] text-slate-400">الطلاب المتصلون</span>
              <strong className="font-mono text-sm font-extrabold text-white tabular-nums">
                {liveQuizRoom.participants.length} طالب
              </strong>
            </div>
          </div>

          {/* Prominent End / Restart CTA */}
          {liveQuizRoom.status === 'active' ? (
            <button
              type="button"
              onClick={endLiveQuizRoom}
              className="min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-xs sm:text-sm font-extrabold text-white hover:bg-red-700 transition-colors whitespace-nowrap"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              <span>إنهاء الكوزات وعرض النتائج</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={resetLiveQuizRoom}
              className="min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#D4AF37] to-[#F59E0B] px-5 text-xs sm:text-sm font-extrabold text-slate-950 hover:brightness-105 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              <span>بدء جلسة كوزات جديدة</span>
            </button>
          )}
        </div>
      </div>

      {/* Main 2-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Chat Stream & Question Composer (2 columns) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Chat Messages & Live Question Cards Stream */}
          <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
              <span className="font-extrabold text-slate-800">
                مجريات غرفة محادثة الكوزات ({liveQuizRoom.questions.length} سؤال مرسل)
              </span>
              <span className="text-slate-500">
                المدة الافتراضية: {liveQuizRoom.defaultQuestionSeconds} ثانية/سؤال
              </span>
            </div>

            <div className="p-4 sm:p-5 space-y-4 max-h-[520px] overflow-y-auto bg-slate-50/50">
              {liveQuizRoom.systemMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="mx-auto max-w-xl rounded-xl bg-slate-200/70 px-4 py-2 text-center text-xs font-semibold text-slate-700"
                >
                  <span>{msg.text}</span>
                  <span className="mr-2 font-mono text-[10px] text-slate-500">{msg.timestamp}</span>
                </div>
              ))}

              {liveQuizRoom.questions.length === 0 && liveQuizRoom.status === 'active' && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center space-y-2">
                  <p className="text-sm font-extrabold text-slate-800">
                    الغرفة مفتوحة والطلاب بانتظار السؤال الأول!
                  </p>
                  <p className="text-xs text-slate-500">
                    اكتبي سؤالك بالأسفل أو استخدمي «تعبئة سؤال جاهز» ثم اضغطي «إرسال السؤال للطلاب».
                  </p>
                </div>
              )}

              {liveQuizRoom.questions.map((q) => {
                const remainingMs = Math.max(0, q.expiresAt - nowMs);
                const remainingSec = Math.ceil(remainingMs / 1000);
                const isClosed = liveQuizRoom.status === 'ended' || remainingMs <= 0;
                const progressPct = Math.max(
                  0,
                  Math.min(100, (remainingMs / (q.durationSeconds * 1000)) * 100)
                );
                const answersList = Object.values(q.answers);
                const correctAnswersCount = answersList.filter((a) => a.isCorrect).length;

                return (
                  <article
                    key={q.id}
                    className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 space-y-3 shadow-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-extrabold text-[#0F172A]">
                        السؤال #{q.order}
                      </span>
                      <span
                        className={`font-mono font-extrabold tabular-nums ${
                          isClosed
                            ? 'text-slate-500'
                            : remainingSec <= 5
                              ? 'text-red-600'
                              : 'text-[#B48A1E]'
                        }`}
                      >
                        {isClosed ? 'أُغلق وقت الإجابة' : `متبقي ${remainingSec} ثانية`}
                      </span>
                    </div>

                    {/* Rapid Countdown Bar */}
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-200 ${
                          isClosed
                            ? 'bg-slate-300'
                            : remainingSec <= 5
                              ? 'bg-red-600'
                              : 'bg-gradient-to-l from-[#D4AF37] to-[#F59E0B]'
                        }`}
                        style={{ width: `${isClosed ? 0 : progressPct}%` }}
                      />
                    </div>

                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">
                      {q.question}
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, idx) => {
                        const isCorrect = idx === q.correctIndex;
                        const chosenCount = answersList.filter(
                          (a) => a.selectedIndex === idx
                        ).length;
                        return (
                          <div
                            key={idx}
                            className={`rounded-xl border px-3 py-2.5 flex items-center justify-between gap-2 text-xs ${
                              isCorrect
                                ? 'border-emerald-300 bg-emerald-50/70 text-emerald-950 font-bold'
                                : 'border-slate-200 bg-slate-50 text-slate-700'
                            }`}
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              <span
                                className={`flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-extrabold shrink-0 ${
                                  isCorrect
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-white border border-slate-200 text-slate-600'
                                }`}
                              >
                                {OPTION_LETTERS[idx]}
                              </span>
                              <span className="truncate">{opt}</span>
                            </span>
                            <span className="font-mono text-[11px] text-slate-500 tabular-nums shrink-0">
                              {chosenCount} إجابة
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 tabular-nums">
                      <span>
                        أجاب حتى الآن:{' '}
                        <strong className="text-slate-900 font-mono">
                          {answersList.length} / {liveQuizRoom.participants.length}
                        </strong>{' '}
                        طالب
                      </span>
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{correctAnswersCount} إجابة صحيحة</span>
                      </span>
                    </div>
                  </article>
                );
              })}

              {/* Final Leaderboard Card directly inside chat when ended */}
              {liveQuizRoom.status === 'ended' && (
                <LiveQuizLeaderboardCard
                  sessionTitle={liveQuizRoom.title}
                  totalQuestions={liveQuizRoom.questions.length}
                  entries={liveQuizRoom.finalLeaderboard}
                />
              )}
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Live Question Composer (Visible while session is active) */}
          {liveQuizRoom.status === 'active' && (
            <form
              onSubmit={handleSendQuestion}
              className="rounded-2xl bg-white border border-slate-200 p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-extrabold text-slate-900">
                  إرسال سؤال مباشر جديد (السؤال #{liveQuizRoom.questions.length + 1})
                </h3>
                <button
                  type="button"
                  onClick={handleFillPresetQuestion}
                  className="min-h-[36px] inline-flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-300 px-3 text-xs font-extrabold text-slate-900 hover:bg-amber-100"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#B48A1E]" />
                  <span>تعبئة سؤال وزاري جاهز</span>
                </button>
              </div>

              <div>
                <input
                  type="text"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="اكتبي نص السؤال السريع هنا..."
                  className="w-full min-h-[46px] rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-[#0F172A] focus:outline-none"
                />
              </div>

              {/* 2 to 4 Options */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">
                    خيارات الإجابة ({options.length} من 4) — حددي الجواب الصحيح (يبقى سرياً ومخفياً تماماً عند الطلاب حتى إنهاء الجلسة)
                  </span>
                  {options.length < 4 && (
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="inline-flex items-center gap-1 font-bold text-[#B48A1E] hover:underline"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>إضافة خيار</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {options.map((opt, idx) => {
                    const isCorrect = correctIndex === idx;
                    return (
                      <div
                        key={idx}
                        className={`flex items-center gap-2 rounded-xl border p-2 transition-colors ${
                          isCorrect
                            ? 'border-emerald-500 bg-emerald-50/60'
                            : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setCorrectIndex(idx)}
                          title="تحديد كإجابة صحيحة"
                          className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-extrabold shrink-0 ${
                            isCorrect
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white border border-slate-300 text-slate-700 hover:border-slate-900'
                          }`}
                        >
                          {OPTION_LETTERS[idx]}
                        </button>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) =>
                            setOptions((prev) =>
                              prev.map((item, i) => (i === idx ? e.target.value : item))
                            )
                          }
                          placeholder={`الخيار ${idx + 1}`}
                          className="flex-1 min-h-[36px] bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                        />
                        {options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(idx)}
                            aria-label="حذف الخيار"
                            className="p-1 text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Per-Question Seconds Override & Send Button */}
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-bold text-slate-700">مدة هذا السؤال:</span>
                  {[10, 15, 20, 30].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setQuestionSeconds(sec)}
                      className={`min-h-[36px] rounded-lg border px-2.5 font-mono font-bold tabular-nums ${
                        questionSeconds === sec
                          ? 'border-[#0F172A] bg-[#0F172A] text-[#D4AF37]'
                          : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}
                    >
                      {sec}ث
                    </button>
                  ))}
                  <input
                    type="number"
                    min={5}
                    max={120}
                    value={questionSeconds}
                    onChange={(e) => setQuestionSeconds(Math.max(5, Number(e.target.value)))}
                    aria-label="ثواني السؤال"
                    className="w-16 min-h-[36px] rounded-lg border border-slate-300 px-2 text-center font-mono text-xs font-bold tabular-nums"
                  />
                </div>

                <button
                  type="submit"
                  className="min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#D4AF37] to-[#F59E0B] px-6 text-sm font-extrabold text-slate-950 hover:brightness-105 whitespace-nowrap shrink-0"
                >
                  <Send className="h-4 w-4" />
                  <span>إرسال السؤال للطلاب</span>
                </button>
              </div>

              {composerError && (
                <p className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2">
                  {composerError}
                </p>
              )}
            </form>
          )}
        </div>

        {/* Side Column: Connected Students & Live Standings */}
        <aside className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-900">
              الطلاب المتصلون والترتيب المباشر
            </span>
            <span className="font-mono text-xs font-bold text-emerald-700 tabular-nums">
              {liveQuizRoom.participants.length} متصل
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
            {liveStandings.map((entry) => (
              <div
                key={entry.studentId}
                className="px-4 py-3 flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate">
                    <span className="text-[#B48A1E] ml-1.5">
                      #{entry.rank}
                      {entry.medal ? ` ${entry.medal}` : ''}
                    </span>
                    {entry.studentName}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                    {entry.correctCount}/{entry.totalQuestions} صحيحة
                  </p>
                </div>
                <span className="font-mono text-xs font-extrabold text-[#0F172A] tabular-nums shrink-0">
                  {entry.percentage}%
                </span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};
