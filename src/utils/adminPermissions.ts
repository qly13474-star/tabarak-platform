import { AdminPermissionKey, UserProfile } from '../types';

export type AdminSectionKey =
  | 'overview'
  | 'live'
  | 'schedule'
  | 'assignments'
  | 'quizzes'
  | 'payments'
  | 'store'
  | 'codes'
  | 'students'
  | 'courses'
  | 'stages'
  | 'cv'
  | 'complaints'
  | 'inquiries'
  | 'moderators';

export interface AdminPermissionMeta {
  key: AdminPermissionKey;
  label: string;
  shortLabel: string;
  description: string;
}

export const ADMIN_PERMISSION_DEFINITIONS: AdminPermissionMeta[] = [
  {
    key: 'students_attendance',
    label: 'إدارة الطلاب، الحضور، وتقارير أولياء الأمور',
    shortLabel: 'الطلاب والحضور',
    description: 'عرض جدول الطلاب، متابعة الحضور والغياب، فك قفل الأجهزة، وإرسال تقارير واتساب لأولياء الأمور.',
  },
  {
    key: 'payments_codes',
    label: 'إدارة الدفع الشهري، طلبات التجديد، وتوليد الأكواد',
    shortLabel: 'الدفع والأكواد',
    description: 'تعديل إعدادات الدفع، مراجعة وصولات التجديد، وتوليد وإدارة أكواد التفعيل.',
  },
  {
    key: 'stages_courses',
    label: 'إدارة المراحل والأقسام والمواد والدورات',
    shortLabel: 'المراحل والدورات',
    description: 'إضافة وتعديل المراحل والصفوف والفروع والمواد والدورات والمحاضرات والملازم.',
  },
  {
    key: 'quizzes_live_chat',
    label: 'إدارة الكوزات وغرفة محادثة الكوزات المباشرة',
    shortLabel: 'الكوزات والمحادثة',
    description: 'إنشاء الكوزات المؤقّتة وإدارة جلسات غرفة محادثة الكوزات المباشرة والنتائج.',
  },
  {
    key: 'assignments_schedule',
    label: 'إدارة التحاضير اليومية وجدول البث الأسبوعي',
    shortLabel: 'التحاضير وجدول البث',
    description: 'إرسال التحاضير والواجبات اليومية وتنظيم مواعيد جدول البث الأسبوعي.',
  },
  {
    key: 'live_announcements',
    label: 'إدارة استوديو البث المباشر والإعلانات العاجلة',
    shortLabel: 'البث والإعلانات',
    description: 'تشغيل استوديو البث المباشر والتحكم بشريط الإعلانات العاجلة في أعلى شاشة الطلاب.',
  },
  {
    key: 'store_delivery',
    label: 'إدارة متجر الملازم والمرشحات وطلبات التوصيل',
    shortLabel: 'متجر الملازم',
    description: 'إضافة وتعديل الملازم والمرشحات الورقية وأجور التوصيل ومتابعة طلبات الشراء.',
  },
  {
    key: 'complaints_inquiries',
    label: 'الرد على الشكاوى والاستفسارات',
    shortLabel: 'الشكاوى والاستفسارات',
    description: 'مراجعة شكاوى واستفسارات الطلاب والرد عليها وتحديث حالتها.',
  },
  {
    key: 'can_delete',
    label: 'صلاحية الحذف داخل الأقسام المسموحة',
    shortLabel: 'صلاحية الحذف',
    description: 'السماح بحذف العناصر داخل الأقسام الممنوحة (يبقى حذف المشرفين وتعديل السيرة الذاتية CV محصوراً بالسوبر أدمن فقط).',
  },
];

export const ALL_ADMIN_PERMISSIONS: AdminPermissionKey[] = ADMIN_PERMISSION_DEFINITIONS.map(
  (p) => p.key
);

export function isSuperAdminUser(user: UserProfile | null | undefined): boolean {
  if (!user || user.role !== 'admin') return false;
  return Boolean(user.isSuperAdmin || user.id === 'admin-tabarak');
}

export function hasAdminPermission(
  user: UserProfile | null | undefined,
  permission: AdminPermissionKey
): boolean {
  if (!user || user.role !== 'admin') return false;
  if (isSuperAdminUser(user)) return true;
  return Boolean(user.permissions?.includes(permission));
}

export function canAdminDelete(user: UserProfile | null | undefined): boolean {
  return hasAdminPermission(user, 'can_delete');
}

export function canAccessAdminSection(
  user: UserProfile | null | undefined,
  section: AdminSectionKey
): boolean {
  if (!user || user.role !== 'admin') return false;
  if (isSuperAdminUser(user)) return true;

  switch (section) {
    case 'overview':
      return true;
    case 'moderators':
    case 'cv':
      return false; // Strictly Super Admin (الأستاذة تبارك) ONLY
    case 'students':
      return hasAdminPermission(user, 'students_attendance');
    case 'payments':
    case 'codes':
      return hasAdminPermission(user, 'payments_codes');
    case 'stages':
    case 'courses':
      return hasAdminPermission(user, 'stages_courses');
    case 'quizzes':
      return hasAdminPermission(user, 'quizzes_live_chat');
    case 'assignments':
    case 'schedule':
      return hasAdminPermission(user, 'assignments_schedule');
    case 'live':
      return hasAdminPermission(user, 'live_announcements');
    case 'store':
      return hasAdminPermission(user, 'store_delivery');
    case 'complaints':
    case 'inquiries':
      return hasAdminPermission(user, 'complaints_inquiries');
    default:
      return false;
  }
}

export function getPermissionMeta(key: AdminPermissionKey): AdminPermissionMeta | undefined {
  return ADMIN_PERMISSION_DEFINITIONS.find((p) => p.key === key);
}
