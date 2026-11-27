/**
 * LiveKit Classroom Client Service — Production WebRTC SDK + Graceful Preview Fallback
 *
 * Security guarantee:
 * - LIVEKIT_API_KEY and LIVEKIT_API_SECRET NEVER exist in frontend code.
 * - All room access tokens are minted exclusively on the server (`POST /api/livekit/token`)
 *   after verifying the user's Firebase session, active monthly subscription, and course enrollment.
 * - Frontend receives ONLY the short-lived signed JWT `token` and `wsUrl` (wss://...).
 */

import {
  ConnectionState,
  Room,
  RoomEvent,
  Track,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
} from 'livekit-client';
import { LiveChatMessage, LiveParticipant, LiveSession, TrackId } from '../types';

function readCleanViteEnv(value: string | undefined): string {
  const trimmed = (value || '').trim();
  if (!trimmed || trimmed.startsWith('[') || trimmed.includes('MY_')) {
    return '';
  }
  return trimmed;
}

export const LIVEKIT_CONFIG = {
  tokenEndpoint: readCleanViteEnv(import.meta.env.VITE_LIVEKIT_TOKEN_ENDPOINT) || '/api/livekit/token',
  maxRoomCapacity: 200,
};

export interface LiveKitTokenResult {
  mode: 'livekit' | 'mock';
  token: string;
  wsUrl: string;
  roomName: string;
  role: 'admin' | 'student';
  canPublish: boolean;
  error?: string;
}

export async function checkLiveKitServerStatus(): Promise<{
  livekitConfigured: boolean;
  firebaseConfigured: boolean;
}> {
  try {
    const res = await fetch('/api/livekit/status', { method: 'GET' });
    if (!res.ok) {
      return { livekitConfigured: false, firebaseConfigured: false };
    }
    const data = (await res.json()) as {
      livekitConfigured?: boolean;
      firebaseConfigured?: boolean;
    };
    return {
      livekitConfigured: Boolean(data.livekitConfigured),
      firebaseConfigured: Boolean(data.firebaseConfigured),
    };
  } catch {
    return { livekitConfigured: false, firebaseConfigured: false };
  }
}

/**
 * Requests a short-lived LiveKit Access Token from the secure server endpoint
 * (never exposes LIVEKIT_API_SECRET to the browser).
 */
export async function requestLiveKitRoomToken(params: {
  roomName: string;
  courseId?: string;
  accessToken?: string | null;
  role: 'admin' | 'student';
}): Promise<LiveKitTokenResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (params.accessToken) {
    headers['Authorization'] = `Bearer ${params.accessToken}`;
  }

  try {
    const response = await fetch(LIVEKIT_CONFIG.tokenEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        roomName: params.roomName,
        courseId: params.courseId || undefined,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as {
      token?: string;
      wsUrl?: string;
      roomName?: string;
      role?: 'admin' | 'student';
      canPublish?: boolean;
      error?: string;
    };

    if (response.ok && data.token && data.wsUrl) {
      const safeWs =
        data.wsUrl.startsWith('wss://') || data.wsUrl.startsWith('ws://localhost')
          ? data.wsUrl
          : '';
      if (!safeWs) {
        return {
          mode: 'mock',
          token: '',
          wsUrl: '',
          roomName: params.roomName,
          role: params.role,
          canPublish: false,
          error: 'رابط سيرفر LiveKit غير صالح (يجب أن يبدأ بـ wss://).',
        };
      }
      return {
        mode: 'livekit',
        token: data.token,
        wsUrl: safeWs,
        roomName: data.roomName || params.roomName,
        role: data.role || params.role,
        canPublish: Boolean(data.canPublish),
      };
    }

    // 503 means server LiveKit/Firebase env keys are not yet populated -> graceful preview fallback
    if (response.status === 503) {
      return {
        mode: 'mock',
        token: '',
        wsUrl: '',
        roomName: params.roomName,
        role: params.role,
        canPublish: params.role === 'admin',
      };
    }

    // 401 / 403 / 400 -> surface clear server authorization error
    return {
      mode: 'mock',
      token: '',
      wsUrl: '',
      roomName: params.roomName,
      role: params.role,
      canPublish: false,
      error: data.error || 'تعذر التحقق من صلاحية الدخول إلى قاعة البث المباشر.',
    };
  } catch {
    return {
      mode: 'mock',
      token: '',
      wsUrl: '',
      roomName: params.roomName,
      role: params.role,
      canPublish: params.role === 'admin',
    };
  }
}

export interface LiveKitRoomCallbacks {
  onConnectionStateChange?: (state: ConnectionState) => void;
  onRemoteVideoTrack?: (track: RemoteTrack | null) => void;
  onRemoteAudioTrack?: (track: RemoteTrack, attached: boolean) => void;
  onParticipantCountChange?: (count: number) => void;
}

export async function connectToLiveKitRoom(
  wsUrl: string,
  token: string,
  callbacks: LiveKitRoomCallbacks = {}
): Promise<Room> {
  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
  });

  const emitParticipantCount = () => {
    callbacks.onParticipantCountChange?.(room.remoteParticipants.size + 1);
  };

  room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
    callbacks.onConnectionStateChange?.(state);
  });

  room.on(
    RoomEvent.TrackSubscribed,
    (track: RemoteTrack, _pub: RemoteTrackPublication, _participant: RemoteParticipant) => {
      if (track.kind === Track.Kind.Video) {
        callbacks.onRemoteVideoTrack?.(track);
      } else if (track.kind === Track.Kind.Audio) {
        callbacks.onRemoteAudioTrack?.(track, true);
      }
    }
  );

  room.on(
    RoomEvent.TrackUnsubscribed,
    (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Video) {
        callbacks.onRemoteVideoTrack?.(null);
      } else if (track.kind === Track.Kind.Audio) {
        callbacks.onRemoteAudioTrack?.(track, false);
      }
    }
  );

  room.on(RoomEvent.ParticipantConnected, emitParticipantCount);
  room.on(RoomEvent.ParticipantDisconnected, emitParticipantCount);

  await room.connect(wsUrl, token);
  emitParticipantCount();
  return room;
}

export { Room, ConnectionState, Track };

// ============================================================================
// Interactive Lecture Slides & Local Classroom State Persistence
// ============================================================================

export interface LiveSlideDeckItem {
  id: string;
  label: string;
  heading: string;
  bullets: string[];
  formula: string;
}

export const LIVE_LECTURE_SLIDES: LiveSlideDeckItem[] = [
  {
    id: 'slide-1',
    label: 'الشريحة 1 من 4 · مراجعة وزارية',
    heading: 'تبسيط الجمل العددية وتنسيب المقام',
    bullets: [
      'الخطوة الأولى: تحليل الأعداد داخل الجذور التربيعية إلى أبسط صورة ممكنة.',
      'الخطوة الثانية: تجميع الجذور المتشابهة وجمع أو طرح معاملاتها فقط.',
      'الخطوة الثالثة: التخلص من الجذر في المقام بالضرب بالمرافق.',
    ],
    formula: '√12 + √27 = 2√3 + 3√3 = 5√3',
  },
  {
    id: 'slide-2',
    label: 'الشريحة 2 من 4 · تطبيقات مباشرة',
    heading: 'حساب تركيب التطبيقات (f ∘ g)(x)',
    bullets: [
      'نحسب قيمة التطبيق الداخلي g(x) أولاً بدقة مع مراعاة الإشارات.',
      'نعوّض الناتج مباشرة مكان المتغير x في قاعدة التطبيق الخارجي f.',
      'للتحقق من قيمة x المعطاة نكوّن معادلة خطية أو تربيعية ونحلها.',
    ],
    formula: '(f ∘ g)(x) = f(g(x)) = 2(x²) + 1',
  },
  {
    id: 'slide-3',
    label: 'الشريحة 3 من 4 · مسائل الامتحان',
    heading: 'المتتابعات الحسابية وإيجاد الحدود المحصورة',
    bullets: [
      'تحديد الحد الأول a والأساس d من معطيات السؤال قبل كتابة الحدود.',
      'استخدام قانون الحد العام Uₙ = a + (n - 1)d لإيجاد أي حد مطلوب.',
      'التأكد من نوع المتتابعة (متزايدة، متناقصة، أو ثابتة) حسب إشارة d.',
    ],
    formula: 'U₇ = a + 6d   ⇒   a = U₇ - 6d',
  },
  {
    id: 'slide-4',
    label: 'الشريحة 4 من 4 · فقرة الأسئلة',
    heading: 'مناقشة أسئلة الطلبة المباشرة',
    bullets: [
      'يمكنكم الضغط على زر «رفع اليد» لطلب فتح المايك وطرح سؤالكم صوتياً.',
      'يتم الرد على جميع استفسارات الدردشة المباشرة قبل ختام البث.',
      'سيتم رفع تسجيل المحاضرة والملزمة المحدّثة في قسم الدورات بعد البث.',
    ],
    formula: 'سعة القاعة التفاعلية: 200 طالب · بث محمي بالعلامة المائية',
  },
];

const LIVE_STORAGE_KEY = 'tabarak_academy_live_v1';

export function buildInitialLiveSession(): LiveSession {
  const participants: LiveParticipant[] = [
    {
      id: 'p-1',
      name: 'مريم صادق العزاوي',
      phone: '07718845120',
      handRaised: true,
      micAllowed: false,
      joinedAt: '14:02',
    },
    {
      id: 'p-2',
      name: 'يوسف حيدر المالكي',
      phone: '07804421980',
      handRaised: true,
      micAllowed: false,
      joinedAt: '14:04',
    },
    {
      id: 'p-3',
      name: 'سارة أحمد التميمي',
      phone: '07729104431',
      handRaised: false,
      micAllowed: false,
      joinedAt: '14:05',
    },
    {
      id: 'p-4',
      name: 'عبدالله كريم الدليمي',
      phone: '07731109284',
      handRaised: true,
      micAllowed: true,
      joinedAt: '14:06',
    },
  ];

  const chatMessages: LiveChatMessage[] = [
    {
      id: 'msg-1',
      senderName: 'الأستاذة تبارك الزيرجاوي',
      senderRole: 'admin',
      text: 'أهلاً بكم أعزائي الطلبة في البث المباشر الموحّد للمراجعة المركزة. الصوت واضح عند الجميع؟',
      timestamp: '14:01',
    },
    {
      id: 'msg-2',
      senderName: 'مريم صادق العزاوي',
      senderRole: 'student',
      text: 'نعم ست، الصوت والشاشة واضحين جداً، شكراً لجهودك.',
      timestamp: '14:02',
    },
    {
      id: 'msg-3',
      senderName: 'يوسف حيدر المالكي',
      senderRole: 'student',
      text: 'ست ممكن إعادة مثال تنسيب المقام قبل ما ننتقل للتطبيقات؟',
      timestamp: '14:05',
    },
  ];

  return {
    id: 'live-room-main',
    isLive: true,
    title: 'المراجعة المركّزة المباشرة — حل أهم المسائل الوزارية',
    track: 'intermediate',
    subStage: 'الثالث متوسط',
    courseId: 'crs-int-math3',
    startedAt: '14:00',
    connectedCount: 142,
    maxCapacity: LIVEKIT_CONFIG.maxRoomCapacity,
    shareMode: 'slides',
    activeSlideIndex: 0,
    allMuted: false,
    participants,
    chatMessages,
    lastAnnouncement: {
      id: 'ann-initial',
      message: 'بدأت الأستاذة تبارك الزيرجاوي البث المباشر الآن — سارع بالانضمام!',
      timestamp: '14:00',
    },
  };
}

export function loadLiveSession(): LiveSession {
  if (typeof window === 'undefined') {
    return buildInitialLiveSession();
  }
  try {
    const raw = window.localStorage.getItem(LIVE_STORAGE_KEY);
    if (!raw) {
      const initial = buildInitialLiveSession();
      window.localStorage.setItem(LIVE_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw) as LiveSession;
  } catch {
    return buildInitialLiveSession();
  }
}

export function saveLiveSession(session: LiveSession): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LIVE_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage error
  }
}

export function formatCurrentTimeHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function isSessionVisibleToTrack(session: LiveSession, track: TrackId): boolean {
  return session.isLive && session.track === track;
}
