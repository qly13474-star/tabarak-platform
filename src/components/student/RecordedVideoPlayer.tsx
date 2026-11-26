import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  RotateCcw,
  RotateCw,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { Lesson } from '../../types';
import { DynamicWatermark } from '../security/DynamicWatermark';
import { PrivacyGuard } from '../security/PrivacyGuard';
import { BackButton } from '../common/BackButton';

interface RecordedVideoPlayerProps {
  lesson: Lesson;
  studentName: string;
  studentPhone: string;
  isWatched: boolean;
  onMarkWatched: (lessonId: string) => void;
  onBack?: () => void;
}

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const RecordedVideoPlayer: React.FC<RecordedVideoPlayerProps> = ({
  lesson,
  studentName,
  studentPhone,
  isWatched,
  onMarkWatched,
  onBack,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState<number>(1);
  const [quality, setQuality] = useState<'1080p' | '720p' | '480p'>('1080p');
  const [muted, setMuted] = useState(false);

  // Reset timeline when switching lessons
  useEffect(() => {
    setCurrentTime(0);
    setIsPlaying(false);
  }, [lesson.id]);

  // Smooth simulated playback timer for interactive preview
  useEffect(() => {
    if (!isPlaying) return;
    const stepMs = 500;
    const timer = window.setInterval(() => {
      setCurrentTime((prev) => {
        const next = prev + (stepMs / 1000) * speed * 12; // Scaled so slides advance visibly during preview
        if (next >= lesson.durationSeconds) {
          setIsPlaying(false);
          onMarkWatched(lesson.id);
          return lesson.durationSeconds;
        }
        return next;
      });
    }, stepMs);

    return () => window.clearInterval(timer);
  }, [isPlaying, speed, lesson.durationSeconds, lesson.id, onMarkWatched]);

  const progressPercent = Math.min(100, (currentTime / Math.max(1, lesson.durationSeconds)) * 100);

  // Pick active lecture slide based on timeline progress
  const slides = lesson.slides.length > 0 ? lesson.slides : [
    {
      timeSec: 0,
      title: lesson.title,
      body: lesson.description,
    },
  ];
  const activeSlideIndex = Math.min(
    slides.length - 1,
    Math.floor((progressPercent / 100) * slides.length)
  );
  const activeSlide = slides[activeSlideIndex];

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void containerRef.current.requestFullscreen?.();
    }
  };

  const handleSkip = (deltaSec: number) => {
    setCurrentTime((prev) => Math.max(0, Math.min(lesson.durationSeconds, prev + deltaSec)));
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(speed) + 1) % speeds.length;
    setSpeed(speeds[nextIdx]);
  };

  return (
    <div ref={containerRef} className="rounded-2xl overflow-hidden bg-[#0F172A] border border-slate-800 shadow-sm">
      <PrivacyGuard active={true} className="relative aspect-video w-full bg-[#080E1E]">
        {/* Dynamic moving watermark (student name + Iraqi phone every 10s) */}
        <DynamicWatermark studentName={studentName} studentPhone={studentPhone} variant="dark" />

        {/* Protected Interactive Lecture Canvas */}
        <div className="relative z-10 flex h-full w-full flex-col justify-between p-5 sm:p-8 bg-gradient-to-br from-[#0F172A] via-[#142038] to-[#080E1E] text-white">
          {/* Top lecture bar */}
          <div className="flex items-center justify-between gap-3 text-xs text-slate-300">
            <div className="flex items-center gap-2.5 min-w-0">
              {onBack && <BackButton onClick={onBack} label="رجوع" variant="dark" size="sm" />}
              <span className="font-semibold text-[#D4AF37] truncate">
                منصة الأستاذة تبارك الأزيرجاوي · مشغّل محمي
              </span>
            </div>
            <span className="font-mono text-[11px] text-slate-400 tabular-nums shrink-0" dir="ltr">
              {quality} · {speed}x
            </span>
          </div>

          {/* Center Chalkboard / Slide Visual */}
          <div className="my-auto max-w-2xl mx-auto w-full text-center sm:text-right px-2">
            <p className="text-xs font-semibold text-amber-400/90 mb-1.5">
              المحور {activeSlideIndex + 1} من {slides.length}
            </p>
            <h3 className="text-base sm:text-2xl font-extrabold text-white leading-snug">
              {activeSlide.title}
            </h3>
            <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-slate-200 leading-relaxed font-reading">
              {activeSlide.body}
            </p>
            {activeSlide.formula && (
              <div
                dir="ltr"
                className="mt-4 inline-block rounded-xl bg-slate-950/75 border border-amber-400/30 px-4 py-2.5 font-mono text-xs sm:text-base font-semibold text-[#F59E0B] tabular-nums"
              >
                {activeSlide.formula}
              </div>
            )}
          </div>

          {/* Center Play Overlay when Paused */}
          {!isPlaying && (
            <button
              type="button"
              onClick={() => setIsPlaying(true)}
              aria-label="تشغيل المحاضرة"
              className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/35 transition-colors hover:bg-slate-950/20"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#D4AF37] text-slate-950 shadow-xl transition-transform hover:scale-105">
                <Play className="h-7 w-7 fill-slate-950 mr-0.5" />
              </span>
            </button>
          )}

          {/* Bottom indicator */}
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[#D4AF37]" />
              <span>محمي بالعلامة المائية المتحركة</span>
            </span>
            <span className="font-mono tabular-nums" dir="ltr">
              {formatClock(currentTime)} / {lesson.duration}
            </span>
          </div>
        </div>
      </PrivacyGuard>

      {/* Player Control Strip */}
      <div className="bg-[#0F172A] px-4 py-3 text-white space-y-2.5">
        {/* Seek Bar */}
        <div className="flex items-center gap-3" dir="ltr">
          <span className="font-mono text-[11px] text-slate-400 tabular-nums w-10">
            {formatClock(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={lesson.durationSeconds}
            value={Math.floor(currentTime)}
            onChange={(e) => setCurrentTime(Number(e.target.value))}
            aria-label="شريط تقدم المحاضرة"
            className="flex-1 h-1.5 accent-[#D4AF37] cursor-pointer"
          />
          <span className="font-mono text-[11px] text-slate-400 tabular-nums w-10 text-right">
            {lesson.duration}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4AF37] text-slate-950 hover:bg-amber-400 transition-colors"
              aria-label={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-slate-950" />}
            </button>

            <button
              type="button"
              onClick={() => handleSkip(-15)}
              title="ترجيع 15 ثانية"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => handleSkip(15)}
              title="تقديم 15 ثانية"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <RotateCw className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? 'تشغيل الصوت' : 'كتم الصوت'}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              {muted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cycleSpeed}
              className="min-h-[38px] rounded-lg bg-slate-800 px-2.5 font-mono text-xs font-semibold text-amber-300 hover:bg-slate-700 tabular-nums"
              dir="ltr"
            >
              {speed}x
            </button>

            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value as '1080p' | '720p' | '480p')}
              aria-label="جودة العرض"
              dir="ltr"
              className="min-h-[38px] rounded-lg bg-slate-800 px-2 font-mono text-xs font-medium text-slate-200 border border-slate-700 focus:outline-none"
            >
              <option value="1080p">1080p HD</option>
              <option value="720p">720p</option>
              <option value="480p">480p</option>
            </select>

            <button
              type="button"
              onClick={() => onMarkWatched(lesson.id)}
              className={`min-h-[38px] inline-flex items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                isWatched
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{isWatched ? 'تمت المشاهدة' : 'تحديد كمكتمل'}</span>
            </button>

            <button
              type="button"
              onClick={handleToggleFullscreen}
              aria-label="ملء الشاشة"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <Maximize className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
