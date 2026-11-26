import { QuizAttempt } from '../types';

export function formatDurationMMSS(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function sortQuizLeaderboard(attempts: QuizAttempt[]): QuizAttempt[] {
  return [...attempts].sort((a, b) => {
    if (b.percentage !== a.percentage) {
      return b.percentage - a.percentage;
    }
    return a.timeSpentSeconds - b.timeSpentSeconds;
  });
}

const ARABIC_ORDINALS = [
  'الأول',
  'الثاني',
  'الثالث',
  'الرابع',
  'الخامس',
  'السادس',
  'السابع',
  'الثامن',
  'التاسع',
  'العاشر',
];

export function getLevelLabel(rankIndexZeroBased: number): { label: string; medal?: string } {
  const ordinal =
    ARABIC_ORDINALS[rankIndexZeroBased] ?? `رقم ${rankIndexZeroBased + 1}`;
  if (rankIndexZeroBased === 0) return { label: `المستوى ${ordinal}`, medal: '🥇' };
  if (rankIndexZeroBased === 1) return { label: `المستوى ${ordinal}`, medal: '🥈' };
  if (rankIndexZeroBased === 2) return { label: `المستوى ${ordinal}`, medal: '🥉' };
  return { label: `المستوى ${ordinal}` };
}

export function getGradeEvaluation(percentage: number): {
  title: string;
  subtitle: string;
  tone: 'emerald' | 'amber' | 'red';
} {
  if (percentage >= 90) {
    return {
      title: 'امتياز — مستوى متفوق',
      subtitle: 'أداء استثنائي وإتقان عالٍ للمادة الوزارية.',
      tone: 'emerald',
    };
  }
  if (percentage >= 80) {
    return {
      title: 'جيد جداً — مستوى متقدم',
      subtitle: 'نتيجة ممتازة، خطوة صغيرة وتصل للدرجة الكاملة.',
      tone: 'emerald',
    };
  }
  if (percentage >= 65) {
    return {
      title: 'جيد — مستوى متوسط',
      subtitle: 'أداء جيد، راجع توضيحات الأسئلة لتعزيز نقاط الضعف.',
      tone: 'amber',
    };
  }
  if (percentage >= 50) {
    return {
      title: 'مقبول — ناجح',
      subtitle: 'اجتزت الاختبار، ويُنصح بمراجعة الملزمة والمحاولة مجدداً.',
      tone: 'amber',
    };
  }
  return {
    title: 'يحتاج مراجعة',
    subtitle: 'راجع المحاضرة المسجّلة والملزمة ثم أعد المحاولة لرفع مستواك.',
    tone: 'red',
  };
}
