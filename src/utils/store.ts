import { StoreDeliverySettings, StoreOrder, StoreOrderStatus } from '../types';
import { formatIqd, normalizeIraqWhatsApp } from './subscription';

export const IRAQ_GOVERNORATES: readonly string[] = [
  'بغداد',
  'ديالى',
  'البصرة',
  'نينوى',
  'النجف',
  'كربلاء',
  'بابل',
  'الأنبار',
  'ذي قار',
  'واسط',
  'ميسان',
  'الديوانية',
  'المثنى',
  'كركوك',
  'صلاح الدين',
  'أربيل',
  'السليمانية',
  'دهوك',
] as const;

export const STORE_COVER_PRESETS: { label: string; url: string }[] = [
  {
    label: 'غلاف تلقائي ملكي بهوية المنصة (كحلي وذهبي)',
    url: 'auto',
  },
  {
    label: 'غلاف السادس المهني (كحلي وذهبي)',
    url: '/src/assets/images/store_booklet_vocational_1795653125600.jpg',
  },
  {
    label: 'غلاف المرحلة المتوسطة (كلاسيكي)',
    url: '/src/assets/images/store_booklet_intermediate_1795653126278.jpg',
  },
  {
    label: 'غلاف الكلية والمرشحات الجامعية',
    url: '/src/assets/images/store_booklet_university_1795653126024.jpg',
  },
];

export function getDeliveryFeeForGovernorate(
  governorate: string,
  settings: StoreDeliverySettings
): number {
  if (governorate.trim() === 'بغداد') {
    return Math.max(0, settings.baghdadFeeIqd);
  }
  return Math.max(0, settings.provincesFeeIqd);
}

export function buildStoreOrderReceiptText(order: StoreOrder): string {
  const subtotal = order.unitPriceIqd * order.quantity;
  return [
    'السلام عليكم أستاذة تبارك، أرغب بتأكيد طلب ملزمة/مرشحة ورقية من المنصة:',
    '——————————————',
    `رقم الوصل: ${order.receiptNumber}`,
    `اسم الطالب: ${order.studentName}`,
    `رقم الهاتف: ${order.phone}`,
    `المحافظة: ${order.governorate}`,
    `العنوان ونقطة الدلالة: ${order.address}`,
    '——————————————',
    `القسم والمرحلة: ${order.trackLabel} — ${order.subStage}`,
    `المادة المطلوبة: ${order.subject}`,
    `الملزمة / المرشحة: ${order.itemTitle}`,
    `الكمية: ${order.quantity}`,
    '——————————————',
    `سعر النسخة: ${formatIqd(order.unitPriceIqd)}`,
    ...(order.quantity > 1 ? [`إجمالي النسخ (${order.quantity}): ${formatIqd(subtotal)}`] : []),
    `أجور التوصيل (${order.governorate}): ${formatIqd(order.deliveryFeeIqd)}`,
    `المبلغ الإجمالي الكلي: ${formatIqd(order.totalIqd)}`,
    '——————————————',
    'يرجى تأكيد الطلب وتثبيت موعد التوصيل، وشكراً جزيلاً.',
  ].join('\n');
}

export function buildWhatsAppStoreOrderUrl(
  teacherWhatsappNumber: string,
  order: StoreOrder
): string {
  const intl = normalizeIraqWhatsApp(teacherWhatsappNumber);
  const message = buildStoreOrderReceiptText(order);
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppStudentFollowUpUrl(order: StoreOrder): string {
  const intl = normalizeIraqWhatsApp(order.phone);
  const statusLabel = getOrderStatusMeta(order.status).label;
  const msg = [
    `مرحباً ${order.studentName}، معك منصة الأستاذة تبارك الزيرجاوي بخصوص طلبك رقم (${order.receiptNumber}):`,
    `الملزمة: ${order.itemTitle}`,
    `الحالة الحالية للطلب: ${statusLabel}`,
    `المبلغ الكلي: ${formatIqd(order.totalIqd)} (شامل التوصيل إلى ${order.governorate}).`,
  ].join('\n');
  return `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`;
}

export function getOrderStatusMeta(status: StoreOrderStatus): {
  label: string;
  textClass: string;
  bgClass: string;
} {
  switch (status) {
    case 'preparing':
      return {
        label: 'قيد التجهيز',
        textClass: 'text-amber-800',
        bgClass: 'bg-amber-50 border-amber-200',
      };
    case 'shipped':
      return {
        label: 'تم الشحن',
        textClass: 'text-sky-800',
        bgClass: 'bg-sky-50 border-sky-200',
      };
    case 'delivered':
      return {
        label: 'تم التسليم',
        textClass: 'text-emerald-800',
        bgClass: 'bg-emerald-50 border-emerald-200',
      };
  }
}
