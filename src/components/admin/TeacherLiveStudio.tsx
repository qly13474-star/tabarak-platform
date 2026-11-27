import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Radio,
  Square,
  Mic,
  MicOff,
  Video,
  VideoOff,
  SwitchCamera,
  Volume2,
  VolumeX,
  Hand,
  Presentation,
  PenTool,
  MonitorPlay,
  Send,
  Users,
  ChevronRight,
  ChevronLeft,
  Eraser,
  UserPlus,
  BellRing,
  AlertTriangle,
  RefreshCw,
  Wifi,
  WifiOff,
  Headphones,
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
import { TrackId } from '../../types';

type CameraFacingMode = 'user' | 'environment';

function formatRealMediaError(err: unknown, contextLabel = 'الكاميرا أو الميكروفون'): string {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return `المتصفح الحالي أو اتصال الصفحة لا يدعم الوصول إلى ${contextLabel} (MediaDevicesUnavailable). يرجى فتح المنصة عبر متصفح حديث وباتصال آمن (HTTPS).`;
  }

  const domErr = err as { name?: string; message?: string } | null;
  const errName = (domErr?.name || (err instanceof Error ? err.name : 'UnknownError')).trim();
  const errMessage = (domErr?.message || (err instanceof Error ? err.message : '')).trim();
  const technicalDetail = errMessage ? `${errName}: ${errMessage}` : errName;

  if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError' || errName === 'SecurityError') {
    return `تم رفض إذن ${contextLabel} من المتصفح [${technicalDetail}]. يرجى السماح بالوصول من إعدادات الموقع ثم الضغط على «إعادة المحاولة».`;
  }
  if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
    return `لم يتم العثور على ${contextLabel} متصل بالجهاز [${technicalDetail}].`;
  }
  if (errName === 'NotReadableError' || errName === 'TrackStartError') {
    return `تعذر تشغيل ${contextLabel} لأن الجهاز مشغول بتطبيق آخر أو لم يُحرر بعد [${technicalDetail}].`;
  }
  if (errName === 'OverconstrainedError') {
    return `إعدادات الكاميرا المطلوبة غير مدعومة على هذا الجهاز [${technicalDetail}].`;
  }
  if (errName === 'AbortError') {
    return `توقف تشغيل ${contextLabel} بشكل مفاجئ أثناء التهيئة [${technicalDetail}].`;
  }

  return `فشل فتح ${contextLabel} [${technicalDetail}]. يرجى إعادة المحاولة.`;
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export const TeacherLiveStudio: React.FC = () => {
  const {
    db,
    liveSession,
    authAccessToken,
    getTrackName,
    startLiveBroadcast,
    endLiveBroadcast,
    setLiveShareMode,
    setLiveSlideIndex,
    toggleParticipantMic,
    muteAllParticipants,
    sendLiveChatMessage,
    simulateIncomingRaiseHand,
  } = usePlatform();

  // LiveKit Room & Published Track Refs
  const hostRoomRef = useRef<Room | null>(null);
  const publishedVideoRef = useRef<LocalTrackPublication | null>(null);
  const publishedAudioRef = useRef<LocalTrackPublication | null>(null);
  const [livekitHostConnected, setLivekitHostConnected] = useState(false);
  const [livekitStatusNote, setLivekitStatusNote] = useState<string | null>(null);

  // Real Camera & Microphone Media State
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const selfMonitorAudioRef = useRef<HTMLAudioElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const activeVideoDeviceIdRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioRafRef = useRef<number | null>(null);

  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [facingMode, setFacingMode] = useState<CameraFacingMode>('user');
  const [hasVideoTrack, setHasVideoTrack] = useState(false);
  const [hasAudioTrack, setHasAudioTrack] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isRequestingMedia, setIsRequestingMedia] = useState(false);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const [isAudioMonitoring, setIsAudioMonitoring] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaNotice, setMediaNotice] = useState<string | null>(null);

  // Stop Web Audio level analyzer
  const stopAudioMeter = useCallback(() => {
    if (audioRafRef.current !== null) {
      window.cancelAnimationFrame(audioRafRef.current);
      audioRafRef.current = null;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  // Start Web Audio level analyzer for the active microphone track
  const startAudioMeter = useCallback(
    (stream: MediaStream) => {
      stopAudioMeter();
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) return;

      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;

        const ctx = new AudioCtx();
        audioContextRef.current = ctx;
        const source = ctx.createMediaStreamSource(new MediaStream([audioTracks[0]]));
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.72;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.fftSize);

        const tick = () => {
          if (!audioContextRef.current) return;
          const activeAudioTrack = localStreamRef.current?.getAudioTracks()[0];
          if (!activeAudioTrack || !activeAudioTrack.enabled || activeAudioTrack.readyState !== 'live') {
            setAudioLevel(0);
          } else {
            analyser.getByteTimeDomainData(dataArray);
            let sumSquares = 0;
            for (let i = 0; i < dataArray.length; i += 1) {
              const normalized = (dataArray[i] - 128) / 128;
              sumSquares += normalized * normalized;
            }
            const rms = Math.sqrt(sumSquares / dataArray.length);
            const scaled = Math.min(100, Math.round(rms * 380));
            setAudioLevel(scaled);
          }
          audioRafRef.current = window.requestAnimationFrame(tick);
        };

        if (ctx.state === 'suspended') {
          void ctx.resume().catch(() => {});
        }
        audioRafRef.current = window.requestAnimationFrame(tick);
      } catch {
        setAudioLevel(0);
      }
    },
    [stopAudioMeter]
  );

  // Sync current local stream to <video> and optional self-monitor <audio>
  const bindMediaElements = useCallback((stream: MediaStream | null) => {
    const videoEl = videoPreviewRef.current;
    if (videoEl) {
      if (stream && stream.getVideoTracks().length > 0) {
        videoEl.srcObject = new MediaStream(stream.getVideoTracks());
        void videoEl.play().catch(() => {});
      } else {
        videoEl.srcObject = null;
      }
    }

    const audioEl = selfMonitorAudioRef.current;
    if (audioEl) {
      if (stream && stream.getAudioTracks().length > 0) {
        audioEl.srcObject = new MediaStream(stream.getAudioTracks());
      } else {
        audioEl.srcObject = null;
      }
    }
  }, []);

  // Publish active local MediaStreamTracks into a connected LiveKit Room
  const syncTracksToLiveKitRoom = useCallback(async (room: Room | null, stream: MediaStream | null) => {
    if (!room || !stream) return;

    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack && !publishedVideoRef.current) {
      try {
        publishedVideoRef.current = await room.localParticipant.publishTrack(videoTrack, {
          source: Track.Source.Camera,
          name: 'teacher-camera',
        });
      } catch {
        // Ignore publish failure and keep local preview running
      }
    }

    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack && !publishedAudioRef.current) {
      try {
        publishedAudioRef.current = await room.localParticipant.publishTrack(audioTrack, {
          source: Track.Source.Microphone,
          name: 'teacher-mic',
        });
      } catch {
        // Ignore publish failure and keep local preview running
      }
    }
  }, []);

  // Stop and release all local camera & microphone hardware tracks
  const stopLocalMedia = useCallback(() => {
    stopAudioMeter();
    setIsAudioMonitoring(false);

    const room = hostRoomRef.current;
    if (room) {
      if (publishedVideoRef.current?.track) {
        try {
          void room.localParticipant.unpublishTrack(publishedVideoRef.current.track, false);
        } catch {
          // Ignore
        }
      }
      if (publishedAudioRef.current?.track) {
        try {
          void room.localParticipant.unpublishTrack(publishedAudioRef.current.track, false);
        } catch {
          // Ignore
        }
      }
    }
    publishedVideoRef.current = null;
    publishedAudioRef.current = null;
    activeVideoDeviceIdRef.current = null;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      localStreamRef.current = null;
    }

    bindMediaElements(null);
    setHasVideoTrack(false);
    setHasAudioTrack(false);
  }, [bindMediaElements, stopAudioMeter]);

  // Request real camera & microphone via navigator.mediaDevices.getUserMedia
  const startLocalMedia = useCallback(
    async (requestedFacing: CameraFacingMode = facingMode) => {
      setIsRequestingMedia(true);
      setMediaError(null);
      setMediaNotice(null);

      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setMediaError(formatRealMediaError(null));
        setIsRequestingMedia(false);
        return;
      }

      stopLocalMedia();

      let combinedStream: MediaStream | null = null;
      let partialNotice: string | null = null;

      try {
        combinedStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: requestedFacing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (primaryErr) {
        const errName = (primaryErr as { name?: string } | null)?.name || '';
        if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError' || errName === 'SecurityError') {
          setMediaError(formatRealMediaError(primaryErr));
          setIsRequestingMedia(false);
          return;
        }

        // Graceful fallback: try generic constraints or acquire video/audio independently
        try {
          combinedStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } catch {
          const fallbackTracks: MediaStreamTrack[] = [];
          try {
            const videoOnly = await navigator.mediaDevices.getUserMedia({ video: true });
            fallbackTracks.push(...videoOnly.getVideoTracks());
          } catch {
            partialNotice = 'تعذر العثور على كاميرا؛ تم تفعيل الميكروفون فقط.';
          }

          try {
            const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
            fallbackTracks.push(...audioOnly.getAudioTracks());
          } catch {
            partialNotice =
              fallbackTracks.length > 0
                ? 'تعذر العثور على ميكروفون؛ تم تفعيل الكاميرا فقط.'
                : null;
          }

          if (fallbackTracks.length > 0) {
            combinedStream = new MediaStream(fallbackTracks);
          } else {
            setMediaError(formatRealMediaError(primaryErr));
            setIsRequestingMedia(false);
            return;
          }
        }
      }

      localStreamRef.current = combinedStream;
      const vTracks = combinedStream.getVideoTracks();
      const aTracks = combinedStream.getAudioTracks();
      activeVideoDeviceIdRef.current = vTracks[0]?.getSettings?.().deviceId ?? null;

      setHasVideoTrack(vTracks.length > 0);
      setHasAudioTrack(aTracks.length > 0);
      setCameraEnabled(vTracks.length > 0);
      setMicEnabled(aTracks.length > 0);
      setMediaNotice(partialNotice);

      bindMediaElements(combinedStream);
      if (aTracks.length > 0) {
        startAudioMeter(combinedStream);
      }

      if (hostRoomRef.current) {
        await syncTracksToLiveKitRoom(hostRoomRef.current, combinedStream);
      }

      setIsRequestingMedia(false);
    },
    [bindMediaElements, facingMode, startAudioMeter, stopLocalMedia, syncTracksToLiveKitRoom]
  );

  // Toggle Camera On / Off
  const handleToggleCamera = useCallback(async () => {
    const stream = localStreamRef.current;
    const videoTrack = stream?.getVideoTracks()[0];

    if (!videoTrack || videoTrack.readyState === 'ended') {
      await startLocalMedia(facingMode);
      return;
    }

    const nextEnabled = !cameraEnabled;
    videoTrack.enabled = nextEnabled;
    setCameraEnabled(nextEnabled);

    if (publishedVideoRef.current) {
      try {
        if (nextEnabled) {
          await publishedVideoRef.current.unmute();
        } else {
          await publishedVideoRef.current.mute();
        }
      } catch {
        // Ignore LiveKit mute error
      }
    }
  }, [cameraEnabled, facingMode, startLocalMedia]);

  // Toggle Microphone On / Off
  const handleToggleMic = useCallback(async () => {
    const stream = localStreamRef.current;
    const audioTrack = stream?.getAudioTracks()[0];

    if (!audioTrack || audioTrack.readyState === 'ended') {
      await startLocalMedia(facingMode);
      return;
    }

    const nextEnabled = !micEnabled;
    audioTrack.enabled = nextEnabled;
    setMicEnabled(nextEnabled);
    if (!nextEnabled) {
      setAudioLevel(0);
    }

    if (publishedAudioRef.current) {
      try {
        if (nextEnabled) {
          await publishedAudioRef.current.unmute();
        } else {
          await publishedAudioRef.current.mute();
        }
      } catch {
        // Ignore LiveKit mute error
      }
    }
  }, [facingMode, micEnabled, startLocalMedia]);

  // Switch Front / Rear Camera smoothly on Android & iOS (stop tracks -> 200ms -> ideal facingMode / enumerateDevices deviceId)
  const handleSwitchCamera = useCallback(async () => {
    if (isSwitchingCamera) return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setMediaError(formatRealMediaError(null, 'الكاميرا'));
      return;
    }

    const nextFacing: CameraFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setIsSwitchingCamera(true);
    setMediaError(null);
    setMediaNotice(null);

    try {
      const currentStream = localStreamRef.current;
      const prevVideoTracks = currentStream ? [...currentStream.getVideoTracks()] : [];
      const prevDeviceId =
        prevVideoTracks[0]?.getSettings?.().deviceId || activeVideoDeviceIdRef.current || null;
      const room = hostRoomRef.current;

      // Enumerate available video input devices while permission is active
      let videoInputs: MediaDeviceInfo[] = [];
      try {
        if (navigator.mediaDevices.enumerateDevices) {
          const allDevices = await navigator.mediaDevices.enumerateDevices();
          videoInputs = allDevices.filter((d) => d.kind === 'videoinput' && Boolean(d.deviceId));
        }
      } catch {
        videoInputs = [];
      }

      // 1. Unpublish old video track from LiveKit (keep audio uninterrupted)
      if (room && publishedVideoRef.current?.track) {
        try {
          await room.localParticipant.unpublishTrack(publishedVideoRef.current.track, false);
        } catch {
          // Ignore LiveKit unpublish errors
        }
        publishedVideoRef.current = null;
      }

      // 2. Immediately stop ALL previous video tracks and release <video> element
      prevVideoTracks.forEach((track) => {
        track.stop();
        currentStream?.removeTrack(track);
      });
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = null;
      }

      // 3. Wait 200ms so Android / iOS camera hardware fully releases before acquiring next camera
      await sleepMs(200);

      // Helper to pick best matching deviceId for the target facing direction
      const pickTargetDeviceId = (): string | null => {
        if (videoInputs.length < 2) return null;

        const isBackLabel = (label: string) =>
          /back|rear|environment|world|خلف/i.test(label);
        const isFrontLabel = (label: string) =>
          /front|user|face|selfie|أمام/i.test(label);

        const labeledMatch = videoInputs.find((d) => {
          if (d.deviceId === prevDeviceId) return false;
          return nextFacing === 'environment' ? isBackLabel(d.label) : isFrontLabel(d.label);
        });
        if (labeledMatch) return labeledMatch.deviceId;

        const currentIndex = videoInputs.findIndex((d) => d.deviceId === prevDeviceId);
        if (currentIndex >= 0) {
          return videoInputs[(currentIndex + 1) % videoInputs.length].deviceId;
        }
        const firstOther = videoInputs.find((d) => d.deviceId !== prevDeviceId);
        return firstOther?.deviceId ?? null;
      };

      const targetDeviceId = pickTargetDeviceId();
      let newVideoStream: MediaStream | null = null;
      let lastError: unknown = null;

      // Primary attempt: use facingMode: { ideal: nextFacing } (NO exact!)
      try {
        newVideoStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: nextFacing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (err) {
        lastError = err;
      }

      // If facingMode returned the exact same camera (common on some Android WebViews / desktops)
      // OR failed, cycle explicitly by enumerated deviceId
      const acquiredDeviceId = newVideoStream?.getVideoTracks()[0]?.getSettings?.().deviceId ?? null;
      const gotSameCamera =
        Boolean(prevDeviceId) && Boolean(acquiredDeviceId) && acquiredDeviceId === prevDeviceId;

      if ((!newVideoStream || gotSameCamera) && targetDeviceId) {
        if (newVideoStream) {
          newVideoStream.getTracks().forEach((t) => t.stop());
          newVideoStream = null;
          await sleepMs(200);
        }
        try {
          newVideoStream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: { ideal: targetDeviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch (err) {
          lastError = err;
        }
      }

      // Final fallback: generic { video: true } so camera recovers gracefully
      if (!newVideoStream) {
        try {
          newVideoStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: nextFacing } },
            audio: false,
          });
        } catch (err) {
          lastError = err;
          try {
            newVideoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          } catch (finalErr) {
            throw finalErr || lastError;
          }
        }
      }

      const newVideoTrack = newVideoStream.getVideoTracks()[0];
      if (!newVideoTrack) {
        throw new Error('لم يُرجع المتصفح مسار فيديو صالح من الكاميرا الجديدة.');
      }

      newVideoTrack.enabled = cameraEnabled;
      const settings = newVideoTrack.getSettings?.();
      activeVideoDeviceIdRef.current = settings?.deviceId ?? targetDeviceId ?? null;

      if (!localStreamRef.current) {
        localStreamRef.current = new MediaStream([newVideoTrack]);
      } else {
        localStreamRef.current.addTrack(newVideoTrack);
      }

      const resolvedFacing: CameraFacingMode =
        settings?.facingMode === 'environment'
          ? 'environment'
          : settings?.facingMode === 'user'
            ? 'user'
            : nextFacing;

      setFacingMode(resolvedFacing);
      setHasVideoTrack(true);
      bindMediaElements(localStreamRef.current);

      if (room) {
        try {
          publishedVideoRef.current = await room.localParticipant.publishTrack(newVideoTrack, {
            source: Track.Source.Camera,
            name: 'teacher-camera',
          });
          if (!cameraEnabled) {
            await publishedVideoRef.current.mute();
          }
        } catch {
          // Keep local preview working even if LiveKit publish fails
        }
      }
    } catch (err) {
      setMediaError(formatRealMediaError(err, 'تبديل الكاميرا'));
    } finally {
      setIsSwitchingCamera(false);
    }
  }, [bindMediaElements, cameraEnabled, facingMode, isSwitchingCamera]);

  // Toggle local audio self-check (so teacher can hear/verify mic audio in Local Preview)
  const handleToggleSelfMonitor = useCallback(() => {
    const audioEl = selfMonitorAudioRef.current;
    const next = !isAudioMonitoring;
    setIsAudioMonitoring(next);
    if (audioEl) {
      audioEl.muted = !next;
      if (next) {
        void audioEl.play().catch(() => {});
      }
    }
  }, [isAudioMonitoring]);

  // Auto-activate real Camera & Microphone when broadcast is active; clean up on end/unmount
  useEffect(() => {
    if (!liveSession.isLive) {
      stopLocalMedia();
      setMediaError(null);
      setMediaNotice(null);
      return;
    }

    void startLocalMedia('user');

    return () => {
      stopLocalMedia();
    };
    // Intentionally scoped to broadcast active state so toggling facingMode doesn't double-trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveSession.isLive]);

  // Keep <video> bound if the active video element mounts after stream acquisition
  useEffect(() => {
    if (liveSession.isLive && localStreamRef.current) {
      bindMediaElements(localStreamRef.current);
    }
  }, [liveSession.isLive, hasVideoTrack, bindMediaElements]);

  // Connect to LiveKit Room when broadcast is live (graceful Local Preview fallback if unreachable)
  useEffect(() => {
    if (!liveSession.isLive) {
      if (hostRoomRef.current) {
        void hostRoomRef.current.disconnect();
        hostRoomRef.current = null;
      }
      publishedVideoRef.current = null;
      publishedAudioRef.current = null;
      setLivekitHostConnected(false);
      setLivekitStatusNote(null);
      return;
    }

    let cancelled = false;
    const connectHost = async () => {
      const tokenRes = await requestLiveKitRoomToken({
        roomName: liveSession.id,
        courseId: liveSession.courseId,
        accessToken: authAccessToken,
        role: 'admin',
      });
      if (cancelled) return;

      if (tokenRes.mode === 'livekit' && tokenRes.token && tokenRes.wsUrl) {
        try {
          const room = await connectToLiveKitRoom(tokenRes.wsUrl, tokenRes.token);
          if (cancelled) {
            await room.disconnect();
            return;
          }
          hostRoomRef.current = room;
          setLivekitHostConnected(true);
          setLivekitStatusNote(null);

          if (localStreamRef.current) {
            await syncTracksToLiveKitRoom(room, localStreamRef.current);
          }
        } catch {
          if (!cancelled) {
            setLivekitHostConnected(false);
            setLivekitStatusNote('تعذر الاتصال بخادم LiveKit — تم تفعيل المعاينة المحلية (Local Preview) للكاميرا والصوت.');
          }
        }
      } else {
        setLivekitHostConnected(false);
        setLivekitStatusNote(
          tokenRes.error
            ? `${tokenRes.error} — تعمل الكاميرا والصوت حالياً في وضع المعاينة المحلية (Local Preview).`
            : 'وضع المعاينة المحلية (Local Preview) — الكاميرا والميكروفون يعملان مباشرة لفحص الصورة والصوت.'
        );
      }
    };

    void connectHost();
    return () => {
      cancelled = true;
      if (hostRoomRef.current) {
        void hostRoomRef.current.disconnect();
        hostRoomRef.current = null;
      }
      publishedVideoRef.current = null;
      publishedAudioRef.current = null;
      setLivekitHostConnected(false);
    };
  }, [liveSession.isLive, liveSession.id, liveSession.courseId, authAccessToken, syncTracksToLiveKitRoom]);

  const handleEndBroadcast = () => {
    stopLocalMedia();
    if (hostRoomRef.current) {
      void hostRoomRef.current.disconnect();
      hostRoomRef.current = null;
    }
    setLivekitHostConnected(false);
    endLiveBroadcast();
  };

  const [selectedTrack, setSelectedTrack] = useState<TrackId>(liveSession.track);
  const selectedTrackObj =
    db.tracks.find((t) => t.id === selectedTrack) ?? db.tracks[0];
  const availableSpecs =
    selectedTrackObj?.branches ?? selectedTrackObj?.departments ?? [];
  const availableSubjects = selectedTrackObj?.subjects ?? [];

  const [selectedSubStage, setSelectedSubStage] = useState<string>(
    selectedTrackObj?.subStages[0] ?? 'عام'
  );
  const [selectedBranch, setSelectedBranch] = useState<string>('الجميع');
  const [selectedSubject, setSelectedSubject] = useState<string>('');

  const trackCourses = db.courses.filter((c) => c.track === selectedTrack);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    trackCourses[0]?.id ?? db.courses[0]?.id ?? ''
  );
  const [broadcastTitle, setBroadcastTitle] = useState(
    'مراجعة شاملة وحل أسئلة وزارية مباشرة'
  );
  const [chatInput, setChatInput] = useState('');
  const [notificationSentText, setNotificationSentText] = useState<string | null>(null);

  // Interactive HTML5 Whiteboard Canvas state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const [penColor, setPenColor] = useState<'#F59E0B' | '#FFFFFF' | '#38BDF8'>('#F59E0B');

  useEffect(() => {
    const coursesForTrack = db.courses.filter((c) => c.track === selectedTrack);
    if (coursesForTrack.length > 0 && !coursesForTrack.some((c) => c.id === selectedCourseId)) {
      setSelectedCourseId(coursesForTrack[0].id);
    }
  }, [selectedTrack, db.courses, selectedCourseId]);

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    isDrawingRef.current = true;
    const { x, y } = getCanvasPoint(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasPoint(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
  };

  const clearWhiteboard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleStartLive = (e: React.FormEvent) => {
    e.preventDefault();
    const course = db.courses.find((c) => c.id === selectedCourseId);
    const resolvedBranch =
      availableSpecs.length > 0 && selectedBranch !== 'الجميع'
        ? selectedBranch
        : course?.branch;
    const baseSubStage = selectedSubStage || course?.subStage || selectedTrackObj?.subStages[0] || 'عام';
    const subStageDisplay = resolvedBranch ? `${baseSubStage} — ${resolvedBranch}` : baseSubStage;

    startLiveBroadcast({
      title: broadcastTitle,
      track: selectedTrack,
      subStage: subStageDisplay,
      branch: resolvedBranch,
      subject: selectedSubject.trim() || course?.subject || undefined,
      courseId: selectedCourseId,
    });
    setNotificationSentText(
      `تم بدء البث وإرسال إشعار فوري لجميع طلبة ${getTrackName(selectedTrack)} (${subStageDisplay}).`
    );
    window.setTimeout(() => setNotificationSentText(null), 5000);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendLiveChatMessage(chatInput);
    setChatInput('');
  };

  const raisedHandParticipants = liveSession.participants.filter((p) => p.handRaised);
  const activeSlide =
    LIVE_LECTURE_SLIDES[liveSession.activeSlideIndex] ?? LIVE_LECTURE_SLIDES[0];

  // Visual 5-bar equalizer thresholds for live microphone level
  const micBarThresholds = [8, 22, 40, 62, 82];

  return (
    <div className="space-y-6">
      {/* Studio Header + Direct Media Controls next to End Broadcast */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">
            استوديو البث المباشر التفاعلي
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            إدارة البث المباشر ({livekitHostConnected ? 'متصل بسيرفر LiveKit الحي' : 'معاينة محلية حية · سعة 200 طالب'})، الكاميرا والصوت، مشاركة الملزمة والسبورة، والتحكم بمايكات الطلبة.
          </p>
        </div>

        {liveSession.isLive && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <span className="inline-flex items-center gap-2 rounded-xl bg-rose-500/15 border border-rose-400/35 px-3 min-h-[42px] text-xs font-bold text-rose-300 tabular-nums">
              <span className="h-2.5 w-2.5 rounded-full bg-red-600 animate-pulse" />
              <span>مباشر · {liveSession.connectedCount}/{liveSession.maxCapacity}</span>
            </span>

            {/* Camera On/Off Toggle */}
            <button
              type="button"
              onClick={() => void handleToggleCamera()}
              disabled={isRequestingMedia}
              className={`min-h-[42px] inline-flex items-center gap-2 rounded-xl px-3.5 text-xs font-bold transition-colors whitespace-nowrap border ${
                cameraEnabled && hasVideoTrack
                  ? 'bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 shadow-[0_8px_22px_-6px_rgba(147,51,234,0.65)] border-purple-400 text-white hover:brightness-110'
                  : 'bg-white/[0.06] border-purple-500/25 text-slate-200 hover:bg-white/15'
              }`}
            >
              {cameraEnabled && hasVideoTrack ? (
                <Video className="h-4 w-4 text-purple-300" />
              ) : (
                <VideoOff className="h-4 w-4 text-rose-400" />
              )}
              <span>{cameraEnabled && hasVideoTrack ? 'إيقاف الكاميرا' : 'تشغيل الكاميرا'}</span>
            </button>

            {/* Microphone On/Off Toggle + Live Visual Audio Level Bars */}
            <button
              type="button"
              onClick={() => void handleToggleMic()}
              disabled={isRequestingMedia}
              className={`min-h-[42px] inline-flex items-center gap-2 rounded-xl px-3.5 text-xs font-bold transition-colors whitespace-nowrap border ${
                micEnabled && hasAudioTrack
                  ? 'bg-emerald-700 border-emerald-700 text-white hover:bg-emerald-800'
                  : 'bg-white/[0.06] border-purple-500/25 text-slate-200 hover:bg-white/15'
              }`}
            >
              {micEnabled && hasAudioTrack ? (
                <Mic className="h-4 w-4 text-emerald-200" />
              ) : (
                <MicOff className="h-4 w-4 text-rose-400" />
              )}
              <span>{micEnabled && hasAudioTrack ? 'كتم المايك' : 'تشغيل المايك'}</span>

              {/* Real-time Audio Level Equalizer Bars */}
              <span
                aria-label={`مستوى الصوت ${audioLevel}%`}
                className="inline-flex items-end gap-[2px] h-4 px-1"
              >
                {micBarThresholds.map((threshold, idx) => {
                  const active = micEnabled && hasAudioTrack && audioLevel >= threshold;
                  const heightClasses = ['h-1.5', 'h-2', 'h-2.5', 'h-3.5', 'h-4'];
                  return (
                    <span
                      key={threshold}
                      className={`w-[3px] rounded-full transition-all duration-75 ${heightClasses[idx]} ${
                        active
                          ? idx >= 4
                            ? 'bg-amber-300'
                            : 'bg-emerald-200'
                          : micEnabled && hasAudioTrack
                            ? 'bg-emerald-950/40'
                            : 'bg-slate-300'
                      }`}
                    />
                  );
                })}
              </span>
            </button>

            {/* Switch Front / Rear Camera Button */}
            <button
              type="button"
              onClick={() => void handleSwitchCamera()}
              disabled={isRequestingMedia || isSwitchingCamera || !hasVideoTrack}
              title="تبديل بين الكاميرا الأمامية والخلفية"
              className="min-h-[42px] inline-flex items-center gap-1.5 rounded-xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/25 px-3.5 text-xs font-bold text-slate-100 hover:bg-white/[0.08] disabled:opacity-50 whitespace-nowrap"
            >
              <SwitchCamera className={`h-4 w-4 text-purple-300 ${isSwitchingCamera ? 'animate-spin' : ''}`} />
              <span>{facingMode === 'user' ? 'كاميرا خلفية' : 'كاميرا أمامية'}</span>
            </button>

            {/* End Broadcast Button */}
            <button
              type="button"
              onClick={handleEndBroadcast}
              className="min-h-[42px] inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 text-xs font-bold text-white hover:bg-red-700 whitespace-nowrap"
            >
              <Square className="h-3.5 w-3.5 fill-white" />
              <span>إنهاء البث</span>
            </button>
          </div>
        )}
      </div>

      {notificationSentText && (
        <div
          role="status"
          className="flex items-center gap-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/35 px-4 py-3 text-sm font-semibold text-emerald-200"
        >
          <BellRing className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{notificationSentText}</span>
        </div>
      )}

      {/* Start New Broadcast Setup Panel (when offline) */}
      {!liveSession.isLive ? (
        <form
          onSubmit={handleStartLive}
          className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-6 sm:p-8 max-w-2xl space-y-5"
        >
          <div>
            <h2 className="text-lg font-extrabold text-white">بدء بث مباشر جديد</h2>
            <p className="text-xs text-slate-400 mt-1">
              اختر المرحلة والدورة ثم اضغط بدء لتشغيل الكاميرا والميكروفون مباشرة وإرسال إشعار فوري للطلبة.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="live-track" className="block text-xs font-bold text-slate-200 mb-1.5">
                المسار / المرحلة الدراسية
              </label>
              <select
                id="live-track"
                value={selectedTrack}
                onChange={(e) => {
                  const next = e.target.value as TrackId;
                  setSelectedTrack(next);
                  const trk = db.tracks.find((t) => t.id === next);
                  setSelectedSubStage(trk?.subStages[0] ?? 'عام');
                  setSelectedBranch('الجميع');
                  setSelectedSubject('');
                }}
                className="w-full min-h-[44px] rounded-xl border border-purple-500/25 bg-white/[0.045] backdrop-blur-xl px-3 text-sm font-medium text-white"
              >
                {db.tracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="live-substage" className="block text-xs font-bold text-slate-200 mb-1.5">
                الصف / المرحلة الفرعية
              </label>
              <select
                id="live-substage"
                value={selectedSubStage}
                onChange={(e) => setSelectedSubStage(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-purple-500/25 bg-white/[0.045] backdrop-blur-xl px-3 text-sm font-medium text-white"
              >
                <option value="جميع الصفوف">جميع صفوف المرحلة</option>
                {(selectedTrackObj?.subStages ?? []).map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>

            {availableSpecs.length > 0 && (
              <div>
                <label htmlFor="live-branch" className="block text-xs font-bold text-slate-200 mb-1.5">
                  {selectedTrackObj?.specializationLabel || 'الفرع / القسم'}
                </label>
                <select
                  id="live-branch"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-purple-500/25 bg-white/[0.045] backdrop-blur-xl px-3 text-sm font-medium text-white"
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

            <div>
              <label htmlFor="live-subject" className="block text-xs font-bold text-slate-200 mb-1.5">
                المادة الدراسية (اختياري)
              </label>
              <input
                id="live-subject"
                type="text"
                list="live-studio-subjects-list"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                placeholder="اختاري من مواد المرحلة أو اكتبيها..."
                className="w-full min-h-[44px] rounded-xl border border-purple-500/25 bg-white/[0.045] backdrop-blur-xl px-3 text-sm font-medium text-white"
              />
              <datalist id="live-studio-subjects-list">
                {availableSubjects.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>

            <div className={availableSpecs.length > 0 ? 'sm:col-span-2' : ''}>
              <label htmlFor="live-course" className="block text-xs font-bold text-slate-200 mb-1.5">
                الدورة المرتبطة (اختياري)
              </label>
              <select
                id="live-course"
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-purple-500/25 bg-white/[0.045] backdrop-blur-xl px-3 text-sm font-medium text-white"
              >
                <option value="">بث مباشر عام للمرحلة</option>
                {trackCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="live-title" className="block text-xs font-bold text-slate-200 mb-1.5">
              عنوان جلسة البث المباشر
            </label>
            <input
              id="live-title"
              type="text"
              value={broadcastTitle}
              onChange={(e) => setBroadcastTitle(e.target.value)}
              placeholder="مثال: مراجعة الفصل الأول وحل الوزاريات"
              className="w-full min-h-[46px] rounded-xl border border-purple-500/25 bg-[#110D1F]/85 px-4 text-sm text-white focus:border-purple-400 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 shadow-[0_8px_22px_-6px_rgba(147,51,234,0.65)] px-6 py-3 text-sm font-bold text-white hover:brightness-110 transition-colors"
          >
            <Radio className="h-4 w-4 text-purple-300" />
            <span>بدء البث المباشر وإرسال إشعار فوري للطلاب</span>
          </button>
        </form>
      ) : (
        /* Active Live Studio Workspace */
        <div className="space-y-5">
          {/* 1. Real Teacher Live Video Preview Frame at Top of Studio */}
          <div className="rounded-2xl overflow-hidden bg-[#090712] border border-purple-500/20 text-white shadow-sm">
            {/* Hidden audio element used only when teacher enables self-monitor test */}
            <audio ref={selfMonitorAudioRef} autoPlay playsInline muted={!isAudioMonitoring} className="hidden" />

            {/* Video Preview Header Bar */}
            <div className="px-4 sm:px-5 py-3 bg-[#110D1F] border-b border-purple-500/20 flex flex-wrap items-center justify-between gap-2.5 text-xs">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-600/20 border border-red-500/40 px-2.5 py-1 font-extrabold text-red-300">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  <span>معاينة كاميرا الأستاذة تبارك (مباشر)</span>
                </span>

                {livekitHostConnected ? (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-400/30 px-2.5 py-1 font-bold text-emerald-300">
                    <Wifi className="h-3.5 w-3.5" />
                    <span>بث حي متصل بـ LiveKit</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 border border-purple-400/35 px-2.5 py-1 font-bold text-purple-300">
                    <WifiOff className="h-3.5 w-3.5" />
                    <span>معاينة محلية (Local Preview)</span>
                  </span>
                )}

                <span className="hidden sm:inline text-slate-400">
                  · {facingMode === 'user' ? 'الكاميرا الأمامية' : 'الكاميرا الخلفية'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {hasAudioTrack && (
                  <button
                    type="button"
                    onClick={handleToggleSelfMonitor}
                    title="استمعي لصوتك محلياً لفحص الميكروفون (يفضل استخدام سماعة لتجنب الصدى)"
                    className={`min-h-[34px] inline-flex items-center gap-1.5 rounded-lg px-3 text-[11px] font-bold transition-colors border ${
                      isAudioMonitoring
                        ? 'bg-purple-500 border-amber-400 text-white'
                        : 'bg-white/[0.06] border-purple-500/25 text-slate-200 hover:bg-purple-500/25'
                    }`}
                  >
                    <Headphones className="h-3.5 w-3.5" />
                    <span>{isAudioMonitoring ? 'إيقاف سماع صوتي' : 'فحص سماع الصوت'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => void startLocalMedia(facingMode)}
                  disabled={isRequestingMedia}
                  className="min-h-[34px] inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] border border-purple-500/25 px-3 text-[11px] font-bold text-slate-200 hover:bg-purple-500/25 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isRequestingMedia ? 'animate-spin' : ''}`} />
                  <span>تحديث الكاميرا</span>
                </button>
              </div>
            </div>

            {/* Permission / Media Error Alert Banner */}
            {mediaError && (
              <div
                role="alert"
                className="mx-4 sm:mx-5 mt-4 rounded-xl bg-red-950/80 border border-red-500/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm font-extrabold text-red-200">
                      تعذر الوصول إلى الكاميرا أو الميكروفون
                    </p>
                    <p className="text-xs text-red-100/90 leading-relaxed font-reading">
                      {mediaError}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void startLocalMedia(facingMode)}
                  className="min-h-[40px] inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-xs font-bold text-white hover:bg-red-500 shrink-0"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>إعادة المحاولة</span>
                </button>
              </div>
            )}

            {/* Partial Device Notice */}
            {mediaNotice && !mediaError && (
              <div className="mx-4 sm:mx-5 mt-3 rounded-xl bg-amber-500/15 border border-purple-400/35 px-4 py-2.5 text-xs font-semibold text-amber-200">
                {mediaNotice}
              </div>
            )}

            {/* Live Video Viewport */}
            <div className="p-4 sm:p-5">
              <div className="relative aspect-video max-h-[380px] w-full mx-auto overflow-hidden rounded-2xl bg-[#090712] border border-purple-500/20">
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  playsInline
                  muted
                  className={`h-full w-full object-cover transition-opacity duration-200 ${
                    facingMode === 'user' ? 'scale-x-[-1]' : ''
                  } ${cameraEnabled && hasVideoTrack ? 'opacity-100' : 'opacity-0'}`}
                />

                {/* Loading State while awaiting browser permission */}
                {isRequestingMedia && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#090712]/90 p-6 text-center">
                    <RefreshCw className="h-8 w-8 text-purple-300 animate-spin" />
                    <p className="text-sm font-extrabold text-white">
                      جاري طلب إذن الوصول إلى الكاميرا والميكروفون...
                    </p>
                    <p className="text-xs text-slate-400 max-w-md">
                      يرجى الضغط على «سماح / Allow» في نافذة المتصفح لتفعيل الصورة والصوت في البث المباشر.
                    </p>
                  </div>
                )}

                {/* Camera Off / Unavailable Overlay */}
                {!isRequestingMedia && (!cameraEnabled || !hasVideoTrack) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#1A1033] via-[#110D1F] to-[#090712] p-6 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/90 border border-purple-500/20 text-slate-300">
                      <VideoOff className="h-8 w-8 text-purple-300" />
                    </div>
                    <div>
                      <p className="text-sm sm:text-base font-extrabold text-white">
                        {hasVideoTrack ? 'الكاميرا متوقفة مؤقتاً' : 'لم يتم تشغيل الكاميرا بعد'}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {hasVideoTrack
                          ? 'اضغطي على «تشغيل الكاميرا» لإظهار الصورة المباشرة للطلاب.'
                          : 'تأكدي من منح إذن الكاميرا للمتصفح ثم اضغطي على زر التشغيل.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleToggleCamera()}
                      className="mt-1 min-h-[40px] inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 px-4 text-xs font-extrabold text-white hover:bg-purple-500"
                    >
                      <Video className="h-4 w-4" />
                      <span>تشغيل الكاميرا الآن</span>
                    </button>
                  </div>
                )}

                {/* Bottom Overlay: Teacher Identity + Real-time Audio Level Meter */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/95 via-slate-950/75 to-transparent px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-xs sm:text-sm font-extrabold text-white truncate">
                      الأستاذة تبارك الزيرجاوي
                    </span>
                    <span className="text-[11px] text-slate-300 hidden sm:inline truncate">
                      · {liveSession.title}
                    </span>
                  </div>

                  {/* Real-time Audio Level Meter Bar */}
                  <div className="flex items-center gap-2.5 rounded-xl bg-slate-900/90 border border-purple-500/20 px-3 py-1.5">
                    {micEnabled && hasAudioTrack ? (
                      <Volume2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : (
                      <MicOff className="h-4 w-4 text-red-400 shrink-0" />
                    )}
                    <span className="text-[11px] font-bold text-slate-200 whitespace-nowrap">
                      {micEnabled && hasAudioTrack ? 'مستوى الصوت' : 'المايك مكتوم'}
                    </span>
                    <div className="w-24 sm:w-32 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-75 ${
                          audioLevel > 78
                            ? 'bg-purple-500'
                            : audioLevel > 25
                              ? 'bg-emerald-400'
                              : 'bg-emerald-500/80'
                        }`}
                        style={{ width: `${micEnabled && hasAudioTrack ? Math.max(audioLevel, 4) : 0}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-slate-300 tabular-nums w-7 text-left" dir="ltr">
                      {micEnabled && hasAudioTrack ? `${audioLevel}%` : '0%'}
                    </span>
                  </div>
                </div>
              </div>

              {livekitStatusNote && (
                <p className="mt-2.5 text-[11px] text-slate-400 text-center">
                  {livekitStatusNote}
                </p>
              )}
            </div>
          </div>

          {/* 2. Slides / Whiteboard Stage + Raised Hands Queue */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            {/* Broadcast Stage & Presentation Controls */}
            <div className="xl:col-span-8 space-y-4">
              {/* Share Mode Toolbar */}
              <div className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setLiveShareMode('slides')}
                    className={`min-h-[40px] inline-flex items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition-colors whitespace-nowrap ${
                      liveSession.shareMode === 'slides'
                        ? 'bg-[#110D1F] text-white'
                        : 'bg-white/[0.06] text-slate-200 hover:bg-white/15'
                    }`}
                  >
                    <Presentation className="h-4 w-4 text-purple-300" />
                    <span>مشاركة الملزمة</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLiveShareMode('whiteboard')}
                    className={`min-h-[40px] inline-flex items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition-colors whitespace-nowrap ${
                      liveSession.shareMode === 'whiteboard'
                        ? 'bg-[#110D1F] text-white'
                        : 'bg-white/[0.06] text-slate-200 hover:bg-white/15'
                    }`}
                  >
                    <PenTool className="h-4 w-4 text-purple-300" />
                    <span>السبورة التفاعلية</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLiveShareMode('screen')}
                    className={`min-h-[40px] inline-flex items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition-colors whitespace-nowrap ${
                      liveSession.shareMode === 'screen'
                        ? 'bg-[#110D1F] text-white'
                        : 'bg-white/[0.06] text-slate-200 hover:bg-white/15'
                    }`}
                  >
                    <MonitorPlay className="h-4 w-4 text-purple-300" />
                    <span>مشاركة الشاشة</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={muteAllParticipants}
                  className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-rose-500/15 border border-rose-400/35 px-3.5 text-xs font-bold text-rose-300 hover:bg-rose-500/25 whitespace-nowrap"
                >
                  <VolumeX className="h-4 w-4" />
                  <span>كتم صوت الجميع</span>
                </button>
              </div>

              {/* Live Stage Monitor */}
              <div className="rounded-2xl overflow-hidden bg-[#110D1F] border border-purple-500/20 text-white">
                <div className="px-5 py-3 border-b border-purple-500/20 flex items-center justify-between text-xs">
                  <span className="font-bold text-white truncate">
                    {liveSession.title} · {getTrackName(liveSession.track)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-purple-300 font-mono tabular-nums shrink-0">
                    <Users className="h-3.5 w-3.5" />
                    {liveSession.connectedCount}/{liveSession.maxCapacity}
                  </span>
                </div>

                {liveSession.shareMode === 'whiteboard' ? (
                  <div className="p-4 space-y-3 bg-[#090712]">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">لون القلم:</span>
                        {(
                          [
                            { color: '#F59E0B', label: 'ذهبي' },
                            { color: '#FFFFFF', label: 'أبيض' },
                            { color: '#38BDF8', label: 'سماوي' },
                          ] as const
                        ).map((p) => (
                          <button
                            key={p.color}
                            type="button"
                            onClick={() => setPenColor(p.color)}
                            className={`min-h-[34px] rounded-lg px-2.5 text-xs font-bold border ${
                              penColor === p.color
                                ? 'border-amber-400 bg-white/[0.06] text-white'
                                : 'border-purple-500/25 text-slate-400'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={clearWhiteboard}
                        className="min-h-[34px] inline-flex items-center gap-1 rounded-lg bg-white/[0.06] px-3 text-xs font-semibold text-slate-200 hover:bg-purple-500/25"
                      >
                        <Eraser className="h-3.5 w-3.5" />
                        <span>مسح السبورة</span>
                      </button>
                    </div>
                    <canvas
                      ref={canvasRef}
                      width={900}
                      height={420}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerLeave={handlePointerUp}
                      className="w-full h-[260px] sm:h-[340px] rounded-xl bg-[#090712] border border-purple-500/25 cursor-crosshair touch-none"
                    />
                    <p className="text-[11px] text-slate-400">
                      ارسم أو اكتب المعادلات مباشرة على السبورة أعلاه — تظهر فوراً لطلبة البث.
                    </p>
                  </div>
                ) : (
                  <div className="p-6 sm:p-8 min-h-[300px] sm:min-h-[340px] flex flex-col justify-between bg-gradient-to-br from-[#1A1033] via-[#130C26] to-[#090712]">
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-purple-300">{activeSlide.label}</p>
                      <h3 className="text-lg sm:text-2xl font-extrabold leading-snug">
                        {activeSlide.heading}
                      </h3>
                      <ul className="space-y-2 text-xs sm:text-sm text-slate-200 font-reading">
                        {activeSlide.bullets.map((b, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="font-mono text-purple-300 font-bold tabular-nums">
                              0{idx + 1}.
                            </span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                      <div
                        dir="ltr"
                        className="inline-block rounded-xl bg-slate-950/75 border border-purple-400/35 px-4 py-2 font-mono text-xs sm:text-sm font-semibold text-purple-300 tabular-nums"
                      >
                        {activeSlide.formula}
                      </div>
                    </div>

                    {/* Slide Switcher Controls */}
                    <div className="mt-6 pt-4 border-t border-purple-500/20 flex items-center justify-between">
                      <button
                        type="button"
                        disabled={liveSession.activeSlideIndex === 0}
                        onClick={() =>
                          setLiveSlideIndex(Math.max(0, liveSession.activeSlideIndex - 1))
                        }
                        className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-white/[0.06] px-3.5 text-xs font-bold text-white hover:bg-purple-500/25 disabled:opacity-40"
                      >
                        <ChevronRight className="h-4 w-4" />
                        <span>الشريحة السابقة</span>
                      </button>

                      <span className="font-mono text-xs text-slate-300 tabular-nums">
                        {liveSession.activeSlideIndex + 1} / {LIVE_LECTURE_SLIDES.length}
                      </span>

                      <button
                        type="button"
                        disabled={liveSession.activeSlideIndex >= LIVE_LECTURE_SLIDES.length - 1}
                        onClick={() =>
                          setLiveSlideIndex(
                            Math.min(
                              LIVE_LECTURE_SLIDES.length - 1,
                              liveSession.activeSlideIndex + 1
                            )
                          )
                        }
                        className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 px-3.5 text-xs font-bold text-white hover:bg-purple-500 disabled:opacity-40"
                      >
                        <span>الشريحة التالية</span>
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Live Chat Reply Panel */}
              <div className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 overflow-hidden">
                <div className="px-4 py-3 border-b border-purple-500/15 flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-white">دردشة القاعة المباشرة</h3>
                  <span className="text-xs text-slate-400 tabular-nums">
                    {liveSession.chatMessages.length} رسالة
                  </span>
                </div>
                <div className="max-h-52 overflow-y-auto p-4 space-y-2.5 bg-white/[0.04]">
                  {liveSession.chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`rounded-xl px-3.5 py-2.5 text-xs sm:text-sm ${
                        msg.senderRole === 'admin'
                          ? 'bg-[#110D1F] text-white'
                          : 'bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 text-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span
                          className={`font-bold text-xs ${
                            msg.senderRole === 'admin' ? 'text-purple-300' : 'text-white'
                          }`}
                        >
                          {msg.senderName}
                        </span>
                        <span className="font-mono text-[10px] opacity-60 tabular-nums" dir="ltr">
                          {msg.timestamp}
                        </span>
                      </div>
                      <p className="font-reading">{msg.text}</p>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSendChat} className="p-3 border-t border-purple-500/20 flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="أرسلي رداً أو توجيهاً للطلاب في الدردشة..."
                    className="flex-1 min-h-[42px] rounded-xl border border-purple-500/25 px-3.5 text-sm focus:border-purple-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="min-h-[42px] inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 shadow-[0_8px_22px_-6px_rgba(147,51,234,0.65)] px-4 text-xs font-bold text-purple-300 hover:brightness-110"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>إرسال</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Raised Hands Queue & Mic Control Column */}
            <div className="xl:col-span-4 rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 overflow-hidden">
              <div className="px-4 py-4 border-b border-purple-500/15 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Hand className="h-4 w-4 text-purple-300" />
                  <h2 className="text-sm font-extrabold text-white">
                    الطلاب رافعو اليد ({raisedHandParticipants.length})
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={simulateIncomingRaiseHand}
                  title="محاكاة طلب مداخلة طالب جديد"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-300 hover:text-white whitespace-nowrap"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>محاكاة طلب</span>
                </button>
              </div>

              {raisedHandParticipants.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  لا يوجد طلاب رافعو اليد حالياً.
                </div>
              ) : (
                <div className="divide-y divide-purple-500/15">
                  {raisedHandParticipants.map((student) => (
                    <div
                      key={student.id}
                      className="p-4 flex items-center justify-between gap-3 hover:bg-white/[0.08]"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{student.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono tabular-nums" dir="ltr">
                          {student.phone} · {student.micAllowed ? 'يتحدث الآن' : 'بانتظار الإذن'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleParticipantMic(student.id)}
                        className={`min-h-[40px] inline-flex items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                          student.micAllowed
                            ? 'bg-rose-500/15 text-rose-300 border border-rose-400/35 hover:bg-rose-500/25'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        {student.micAllowed ? (
                          <>
                            <MicOff className="h-3.5 w-3.5" />
                            <span>كتم المايك</span>
                          </>
                        ) : (
                          <>
                            <Mic className="h-3.5 w-3.5" />
                            <span>فتح المايك</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
