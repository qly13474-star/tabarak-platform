import { normalizeArabicPhoneDigits } from '../services/deviceLock';

/**
 * Cleans any Arabic/Western phone number string and converts Iraqi mobile numbers
 * starting with `07` (e.g. 07848333046) to international format `9647...` for wa.me links.
 */
export function formatWhatsappCleanNumber(rawPhone: string): string {
  const normalized = normalizeArabicPhoneDigits(rawPhone || '').replace(/\D/g, '');
  if (!normalized) return '9647848333046';

  if (normalized.startsWith('00')) {
    return normalized.slice(2);
  }
  if (normalized.startsWith('07') && normalized.length >= 10) {
    return `964${normalized.slice(1)}`;
  }
  if (normalized.startsWith('7') && normalized.length === 10) {
    return `964${normalized}`;
  }
  return normalized;
}

/**
 * Builds a clean WhatsApp support deep-link (`https://wa.me/{cleanNumber}`).
 */
export function buildWhatsappSupportUrl(
  rawPhone: string,
  defaultMessage = 'مرحباً، أحتاج إلى مساعدة بخصوص منصة الأستاذة تبارك الزيرجاوي التعليمية.'
): string {
  const cleanNumber = formatWhatsappCleanNumber(rawPhone);
  if (!defaultMessage.trim()) {
    return `https://wa.me/${cleanNumber}`;
  }
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(defaultMessage)}`;
}
