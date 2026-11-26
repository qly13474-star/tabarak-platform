import {
  AssignmentAudience,
  LiveQuizLeaderboardEntry,
  LiveQuizParticipant,
  LiveQuizRoomSession,
  UserProfile,
} from '../types';
import { getLevelLabel } from '../utils/quizRanking';
import { formatCurrentTimeHHMM } from './livekit';
import { getTrackForAudience } from './supabase';

const LIVE_QUIZ_ROOM_KEY = 'tabarak_academy_live_quiz_room_v1';

export interface PresetQuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  durationSeconds: number;
}

export const DEMO_LIVE_QUIZ_QUESTIONS: Record<AssignmentAudience, PresetQuizQuestion[]> = {
  vocational6: [
    {
      question: 'في أي طبقة من نموذج OSI يعمل جهاز الموجّه (Router) لتوجيه الحزم باستخدام IP؟',
      options: ['الطبقة الفيزيائية', 'طبقة ربط البيانات', 'طبقة الشبكة (Layer 3)', 'طبقة التطبيقات'],
      correctIndex: 2,
      durationSeconds: 15,
    },
    {
      question: 'كم عدد عناوين الأجهزة الصالحة للاستخدام في شبكة بقناع 255.255.255.0 (/24)؟',
      options: ['256 جهازاً', '254 جهازاً', '252 جهازاً', '128 جهازاً'],
      correctIndex: 1,
      durationSeconds: 15,
    },
    {
      question: 'أي بروتوكول في طبقة النقل يضمن وصول البيانات كاملة وبترتيب سليم (موثوق)؟',
      options: ['UDP', 'TCP', 'ICMP', 'ARP'],
      correctIndex: 1,
      durationSeconds: 12,
    },
  ],
  vocational45: [
    {
      question: 'أي جهاز يعمل في طبقة ربط البيانات ويعتمد على العنوان الفيزيائي MAC؟',
      options: ['المبدّل (Switch)', 'الموجّه (Router)', 'المكرّر (Repeater)'],
      correctIndex: 0,
      durationSeconds: 15,
    },
    {
      question: 'يتكون عنوان IPv4 من كم بت مقسمة إلى أربع خانات عشرية؟',
      options: ['16 بت', '32 بت', '64 بت', '128 بت'],
      correctIndex: 1,
      durationSeconds: 15,
    },
    {
      question: 'أي مما يلي يُعد من وحدات الإدخال الأساسية في الحاسوب؟',
      options: ['الطابعة', 'الشاشة', 'لوحة المفاتيح'],
      correctIndex: 2,
      durationSeconds: 12,
    },
  ],
  intermediate: [
    {
      question: 'ما ناتج تبسيط المقدار (√12 - √18)(√12 + √18) باستعمال الفرق بين مربعين؟',
      options: ['6', '-6', '30', '-30'],
      correctIndex: 1,
      durationSeconds: 15,
    },
    {
      question: 'في المتتابعة الحسابية التي حدها الأول a = 3 وأساسها d = 4، ما قيمة الحد الخامس U₅؟',
      options: ['15', '17', '19', '23'],
      correctIndex: 2,
      durationSeconds: 15,
    },
    {
      question: 'يكون التطبيق متقابلاً إذا كان:',
      options: ['شاملاً فقط', 'متبايناً فقط', 'شاملاً ومتبايناً معاً'],
      correctIndex: 2,
      durationSeconds: 12,
    },
  ],
  university: [
    {
      question: 'ما التعقيد الزمني (Time Complexity) لعملية البحث الثنائي (Binary Search) في مصفوفة مرتبة؟',
      options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
      correctIndex: 1,
      durationSeconds: 15,
    },
    {
      question: 'أي بنية بيانات تعمل بمبدأ آخر من يدخل أول من يخرج (LIFO)؟',
      options: ['الطابور (Queue)', 'المكدّس (Stack)', 'القائمة المرتبطة', 'الشجرة الثنائية'],
      correctIndex: 1,
      durationSeconds: 15,
    },
    {
      question: 'في شجرة البحث الثنائية (BST)، أين يقع العنصر الأصغر دائماً؟',
      options: ['في الجذر', 'في أقصى اليمين', 'في أقصى اليسار'],
      correctIndex: 2,
      durationSeconds: 12,
    },
  ],
};

const SIMULATED_CLASSMATES_BY_AUDIENCE: Record<
  AssignmentAudience,
  { id: string; name: string; phone: string }[]
> = {
  vocational6: [
    { id: 'sim-v6-1', name: 'فاطمة محمد الخفاجي', phone: '07815544332' },
    { id: 'sim-v6-2', name: 'زهراء قاسم الزبيدي', phone: '07827766554' },
    { id: 'sim-v6-3', name: 'حسين علاء الدليمي', phone: '07719920341' },
    { id: 'sim-v6-4', name: 'مريم صادق الحسيني', phone: '07708812654' },
    { id: 'sim-v6-5', name: 'سجاد كريم المالكي', phone: '07804451982' },
  ],
  vocational45: [
    { id: 'sim-v45-1', name: 'أحمد ستار العبودي', phone: '07741122334' },
    { id: 'sim-v45-2', name: 'تقى حيدر السعدي', phone: '07713389012' },
    { id: 'sim-v45-3', name: 'يوسف باسم الكناني', phone: '07825561090' },
    { id: 'sim-v45-4', name: 'سارة علي الطائي', phone: '07706678214' },
  ],
  intermediate: [
    { id: 'sim-int-1', name: 'زينب حيدر الموسوي', phone: '07712345678' },
    { id: 'sim-int-2', name: 'علي حسين الكعبي', phone: '07734567890' },
    { id: 'sim-int-3', name: 'نرجس مهدي الشمري', phone: '07812239876' },
    { id: 'sim-int-4', name: 'كرار عباس الجبوري', phone: '07709123487' },
    { id: 'sim-int-5', name: 'رقية فلاح العامري', phone: '07823451120' },
  ],
  university: [
    { id: 'sim-uni-1', name: 'نور الهدى كريم الساعدي', phone: '07723456789' },
    { id: 'sim-uni-2', name: 'حسن كاظم الربيعي', phone: '07709988776' },
    { id: 'sim-uni-3', name: 'شهد محمود العاني', phone: '07705412890' },
    { id: 'sim-uni-4', name: 'محمد جاسم البصري', phone: '07817762345' },
  ],
};

export function createIdleLiveQuizRoom(): LiveQuizRoomSession {
  return {
    id: 'lq-idle',
    status: 'idle',
    title: '',
    audience: 'vocational6',
    track: 'vocational',
    durationMinutes: 15,
    defaultQuestionSeconds: 15,
    startedAt: 0,
    endsAt: 0,
    participants: [],
    questions: [],
    finalLeaderboard: [],
    systemMessages: [],
  };
}

export function buildSimulatedParticipants(
  audience: AssignmentAudience,
  excludeUserId?: string
): LiveQuizParticipant[] {
  const joinedAt = formatCurrentTimeHHMM();
  const base = SIMULATED_CLASSMATES_BY_AUDIENCE[audience] ?? SIMULATED_CLASSMATES_BY_AUDIENCE.vocational6;
  return base
    .filter((p) => p.id !== excludeUserId)
    .map((p) => ({
      ...p,
      joinedAt,
      isSimulated: true,
    }));
}

export function getAudienceForStudent(student: UserProfile): AssignmentAudience {
  if (student.track === 'vocational') {
    if (student.subStage.includes('السادس المهني')) return 'vocational6';
    return 'vocational45';
  }
  return student.track;
}

export function isLiveQuizRoomForStudent(
  room: LiveQuizRoomSession,
  student: UserProfile
): boolean {
  if (room.status === 'idle') return false;
  if (room.isDemoPreview) return true;

  const targetTrack = room.track || getTrackForAudience(room.audience);
  if (student.track !== targetTrack) {
    return false;
  }

  if (room.audience === 'vocational6' && !student.subStage.includes('السادس المهني')) {
    return false;
  }
  if (room.audience === 'vocational45' && student.subStage.includes('السادس المهني')) {
    return false;
  }

  if (
    room.subStage &&
    room.subStage !== 'جميع الصفوف' &&
    room.subStage !== 'الكل' &&
    student.subStage !== room.subStage
  ) {
    return false;
  }

  const studentSpec = student.branch || student.department;
  if (
    room.branch &&
    room.branch !== 'جميع الفروع' &&
    room.branch !== 'الجميع' &&
    room.branch !== 'الكل' &&
    studentSpec &&
    studentSpec !== room.branch
  ) {
    return false;
  }

  return true;
}

export function computeLiveQuizLeaderboard(
  room: LiveQuizRoomSession
): LiveQuizLeaderboardEntry[] {
  const totalQuestions = room.questions.length;

  const rawEntries = room.participants.map((participant) => {
    let correctCount = 0;
    let totalResponseMs = 0;
    let answeredCount = 0;

    for (const q of room.questions) {
      const ans = q.answers[participant.id];
      if (ans) {
        answeredCount += 1;
        totalResponseMs += ans.responseTimeMs;
        if (ans.isCorrect) {
          correctCount += 1;
        }
      } else {
        // Penalize unanswered questions with full question duration for speed tie-breaking
        totalResponseMs += q.durationSeconds * 1000;
      }
    }

    const percentage =
      totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const avgResponseMs =
      answeredCount > 0
        ? Math.round(totalResponseMs / Math.max(1, totalQuestions))
        : totalQuestions > 0
          ? Math.round(totalResponseMs / totalQuestions)
          : 0;

    return {
      studentId: participant.id,
      studentName: participant.name,
      studentPhone: participant.phone,
      correctCount,
      totalQuestions,
      percentage,
      avgResponseMs,
      totalResponseMs,
    };
  });

  // Sort by highest correct answers (and percentage), then fastest total response time
  rawEntries.sort((a, b) => {
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
    if (b.percentage !== a.percentage) return b.percentage - a.percentage;
    return a.totalResponseMs - b.totalResponseMs;
  });

  return rawEntries.map((entry, idx) => {
    const level = getLevelLabel(idx);
    return {
      ...entry,
      rank: idx + 1,
      levelLabel: level.label,
      medal: level.medal,
    };
  });
}

export function loadLiveQuizRoom(): LiveQuizRoomSession {
  if (typeof window === 'undefined') return createIdleLiveQuizRoom();
  try {
    const raw = window.localStorage.getItem(LIVE_QUIZ_ROOM_KEY);
    if (!raw) return createIdleLiveQuizRoom();
    const parsed = JSON.parse(raw) as LiveQuizRoomSession;
    if (!parsed || !parsed.status) return createIdleLiveQuizRoom();
    return parsed;
  } catch {
    return createIdleLiveQuizRoom();
  }
}

export function saveLiveQuizRoom(room: LiveQuizRoomSession): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LIVE_QUIZ_ROOM_KEY, JSON.stringify(room));
  } catch {
    // Ignore storage quota errors
  }
}

export function getLiveQuizTrack(audience: AssignmentAudience) {
  return getTrackForAudience(audience);
}
