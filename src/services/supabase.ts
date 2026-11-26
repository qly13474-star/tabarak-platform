/**
 * Supabase Service Layer — Ready for Production Keys + Full Interactive Mock Mode
 *
 * To connect your real Supabase project later:
 * 1. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.
 * 2. Install `@supabase/supabase-js` and replace the localStorage persistence
 *    inside these repository functions with Supabase table queries.
 * All UI screens consume this service cleanly without needing refactoring.
 */

import {
  ActivationCode,
  AssignmentAudience,
  AttendanceRecord,
  BreakingAnnouncement,
  Course,
  DailyAssignment,
  Lesson,
  PaymentSettings,
  PdfNote,
  QuizAttempt,
  RenewalRequest,
  StoreDeliverySettings,
  StoreItem,
  StoreOrder,
  StudentComplaint,
  StudentInquiry,
  StudentLiveQuizResult,
  TeacherCV,
  TrackId,
  TrackOption,
  UserProfile,
  WeeklyLiveSlot,
} from '../types';
import { getCurrentDeviceId } from './deviceLock';

export const SUPABASE_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL || '',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
};

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey);
}

export const HERO_BANNER_IMAGE = '/src/assets/images/academy_hero_banner_1795645993666.jpg';

export const TRACK_OPTIONS: TrackOption[] = [
  {
    id: 'intermediate',
    label: 'المرحلة المتوسطة',
    shortLabel: 'المتوسطة',
    description: 'الأول، الثاني، والثالث متوسط — مناهج وزارية مشروحة بدقة وتبسيط.',
    subStages: ['الأول متوسط', 'الثاني متوسط', 'الثالث متوسط'],
    subjects: ['الرياضيات', 'الفيزياء', 'الكيمياء', 'اللغة الإنكليزية', 'اللغة العربية'],
    coverImage: '/src/assets/images/course_intermediate_thumb_1795645994952.jpg',
  },
  {
    id: 'vocational',
    label: 'الإعدادية المهنية',
    shortLabel: 'الإعدادية المهنية',
    description:
      'السادس المهني (الوزاري) بالإضافة إلى الرابع والخامس المهني — بفروع وأقسام قابلة للتخصيص بالكامل.',
    subStages: ['السادس المهني (وزاري)', 'الخامس المهني', 'الرابع المهني'],
    branches: ['الحاسوب وتقنية المعلومات', 'التجاري', 'الصناعي', 'الفنون التطبيقية'],
    subjects: [
      'شبكات الحاسوب',
      'صيانة الحاسوب',
      'الطبيعيات',
      'الرياضيات المهنية',
      'المحاسبة الإدارية',
      'مبادئ التصميم',
    ],
    specializationLabel: 'الفرع المهني',
    coverImage: '/src/assets/images/course_vocational_thumb_1795645995253.jpg',
  },
  {
    id: 'university',
    label: 'الكلية',
    shortLabel: 'الكلية',
    description: 'محاضرات وملازم جامعية منظمة لمختلف الأقسام والمراحل الدراسية.',
    subStages: ['المرحلة الأولى', 'المرحلة الثانية', 'المرحلة الثالثة', 'المرحلة الرابعة'],
    departments: ['علوم الحاسوب', 'هندسة التقنيات', 'الإدارة والاقتصاد', 'كلية التربية'],
    subjects: ['هياكل البيانات', 'قواعد البيانات', 'الإحصاء التطبيقي', 'البرمجة المهيكلة'],
    specializationLabel: 'القسم الجامعي',
    coverImage: '/src/assets/images/course_university_thumb_1795645995228.jpg',
  },
];

export function cloneDefaultTracks(): TrackOption[] {
  return TRACK_OPTIONS.map((t) => ({
    ...t,
    subStages: [...t.subStages],
    branches: t.branches ? [...t.branches] : undefined,
    departments: t.departments ? [...t.departments] : undefined,
    subjects: t.subjects ? [...t.subjects] : [],
  }));
}

export function getTrackLabel(track: TrackId, tracks?: TrackOption[]): string {
  const source = tracks && tracks.length > 0 ? tracks : TRACK_OPTIONS;
  return source.find((item) => item.id === track)?.label ?? track;
}

export function getTrackCover(track: TrackId, tracks?: TrackOption[]): string {
  const source = tracks && tracks.length > 0 ? tracks : TRACK_OPTIONS;
  return source.find((item) => item.id === track)?.coverImage ?? 'auto';
}

export function getAudienceLabel(audience: AssignmentAudience, tracks?: TrackOption[]): string {
  if (audience === 'vocational6') return 'السادس المهني (وزاري)';
  if (audience === 'vocational45') return 'الرابع والخامس المهني';
  const source = tracks && tracks.length > 0 ? tracks : TRACK_OPTIONS;
  const found = source.find((t) => t.id === audience);
  if (found) return found.label;
  if (audience === 'intermediate') return 'المرحلة المتوسطة';
  if (audience === 'university') return 'الكلية';
  return audience;
}

export function getTrackForAudience(audience: AssignmentAudience, tracks?: TrackOption[]): TrackId {
  if (audience === 'vocational6' || audience === 'vocational45') return 'vocational';
  const source = tracks && tracks.length > 0 ? tracks : TRACK_OPTIONS;
  const found = source.find((t) => t.id === audience);
  if (found) return found.id;
  return audience;
}

export function isAssignmentForStudent(
  assignment: DailyAssignment,
  student: UserProfile
): boolean {
  const targetTrack = assignment.track || getTrackForAudience(assignment.audience);
  if (student.track !== targetTrack) {
    return false;
  }

  // Legacy vocational6/45 sub-stage filtering
  if (assignment.audience === 'vocational6' && !student.subStage.includes('السادس المهني')) {
    return false;
  }
  if (assignment.audience === 'vocational45' && student.subStage.includes('السادس المهني')) {
    return false;
  }

  // Dynamic sub-stage filtering
  if (
    assignment.subStage &&
    assignment.subStage !== 'جميع الصفوف' &&
    assignment.subStage !== 'الكل' &&
    student.subStage !== assignment.subStage
  ) {
    return false;
  }

  // Dynamic branch / department filtering
  const studentSpec = student.branch || student.department;
  if (
    assignment.branch &&
    assignment.branch !== 'جميع الفروع' &&
    assignment.branch !== 'الجميع' &&
    assignment.branch !== 'الكل' &&
    studentSpec &&
    studentSpec !== assignment.branch
  ) {
    return false;
  }

  return true;
}

export function getRelativeDateISO(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const STORAGE_KEY = 'tabarak_academy_db_v10';

export const DEFAULT_TEACHER_CV: TeacherCV = {
  fullName: 'تبارك الأزيرجاوي',
  academicTitle: 'أستاذة وباحثة أكاديمية متخصصة في المناهج الوزارية والجامعية',
  specialization: 'علوم الحاسوب والرياضيات التطبيقية ومناهج الإعدادية المهنية',
  subjectsTaught: [
    'الرياضيات الوزارية — المرحلة المتوسطة',
    'شبكات الحاسوب وصيانة الأنظمة — السادس المهني',
    'الطبيعيات والرياضيات الصناعية — السادس المهني',
    'المحاسبة الإدارية والتكاليف — السادس التجاري',
    'هياكل البيانات والخوارزميات — المرحلة الجامعية',
  ],
  degree: 'ماجستير علوم الحاسوب وتقنية المعلومات — جامعة بغداد',
  qualifications:
    'بكالوريوس علوم الحاسوب (الأولى على القسم) · ماجستير في هندسة البرمجيات والأنظمة الذكية · شهادة طرائق التدريس الجامعي الحديثة والتدريب الإلكتروني المعتمد.',
  age: '31 سنة',
  yearsExperience: '9 سنوات في التدريس الحضوري والإلكتروني',
  governorate: 'بغداد',
  area: 'الكرادة الشرقية / ساحة الواثق',
  instituteAddress: 'بغداد — الكرادة الشرقية، قرب ساحة الواثق، معهد النخبة الأكاديمي للتدريس الحديث (الطابق الثاني)',
  bio: 'أؤمن بأن التفوق الوزاري والجامعي يبدأ بفهم الفكرة من جذورها بأسلوب مبسّط ومنظّم بعيداً عن الحفظ الجاف. أعمل على مرافقة كل طالب خطوة بخطوة عبر المحاضرات التفاعلية، الملازم المركّزة، والتحاضير والكوزات اليومية حتى يوم الامتحان.',
  achievements: [
    'تخريج أكثر من 1,450 طالباً وطالبة في المرحلة المتوسطة والسادس المهني بمعدلات عالية خلال السنوات الخمس الأخيرة.',
    'تحقيق نسبة نجاح 98.4% في الامتحانات الوزارية للسادس المهني (فروع الحاسوب، التجاري، الصناعي، والفنون التطبيقية).',
    'إعداد سلسلة الملازم والمرشحات الوزارية الذهبية المعتمدة لدى آلاف الطلبة في بغداد والمحافظات.',
    'أكثر من 38 طالباً وطالبة حققوا الدرجة الكاملة (100/100) في الامتحانات الوزارية للعام الدراسي الماضي.',
  ],
  phone: '07701234567',
  whatsapp: '07701234567',
  telegram: 'https://t.me/tabarak_academy',
  instagram: 'https://instagram.com/tabarak.academy',
  facebook: 'https://facebook.com/tabarak.academy',
  updatedAt: '2026-11-25',
};

export const DEFAULT_STORE_DELIVERY_SETTINGS: StoreDeliverySettings = {
  baghdadFeeIqd: 5000,
  provincesFeeIqd: 8000,
  estimatedDeliveryText: 'التوصيل السريع خلال 24 – 48 ساعة لجميع محافظات العراق',
};

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  cardNumber: '5399 4810 2274 8891',
  cardType: 'ماستر كارد الرافدين / سوبر كي (QiCard)',
  cardHolderName: 'تبارك الأزيرجاوي',
  whatsappNumber: '07701234567',
  monthlyFeeIqd: 50000,
  gracePeriodDays: 5,
};

const DEMO_RECEIPT_SVG_DATA_URL =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="280" viewBox="0 0 440 280">
      <rect width="440" height="280" rx="16" fill="#0F172A"/>
      <rect x="16" y="16" width="408" height="248" rx="12" fill="#FFFFFF"/>
      <rect x="16" y="16" width="408" height="54" rx="12" fill="#0F172A"/>
      <text x="404" y="49" text-anchor="end" font-family="sans-serif" font-size="16" font-weight="bold" fill="#D4AF37">إيصال تحويل ماستر كارد / سوبر كي</text>
      <text x="404" y="102" text-anchor="end" font-family="sans-serif" font-size="13" fill="#475569">تمت عملية التحويل بنجاح</text>
      <text x="404" y="134" text-anchor="end" font-family="sans-serif" font-size="22" font-weight="bold" fill="#0F172A">50,000 د.ع</text>
      <line x1="36" y1="154" x2="404" y2="154" stroke="#E2E8F0" stroke-width="1"/>
      <text x="404" y="182" text-anchor="end" font-family="sans-serif" font-size="12" fill="#334155">المرسل: مهدي كاظم الموسوي (السادس المهني)</text>
      <text x="404" y="208" text-anchor="end" font-family="sans-serif" font-size="12" fill="#334155">إلى بطاقة: تبارك الأزيرجاوي (**** 8891)</text>
      <text x="404" y="236" text-anchor="end" font-family="monospace" font-size="11" fill="#059669">REF #QI-98421077 · VERIFIED</text>
    </svg>`
  );

export const DEFAULT_BREAKING_ANNOUNCEMENT: BreakingAnnouncement = {
  id: 'ann-demo-1',
  message:
    'تنبيه عاجل من الأستاذة تبارك: تم تحديث جدول البث المباشر لهذا الأسبوع، وسيكون بث مراجعة الأسئلة الوزارية الشاملة اليوم الساعة 8:00 مساءً — يرجى الالتزام بالحضور وتحضير الملزمة.',
  isActive: true,
  targetTrack: 'all',
  updatedAt: '2026-11-25 14:30',
};

export interface PlatformDatabase {
  tracks: TrackOption[];
  users: UserProfile[];
  courses: Course[];
  activationCodes: ActivationCode[];
  quizAttempts: QuizAttempt[];
  watchedLessons: Record<string, string[]>;
  assignments: DailyAssignment[];
  completedAssignments: Record<string, string[]>;
  readAssignmentNotifications: Record<string, string[]>;
  liveQuizResults: StudentLiveQuizResult[];
  paymentSettings: PaymentSettings;
  renewalRequests: RenewalRequest[];
  storeItems: StoreItem[];
  storeDeliverySettings: StoreDeliverySettings;
  storeOrders: StoreOrder[];
  teacherCV: TeacherCV;
  complaints: StudentComplaint[];
  inquiries: StudentInquiry[];
  weeklySchedule: WeeklyLiveSlot[];
  attendanceRecords: AttendanceRecord[];
  breakingAnnouncement: BreakingAnnouncement;
}

function buildInitialDatabase(): PlatformDatabase {
  const currentDevice = getCurrentDeviceId();

  const users: UserProfile[] = [
    {
      id: 'admin-tabarak',
      fullName: 'الأستاذة تبارك الأزيرجاوي',
      phone: '07848333046',
      username: 'tabarak',
      password: '',
      role: 'admin',
      isSuperAdmin: true,
      adminRoleTitle: 'السوبر أدمن — صاحبة المنصة',
      track: 'intermediate',
      subStage: 'الإدارة الأكاديمية',
      deviceId: null,
      isActive: true,
      enrolledCourseIds: [],
      createdAt: '2025-09-01',
      lastLoginAt: '2026-11-25 14:10',
    },
    {
      id: 'mod-demo-store-support',
      fullName: 'أحمد كريم الدليمي',
      phone: '07719998877',
      username: 'mod1',
      password: 'mod123',
      role: 'admin',
      isSuperAdmin: false,
      adminRoleTitle: 'مسؤول الملازم والشكاوى',
      permissions: ['store_delivery', 'complaints_inquiries'],
      track: 'intermediate',
      subStage: 'فريق الإدارة والإشراف',
      deviceId: null,
      isActive: true,
      enrolledCourseIds: [],
      createdAt: '2026-11-20',
      lastLoginAt: '2026-11-26 10:15',
    },
    {
      id: 'stu-zainab',
      fullName: 'زينب حيدر الموسوي',
      phone: '07712345678',
      parentPhone: '07704561234',
      password: '123456',
      role: 'student',
      track: 'intermediate',
      subStage: 'الثالث متوسط',
      deviceId: currentDevice,
      isActive: true,
      enrolledCourseIds: ['crs-int-math3'],
      subscriptionDueDate: getRelativeDateISO(18),
      createdAt: '2026-09-14',
      lastLoginAt: '2026-11-25 13:45',
    },
    {
      id: 'stu-mustafa',
      fullName: 'مصطفى علي الجبوري',
      phone: '07809876543',
      parentPhone: '07708823451',
      password: '123456',
      role: 'student',
      track: 'vocational',
      subStage: 'السادس المهني (وزاري)',
      branch: 'الحاسوب وتقنية المعلومات',
      deviceId: currentDevice,
      isActive: true,
      enrolledCourseIds: ['crs-voc-it', 'crs-voc-ind'],
      subscriptionDueDate: getRelativeDateISO(2), // Demo state 1: 2 days left (Yellow Reminder)
      createdAt: '2026-09-20',
      lastLoginAt: '2026-11-25 12:20',
    },
    {
      id: 'stu-grace-demo',
      fullName: 'مهدي كاظم الموسوي',
      phone: '07751234567',
      parentPhone: '07814492011',
      password: '123456',
      role: 'student',
      track: 'vocational',
      subStage: 'السادس المهني (وزاري)',
      branch: 'التجاري',
      deviceId: currentDevice,
      isActive: true,
      enrolledCourseIds: ['crs-voc-comm'],
      subscriptionDueDate: getRelativeDateISO(-2), // Demo state 2: Inside 5-day grace period (3 days left before lock)
      createdAt: '2026-09-25',
      lastLoginAt: '2026-11-25 11:40',
    },
    {
      id: 'stu-locked-sub',
      fullName: 'سارة أحمد الدليمي',
      phone: '07839876543',
      parentPhone: '07709912400',
      password: '123456',
      role: 'student',
      track: 'intermediate',
      subStage: 'الثالث متوسط',
      deviceId: currentDevice,
      isActive: true,
      enrolledCourseIds: ['crs-int-math3'],
      subscriptionDueDate: getRelativeDateISO(-7), // Demo state 3: Auto-locked after 35 days (due + 5 grace days expired)
      createdAt: '2026-09-10',
      lastLoginAt: '2026-11-24 20:05',
    },
    {
      id: 'stu-noor',
      fullName: 'نور الهدى كريم الساعدي',
      phone: '07723456789',
      parentPhone: '07713329800',
      password: '123456',
      role: 'student',
      track: 'university',
      subStage: 'المرحلة الثانية',
      department: 'علوم الحاسوب',
      deviceId: currentDevice,
      isActive: true,
      enrolledCourseIds: ['crs-uni-ds'],
      subscriptionDueDate: getRelativeDateISO(12),
      createdAt: '2026-10-02',
      lastLoginAt: '2026-11-25 11:05',
    },
    {
      id: 'stu-ali-locked',
      fullName: 'علي حسين الكعبي',
      phone: '07734567890',
      parentPhone: '07802219400',
      password: '123456',
      role: 'student',
      track: 'intermediate',
      subStage: 'الثالث متوسط',
      deviceId: 'AND-X92K-4418', // Bound to a different device to demonstrate Device Lock
      isActive: true,
      enrolledCourseIds: ['crs-int-math3'],
      subscriptionDueDate: getRelativeDateISO(15),
      createdAt: '2026-10-08',
      lastLoginAt: '2026-11-24 21:15',
    },
    {
      id: 'stu-fatima',
      fullName: 'فاطمة محمد الخفاجي',
      phone: '07815544332',
      parentPhone: '07707765412',
      password: '123456',
      role: 'student',
      track: 'vocational',
      subStage: 'السادس المهني (وزاري)',
      branch: 'التجاري',
      deviceId: 'AND-B74M-2091',
      isActive: true,
      enrolledCourseIds: ['crs-voc-comm'],
      subscriptionDueDate: getRelativeDateISO(1),
      createdAt: '2026-10-12',
      lastLoginAt: '2026-11-24 19:40',
    },
    {
      id: 'stu-ahmad-voc5',
      fullName: 'أحمد ستار العبودي',
      phone: '07741122334',
      parentPhone: '07718804321',
      password: '123456',
      role: 'student',
      track: 'vocational',
      subStage: 'الخامس المهني',
      branch: 'الصناعي',
      deviceId: 'AND-K51N-6632',
      isActive: true,
      enrolledCourseIds: ['crs-voc-ind'],
      subscriptionDueDate: getRelativeDateISO(21),
      createdAt: '2026-10-15',
      lastLoginAt: '2026-11-24 18:10',
    },
    {
      id: 'stu-zahraa-art6',
      fullName: 'زهراء قاسم الزبيدي',
      phone: '07827766554',
      parentPhone: '07725519088',
      password: '123456',
      role: 'student',
      track: 'vocational',
      subStage: 'السادس المهني (وزاري)',
      branch: 'الفنون التطبيقية',
      deviceId: 'AND-M82R-3190',
      isActive: true,
      enrolledCourseIds: ['crs-voc-art'],
      subscriptionDueDate: getRelativeDateISO(-3),
      createdAt: '2026-10-17',
      lastLoginAt: '2026-11-25 10:05',
    },
    {
      id: 'stu-hassan',
      fullName: 'حسن كاظم الربيعي',
      phone: '07709988776',
      parentPhone: '07801194322',
      password: '123456',
      role: 'student',
      track: 'university',
      subStage: 'المرحلة الأولى',
      department: 'الإدارة والاقتصاد',
      deviceId: 'AND-P31Q-8820',
      isActive: false,
      enrolledCourseIds: ['crs-uni-stat'],
      subscriptionDueDate: getRelativeDateISO(-10),
      createdAt: '2026-10-19',
      lastLoginAt: '2026-11-20 16:30',
    },
  ];

  const courses: Course[] = [
    {
      id: 'crs-int-math3',
      title: 'الرياضيات المتكاملة — الثالث متوسط',
      subtitle: 'شرح المنهج الوزاري مع حلول الأسئلة الوزارية خطوة بخطوة',
      track: 'intermediate',
      subStage: 'الثالث متوسط',
      instructor: 'الأستاذة تبارك الأزيرجاوي',
      coverImage: '/src/assets/images/course_intermediate_thumb_1795645994952.jpg',
      description:
        'دورة شاملة تغطي جميع فصول رياضيات الثالث متوسط بأسلوب مبسّط ومنهجي، مع اختبارات أسبوعية وملازم ملخصة لأهم المسائل الوزارية.',
      totalHours: '36 ساعة مسجلة',
      priceIqd: 50000,
      lessons: [
        {
          id: 'les-int-1',
          title: 'المحاضرة 1: ترتيب العمليات في الأعداد الحقيقية',
          duration: '34:15',
          durationSeconds: 2055,
          videoUrl: 'protected://stream/int-math3-01',
          description: 'تبسيط الجمل العددية التي تحتوي على جذور تربيعية وتكعيبية واستعمال تنسيب المقام.',
          order: 1,
          priceIqd: 0,
          topics: ['خصائص الجذور التربيعية', 'تنسيب المقام بالمرافق', 'حل تمرينات وزارية مكررة'],
          slides: [
            {
              timeSec: 0,
              title: 'مراجعة خصائص الجذور التربيعية',
              body: 'عند ضرب جذرين متشابهين نحصل على العدد داخل الجذر مباشرة، أما الجذور المختلفة فتُضرب داخل جذر واحد.',
              formula: '√a × √a = a   |   √a × √b = √(a·b)',
            },
            {
              timeSec: 600,
              title: 'تنسيب المقام باستخدام العامل المرافق',
              body: 'للتخلص من الجذر في المقام نضرب البسط والمقام في مرافق المقام مع عكس الإشارة الوسطى.',
              formula: '(√a - √b)(√a + √b) = a - b',
            },
            {
              timeSec: 1300,
              title: 'مثال وزاري محلول — الدور الأول',
              body: 'بسّط الجملة العددية التالية باستعمال ترتيب العمليات وقرب الناتج لأقرب عشر بدقة.',
              formula: '(√12 - √18)(√12 + √18) = 12 - 18 = -6',
            },
          ],
        },
        {
          id: 'les-int-2',
          title: 'المحاضرة 2: التطبيقات وأنواعها وتركيب التطبيق',
          duration: '41:20',
          durationSeconds: 2480,
          videoUrl: 'protected://stream/int-math3-02',
          description: 'فهم التطبيق الشامل والمتباين والمتقابل، وإيجاد قاعدة تركيب التطبيقين (f ∘ g).',
          order: 2,
          priceIqd: 10000,
          topics: ['المجال والمجال المقابل', 'شروط التطبيق المتقابل', 'تركيب التطبيقات خطوة بخطوة'],
          slides: [
            {
              timeSec: 0,
              title: 'أنواع التطبيقات الأساسية',
              body: 'يكون التطبيق شاملاً إذا كان المدى يساوي المجال المقابل، ومتبايناً إذا لم تتكرر صور العناصر المختلفة.',
              formula: 'Range(f) = Codomain(f)',
            },
            {
              timeSec: 900,
              title: 'قانون تركيب التطبيقين',
              body: 'نبدأ بتعويض القيمة في التطبيق الداخلي g(x) ثم نعوّض الناتج داخل التطبيق الخارجي f.',
              formula: '(f ∘ g)(x) = f(g(x))',
            },
          ],
        },
        {
          id: 'les-int-3',
          title: 'المحاضرة 3: المتتابعات الحسابية وإيجاد الحد العام',
          duration: '38:50',
          durationSeconds: 2330,
          videoUrl: 'protected://stream/int-math3-03',
          description: 'استخدام قانون الحد العام للمتتابعة الحسابية لإيجاد الأساس والحدود المطلوبة.',
          order: 3,
          priceIqd: 10000,
          topics: ['الحد الأول والأساس d', 'قانون الحد العام Un', 'مسائل وزارية حول الحدود المحصورة'],
          slides: [
            {
              timeSec: 0,
              title: 'قانون الحد العام للمتتابعة الحسابية',
              body: 'يمثل a الحد الأول، ويمثل d أساس المتتابعة وهو الفرق الثابت بين كل حدين متتاليين.',
              formula: 'Uₙ = a + (n - 1) · d',
            },
          ],
        },
      ],
      notes: [
        {
          id: 'pdf-int-1',
          title: 'ملزمة الفصل الأول — العلاقات والمتباينات (الطبعة الذهبية)',
          pageCount: 3,
          fileUrl: 'protected://pdf/math3-ch1.pdf',
          updatedAt: '2026-11-10',
          pages: [
            {
              pageNumber: 1,
              sectionTitle: 'الفصل الأول · الدرس الأول',
              heading: 'ترتيب العمليات في الأعداد الحقيقية',
              paragraphs: [
                'تُعد مهارة تبسيط الجذور التربيعية والتكعيبية حجر الأساس في منهج الثالث متوسط، وتأتي عليها في الامتحان الوزاري درجة ثابتة كل عام.',
                'قبل البدء بالتبسيط يجب تحليل الأعداد الكبيرة داخل الجذور إلى عواملها الأولية بحيث يخرج المربع الكامل خارج الجذر.',
              ],
              keyPoints: [
                'تحليل الجذور الكبيرة مثل √12 = 2√3 و √18 = 3√2 قبل الجمع أو الطرح.',
                'لا يمكن جمع أو طرح الجذور إلا إذا كانت متشابهة في الدليل والعدد داخل الجذر.',
                'عند وجود جذر في المقام نضرب البسط والمقام بنفس الجذر أو بالمرافق.',
              ],
              exampleBox: {
                label: 'مثال وزاري نموذجي',
                content: 'بسّط المقدار: (√12 - √18)(√12 + √18). الحل: بالفرق بين مربعين يصبح الناتج 12 - 18 = -6.',
              },
            },
            {
              pageNumber: 2,
              sectionTitle: 'الفصل الأول · الدرس الثاني',
              heading: 'أنواع التطبيقات وتركيب التطبيق',
              paragraphs: [
                'التطبيق هو علاقة من مجموعة المجال X إلى مجموعة المجال المقابل Y بحيث يرتبط كل عنصر في X بصورة وحيدة في Y.',
                'للتحقق من نوع التطبيق نكتب الأزواج المرتبة والمدى أولاً، ثم نفحص الشمول والتباين لنحكم على التقابل.',
              ],
              keyPoints: [
                'التطبيق الشامل: المدى = المجال المقابل.',
                'التطبيق المتباين: كل عنصرين مختلفين في المجال لهما صورتان مختلفتان.',
                'التطبيق المتقابل: يجب أن يكون شاملاً ومتبايناً في آنٍ واحد.',
              ],
              exampleBox: {
                label: 'قاعدة ذهبية في التركيب',
                content: 'إذا كان f(x) = 2x + 1 و g(x) = x² فإن (f ∘ g)(3) = f(g(3)) = f(9) = 2(9) + 1 = 19.',
              },
            },
            {
              pageNumber: 3,
              sectionTitle: 'الفصل الأول · الدرس الثالث',
              heading: 'المتتابعات الحسابية والأساس d',
              paragraphs: [
                'المتتابعة الحسابية هي متتابعة يكون فيها ناتج طرح كل حد من الحد الذي يليه عدداً ثابتاً يُسمى الأساس ويرمز له بالرمز d.',
                'إذا كان الأساس موجباً تكون المتتابعة متزايدة، وإذا كان سالباً تكون متناقصة، وإذا ساوى صفراً تكون ثابتة.',
              ],
              keyPoints: [
                'قانون الحد العام: Uₙ = a + (n - 1)d.',
                'لإيجاد الأساس من حدين متتاليين: d = U₂ - U₁.',
                'انتبه لإشارة الأساس السالبة عند التعويض داخل الأقواس.',
              ],
            },
          ],
        },
      ],
      quizzes: [
        {
          id: 'quiz-int-1',
          title: 'اختبار الفصل الأول الشامل (وزاريات)',
          timeLimitMinutes: 15,
          questions: [
            {
              id: 'q1',
              question: 'ما ناتج تبسيط المقدار (√12 - √18)(√12 + √18) ؟',
              options: ['6', '-6', '30', '-30'],
              correctIndex: 1,
              explanation: 'بحسب قانون الفرق بين مربعين: (√12)² - (√18)² = 12 - 18 = -6.',
            },
            {
              id: 'q2',
              question: 'إذا كان f(x) = 2x + 1 و g(x) = x²، فما قيمة (f ∘ g)(3) ؟',
              options: ['19', '49', '13', '17'],
              correctIndex: 0,
              explanation: 'نجد أولاً g(3) = 3² = 9، ثم نعوض في f لنحصل على f(9) = 2(9) + 1 = 19.',
            },
            {
              id: 'q3',
              question: 'في المتتابعة الحسابية التي حدها الأول a = 3 وأساسها d = 4، ما قيمة الحد الخامس U₅ ؟',
              options: ['15', '19', '23', '17'],
              correctIndex: 1,
              explanation: 'بتطبيق القانون U₅ = a + 4d = 3 + 4(4) = 19.',
            },
            {
              id: 'q4',
              question: 'يكون التطبيق متقابلاً إذا كان:',
              options: [
                'شاملاً فقط',
                'متبايناً فقط',
                'شاملاً ومتبايناً في آنٍ واحد',
                'ثابتاً لجميع عناصر المجال',
              ],
              correctIndex: 2,
              explanation: 'شرط التقابل الأساسي هو تحقق صفتي الشمول والتباين معاً.',
            },
          ],
        },
      ],
    },
    {
      id: 'crs-int-eng',
      title: 'قواعد اللغة الإنجليزية والإنشاء — المرحلة المتوسطة',
      subtitle: 'تأسيس القواعد والأزمنة والقطع الاستيعابية للأول والثاني والثالث متوسط',
      track: 'intermediate',
      subStage: 'الثالث متوسط',
      instructor: 'الأستاذة تبارك الأزيرجاوي',
      coverImage: '/src/assets/images/course_intermediate_thumb_1795645994952.jpg',
      description:
        'تغطية كاملة لقواعد الوحدات الأساسية، أسلوب حل القطعة الخارجية، وصياغة الإنشاءات الوزارية بأسلوب واضح وسلس.',
      totalHours: '24 ساعة مسجلة',
      priceIqd: 35000,
      lessons: [
        {
          id: 'les-eng-1',
          title: 'المحاضرة 1: وصف الأماكن والزمن المضارع المستمر',
          duration: '29:40',
          durationSeconds: 1780,
          videoUrl: 'protected://stream/int-eng-01',
          description: 'استخدام There is / There are مع الأمثلة الوزارية الدقيقة.',
          order: 1,
          priceIqd: 0,
          topics: ['قاعدة المفرد والجمع', 'النفي والاستفهام', 'التمييز بين المضارع البسيط والمستمر'],
          slides: [
            {
              timeSec: 0,
              title: 'قواعد وصف الأماكن (Describing Places)',
              body: 'نستخدم There is للمفرد المعدود وغير المعدود، ونستخدم There are للجمع دائماً.',
              formula: 'There is + a/an + Singular  |  There are + Plural',
            },
          ],
        },
      ],
      notes: [
        {
          id: 'pdf-eng-1',
          title: 'ملزمة القواعد والإنشاءات المختصرة — الوحدة الأولى',
          pageCount: 2,
          fileUrl: 'protected://pdf/eng-unit1.pdf',
          updatedAt: '2026-11-12',
          pages: [
            {
              pageNumber: 1,
              sectionTitle: 'الوحدة الأولى · القواعد',
              heading: 'وصف الأماكن وترتيب الصفات',
              paragraphs: [
                'عند وصف مكان باللغة الإنجليزية يجب الانتباه إلى وجود أداة التنكير a/an قبل الاسم المفرد، ووجود s الجمع أو الكلمات some / lots of للجمع.',
              ],
              keyPoints: [
                'في حالة النفي نستخدم any مع الجمع وغير المعدود.',
                'ترتيب الصفات يبدأ بالرأي ثم الحجم ثم العمر ثم الشكل ثم اللون.',
              ],
            },
            {
              pageNumber: 2,
              sectionTitle: 'الوحدة الأولى · الإنشاء',
              heading: 'كتابة إيميل وصف صديق (Describing a Friend)',
              paragraphs: [
                'احرص على كتابة التحية في الأعلى، ومقدمة قصيرة، ثم فقرة الوصف الشكلي والشخصي، وأخيراً الخاتمة.',
              ],
              keyPoints: [
                'استخدم جملاً قصيرة وصحيحة إملائياً لتجنب الأخطاء القواعدية.',
                'راجع علامات التنقيط والأحرف الكبيرة في بداية كل جملة.',
              ],
            },
          ],
        },
      ],
      quizzes: [
        {
          id: 'quiz-eng-1',
          title: 'اختبار قواعد الوحدة الأولى',
          timeLimitMinutes: 10,
          questions: [
            {
              id: 'qe1',
              question: 'اختر الإجابة الصحيحة: _____ an information desk in the mall.',
              options: ['There are', 'There is', 'It have', 'They are'],
              correctIndex: 1,
              explanation: 'الكلمة an information desk مفردة، لذلك نستخدم There is.',
            },
            {
              id: 'qe2',
              question: 'في حالة النفي مع الجمع نستخدم غالباً:',
              options: ['some', 'a', 'any', 'an'],
              correctIndex: 2,
              explanation: 'تأتي كلمة any في الجمل المنفية والاستفهامية مع الأسماء الجمع.',
            },
          ],
        },
      ],
    },
    {
      id: 'crs-voc-it',
      title: 'السادس المهني — شبكات الحاسوب وصيانة الأنظمة (وزاري)',
      subtitle: 'فرع الحاسوب وتقنية المعلومات — المنهج الوزاري الشامل النظري والعملي',
      track: 'vocational',
      subStage: 'السادس المهني (وزاري)',
      branch: 'الحاسوب وتقنية المعلومات',
      instructor: 'الأستاذة تبارك الأزيرجاوي',
      coverImage: '/src/assets/images/course_vocational_thumb_1795645995253.jpg',
      description:
        'إعداد وزاري شامل لطلبة السادس المهني (فرع الحاسوب وتقنية المعلومات) في الشبكات، العنونة المنطقية IP، وصيانة الأنظمة مع مرشحات وملازم وزارية محلولة.',
      totalHours: '34 ساعة مسجلة',
      priceIqd: 60000,
      lessons: [
        {
          id: 'les-voc-1',
          title: 'المحاضرة 1: طبقات نموذج OSI وبروتوكول TCP/IP (وزاريات السادس المهني)',
          duration: '44:10',
          durationSeconds: 2650,
          videoUrl: 'protected://stream/voc-it-01',
          description: 'فهم الطبقات السبع لنموذج OSI ووظيفة كل طبقة والأجهزة المرتبطة بها مع الأسئلة الوزارية المكررة.',
          order: 1,
          priceIqd: 0,
          topics: ['الطبقة الفيزيائية وربط البيانات', 'التوجيه في طبقة الشبكة', 'الفرق بين TCP و UDP'],
          slides: [
            {
              timeSec: 0,
              title: 'طبقات نموذج OSI السبع — السادس المهني',
              body: 'يُقسّم الاتصال الشبكي إلى سبع طبقات تبدأ بالطبقة الفيزيائية (Physical) وتنتهي بطبقة التطبيقات (Application).',
              formula: 'L1 Physical → L2 Data Link → L3 Network → L4 Transport',
            },
            {
              timeSec: 1200,
              title: 'الأجهزة الشبكية وموقعها في الطبقات',
              body: 'يعمل المبدّل (Switch) في الطبقة الثانية باستخدام عنوان MAC، بينما يعمل الموجّه (Router) في الطبقة الثالثة باستخدام عنوان IP.',
              formula: 'Switch = Layer 2 (MAC)  |  Router = Layer 3 (IP)',
            },
          ],
        },
        {
          id: 'les-voc-2',
          title: 'المحاضرة 2: تقسيم الشبكات الفرعية (Subnetting) وعناوين IPv4',
          duration: '39:25',
          durationSeconds: 2365,
          videoUrl: 'protected://stream/voc-it-02',
          description: 'حساب قناع الشبكة الفرعية وعدد الأجهزة المتاحة في كل شبكة بسهولة تامة لامتحان السادس المهني.',
          order: 2,
          priceIqd: 12000,
          topics: ['فئات عناوين IPv4', 'قناع الشبكة Subnet Mask', 'إيجاد عنوان البث Broadcast'],
          slides: [
            {
              timeSec: 0,
              title: 'قانون حساب عدد الأجهزة الصالحة',
              body: 'نطرح 2 دائماً لحجز عنوان الشبكة (Network ID) وعنوان البث العام (Broadcast).',
              formula: 'Usable Hosts = 2ʰ - 2',
            },
          ],
        },
      ],
      notes: [
        {
          id: 'pdf-voc-1',
          title: 'الملزمة الوزارية الذهبية — شبكات الحاسوب (السادس المهني)',
          pageCount: 2,
          fileUrl: 'protected://pdf/voc6-networks-ministerial.pdf',
          updatedAt: '2026-11-22',
          pages: [
            {
              pageNumber: 1,
              sectionTitle: 'السادس المهني (وزاري) · الحاسوب وتقنية المعلومات',
              heading: 'نموذج OSI المرجعي وتكوين الحزم — ملخص وزاري',
              paragraphs: [
                'وضعت منظمة المعايير الدولية ISO نموذج OSI لتوحيد آلية تواصل الأجهزة الشبكية المختلفة وتسهيل اكتشاف الأعطال، وهو من الثوابت الوزارية في السادس المهني.',
              ],
              keyPoints: [
                'طبقة ربط البيانات (Data Link) مسؤولة عن العناوين الفيزيائية MAC وكشف الأخطاء.',
                'طبقة الشبكة (Network) تتولى اختيار أفضل مسار لنقل الحزم عبر الموجّهات.',
                'بروتوكول TCP يضمن وصول البيانات بترتيب سليم بينما UDP أسرع للبث المباشر.',
              ],
              exampleBox: {
                label: 'سؤال وزاري مكرر — السادس المهني',
                content: 'قارن بين عمل المبدّل (Switch) والموجّه (Router) من حيث طبقة العمل ونوع العنوان المستخدم في التوجيه.',
              },
            },
            {
              pageNumber: 2,
              sectionTitle: 'السادس المهني (وزاري) · العنونة المنطقية',
              heading: 'فئات عناوين IPv4 وتقسيم الشبكات الفرعية',
              paragraphs: [
                'يتكون عنوان IPv4 من 32 بت مقسمة إلى أربع خانات عشرية (Octets)، ويُصنف إلى الفئات A و B و C للاستخدام القياسي.',
              ],
              keyPoints: [
                'الفئة C تبدأ من 192 إلى 223 وقناعها الافتراضي 255.255.255.0.',
                'عدد الأجهزة الفعالة في شبكة /24 يساوي 254 جهازاً.',
              ],
            },
          ],
        },
      ],
      quizzes: [
        {
          id: 'quiz-voc-1',
          title: 'كوز السادس المهني الوزاري — الشبكات ونموذج OSI',
          timeLimitMinutes: 5,
          questions: [
            {
              id: 'qv1',
              question: 'في أي طبقة من نموذج OSI يعمل جهاز الموجّه (Router) ؟',
              options: ['الطبقة الفيزيائية', 'طبقة ربط البيانات', 'طبقة الشبكة', 'طبقة الجلسة'],
              correctIndex: 2,
              explanation: 'يعمل الموجّه في الطبقة الثالثة (طبقة الشبكة) لتوجيه الحزم اعتماداً على عناوين IP.',
            },
            {
              id: 'qv2',
              question: 'كم عدد عناوين الأجهزة الصالحة للاستخدام في شبكة بقناع /24 ؟',
              options: ['256', '255', '254', '252'],
              correctIndex: 2,
              explanation: 'بتطبيق القانون 2⁸ - 2 = 256 - 2 = 254 عنواناً صالحاً للأجهزة.',
            },
            {
              id: 'qv3',
              question: 'أي جهاز يعمل في طبقة ربط البيانات (Layer 2) ويعتمد على العنوان الفيزيائي MAC ؟',
              options: ['المبدّل (Switch)', 'الموجّه (Router)', 'المكرّر (Repeater)', 'البوابة (Gateway)'],
              correctIndex: 0,
              explanation: 'المبدّل (Switch) يعمل في الطبقة الثانية ويوجه الإطارات باستخدام جدول عناوين MAC.',
            },
            {
              id: 'qv4',
              question: 'أي بروتوكول في طبقة النقل يضمن وصول البيانات كاملة وبنفس الترتيب (موثوق)؟',
              options: ['UDP', 'TCP', 'ICMP', 'ARP'],
              correctIndex: 1,
              explanation: 'بروتوكول TCP يعتمد على المصافحة الثلاثية وإعادة إرسال الحزم المفقودة لضمان الموثوقية.',
            },
            {
              id: 'qv5',
              question: 'القناع الافتراضي (Default Subnet Mask) لعناوين IPv4 من الفئة C هو:',
              options: ['255.0.0.0', '255.255.0.0', '255.255.255.0', '255.255.255.252'],
              correctIndex: 2,
              explanation: 'الفئة C تخصص 24 بت للشبكة و8 بت للأجهزة، لذا فقناعها الافتراضي 255.255.255.0.',
            },
          ],
        },
      ],
    },
    {
      id: 'crs-voc-ind',
      title: 'السادس المهني — الطبيعيات والرياضيات الصناعية (وزاري)',
      subtitle: 'الفرع الصناعي — الحركة الدائرية، الحث الكهرومغناطيسي، والتكامل الوزاري',
      track: 'vocational',
      subStage: 'السادس المهني (وزاري)',
      branch: 'الصناعي',
      instructor: 'الأستاذة تبارك الأزيرجاوي',
      coverImage: '/src/assets/images/course_vocational_thumb_1795645995253.jpg',
      description:
        'منهج وزاري مكثف لطلبة السادس المهني (الفرع الصناعي) يشمل شرح مسائل الطبيعيات والرياضيات خطوة بخطوة مع حلول الأسئلة الوزارية للأعوام السابقة.',
      totalHours: '38 ساعة مسجلة',
      priceIqd: 55000,
      lessons: [
        {
          id: 'les-voc-ind1',
          title: 'المحاضرة 1: الحركة الدائرية والدورانية وقوانين العزم',
          duration: '41:00',
          durationSeconds: 2460,
          videoUrl: 'protected://stream/voc6-ind-01',
          description: 'اشتقاق وتطبيق قوانين التعجيل المركزي والسرعة الزاوية مع أمثلة وزارية محلولة للسادس الصناعي.',
          order: 1,
          priceIqd: 0,
          topics: ['السرعة الزاوية ω', 'العلاقة بين السرعة الخطية والزاوية', 'مسائل وزارية حول عزم القصور الذاتي'],
          slides: [
            {
              timeSec: 0,
              title: 'قوانين الحركة الدورانية — السادس الصناعي',
              body: 'تربط السرعة الخطية بالسرعة الزاوية عبر نصف القطر r، ويُقاس التردد الزاوي بوحدة rad/s.',
              formula: 'v = ω · r   |   ω = 2πf',
            },
          ],
        },
        {
          id: 'les-voc-ind2',
          title: 'المحاضرة 2: قانون فاراداي في الحث الكهرومغناطيسي',
          duration: '37:30',
          durationSeconds: 2250,
          videoUrl: 'protected://stream/voc6-ind-02',
          description: 'حساب القوة الدافعة الكهربائية المحتثة وتطبيقات المحولة الكهربائية في المنهج الصناعي.',
          order: 2,
          priceIqd: 10000,
          topics: ['الفيض المغناطيسي Φ', 'القوة الدافعة المحتثة', 'كفاءة المحولة الكهربائية'],
          slides: [
            {
              timeSec: 0,
              title: 'قانون فاراداي وكفاءة المحولة',
              body: 'تتناسب القوة الدافعة الكهربائية المحتثة طردياً مع المعدل الزمني لتغير الفيض المغناطيسي وعدد اللفات N.',
              formula: 'E_ind = -N · (ΔΦ / Δt)',
            },
          ],
        },
      ],
      notes: [
        {
          id: 'pdf-voc-ind1',
          title: 'ملزمة الطبيعيات الوزارية — السادس المهني (الفرع الصناعي)',
          pageCount: 2,
          fileUrl: 'protected://pdf/voc6-industrial-physics.pdf',
          updatedAt: '2026-11-23',
          pages: [
            {
              pageNumber: 1,
              sectionTitle: 'السادس المهني (وزاري) · الفرع الصناعي',
              heading: 'الفصل الأول: الحركة الدائرية والدورانية',
              paragraphs: [
                'تأتي مسائل الحركة الدائرية والدورانية بصورة أساسية في الدور الأول والثاني لامتحان السادس المهني الصناعي بواقع 15 إلى 20 درجة.',
              ],
              keyPoints: [
                'تحويل عدد الدورات في الدقيقة (rpm) إلى تردد بالثانية بالقسمة على 60 دائماً.',
                'عزم القصور الذاتي يعتمد على كتلة الجسم وتوزيع الكتلة حول محور الدوران.',
              ],
              exampleBox: {
                label: 'مثال وزاري محلول — السادس الصناعي',
                content: 'محرك كهربائي يدور بمعدل 1200 دورة في الدقيقة، احسب سرعته الزاوية: f = 1200/60 = 20 Hz، إذن ω = 2π(20) = 40π rad/s.',
              },
            },
            {
              pageNumber: 2,
              sectionTitle: 'السادس المهني (وزاري) · الفرع الصناعي',
              heading: 'الفصل الثاني: الحث الكهرومغناطيسي والمحولات',
              paragraphs: [
                'تعمل المحولة الكهربائية على مبدأ الحث المتبادل بين ملفين متجاورين لرفع أو خفض الفولتية المتناوبة.',
              ],
              keyPoints: [
                'نسبة التحويل: N₂ / N₁ = V₂ / V₁.',
                'في المحولة المثالية تكون القدرة الداخلة مساوية للقدرة الخارجة.',
              ],
            },
          ],
        },
      ],
      quizzes: [
        {
          id: 'quiz-voc-ind1',
          title: 'اختبار وزاري — الطبيعيات (السادس الصناعي)',
          timeLimitMinutes: 12,
          questions: [
            {
              id: 'qvi1',
              question: 'إذا دار جسم بمعدل 600 دورة في الدقيقة (rpm)، فما تردده f بوحدة الهرتز (Hz) ؟',
              options: ['60 Hz', '10 Hz', '30 Hz', '100 Hz'],
              correctIndex: 1,
              explanation: 'بقسمة عدد الدورات في الدقيقة على 60: f = 600 ÷ 60 = 10 Hz.',
            },
            {
              id: 'qvi2',
              question: 'تعتمد المحولة الكهربائية في مبدأ عملها على:',
              options: ['الحث الذاتي فقط', 'الحث المتبادل بين ملفين', 'التيار المستمر الثابت', 'الاحتكاك الميكانيكي'],
              correctIndex: 1,
              explanation: 'تعمل المحولة الكهربائية على ظاهرة الحث المتبادل بين الملف الابتدائي والملف الثانوي.',
            },
          ],
        },
      ],
    },
    {
      id: 'crs-voc-comm',
      title: 'السادس المهني — المحاسبة الإدارية والتكاليف (وزاري)',
      subtitle: 'الفرع التجاري — قيود اليومية، الموازنات التخطيطية، ونقطة التعادل',
      track: 'vocational',
      subStage: 'السادس المهني (وزاري)',
      branch: 'التجاري',
      instructor: 'الأستاذة تبارك الأزيرجاوي',
      coverImage: '/src/assets/images/course_vocational_thumb_1795645995253.jpg',
      description:
        'شرح وزاري تطبيقي شامل لمادة المحاسبة الإدارية والتكاليف لطلبة السادس المهني (الفرع التجاري) مع جداول محلولة وتمارين وزارية.',
      totalHours: '30 ساعة مسجلة',
      priceIqd: 45000,
      lessons: [
        {
          id: 'les-voc-c1',
          title: 'المحاضرة 1: تحليل نقطة التعادل وعائد المساهمة (وزاري)',
          duration: '36:00',
          durationSeconds: 2160,
          videoUrl: 'protected://stream/voc-comm-01',
          description: 'إيجاد نقطة التعادل بالوحدات وبالمبالغ وتحليل هامش الأمان في الامتحان الوزاري.',
          order: 1,
          priceIqd: 10000,
          topics: ['التكاليف الثابتة والمتغيرة', 'عائد المساهمة للوحدة', 'نقطة التعادل بالوحدات والمبالغ'],
          slides: [
            {
              timeSec: 0,
              title: 'معادلة نقطة التعادل بالوحدات — السادس التجاري',
              body: 'نقطة التعادل هي حجم المبيعات الذي تتساوى عنده الإيرادات الكلية مع التكاليف الكلية (الربح = صفر).',
              formula: 'نقطة التعادل = التكاليف الثابتة ÷ (سعر البيع - التكلفة المتغيرة)',
            },
          ],
        },
      ],
      notes: [
        {
          id: 'pdf-voc-c1',
          title: 'الملزمة الوزارية — المحاسبة الإدارية (السادس التجاري)',
          pageCount: 2,
          fileUrl: 'protected://pdf/voc6-accounting.pdf',
          updatedAt: '2026-11-22',
          pages: [
            {
              pageNumber: 1,
              sectionTitle: 'السادس المهني (وزاري) · الفرع التجاري',
              heading: 'عائد المساهمة ونقطة التعادل وهامش الأمان',
              paragraphs: [
                'يمثل عائد المساهمة الفرق بين سعر بيع الوحدة والتكلفة المتغيرة للوحدة، ويُستخدم لتغطية التكاليف الثابتة أولاً ثم تحقيق الأرباح.',
              ],
              keyPoints: [
                'عائد المساهمة للوحدة = سعر البيع - التكلفة المتغيرة للوحدة.',
                'نسبة عائد المساهمة = (عائد المساهمة ÷ سعر البيع) × 100%.',
              ],
            },
            {
              pageNumber: 2,
              sectionTitle: 'السادس المهني (وزاري) · الفرع التجاري',
              heading: 'إعداد الموازنات التخطيطية (المبيعات والإنتاج)',
              paragraphs: [
                'تبدأ الموازنات التشغيلية دائماً بموازنة المبيعات ثم تُشتق منها موازنة الإنتاج وموازنة المواد الأولية المباشرة.',
              ],
              keyPoints: [
                'كمية الإنتاج المخطط = المبيعات المخططة + مخزون آخر المدة - مخزون أول المدة.',
              ],
            },
          ],
        },
      ],
      quizzes: [
        {
          id: 'quiz-voc-c1',
          title: 'اختبار وزاري — نقطة التعادل (السادس التجاري)',
          timeLimitMinutes: 10,
          questions: [
            {
              id: 'qvc1',
              question: 'إذا كانت التكاليف الثابتة 400,000 دينار وعائد المساهمة للوحدة 2,000 دينار، فإن نقطة التعادل بالوحدات هي:',
              options: ['100 وحدة', '200 وحدة', '400 وحدة', '250 وحدة'],
              correctIndex: 1,
              explanation: 'بقسمة 400,000 على 2,000 نحصل على 200 وحدة.',
            },
          ],
        },
      ],
    },
    {
      id: 'crs-voc-art',
      title: 'السادس المهني — الفنون التطبيقية وفن الأناقة والتصميم (وزاري)',
      subtitle: 'فرع الفنون التطبيقية — أسس التصميم، الألوان، والتغذية والمنسوجات',
      track: 'vocational',
      subStage: 'السادس المهني (وزاري)',
      branch: 'الفنون التطبيقية',
      instructor: 'الأستاذة تبارك الأزيرجاوي',
      coverImage: '/src/assets/images/course_vocational_thumb_1795645995253.jpg',
      description:
        'مراجعة وزارية متكاملة لطالبات وطلبة السادس المهني (فرع الفنون التطبيقية) مع ملخصات منظمة وأسئلة وزارية نموذجية محلولة.',
      totalHours: '24 ساعة مسجلة',
      priceIqd: 40000,
      lessons: [
        {
          id: 'les-voc-a1',
          title: 'المحاضرة 1: عناصر وأسس التصميم وتناغم الألوان (وزاري)',
          duration: '33:20',
          durationSeconds: 2000,
          videoUrl: 'protected://stream/voc6-art-01',
          description: 'شرح التوازن، الإيقاع، التناسب، ودائرة الألوان الأساسية والثانوية وفق المنهج الوزاري.',
          order: 1,
          priceIqd: 8000,
          topics: ['الخط والشكل والملمس', 'التوازن المتماثل وغير المتماثل', 'توافق الألوان في التصميم الداخلي والأزياء'],
          slides: [
            {
              timeSec: 0,
              title: 'عناصر وأسس التصميم — السادس فنون تطبيقية',
              body: 'يعتمد التصميم الناجح على توظيف الخط واللون والملمس ضمن أسس التوازن والإيقاع والوحدة والسيادة.',
              formula: 'العناصر (خط · لون · ملمس) + الأسس (توازن · إيقاع · وحدة)',
            },
          ],
        },
      ],
      notes: [
        {
          id: 'pdf-voc-a1',
          title: 'الملزمة الوزارية المركّزة — السادس المهني (الفنون التطبيقية)',
          pageCount: 1,
          fileUrl: 'protected://pdf/voc6-applied-arts.pdf',
          updatedAt: '2026-11-23',
          pages: [
            {
              pageNumber: 1,
              sectionTitle: 'السادس المهني (وزاري) · فرع الفنون التطبيقية',
              heading: 'أسس التصميم ونظرية الألوان — ملخص وزاري',
              paragraphs: [
                'تُعد أسس التصميم ونظرية الألوان من المواضيع المحورية التي تتكرر في أسئلة الامتحان الوزاري لفرع الفنون التطبيقية.',
              ],
              keyPoints: [
                'الألوان الأساسية هي: الأحمر، الأصفر، والأزرق، ولا يمكن استخراجها بمزج ألوان أخرى.',
                'التوازن المتماثل يعطي إحساساً بالرسمية والاستقرار في التصميم.',
              ],
            },
          ],
        },
      ],
      quizzes: [
        {
          id: 'quiz-voc-a1',
          title: 'اختبار وزاري — أساسيات التصميم (السادس فنون تطبيقية)',
          timeLimitMinutes: 10,
          questions: [
            {
              id: 'qva1',
              question: 'أي من المجموعات التالية تمثّل الألوان الأساسية في دائرة الألوان؟',
              options: [
                'الأخضر، البرتقالي، البنفسجي',
                'الأحمر، الأصفر، الأزرق',
                'الأبيض، الأسود، الرمادي',
                'الأحمر، الأخضر، البني',
              ],
              correctIndex: 1,
              explanation: 'الألوان الأساسية الثلاثة في نظرية الألوان الصبغية هي الأحمر والأصفر والأزرق.',
            },
          ],
        },
      ],
    },
    {
      id: 'crs-uni-ds',
      title: 'هياكل البيانات والخوارزميات — المرحلة الجامعية',
      subtitle: 'قسم علوم الحاسوب — المكدسات، الطوابير، القوائم المترابطة والأشجار',
      track: 'university',
      subStage: 'المرحلة الثانية',
      instructor: 'الأستاذة تبارك الأزيرجاوي',
      coverImage: '/src/assets/images/course_university_thumb_1795645995228.jpg',
      description:
        'منهج جامعي رصين يشرح هياكل البيانات بلغة ++C وتحليل التعقيد الزمني Big-O مع حلول أسئلة امتحانات الفصل الأول والثاني.',
      totalHours: '42 ساعة مسجلة',
      priceIqd: 60000,
      lessons: [
        {
          id: 'les-uni-1',
          title: 'المحاضرة 1: تحليل التعقيد الزمني Big-O والمصفوفات',
          duration: '48:30',
          durationSeconds: 2910,
          videoUrl: 'protected://stream/uni-ds-01',
          description: 'كيفية حساب كفاءة الخوارزميات في أسوأ حالة والمقارنة بين O(1) و O(log n) و O(n²).',
          order: 1,
          priceIqd: 0,
          topics: ['مفهوم النمو التقاربي', 'البحث الثنائي مقابل الخطي', 'التعقيد المكاني Space Complexity'],
          slides: [
            {
              timeSec: 0,
              title: 'تدرّج التعقيد الزمني للخوارزميات',
              body: 'نحذف الثوابت والحدود الأقل درجة لنحصل على السلوك التقاربي الدقيق للخوارزمية مع زيادة حجم البيانات n.',
              formula: 'O(1) < O(log n) < O(n) < O(n log n) < O(n²)',
            },
          ],
        },
        {
          id: 'les-uni-2',
          title: 'المحاضرة 2: القوائم المترابطة (Linked Lists) والمؤشرات',
          duration: '52:15',
          durationSeconds: 3135,
          videoUrl: 'protected://stream/uni-ds-02',
          description: 'بناء العقد Node والإدراج والحذف في بداية ووسط القائمة المترابطة المفردة والمزدوجة.',
          order: 2,
          priceIqd: 15000,
          topics: ['تمثيل العقدة في الذاكرة', 'الإدراج في O(1)', 'عكس القائمة المترابطة'],
          slides: [
            {
              timeSec: 0,
              title: 'بنية العقدة في القائمة المترابطة',
              body: 'تتكون كل عقدة من حقل البيانات (Data) ومؤشر يشير إلى عنوان العقدة التالية (Next Pointer).',
              formula: 'Node { data: T, next: Node* }',
            },
          ],
        },
      ],
      notes: [
        {
          id: 'pdf-uni-1',
          title: 'ملزمة هياكل البيانات — الكورس الأول (جامعة بغداد / التكنولوجية)',
          pageCount: 2,
          fileUrl: 'protected://pdf/uni-ds-ch1.pdf',
          updatedAt: '2026-11-20',
          pages: [
            {
              pageNumber: 1,
              sectionTitle: 'هياكل البيانات · المحاضرة الأولى',
              heading: 'التحليل التقاربي للخوارزميات (Asymptotic Analysis)',
              paragraphs: [
                'لا يُقاس أداء الخوارزمية بالثواني لأن ذلك يعتمد على سرعة المعالج، بل يُقاس بعدد العمليات الأساسية كدالة في حجم المدخلات n.',
              ],
              keyPoints: [
                'الوصول العشوائي لعنصر في المصفوفة يستغرق O(1).',
                'البحث الثنائي يتطلب مصفوفة مرتبة ويستغرق O(log n).',
                'الحلقات المتداخلة المزدوجة على نفس المدخل تعطي تعقيداً O(n²).',
              ],
            },
            {
              pageNumber: 2,
              sectionTitle: 'هياكل البيانات · المحاضرة الثانية',
              heading: 'المكدس (Stack) والطابور (Queue)',
              paragraphs: [
                'يعمل المكدس بمبدأ الداخل أخيراً يخرج أولاً (LIFO)، بينما يعمل الطابور بمبدأ الداخل أولاً يخرج أولاً (FIFO).',
              ],
              keyPoints: [
                'عمليتا Push و Pop في المكدس تستغرقان O(1).',
                'يُستخدم المكدس في تقييم التعابير الرياضية وتتبع استدعاءات الدوال.',
              ],
            },
          ],
        },
      ],
      quizzes: [
        {
          id: 'quiz-uni-1',
          title: 'اختبار الكورس الأول — هياكل البيانات',
          timeLimitMinutes: 15,
          questions: [
            {
              id: 'qu1',
              question: 'ما هو التعقيد الزمني لخوارزمية البحث الثنائي (Binary Search) في أسوأ حالة؟',
              options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
              correctIndex: 1,
              explanation: 'يقسم البحث الثنائي مجال البحث إلى النصف في كل خطوة، لذا فتعقيده O(log n).',
            },
            {
              id: 'qu2',
              question: 'أي هيكل بيانات يتبع مبدأ الداخل أخيراً يخرج أولاً (LIFO) ؟',
              options: ['Queue', 'Stack', 'Linked List', 'Binary Tree'],
              correctIndex: 1,
              explanation: 'المكدس (Stack) يضيف ويزيل العناصر من نفس الطرف (Top) وفق مبدأ LIFO.',
            },
          ],
        },
      ],
    },
    {
      id: 'crs-uni-stat',
      title: 'مبادئ الإحصاء والاحتمالات — المرحلة الجامعية',
      subtitle: 'الإحصاء الوصفي، التوزيع الطبيعي، واختبار الفرضيات للأقسام العلمية والإدارية',
      track: 'university',
      subStage: 'المرحلة الأولى',
      instructor: 'الأستاذة تبارك الأزيرجاوي',
      coverImage: '/src/assets/images/course_university_thumb_1795645995228.jpg',
      description:
        'شرح مبسّط لمقاييس النزعة المركزية والتشتت والارتباط والانحدار الخطي مع أمثلة امتحانية محلولة.',
      totalHours: '26 ساعة مسجلة',
      priceIqd: 45000,
      lessons: [
        {
          id: 'les-uni-s1',
          title: 'المحاضرة 1: مقاييس النزعة المركزية والانحراف المعياري',
          duration: '37:10',
          durationSeconds: 2230,
          videoUrl: 'protected://stream/uni-stat-01',
          description: 'حساب الوسط الحسابي والوسيط والمنوال والتباين للبيانات المبوبة وغير المبوبة.',
          order: 1,
          priceIqd: 10000,
          topics: ['الوسط الحسابي الموزون', 'التباين والانحراف المعياري', 'معامل الاختلاف'],
          slides: [
            {
              timeSec: 0,
              title: 'قانون التباين والانحراف المعياري للعينة',
              body: 'يقيس الانحراف المعياري مدى تشتت القيم وتباعدها عن وسطها الحسابي.',
              formula: 's = √[ Σ(xᵢ - x̄)² / (n - 1) ]',
            },
          ],
        },
      ],
      notes: [
        {
          id: 'pdf-uni-s1',
          title: 'ملخص قوانين الإحصاء الجامعي',
          pageCount: 1,
          fileUrl: 'protected://pdf/uni-stat.pdf',
          updatedAt: '2026-11-19',
          pages: [
            {
              pageNumber: 1,
              sectionTitle: 'الإحصاء الجامعي · الفصل الأول',
              heading: 'مقاييس التشتت والارتباط',
              paragraphs: [
                'كلما اقتربت قيمة معامل الارتباط بيرسون من +1 أو -1 دلّ ذلك على علاقة خطية قوية بين المتغيرين.',
              ],
              keyPoints: [
                'معامل الارتباط r ينحصر دائماً بين -1 و +1.',
                'التباين يساوي مربع الانحراف المعياري دائماً.',
              ],
            },
          ],
        },
      ],
      quizzes: [
        {
          id: 'quiz-uni-s1',
          title: 'اختبار مبادئ الإحصاء',
          timeLimitMinutes: 10,
          questions: [
            {
              id: 'qus1',
              question: 'إذا كان التباين لمجموعة من البيانات يساوي 25، فما قيمة الانحراف المعياري؟',
              options: ['625', '12.5', '5', '25'],
              correctIndex: 2,
              explanation: 'الانحراف المعياري هو الجذر التربيعي الموجب للتباين: √25 = 5.',
            },
          ],
        },
      ],
    },
  ];

  const activationCodes: ActivationCode[] = [
    {
      id: 'code-1',
      code: 'TAB-INT-8842-M3',
      courseId: 'crs-int-eng',
      targetType: 'course',
      priceIqd: 35000,
      track: 'intermediate',
      createdAt: '2026-11-18',
      isUsed: false,
    },
    {
      id: 'code-2',
      code: 'TAB-INT-5519-M3',
      courseId: 'crs-int-math3',
      targetType: 'course',
      priceIqd: 50000,
      track: 'intermediate',
      createdAt: '2026-11-12',
      isUsed: true,
      usedByStudentId: 'stu-zainab',
      usedByStudentName: 'زينب حيدر الموسوي',
      usedByPhone: '07712345678',
      usedAt: '2026-11-14',
    },
    {
      id: 'code-3',
      code: 'TAB-VOC-7310-CM',
      courseId: 'crs-voc-comm',
      targetType: 'course',
      priceIqd: 45000,
      track: 'vocational',
      createdAt: '2026-11-19',
      isUsed: false,
    },
    {
      id: 'code-7',
      code: 'TAB-VOC-9204-AR',
      courseId: 'crs-voc-art',
      targetType: 'course',
      priceIqd: 40000,
      track: 'vocational',
      createdAt: '2026-11-23',
      isUsed: false,
    },
    {
      id: 'code-8',
      code: 'TAB-VOC-3318-L2',
      courseId: 'crs-voc-comm',
      targetType: 'lesson',
      lessonId: 'les-voc-c1',
      lessonTitle: 'المحاضرة 1: تحليل نقطة التعادل وعائد المساهمة (وزاري)',
      priceIqd: 10000,
      track: 'vocational',
      createdAt: '2026-11-24',
      isUsed: false,
    },
    {
      id: 'code-4',
      code: 'TAB-VOC-4091-IT',
      courseId: 'crs-voc-it',
      targetType: 'course',
      priceIqd: 60000,
      track: 'vocational',
      createdAt: '2026-11-15',
      isUsed: true,
      usedByStudentId: 'stu-mustafa',
      usedByStudentName: 'مصطفى علي الجبوري',
      usedByPhone: '07809876543',
      usedAt: '2026-11-16',
    },
    {
      id: 'code-5',
      code: 'TAB-UNI-6120-ST',
      courseId: 'crs-uni-stat',
      targetType: 'course',
      priceIqd: 45000,
      track: 'university',
      createdAt: '2026-11-21',
      isUsed: false,
    },
    {
      id: 'code-6',
      code: 'TAB-UNI-2945-DS',
      courseId: 'crs-uni-ds',
      targetType: 'course',
      priceIqd: 60000,
      track: 'university',
      createdAt: '2026-11-17',
      isUsed: true,
      usedByStudentId: 'stu-noor',
      usedByStudentName: 'نور الهدى كريم الساعدي',
      usedByPhone: '07723456789',
      usedAt: '2026-11-17',
    },
  ];

  const quizAttempts: QuizAttempt[] = [
    // Leaderboard seed for Sixth Vocational Ministerial Quiz (quiz-voc-1)
    {
      id: 'att-voc-1',
      quizId: 'quiz-voc-1',
      courseId: 'crs-voc-it',
      studentId: 'stu-seed-1',
      studentName: 'علي حسين كريم المالكي',
      studentPhone: '07714455661',
      track: 'vocational',
      subStage: 'السادس المهني (وزاري)',
      score: 5,
      total: 5,
      percentage: 100,
      timeSpentSeconds: 142,
      completedAt: '2026-11-25 11:20',
      autoSubmitted: false,
    },
    {
      id: 'att-voc-2',
      quizId: 'quiz-voc-1',
      courseId: 'crs-voc-it',
      studentId: 'stu-fatima',
      studentName: 'فاطمة محمد الخفاجي',
      studentPhone: '07815544332',
      track: 'vocational',
      subStage: 'السادس المهني (وزاري)',
      score: 5,
      total: 5,
      percentage: 100,
      timeSpentSeconds: 178,
      completedAt: '2026-11-25 11:45',
      autoSubmitted: false,
    },
    {
      id: 'att-voc-3',
      quizId: 'quiz-voc-1',
      courseId: 'crs-voc-it',
      studentId: 'stu-zahraa-art6',
      studentName: 'زهراء قاسم الزبيدي',
      studentPhone: '07827766554',
      track: 'vocational',
      subStage: 'السادس المهني (وزاري)',
      score: 4,
      total: 5,
      percentage: 80,
      timeSpentSeconds: 165,
      completedAt: '2026-11-25 12:10',
      autoSubmitted: false,
    },
    {
      id: 'att-voc-4',
      quizId: 'quiz-voc-1',
      courseId: 'crs-voc-it',
      studentId: 'stu-ahmad-voc5',
      studentName: 'أحمد ستار العبودي',
      studentPhone: '07741122334',
      track: 'vocational',
      subStage: 'الخامس المهني',
      score: 4,
      total: 5,
      percentage: 80,
      timeSpentSeconds: 230,
      completedAt: '2026-11-25 12:30',
      autoSubmitted: false,
    },
    {
      id: 'att-voc-5',
      quizId: 'quiz-voc-1',
      courseId: 'crs-voc-it',
      studentId: 'stu-seed-2',
      studentName: 'حيدر علاء الشمري',
      studentPhone: '07803322119',
      track: 'vocational',
      subStage: 'السادس المهني (وزاري)',
      score: 3,
      total: 5,
      percentage: 60,
      timeSpentSeconds: 300,
      completedAt: '2026-11-25 13:05',
      autoSubmitted: true,
    },
    // Leaderboard seed for Intermediate Math Quiz (quiz-int-1)
    {
      id: 'att-int-1',
      quizId: 'quiz-int-1',
      courseId: 'crs-int-math3',
      studentId: 'stu-seed-3',
      studentName: 'مريم صادق العزاوي',
      studentPhone: '07718845120',
      track: 'intermediate',
      subStage: 'الثالث متوسط',
      score: 4,
      total: 4,
      percentage: 100,
      timeSpentSeconds: 215,
      completedAt: '2026-11-24 16:40',
      autoSubmitted: false,
    },
    {
      id: 'att-int-2',
      quizId: 'quiz-int-1',
      courseId: 'crs-int-math3',
      studentId: 'stu-seed-4',
      studentName: 'يوسف حيدر المالكي',
      studentPhone: '07804421980',
      track: 'intermediate',
      subStage: 'الثالث متوسط',
      score: 4,
      total: 4,
      percentage: 100,
      timeSpentSeconds: 268,
      completedAt: '2026-11-24 17:15',
      autoSubmitted: false,
    },
    {
      id: 'att-int-3',
      quizId: 'quiz-int-1',
      courseId: 'crs-int-math3',
      studentId: 'stu-seed-5',
      studentName: 'سارة أحمد التميمي',
      studentPhone: '07729104431',
      track: 'intermediate',
      subStage: 'الثالث متوسط',
      score: 3,
      total: 4,
      percentage: 75,
      timeSpentSeconds: 310,
      completedAt: '2026-11-24 18:00',
      autoSubmitted: false,
    },
    // Leaderboard seed for University Data Structures Quiz (quiz-uni-1)
    {
      id: 'att-uni-1',
      quizId: 'quiz-uni-1',
      courseId: 'crs-uni-ds',
      studentId: 'stu-seed-6',
      studentName: 'عبدالله كريم الدليمي',
      studentPhone: '07731109284',
      track: 'university',
      subStage: 'المرحلة الثانية',
      score: 2,
      total: 2,
      percentage: 100,
      timeSpentSeconds: 95,
      completedAt: '2026-11-24 20:10',
      autoSubmitted: false,
    },
    {
      id: 'att-uni-2',
      quizId: 'quiz-uni-1',
      courseId: 'crs-uni-ds',
      studentId: 'stu-seed-7',
      studentName: 'تبارك سعد الجبوري',
      studentPhone: '07708812345',
      track: 'university',
      subStage: 'المرحلة الثانية',
      score: 1,
      total: 2,
      percentage: 50,
      timeSpentSeconds: 184,
      completedAt: '2026-11-24 20:45',
      autoSubmitted: false,
    },
  ];

  const todayStr = getRelativeDateISO(0);
  const tomorrowStr = getRelativeDateISO(1);
  const inThreeDaysStr = getRelativeDateISO(3);

  const assignments: DailyAssignment[] = [
    {
      id: 'asg-voc6-today',
      title: 'تحضير الفصل الأول (وزاري) — نموذج OSI وتقسيم الشبكات (ص 15 إلى 22)',
      details:
        'يرجى مراجعة طبقات نموذج OSI السبع والتركيز على المقارنة الوزارية بين المبدّل (Switch) والموجّه (Router)، وحل تمارين تقسيم عناوين IPv4 الموجودة في الملزمة الذهبية قبل المحاضرة المباشرة.',
      audience: 'vocational6',
      track: 'vocational',
      branch: 'جميع الفروع',
      courseId: 'crs-voc-it',
      courseTitle: 'السادس المهني — شبكات الحاسوب وصيانة الأنظمة (وزاري)',
      dueDate: todayStr,
      priority: 'urgent',
      createdAt: `${todayStr} 09:00`,
    },
    {
      id: 'asg-voc6-tomorrow',
      title: 'واجب الطبيعيات الوزاري — مسائل الحركة الدائرية والدورانية (ص 24 إلى 29)',
      details:
        'حل المسائل الثلاث الأولى في نهاية الفصل الأول مع كتابة التحويل من rpm إلى هرتز خطوة بخطوة، وسيتم مناقشة الحلول النموذجية في المحاضرة القادمة.',
      audience: 'vocational6',
      track: 'vocational',
      branch: 'جميع الفروع',
      courseId: 'crs-voc-ind',
      courseTitle: 'السادس المهني — الطبيعيات والرياضيات الصناعية (وزاري)',
      dueDate: tomorrowStr,
      priority: 'normal',
      createdAt: `${todayStr} 10:15`,
    },
    {
      id: 'asg-int-today',
      title: 'تحضير الفصل الأول — ترتيب العمليات في الأعداد الحقيقية (ص 10 إلى 16)',
      details:
        'مراجعة خصائص الجذور التربيعية وتنسيب المقام بالمرافق، وحل أسئلة تأكد من فهمك رقم (1، 3، 5، 7) مع الاستعداد لاختبار سريع بداية الدرس.',
      audience: 'intermediate',
      track: 'intermediate',
      courseId: 'crs-int-math3',
      courseTitle: 'الرياضيات المتكاملة — الثالث متوسط',
      dueDate: todayStr,
      priority: 'urgent',
      createdAt: `${todayStr} 09:30`,
    },
    {
      id: 'asg-int-upcoming',
      title: 'تحضير قواعد الوحدة الأولى + كتابة إنشاء وصف صديق',
      details:
        'مراجعة قاعدة There is / There are وحالات النفي والاستفهام، وكتابة نموذج إنشاء وصف الصديق في الدفتر مع مراعاة علامات التنقيط.',
      audience: 'intermediate',
      track: 'intermediate',
      courseId: 'crs-int-eng',
      courseTitle: 'قواعد اللغة الإنجليزية والإنشاء — المرحلة المتوسطة',
      dueDate: inThreeDaysStr,
      priority: 'normal',
      createdAt: `${todayStr} 11:00`,
    },
    {
      id: 'asg-uni-today',
      title: 'واجب هياكل البيانات — تحليل التعقيد الزمني Big-O (ص 8 إلى 14)',
      details:
        'إيجاد التعقيد الزمني في أسوأ حالة للخوارزميات الخمس المرفقة في الملزمة والمقارنة بين البحث الخطي والبحث الثنائي.',
      audience: 'university',
      track: 'university',
      courseId: 'crs-uni-ds',
      courseTitle: 'هياكل البيانات والخوارزميات — المرحلة الجامعية',
      dueDate: todayStr,
      priority: 'urgent',
      createdAt: `${todayStr} 09:45`,
    },
  ];

  const storeItems: StoreItem[] = [
    {
      id: 'item-voc6-cs',
      title: 'مرشحات آخر السنة الذهبية — الحاسوب والشبكات (السادس المهني)',
      subject: 'الحاسوب وتقنية المعلومات',
      track: 'vocational',
      subStage: 'السادس المهني (وزاري)',
      branch: 'الحاسوب وتقنية المعلومات',
      category: 'predictions',
      description:
        'مرشحات وزارية مركّزة لطلبة السادس المهني (فرع الحاسوب وتقنية المعلومات) تضم أهم الأسئلة المكررة، مخططات الشبكات، قواعد البيانات، وحلول الدور الأول والثاني للأعوام السابقة.',
      priceIqd: 15000,
      coverImage: '/src/assets/images/store_booklet_vocational_1795653125600.jpg',
      pagesInfo: '96 صفحة · طباعة ليزرية ملونة فاخرة',
      inStock: true,
      createdAt: todayStr,
    },
    {
      id: 'item-int3-math',
      title: 'ملزمة ومرشحات الرياضيات الوزارية الشاملة — الثالث متوسط',
      subject: 'الرياضيات',
      track: 'intermediate',
      subStage: 'الثالث متوسط',
      category: 'booklet',
      description:
        'ملزمة ورقية شاملة للجزأين الأول والثاني مع مرشحات آخر السنة والتمارين الوزارية المحلولة خطوة بخطوة بطريقة مبسطة تضمن الدرجة الكاملة.',
      priceIqd: 12000,
      coverImage: '/src/assets/images/store_booklet_intermediate_1795653126278.jpg',
      pagesInfo: '148 صفحة · ورق أبيض سميك وتجليد حراري',
      inStock: true,
      createdAt: todayStr,
    },
    {
      id: 'item-uni-ds',
      title: 'ملزمة هياكل البيانات والخوارزميات العملية — الكلية',
      subject: 'هياكل البيانات والخوارزميات',
      track: 'university',
      subStage: 'المرحلة الثانية',
      branch: 'علوم الحاسوب',
      category: 'booklet',
      description:
        'مرجع جامعي مطبوع يشرح المكدس، الطابور، القوائم المرتبطة، والأشجار الثنائية مع أمثلة برمجية مشروحة وأسئلة امتحانات نهاية الكورس.',
      priceIqd: 18000,
      coverImage: '/src/assets/images/store_booklet_university_1795653126024.jpg',
      pagesInfo: '124 صفحة · طباعة واضحة ومخططات ملونة',
      inStock: true,
      createdAt: todayStr,
    },
  ];

  const storeOrders: StoreOrder[] = [
    {
      id: 'ord-demo-1',
      receiptNumber: 'TB-2026-1041',
      itemId: 'item-voc6-cs',
      itemTitle: 'مرشحات آخر السنة الذهبية — الحاسوب والشبكات (السادس المهني)',
      subject: 'الحاسوب وتقنية المعلومات',
      trackLabel: 'الإعدادية المهنية',
      subStage: 'السادس المهني (وزاري) · الحاسوب وتقنية المعلومات',
      studentId: 'stu-mustafa',
      studentName: 'مصطفى علي الجبوري',
      phone: '07809876543',
      governorate: 'بغداد',
      address: 'الكرادة داخل — قرب ساحة كهرمانة، شارع 14',
      quantity: 1,
      unitPriceIqd: 15000,
      deliveryFeeIqd: DEFAULT_STORE_DELIVERY_SETTINGS.baghdadFeeIqd,
      totalIqd: 15000 + DEFAULT_STORE_DELIVERY_SETTINGS.baghdadFeeIqd,
      status: 'preparing',
      createdAt: `${todayStr} 10:30`,
    },
  ];

  return {
    tracks: cloneDefaultTracks(),
    users,
    courses,
    activationCodes,
    quizAttempts,
    watchedLessons: {
      'stu-zainab': ['les-int-1'],
      'stu-mustafa': ['les-voc-1'],
      'stu-noor': ['les-uni-1'],
    },
    assignments,
    completedAssignments: {},
    readAssignmentNotifications: {},
    liveQuizResults: [],
    paymentSettings: { ...DEFAULT_PAYMENT_SETTINGS },
    renewalRequests: [
      {
        id: 'ren-demo-1',
        studentId: 'stu-grace-demo',
        studentName: 'مهدي كاظم الموسوي',
        studentPhone: '07751234567',
        trackLabel: 'الإعدادية المهنية',
        subStage: 'السادس المهني (وزاري) · التجاري',
        amountIqd: DEFAULT_PAYMENT_SETTINGS.monthlyFeeIqd,
        receiptImageDataUrl: DEMO_RECEIPT_SVG_DATA_URL,
        receiptFileName: 'mastercard-transfer-50000.png',
        note: 'تم التحويل من بطاقة سوبر كي — يرجى تجديد اشتراك الشهر القادم.',
        status: 'pending',
        submittedAt: `${getRelativeDateISO(0)} 11:25`,
      },
    ],
    storeItems,
    storeDeliverySettings: { ...DEFAULT_STORE_DELIVERY_SETTINGS },
    storeOrders,
    teacherCV: {
      ...DEFAULT_TEACHER_CV,
      subjectsTaught: [...DEFAULT_TEACHER_CV.subjectsTaught],
      achievements: [...DEFAULT_TEACHER_CV.achievements],
    },
    complaints: [
      {
        id: 'cmp-demo-1',
        studentId: 'stu-mustafa',
        studentName: 'مصطفى علي الجبوري',
        studentPhone: '07809876543',
        trackLabel: 'الإعدادية المهنية',
        subStage: 'السادس المهني (وزاري) · الحاسوب وتقنية المعلومات',
        category: 'lecture',
        details:
          'الأستاذة الفاضلة، في المحاضرة الثانية من شبكات الحاسوب تقطع الصوت لثوانٍ بسيطة عند الدقيقة 18 أثناء شرح مثال Subnetting، أرجو التأكد من جودة المقطع.',
        isPrivateToAdmin: false,
        status: 'resolved',
        adminReply:
          'شكراً لملاحظتك الدقيقة يا مصطفى، تمت إعادة معالجة الصوت ورفع النسخة المحسّنة للمحاضرة الثانية ويمكنك الآن مشاهدتها بوضوح كامل.',
        repliedAt: `${todayStr} 12:15`,
        isReplyReadByStudent: false,
        createdAt: `${getRelativeDateISO(-1)} 19:40`,
      },
      {
        id: 'cmp-demo-2',
        studentId: 'stu-zainab',
        studentName: 'زينب حيدر الموسوي',
        studentPhone: '07712345678',
        trackLabel: 'المرحلة المتوسطة',
        subStage: 'الثالث متوسط',
        category: 'technical',
        details:
          'عند فتح الملزمة من الهاتف في وضع القراءة، أتمنى إضافة تكبير بسيط لأمثلة الفصل الأول حتى تكون أوضح على الشاشات الصغيرة.',
        isPrivateToAdmin: true,
        status: 'pending',
        isReplyReadByStudent: true,
        createdAt: `${todayStr} 10:05`,
      },
    ],
    inquiries: [
      {
        id: 'inq-demo-1',
        studentId: 'stu-mustafa',
        studentName: 'مصطفى علي الجبوري',
        studentPhone: '07809876543',
        trackLabel: 'الإعدادية المهنية',
        subStage: 'السادس المهني (وزاري) · الحاسوب وتقنية المعلومات',
        title: 'الفرق بين بروتوكول TCP و UDP في الامتحان الوزاري',
        details:
          'أستاذة، هل يُطلب في الامتحان الوزاري للسادس المهني ذكر المقارنة كاملة بنقاطها الخمس أم تكفي ثلاث نقاط أساسية مع مثال لكل بروتوكول؟',
        status: 'answered',
        adminReply:
          'أهلاً مصطفى، للحصول على الدرجة الكاملة (10/10) يُفضّل كتابة 4 نقاط مقارنة واضحة (الموثوقية، السرعة، الترتيب، وحجم الترويسة) مع مثال عملي مثل HTTP لـ TCP والبث المباشر لـ UDP.',
        repliedAt: `${todayStr} 13:20`,
        isReplyReadByStudent: false,
        createdAt: `${todayStr} 11:10`,
      },
      {
        id: 'inq-demo-2',
        studentId: 'stu-noor',
        studentName: 'نور الهدى كريم الساعدي',
        studentPhone: '07723456789',
        trackLabel: 'الكلية',
        subStage: 'المرحلة الثانية · علوم الحاسوب',
        title: 'موعد محاضرة الأشجار الثنائية (Binary Trees)',
        details:
          'السلام عليكم أستاذة، متى موعد نزول المحاضرة المسجلة الخاصة بخوارزميات البحث في الأشجار الثنائية وهل ستكون هناك مراجعة مباشرة قبل امتحان الفصل؟',
        status: 'pending',
        isReplyReadByStudent: true,
        createdAt: `${todayStr} 14:05`,
      },
    ],
    weeklySchedule: [
      {
        id: 'ws-voc-sat',
        dayOfWeek: 'السبت',
        timeLabel: '08:00 مساءً',
        track: 'vocational',
        subStage: 'السادس المهني (وزاري)',
        branch: 'الحاسوب وتقنية المعلومات',
        subject: 'شبكات الحاسوب',
        note: 'شرح طبقة الشبكة وعناوين IPv4 مع حل نماذج وزارية مباشرة',
        createdAt: todayStr,
      },
      {
        id: 'ws-voc-mon',
        dayOfWeek: 'الإثنين',
        timeLabel: '08:30 مساءً',
        track: 'vocational',
        subStage: 'السادس المهني (وزاري)',
        branch: 'جميع الفروع',
        subject: 'الطبيعيات',
        note: 'مراجعة الفصل الثاني والثالث + كوز سريع في نهاية البث',
        createdAt: todayStr,
      },
      {
        id: 'ws-voc-wed',
        dayOfWeek: 'الأربعاء',
        timeLabel: '07:30 مساءً',
        track: 'vocational',
        subStage: 'السادس المهني (وزاري)',
        branch: 'الحاسوب وتقنية المعلومات',
        subject: 'صيانة الحاسوب',
        note: 'الأعطال العملية والمخططات الوزارية المهمة',
        createdAt: todayStr,
      },
      {
        id: 'ws-voc-comm-tue',
        dayOfWeek: 'الثلاثاء',
        timeLabel: '07:00 مساءً',
        track: 'vocational',
        subStage: 'السادس المهني (وزاري)',
        branch: 'التجاري',
        subject: 'المحاسبة الإدارية',
        note: 'تمارين الموازنة التخطيطية ونقطة التعادل',
        createdAt: todayStr,
      },
      {
        id: 'ws-int-sun',
        dayOfWeek: 'الأحد',
        timeLabel: '06:00 مساءً',
        track: 'intermediate',
        subStage: 'الثالث متوسط',
        subject: 'الرياضيات',
        note: 'حل مسائل الفصل الأول (التطبيقات والمتتابعات الحسابية)',
        createdAt: todayStr,
      },
      {
        id: 'ws-int-thu',
        dayOfWeek: 'الخميس',
        timeLabel: '06:30 مساءً',
        track: 'intermediate',
        subStage: 'الثالث متوسط',
        subject: 'الفيزياء',
        note: 'مراجعة الكهربائية الساكنة وقانون كولوم بالخطوات',
        createdAt: todayStr,
      },
      {
        id: 'ws-uni-tue',
        dayOfWeek: 'الثلاثاء',
        timeLabel: '09:00 مساءً',
        track: 'university',
        subStage: 'المرحلة الثانية',
        branch: 'علوم الحاسوب',
        subject: 'هياكل البيانات',
        note: 'تطبيق عملي على الأشجار الثنائية والخوارزميات المتقدمة',
        createdAt: todayStr,
      },
      {
        id: 'ws-uni-thu',
        dayOfWeek: 'الخميس',
        timeLabel: '08:30 مساءً',
        track: 'university',
        subStage: 'جميع الصفوف',
        branch: 'الجميع',
        subject: 'الإحصاء التطبيقي',
        note: 'جلسة أسئلة ومراجعة قبل امتحانات الفصل',
        createdAt: todayStr,
      },
    ],
    attendanceRecords: [
      {
        id: 'att-m-1',
        studentId: 'stu-mustafa',
        source: 'live_broadcast',
        sessionKey: 'live-2026-11-18',
        title: 'بث مباشر: شبكات الحاسوب — الفصل الثاني',
        dateISO: getRelativeDateISO(-7),
        timestamp: '20:05',
      },
      {
        id: 'att-m-2',
        studentId: 'stu-mustafa',
        source: 'live_broadcast',
        sessionKey: 'live-2026-11-20',
        title: 'بث مباشر: مراجعة الطبيعيات للسادس المهني',
        dateISO: getRelativeDateISO(-5),
        timestamp: '20:32',
      },
      {
        id: 'att-m-3',
        studentId: 'stu-mustafa',
        source: 'course_quiz',
        sessionKey: 'quiz-voc-1',
        title: 'كوز شبكات الحاسوب (نموذج OSI)',
        dateISO: getRelativeDateISO(-3),
        timestamp: '18:15',
      },
      {
        id: 'att-m-4',
        studentId: 'stu-mustafa',
        source: 'live_quiz_chat',
        sessionKey: 'lqr-demo-1',
        title: 'محادثة كوز مباشر: السادس المهني',
        dateISO: getRelativeDateISO(-2),
        timestamp: '21:10',
      },
      {
        id: 'att-m-5',
        studentId: 'stu-mustafa',
        source: 'live_broadcast',
        sessionKey: 'live-2026-11-24',
        title: 'بث مباشر: حل أسئلة وزارية شاملة',
        dateISO: getRelativeDateISO(-1),
        timestamp: '20:02',
      },
      {
        id: 'att-m-6',
        studentId: 'stu-mustafa',
        source: 'course_quiz',
        sessionKey: 'quiz-voc-ind-1',
        title: 'كوز الطبيعيات التفاعلي',
        dateISO: todayStr,
        timestamp: '12:00',
      },
      {
        id: 'att-z-1',
        studentId: 'stu-zainab',
        source: 'live_broadcast',
        sessionKey: 'live-int-1',
        title: 'بث مباشر: رياضيات الثالث متوسط',
        dateISO: getRelativeDateISO(-6),
        timestamp: '18:04',
      },
      {
        id: 'att-z-2',
        studentId: 'stu-zainab',
        source: 'live_broadcast',
        sessionKey: 'live-int-2',
        title: 'بث مباشر: حل تمارين المتتابعات',
        dateISO: getRelativeDateISO(-3),
        timestamp: '18:01',
      },
      {
        id: 'att-z-3',
        studentId: 'stu-zainab',
        source: 'course_quiz',
        sessionKey: 'quiz-int-1',
        title: 'كوز رياضيات الثالث متوسط (الفصل الأول)',
        dateISO: getRelativeDateISO(-2),
        timestamp: '17:20',
      },
      {
        id: 'att-z-4',
        studentId: 'stu-zainab',
        source: 'live_broadcast',
        sessionKey: 'live-int-3',
        title: 'بث مباشر: مراجعة شاملة قبل الامتحان الشهري',
        dateISO: getRelativeDateISO(-1),
        timestamp: '18:00',
      },
      {
        id: 'att-z-5',
        studentId: 'stu-zainab',
        source: 'live_quiz_chat',
        sessionKey: 'lqr-int-1',
        title: 'محادثة كوز مباشر: الثالث متوسط',
        dateISO: todayStr,
        timestamp: '13:30',
      },
      {
        id: 'att-g-1',
        studentId: 'stu-grace-demo',
        source: 'live_broadcast',
        sessionKey: 'live-comm-1',
        title: 'بث مباشر: المحاسبة الإدارية',
        dateISO: getRelativeDateISO(-4),
        timestamp: '19:10',
      },
      {
        id: 'att-g-2',
        studentId: 'stu-grace-demo',
        source: 'course_quiz',
        sessionKey: 'quiz-comm-1',
        title: 'كوز المحاسبة الإدارية السريع',
        dateISO: getRelativeDateISO(-2),
        timestamp: '20:15',
      },
      {
        id: 'att-n-1',
        studentId: 'stu-noor',
        source: 'live_broadcast',
        sessionKey: 'live-uni-1',
        title: 'بث مباشر: هياكل البيانات والخوارزميات',
        dateISO: getRelativeDateISO(-5),
        timestamp: '21:00',
      },
      {
        id: 'att-n-2',
        studentId: 'stu-noor',
        source: 'course_quiz',
        sessionKey: 'quiz-uni-1',
        title: 'كوز هياكل البيانات',
        dateISO: getRelativeDateISO(-2),
        timestamp: '19:40',
      },
      {
        id: 'att-f-1',
        studentId: 'stu-fatima',
        source: 'live_broadcast',
        sessionKey: 'live-comm-1',
        title: 'بث مباشر: المحاسبة الإدارية',
        dateISO: getRelativeDateISO(-4),
        timestamp: '19:02',
      },
      {
        id: 'att-f-2',
        studentId: 'stu-fatima',
        source: 'live_quiz_chat',
        sessionKey: 'lqr-demo-1',
        title: 'محادثة كوز مباشر: السادس المهني',
        dateISO: getRelativeDateISO(-2),
        timestamp: '21:10',
      },
    ],
    breakingAnnouncement: {
      ...DEFAULT_BREAKING_ANNOUNCEMENT,
      updatedAt: `${todayStr} 14:30`,
    },
  };
}

export function loadDatabase(): PlatformDatabase {
  if (typeof window === 'undefined') {
    return buildInitialDatabase();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = buildInitialDatabase();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw) as PlatformDatabase;
    const defaults = buildInitialDatabase();
    const migratedUsers = (parsed.users ?? defaults.users).map((u) =>
      u.id === 'admin-tabarak'
        ? {
            ...u,
            phone: '07848333046',
            username: 'tabarak',
            password: '',
            role: 'admin' as const,
            isSuperAdmin: true,
            isActive: true,
            adminRoleTitle: u.adminRoleTitle || 'السوبر أدمن — صاحبة المنصة',
          }
        : u
    );
    return {
      ...parsed,
      users: migratedUsers,
      tracks: parsed.tracks && parsed.tracks.length > 0 ? parsed.tracks : cloneDefaultTracks(),
      liveQuizResults: parsed.liveQuizResults ?? [],
      paymentSettings: parsed.paymentSettings ?? { ...DEFAULT_PAYMENT_SETTINGS },
      renewalRequests: parsed.renewalRequests ?? [],
      storeItems: parsed.storeItems ?? [],
      storeDeliverySettings: parsed.storeDeliverySettings ?? {
        ...DEFAULT_STORE_DELIVERY_SETTINGS,
      },
      storeOrders: parsed.storeOrders ?? [],
      teacherCV: parsed.teacherCV ?? {
        ...DEFAULT_TEACHER_CV,
        subjectsTaught: [...DEFAULT_TEACHER_CV.subjectsTaught],
        achievements: [...DEFAULT_TEACHER_CV.achievements],
      },
      complaints: parsed.complaints ?? [],
      inquiries: parsed.inquiries ?? [],
      weeklySchedule: parsed.weeklySchedule ?? defaults.weeklySchedule,
      attendanceRecords: parsed.attendanceRecords ?? defaults.attendanceRecords,
      breakingAnnouncement: parsed.breakingAnnouncement ?? defaults.breakingAnnouncement,
    };
  } catch {
    return buildInitialDatabase();
  }
}

export function saveDatabase(db: PlatformDatabase): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Storage full or unavailable
  }
}

export function resetDatabase(): PlatformDatabase {
  const initial = buildInitialDatabase();
  saveDatabase(initial);
  return initial;
}

export function createRandomActivationCode(track: TrackId, isLesson = false): string {
  const prefix =
    track === 'intermediate'
      ? 'INT'
      : track === 'vocational'
        ? 'VOC'
        : track === 'university'
          ? 'UNI'
          : track.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'TRK';
  const digits = Math.floor(1000 + Math.random() * 9000);
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const suffix = isLesson
    ? `L${Math.floor(1 + Math.random() * 9)}`
    : chars[Math.floor(Math.random() * chars.length)] +
      chars[Math.floor(Math.random() * chars.length)];
  return `TAB-${prefix}-${digits}-${suffix}`;
}

export function createDefaultLesson(input: {
  title: string;
  duration: string;
  videoUrl: string;
  description: string;
  order: number;
  priceIqd?: number;
}): Lesson {
  return {
    id: `les-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title: input.title,
    duration: input.duration || '30:00',
    durationSeconds: 1800,
    videoUrl: input.videoUrl || 'protected://stream/new-lesson',
    description: input.description || 'محاضرة مسجلة ومحمية ضمن المنهج المعتمد.',
    order: input.order,
    priceIqd: Math.max(0, Number(input.priceIqd ?? 0)),
    topics: ['الشرح الأساسي للدرس', 'أمثلة تطبيقية محلولة', 'ملخص النقاط الامتحانية'],
    slides: [
      {
        timeSec: 0,
        title: input.title,
        body: input.description || 'شرح تفصيلي لمحاور المحاضرة مع أمثلة تطبيقية واضحة.',
      },
    ],
  };
}

export function createDefaultPdfNote(input: {
  title: string;
  fileUrl: string;
  pageCount: number;
}): PdfNote {
  const safeCount = Math.max(1, Math.min(20, input.pageCount || 2));
  return {
    id: `pdf-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title: input.title,
    fileUrl: input.fileUrl || 'protected://pdf/custom-note.pdf',
    pageCount: safeCount,
    updatedAt: new Date().toISOString().slice(0, 10),
    pages: Array.from({ length: Math.min(safeCount, 3) }, (_, index) => ({
      pageNumber: index + 1,
      sectionTitle: `${input.title} · صفحة ${index + 1}`,
      heading: index === 0 ? 'ملخص المفاهيم الأساسية' : `تطبيقات وتمارين الصفحة ${index + 1}`,
      paragraphs: [
        'هذه الملزمة محمية للعرض الداخلي فقط داخل منصة الأستاذة تبارك الأزيرجاوي، ومُعدة بصيغة واضحة ومريحة للمراجعة السريعة قبل الامتحان.',
        `مصدر الملف المرتبط: ${input.fileUrl || 'مخزن المنصة المحمي'}.`,
      ],
      keyPoints: [
        'راجع التعاريف والقوانين الأساسية في بداية كل فصل.',
        'ركّز على الأمثلة الوزارية المكررة والخطوات النموذجية للحل.',
      ],
    })),
  };
}
