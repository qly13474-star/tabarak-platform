import React, { useCallback, useMemo, useState } from 'react';
import {
  Home,
  BookOpen,
  Radio,
  User,
  KeyRound,
  LogOut,
  Users,
  ArrowLeft,
  Lock,
  CheckCircle2,
  ShieldCheck,
  Smartphone,
  GraduationCap,
  ClipboardCheck,
  Trophy,
  Bell,
  ClipboardList,
  AlertTriangle,
  X,
  MessageSquare,
  Sparkles,
  Award,
  CreditCard,
  MessageCircle,
  Clock,
  ShoppingBag,
  Menu,
  FileBadge,
  MessageSquareWarning,
  MessageCircleQuestion,
  ChevronDown,
  CalendarClock,
  Megaphone,
  Phone,
  Pencil,
  Check,
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import {
  getAudienceLabel,
  getRelativeDateISO,
  isAssignmentForStudent,
} from '../../services/platformData';
import { isLiveQuizRoomForStudent } from '../../services/liveQuizChat';
import {
  buildWhatsAppPaymentUrl,
  evaluateStudentSubscription,
  formatIqd,
} from '../../utils/subscription';
import { buildWhatsappSupportUrl } from '../../utils/whatsapp';
import { computeStudentPerformance, isWeeklySlotForStudent } from '../../utils/parentReport';
import { SafeImage } from '../common/SafeImage';
import { BackButton } from '../common/BackButton';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { PlatformSubPageBar } from '../common/PlatformThemeUI';
import { useHardwareBackButton } from '../../hooks/useHardwareBackButton';
import { ActivationCodeModal } from './ActivationCodeModal';
import { CourseDetailView } from './CourseDetailView';
import { LiveClassroom } from './LiveClassroom';
import { StudentAssignmentsView } from './StudentAssignmentsView';
import { StudentLiveQuizChat } from './StudentLiveQuizChat';
import { StudentPaymentView } from './StudentPaymentView';
import { StudentStoreView } from './StudentStoreView';
import { StudentTeacherCVView } from './StudentTeacherCVView';
import { StudentComplaintsView } from './StudentComplaintsView';
import { StudentInquiriesView } from './StudentInquiriesView';
import { StudentScheduleView } from './StudentScheduleView';

type StudentTab =
  | 'home'
  | 'courses'
  | 'store'
  | 'assignments'
  | 'payment'
  | 'live'
  | 'schedule'
  | 'profile'
  | 'cv'
  | 'complaints'
  | 'inquiries';

export const StudentShell: React.FC = () => {
  const {
    db,
    currentUser,
    liveSession,
    liveQuizRoom,
    currentDeviceId,
    getTrackName,
    logout,
    toggleAssignmentCompleted,
    markAssignmentNotificationsRead,
    startDemoLiveQuizPreview,
    markLiveQuizResultsRead,
    markInquiryRepliesRead,
    markComplaintRepliesRead,
    updateMyParentPhone,
  } = usePlatform();

  const [activeTab, setActiveTab] = useState<StudentTab>('home');
  const [navHistory, setNavHistory] = useState<StudentTab[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [isLiveQuizChatOpen, setIsLiveQuizChatOpen] = useState(false);
  const [initialCourseTab, setInitialCourseTab] = useState<'lessons' | 'notes' | 'quizzes'>(
    'lessons'
  );
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [isActivationOpen, setIsActivationOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isTopMenuOpen, setIsTopMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [dismissedSubNotifKey, setDismissedSubNotifKey] = useState<string | null>(null);
  const [isEditingParentPhone, setIsEditingParentPhone] = useState(false);
  const [parentPhoneInput, setParentPhoneInput] = useState('');

  const navigateToTab = useCallback((nextTab: StudentTab) => {
    setActiveTab((prevTab) => {
      if (prevTab !== nextTab) {
        setNavHistory((hist) => [...hist.slice(-14), prevTab]);
      }
      return nextTab;
    });
  }, []);

  const handleGoBack = useCallback((): boolean => {
    if (isActivationOpen) {
      setIsActivationOpen(false);
      return true;
    }
    if (isNotificationsOpen) {
      setIsNotificationsOpen(false);
      return true;
    }
    if (isTopMenuOpen) {
      setIsTopMenuOpen(false);
      return true;
    }
    if (isLiveQuizChatOpen) {
      setIsLiveQuizChatOpen(false);
      return true;
    }
    if (selectedCourseId) {
      setSelectedCourseId(null);
      return true;
    }
    if (navHistory.length > 0) {
      const prevTab = navHistory[navHistory.length - 1];
      setNavHistory((hist) => hist.slice(0, -1));
      setActiveTab(prevTab);
      return true;
    }
    if (activeTab !== 'home') {
      setActiveTab('home');
      return true;
    }
    return false;
  }, [
    isActivationOpen,
    isNotificationsOpen,
    isTopMenuOpen,
    isLiveQuizChatOpen,
    selectedCourseId,
    navHistory,
    activeTab,
  ]);

  // Capacitor Android Hardware Back Button + Browser Back Support
  useHardwareBackButton(handleGoBack, true);

  const currentTrackOption = db.tracks.find((t) => t.id === currentUser?.track);
  const trackSpecializations =
    currentTrackOption?.branches ?? currentTrackOption?.departments ?? [];
  const todayISO = getRelativeDateISO(0);
  const tomorrowISO = getRelativeDateISO(1);

  // Strictly isolate courses to the student's registered academic track
  const trackCourses = useMemo(() => {
    if (!currentUser) return [];
    return db.courses.filter((c) => {
      if (c.track !== currentUser.track) return false;
      if (trackSpecializations.length > 0 && branchFilter !== 'all') {
        return c.branch === branchFilter;
      }
      return true;
    });
  }, [db.courses, currentUser, branchFilter, trackSpecializations.length]);

  const unlockedLessonIds = currentUser?.unlockedLessonIds ?? [];

  const enrolledCourses = useMemo(() => {
    if (!currentUser) return [];
    return trackCourses.filter(
      (c) =>
        currentUser.enrolledCourseIds.includes(c.id) ||
        (c.priceIqd ?? 0) === 0 ||
        c.lessons.some((l) => unlockedLessonIds.includes(l.id))
    );
  }, [trackCourses, currentUser, unlockedLessonIds]);

  // First available quiz from enrolled courses for quick 1-tap demo access on Home
  const featuredQuizItem = useMemo(() => {
    for (const course of enrolledCourses) {
      if (course.quizzes.length > 0) {
        const quiz = course.quizzes[0];
        const attemptsCount = db.quizAttempts.filter((a) => a.quizId === quiz.id).length;
        return { course, quiz, attemptsCount };
      }
    }
    return null;
  }, [enrolledCourses, db.quizAttempts]);

  // Strictly isolate assignments & notifications to this student's stage/branch
  const stageAssignments = useMemo(() => {
    if (!currentUser) return [];
    return db.assignments
      .filter((a) => isAssignmentForStudent(a, currentUser))
      .sort((a, b) => {
        if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        if (a.priority !== b.priority) return a.priority === 'urgent' ? -1 : 1;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [db.assignments, currentUser]);

  const unreadAssignments = useMemo(() => {
    if (!currentUser) return [];
    const readIds = db.readAssignmentNotifications[currentUser.id] ?? [];
    return stageAssignments.filter((a) => !readIds.includes(a.id));
  }, [stageAssignments, db.readAssignmentNotifications, currentUser]);

  const urgentTodayAssignments = useMemo(() => {
    if (!currentUser) return [];
    const completedIds = db.completedAssignments[currentUser.id] ?? [];
    return stageAssignments.filter(
      (a) => a.dueDate === todayISO && a.priority === 'urgent' && !completedIds.includes(a.id)
    );
  }, [stageAssignments, db.completedAssignments, currentUser, todayISO]);

  // Personal saved Live Quiz Chat Room results for this student
  const myLiveQuizResults = useMemo(() => {
    if (!currentUser) return [];
    return db.liveQuizResults.filter((r) => r.studentId === currentUser.id);
  }, [db.liveQuizResults, currentUser]);

  const unreadLiveQuizResults = useMemo(
    () => myLiveQuizResults.filter((r) => !r.isRead),
    [myLiveQuizResults]
  );

  // Student's answered inquiries & complaints with unread teacher replies
  const unreadInquiryReplies = useMemo(() => {
    if (!currentUser) return [];
    return db.inquiries.filter(
      (inq) =>
        inq.studentId === currentUser.id &&
        inq.status === 'answered' &&
        !inq.isReplyReadByStudent
    );
  }, [db.inquiries, currentUser]);

  const unreadComplaintReplies = useMemo(() => {
    if (!currentUser) return [];
    return db.complaints.filter(
      (cmp) =>
        cmp.studentId === currentUser.id &&
        Boolean(cmp.adminReply) &&
        cmp.isReplyReadByStudent === false
    );
  }, [db.complaints, currentUser]);

  const supportUnreadCount = unreadInquiryReplies.length + unreadComplaintReplies.length;

  // Automatic monthly subscription status (3-day reminder, 5-day grace period, 35-day auto-lock)
  const subscription = useMemo(
    () =>
      evaluateStudentSubscription(
        currentUser?.subscriptionDueDate,
        db.paymentSettings.gracePeriodDays
      ),
    [currentUser?.subscriptionDueDate, db.paymentSettings.gracePeriodDays]
  );

  const hasSubscriptionAlert = subscription.status !== 'active';
  const subNotifKey = currentUser
    ? `${currentUser.id}:${subscription.status}:${subscription.dueDate}`
    : '';
  const isSubscriptionNotifUnread =
    hasSubscriptionAlert && subNotifKey !== '' && dismissedSubNotifKey !== subNotifKey;

  const totalUnreadNotifications =
    unreadAssignments.length +
    unreadLiveQuizResults.length +
    unreadInquiryReplies.length +
    unreadComplaintReplies.length +
    (isSubscriptionNotifUnread ? 1 : 0);

  // Stage-isolated Weekly Live Schedule slots for this student
  const myWeeklySlots = useMemo(() => {
    if (!currentUser) return [];
    return db.weeklySchedule.filter((slot) => isWeeklySlotForStudent(slot, currentUser));
  }, [db.weeklySchedule, currentUser]);

  // Automatic Attendance & Performance summary for Student Profile
  const myPerformance = useMemo(() => {
    if (!currentUser) return null;
    return computeStudentPerformance(
      currentUser,
      db.attendanceRecords,
      db.quizAttempts,
      db.liveQuizResults
    );
  }, [currentUser, db.attendanceRecords, db.quizAttempts, db.liveQuizResults]);

  if (!currentUser) return null;

  const activeBreakingAnnouncement =
    db.breakingAnnouncement.isActive &&
    db.breakingAnnouncement.message.trim().length > 0 &&
    (db.breakingAnnouncement.targetTrack === 'all' ||
      db.breakingAnnouncement.targetTrack === currentUser.track)
      ? db.breakingAnnouncement
      : null;

  const selectedCourse = trackCourses.find((c) => c.id === selectedCourseId) ?? null;
  const isLiveForMyTrack = liveSession.isLive && liveSession.track === currentUser.track;
  const canJoinLiveQuizRoom =
    liveQuizRoom.status === 'active' && isLiveQuizRoomForStudent(liveQuizRoom, currentUser);
  const watchedIds = db.watchedLessons[currentUser.id] ?? [];
  const completedAssignmentIds = db.completedAssignments[currentUser.id] ?? [];
  const whatsappPaymentUrl = buildWhatsAppPaymentUrl(
    db.paymentSettings,
    currentUser,
    subscription.dueDate
  );
  const whatsappSupportUrl = buildWhatsappSupportUrl(
    db.supportWhatsappNumber ||
      db.paymentSettings?.whatsappNumber ||
      db.teacherCV?.whatsapp ||
      '07848333046',
    `مرحباً، أنا الطالب ${currentUser.fullName} وأحتاج إلى مساعدة فنية في منصة الأستاذة تبارك الزيرجاوي.`
  );

  const handleOpenPayment = () => {
    setIsNotificationsOpen(false);
    setIsTopMenuOpen(false);
    setIsLiveQuizChatOpen(false);
    setSelectedCourseId(null);
    navigateToTab('payment');
    if (subNotifKey) setDismissedSubNotifKey(subNotifKey);
  };

  const handleOpenCourse = (
    courseId: string,
    tab: 'lessons' | 'notes' | 'quizzes' = 'lessons'
  ) => {
    setIsTopMenuOpen(false);
    setIsLiveQuizChatOpen(false);
    setInitialCourseTab(tab);
    setSelectedCourseId(courseId);
    navigateToTab('courses');
  };

  const handleOpenAssignments = () => {
    setIsNotificationsOpen(false);
    setIsTopMenuOpen(false);
    setIsLiveQuizChatOpen(false);
    setSelectedCourseId(null);
    navigateToTab('assignments');
    if (unreadAssignments.length > 0) {
      markAssignmentNotificationsRead(unreadAssignments.map((a) => a.id));
    }
  };

  const handleOpenMyResults = () => {
    setIsNotificationsOpen(false);
    setIsTopMenuOpen(false);
    setIsLiveQuizChatOpen(false);
    setSelectedCourseId(null);
    navigateToTab('profile');
    if (unreadLiveQuizResults.length > 0) {
      markLiveQuizResultsRead(unreadLiveQuizResults.map((r) => r.id));
    }
  };

  const handleOpenTeacherCV = () => {
    setIsNotificationsOpen(false);
    setIsTopMenuOpen(false);
    setIsLiveQuizChatOpen(false);
    setSelectedCourseId(null);
    navigateToTab('cv');
  };

  const handleOpenSchedule = () => {
    setIsNotificationsOpen(false);
    setIsTopMenuOpen(false);
    setIsLiveQuizChatOpen(false);
    setSelectedCourseId(null);
    navigateToTab('schedule');
  };

  const handleSaveParentPhone = () => {
    const cleaned = parentPhoneInput.replace(/\D/g, '').slice(0, 11);
    updateMyParentPhone(cleaned);
    setIsEditingParentPhone(false);
    setToastMessage(
      cleaned
        ? 'تم حفظ رقم هاتف ولي الأمر (واتساب) بنجاح.'
        : 'تم مسح رقم هاتف ولي الأمر.'
    );
    window.setTimeout(() => setToastMessage(null), 4000);
  };

  const handleOpenComplaints = () => {
    setIsNotificationsOpen(false);
    setIsTopMenuOpen(false);
    setIsLiveQuizChatOpen(false);
    setSelectedCourseId(null);
    navigateToTab('complaints');
    if (unreadComplaintReplies.length > 0) {
      markComplaintRepliesRead(unreadComplaintReplies.map((c) => c.id));
    }
  };

  const handleOpenInquiries = () => {
    setIsNotificationsOpen(false);
    setIsTopMenuOpen(false);
    setIsLiveQuizChatOpen(false);
    setSelectedCourseId(null);
    navigateToTab('inquiries');
    if (unreadInquiryReplies.length > 0) {
      markInquiryRepliesRead(unreadInquiryReplies.map((inq) => inq.id));
    }
  };

  const handleLaunchDemoLiveQuiz = () => {
    startDemoLiveQuizPreview();
    setSelectedCourseId(null);
    setIsLiveQuizChatOpen(true);
  };

  const handleActivated = (unlockedTitle?: string) => {
    setToastMessage(
      unlockedTitle ? `تم فتح «${unlockedTitle}» بنجاح!` : 'تم تفعيل الكود بنجاح!'
    );
    window.setTimeout(() => setToastMessage(null), 4500);
  };

  const handleQuickCompleteAssignment = (assignmentId: string, title: string) => {
    toggleAssignmentCompleted(assignmentId);
    setToastMessage(`أحسنت! تم تسجيل إكمال «${title}» في جدولك اليومي.`);
    window.setTimeout(() => setToastMessage(null), 4000);
  };

  const desktopNavItems: {
    id: StudentTab;
    label: string;
    mobileLabel: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'home', label: 'الرئيسية', mobileLabel: 'الرئيسية', icon: Home },
    { id: 'courses', label: 'دوراتي', mobileLabel: 'دوراتي', icon: BookOpen },
    { id: 'store', label: 'المشتريات', mobileLabel: 'المشتريات', icon: ShoppingBag },
    { id: 'assignments', label: 'التحاضير', mobileLabel: 'التحاضير', icon: ClipboardList },
    { id: 'payment', label: 'الدفع الشهري', mobileLabel: 'الدفع', icon: CreditCard },
    { id: 'live', label: 'البث المباشر', mobileLabel: 'البث', icon: Radio },
    { id: 'profile', label: 'حسابي', mobileLabel: 'حسابي', icon: User },
  ];

  // Mobile bottom navigation includes 6 crisp single-word tabs (while الدفع الشهري is always 1-tap in top header)
  const mobileNavItems = desktopNavItems.filter((item) => item.id !== 'payment');

  const renderSubscriptionLockScreen = (blockedAreaLabel: string) => (
    <section
      aria-label="قفل الاشتراك الشهري"
      className="max-w-2xl mx-auto rounded-2xl bg-white/[0.045] backdrop-blur-xl border-2 border-rose-400/35 shadow-lg overflow-hidden"
    >
      <div className="bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 shadow-[0_8px_22px_-6px_rgba(147,51,234,0.65)] text-white px-6 py-7 text-center space-y-3">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600/20 border border-red-400/40 text-red-400">
          <Lock className="h-7 w-7" />
        </div>
        <p className="text-xs font-extrabold text-red-400">قفل تلقائي بعد انتهاء مهلة السماح</p>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white">
          انتهى اشتراكك الشهري ومهلة السماح
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 font-reading max-w-lg mx-auto leading-relaxed">
          تم قفل الدخول إلى «{blockedAreaLabel}» تلقائياً بعد مرور 35 يوماً (موعد الاستحقاق + 5 أيام مهلة سماح). يرجى تجديد الاشتراك الشهري لإعادة فتح المحاضرات والبث المباشر فوراً.
        </p>
      </div>

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl bg-white/[0.04] border border-purple-500/20 p-3.5">
            <span className="block text-slate-400">تاريخ الاستحقاق السابق</span>
            <strong className="mt-1 block font-mono text-sm font-extrabold text-white tabular-nums" dir="ltr">
              {subscription.dueDate}
            </strong>
          </div>
          <div className="rounded-xl bg-rose-500/12 border border-rose-400/35 p-3.5">
            <span className="block text-rose-300">انتهت مهلة السماح في</span>
            <strong className="mt-1 block font-mono text-sm font-extrabold text-rose-200 tabular-nums" dir="ltr">
              {subscription.graceEndDate}
            </strong>
          </div>
          <div className="rounded-xl bg-amber-500/12 border border-amber-400/35 p-3.5">
            <span className="block text-amber-200">قيمة الاشتراك الشهري</span>
            <strong className="mt-1 block font-mono text-sm font-extrabold text-white tabular-nums">
              {formatIqd(db.paymentSettings.monthlyFeeIqd)}
            </strong>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleOpenPayment}
            className="flex-1 min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 px-5 text-sm font-extrabold text-white hover:brightness-105"
          >
            <CreditCard className="h-4 w-4" />
            <span>الانتقال لصفحة الدفع الشهري</span>
          </button>

          <a
            href={whatsappPaymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-extrabold text-white hover:bg-emerald-700"
          >
            <MessageCircle className="h-4 w-4" />
            <span>إرسال وصل التحويل عبر الواتساب</span>
          </a>
        </div>

        <div className="flex justify-center pt-1">
          <BackButton
            onClick={() => {
              handleGoBack();
            }}
            label="رجوع"
            variant="light"
            className="w-full"
          />
        </div>
      </div>
    </section>
  );

  return (
    <div className="min-h-[100dvh] bg-[#090712] text-white flex flex-col overflow-x-hidden">
      {/* Compact Sticky Top Bar — Zero Horizontal Overflow on Any Screen */}
      <header className="sticky top-0 z-30 bg-[#110D1F]/90 backdrop-blur-2xl text-white border-b border-purple-500/20 pt-safe px-safe w-full shadow-[0_8px_32px_-16px_rgba(124,58,237,0.4)]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 min-h-14 py-1.5 flex items-center justify-between gap-2 sm:gap-4 w-full">
          {/* Zone 1: Flexible Truncated Brand Title */}
          <button
            type="button"
            onClick={() => {
              setIsLiveQuizChatOpen(false);
              setSelectedCourseId(null);
              setActiveTab('home');
            }}
            className="flex items-center gap-2.5 text-right min-w-0 flex-1 lg:flex-initial cursor-pointer"
          >
            <img
              src="/pwa-192x192.png"
              alt="منصة الأستاذة تبارك الزيرجاوي"
              className="h-9 w-9 rounded-xl border border-purple-400/50 shadow-[0_0_16px_-4px_rgba(168,85,247,0.75)] object-cover shrink-0"
            />
            <span className="text-[13px] sm:text-base font-black tracking-tight text-white truncate min-w-0">
              منصة الأستاذة تبارك الزيرجاوي
            </span>
          </button>

          {/* Zone 2: Wide Desktop Navigation Links (lg+) */}
          <nav className="hidden lg:flex items-center gap-4 xl:gap-5 text-xs xl:text-sm font-semibold text-slate-300 shrink-0">
            {desktopNavItems.map((item) => {
              const active = activeTab === item.id && !selectedCourse && !isLiveQuizChatOpen;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === 'payment') {
                      handleOpenPayment();
                      return;
                    }
                    setIsLiveQuizChatOpen(false);
                    setSelectedCourseId(null);
                    navigateToTab(item.id);
                    if (item.id === 'profile' && unreadLiveQuizResults.length > 0) {
                      markLiveQuizResultsRead(unreadLiveQuizResults.map((r) => r.id));
                    }
                  }}
                  className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 inline-flex items-center gap-1.5 ${
                    active
                      ? 'text-purple-300 border-purple-400/70'
                      : 'border-transparent hover:text-white'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.id === 'payment' && hasSubscriptionAlert && (
                    <span
                      className={`h-2 w-2 rounded-full ${
                        subscription.isLocked
                          ? 'bg-red-500 animate-pulse'
                          : subscription.status === 'grace_period'
                            ? 'bg-orange-400 animate-pulse'
                            : 'bg-purple-500'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Fully Visible Action Controls (Install PWA · Payment · Notifications · Slide-Out Menu) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <PWAInstallButton variant="header" />
            <button
              type="button"
              onClick={handleOpenPayment}
              aria-label="الدفع الشهري"
              className={`min-h-[38px] inline-flex items-center gap-1 rounded-xl px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-extrabold transition-colors whitespace-nowrap shrink-0 ${
                subscription.isLocked
                  ? 'bg-red-600 text-white hover:bg-red-500'
                  : subscription.status === 'grace_period'
                    ? 'bg-orange-500 text-white hover:bg-orange-400'
                    : subscription.status === 'expiring_soon'
                      ? 'bg-purple-600 text-white hover:bg-purple-500'
                      : activeTab === 'payment'
                        ? 'bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 text-white'
                        : 'bg-white/[0.06] text-purple-300 hover:bg-purple-500/25'
              }`}
            >
              <CreditCard className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">الدفع الشهري</span>
              <span className="sm:hidden">الدفع</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsTopMenuOpen(false);
                setIsNotificationsOpen((prev) => !prev);
              }}
              aria-label="إشعارات الاشتراك والتحاضير والردود"
              aria-expanded={isNotificationsOpen}
              className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white/[0.06] text-slate-200 hover:bg-purple-500/25 hover:text-white transition-colors shrink-0"
            >
              <Bell className="h-4 w-4" />
              {totalUnreadNotifications > 0 && (
                <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-[10px] font-extrabold text-white flex items-center justify-center font-mono tabular-nums ring-2 ring-purple-400">
                  {totalUnreadNotifications > 9 ? '9+' : totalUnreadNotifications}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsNotificationsOpen(false);
                setIsTopMenuOpen((prev) => !prev);
              }}
              aria-label="القائمة الجانبية: جدول البث، السيرة الذاتية، الشكاوى والاستفسارات"
              aria-expanded={isTopMenuOpen}
              className={`relative min-h-[38px] min-w-[38px] inline-flex items-center justify-center gap-1.5 rounded-xl px-2 sm:px-3 py-1.5 text-xs font-extrabold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'schedule' ||
                activeTab === 'cv' ||
                activeTab === 'complaints' ||
                activeTab === 'inquiries' ||
                isTopMenuOpen
                  ? 'bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 text-white'
                  : 'bg-white/[0.06] text-slate-100 hover:bg-purple-500/25'
              }`}
            >
              <Menu className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">القائمة</span>
              <ChevronDown
                className={`hidden sm:inline h-3.5 w-3.5 transition-transform ${
                  isTopMenuOpen ? 'rotate-180' : ''
                }`}
              />
              {supportUnreadCount > 0 && (
                <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-[10px] font-extrabold text-white flex items-center justify-center font-mono tabular-nums ring-2 ring-purple-400">
                  {supportUnreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsNotificationsOpen(false);
                setIsTopMenuOpen(false);
                setIsActivationOpen(true);
              }}
              className="hidden xl:inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-white/[0.06] px-3 py-1.5 text-xs font-bold text-purple-300 hover:bg-purple-500/25 transition-colors whitespace-nowrap shrink-0"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>تفعيل كود</span>
            </button>

            {/* Responsive Full-Height Slide-Out Drawer (Zero Text Clipping on All Screens) */}
            {isTopMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[2px]"
                  onClick={() => setIsTopMenuOpen(false)}
                  aria-hidden="true"
                />
                <aside
                  aria-label="القائمة الجانبية"
                  className="fixed inset-y-0 left-0 z-50 w-[min(88vw,360px)] max-w-[calc(100vw-24px)] h-[100dvh] bg-[#110D1F]/95 backdrop-blur-2xl text-white shadow-2xl border-r border-purple-500/20 flex flex-col overflow-hidden"
                >
                  <div className="px-4 py-3.5 pt-safe bg-[#110D1F] text-white flex items-center justify-between gap-2 shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <BackButton
                        onClick={() => setIsTopMenuOpen(false)}
                        label="رجوع"
                        variant="dark"
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-purple-300 whitespace-normal break-words">
                          القائمة والأقسام الإضافية
                        </p>
                        <p className="text-[11px] text-slate-300 whitespace-normal break-words">
                          منصة الأستاذة تبارك الزيرجاوي
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsTopMenuOpen(false)}
                      aria-label="إغلاق القائمة"
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-2 pb-safe">
                    <button
                      type="button"
                      onClick={handleOpenSchedule}
                      className={`w-full rounded-xl px-3.5 py-3 text-right flex items-start gap-3 transition-colors ${
                        activeTab === 'schedule'
                          ? 'bg-[#110D1F] text-white'
                          : 'bg-white/[0.035] hover:bg-white/10 text-white border border-purple-500/15'
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 mt-0.5 ${
                          activeTab === 'schedule'
                            ? 'bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 text-white'
                            : 'bg-amber-500/15 text-purple-300'
                        }`}
                      >
                        <CalendarClock className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1 whitespace-normal break-words">
                        <span className="flex flex-wrap items-center justify-between gap-1.5">
                          <span className="text-sm font-extrabold whitespace-normal break-words">
                            جدول البث الأسبوعي
                          </span>
                          {myWeeklySlots.length > 0 && (
                            <span className="min-w-[20px] h-5 px-2 rounded-full bg-purple-500/20 text-[10px] font-extrabold text-purple-300 inline-flex items-center justify-center font-mono tabular-nums shrink-0">
                              {myWeeklySlots.length} مواعيد
                            </span>
                          )}
                        </span>
                        <span
                          className={`block text-xs mt-1 leading-relaxed whitespace-normal break-words ${
                            activeTab === 'schedule' ? 'text-slate-300' : 'text-slate-300'
                          }`}
                        >
                          مواعيد وأوقات البث المباشر الخاصة بمرحلتك الدراسية فقط
                        </span>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenTeacherCV}
                      className={`w-full rounded-xl px-3.5 py-3 text-right flex items-start gap-3 transition-colors ${
                        activeTab === 'cv'
                          ? 'bg-[#110D1F] text-white'
                          : 'bg-white/[0.035] hover:bg-white/10 text-white border border-purple-500/15'
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 mt-0.5 ${
                          activeTab === 'cv'
                            ? 'bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 text-white'
                            : 'bg-amber-500/15 text-purple-300'
                        }`}
                      >
                        <FileBadge className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1 whitespace-normal break-words">
                        <span className="block text-sm font-extrabold whitespace-normal break-words">
                          السيرة الذاتية للأستاذة (CV)
                        </span>
                        <span
                          className={`block text-xs mt-1 leading-relaxed whitespace-normal break-words ${
                            activeTab === 'cv' ? 'text-slate-300' : 'text-slate-300'
                          }`}
                        >
                          عن الأستاذة تبارك الزيرجاوي، المؤهلات العلمية، الإنجازات والعنوان
                        </span>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenComplaints}
                      className={`w-full rounded-xl px-3.5 py-3 text-right flex items-start gap-3 transition-colors ${
                        activeTab === 'complaints'
                          ? 'bg-[#110D1F] text-white'
                          : 'bg-white/[0.035] hover:bg-white/10 text-white border border-purple-500/15'
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 mt-0.5 ${
                          activeTab === 'complaints'
                            ? 'bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 text-white'
                            : 'bg-amber-500/15 text-purple-300'
                        }`}
                      >
                        <MessageSquareWarning className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1 whitespace-normal break-words">
                        <span className="flex flex-wrap items-center justify-between gap-1.5">
                          <span className="text-sm font-extrabold whitespace-normal break-words">
                            الشكاوى
                          </span>
                          {unreadComplaintReplies.length > 0 && (
                            <span className="min-w-[20px] h-5 px-2 rounded-full bg-emerald-600 text-[10px] font-extrabold text-white inline-flex items-center justify-center font-mono shrink-0">
                              {unreadComplaintReplies.length} رد
                            </span>
                          )}
                        </span>
                        <span
                          className={`block text-xs mt-1 leading-relaxed whitespace-normal break-words ${
                            activeTab === 'complaints' ? 'text-slate-300' : 'text-slate-300'
                          }`}
                        >
                          تقديم شكوى تقنية أو دراسية ومتابعة الحل مباشرة مع الإدارة
                        </span>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenInquiries}
                      className={`w-full rounded-xl px-3.5 py-3 text-right flex items-start gap-3 transition-colors ${
                        activeTab === 'inquiries'
                          ? 'bg-[#110D1F] text-white'
                          : 'bg-white/[0.035] hover:bg-white/10 text-white border border-purple-500/15'
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 mt-0.5 ${
                          activeTab === 'inquiries'
                            ? 'bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 text-white'
                            : 'bg-amber-500/15 text-purple-300'
                        }`}
                      >
                        <MessageCircleQuestion className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1 whitespace-normal break-words">
                        <span className="flex flex-wrap items-center justify-between gap-1.5">
                          <span className="text-sm font-extrabold whitespace-normal break-words">
                            الاستفسارات
                          </span>
                          {unreadInquiryReplies.length > 0 && (
                            <span className="min-w-[20px] h-5 px-2 rounded-full bg-emerald-600 text-[10px] font-extrabold text-white inline-flex items-center justify-center font-mono shrink-0">
                              {unreadInquiryReplies.length} رد
                            </span>
                          )}
                        </span>
                        <span
                          className={`block text-xs mt-1 leading-relaxed whitespace-normal break-words ${
                            activeTab === 'inquiries' ? 'text-slate-300' : 'text-slate-300'
                          }`}
                        >
                          أرسل استفسارك الدراسي أو العام واستلم رد الأستاذة مباشرة
                        </span>
                      </span>
                    </button>

                    <div className="pt-2 mt-2 border-t border-purple-500/20 space-y-2.5">
                      <PWAInstallButton variant="drawer" />

                      <button
                        type="button"
                        onClick={handleOpenPayment}
                        className="w-full min-h-[44px] rounded-xl bg-amber-500/15 border border-amber-400/40 px-3.5 py-2.5 text-right flex items-center gap-3 text-white hover:bg-amber-500/25 transition-colors cursor-pointer"
                      >
                        <CreditCard className="h-4 w-4 text-purple-300 shrink-0" />
                        <span className="text-xs sm:text-sm font-extrabold whitespace-normal break-words">
                          الدفع الشهري وتجديد الاشتراك
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsTopMenuOpen(false);
                          setIsActivationOpen(true);
                        }}
                        className="w-full min-h-[44px] rounded-xl bg-white/[0.06] border border-purple-500/30 px-3.5 py-2.5 text-right flex items-center gap-3 text-white hover:bg-purple-500/20 hover:border-purple-400/55 transition-colors cursor-pointer"
                      >
                        <KeyRound className="h-4 w-4 text-purple-300 shrink-0" />
                        <span className="text-xs sm:text-sm font-extrabold whitespace-normal break-words">
                          تفعيل كود دورة أو محاضرة
                        </span>
                      </button>

                      <a
                        href={whatsappSupportUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full min-h-[44px] rounded-xl bg-emerald-500/15 border border-emerald-400/40 px-3.5 py-2.5 text-right flex items-center gap-3 text-emerald-100 hover:bg-emerald-500/25 hover:border-emerald-300/60 transition-colors"
                      >
                        <MessageCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span className="text-xs sm:text-sm font-extrabold whitespace-normal break-words">
                          تواصل مع الدعم (واتساب)
                        </span>
                      </a>
                    </div>
                  </div>
                </aside>
              </>
            )}

            {/* Viewport-Clamped Notifications Panel (Never Clips on Small Screens) */}
            {isNotificationsOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-slate-950/30"
                  onClick={() => setIsNotificationsOpen(false)}
                  aria-hidden="true"
                />
                <div className="fixed top-[calc(3.75rem+env(safe-area-inset-top))] left-3 right-3 sm:right-auto sm:left-6 sm:w-[380px] max-w-[calc(100vw-24px)] z-50 rounded-2xl bg-[#110D1F]/95 backdrop-blur-2xl text-white border border-purple-500/20 shadow-2xl overflow-hidden">
                  <div className="px-4 py-3.5 bg-[#110D1F] text-white flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <BackButton
                        onClick={() => setIsNotificationsOpen(false)}
                        label="رجوع"
                        variant="dark"
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-white truncate">
                          إشعارات المنصة والردود
                        </p>
                        <p className="text-[11px] text-purple-300 truncate">
                          {currentUser.subStage}
                          {currentUser.branch ? ` · ${currentUser.branch}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {totalUnreadNotifications > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (unreadAssignments.length > 0) {
                              markAssignmentNotificationsRead(unreadAssignments.map((a) => a.id));
                            }
                            if (unreadLiveQuizResults.length > 0) {
                              markLiveQuizResultsRead(unreadLiveQuizResults.map((r) => r.id));
                            }
                            if (unreadInquiryReplies.length > 0) {
                              markInquiryRepliesRead(unreadInquiryReplies.map((i) => i.id));
                            }
                            if (unreadComplaintReplies.length > 0) {
                              markComplaintRepliesRead(unreadComplaintReplies.map((c) => c.id));
                            }
                            if (subNotifKey) setDismissedSubNotifKey(subNotifKey);
                          }}
                          className="text-[11px] font-bold text-purple-300 hover:underline whitespace-nowrap"
                        >
                          تمييز كمقروء
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsNotificationsOpen(false)}
                        aria-label="إغلاق الإشعارات"
                        className="p-1 text-slate-400 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-purple-500/15">
                    {/* Teacher Replies to Student Inquiries */}
                    {unreadInquiryReplies.map((inq) => (
                      <button
                        key={inq.id}
                        type="button"
                        onClick={handleOpenInquiries}
                        className="w-full p-3.5 text-right bg-emerald-500/12 hover:bg-emerald-500/25 transition-colors block"
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="font-extrabold text-emerald-200">
                            رد جديد من الأستاذة على استفسارك
                          </span>
                          {inq.repliedAt && (
                            <span className="font-mono text-[10px] text-emerald-300" dir="ltr">
                              {inq.repliedAt}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs font-extrabold text-white line-clamp-1">
                          {inq.title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-300 line-clamp-2 font-reading">
                          {inq.adminReply}
                        </p>
                      </button>
                    ))}

                    {/* Teacher Replies to Student Complaints */}
                    {unreadComplaintReplies.map((cmp) => (
                      <button
                        key={cmp.id}
                        type="button"
                        onClick={handleOpenComplaints}
                        className="w-full p-3.5 text-right bg-amber-500/12 hover:bg-amber-500/25 transition-colors block"
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="font-extrabold text-purple-300">
                            تحديث ورد الأستاذة على شكواك ({cmp.status === 'resolved' ? 'تم الحل' : 'قيد المراجعة'})
                          </span>
                          {cmp.repliedAt && (
                            <span className="font-mono text-[10px] text-amber-200" dir="ltr">
                              {cmp.repliedAt}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-200 line-clamp-2 font-reading">
                          {cmp.adminReply}
                        </p>
                      </button>
                    ))}

                    {/* Automatic Monthly Subscription Reminder / Grace / Lock Notification */}
                    {hasSubscriptionAlert && (
                      <button
                        type="button"
                        onClick={handleOpenPayment}
                        className={`w-full p-3.5 text-right transition-colors block ${
                          subscription.isLocked
                            ? 'bg-rose-500/15 hover:bg-rose-500/25'
                            : subscription.status === 'grace_period'
                              ? 'bg-amber-500/15 hover:bg-amber-500/25'
                              : 'bg-purple-500/15 hover:bg-purple-500/25'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span
                            className={`font-extrabold ${
                              subscription.isLocked
                                ? 'text-rose-300'
                                : subscription.status === 'grace_period'
                                  ? 'text-amber-200'
                                  : 'text-amber-200'
                            }`}
                          >
                            {subscription.isLocked
                              ? 'قفل تلقائي للاشتراك الشهري'
                              : subscription.status === 'grace_period'
                                ? 'تنبيه مهلة السماح (5 أيام)'
                                : 'تذكير موعد الدفع الشهري'}
                          </span>
                          <span className="font-mono text-[10px] font-bold text-slate-300" dir="ltr">
                            {subscription.dueDate}
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-extrabold text-white">
                          {subscription.isLocked
                            ? 'انتهى اشتراكك الشهري ومهلة السماح'
                            : subscription.status === 'grace_period'
                              ? `متبقي ${subscription.graceDaysRemaining} أيام في مهلة السماح قبل القفل التلقائي`
                              : `متبقي ${subscription.daysUntilDue} أيام على موعد دفع الاشتراك الشهري`}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-300 font-reading">
                          اضغط هنا لنسخ رقم البطاقة وإرسال وصل التحويل للأستاذة تبارك.
                        </p>
                      </button>
                    )}

                    {/* Live Quiz Chat Final Result Notifications */}
                    {myLiveQuizResults.slice(0, 3).map((res) => (
                      <button
                        key={res.id}
                        type="button"
                        onClick={handleOpenMyResults}
                        className={`w-full p-3.5 text-right transition-colors hover:bg-white/[0.08] block ${
                          !res.isRead ? 'bg-emerald-500/12' : 'bg-white/[0.045] backdrop-blur-xl'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="font-extrabold text-emerald-300">
                            نتيجة كوز مباشر · {res.levelLabel} {res.medal ?? ''}
                          </span>
                          <span className="font-mono font-extrabold text-white tabular-nums">
                            {res.percentage}%
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-extrabold text-white line-clamp-1">
                          {res.sessionTitle}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400 font-reading">
                          أجبت {res.correctCount} من {res.totalQuestions} بشكل صحيح · المركز{' '}
                          {res.rank} من {res.totalParticipants}
                        </p>
                      </button>
                    ))}

                    {stageAssignments.length === 0 &&
                    myLiveQuizResults.length === 0 &&
                    unreadInquiryReplies.length === 0 &&
                    unreadComplaintReplies.length === 0 &&
                    !hasSubscriptionAlert ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        لا توجد تحاضير أو تنبيهات جديدة لمرحلتك حالياً.
                      </div>
                    ) : (
                      stageAssignments.slice(0, 6).map((asg) => {
                        const isUnread = unreadAssignments.some((u) => u.id === asg.id);
                        const isDone = completedAssignmentIds.includes(asg.id);
                        const dateLabel =
                          asg.dueDate === todayISO
                            ? 'اليوم'
                            : asg.dueDate === tomorrowISO
                              ? 'غداً'
                              : asg.dueDate;

                        return (
                          <button
                            key={asg.id}
                            type="button"
                            onClick={handleOpenAssignments}
                            className={`w-full p-3.5 text-right transition-colors hover:bg-white/[0.08] block ${
                              isUnread ? 'bg-amber-500/12' : 'bg-white/[0.045] backdrop-blur-xl'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 text-[11px]">
                              <span
                                className={`font-extrabold ${
                                  asg.priority === 'urgent'
                                    ? 'text-rose-300'
                                    : 'text-purple-300'
                                }`}
                              >
                                {asg.priority === 'urgent' ? 'مهم وعاجل' : 'تحضير يومي'} ·{' '}
                                {dateLabel}
                              </span>
                              <span className="text-slate-400 font-semibold">
                                {isDone ? 'مكتمل ✓' : isUnread ? 'جديد' : 'مقروء'}
                              </span>
                            </div>
                            <p className="mt-1 text-xs font-extrabold text-white line-clamp-1">
                              {asg.title}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-400 line-clamp-2 font-reading">
                              {asg.courseTitle || getAudienceLabel(asg.audience)} — {asg.details}
                            </p>
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div className="p-3 bg-white/[0.04] border-t border-purple-500/15">
                    <button
                      type="button"
                      onClick={handleOpenAssignments}
                      className="w-full min-h-[40px] rounded-xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 shadow-[0_8px_22px_-6px_rgba(147,51,234,0.65)] text-xs font-extrabold text-white hover:brightness-110 transition-colors"
                    >
                      عرض جدول التحاضير والواجبات الكامل
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Container (Generous bottom padding on mobile/tablet for Bottom Navigation) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-5 sm:py-7 pb-24 lg:pb-10 overflow-x-hidden">
        {toastMessage && (
          <div
            role="status"
            className="mb-5 flex items-center justify-between gap-3 rounded-xl bg-emerald-500/15 border border-emerald-400/35 px-4 py-3 text-sm font-semibold text-emerald-200"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-xs text-emerald-300 hover:underline"
            >
              إغلاق
            </button>
          </div>
        )}

        {/* Live Quiz Chat Room Full View (Auto-Locked if subscription expired > 35 days) */}
        {isLiveQuizChatOpen ? (
          subscription.isLocked ? (
            renderSubscriptionLockScreen('غرفة محادثة الكوزات المباشرة')
          ) : (
            <StudentLiveQuizChat onLeave={handleGoBack} />
          )
        ) : selectedCourse ? (
          subscription.isLocked ? (
            renderSubscriptionLockScreen(`دورة ${selectedCourse.title}`)
          ) : (
            <CourseDetailView
              course={selectedCourse}
              isEnrolled={currentUser.enrolledCourseIds.includes(selectedCourse.id)}
              initialTab={initialCourseTab}
              onBack={handleGoBack}
              onOpenActivation={() => setIsActivationOpen(true)}
            />
          )
        ) : activeTab === 'schedule' ? (
          <StudentScheduleView
            onBack={handleGoBack}
            onJoinLive={() => navigateToTab('live')}
          />
        ) : activeTab === 'cv' ? (
          <StudentTeacherCVView onBack={handleGoBack} onOpenInquiries={handleOpenInquiries} />
        ) : activeTab === 'complaints' ? (
          <StudentComplaintsView onBack={handleGoBack} />
        ) : activeTab === 'inquiries' ? (
          <StudentInquiriesView onBack={handleGoBack} />
        ) : activeTab === 'store' ? (
          <StudentStoreView onBack={handleGoBack} />
        ) : activeTab === 'payment' ? (
          <StudentPaymentView onBack={handleGoBack} />
        ) : activeTab === 'assignments' ? (
          <StudentAssignmentsView onBack={handleGoBack} />
        ) : activeTab === 'live' ? (
          subscription.isLocked ? (
            renderSubscriptionLockScreen('البث المباشر التفاعلي')
          ) : (
            <LiveClassroom onLeave={handleGoBack} onOpenSchedule={handleOpenSchedule} />
          )
        ) : activeTab === 'profile' ? (
          /* Student Profile Screen */
          <div className="max-w-3xl mx-auto space-y-6">
            <PlatformSubPageBar onBack={handleGoBack} sectionLabel="حسابي ونتائجي" />
            <div className="rounded-2xl bg-[#110D1F] text-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-purple-300">حساب الطالب الموثّق</p>
                <h1 className="mt-1 text-2xl font-extrabold">{currentUser.fullName}</h1>
                <p className="mt-1.5 text-sm text-slate-300">
                  {getTrackName(currentUser.track)} · {currentUser.subStage}
                  {currentUser.branch ? ` · فرع ${currentUser.branch}` : ''}
                  {currentUser.department ? ` · ${currentUser.department}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={logout}
                className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-purple-500/25 bg-white/5 px-4 py-2 text-sm font-bold text-white hover:bg-white/10 whitespace-nowrap"
              >
                <LogOut className="h-4 w-4 text-purple-300" />
                <span>تسجيل الخروج</span>
              </button>
            </div>

            <div className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 divide-y divide-purple-500/15">
              <div className="p-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-400">رقم الهاتف العراقي</p>
                    <p className="font-mono text-sm font-bold text-white tabular-nums" dir="ltr">
                      {currentUser.phone}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-emerald-300">مفعّل</span>
              </div>

              <div className="p-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-purple-300" />
                  <div>
                    <p className="text-xs text-slate-400">معرّف الجهاز المرتبط (Device Lock)</p>
                    <p className="font-mono text-sm font-bold text-white tabular-nums" dir="ltr">
                      {currentUser.deviceId ?? currentDeviceId}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-slate-400">مقفل على هذا الجهاز</span>
              </div>

              <div className="p-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-purple-300" />
                  <div>
                    <p className="text-xs text-slate-400">حالة الاشتراك الشهري</p>
                    <p
                      className={`text-sm font-extrabold mt-0.5 ${
                        subscription.isLocked
                          ? 'text-rose-300'
                          : subscription.status === 'grace_period'
                            ? 'text-purple-300'
                            : subscription.status === 'expiring_soon'
                              ? 'text-purple-300'
                              : 'text-emerald-300'
                      }`}
                    >
                      {subscription.label} · الاستحقاق{' '}
                      <span className="font-mono" dir="ltr">
                        {subscription.dueDate}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenPayment}
                  className="min-h-[42px] rounded-xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 px-4 text-xs font-extrabold text-white hover:brightness-105 whitespace-nowrap"
                >
                  الدفع الشهري
                </button>
              </div>

              <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Phone className="h-5 w-5 text-emerald-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-400">
                      رقم هاتف ولي الأمر (واتساب لمتابعة الحضور والمستوى)
                    </p>
                    {isEditingParentPhone ? (
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <input
                          type="tel"
                          inputMode="numeric"
                          dir="ltr"
                          maxLength={11}
                          value={parentPhoneInput}
                          onChange={(e) =>
                            setParentPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 11))
                          }
                          placeholder="07701234567"
                          className="min-h-[40px] w-44 rounded-xl border border-purple-500/25 px-3 font-mono text-sm font-bold text-white focus:border-purple-400 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleSaveParentPhone}
                          className="min-h-[40px] inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3.5 text-xs font-extrabold text-white hover:bg-emerald-700"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>حفظ</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingParentPhone(false)}
                          className="min-h-[40px] rounded-xl border border-purple-500/20 px-3 text-xs font-bold text-slate-300 hover:bg-white/[0.08]"
                        >
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <p className="font-mono text-sm font-bold text-white tabular-nums mt-0.5" dir="ltr">
                        {currentUser.parentPhone ? currentUser.parentPhone : 'غير مضاف بعد'}
                      </p>
                    )}
                  </div>
                </div>
                {!isEditingParentPhone && (
                  <button
                    type="button"
                    onClick={() => {
                      setParentPhoneInput(currentUser.parentPhone ?? '');
                      setIsEditingParentPhone(true);
                    }}
                    className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-purple-500/20 px-3.5 text-xs font-bold text-slate-200 hover:border-purple-400/60 hover:text-white whitespace-nowrap self-start sm:self-center"
                  >
                    <Pencil className="h-3.5 w-3.5 text-purple-300" />
                    <span>{currentUser.parentPhone ? 'تعديل الرقم' : 'إضافة رقم ولي الأمر'}</span>
                  </button>
                )}
              </div>

              <div className="p-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-400">الدورات المفعّلة في مسارك</p>
                  <p className="text-sm font-bold text-white tabular-nums mt-0.5">
                    {enrolledCourses.length} من أصل {trackCourses.length} دورات متاحة
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActivationOpen(true)}
                  className="min-h-[42px] rounded-xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 shadow-[0_8px_22px_-6px_rgba(147,51,234,0.65)] px-4 text-xs font-bold text-white hover:brightness-110 whitespace-nowrap"
                >
                  تفعيل كود جديد
                </button>
              </div>
            </div>

            {/* Automatic Attendance & Academic Performance Summary */}
            {myPerformance && (
              <section className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-extrabold text-white">
                      سجل الحضور التلقائي والمستوى الدراسي
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      يُحدَّث تلقائياً عند دخولك للبث المباشر أو مشاركتك في الكوزات اليومية.
                    </p>
                  </div>
                  <span className="text-xs font-extrabold text-purple-300">
                    {myPerformance.levelAssessment}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-emerald-500/12 border border-emerald-400/35 p-3.5 text-center">
                    <p className="text-[11px] font-bold text-emerald-200">مرات الحضور</p>
                    <p className="mt-1 font-mono text-xl font-extrabold text-emerald-200 tabular-nums">
                      {myPerformance.attendedCount}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/[0.04] border border-purple-500/20 p-3.5 text-center">
                    <p className="text-[11px] font-bold text-slate-300">الغياب المسجّل</p>
                    <p className="mt-1 font-mono text-xl font-extrabold text-white tabular-nums">
                      {myPerformance.absentCount}
                    </p>
                  </div>
                  <div className="rounded-xl bg-amber-500/12 border border-amber-400/35 p-3.5 text-center">
                    <p className="text-[11px] font-bold text-amber-200">متوسط الكوزات</p>
                    <p className="mt-1 font-mono text-xl font-extrabold text-white tabular-nums">
                      {myPerformance.averageScorePercentage !== null
                        ? `${myPerformance.averageScorePercentage}%`
                        : '—'}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Personal Live Quiz Chat Results History ("نتائجي") */}
            <section className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 overflow-hidden">
              <div className="px-5 py-4 border-b border-purple-500/15 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-purple-300" />
                  <h2 className="text-sm font-extrabold text-white">
                    نتائجي وإحصائيات محادثات الكوزات المباشرة ({myLiveQuizResults.length})
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleLaunchDemoLiveQuiz}
                  className="text-xs font-bold text-purple-300 hover:underline whitespace-nowrap"
                >
                  معاينة كوز مباشر
                </button>
              </div>

              {myLiveQuizResults.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 space-y-2">
                  <p>
                    لم تشارك بعد في أي جلسة محادثة كوزات مباشرة. فور انتهاء أي جلسة ستُحفظ نتيجتك ومستواك هنا تلقائياً.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-purple-500/15">
                  {myLiveQuizResults.map((res) => (
                    <div
                      key={res.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-extrabold text-purple-300">
                            {res.levelLabel} {res.medal ?? ''}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="font-semibold text-slate-200 tabular-nums">
                            المركز {res.rank} من {res.totalParticipants} طلاب
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="font-mono text-[11px] text-slate-400" dir="ltr">
                            {res.completedAt}
                          </span>
                        </div>
                        <p className="text-sm font-extrabold text-white">{res.sessionTitle}</p>
                        <p className="text-xs text-slate-400 tabular-nums">
                          الإجابات الصحيحة: {res.correctCount} من {res.totalQuestions} أسئلة · متوسط السرعة{' '}
                          {(res.avgResponseMs / 1000).toFixed(1)} ثانية
                        </p>
                      </div>
                      <span
                        className={`font-mono text-xl font-extrabold tabular-nums shrink-0 ${
                          res.percentage >= 80
                            ? 'text-emerald-300'
                            : res.percentage >= 50
                              ? 'text-purple-300'
                              : 'text-rose-300'
                        }`}
                      >
                        {res.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : (
          /* Home & Courses Views */
          <div className="space-y-7">
            {activeTab === 'courses' && (
              <PlatformSubPageBar onBack={handleGoBack} sectionLabel="دوراتي وموادي الدراسية" />
            )}

            {/* Breaking Announcement Banner (شريط الإعلانات العاجلة — Top of Student Home) */}
            {activeTab === 'home' && activeBreakingAnnouncement && (
              <section
                aria-label="إعلان عاجل من الأستاذة تبارك"
                className="rounded-2xl bg-[#110D1F] border-2 border-purple-400/70 p-4 sm:p-5 text-white shadow-md flex items-start gap-3.5"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 via-violet-600 to-fuchsia-600 text-white shrink-0">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-extrabold text-purple-300">
                      إعلان عاجل من الأستاذة تبارك الزيرجاوي
                    </span>
                    <span className="font-mono text-[11px] text-slate-400" dir="ltr">
                      {activeBreakingAnnouncement.updatedAt}
                    </span>
                  </div>
                  <p className="text-sm sm:text-base font-bold text-white leading-relaxed font-reading">
                    {activeBreakingAnnouncement.message}
                  </p>
                </div>
              </section>
            )}

            {/* Automatic Monthly Subscription Reminder / 5-Day Grace Period / 35-Day Auto-Lock Banner */}
            {activeTab === 'home' && subscription.status === 'expiring_soon' && (
              <section
                aria-label="تنبيه اقتراب موعد الدفع الشهري"
                className="rounded-2xl bg-amber-500/15 border-2 border-amber-400/40 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 text-white shrink-0">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-extrabold text-amber-200">
                      تذكير تلقائي بموعد الدفع الشهري
                    </p>
                    <h2 className="text-base font-extrabold text-white">
                      {subscription.daysUntilDue === 0
                        ? 'اليوم هو موعد استحقاق اشتراكك الشهري'
                        : `متبقي ${subscription.daysUntilDue} ${subscription.daysUntilDue === 1 ? 'يوم واحد' : 'أيام'} على موعد دفع الاشتراك الشهري`}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-200 font-reading">
                      موعد الاستحقاق المحدد من الأستاذة:{' '}
                      <strong className="font-mono" dir="ltr">
                        {subscription.dueDate}
                      </strong>{' '}
                      · قيمة الاشتراك {formatIqd(db.paymentSettings.monthlyFeeIqd)}. جدد مبكراً لضمان استمرار وصولك دون انقطاع.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenPayment}
                  className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 shadow-[0_8px_22px_-6px_rgba(147,51,234,0.65)] px-5 text-xs sm:text-sm font-extrabold text-purple-300 hover:brightness-110 whitespace-nowrap shrink-0"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>الانتقال للدفع الشهري</span>
                </button>
              </section>
            )}

            {activeTab === 'home' && subscription.status === 'grace_period' && (
              <section
                aria-label="تحذير فترة السماح"
                className="rounded-2xl bg-amber-500/15 border-2 border-orange-400 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-600 text-white shrink-0">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-extrabold text-amber-200">
                      تنبيه مهم · أنت في فترة السماح (5 أيام إضافية)
                    </p>
                    <h2 className="text-base font-extrabold text-white">
                      حسابك ما يزال مفتوحاً — متبقي {subscription.graceDaysRemaining}{' '}
                      {subscription.graceDaysRemaining === 1 ? 'يوم واحد' : 'أيام'} قبل القفل التلقائي
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-200 font-reading">
                      تجاوزت تاريخ الاستحقاق (
                      <span className="font-mono font-bold" dir="ltr">
                        {subscription.dueDate}
                      </span>
                      ). يمكنك متابعة المحاضرات والبث المباشر طيلة مهلة السماح حتى{' '}
                      <span className="font-mono font-bold text-amber-200" dir="ltr">
                        {subscription.graceEndDate}
                      </span>
                      ، وبعدها سيُقفل الحساب تلقائياً لحين التجديد.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenPayment}
                  className="min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 text-xs sm:text-sm font-extrabold text-white hover:bg-orange-700 whitespace-nowrap shrink-0"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>تجديد الاشتراك الآن</span>
                </button>
              </section>
            )}

            {activeTab === 'home' && subscription.isLocked && (
              <section
                aria-label="تنبيه قفل الاشتراك التلقائي"
                className="rounded-2xl bg-rose-500/15 border-2 border-red-400 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600 text-white shrink-0">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-extrabold text-rose-300">
                      انتهى الاشتراك ومهلة السماح (35 يوماً)
                    </p>
                    <h2 className="text-base font-extrabold text-white">
                      انتهى اشتراكك الشهري ومهلة السماح — تم قفل الدورات والبث المباشر تلقائياً
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-200 font-reading">
                      يرجى التحويل على بطاقة الأستاذة تبارك ورفع وصل التحويل أو إرساله عبر الواتساب لإعادة فتح حسابك فوراً.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleOpenPayment}
                    className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-xs sm:text-sm font-extrabold text-white hover:bg-red-700 whitespace-nowrap"
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>صفحة الدفع الشهري</span>
                  </button>
                  <a
                    href={whatsappPaymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs sm:text-sm font-extrabold text-white hover:bg-emerald-700 whitespace-nowrap"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>واتساب الأستاذة</span>
                  </a>
                </div>
              </section>
            )}

            {/* Active Live Quiz Chat Room Join Banner */}
            {activeTab === 'home' && canJoinLiveQuizRoom && (
              <section
                aria-label="دعوة للانضمام إلى محادثة الكوزات المباشرة"
                className="rounded-2xl bg-gradient-to-l from-[#1A1033] via-[#130C26] to-[#0E091D] border border-purple-400/70 p-5 sm:p-6 text-white shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                    <span className="inline-flex items-center gap-1.5 text-red-400">
                      <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                      <span>غرفة محادثة كوز مباشر مفتوحة الآن!</span>
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="inline-flex items-center gap-1 text-purple-300 tabular-nums">
                      <Users className="h-3.5 w-3.5" />
                      {liveQuizRoom.participants.length} طالب متصل الآن
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-white">
                    {liveQuizRoom.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 font-reading">
                    انضم فوراً للإجابة على أسئلة الأستاذة تبارك قبل انتهاء العداد التنازلي والتنافس على المستوى الأول!
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsLiveQuizChatOpen(true)}
                  className="min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 px-6 text-sm font-extrabold text-white hover:brightness-105 whitespace-nowrap shrink-0"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>انضمام لمحادثة الكوز</span>
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </section>
            )}

            {/* Prominent Glowing Live Broadcast Banner (Shown immediately when live is active) */}
            {activeTab === 'home' && liveSession.isLive && (
              <section
                aria-label="إعلان البث المباشر"
                className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-[#1A1033] via-[#130C26] to-[#0E091D] border border-purple-400/50 p-5 sm:p-7 text-white shadow-lg shadow-slate-900/15"
              >
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2.5 text-xs font-bold">
                      <span className="inline-flex items-center gap-1.5 text-red-400">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                        <span>بث مباشر جاري الآن</span>
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="text-purple-300">
                        {getTrackName(liveSession.track)} ({liveSession.subStage})
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="inline-flex items-center gap-1 text-slate-200 tabular-nums">
                        <Users className="h-3.5 w-3.5 text-purple-300" />
                        {liveSession.connectedCount} طالب متصل الآن
                      </span>
                    </div>

                    <h2 className="text-lg sm:text-2xl font-extrabold text-white leading-snug">
                      {liveSession.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 font-reading">
                      {isLiveForMyTrack
                        ? 'هذا البث المباشر مخصص لمرحلتك الدراسية — يمكنك الدخول الآن ورفع اليد للمشاركة مع الأستاذة تبارك.'
                        : 'يوجد بث مباشر فعال حالياً على المنصة، يمكنك المعاينة والانضمام مباشرة.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigateToTab('live')}
                    className="min-h-[48px] inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 px-6 py-3 text-sm font-extrabold text-white shadow-md transition-transform hover:brightness-105 active:scale-[0.98] whitespace-nowrap shrink-0"
                  >
                    <Radio className="h-4 w-4" />
                    <span>دخول البث المباشر</span>
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                </div>
              </section>
            )}

            {/* Prominent Urgent Today Assignment Alert on Student Home */}
            {activeTab === 'home' && urgentTodayAssignments.length > 0 && (
              <section
                aria-label="تنبيه تحضير عاجل لليوم"
                className="rounded-2xl bg-amber-500/12 border border-amber-400/40 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-700 text-white shrink-0">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-extrabold text-rose-300">
                        تحضير مهم وعاجل لليوم
                      </span>
                      <span className="text-purple-300">·</span>
                      <span className="font-bold text-slate-100">
                        {urgentTodayAssignments[0].courseTitle ||
                          getAudienceLabel(urgentTodayAssignments[0].audience)}
                      </span>
                      {urgentTodayAssignments.length > 1 && (
                        <>
                          <span className="text-purple-300">·</span>
                          <span className="font-bold text-rose-300 tabular-nums">
                            +{urgentTodayAssignments.length - 1} تحضير عاجل آخر
                          </span>
                        </>
                      )}
                    </div>
                    <h2 className="mt-1 text-base font-extrabold text-white">
                      {urgentTodayAssignments[0].title}
                    </h2>
                    <p className="mt-0.5 text-xs sm:text-sm text-slate-200 font-reading line-clamp-2">
                      {urgentTodayAssignments[0].details}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickCompleteAssignment(
                        urgentTodayAssignments[0].id,
                        urgentTodayAssignments[0].title
                      )
                    }
                    className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 shadow-[0_8px_22px_-6px_rgba(147,51,234,0.65)] px-4 text-xs font-extrabold text-white hover:brightness-110 whitespace-nowrap"
                  >
                    <CheckCircle2 className="h-4 w-4 text-purple-300" />
                    <span>تم إكمال التحضير</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenAssignments}
                    className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-400 bg-white/[0.045] backdrop-blur-xl px-4 text-xs font-extrabold text-white hover:bg-amber-100/60 whitespace-nowrap"
                  >
                    <ClipboardList className="h-4 w-4 text-purple-300" />
                    <span>جدول التحاضير ({stageAssignments.length})</span>
                  </button>
                </div>
              </section>
            )}

            {/* Welcome & Quick Activation Strip */}
            <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-purple-500/20 pb-5">
              <div>
                <p className="text-xs font-semibold text-purple-300">
                  {getTrackName(currentUser.track)} · {currentUser.subStage}
                  {currentUser.branch ? ` · فرع ${currentUser.branch}` : ''}
                  {currentUser.department ? ` · ${currentUser.department}` : ''}
                </p>
                <h1 className="mt-1 text-xl sm:text-2xl font-extrabold text-white">
                  {activeTab === 'home'
                    ? `أهلاً بك، ${currentUser.fullName.split(' ')[0]}`
                    : 'دوراتي وموادي الدراسية'}
                </h1>
                <p className="mt-1 text-sm text-slate-400">
                  {currentUser.track === 'vocational'
                    ? 'دورات وملازم وزارية مخصصة للسادس المهني (بفروعه وأقسامه المتنوعة) بالإضافة إلى الرابع والخامس المهني.'
                    : 'تظهر لك فقط المواد والدورات المخصصة لمسارك الدراسي المعزول.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <a
                  href={whatsappSupportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-2.5 text-xs sm:text-sm font-extrabold text-emerald-100 hover:bg-emerald-500/25 hover:border-emerald-300/60 shadow-[0_0_20px_-6px_rgba(16,185,129,0.45)] transition-all whitespace-nowrap"
                >
                  <MessageCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>تواصل مع الدعم (واتساب)</span>
                </a>
                <button
                  type="button"
                  onClick={handleOpenSchedule}
                  className="min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl border border-purple-400/70 bg-amber-500/12 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-amber-500/20 transition-colors whitespace-nowrap"
                >
                  <CalendarClock className="h-4 w-4 text-purple-300" />
                  <span>جدول البث ({myWeeklySlots.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsActivationOpen(true)}
                  className="min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 shadow-[0_8px_22px_-6px_rgba(147,51,234,0.65)] px-5 py-2.5 text-sm font-bold text-white hover:brightness-110 transition-colors whitespace-nowrap"
                >
                  <KeyRound className="h-4 w-4 text-purple-300" />
                  <span>تفعيل كود دورة</span>
                </button>
              </div>
            </section>

            {/* Ready-to-Take Timed Quiz & Live Quiz Chat Spotlight */}
            {activeTab === 'home' && (
              <section className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-purple-300 shrink-0">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div>
                    {featuredQuizItem ? (
                      <>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <span className="font-bold text-purple-300">كوز إلكتروني متاح الآن</span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">
                            المدة: {featuredQuizItem.quiz.timeLimitMinutes} دقائق
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">
                            {featuredQuizItem.attemptsCount} طالب في لوحة الشرف
                          </span>
                        </div>
                        <h2 className="mt-1 text-base font-extrabold text-white">
                          {featuredQuizItem.quiz.title}
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {featuredQuizItem.course.title} — تصحيح تلقائي وترتيب فوري في لوحة المستويات.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs font-bold text-purple-300">
                          غرفة محادثة الكوزات المباشرة
                        </p>
                        <h2 className="mt-1 text-base font-extrabold text-white">
                          تنافس مع زملائك في الإجابة السريعة المباشرة
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                          أسئلة مؤقّتة بالثواني مع إحصائيات تلقائية ولوحة مستويات فورية داخل المحادثة.
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleLaunchDemoLiveQuiz}
                    className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 px-4 text-xs sm:text-sm font-extrabold text-white hover:brightness-105 transition-all whitespace-nowrap"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>معاينة محادثة كوز مباشر</span>
                  </button>
                  {featuredQuizItem && (
                    <button
                      type="button"
                      onClick={() => handleOpenCourse(featuredQuizItem.course.id, 'quizzes')}
                      className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 shadow-[0_8px_22px_-6px_rgba(147,51,234,0.65)] px-4 text-xs sm:text-sm font-bold text-white hover:brightness-110 transition-colors whitespace-nowrap"
                    >
                      <ClipboardCheck className="h-4 w-4 text-purple-300" />
                      <span>دخول الكوز</span>
                    </button>
                  )}
                </div>
              </section>
            )}

            {/* Isolated Track Courses Grid */}
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center justify-between sm:justify-start gap-3">
                  <h2 className="text-base sm:text-lg font-extrabold text-white">
                    {activeTab === 'courses'
                      ? `الدورات المتاحة والمفعّلة (${enrolledCourses.length})`
                      : currentUser.track === 'vocational'
                        ? 'دورات السادس المهني والإعدادية المهنية'
                        : `دورات ${getTrackName(currentUser.track)}`}
                  </h2>
                  <span className="text-xs text-slate-400 tabular-nums">
                    {activeTab === 'courses' ? enrolledCourses.length : trackCourses.length} مواد
                  </span>
                </div>

                {trackSpecializations.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setBranchFilter('all')}
                      className={`min-h-[38px] rounded-xl px-3 text-xs font-bold transition-colors whitespace-nowrap ${
                        branchFilter === 'all'
                          ? 'bg-[#110D1F] text-white'
                          : 'bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 text-slate-200 hover:border-purple-400/50'
                      }`}
                    >
                      الكل
                    </button>
                    {trackSpecializations.map((br) => (
                      <button
                        key={br}
                        type="button"
                        onClick={() => setBranchFilter(br)}
                        className={`min-h-[38px] rounded-xl px-3 text-xs font-bold transition-colors whitespace-nowrap ${
                          branchFilter === br
                            ? 'bg-[#110D1F] text-white'
                            : 'bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 text-slate-200 hover:border-purple-400/50'
                        }`}
                      >
                        {br}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {(activeTab === 'courses' ? enrolledCourses : trackCourses).length === 0 ? (
                <div className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-8 text-center">
                  <p className="text-sm font-bold text-slate-100">
                    لم تقم بتفعيل أي دورة بعد في هذا المسار.
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    اضغط على «تفعيل كود دورة» وأدخل الكود المطبوع على كارت الاشتراك لفتح المحاضرات فوراً.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsActivationOpen(true)}
                    className="mt-4 min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 shadow-[0_8px_22px_-6px_rgba(147,51,234,0.65)] px-5 text-xs font-bold text-white"
                  >
                    <KeyRound className="h-4 w-4 text-purple-300" />
                    <span>تفعيل كود دورة أو محاضرة</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {(activeTab === 'courses' ? enrolledCourses : trackCourses).map((course) => {
                    const isEnrolled = currentUser.enrolledCourseIds.includes(course.id);
                    const coursePrice = course.priceIqd ?? 0;
                    const isFreeCourse = coursePrice === 0;
                    const isFullAccess = isEnrolled || isFreeCourse;
                    const individualUnlockedCount = course.lessons.filter((l) =>
                      unlockedLessonIds.includes(l.id)
                    ).length;
                    const freeLessonsCount = course.lessons.filter(
                      (l) => (l.priceIqd ?? 0) === 0
                    ).length;
                    const watchedCount = course.lessons.filter((l) =>
                      watchedIds.includes(l.id)
                    ).length;

                    return (
                      <article
                        key={course.id}
                        className="group rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 overflow-hidden flex flex-col transition-all hover:border-purple-400/55 hover:shadow-[0_14px_38px_-14px_rgba(124,58,237,0.45)]"
                      >
                        <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#110D1F]">
                          <SafeImage
                            src={course.coverImage}
                            alt={course.title}
                            fallbackTitle={course.title}
                            badgeText={course.subStage}
                            category="course"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />
                          <div className="absolute top-3 left-3">
                            <span
                              className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-extrabold shadow-sm ${
                                isFreeCourse
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-[#110D1F]/95 text-purple-300 border border-purple-400/40'
                              }`}
                            >
                              {isFreeCourse ? 'مجانية' : formatIqd(coursePrice)}
                            </span>
                          </div>
                          <div className="absolute bottom-3 right-4 left-4 flex items-center justify-between gap-2 text-xs text-white">
                            <span className="font-semibold text-purple-300 truncate">
                              {course.subStage}
                              {course.branch ? ` · ${course.branch}` : ''}
                            </span>
                            <span className="font-mono text-[11px] text-slate-200 tabular-nums shrink-0">
                              {course.lessons.length} محاضرات
                            </span>
                          </div>
                        </div>

                        <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span
                                className={`inline-flex items-center gap-1 font-bold ${
                                  subscription.isLocked && isFullAccess
                                    ? 'text-rose-300'
                                    : isFullAccess
                                      ? 'text-emerald-300'
                                      : individualUnlockedCount > 0
                                        ? 'text-sky-300'
                                        : 'text-purple-300'
                                }`}
                              >
                                {subscription.isLocked && isFullAccess ? (
                                  <>
                                    <Lock className="h-3.5 w-3.5" />
                                    <span>مقفول — انتهى الاشتراك الشهري</span>
                                  </>
                                ) : isFullAccess ? (
                                  <>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>{isFreeCourse ? 'دورة مجانية مفتوحة' : 'مفعّلة ومفتوحة'}</span>
                                  </>
                                ) : individualUnlockedCount > 0 ? (
                                  <>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>مفتوح {individualUnlockedCount} محاضرة فردية</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="h-3.5 w-3.5" />
                                    <span>السعر: {formatIqd(coursePrice)}</span>
                                  </>
                                )}
                              </span>
                              <span className="text-slate-400 tabular-nums">{course.totalHours}</span>
                            </div>

                            <h3 className="text-base font-extrabold text-white leading-snug">
                              {course.title}
                            </h3>
                            <p className="text-xs text-slate-300 leading-relaxed font-reading line-clamp-2">
                              {course.subtitle}
                            </p>
                          </div>

                          <div className="space-y-3 pt-3 border-t border-purple-500/15">
                            <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                              <span>
                                {course.notes.length} ملازم PDF · {course.quizzes.length} اختبارات
                              </span>
                              {isFullAccess && course.lessons.length > 0 ? (
                                <span className="font-mono text-slate-200 font-semibold tabular-nums">
                                  {watchedCount}/{course.lessons.length} مكتمل
                                </span>
                              ) : !isFullAccess && freeLessonsCount > 0 ? (
                                <span className="font-bold text-emerald-300 tabular-nums">
                                  {freeLessonsCount} محاضرة مجانية
                                </span>
                              ) : null}
                            </div>

                            {isFullAccess ? (
                              <button
                                type="button"
                                onClick={() => handleOpenCourse(course.id)}
                                className={`w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl px-4 text-xs sm:text-sm font-bold transition-colors ${
                                  subscription.isLocked
                                    ? 'bg-rose-500/15 text-rose-200 border border-rose-400/40 hover:bg-rose-500/25'
                                    : 'bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 shadow-[0_8px_22px_-6px_rgba(147,51,234,0.65)] text-white hover:brightness-110'
                                }`}
                              >
                                <span>
                                  {subscription.isLocked
                                    ? 'مقفول — تجديد الاشتراك الشهري'
                                    : 'دخول الدورة والمحاضرات'}
                                </span>
                                {subscription.isLocked ? (
                                  <Lock className="h-4 w-4" />
                                ) : (
                                  <ArrowLeft className="h-4 w-4" />
                                )}
                              </button>
                            ) : (
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenCourse(course.id)}
                                  className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-purple-500/25 bg-white/[0.045] backdrop-blur-xl px-3 text-xs font-bold text-white hover:border-purple-400/60 transition-colors"
                                >
                                  <span>عرض المحاضرات</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setIsActivationOpen(true)}
                                  className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500/15 border border-amber-400/40 px-3 text-xs font-extrabold text-white hover:bg-amber-500/25 transition-colors"
                                >
                                  <KeyRound className="h-3.5 w-3.5 text-purple-300" />
                                  <span>تفعيل كود</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* Mobile & Tablet Fixed Bottom Navigation Bar (iPhone Safari + Android APK Safe Area) */}
      <nav
        aria-label="التنقل السفلي"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#110D1F]/95 backdrop-blur-md border-t border-purple-500/20 pb-safe px-safe"
      >
        <div className="grid grid-cols-6 h-16 items-center">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id && !selectedCourse && !isLiveQuizChatOpen;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setIsLiveQuizChatOpen(false);
                  setSelectedCourseId(null);
                  navigateToTab(item.id);
                  if (item.id === 'profile' && unreadLiveQuizResults.length > 0) {
                    markLiveQuizResultsRead(unreadLiveQuizResults.map((r) => r.id));
                  }
                }}
                className={`relative min-h-[48px] flex flex-col items-center justify-center gap-1 transition-colors px-0.5 ${
                  isActive ? 'text-white' : 'text-slate-400'
                }`}
              >
                <div className="relative">
                  <Icon
                    className={`h-5 w-5 ${isActive ? 'text-purple-300' : 'text-slate-400'}`}
                  />
                  {item.id === 'live' && liveSession.isLive && (
                    <span className="absolute -top-0.5 -left-1 h-2 w-2 rounded-full bg-red-500" />
                  )}
                  {item.id === 'assignments' && unreadAssignments.length > 0 && (
                    <span className="absolute -top-1.5 -left-2 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-[9px] font-extrabold text-white flex items-center justify-center font-mono tabular-nums">
                      {unreadAssignments.length > 9 ? '9+' : unreadAssignments.length}
                    </span>
                  )}
                  {item.id === 'profile' && unreadLiveQuizResults.length > 0 && (
                    <span className="absolute -top-1.5 -left-2 min-w-[16px] h-4 px-1 rounded-full bg-emerald-600 text-[9px] font-extrabold text-white flex items-center justify-center font-mono tabular-nums">
                      {unreadLiveQuizResults.length}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] leading-none whitespace-nowrap ${isActive ? 'font-extrabold' : 'font-medium'}`}>
                  {item.mobileLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Activation Code Bottom Sheet / Modal */}
      <ActivationCodeModal
        isOpen={isActivationOpen}
        onClose={() => setIsActivationOpen(false)}
        onActivated={handleActivated}
      />
    </div>
  );
};
