export type TrackId = string;

export type UserRole = 'student' | 'admin';

export type AdminPermissionKey =
  | 'students_attendance'
  | 'payments_codes'
  | 'stages_courses'
  | 'quizzes_live_chat'
  | 'assignments_schedule'
  | 'live_announcements'
  | 'store_delivery'
  | 'complaints_inquiries'
  | 'can_delete';

export interface TrackOption {
  id: TrackId;
  label: string;
  shortLabel: string;
  description: string;
  subStages: string[];
  branches?: string[];
  departments?: string[];
  subjects?: string[];
  specializationLabel?: string;
  coverImage: string;
}

export interface UserProfile {
  id: string;
  fullName: string;
  phone: string; // Iraqi phone starting with 07 (11 digits) or moderator login phone
  username?: string; // Optional username for sub-admin/moderator login
  parentPhone?: string; // Optional parent WhatsApp phone starting with 07
  password: string;
  role: UserRole;
  isSuperAdmin?: boolean;
  adminRoleTitle?: string; // Free-text custom job title written manually by Super Admin
  permissions?: AdminPermissionKey[];
  track: TrackId;
  subStage: string;
  branch?: string;
  department?: string;
  deviceId: string | null;
  isActive: boolean;
  enrolledCourseIds: string[];
  unlockedLessonIds?: string[];
  subscriptionDueDate?: string; // YYYY-MM-DD set manually by teacher
  createdAt: string;
  lastLoginAt: string;
}

export interface LessonSlide {
  timeSec: number;
  title: string;
  body: string;
  formula?: string;
}

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  durationSeconds: number;
  videoUrl: string;
  description: string;
  order: number;
  priceIqd?: number; // 0 = مجانية
  topics: string[];
  slides: LessonSlide[];
}

export interface PdfPageContent {
  pageNumber: number;
  sectionTitle: string;
  heading: string;
  paragraphs: string[];
  keyPoints: string[];
  exampleBox?: {
    label: string;
    content: string;
  };
}

export interface PdfNote {
  id: string;
  title: string;
  pageCount: number;
  fileUrl: string;
  updatedAt: string;
  pages: PdfPageContent[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  title: string;
  timeLimitMinutes: number;
  questions: QuizQuestion[];
}

export interface Course {
  id: string;
  title: string;
  subtitle: string;
  track: TrackId;
  subStage: string;
  branch?: string;
  subject?: string;
  instructor: string;
  coverImage: string;
  description: string;
  totalHours: string;
  priceIqd?: number; // 0 = مجانية
  lessons: Lesson[];
  notes: PdfNote[];
  quizzes: Quiz[];
}

export interface ActivationCode {
  id: string;
  code: string;
  courseId: string;
  targetType?: 'course' | 'lesson';
  lessonId?: string;
  lessonTitle?: string;
  priceIqd?: number;
  track: TrackId;
  createdAt: string;
  isUsed: boolean;
  usedByStudentId?: string;
  usedByStudentName?: string;
  usedByPhone?: string;
  usedAt?: string;
}

export interface LiveParticipant {
  id: string;
  name: string;
  phone: string;
  handRaised: boolean;
  micAllowed: boolean;
  joinedAt: string;
  isCurrentUser?: boolean;
}

export interface LiveChatMessage {
  id: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  timestamp: string;
}

export type LiveShareMode = 'slides' | 'whiteboard' | 'screen';

export interface LiveSession {
  id: string;
  isLive: boolean;
  title: string;
  track: TrackId;
  subStage: string;
  branch?: string;
  subject?: string;
  courseId: string;
  startedAt: string;
  connectedCount: number;
  maxCapacity: number;
  shareMode: LiveShareMode;
  activeSlideIndex: number;
  allMuted: boolean;
  participants: LiveParticipant[];
  chatMessages: LiveChatMessage[];
  lastAnnouncement?: {
    id: string;
    message: string;
    timestamp: string;
  };
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  courseId: string;
  studentId: string;
  studentName: string;
  studentPhone: string;
  track: TrackId;
  subStage: string;
  score: number;
  total: number;
  percentage: number;
  timeSpentSeconds: number;
  completedAt: string;
  autoSubmitted?: boolean;
}

export type AssignmentPriority = 'normal' | 'urgent';

// Supports both legacy preset keys and any dynamically added TrackId
export type AssignmentAudience = string;

export interface DailyAssignment {
  id: string;
  title: string;
  details: string;
  audience: AssignmentAudience;
  track: TrackId;
  subStage?: string;
  branch?: string;
  subject?: string;
  courseId?: string;
  courseTitle?: string;
  dueDate: string; // YYYY-MM-DD
  priority: AssignmentPriority;
  createdAt: string;
}

export type LiveQuizRoomStatus = 'idle' | 'active' | 'ended';

export interface LiveQuizParticipant {
  id: string;
  name: string;
  phone: string;
  joinedAt: string;
  isSimulated?: boolean;
}

export interface LiveQuizAnswer {
  studentId: string;
  studentName: string;
  selectedIndex: number | null;
  isCorrect: boolean;
  responseTimeMs: number;
  answeredAt: number;
}

export interface LiveQuizQuestionCard {
  id: string;
  order: number;
  question: string;
  options: string[];
  correctIndex: number;
  durationSeconds: number;
  sentAt: number;
  expiresAt: number;
  answers: Record<string, LiveQuizAnswer>;
}

export interface LiveQuizLeaderboardEntry {
  studentId: string;
  studentName: string;
  studentPhone: string;
  rank: number;
  levelLabel: string;
  medal?: string;
  correctCount: number;
  totalQuestions: number;
  percentage: number;
  avgResponseMs: number;
  totalResponseMs: number;
}

export interface LiveQuizRoomSession {
  id: string;
  status: LiveQuizRoomStatus;
  title: string;
  audience: AssignmentAudience;
  track: TrackId;
  subStage?: string;
  branch?: string;
  subject?: string;
  courseId?: string;
  courseTitle?: string;
  durationMinutes: number;
  defaultQuestionSeconds: number;
  startedAt: number;
  endsAt: number;
  endedAt?: number;
  isDemoPreview?: boolean;
  participants: LiveQuizParticipant[];
  questions: LiveQuizQuestionCard[];
  finalLeaderboard: LiveQuizLeaderboardEntry[];
  systemMessages: {
    id: string;
    text: string;
    timestamp: string;
  }[];
}

export interface StudentLiveQuizResult {
  id: string;
  sessionId: string;
  sessionTitle: string;
  audience: AssignmentAudience;
  courseTitle?: string;
  studentId: string;
  studentName: string;
  totalQuestions: number;
  correctCount: number;
  percentage: number;
  rank: number;
  totalParticipants: number;
  levelLabel: string;
  medal?: string;
  avgResponseMs: number;
  completedAt: string;
  isRead: boolean;
}

export interface PaymentSettings {
  cardNumber: string;
  cardType: string;
  cardHolderName: string;
  whatsappNumber: string;
  monthlyFeeIqd: number;
  gracePeriodDays: number;
}

export type RenewalRequestStatus = 'pending' | 'approved' | 'rejected';

export interface RenewalRequest {
  id: string;
  studentId: string;
  studentName: string;
  studentPhone: string;
  trackLabel: string;
  subStage: string;
  amountIqd: number;
  receiptImageDataUrl: string;
  receiptFileName?: string;
  note?: string;
  status: RenewalRequestStatus;
  submittedAt: string;
  reviewedAt?: string;
  newDueDate?: string;
}

export type StoreItemCategory = 'booklet' | 'predictions';

export interface StoreItem {
  id: string;
  title: string;
  subject: string;
  track: TrackId;
  subStage: string;
  branch?: string;
  category: StoreItemCategory;
  description: string;
  priceIqd: number;
  coverImage: string;
  pagesInfo?: string;
  inStock: boolean;
  createdAt: string;
}

export interface StoreDeliverySettings {
  baghdadFeeIqd: number;
  provincesFeeIqd: number;
  estimatedDeliveryText: string;
}

export type StoreOrderStatus = 'preparing' | 'shipped' | 'delivered';

export interface StoreOrder {
  id: string;
  receiptNumber: string;
  itemId: string;
  itemTitle: string;
  subject: string;
  trackLabel: string;
  subStage: string;
  studentId?: string;
  studentName: string;
  phone: string;
  governorate: string;
  address: string;
  quantity: number;
  unitPriceIqd: number;
  deliveryFeeIqd: number;
  totalIqd: number;
  status: StoreOrderStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface TeacherCV {
  fullName: string;
  academicTitle: string;
  specialization: string;
  subjectsTaught: string[];
  degree: string;
  qualifications: string;
  age: string;
  yearsExperience: string;
  governorate: string;
  area: string;
  instituteAddress: string;
  bio: string;
  achievements: string[];
  phone: string;
  whatsapp: string;
  telegram?: string;
  instagram?: string;
  facebook?: string;
  updatedAt: string;
}

export type ComplaintCategory = 'technical' | 'lecture' | 'subscription' | 'other';

export type ComplaintStatus = 'pending' | 'resolved';

export interface StudentComplaint {
  id: string;
  studentId: string;
  studentName: string;
  studentPhone: string;
  trackLabel: string;
  subStage: string;
  category: ComplaintCategory;
  details: string;
  isPrivateToAdmin: boolean;
  status: ComplaintStatus;
  adminReply?: string;
  repliedAt?: string;
  isReplyReadByStudent?: boolean;
  createdAt: string;
}

export type InquiryStatus = 'pending' | 'answered';

export interface StudentInquiry {
  id: string;
  studentId: string;
  studentName: string;
  studentPhone: string;
  trackLabel: string;
  subStage: string;
  title: string;
  details: string;
  status: InquiryStatus;
  adminReply?: string;
  repliedAt?: string;
  isReplyReadByStudent: boolean;
  createdAt: string;
}

export type ArabicWeekday =
  | 'السبت'
  | 'الأحد'
  | 'الإثنين'
  | 'الثلاثاء'
  | 'الأربعاء'
  | 'الخميس'
  | 'الجمعة';

export interface WeeklyLiveSlot {
  id: string;
  dayOfWeek: ArabicWeekday;
  timeLabel: string; // e.g. '08:00 مساءً'
  track: TrackId;
  subStage: string; // Specific subStage or 'جميع الصفوف'
  branch?: string; // Specific branch/department or 'الجميع'
  subject: string;
  note?: string;
  createdAt: string;
}

export type AttendanceSource = 'live_broadcast' | 'course_quiz' | 'live_quiz_chat';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  source: AttendanceSource;
  sessionKey: string; // Unique key per session/quiz so attendance isn't duplicated
  title: string;
  dateISO: string;
  timestamp: string;
}

export interface BreakingAnnouncement {
  id: string;
  message: string;
  isActive: boolean;
  targetTrack: 'all' | TrackId;
  updatedAt: string;
}


