import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Radio,
  Users,
  Hand,
  Mic,
  MicOff,
  Send,
  ShieldCheck,
  CheckCircle2,
  MonitorPlay,
  Presentation,
  PenTool,
  CalendarClock,
  Volume2,
  VolumeX,
  AlertTriangle,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { LocalTrackPublication } from 'livekit-client';
import { usePlatform } from '../../context/PlatformContext';
import {
  connectToLiveKitRoom,
  LIVE_LECTURE_SLIDES,
  requestLiveKitRoomToken,
  Room,
  Track,
} from '../../services/livekit';
import { DynamicWatermark } from '../security/DynamicWatermark';
import { PrivacyGuard } from '../security/PrivacyGuard';
import { BackButton } from '../common/BackButton';

interface LiveClassroomProps {
  onLeave: () => void;
  onOpenSchedule?: () => void;
}

function mapStudentMicErrorToArabic(err: unknown): string {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return 'المتصفح الحالي لا يدعم الوصول إلى الميكروفون. يرجى فتح المنصة عبر متصفح حديث وباتصال آمن (HTTPS).';
  }
  const domErr = err as { name?: string } | null;
  const name = domErr?.name || '';

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
    return 'تم حظر إذن الميكروفون من قبل المتصفح. يرجى السماح للموقع بالوصول إلى الميكروفون من شريط العنوان ثم الضغط على «إعادة المحاولة».';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'لم يتم العثور على ميكروفون متصل بهذا الجهاز.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'الميكروفون قيد الاستخدام في تطبيق آخر حالياً. يرجى إغلاقه ثم إعادة المحاولة.';
  }
  return 'تعذر تشغيل الميكروفون. يرجى التحقق من أذونات المتصفح ثم إعادة المحاولة.';
}

export const LiveClassroom: React.FC<LiveClassroomProps> = ({ onLeave, onOpenSchedule }) => {
  const {
    currentUser,
    supabaseAccessToken,
    liveSession,
    getTrackName,
    toggleMyRaiseHand,
    sendLiveChatMessage,
    recordStudentAttendance,
  } = usePlatform();

  const [chatText, setChatText] = useState('');
  const [localMicMuted, setLocalMicMuted] = useState(false);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [audioAutoplayBlocked, setAudioAutoplayBlocked] = useState(false);
  const [livekitConnected, setLivekitConnected] = useState(false);
  const [livekitError, setLivekitError] = useState<string | null>(null);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [hasRemoteAudio, setHasRemoteAudio] = useState(false);

  // Student real microphone state (activated when teacher grants micAllowed)
  const [studentMicLevel, setStudentMicLevel] = useState(0);
  const [studentMicError, setStudentMicError] = useState<string | null>(null);
  const [studentMicActive, setStudentMicActive] = useState(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioContainerRef = useRef<HTMLDivElement | null>(null);
  const livekitRoomRef = useRef<Room | null>(null);
  const studentMicStreamRef = useRef<MediaStream | null>(null);
  const studentPublishedAudioRef = useRef<LocalTrackPublication | null>(null);
  const studentAudioCtxRef = useRef<AudioContext | null>(null);
  const studentAudioRafRef = useRef<number | null>(null);

  const myParticipant = currentUser
    ? liveSession.participants.find((p) => p.id === currentUser.id)
    : undefined;
  const handRaised = myParticipant?.handRaised ?? false;
  const micAllowed = myParticipant?.micAllowed ?? false;

  // Stop student's real microphone + audio level analyzer cleanly
  const stopStudentMic = useCallback(() => {
    if (studentAudioRafRef.current !== null) {
      window.cancelAnimationFrame(studentAudioRafRef.current);
      studentAudioRafRef.current = null;
    }
    if (studentAudioCtxRef.current) {
      void studentAudioCtxRef.current.close().catch(() => {});
      studentAudioCtxRef.current = null;
    }

    const room = livekitRoomRef.current;
    if (room && studentPublishedAudioRef.current?.track) {
      try {
        void room.localParticipant.unpublishTrack(studentPublishedAudioRef.current.track, false);
      } catch {
        // Ignore
      }
    }
    studentPublishedAudioRef.current = null;

    if (studentMicStreamRef.current) {
      studentMicStreamRef.current.getTracks().forEach((track) => track.stop());
      studentMicStreamRef.current = null;
    }

    setStudentMicLevel(0);
    setStudentMicActive(false);
  }, []);

  // Activate student's real microphone when permitted by the teacher
  const startStudentMic = useCallback(async () => {
    setStudentMicError(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setStudentMicError(mapStudentMicErrorToArabic(null));
      return;
    }

    stopStudentMic();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      studentMicStreamRef.current = stream;
      setStudentMicActive(true);

      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack && livekitRoomRef.current) {
        try {
          studentPublishedAudioRef.current = await livekitRoomRef.current.localParticipant.publishTrack(
            audioTrack,
            {
              source: Track.Source.Microphone,
              name: 'student-mic',
            }
          );
        } catch {
          // Keep local mic preview working if room cannot publish
        }
      }

      // Real-time audio level meter
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx && audioTrack) {
        const ctx = new AudioCtx();
        studentAudioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(new MediaStream([audioTrack]));
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.72;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.fftSize);
        const tick = () => {
          if (!studentAudioCtxRef.current) return;
          const activeTrack = studentMicStreamRef.current?.getAudioTracks()[0];
          if (!activeTrack || !activeTrack.enabled || activeTrack.readyState !== 'live') {
            setStudentMicLevel(0);
          } else {
            analyser.getByteTimeDomainData(dataArray);
            let sumSquares = 0;
            for (let i = 0; i < dataArray.length; i += 1) {
              const normalized = (dataArray[i] - 128) / 128;
              sumSquares += normalized * normalized;
            }
            const rms = Math.sqrt(sumSquares / dataArray.length);
            setStudentMicLevel(Math.min(100, Math.round(rms * 380)));
          }
          studentAudioRafRef.current = window.requestAnimationFrame(tick);
        };
        if (ctx.state === 'suspended') {
          void ctx.resume().catch(() => {});
        }
        studentAudioRafRef.current = window.requestAnimationFrame(tick);
      }
    } catch (err) {
      setStudentMicError(mapStudentMicErrorToArabic(err));
      setStudentMicActive(false);
    }
  }, [stopStudentMic]);

  // Synchronize student microphone hardware with teacher's permission & local mute toggle
  useEffect(() => {
    if (liveSession.isLive && micAllowed && !localMicMuted) {
      void startStudentMic();
    } else {
      stopStudentMic();
      if (!micAllowed) {
        setStudentMicError(null);
      }
    }
    return () => {
      stopStudentMic();
    };
  }, [liveSession.isLive, micAllowed, localMicMuted, startStudentMic, stopStudentMic]);

  // Connect to real LiveKit room via secure server token endpoint when configured
  useEffect(() => {
    if (!currentUser || !liveSession.isLive) return;
    let cancelled = false;

    const joinLiveKit = async () => {
      setLivekitError(null);
      const tokenResult = await requestLiveKitRoomToken({
        roomName: liveSession.id,
        courseId: liveSession.courseId,
        accessToken: supabaseAccessToken,
        role: currentUser.role,
      });

      if (cancelled) return;

      if (tokenResult.error) {
        setLivekitError(tokenResult.error);
        return;
      }

      if (tokenResult.mode === 'livekit' && tokenResult.token && tokenResult.wsUrl) {
        try {
          const room = await connectToLiveKitRoom(tokenResult.wsUrl, tokenResult.token, {
            onRemoteVideoTrack: (track) => {
              const videoEl = remoteVideoRef.current;
              if (!videoEl) return;
              if (track) {
                track.attach(videoEl);
                void videoEl.play().catch(() => {});
                setHasRemoteVideo(true);
              } else {
                videoEl.srcObject = null;
                setHasRemoteVideo(false);
              }
            },
            onRemoteAudioTrack: (track, attached) => {
              const container = remoteAudioContainerRef.current;
              if (!container) return;
              if (attached) {
                const audioEl = track.attach();
                audioEl.muted = speakerMuted;
                container.appendChild(audioEl);
                setHasRemoteAudio(true);
                void audioEl.play().catch(() => {
                  setAudioAutoplayBlocked(true);
                });
              } else {
                track.detach().forEach((el) => el.remove());
                if (container.children.length === 0) {
                  setHasRemoteAudio(false);
                }
              }
            },
          });

          if (cancelled) {
            await room.disconnect();
            return;
          }
          livekitRoomRef.current = room;
          setLivekitConnected(true);
        } catch {
          if (!cancelled) {
            setLivekitConnected(false);
          }
        }
      }
    };

    void joinLiveKit();

    return () => {
      cancelled = true;
      if (livekitRoomRef.current) {
        void livekitRoomRef.current.disconnect();
        livekitRoomRef.current = null;
      }
      if (remoteAudioContainerRef.current) {
        remoteAudioContainerRef.current.innerHTML = '';
      }
      setLivekitConnected(false);
      setHasRemoteVideo(false);
      setHasRemoteAudio(false);
      setAudioAutoplayBlocked(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, liveSession.isLive, liveSession.id, liveSession.courseId, supabaseAccessToken]);

  // Apply speaker mute toggle to all attached remote audio elements
  useEffect(() => {
    const container = remoteAudioContainerRef.current;
    if (!container) return;
    const audioEls = container.querySelectorAll('audio');
    audioEls.forEach((el) => {
      el.muted = speakerMuted;
    });
  }, [speakerMuted]);

  const handleUnlockRemoteAudio = async () => {
    try {
      if (livekitRoomRef.current) {
        await livekitRoomRef.current.startAudio();
      }
      const container = remoteAudioContainerRef.current;
      if (container) {
        const audioEls = Array.from(container.querySelectorAll('audio'));
        await Promise.all(
          audioEls.map((el) => {
            el.muted = false;
            return el.play().catch(() => {});
          })
        );
      }
      setSpeakerMuted(false);
      setAudioAutoplayBlocked(false);
    } catch {
      setAudioAutoplayBlocked(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveSession.chatMessages.length]);

  // Automatic Attendance Logging when student joins an active Live Broadcast
  useEffect(() => {
    if (currentUser?.role === 'student' && liveSession.isLive) {
      recordStudentAttendance({
        studentId: currentUser.id,
        source: 'live_broadcast',
        sessionKey: liveSession.id,
        title: `بث مباشر: ${liveSession.title}`,
      });
    }
  }, [currentUser?.id, currentUser?.role, liveSession.isLive, liveSession.id, liveSession.title, recordStudentAttendance]);

  if (!currentUser) return null;

  const activeSlide =
    LIVE_LECTURE_SLIDES[liveSession.activeSlideIndex] ?? LIVE_LECTURE_SLIDES[0];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    sendLiveChatMessage(chatText);
    setChatText('');
  };

  if (!liveSession.isLive) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 p-8 sm:p-12 text-center max-w-2xl mx-auto">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <Radio className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">
          لا يوجد بث مباشر جاري في هذه اللحظة
        </h2>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed font-reading">
          فور بدء الأستاذة تبارك الأزيرجاوي للبث المباشر، سيظهر إشعار فوري وبانر الدخول المباشر في الصفحة الرئيسية.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {onOpenSchedule && (
            <button
              type="button"
              onClick={onOpenSchedule}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#D4AF37] to-[#F59E0B] px-5 text-xs sm:text-sm font-extrabold text-slate-950 hover:brightness-105 whitespace-nowrap"
            >
              <CalendarClock className="h-4 w-4" />
              <span>عرض جدول البث الأسبوعي</span>
            </button>
          )}
          <BackButton onClick={onLeave} label="رجوع" variant="light" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Live Session Top Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#0F172A] px-4 sm:px-6 py-3.5 text-white">
        <div className="flex items-center gap-3 min-w-0">
          <BackButton onClick={onLeave} label="رجوع" variant="dark" size="sm" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-bold text-red-400">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span>بث مباشر الآن</span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-300 truncate">{getTrackName(liveSession.track)}</span>
            </div>
            <h1 className="text-sm sm:text-base font-extrabold text-white truncate mt-0.5">
              {liveSession.title}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-amber-300 font-semibold tabular-nums">
            <Users className="h-4 w-4" />
            <span>
              {liveSession.connectedCount} / {liveSession.maxCapacity} طالب
            </span>
          </div>

          {livekitConnected ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-300 font-semibold">
              <Wifi className="h-3.5 w-3.5" />
              <span>بث حي (LiveKit)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-amber-200 font-semibold">
              <WifiOff className="h-3.5 w-3.5" />
              <span>وضع المعاينة</span>
            </span>
          )}

          {currentUser.role === 'student' && (
            <span className="inline-flex items-center gap-1.5 text-emerald-300 font-semibold">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>تم تسجيل حضورك</span>
            </span>
          )}
          <span className="hidden sm:inline-flex items-center gap-1.5 text-slate-300">
            <ShieldCheck className="h-4 w-4 text-[#D4AF37]" />
            <span>حماية الشاشة مفعّلة</span>
          </span>
        </div>
      </div>

      {/* Main Split: Live Stage + Live Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Stage Column */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="rounded-2xl overflow-hidden bg-[#080E1E] border border-slate-800 shadow-sm">
            <PrivacyGuard active={true} className="relative aspect-video w-full">
              {/* Dynamic Watermark moving every 10 seconds */}
              <DynamicWatermark
                studentName={currentUser.fullName}
                studentPhone={currentUser.phone}
                variant="dark"
              />

              {/* LiveKit Remote Audio Container (hidden audio elements) */}
              <div ref={remoteAudioContainerRef} className="hidden" />

              {/* Real LiveKit Remote Video Stream when Teacher publishes camera/screen */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`absolute inset-0 z-10 h-full w-full object-contain bg-[#080E1E] ${
                  hasRemoteVideo ? 'block' : 'hidden'
                }`}
              />

              {/* Overlay Speaker Control & Autoplay Unlock Button when receiving real LiveKit stream */}
              {(hasRemoteVideo || hasRemoteAudio) && (
                <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
                  {audioAutoplayBlocked && (
                    <button
                      type="button"
                      onClick={() => void handleUnlockRemoteAudio()}
                      className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl bg-[#D4AF37] px-3.5 text-xs font-extrabold text-slate-950 shadow hover:bg-amber-400"
                    >
                      <Volume2 className="h-4 w-4" />
                      <span>تفعيل صوت البث المباشر</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSpeakerMuted((m) => !m)}
                    className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl bg-slate-950/80 border border-white/15 px-3 text-xs font-bold text-white hover:bg-slate-900"
                  >
                    {speakerMuted ? (
                      <>
                        <VolumeX className="h-4 w-4 text-red-400" />
                        <span>الصوت مكتوم</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-4 w-4 text-emerald-400" />
                        <span>صوت البث يعمل</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Live Broadcast Content matching Teacher Share Mode (visible when slides/preview mode active) */}
              {!hasRemoteVideo && (
                <div className="relative z-10 flex h-full w-full flex-col justify-between p-5 sm:p-8 bg-gradient-to-br from-[#0F172A] via-[#172542] to-[#080E1E] text-white">
                  {/* Stage Header */}
                  <div className="flex items-center justify-between gap-3 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      {liveSession.shareMode === 'slides' && (
                        <Presentation className="h-4 w-4 text-[#D4AF37]" />
                      )}
                      {liveSession.shareMode === 'whiteboard' && (
                        <PenTool className="h-4 w-4 text-[#D4AF37]" />
                      )}
                      {liveSession.shareMode === 'screen' && (
                        <MonitorPlay className="h-4 w-4 text-[#D4AF37]" />
                      )}
                      <span className="font-bold text-white">الأستاذة تبارك الأزيرجاوي</span>
                      <span className="text-slate-400 hidden sm:inline">
                        ·{' '}
                        {liveSession.shareMode === 'slides'
                          ? 'مشاركة الملزمة التفاعلية'
                          : liveSession.shareMode === 'whiteboard'
                            ? 'السبورة التفاعلية المباشرة'
                            : 'بث شاشة الأستاذة'}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-amber-300 tabular-nums" dir="ltr">
                      LIVE · {liveSession.startedAt}
                    </span>
                  </div>

                  {/* Stage Center Content */}
                  {liveSession.shareMode === 'whiteboard' ? (
                    <div className="my-auto mx-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0B1224]/90 p-5 sm:p-7 space-y-4">
                      <p className="text-xs font-bold text-[#D4AF37]">السبورة المباشرة — حل تمرين حي</p>
                      <div className="space-y-2.5 font-reading text-sm sm:text-base text-slate-100">
                        <p>المطلوب: أوجد الحد السابع في المتتابعة الحسابية التي حدها الأول 5 وأساسها 3.</p>
                        <div
                          dir="ltr"
                          className="rounded-xl bg-slate-950/80 border border-amber-500/30 p-3.5 font-mono text-xs sm:text-sm text-amber-300 space-y-1 tabular-nums"
                        >
                          <div>Uₙ = a + (n - 1) · d</div>
                          <div>U₇ = 5 + (7 - 1) · 3 = 5 + 18 = 23</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="my-auto mx-auto w-full max-w-2xl space-y-3 sm:space-y-4">
                      <p className="text-xs font-semibold text-[#D4AF37]">{activeSlide.label}</p>
                      <h2 className="text-lg sm:text-2xl font-extrabold text-white leading-snug">
                        {activeSlide.heading}
                      </h2>
                      <ul className="space-y-2 text-xs sm:text-sm text-slate-200 font-reading leading-relaxed">
                        {activeSlide.bullets.map((b, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="font-mono text-[#D4AF37] font-bold tabular-nums">
                              0{i + 1}.
                            </span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                      <div
                        dir="ltr"
                        className="inline-block rounded-xl bg-slate-950/75 border border-amber-400/30 px-4 py-2 font-mono text-xs sm:text-sm font-semibold text-[#F59E0B] tabular-nums"
                      >
                        {activeSlide.formula}
                      </div>
                    </div>
                  )}

                  {/* Stage Footer */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      {livekitConnected
                        ? 'متصل بسيرفر LiveKit الآمن — بانتظار تشغيل كاميرا الأستاذة'
                        : 'قاعة البث المباشر المحمية (وضع المعاينة المحلية)'}
                    </span>
                    <span className="font-mono tabular-nums" dir="ltr">
                      HD 1080p · {liveSession.connectedCount} online
                    </span>
                  </div>
                </div>
              )}
            </PrivacyGuard>
          </div>

          {livekitError && (
            <div
              role="alert"
              className="rounded-xl bg-amber-50 border border-amber-300 px-4 py-3 text-xs font-bold text-amber-900"
            >
              {livekitError}
            </div>
          )}

          {studentMicError && (
            <div
              role="alert"
              className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-red-900"
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <span className="font-bold leading-relaxed">{studentMicError}</span>
              </div>
              <button
                type="button"
                onClick={() => void startStudentMic()}
                className="min-h-[36px] inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 text-xs font-bold text-white hover:bg-red-700"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>إعادة المحاولة</span>
              </button>
            </div>
          )}

          {/* Student Controls Bar */}
          <div className="rounded-2xl bg-white border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
            {/* Mic Status Indicator + Real-Time Audio Level Bar */}
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl shrink-0 ${
                  micAllowed && !localMicMuted && studentMicActive
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {micAllowed && !localMicMuted && studentMicActive ? (
                  <Mic className="h-5 w-5" />
                ) : (
                  <MicOff className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">
                  {micAllowed
                    ? localMicMuted
                      ? 'المايك متاح لك (مكتوم حالياً من جهازك)'
                      : studentMicActive
                        ? 'المايك مفتوح — يمكنك التحدث الآن'
                        : 'جاري تفعيل الميكروفون...'
                    : 'المايك مكتوم تلقائياً'}
                </p>
                {micAllowed && !localMicMuted && studentMicActive ? (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-emerald-700">مستوى صوتك:</span>
                    <div className="w-28 h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-75"
                        style={{ width: `${Math.max(studentMicLevel, 4)}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    {micAllowed
                      ? 'سمحت لك الأستاذة تبارك بالمشاركة الصوتية.'
                      : 'ارفع يدك لطلب الإذن بالتحدث من الأستاذة تبارك.'}
                  </p>
                )}
              </div>
            </div>

            {/* Interactive Student Buttons */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              {micAllowed && (
                <button
                  type="button"
                  onClick={() => setLocalMicMuted((m) => !m)}
                  className={`flex-1 sm:flex-none min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl px-4 text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${
                    localMicMuted
                      ? 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {localMicMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  <span>{localMicMuted ? 'فتح صوتي' : 'كتم صوتي'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={toggleMyRaiseHand}
                className={`flex-1 sm:flex-none min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl px-5 text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${
                  handRaised
                    ? 'bg-[#D4AF37] text-slate-950 hover:bg-amber-400'
                    : 'bg-[#0F172A] text-white hover:bg-slate-800'
                }`}
              >
                <Hand className="h-4 w-4" />
                <span>{handRaised ? 'تم رفع اليد (إلغاء)' : 'رفع اليد لطلب التحدث'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Chat Column */}
        <div className="lg:col-span-4 rounded-2xl bg-white border border-slate-200 flex flex-col h-[420px] lg:h-auto lg:max-h-[560px] overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900">الدردشة المباشرة مع الأستاذة</h2>
            <span className="text-xs text-slate-500 tabular-nums">
              {liveSession.chatMessages.length} رسالة
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/70">
            {liveSession.chatMessages.map((msg) => {
              const isAdmin = msg.senderRole === 'admin';
              return (
                <div
                  key={msg.id}
                  className={`rounded-xl p-3 text-sm ${
                    isAdmin
                      ? 'bg-[#0F172A] text-white'
                      : 'bg-white border border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className={`text-xs font-bold ${
                        isAdmin ? 'text-[#D4AF37]' : 'text-slate-900'
                      }`}
                    >
                      {msg.senderName}
                    </span>
                    <span
                      className="font-mono text-[10px] tabular-nums text-slate-400"
                      dir="ltr"
                    >
                      {msg.timestamp}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed font-reading">{msg.text}</p>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex gap-2">
            <input
              type="text"
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder="اكتب سؤالك للأستاذة تبارك..."
              className="flex-1 min-h-[44px] rounded-xl border border-slate-300 bg-slate-50 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0F172A] focus:bg-white focus:outline-none"
            />
            <button
              type="submit"
              aria-label="إرسال الرسالة"
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0F172A] text-[#D4AF37] hover:bg-slate-800 shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
