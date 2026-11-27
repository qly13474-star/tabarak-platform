import { PaymentSettings, UserProfile } from '../types';
import { getRelativeDateISO, getTrackLabel } from '../services/platformData';

export const GRACE_PERIOD_DAYS = 5;
export const REMINDER_WINDOW_DAYS = 3;

export type SubscriptionStatusKind = 'active' | 'expiring_soon' | 'grace_period' | 'locked';

export interface SubscriptionEvaluation {
  status: SubscriptionStatusKind;
  dueDate: string;
  graceEndDate: string;
  daysUntilDue: number;
  daysUntilLock: number;
  graceDaysUsed: number;
  graceDaysRemaining: number;
  isLocked: boolean;
  label: string;
  shortHint: string;
}

function parseISODateMidnight(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
}

export function addDaysISO(isoDate: string, days: number): string {
  const d = parseISODateMidnight(isoDate);
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function computeNextMonthDueDate(currentDueDate?: string): string {
  const todayISO = getRelativeDateISO(0);
  const base =
    currentDueDate && currentDueDate > todayISO ? currentDueDate : todayISO;
  return addDaysISO(base, 30);
}

export function evaluateStudentSubscription(
  dueDate?: string,
  gracePeriodDays: number = GRACE_PERIOD_DAYS
): SubscriptionEvaluation {
  const todayISO = getRelativeDateISO(0);
  const resolvedDue = dueDate || addDaysISO(todayISO, 30);
  const todayMs = parseISODateMidnight(todayISO).getTime();
  const dueMs = parseISODateMidnight(resolvedDue).getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  const daysUntilDue = Math.round((dueMs - todayMs) / dayMs);
  const graceEndDate = addDaysISO(resolvedDue, gracePeriodDays);
  const daysUntilLock = daysUntilDue + gracePeriodDays;

  if (daysUntilDue > REMINDER_WINDOW_DAYS) {
    return {
      status: 'active',
      dueDate: resolvedDue,
      graceEndDate,
      daysUntilDue,
      daysUntilLock,
      graceDaysUsed: 0,
      graceDaysRemaining: gracePeriodDays,
      isLocked: false,
      label: 'نشط',
      shortHint: `متبقٍ ${daysUntilDue} يوماً على الاستحقاق`,
    };
  }

  if (daysUntilDue >= 0) {
    return {
      status: 'expiring_soon',
      dueDate: resolvedDue,
      graceEndDate,
      daysUntilDue,
      daysUntilLock,
      graceDaysUsed: 0,
      graceDaysRemaining: gracePeriodDays,
      isLocked: false,
      label: 'ينتهي قريباً',
      shortHint:
        daysUntilDue === 0
          ? 'اليوم هو موعد الدفع الشهري'
          : `متبقٍ ${daysUntilDue} ${daysUntilDue === 1 ? 'يوم' : daysUntilDue === 2 ? 'يومان' : 'أيام'} على الاستحقاق`,
    };
  }

  if (daysUntilLock >= 0) {
    const overdueDays = Math.abs(daysUntilDue);
    const remainingGrace = Math.max(0, daysUntilLock);
    return {
      status: 'grace_period',
      dueDate: resolvedDue,
      graceEndDate,
      daysUntilDue,
      daysUntilLock,
      graceDaysUsed: overdueDays,
      graceDaysRemaining: remainingGrace,
      isLocked: false,
      label: 'ضمن مهلة السماح (5 أيام)',
      shortHint:
        remainingGrace === 0
          ? 'اليوم آخر يوم في مهلة السماح قبل القفل التلقائي'
          : `متبقٍ ${remainingGrace} ${remainingGrace === 1 ? 'يوم' : remainingGrace === 2 ? 'يومان' : 'أيام'} في مهلة السماح قبل القفل`,
    };
  }

  return {
    status: 'locked',
    dueDate: resolvedDue,
    graceEndDate,
    daysUntilDue,
    daysUntilLock,
    graceDaysUsed: gracePeriodDays,
    graceDaysRemaining: 0,
    isLocked: true,
    label: 'منتهي ومقفول',
    shortHint: 'انتهى الاشتراك ومهلة الـ 5 أيام (35 يوماً) وتم القفل تلقائياً',
  };
}

export function formatIqd(amount: number): string {
  return `${Math.max(0, Math.round(amount)).toLocaleString('en-US')} د.ع`;
}

export function normalizeIraqWhatsApp(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.startsWith('964')) return digits;
  if (digits.startsWith('0')) return `964${digits.slice(1)}`;
  return `964${digits}`;
}

export function buildWhatsAppPaymentUrl(
  settings: PaymentSettings,
  student: UserProfile,
  dueDate: string
): string {
  const intl = normalizeIraqWhatsApp(settings.whatsappNumber);
  const trackText = `${getTrackLabel(student.track)} — ${student.subStage}${
    student.branch ? ` (${student.branch})` : student.department ? ` (${student.department})` : ''
  }`;
  const message = [
    'السلام عليكم أستاذة تبارك، أرغب بتجديد اشتراكي الشهري في المنصة ومرفق صورة وصل التحويل:',
    `الاسم الثلاثي: ${student.fullName}`,
    `رقم الهاتف: ${student.phone}`,
    `المرحلة الدراسية: ${trackText}`,
    `قيمة الاشتراك: ${formatIqd(settings.monthlyFeeIqd)}`,
    `تاريخ الاستحقاق الحالي: ${dueDate}`,
  ].join('\n');

  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}
