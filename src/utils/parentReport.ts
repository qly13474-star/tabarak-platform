import {
  ArabicWeekday,
  AttendanceRecord,
  QuizAttempt,
  StudentLiveQuizResult,
  UserProfile,
  WeeklyLiveSlot,
} from '../types';
import { normalizeIraqWhatsApp } from './subscription';

export const ARABIC_WEEKDAYS: readonly ArabicWeekday[] = [
  'السبت',
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
] as const;

export interface StudentPerformanceSummary {
  attendedCount: number;
  liveAttendedCount: number;
  quizAttendedCount: number;
  expectedSessions: number;
  absentCount: number;
  recentQuizzesCount: number;
  averageScorePercentage: number | null;
  levelAssessment: string;
}

export function computeStudentPerformance(
  student: UserProfile,
  attendanceRecords: AttendanceRecord[],
  quizAttempts: QuizAttempt[],
  liveQuizResults: StudentLiveQuizResult[]
): StudentPerformanceSummary {
  const studentAttendance = attendanceRecords.filter((r) => r.studentId === student.id);
  const liveAttendedCount = studentAttendance.filter((r) => r.source === 'live_broadcast').length;
  const quizAttendedCount = studentAttendance.filter((r) => r.source !== 'live_broadcast').length;
  const attendedCount = studentAttendance.length;

  // Compute expected baseline sessions for attendance vs absence tracking
  const expectedSessions = Math.max(8, attendedCount);
  const absentCount = Math.max(0, expectedSessions - attendedCount);

  const courseScores = quizAttempts
    .filter((a) => a.studentId === student.id)
    .map((a) => a.percentage);
  const liveScores = liveQuizResults
    .filter((r) => r.studentId === student.id)
    .map((r) => r.percentage);
  const allScores = [...courseScores, ...liveScores];
  const recentQuizzesCount = allScores.length;

  const averageScorePercentage =
    recentQuizzesCount > 0
      ? Math.round(allScores.reduce((sum, val) => sum + val, 0) / recentQuizzesCount)
      : null;

  let levelAssessment = 'لم يؤدِّ كوزات بعد';
  if (averageScorePercentage !== null) {
    if (averageScorePercentage >= 90) levelAssessment = 'ممتاز ومتميّز جداً';
    else if (averageScorePercentage >= 80) levelAssessment = 'جيد جداً';
    else if (averageScorePercentage >= 70) levelAssessment = 'جيد';
    else if (averageScorePercentage >= 50) levelAssessment = 'متوسط (يحتاج متابعة أكبر)';
    else levelAssessment = 'ضعيف (يحتاج متابعة عاجلة في التحاضير والكوزات)';
  }

  return {
    attendedCount,
    liveAttendedCount,
    quizAttendedCount,
    expectedSessions,
    absentCount,
    recentQuizzesCount,
    averageScorePercentage,
    levelAssessment,
  };
}

export function buildParentWhatsAppReportText(
  student: UserProfile,
  trackLabel: string,
  summary: StudentPerformanceSummary
): string {
  const stageLine = [
    trackLabel,
    student.subStage,
    student.branch ? `فرع ${student.branch}` : '',
    student.department ? `قسم ${student.department}` : '',
  ]
    .filter(Boolean)
    .join(' — ');

  const quizLine =
    summary.averageScorePercentage !== null
      ? `${summary.averageScorePercentage}% (بناءً على ${summary.recentQuizzesCount} اختبارات/كوزات)`
      : 'لا توجد درجات كوزات مسجلة حتى الآن';

  return [
    'السلام عليكم ورحمة الله وبركاته،',
    'تحية طيبة من منصة الأستاذة تبارك الزيرجاوي للتعليم الإلكتروني.',
    'نودّ إطلاعكم على التقرير الدوري لحضور ومستوى الطالب/ة:',
    '——————————————',
    `اسم الطالب: ${student.fullName}`,
    `المرحلة الدراسية: ${stageLine}`,
    `عدد مرات الحضور (البث والكوزات): ${summary.attendedCount} حضور (${summary.liveAttendedCount} بث مباشر · ${summary.quizAttendedCount} كوزات)`,
    `عدد مرات الغياب المسجّلة: ${summary.absentCount}`,
    `متوسط الدرجات في الكوزات الأخيرة: ${quizLine}`,
    `التقييم العام للمستوى: ${summary.levelAssessment}`,
    '——————————————',
    'شاكرين تعاونكم ومتابعتكم المستمرة، مع تمنياتنا بالتفوق والنجاح الدائم.',
    'إدارة منصة الأستاذة تبارك الزيرجاوي',
  ].join('\n');
}

export function buildParentWhatsAppReportUrl(
  parentPhone: string,
  student: UserProfile,
  trackLabel: string,
  summary: StudentPerformanceSummary
): string {
  const intl = normalizeIraqWhatsApp(parentPhone);
  const message = buildParentWhatsAppReportText(student, trackLabel, summary);
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}

export function isWeeklySlotForStudent(
  slot: WeeklyLiveSlot,
  student: UserProfile
): boolean {
  if (slot.track !== student.track) return false;
  if (
    slot.subStage &&
    slot.subStage !== 'جميع الصفوف' &&
    slot.subStage !== 'الكل' &&
    slot.subStage !== student.subStage
  ) {
    return false;
  }
  const studentSpec = student.branch || student.department;
  if (
    slot.branch &&
    slot.branch !== 'جميع الفروع' &&
    slot.branch !== 'الجميع' &&
    slot.branch !== 'الكل' &&
    studentSpec &&
    slot.branch !== studentSpec
  ) {
    return false;
  }
  return true;
}
