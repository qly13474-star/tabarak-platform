import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivationCode,
  AdminPermissionKey,
  ArabicWeekday,
  AssignmentAudience,
  AssignmentPriority,
  AttendanceRecord,
  AttendanceSource,
  BreakingAnnouncement,
  ComplaintCategory,
  ComplaintStatus,
  Course,
  DailyAssignment,
  LiveQuizQuestionCard,
  LiveQuizRoomSession,
  LiveShareMode,
  LiveSession,
  PaymentSettings,
  Quiz,
  QuizAttempt,
  QuizQuestion,
  RenewalRequest,
  StoreDeliverySettings,
  StoreItem,
  StoreItemCategory,
  StoreOrder,
  StoreOrderStatus,
  StudentComplaint,
  StudentInquiry,
  StudentLiveQuizResult,
  TeacherCV,
  TrackId,
  TrackOption,
  UserProfile,
  WeeklyLiveSlot,
} from '../types';
import {
  createDefaultLesson,
  createDefaultPdfNote,
  createRandomActivationCode,
  getAudienceLabel,
  getRelativeDateISO,
  getTrackCover,
  getTrackForAudience,
  getTrackLabel,
  loadDatabase,
  PlatformDatabase,
  resetDatabase,
  saveDatabase,
} from '../services/platformData';
import { computeNextMonthDueDate } from '../utils/subscription';
import { getDeliveryFeeForGovernorate } from '../utils/store';
import {
  formatCurrentTimeHHMM,
  loadLiveSession,
  saveLiveSession,
} from '../services/livekit';
import {
  buildSimulatedParticipants,
  computeLiveQuizLeaderboard,
  createIdleLiveQuizRoom,
  DEMO_LIVE_QUIZ_QUESTIONS,
  getAudienceForStudent,
  isLiveQuizRoomForStudent,
  loadLiveQuizRoom,
  saveLiveQuizRoom,
} from '../services/liveQuizChat';
import { getCurrentDeviceId, simulateNewDeviceId, validateIraqiPhone } from '../services/deviceLock';
import {
  ActiveAppMode,
  IS_PREVIEW_MODE,
  IS_STRICT_STUDENT_BUILD,
  USE_BACKEND_API,
  USE_FIREBASE_CLIENT_DIRECT,
  resolveActiveAppModeFromLocation,
} from '../config/appMode';
import {
  canAdminDelete,
  hasAdminPermission,
  isSuperAdminUser,
} from '../utils/adminPermissions';
import {
  clearDeviceLockInFirestore,
  deleteActivationCodeFromFirestore,
  deleteAssignmentFromFirestore,
  deleteComplaintFromFirestore,
  deleteCourseFromFirestore,
  deleteInquiryFromFirestore,
  deleteStoreItemFromFirestore,
  deleteStoreOrderFromFirestore,
  deleteTrackFromFirestore,
  deleteUserFromFirestore,
  deleteWeeklySlotFromFirestore,
  fetchPlatformSnapshotFromFirestore,
  isFirebaseLiveConfigured,
  registerStudentInFirebase,
  signInSuperAdminViaServer,
  signInWithPhonePassword,
  signOutFromFirebase,
  subscribeToFirebaseAuth,
  subscribeToPlatformRealtime,
  syncActivationCodeToFirestore,
  syncAssignmentToFirestore,
  syncAttendanceToFirestore,
  syncComplaintToFirestore,
  syncCourseToFirestore,
  syncInquiryToFirestore,
  syncLiveQuizRoomToFirestore,
  syncStoreItemToFirestore,
  syncStoreOrderToFirestore,
  syncSupportWhatsappNumberToFirestore,
  syncTrackToFirestore,
  syncUserProfileToFirestore,
  syncWeeklySlotToFirestore,
  updateStoreOrderStatusInFirestore,
  verifySuperAdminPinOnServer,
} from '../lib/firebase';

export interface DeviceLockViolation {
  studentId: string;
  studentName: string;
  phone: string;
  registeredDeviceId: string;
  attemptedDeviceId: string;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  deviceLockViolation?: DeviceLockViolation;
}

interface RegisterInput {
  fullName: string;
  phone: string;
  parentPhone?: string;
  password: string;
  track: TrackId;
  subStage: string;
  branch?: string;
  department?: string;
}

interface PlatformContextValue {
  db: PlatformDatabase;
  liveSession: LiveSession;
  currentUser: UserProfile | null;
  activeAppMode: ActiveAppMode;
  isPreviewMode: boolean;
  isFirebaseLive: boolean;
  authAccessToken: string | null;
  refreshFromFirestore: () => Promise<void>;
  currentDeviceId: string;
  deviceLockViolation: DeviceLockViolation | null;
  clearDeviceLockViolation: () => void;
  rotateSimulatedDeviceId: () => string;

  // Auth
  login: (phone: string, password: string, overrideDeviceId?: string) => Promise<AuthResult>;
  registerStudent: (input: RegisterInput) => Promise<AuthResult>;
  logout: () => void;
  updateMyParentPhone: (parentPhone: string) => { success: boolean; error?: string };
  updateStudentParentPhone: (studentId: string, parentPhone: string) => { success: boolean; error?: string };

  // Student Actions
  redeemCode: (codeInput: string) => { success: boolean; message: string; courseTitle?: string };
  markLessonWatched: (lessonId: string) => void;
  saveQuizAttempt: (attempt: QuizAttempt) => void;
  recordStudentAttendance: (input: {
    studentId?: string;
    source: AttendanceSource;
    sessionKey: string;
    title: string;
  }) => void;

  // Live Classroom Actions (Shared between Student & Teacher Studio)
  toggleMyRaiseHand: () => void;
  sendLiveChatMessage: (text: string) => void;
  startLiveBroadcast: (payload: {
    title: string;
    track: TrackId;
    subStage: string;
    branch?: string;
    subject?: string;
    courseId: string;
  }) => void;
  endLiveBroadcast: () => void;
  setLiveShareMode: (mode: LiveShareMode) => void;
  setLiveSlideIndex: (index: number) => void;
  toggleParticipantMic: (participantId: string) => void;
  muteAllParticipants: () => void;
  simulateIncomingRaiseHand: () => void;

  // Admin Management & Sub-Admins (Moderators) Actions
  isSuperAdmin: boolean;
  canDelete: boolean;
  hasPermission: (permission: AdminPermissionKey) => boolean;
  verifyTeacherPin: (pin: string, requireSuperAdmin?: boolean) => Promise<boolean>;
  getTrackName: (trackId: TrackId) => string;
  addModerator: (input: {
    fullName: string;
    adminRoleTitle: string;
    loginIdentifier: string;
    password: string;
    permissions: AdminPermissionKey[];
  }) => { success: boolean; error?: string; moderator?: UserProfile };
  updateModerator: (
    moderatorId: string,
    updates: {
      fullName?: string;
      adminRoleTitle?: string;
      loginIdentifier?: string;
      password?: string;
      permissions?: AdminPermissionKey[];
    }
  ) => { success: boolean; error?: string };
  toggleModeratorActive: (moderatorId: string) => void;
  deleteModerator: (moderatorId: string) => void;

  // Dynamic Stages, Classes, Branches & Subjects Management
  addTrack: (input: {
    label: string;
    shortLabel?: string;
    description?: string;
    subStages: string[];
    branches?: string[];
    departments?: string[];
    subjects?: string[];
    specializationLabel?: string;
  }) => TrackOption;
  updateTrack: (trackId: TrackId, updates: Partial<Omit<TrackOption, 'id'>>) => void;
  deleteTrack: (trackId: TrackId) => void;

  generateCodes: (input: {
    courseId: string;
    lessonId?: string;
    count: number;
    priceIqd: number;
  }) => ActivationCode[];
  deleteActivationCode: (codeId: string) => void;

  toggleStudentActive: (studentId: string) => void;
  resetStudentDevice: (studentId: string) => void;
  updateStudentProfile: (
    studentId: string,
    updates: {
      fullName?: string;
      phone?: string;
      track?: TrackId;
      subStage?: string;
      branch?: string;
      department?: string;
    }
  ) => { success: boolean; error?: string };
  deleteStudent: (studentId: string) => void;

  addNewCourse: (input: {
    title: string;
    subtitle: string;
    track: TrackId;
    subStage: string;
    branch?: string;
    subject?: string;
    description: string;
    totalHours: string;
    priceIqd: number;
    coverImage?: string;
  }) => Course;
  updateCourse: (
    courseId: string,
    updates: Partial<
      Pick<
        Course,
        'title' | 'subtitle' | 'track' | 'subStage' | 'branch' | 'subject' | 'description' | 'totalHours' | 'priceIqd'
      >
    >
  ) => void;
  deleteCourse: (courseId: string) => void;

  addLessonToCourse: (
    courseId: string,
    input: { title: string; duration: string; videoUrl: string; description: string; priceIqd: number }
  ) => void;
  updateLessonInCourse: (
    courseId: string,
    lessonId: string,
    updates: {
      title?: string;
      duration?: string;
      videoUrl?: string;
      description?: string;
      priceIqd?: number;
    }
  ) => void;
  deleteLessonFromCourse: (courseId: string, lessonId: string) => void;

  addPdfToCourse: (
    courseId: string,
    input: { title: string; fileUrl: string; pageCount: number }
  ) => void;
  updatePdfInCourse: (
    courseId: string,
    noteId: string,
    updates: { title?: string; fileUrl?: string; pageCount?: number }
  ) => void;
  deletePdfFromCourse: (courseId: string, noteId: string) => void;
  addQuizToCourse: (
    courseId: string,
    input: {
      title: string;
      timeLimitMinutes: number;
      questions: Omit<QuizQuestion, 'id'>[];
    }
  ) => Quiz;
  updateQuizInCourse: (
    courseId: string,
    quizId: string,
    updates: {
      title?: string;
      timeLimitMinutes?: number;
      questions?: Omit<QuizQuestion, 'id'>[];
    }
  ) => void;
  deleteQuizFromCourse: (courseId: string, quizId: string) => void;

  createAssignment: (input: {
    title: string;
    details: string;
    audience: AssignmentAudience;
    track?: TrackId;
    subStage?: string;
    branch?: string;
    subject?: string;
    courseId?: string;
    dueDate: string;
    priority: AssignmentPriority;
  }) => DailyAssignment;
  updateAssignment: (
    assignmentId: string,
    input: {
      title: string;
      details: string;
      audience: AssignmentAudience;
      track?: TrackId;
      subStage?: string;
      branch?: string;
      subject?: string;
      courseId?: string;
      dueDate: string;
      priority: AssignmentPriority;
    }
  ) => void;
  deleteAssignment: (assignmentId: string) => void;
  toggleAssignmentCompleted: (assignmentId: string) => void;
  markAssignmentNotificationsRead: (assignmentIds: string[]) => void;

  // Live Quiz Chat Room Actions
  liveQuizRoom: LiveQuizRoomSession;
  startLiveQuizRoom: (input: {
    title: string;
    audience: AssignmentAudience;
    track?: TrackId;
    subStage?: string;
    branch?: string;
    subject?: string;
    courseId?: string;
    durationMinutes: number;
    defaultQuestionSeconds: number;
    isDemoPreview?: boolean;
  }) => void;
  startDemoLiveQuizPreview: () => void;
  sendLiveQuizQuestion: (input: {
    question: string;
    options: string[];
    correctIndex: number;
    durationSeconds: number;
  }) => void;
  submitLiveQuizAnswer: (questionId: string, selectedIndex: number) => void;
  endLiveQuizRoom: () => void;
  resetLiveQuizRoom: () => void;
  markLiveQuizResultsRead: (resultIds: string[]) => void;

  // Weekly Live Schedule Actions
  addWeeklySlot: (input: {
    dayOfWeek: ArabicWeekday;
    timeLabel: string;
    track: TrackId;
    subStage: string;
    branch?: string;
    subject: string;
    note?: string;
  }) => WeeklyLiveSlot;
  updateWeeklySlot: (
    slotId: string,
    updates: Partial<Omit<WeeklyLiveSlot, 'id' | 'createdAt'>>
  ) => void;
  deleteWeeklySlot: (slotId: string) => void;

  // Breaking Announcement Banner Actions
  updateBreakingAnnouncement: (
    updates: Partial<Omit<BreakingAnnouncement, 'id' | 'updatedAt'>>
  ) => void;
  toggleBreakingAnnouncement: () => void;

  // Monthly Payments & Subscriptions Actions
  updatePaymentSettings: (updates: Partial<PaymentSettings>) => void;
  updateStudentDueDate: (studentId: string, newDueDate: string) => void;
  renewStudentSubscription: (studentId: string, customDueDate?: string) => string;
  submitRenewalRequest: (input: {
    receiptImageDataUrl: string;
    receiptFileName?: string;
    note?: string;
  }) => RenewalRequest | null;
  approveRenewalRequest: (requestId: string, customDueDate?: string) => void;
  rejectRenewalRequest: (requestId: string) => void;

  // Printed Booklets & Predictions Store Actions
  addStoreItem: (input: {
    title: string;
    subject: string;
    track: TrackId;
    subStage: string;
    branch?: string;
    category: StoreItemCategory;
    description: string;
    priceIqd: number;
    coverImage?: string;
    pagesInfo?: string;
    inStock?: boolean;
  }) => StoreItem;
  updateStoreItem: (
    itemId: string,
    updates: Partial<
      Omit<StoreItem, 'id' | 'createdAt'>
    >
  ) => void;
  deleteStoreItem: (itemId: string) => void;
  updateStoreDeliverySettings: (updates: Partial<StoreDeliverySettings>) => void;
  createStoreOrder: (input: {
    itemId: string;
    studentName: string;
    phone: string;
    governorate: string;
    address: string;
    quantity: number;
  }) => StoreOrder | null;
  updateStoreOrderStatus: (orderId: string, status: StoreOrderStatus) => void;
  deleteStoreOrder: (orderId: string) => void;

  // Platform Settings (Dynamic WhatsApp Support Number)
  updateSupportWhatsappNumber: (phone: string) => Promise<{ success: boolean; error?: string }>;

  // Teacher CV, Complaints & Inquiries Actions
  updateTeacherCV: (cv: Omit<TeacherCV, 'updatedAt'>) => void;
  submitComplaint: (input: {
    category: ComplaintCategory;
    details: string;
    isPrivateToAdmin: boolean;
  }) => StudentComplaint | null;
  replyToComplaint: (complaintId: string, replyText: string, markResolved?: boolean) => void;
  updateComplaintStatus: (complaintId: string, status: ComplaintStatus) => void;
  deleteComplaint: (complaintId: string) => void;
  markComplaintRepliesRead: (complaintIds: string[]) => void;
  submitInquiry: (input: { title: string; details: string }) => StudentInquiry | null;
  replyToInquiry: (inquiryId: string, replyText: string) => void;
  deleteInquiry: (inquiryId: string) => void;
  markInquiryRepliesRead: (inquiryIds: string[]) => void;

  resetDemoPlatform: () => void;
}

const SESSION_USER_KEY = 'tabarak_academy_current_user_id_v1';

const PlatformContext = createContext<PlatformContextValue | null>(null);

export const PlatformProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<PlatformDatabase>(() => loadDatabase());
  const [liveSession, setLiveSession] = useState<LiveSession>(() => loadLiveSession());
  const [liveQuizRoom, setLiveQuizRoom] = useState<LiveQuizRoomSession>(() => loadLiveQuizRoom());
  const simTimeoutsRef = useRef<number[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string>(() => getCurrentDeviceId());
  const [activeAppMode, setActiveAppMode] = useState<ActiveAppMode>(() =>
    resolveActiveAppModeFromLocation()
  );
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(SESSION_USER_KEY);
  });
  // Keep Firebase ID token / Admin token strictly in JS memory (never written to localStorage)
  const [authAccessToken, setAuthAccessToken] = useState<string | null>(null);
  const [firebaseAuthUid, setFirebaseAuthUid] = useState<string | null>(null);
  const [deviceLockViolation, setDeviceLockViolation] = useState<DeviceLockViolation | null>(null);
  const isFirebaseLive = isFirebaseLiveConfigured();

  // Keep Firebase Auth state & ID token synchronized in memory
  useEffect(() => {
    if (!isFirebaseLive) return;
    const unsub = subscribeToFirebaseAuth((fbUser) => {
      if (fbUser) {
        setFirebaseAuthUid(fbUser.uid);
        void fbUser
          .getIdToken()
          .then((token) => {
            if (token) setAuthAccessToken(token);
          })
          .catch(() => {});
      } else {
        setFirebaseAuthUid(null);
      }
    });
    return () => unsub();
  }, [isFirebaseLive]);

  const refreshFromFirestore = useCallback(async () => {
    if (!isFirebaseLiveConfigured()) return;
    try {
      const snapshot = await fetchPlatformSnapshotFromFirestore({
        role: activeAppMode === 'admin' ? 'admin' : 'student',
        userId: firebaseAuthUid || currentUserId || undefined,
      });
      if (!snapshot) return;
      setDb((prev) => ({
        ...prev,
        users: snapshot.users && snapshot.users.length > 0 ? snapshot.users : prev.users,
        courses: snapshot.courses && snapshot.courses.length > 0 ? snapshot.courses : prev.courses,
        storeOrders: snapshot.storeOrders ?? prev.storeOrders,
        attendanceRecords: snapshot.attendanceRecords ?? prev.attendanceRecords,
        tracks: snapshot.tracks && snapshot.tracks.length > 0 ? snapshot.tracks : prev.tracks,
        storeItems:
          snapshot.storeItems && snapshot.storeItems.length > 0 ? snapshot.storeItems : prev.storeItems,
        supportWhatsappNumber: snapshot.supportWhatsappNumber || prev.supportWhatsappNumber,
        weeklySchedule:
          snapshot.weeklySchedule && snapshot.weeklySchedule.length > 0
            ? snapshot.weeklySchedule
            : prev.weeklySchedule,
        assignments:
          snapshot.assignments && snapshot.assignments.length > 0
            ? snapshot.assignments
            : prev.assignments,
        activationCodes:
          snapshot.activationCodes && snapshot.activationCodes.length > 0
            ? snapshot.activationCodes
            : prev.activationCodes,
        complaints:
          snapshot.complaints && snapshot.complaints.length > 0
            ? snapshot.complaints
            : prev.complaints,
        inquiries:
          snapshot.inquiries && snapshot.inquiries.length > 0 ? snapshot.inquiries : prev.inquiries,
      }));
    } catch {
      // Keep cached/local state if Firestore network call fails
    }
  }, [activeAppMode, currentUserId, firebaseAuthUid]);

  // Real-time Cloud Firestore listeners (onSnapshot) for live catalog, orders, attendance, users, & live quiz room
  useEffect(() => {
    if (!isFirebaseLive) return;
    const activeRole =
      firebaseAuthUid && currentUserId
        ? activeAppMode === 'admin'
          ? 'admin'
          : 'student'
        : null;

    const unsubscribe = subscribeToPlatformRealtime({
      authUid: firebaseAuthUid,
      role: activeRole,
      callbacks: {
        onTracks: (tracks) => {
          setDb((prev) => ({ ...prev, tracks }));
        },
        onCourses: (courses) => {
          setDb((prev) => ({ ...prev, courses }));
        },
        onStoreItems: (storeItems) => {
          setDb((prev) => ({ ...prev, storeItems }));
        },
        onSupportWhatsappNumber: (supportWhatsappNumber) => {
          setDb((prev) => ({ ...prev, supportWhatsappNumber }));
        },
        onWeeklySchedule: (weeklySchedule) => {
          setDb((prev) => ({ ...prev, weeklySchedule }));
        },
        onAssignments: (assignments) => {
          setDb((prev) => ({ ...prev, assignments }));
        },
        onActivationCodes: (activationCodes) => {
          setDb((prev) => ({ ...prev, activationCodes }));
        },
        onComplaints: (complaints) => {
          setDb((prev) => ({ ...prev, complaints }));
        },
        onInquiries: (inquiries) => {
          setDb((prev) => ({ ...prev, inquiries }));
        },
        onUsers: (users) => {
          setDb((prev) => ({ ...prev, users }));
        },
        onCurrentUserProfile: (profile) => {
          setDb((prev) => {
            const exists = prev.users.some((u) => u.id === profile.id);
            return {
              ...prev,
              users: exists
                ? prev.users.map((u) => (u.id === profile.id ? { ...u, ...profile } : u))
                : [profile, ...prev.users],
            };
          });
        },
        onStoreOrders: (storeOrders) => {
          setDb((prev) => ({ ...prev, storeOrders }));
        },
        onAttendanceRecords: (attendanceRecords) => {
          setDb((prev) => ({ ...prev, attendanceRecords }));
        },
        onLiveQuizRoom: (room) => {
          setLiveQuizRoom(room);
        },
      },
    });

    return () => unsubscribe();
  }, [isFirebaseLive, firebaseAuthUid, currentUserId, activeAppMode]);

  const clearSimulatedAnswerTimers = useCallback(() => {
    simTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
    simTimeoutsRef.current = [];
  }, []);

  useEffect(() => {
    return () => clearSimulatedAnswerTimers();
  }, [clearSimulatedAnswerTimers]);

  useEffect(() => {
    saveDatabase(db);
  }, [db]);

  useEffect(() => {
    saveLiveSession(liveSession);
  }, [liveSession]);

  useEffect(() => {
    saveLiveQuizRoom(liveQuizRoom);
  }, [liveQuizRoom]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (currentUserId) {
      window.localStorage.setItem(SESSION_USER_KEY, currentUserId);
    } else {
      window.localStorage.removeItem(SESSION_USER_KEY);
    }
  }, [currentUserId]);

  const currentUser = useMemo(() => {
    const found = db.users.find((u) => u.id === currentUserId) ?? null;
    if (!found) return null;
    // Enforce strict build-mode isolation: never expose admin user in student mode or student user in admin mode
    if (activeAppMode === 'student' && found.role !== 'student') return null;
    if (activeAppMode === 'admin' && found.role !== 'admin') return null;
    if (found.role === 'admin' && !found.isActive) return null;
    return found;
  }, [db.users, currentUserId, activeAppMode]);

  const isSuperAdmin = useMemo(() => isSuperAdminUser(currentUser), [currentUser]);
  const canDelete = useMemo(() => canAdminDelete(currentUser), [currentUser]);
  const hasPermission = useCallback(
    (permission: AdminPermissionKey) => hasAdminPermission(currentUser, permission),
    [currentUser]
  );

  // Sync dedicated admin route (/admin or #/admin) dynamically on navigation
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncRouteMode = () => {
      const nextMode = resolveActiveAppModeFromLocation();
      setActiveAppMode(nextMode);
      setDeviceLockViolation(null);
    };
    window.addEventListener('hashchange', syncRouteMode);
    window.addEventListener('popstate', syncRouteMode);
    return () => {
      window.removeEventListener('hashchange', syncRouteMode);
      window.removeEventListener('popstate', syncRouteMode);
    };
  }, []);

  // Keep current student synced inside LiveSession participants list when live
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'student' || !liveSession.isLive) return;
    setLiveSession((prev) => {
      const exists = prev.participants.some((p) => p.id === currentUser.id);
      if (exists) return prev;
      return {
        ...prev,
        participants: [
          {
            id: currentUser.id,
            name: currentUser.fullName,
            phone: currentUser.phone,
            handRaised: false,
            micAllowed: false,
            joinedAt: formatCurrentTimeHHMM(),
            isCurrentUser: true,
          },
          ...prev.participants,
        ],
      };
    });
  }, [currentUser, liveSession.isLive]);

  // Keep current student registered inside Live Quiz Chat Room when active
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'student' || liveQuizRoom.status !== 'active') return;
    if (!isLiveQuizRoomForStudent(liveQuizRoom, currentUser)) return;
    setLiveQuizRoom((prev) => {
      if (prev.status !== 'active') return prev;
      if (prev.participants.some((p) => p.id === currentUser.id)) return prev;
      return {
        ...prev,
        participants: [
          {
            id: currentUser.id,
            name: currentUser.fullName,
            phone: currentUser.phone,
            joinedAt: formatCurrentTimeHHMM(),
            isSimulated: false,
          },
          ...prev.participants,
        ],
      };
    });
  }, [currentUser, liveQuizRoom.status, liveQuizRoom.id]);

  const clearDeviceLockViolation = () => setDeviceLockViolation(null);

  const rotateSimulatedDeviceId = () => {
    const next = simulateNewDeviceId();
    setCurrentDeviceId(next);
    return next;
  };

  const login = async (
    rawIdentifier: string,
    password: string,
    overrideDeviceId?: string
  ): Promise<AuthResult> => {
    const cleanInput = rawIdentifier.trim();
    if (!cleanInput) {
      return {
        success: false,
        error:
          activeAppMode === 'admin'
            ? 'يرجى إدخال رقم الهاتف أو اسم المستخدم.'
            : 'يرجى إدخال رقم الهاتف العراقي.',
      };
    }
    if (!password.trim()) {
      return { success: false, error: 'يرجى إدخال كلمة المرور.' };
    }

    const activeDevice = overrideDeviceId || currentDeviceId;

    // Helper to activate a verified admin/super-admin user and open AdminDashboardShell directly
    const activateAdminSession = (adminUser: UserProfile, token?: string | null): AuthResult => {
      if (IS_STRICT_STUDENT_BUILD || activeAppMode !== 'admin') {
        return {
          success: false,
          error: 'هذا التطبيق مخصص لحسابات الطلبة فقط.',
        };
      }
      setAuthAccessToken(token ?? null);
      setDb((prev) => {
        const exists = prev.users.some((u) => u.id === adminUser.id);
        return {
          ...prev,
          users: exists
            ? prev.users.map((u) => (u.id === adminUser.id ? { ...u, ...adminUser } : u))
            : [adminUser, ...prev.users],
        };
      });
      setDeviceLockViolation(null);
      setActiveAppMode('admin');
      setCurrentUserId(adminUser.id);
      if (isFirebaseLiveConfigured()) {
        void refreshFromFirestore();
      }
      return { success: true };
    };

    // 1) Optional Server-Verified Super Admin Login (only when a backend API is explicitly enabled)
    if (USE_BACKEND_API && activeAppMode === 'admin' && !IS_STRICT_STUDENT_BUILD) {
      const serverAdminRes = await signInSuperAdminViaServer({
        identifier: cleanInput,
        password: password.trim(),
      });
      if (serverAdminRes.success && serverAdminRes.user) {
        return activateAdminSession(serverAdminRes.user, serverAdminRes.accessToken);
      }
    }

    // 2) Direct Firebase Client SDK Authentication & Cloud Firestore Hydration (Primary path on GitHub Pages)
    if (USE_FIREBASE_CLIENT_DIRECT && isFirebaseLiveConfigured()) {
      let normalizedIdentifier = cleanInput;
      if (activeAppMode === 'student') {
        const phoneCheck = validateIraqiPhone(cleanInput);
        if (!phoneCheck.valid) {
          return { success: false, error: phoneCheck.error };
        }
        normalizedIdentifier = phoneCheck.normalized;
      }

      const fbResult = await signInWithPhonePassword({
        identifier: normalizedIdentifier,
        password: password.trim(),
        mode: activeAppMode,
        strictStudentOnly: IS_STRICT_STUDENT_BUILD,
        deviceId: activeDevice,
      });

      if (!fbResult.success || !fbResult.user) {
        if (fbResult.deviceLockViolation) {
          setDeviceLockViolation(fbResult.deviceLockViolation);
        }
        return {
          success: false,
          error: fbResult.error || 'رقم الهاتف أو كلمة المرور غير صحيحة.',
          deviceLockViolation: fbResult.deviceLockViolation,
        };
      }

      const authenticatedUser = fbResult.user;
      if (authenticatedUser.role === 'admin') {
        return activateAdminSession(authenticatedUser, fbResult.accessToken);
      }

      setAuthAccessToken(fbResult.accessToken ?? null);
      setDb((prev) => {
        const exists = prev.users.some((u) => u.id === authenticatedUser.id);
        return {
          ...prev,
          users: exists
            ? prev.users.map((u) => (u.id === authenticatedUser.id ? authenticatedUser : u))
            : [authenticatedUser, ...prev.users],
        };
      });
      setDeviceLockViolation(null);
      setCurrentUserId(authenticatedUser.id);
      void refreshFromFirestore();
      return { success: true };
    }

    // 3) Interactive local fallback when Firebase is disabled
    let found: UserProfile | undefined;

    if (activeAppMode === 'admin') {
      const normalizedDigits = cleanInput.replace(/\D/g, '');
      const normalizedLower = cleanInput.toLowerCase();
      found = db.users.find(
        (u) =>
          u.role === 'admin' &&
          !isSuperAdminUser(u) &&
          ((u.username && u.username.toLowerCase() === normalizedLower) ||
            u.phone === cleanInput ||
            (normalizedDigits.length >= 9 && u.phone === normalizedDigits))
      );
      if (!found || !found.password || found.password !== password.trim()) {
        return {
          success: false,
          error: 'بيانات الدخول غير صحيحة. تحققي من اسم المستخدم/الهاتف وكلمة المرور.',
        };
      }
    } else {
      const phoneCheck = validateIraqiPhone(cleanInput);
      if (!phoneCheck.valid) {
        return { success: false, error: phoneCheck.error };
      }
      found = db.users.find((u) => u.phone === phoneCheck.normalized);
      if (!found || !found.password || found.password !== password.trim()) {
        return { success: false, error: 'رقم الهاتف أو كلمة المرور غير صحيحة.' };
      }
    }

    if (IS_STRICT_STUDENT_BUILD && found.role !== 'student') {
      return {
        success: false,
        error: 'هذا التطبيق مخصص لحسابات الطلبة فقط.',
      };
    }

    if (activeAppMode === 'admin' && found.role !== 'admin') {
      return {
        success: false,
        error: 'هذه البوابة مخصصة لإدارة المنصة والمشرفين المعتمدين فقط.',
      };
    }

    if (!found.isActive) {
      return {
        success: false,
        error:
          found.role === 'admin'
            ? 'تم إيقاف حساب المشرف مؤقتاً من قبل السوبر أدمن (الأستاذة تبارك).'
            : 'تم تعليق هذا الحساب مؤقتاً من قبل الإدارة. يرجى التواصل مع الأستاذة تبارك الزيرجاوي.',
      };
    }

    if (found.role === 'admin') {
      return activateAdminSession(found, null);
    }

    if (found.role === 'student') {
      if (found.deviceId && found.deviceId !== activeDevice) {
        const violation: DeviceLockViolation = {
          studentId: found.id,
          studentName: found.fullName,
          phone: found.phone,
          registeredDeviceId: found.deviceId,
          attemptedDeviceId: activeDevice,
        };
        setDeviceLockViolation(violation);
        return {
          success: false,
          error: 'هذا الحساب مرتبط بجهاز آخر.',
          deviceLockViolation: violation,
        };
      }

      // Bind device on first login or after admin reset
      if (!found.deviceId) {
        setDb((prev) => ({
          ...prev,
          users: prev.users.map((u) =>
            u.id === found.id
              ? { ...u, deviceId: activeDevice, lastLoginAt: `اليوم ${formatCurrentTimeHHMM()}` }
              : u
          ),
        }));
      }
    }

    setDeviceLockViolation(null);
    setCurrentUserId(found.id);
    return { success: true };
  };

  const registerStudent = async (input: RegisterInput): Promise<AuthResult> => {
    if (input.fullName.trim().length < 4) {
      return { success: false, error: 'يرجى إدخال الاسم الثلاثي الكامل.' };
    }
    const phoneCheck = validateIraqiPhone(input.phone);
    if (!phoneCheck.valid) {
      return { success: false, error: phoneCheck.error };
    }
    if (input.password.length < 6) {
      return { success: false, error: 'يجب أن تتكون كلمة المرور من 6 أحرف أو أرقام على الأقل.' };
    }

    let normalizedParentPhone: string | undefined;
    if (input.parentPhone && input.parentPhone.trim()) {
      const parentCheck = validateIraqiPhone(input.parentPhone);
      if (!parentCheck.valid) {
        return {
          success: false,
          error: 'رقم هاتف ولي الأمر غير صحيح. يرجى إدخال رقم عراقي يبدأ بـ 07 (11 رقماً) أو تركه فارغاً.',
        };
      }
      normalizedParentPhone = parentCheck.normalized;
    }

    const newUser: UserProfile = {
      id: `stu-${Date.now()}`,
      fullName: input.fullName.trim(),
      phone: phoneCheck.normalized,
      parentPhone: normalizedParentPhone,
      password: isFirebaseLiveConfigured() ? '' : input.password,
      role: 'student',
      track: input.track,
      subStage: input.subStage,
      branch: input.branch || undefined,
      department: input.department || undefined,
      deviceId: currentDeviceId,
      isActive: true,
      enrolledCourseIds: [],
      unlockedLessonIds: [],
      subscriptionDueDate: getRelativeDateISO(30),
      createdAt: new Date().toISOString().slice(0, 10),
      lastLoginAt: `اليوم ${formatCurrentTimeHHMM()}`,
    };

    if (isFirebaseLiveConfigured()) {
      const fbReg = await registerStudentInFirebase({
        user: newUser,
        password: input.password,
      });
      if (!fbReg.success || !fbReg.user) {
        return { success: false, error: fbReg.error || 'تعذر تسجيل الطالب في Firebase.' };
      }
      setAuthAccessToken(fbReg.accessToken ?? null);
      setDb((prev) => ({
        ...prev,
        users: [fbReg.user!, ...prev.users.filter((u) => u.id !== fbReg.user!.id)],
      }));
      setDeviceLockViolation(null);
      setCurrentUserId(fbReg.user.id);
      void refreshFromFirestore();
      return { success: true };
    }

    const duplicate = db.users.some((u) => u.phone === phoneCheck.normalized);
    if (duplicate) {
      return { success: false, error: 'رقم الهاتف مسجّل مسبقاً في المنصة. يمكنك تسجيل الدخول مباشرة.' };
    }

    setDb((prev) => ({
      ...prev,
      users: [newUser, ...prev.users],
    }));
    setDeviceLockViolation(null);
    setCurrentUserId(newUser.id);
    return { success: true };
  };

  const updateStudentParentPhone = (
    studentId: string,
    rawPhone: string
  ): { success: boolean; error?: string } => {
    const trimmed = rawPhone.trim();
    if (!trimmed) {
      setDb((prev) => ({
        ...prev,
        users: prev.users.map((u) => {
          if (u.id !== studentId) return u;
          const updated = { ...u, parentPhone: undefined };
          if (isFirebaseLiveConfigured()) {
            void syncUserProfileToFirestore(updated);
          }
          return updated;
        }),
      }));
      return { success: true };
    }
    const check = validateIraqiPhone(trimmed);
    if (!check.valid) {
      return {
        success: false,
        error: 'يرجى إدخال رقم واتساب عراقي صحيح لولي الأمر يبدأ بـ 07 ويتكون من 11 رقماً.',
      };
    }
    setDb((prev) => ({
      ...prev,
      users: prev.users.map((u) => {
        if (u.id !== studentId) return u;
        const updated = { ...u, parentPhone: check.normalized };
        if (isFirebaseLiveConfigured()) {
          void syncUserProfileToFirestore(updated);
        }
        return updated;
      }),
    }));
    return { success: true };
  };

  const updateMyParentPhone = (rawPhone: string): { success: boolean; error?: string } => {
    if (!currentUser) return { success: false, error: 'يرجى تسجيل الدخول أولاً.' };
    return updateStudentParentPhone(currentUser.id, rawPhone);
  };

  const logout = () => {
    setAuthAccessToken(null);
    setCurrentUserId(null);
    setActiveAppMode(resolveActiveAppModeFromLocation());
    if (isFirebaseLiveConfigured()) {
      void signOutFromFirebase();
    }
  };

  const redeemCode = (codeInput: string) => {
    if (!currentUser || currentUser.role !== 'student') {
      return { success: false, message: 'يرجى تسجيل الدخول بحساب طالب لتفعيل الكود.' };
    }
    const normalized = codeInput.trim().toUpperCase();
    if (!normalized) {
      return { success: false, message: 'يرجى إدخال كود التفعيل المطبوع على الكارت.' };
    }

    const codeEntry = db.activationCodes.find((c) => c.code.toUpperCase() === normalized);
    if (!codeEntry) {
      return { success: false, message: 'كود التفعيل غير صحيح. تأكد من الأحرف والأرقام وحاول مرة أخرى.' };
    }
    if (codeEntry.isUsed) {
      return { success: false, message: 'هذا الكود مستخدم مسبقاً ولا يمكن إعادة تفعيله.' };
    }

    const targetCourse = db.courses.find((c) => c.id === codeEntry.courseId);
    if (!targetCourse) {
      return { success: false, message: 'الدورة المرتبطة بهذا الكود غير متوفرة حالياً.' };
    }
    if (targetCourse.track !== currentUser.track) {
      return {
        success: false,
        message: 'هذا الكود مخصص لمرحلة دراسية مختلفة عن مسارك المسجّل في المنصة.',
      };
    }

    const isLessonCode = codeEntry.targetType === 'lesson' && Boolean(codeEntry.lessonId);
    const today = new Date().toISOString().slice(0, 10);

    if (isLessonCode && codeEntry.lessonId) {
      const targetLesson = targetCourse.lessons.find((l) => l.id === codeEntry.lessonId);
      const alreadyUnlocked =
        currentUser.enrolledCourseIds.includes(targetCourse.id) ||
        (currentUser.unlockedLessonIds ?? []).includes(codeEntry.lessonId);
      if (alreadyUnlocked) {
        return { success: false, message: 'هذه المحاضرة مفتوحة مسبقاً في حسابك.' };
      }

      setDb((prev) => ({
        ...prev,
        activationCodes: prev.activationCodes.map((c) =>
          c.id === codeEntry.id
            ? {
                ...c,
                isUsed: true,
                usedByStudentId: currentUser.id,
                usedByStudentName: currentUser.fullName,
                usedByPhone: currentUser.phone,
                usedAt: today,
              }
            : c
        ),
        users: prev.users.map((u) =>
          u.id === currentUser.id
            ? {
                ...u,
                unlockedLessonIds: Array.from(
                  new Set([...(u.unlockedLessonIds ?? []), codeEntry.lessonId as string])
                ),
              }
            : u
        ),
      }));

      const lessonLabel = targetLesson?.title || codeEntry.lessonTitle || 'المحاضرة المختارة';
      return {
        success: true,
        message: `تم فتح المحاضرة «${lessonLabel}» من دورة «${targetCourse.title}» بنجاح!`,
        courseTitle: lessonLabel,
      };
    }

    if (currentUser.enrolledCourseIds.includes(targetCourse.id)) {
      return { success: false, message: 'هذه الدورة مفعّلة مسبقاً في حسابك.' };
    }

    setDb((prev) => ({
      ...prev,
      activationCodes: prev.activationCodes.map((c) =>
        c.id === codeEntry.id
          ? {
              ...c,
              isUsed: true,
              usedByStudentId: currentUser.id,
              usedByStudentName: currentUser.fullName,
              usedByPhone: currentUser.phone,
              usedAt: today,
            }
          : c
      ),
      users: prev.users.map((u) =>
        u.id === currentUser.id
          ? { ...u, enrolledCourseIds: [...u.enrolledCourseIds, targetCourse.id] }
          : u
      ),
    }));

    return {
      success: true,
      message: `تم تفعيل دورة «${targetCourse.title}» بنجاح! يمكنك البدء بالمشاهدة الآن.`,
      courseTitle: targetCourse.title,
    };
  };

  const markLessonWatched = (lessonId: string) => {
    if (!currentUser) return;
    setDb((prev) => {
      const existing = prev.watchedLessons[currentUser.id] ?? [];
      if (existing.includes(lessonId)) return prev;
      return {
        ...prev,
        watchedLessons: {
          ...prev.watchedLessons,
          [currentUser.id]: [...existing, lessonId],
        },
      };
    });
  };

  const recordStudentAttendance = useCallback(
    (input: {
      studentId?: string;
      source: AttendanceSource;
      sessionKey: string;
      title: string;
    }) => {
      const targetStudentId = input.studentId || currentUser?.id;
      if (!targetStudentId) return;
      const targetUser = db.users.find((u) => u.id === targetStudentId);
      if (targetUser && targetUser.role !== 'student') return;

      const dateISO = getRelativeDateISO(0);
      const timestamp = formatCurrentTimeHHMM();

      setDb((prev) => {
        const exists = prev.attendanceRecords.some(
          (r) =>
            r.studentId === targetStudentId &&
            r.source === input.source &&
            r.sessionKey === input.sessionKey
        );
        if (exists) return prev;
        const record: AttendanceRecord = {
          id: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          studentId: targetStudentId,
          source: input.source,
          sessionKey: input.sessionKey,
          title: input.title,
          dateISO,
          timestamp,
        };
        if (isFirebaseLiveConfigured()) {
          void syncAttendanceToFirestore(record);
        }
        return {
          ...prev,
          attendanceRecords: [record, ...prev.attendanceRecords],
        };
      });
    },
    [currentUser?.id, db.users]
  );

  const saveQuizAttempt = (attempt: QuizAttempt) => {
    const course = db.courses.find((c) => c.id === attempt.courseId);
    const quiz = course?.quizzes.find((q) => q.id === attempt.quizId);
    const dateISO = getRelativeDateISO(0);
    const timestamp = formatCurrentTimeHHMM();

    setDb((prev) => {
      // Keep the latest attempt per student per quiz so leaderboard stays clean and up-to-date
      const filtered = prev.quizAttempts.filter(
        (a) => !(a.quizId === attempt.quizId && a.studentId === attempt.studentId)
      );
      const hasAttendance = prev.attendanceRecords.some(
        (r) =>
          r.studentId === attempt.studentId &&
          r.source === 'course_quiz' &&
          r.sessionKey === attempt.quizId
      );
      const nextAttendance = hasAttendance
        ? prev.attendanceRecords
        : [
            {
              id: `att-q-${Date.now()}`,
              studentId: attempt.studentId,
              source: 'course_quiz' as AttendanceSource,
              sessionKey: attempt.quizId,
              title: quiz ? `كوز: ${quiz.title}` : 'كوز إلكتروني',
              dateISO,
              timestamp,
            },
            ...prev.attendanceRecords,
          ];
      return {
        ...prev,
        quizAttempts: [attempt, ...filtered],
        attendanceRecords: nextAttendance,
      };
    });
  };

  // Live Classroom handlers
  const toggleMyRaiseHand = () => {
    if (!currentUser) return;
    setLiveSession((prev) => {
      const found = prev.participants.find((p) => p.id === currentUser.id);
      if (found) {
        return {
          ...prev,
          participants: prev.participants.map((p) =>
            p.id === currentUser.id ? { ...p, handRaised: !p.handRaised } : p
          ),
        };
      }
      return {
        ...prev,
        participants: [
          {
            id: currentUser.id,
            name: currentUser.fullName,
            phone: currentUser.phone,
            handRaised: true,
            micAllowed: false,
            joinedAt: formatCurrentTimeHHMM(),
            isCurrentUser: true,
          },
          ...prev.participants,
        ],
      };
    });
  };

  const sendLiveChatMessage = (text: string) => {
    if (!currentUser || !text.trim()) return;
    setLiveSession((prev) => ({
      ...prev,
      chatMessages: [
        ...prev.chatMessages,
        {
          id: `msg-${Date.now()}`,
          senderName: currentUser.fullName,
          senderRole: currentUser.role,
          text: text.trim(),
          timestamp: formatCurrentTimeHHMM(),
        },
      ],
    }));
  };

  const startLiveBroadcast = (payload: {
    title: string;
    track: TrackId;
    subStage: string;
    branch?: string;
    subject?: string;
    courseId: string;
  }) => {
    const nowTime = formatCurrentTimeHHMM();
    setLiveSession((prev) => ({
      ...prev,
      id: `live-${Date.now()}`,
      isLive: true,
      title: payload.title.trim() || 'محاضرة بث مباشر تفاعلية',
      track: payload.track,
      subStage: payload.subStage,
      branch: payload.branch || undefined,
      subject: payload.subject || undefined,
      courseId: payload.courseId,
      startedAt: nowTime,
      connectedCount: Math.max(prev.connectedCount, 84),
      shareMode: 'slides',
      activeSlideIndex: 0,
      allMuted: true,
      lastAnnouncement: {
        id: `ann-${Date.now()}`,
        message: `إشعار فوري: بدأت الأستاذة تبارك بثاً مباشراً بعنوان «${payload.title.trim() || 'محاضرة بث مباشر'}»`,
        timestamp: nowTime,
      },
      chatMessages: [
        ...prev.chatMessages,
        {
          id: `msg-sys-${Date.now()}`,
          senderName: 'الأستاذة تبارك الزيرجاوي',
          senderRole: 'admin',
          text: `تم بدء البث المباشر الآن (${payload.title.trim() || 'محاضرة جديدة'}). أهلاً بالجميع!`,
          timestamp: nowTime,
        },
      ],
    }));
  };

  const endLiveBroadcast = () => {
    setLiveSession((prev) => ({
      ...prev,
      isLive: false,
      participants: prev.participants.map((p) => ({ ...p, micAllowed: false, handRaised: false })),
    }));
  };

  const setLiveShareMode = (mode: LiveShareMode) => {
    setLiveSession((prev) => ({ ...prev, shareMode: mode }));
  };

  const setLiveSlideIndex = (index: number) => {
    setLiveSession((prev) => ({ ...prev, activeSlideIndex: index }));
  };

  const toggleParticipantMic = (participantId: string) => {
    setLiveSession((prev) => ({
      ...prev,
      allMuted: false,
      participants: prev.participants.map((p) =>
        p.id === participantId ? { ...p, micAllowed: !p.micAllowed } : p
      ),
    }));
  };

  const muteAllParticipants = () => {
    setLiveSession((prev) => ({
      ...prev,
      allMuted: true,
      participants: prev.participants.map((p) => ({ ...p, micAllowed: false })),
    }));
  };

  const simulateIncomingRaiseHand = () => {
    const names = [
      { name: 'رقية عباس الموسوي', phone: '07716629011' },
      { name: 'حسين فلاح الشمري', phone: '07823309145' },
      { name: 'شهد محمود العاني', phone: '07705412890' },
    ];
    const picked = names[Math.floor(Math.random() * names.length)];
    setLiveSession((prev) => ({
      ...prev,
      connectedCount: Math.min(prev.maxCapacity, prev.connectedCount + 1),
      participants: [
        {
          id: `p-sim-${Date.now()}`,
          name: picked.name,
          phone: picked.phone,
          handRaised: true,
          micAllowed: false,
          joinedAt: formatCurrentTimeHHMM(),
        },
        ...prev.participants,
      ],
    }));
  };

  // Admin management handlers
  const verifyTeacherPin = async (pin: string, requireSuperAdmin = false): Promise<boolean> => {
    const cleanPin = pin.trim();
    if (!cleanPin) return false;
    // Always verify Super Admin PIN on the server via constant-time scrypt check with Bearer auth
    const superAdminIdentity = currentUser?.phone || currentUser?.username || undefined;
    const isSuperPinValid = await verifySuperAdminPinOnServer(
      cleanPin,
      authAccessToken,
      superAdminIdentity
    );
    if (isSuperPinValid) {
      return true;
    }
    if (requireSuperAdmin) return false;
    // Allow sub-admins who have explicit delete permission to confirm with their own password
    if (
      currentUser &&
      currentUser.role === 'admin' &&
      !isSuperAdminUser(currentUser) &&
      canAdminDelete(currentUser) &&
      currentUser.password
    ) {
      return cleanPin === currentUser.password;
    }
    return false;
  };

  // Super Admin ONLY: Sub-Admins & Moderators CRUD
  const addModerator = (input: {
    fullName: string;
    adminRoleTitle: string;
    loginIdentifier: string;
    password: string;
    permissions: AdminPermissionKey[];
  }): { success: boolean; error?: string; moderator?: UserProfile } => {
    if (!isSuperAdminUser(currentUser)) {
      return { success: false, error: 'هذه الصلاحية محصورة بحساب السوبر أدمن (الأستاذة تبارك) فقط.' };
    }
    const cleanName = input.fullName.trim();
    const cleanRole = input.adminRoleTitle.trim();
    const cleanLogin = input.loginIdentifier.trim();
    const cleanPassword = input.password.trim();

    if (cleanName.length < 3) {
      return { success: false, error: 'يرجى إدخال الاسم الكامل للمشرف.' };
    }
    if (!cleanRole) {
      return { success: false, error: 'يرجى كتابة المسمى الوظيفي / الدور للمشرف.' };
    }
    if (cleanLogin.length < 3) {
      return { success: false, error: 'يرجى إدخال اسم مستخدم (3 أحرف على الأقل) أو رقم هاتف صحيح.' };
    }
    if (cleanPassword.length < 4) {
      return { success: false, error: 'يجب أن تتكون كلمة المرور / رمز الدخول من 4 أحرف على الأقل.' };
    }
    if (input.permissions.length === 0) {
      return { success: false, error: 'يرجى تحديد صلاحية واحدة على الأقل للمشرف.' };
    }

    const isPhone = /^07\d{9}$/.test(cleanLogin.replace(/\D/g, '')) && /^\d+$/.test(cleanLogin.replace(/\s+/g, ''));
    const normalizedPhone = isPhone ? cleanLogin.replace(/\D/g, '') : '';
    const normalizedUsername = isPhone ? undefined : cleanLogin.toLowerCase();

    const duplicate = db.users.some(
      (u) =>
        (normalizedPhone && u.phone === normalizedPhone) ||
        (normalizedUsername && u.username?.toLowerCase() === normalizedUsername) ||
        u.phone.toLowerCase() === cleanLogin.toLowerCase()
    );
    if (duplicate) {
      return { success: false, error: 'اسم المستخدم أو رقم الهاتف مسجّل مسبقاً لحساب آخر.' };
    }

    const newModerator: UserProfile = {
      id: `mod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      fullName: cleanName,
      phone: normalizedPhone || cleanLogin,
      username: normalizedUsername,
      password: cleanPassword,
      role: 'admin',
      isSuperAdmin: false,
      adminRoleTitle: cleanRole,
      permissions: Array.from(new Set(input.permissions)),
      track: db.tracks[0]?.id ?? 'intermediate',
      subStage: 'فريق الإدارة والإشراف',
      deviceId: null,
      isActive: true,
      enrolledCourseIds: [],
      createdAt: new Date().toISOString().slice(0, 10),
      lastLoginAt: 'لم يسجل دخول بعد',
    };

    setDb((prev) => ({
      ...prev,
      users: [newModerator, ...prev.users],
    }));
    if (isFirebaseLiveConfigured()) {
      void syncUserProfileToFirestore(newModerator);
    }

    return { success: true, moderator: newModerator };
  };

  const updateModerator = (
    moderatorId: string,
    updates: {
      fullName?: string;
      adminRoleTitle?: string;
      loginIdentifier?: string;
      password?: string;
      permissions?: AdminPermissionKey[];
    }
  ): { success: boolean; error?: string } => {
    if (!isSuperAdminUser(currentUser)) {
      return { success: false, error: 'تعديل المشرفين محصور بحساب السوبر أدمن فقط.' };
    }
    const target = db.users.find((u) => u.id === moderatorId && u.role === 'admin' && !isSuperAdminUser(u));
    if (!target) {
      return { success: false, error: 'تعذر العثور على حساب المشرف.' };
    }

    const nextName = updates.fullName !== undefined ? updates.fullName.trim() : target.fullName;
    const nextRole = updates.adminRoleTitle !== undefined ? updates.adminRoleTitle.trim() : target.adminRoleTitle ?? '';
    const nextPassword =
      updates.password !== undefined && updates.password.trim() !== ''
        ? updates.password.trim()
        : target.password;
    const nextPerms = updates.permissions ?? target.permissions ?? [];

    if (nextName.length < 3) {
      return { success: false, error: 'يرجى إدخال اسم المشرف الكامل.' };
    }
    if (!nextRole) {
      return { success: false, error: 'يرجى كتابة المسمى الوظيفي / الدور للمشرف.' };
    }
    if (nextPassword.length < 4) {
      return { success: false, error: 'كلمة المرور يجب أن لا تقل عن 4 أحرف.' };
    }
    if (nextPerms.length === 0) {
      return { success: false, error: 'يرجى إبقاء صلاحية واحدة على الأقل للمشرف.' };
    }

    let nextPhone = target.phone;
    let nextUsername = target.username;

    if (updates.loginIdentifier !== undefined) {
      const cleanLogin = updates.loginIdentifier.trim();
      if (cleanLogin.length < 3) {
        return { success: false, error: 'يرجى إدخال اسم مستخدم أو رقم هاتف صالح.' };
      }
      const isPhone = /^07\d{9}$/.test(cleanLogin.replace(/\D/g, '')) && /^\d+$/.test(cleanLogin.replace(/\s+/g, ''));
      const normalizedPhone = isPhone ? cleanLogin.replace(/\D/g, '') : '';
      const normalizedUsername = isPhone ? undefined : cleanLogin.toLowerCase();

      const duplicate = db.users.some(
        (u) =>
          u.id !== moderatorId &&
          ((normalizedPhone && u.phone === normalizedPhone) ||
            (normalizedUsername && u.username?.toLowerCase() === normalizedUsername) ||
            u.phone.toLowerCase() === cleanLogin.toLowerCase())
      );
      if (duplicate) {
        return { success: false, error: 'اسم المستخدم أو رقم الهاتف مستخدم لحساب آخر.' };
      }

      nextPhone = normalizedPhone || cleanLogin;
      nextUsername = normalizedUsername;
    }

    setDb((prev) => ({
      ...prev,
      users: prev.users.map((u) => {
        if (u.id !== moderatorId) return u;
        const updatedMod: UserProfile = {
          ...u,
          fullName: nextName,
          adminRoleTitle: nextRole,
          phone: nextPhone,
          username: nextUsername,
          password: nextPassword,
          permissions: Array.from(new Set(nextPerms)),
        };
        if (isFirebaseLiveConfigured()) {
          void syncUserProfileToFirestore(updatedMod);
        }
        return updatedMod;
      }),
    }));

    return { success: true };
  };

  const toggleModeratorActive = (moderatorId: string) => {
    if (!isSuperAdminUser(currentUser)) return;
    setDb((prev) => ({
      ...prev,
      users: prev.users.map((u) => {
        if (u.id === moderatorId && u.role === 'admin' && !isSuperAdminUser(u)) {
          const updatedMod = { ...u, isActive: !u.isActive };
          if (isFirebaseLiveConfigured()) {
            void syncUserProfileToFirestore(updatedMod);
          }
          return updatedMod;
        }
        return u;
      }),
    }));
  };

  const deleteModerator = (moderatorId: string) => {
    if (!isSuperAdminUser(currentUser)) return;
    setDb((prev) => ({
      ...prev,
      users: prev.users.filter(
        (u) => !(u.id === moderatorId && u.role === 'admin' && !isSuperAdminUser(u))
      ),
    }));
    if (isFirebaseLiveConfigured()) {
      void deleteUserFromFirestore(moderatorId);
    }
  };

  const getTrackName = useCallback(
    (trackId: TrackId): string => getTrackLabel(trackId, db.tracks),
    [db.tracks]
  );

  // Dynamic Stages, Classes, Branches & Subjects CRUD
  const addTrack = (input: {
    label: string;
    shortLabel?: string;
    description?: string;
    subStages: string[];
    branches?: string[];
    departments?: string[];
    subjects?: string[];
    specializationLabel?: string;
  }): TrackOption => {
    const cleanSubStages = input.subStages.map((s) => s.trim()).filter(Boolean);
    const cleanBranches = input.branches?.map((s) => s.trim()).filter(Boolean);
    const cleanDepts = input.departments?.map((s) => s.trim()).filter(Boolean);
    const cleanSubjects = input.subjects?.map((s) => s.trim()).filter(Boolean);
    const newTrack: TrackOption = {
      id: `trk-${Date.now()}`,
      label: input.label.trim(),
      shortLabel: (input.shortLabel || input.label).trim(),
      description:
        input.description?.trim() || 'مرحلة دراسية مضافة يدوياً بإشراف الأستاذة تبارك الزيرجاوي.',
      subStages: cleanSubStages.length > 0 ? cleanSubStages : ['الصف الأول'],
      branches: cleanBranches && cleanBranches.length > 0 ? cleanBranches : undefined,
      departments: cleanDepts && cleanDepts.length > 0 ? cleanDepts : undefined,
      subjects: cleanSubjects && cleanSubjects.length > 0 ? cleanSubjects : [],
      specializationLabel: input.specializationLabel?.trim() || undefined,
      coverImage: 'auto',
    };
    setDb((prev) => ({
      ...prev,
      tracks: [...prev.tracks, newTrack],
    }));
    if (isFirebaseLiveConfigured()) {
      void syncTrackToFirestore(newTrack);
    }
    return newTrack;
  };

  const updateTrack = (trackId: TrackId, updates: Partial<Omit<TrackOption, 'id'>>) => {
    setDb((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => {
        if (t.id !== trackId) return t;
        const updatedTrack = { ...t, ...updates };
        if (isFirebaseLiveConfigured()) {
          void syncTrackToFirestore(updatedTrack);
        }
        return updatedTrack;
      }),
    }));
  };

  const deleteTrack = (trackId: TrackId) => {
    setDb((prev) => ({
      ...prev,
      tracks: prev.tracks.filter((t) => t.id !== trackId),
    }));
    if (isFirebaseLiveConfigured()) {
      void deleteTrackFromFirestore(trackId);
    }
  };

  const generateCodes = (input: {
    courseId: string;
    lessonId?: string;
    count: number;
    priceIqd: number;
  }): ActivationCode[] => {
    const course = db.courses.find((c) => c.id === input.courseId);
    if (!course) return [];
    const lesson = input.lessonId
      ? course.lessons.find((l) => l.id === input.lessonId)
      : undefined;
    const isLessonTarget = Boolean(lesson);
    const safeCount = Math.max(1, Math.min(100, input.count));
    const safePrice = Math.max(0, Number(input.priceIqd || 0));
    const today = new Date().toISOString().slice(0, 10);
    const created: ActivationCode[] = Array.from({ length: safeCount }, (_, i) => ({
      id: `code-${Date.now()}-${i}`,
      code: createRandomActivationCode(course.track, isLessonTarget),
      courseId: course.id,
      targetType: isLessonTarget ? 'lesson' : 'course',
      lessonId: lesson?.id,
      lessonTitle: lesson?.title,
      priceIqd: safePrice,
      track: course.track,
      createdAt: today,
      isUsed: false,
    }));

    setDb((prev) => ({
      ...prev,
      activationCodes: [...created, ...prev.activationCodes],
    }));
    if (isFirebaseLiveConfigured()) {
      created.forEach((codeObj) => {
        void syncActivationCodeToFirestore(codeObj);
      });
    }
    return created;
  };

  const deleteActivationCode = (codeId: string) => {
    setDb((prev) => ({
      ...prev,
      activationCodes: prev.activationCodes.filter((c) => c.id !== codeId),
    }));
    if (isFirebaseLiveConfigured()) {
      void deleteActivationCodeFromFirestore(codeId);
    }
  };

  const toggleStudentActive = (studentId: string) => {
    setDb((prev) => ({
      ...prev,
      users: prev.users.map((u) => {
        if (u.id !== studentId) return u;
        const updated = { ...u, isActive: !u.isActive };
        if (isFirebaseLiveConfigured()) {
          void syncUserProfileToFirestore(updated);
        }
        return updated;
      }),
    }));
  };

  const resetStudentDevice = (studentId: string) => {
    setDb((prev) => ({
      ...prev,
      users: prev.users.map((u) => {
        if (u.id !== studentId) return u;
        const updated = { ...u, deviceId: null };
        if (isFirebaseLiveConfigured()) {
          void syncUserProfileToFirestore(updated);
          void clearDeviceLockInFirestore(studentId);
        }
        return updated;
      }),
    }));
    if (deviceLockViolation?.studentId === studentId) {
      setDeviceLockViolation(null);
    }
  };

  const updateStudentProfile: PlatformContextValue['updateStudentProfile'] = (
    studentId,
    updates
  ) => {
    const target = db.users.find((u) => u.id === studentId && u.role === 'student');
    if (!target) {
      return { success: false, error: 'تعذر العثور على حساب الطالب.' };
    }
    const nextName =
      updates.fullName !== undefined ? updates.fullName.trim() : target.fullName;
    if (nextName.length < 3) {
      return { success: false, error: 'يرجى إدخال اسم الطالب الكامل (3 أحرف على الأقل).' };
    }
    let nextPhone = target.phone;
    if (updates.phone !== undefined && updates.phone.trim() !== target.phone) {
      const check = validateIraqiPhone(updates.phone);
      if (!check.valid) {
        return { success: false, error: check.error };
      }
      const dup = db.users.some((u) => u.id !== studentId && u.phone === check.normalized);
      if (dup) {
        return { success: false, error: 'رقم الهاتف مستخدم لطالب آخر في المنصة.' };
      }
      nextPhone = check.normalized;
    }

    setDb((prev) => ({
      ...prev,
      users: prev.users.map((u) => {
        if (u.id !== studentId) return u;
        const updated: UserProfile = {
          ...u,
          fullName: nextName,
          phone: nextPhone,
          track: updates.track ?? u.track,
          subStage: updates.subStage?.trim() || u.subStage,
          branch:
            updates.branch !== undefined ? updates.branch.trim() || undefined : u.branch,
          department:
            updates.department !== undefined
              ? updates.department.trim() || undefined
              : u.department,
        };
        if (isFirebaseLiveConfigured()) {
          void syncUserProfileToFirestore(updated);
        }
        return updated;
      }),
    }));

    return { success: true };
  };

  const deleteStudent = (studentId: string) => {
    setDb((prev) => ({
      ...prev,
      users: prev.users.filter((u) => u.id !== studentId || u.role === 'admin'),
      renewalRequests: prev.renewalRequests.filter((r) => r.studentId !== studentId),
      quizAttempts: prev.quizAttempts.filter((a) => a.studentId !== studentId),
      liveQuizResults: prev.liveQuizResults.filter((r) => r.studentId !== studentId),
    }));
    if (isFirebaseLiveConfigured()) {
      void deleteUserFromFirestore(studentId);
      void clearDeviceLockInFirestore(studentId);
    }
    if (deviceLockViolation?.studentId === studentId) {
      setDeviceLockViolation(null);
    }
  };

  const addNewCourse = (input: {
    title: string;
    subtitle: string;
    track: TrackId;
    subStage: string;
    branch?: string;
    subject?: string;
    description: string;
    totalHours: string;
    priceIqd: number;
    coverImage?: string;
  }): Course => {
    const trackCover = getTrackCover(input.track, db.tracks);
    const resolvedCover =
      input.coverImage !== undefined
        ? input.coverImage.trim() || 'auto'
        : trackCover || 'auto';
    const newCourse: Course = {
      id: `crs-${Date.now()}`,
      title: input.title.trim(),
      subtitle: input.subtitle.trim() || 'منهج شامل مع محاضرات مسجلة وملازم واختبارات',
      track: input.track,
      subStage: input.subStage,
      branch: input.branch || undefined,
      subject: input.subject?.trim() || undefined,
      instructor: 'الأستاذة تبارك الزيرجاوي',
      coverImage: resolvedCover,
      description: input.description.trim() || 'دورة تعليمية متكاملة بإشراف الأستاذة تبارك الزيرجاوي.',
      totalHours: input.totalHours.trim() || '12 ساعة مسجلة',
      priceIqd: Math.max(0, Number(input.priceIqd || 0)),
      lessons: [],
      notes: [],
      quizzes: [],
    };
    setDb((prev) => ({
      ...prev,
      courses: [newCourse, ...prev.courses],
    }));
    if (isFirebaseLiveConfigured()) {
      void syncCourseToFirestore(newCourse);
    }
    return newCourse;
  };

  const updateCourse = (
    courseId: string,
    updates: Partial<
      Pick<
        Course,
        'title' | 'subtitle' | 'track' | 'subStage' | 'branch' | 'subject' | 'description' | 'totalHours' | 'priceIqd'
      >
    >
  ) => {
    setDb((prev) => ({
      ...prev,
      courses: prev.courses.map((course) => {
        if (course.id !== courseId) return course;
        const nextTrack = updates.track ?? course.track;
        const updatedCourse: Course = {
          ...course,
          ...updates,
          priceIqd:
            updates.priceIqd !== undefined
              ? Math.max(0, Number(updates.priceIqd || 0))
              : course.priceIqd,
          coverImage:
            updates.track && updates.track !== course.track
              ? getTrackCover(nextTrack, prev.tracks)
              : course.coverImage,
        };
        if (isFirebaseLiveConfigured()) {
          void syncCourseToFirestore(updatedCourse);
        }
        return updatedCourse;
      }),
    }));
  };

  const deleteCourse = (courseId: string) => {
    setDb((prev) => ({
      ...prev,
      courses: prev.courses.filter((c) => c.id !== courseId),
      users: prev.users.map((u) => ({
        ...u,
        enrolledCourseIds: u.enrolledCourseIds.filter((id) => id !== courseId),
      })),
    }));
    if (isFirebaseLiveConfigured()) {
      void deleteCourseFromFirestore(courseId);
    }
  };

  const addLessonToCourse = (
    courseId: string,
    input: { title: string; duration: string; videoUrl: string; description: string; priceIqd: number }
  ) => {
    setDb((prev) => ({
      ...prev,
      courses: prev.courses.map((course) => {
        if (course.id !== courseId) return course;
        const lesson = createDefaultLesson({
          ...input,
          order: course.lessons.length + 1,
        });
        const updatedCourse: Course = {
          ...course,
          lessons: [...course.lessons, lesson],
        };
        if (isFirebaseLiveConfigured()) {
          void syncCourseToFirestore(updatedCourse);
        }
        return updatedCourse;
      }),
    }));
  };

  const updateLessonInCourse = (
    courseId: string,
    lessonId: string,
    updates: {
      title?: string;
      duration?: string;
      videoUrl?: string;
      description?: string;
      priceIqd?: number;
    }
  ) => {
    setDb((prev) => ({
      ...prev,
      courses: prev.courses.map((course) => {
        if (course.id !== courseId) return course;
        const updatedCourse: Course = {
          ...course,
          lessons: course.lessons.map((lesson) =>
            lesson.id === lessonId
              ? {
                  ...lesson,
                  ...updates,
                  priceIqd:
                    updates.priceIqd !== undefined
                      ? Math.max(0, Number(updates.priceIqd || 0))
                      : lesson.priceIqd,
                }
              : lesson
          ),
        };
        if (isFirebaseLiveConfigured()) {
          void syncCourseToFirestore(updatedCourse);
        }
        return updatedCourse;
      }),
    }));
  };

  const deleteLessonFromCourse = (courseId: string, lessonId: string) => {
    setDb((prev) => ({
      ...prev,
      courses: prev.courses.map((course) => {
        if (course.id !== courseId) return course;
        const updatedCourse: Course = {
          ...course,
          lessons: course.lessons
            .filter((l) => l.id !== lessonId)
            .map((l, idx) => ({ ...l, order: idx + 1 })),
        };
        if (isFirebaseLiveConfigured()) {
          void syncCourseToFirestore(updatedCourse);
        }
        return updatedCourse;
      }),
      users: prev.users.map((u) => ({
        ...u,
        unlockedLessonIds: (u.unlockedLessonIds ?? []).filter((id) => id !== lessonId),
      })),
    }));
  };

  const addPdfToCourse = (
    courseId: string,
    input: { title: string; fileUrl: string; pageCount: number }
  ) => {
    setDb((prev) => ({
      ...prev,
      courses: prev.courses.map((course) => {
        if (course.id !== courseId) return course;
        const pdf = createDefaultPdfNote(input);
        const updatedCourse: Course = {
          ...course,
          notes: [...course.notes, pdf],
        };
        if (isFirebaseLiveConfigured()) {
          void syncCourseToFirestore(updatedCourse);
        }
        return updatedCourse;
      }),
    }));
  };

  const updatePdfInCourse = (
    courseId: string,
    noteId: string,
    updates: { title?: string; fileUrl?: string; pageCount?: number }
  ) => {
    setDb((prev) => ({
      ...prev,
      courses: prev.courses.map((course) => {
        if (course.id !== courseId) return course;
        const updatedCourse: Course = {
          ...course,
          notes: course.notes.map((n) =>
            n.id === noteId
              ? {
                  ...n,
                  title: updates.title !== undefined ? updates.title.trim() : n.title,
                  fileUrl: updates.fileUrl !== undefined ? updates.fileUrl.trim() : n.fileUrl,
                  pageCount:
                    updates.pageCount !== undefined
                      ? Math.max(1, Number(updates.pageCount) || 1)
                      : n.pageCount,
                }
              : n
          ),
        };
        if (isFirebaseLiveConfigured()) {
          void syncCourseToFirestore(updatedCourse);
        }
        return updatedCourse;
      }),
    }));
  };

  const deletePdfFromCourse = (courseId: string, noteId: string) => {
    setDb((prev) => ({
      ...prev,
      courses: prev.courses.map((course) => {
        if (course.id !== courseId) return course;
        const updatedCourse: Course = {
          ...course,
          notes: course.notes.filter((n) => n.id !== noteId),
        };
        if (isFirebaseLiveConfigured()) {
          void syncCourseToFirestore(updatedCourse);
        }
        return updatedCourse;
      }),
    }));
  };

  const addQuizToCourse = (
    courseId: string,
    input: {
      title: string;
      timeLimitMinutes: number;
      questions: Omit<QuizQuestion, 'id'>[];
    }
  ): Quiz => {
    const newQuiz: Quiz = {
      id: `quiz-${Date.now()}`,
      title: input.title.trim(),
      timeLimitMinutes: Math.max(1, Math.min(180, input.timeLimitMinutes || 10)),
      questions: input.questions.map((q, idx) => ({
        ...q,
        id: `q-${Date.now()}-${idx}`,
      })),
    };
    setDb((prev) => ({
      ...prev,
      courses: prev.courses.map((course) => {
        if (course.id !== courseId) return course;
        const updatedCourse: Course = { ...course, quizzes: [newQuiz, ...course.quizzes] };
        if (isFirebaseLiveConfigured()) {
          void syncCourseToFirestore(updatedCourse);
        }
        return updatedCourse;
      }),
    }));
    return newQuiz;
  };

  const updateQuizInCourse = (
    courseId: string,
    quizId: string,
    updates: {
      title?: string;
      timeLimitMinutes?: number;
      questions?: Omit<QuizQuestion, 'id'>[];
    }
  ) => {
    setDb((prev) => ({
      ...prev,
      courses: prev.courses.map((course) => {
        if (course.id !== courseId) return course;
        const updatedCourse: Course = {
          ...course,
          quizzes: course.quizzes.map((quiz) => {
            if (quiz.id !== quizId) return quiz;
            return {
              ...quiz,
              title: updates.title !== undefined ? updates.title.trim() : quiz.title,
              timeLimitMinutes:
                updates.timeLimitMinutes !== undefined
                  ? Math.max(1, Math.min(180, updates.timeLimitMinutes || 10))
                  : quiz.timeLimitMinutes,
              questions: updates.questions
                ? updates.questions.map((q, idx) => ({
                    ...q,
                    id: `q-${Date.now()}-${idx}`,
                  }))
                : quiz.questions,
            };
          }),
        };
        if (isFirebaseLiveConfigured()) {
          void syncCourseToFirestore(updatedCourse);
        }
        return updatedCourse;
      }),
    }));
  };

  const deleteQuizFromCourse = (courseId: string, quizId: string) => {
    setDb((prev) => ({
      ...prev,
      courses: prev.courses.map((course) => {
        if (course.id !== courseId) return course;
        const updatedCourse: Course = {
          ...course,
          quizzes: course.quizzes.filter((q) => q.id !== quizId),
        };
        if (isFirebaseLiveConfigured()) {
          void syncCourseToFirestore(updatedCourse);
        }
        return updatedCourse;
      }),
      quizAttempts: prev.quizAttempts.filter((a) => a.quizId !== quizId),
    }));
  };

  const createAssignment = (input: {
    title: string;
    details: string;
    audience: AssignmentAudience;
    track?: TrackId;
    subStage?: string;
    branch?: string;
    subject?: string;
    courseId?: string;
    dueDate: string;
    priority: AssignmentPriority;
  }): DailyAssignment => {
    const course = input.courseId ? db.courses.find((c) => c.id === input.courseId) : undefined;
    const now = new Date();
    const createdAt = `${now.toISOString().slice(0, 10)} ${formatCurrentTimeHHMM()}`;
    const resolvedTrack = input.track || getTrackForAudience(input.audience, db.tracks);
    const created: DailyAssignment = {
      id: `asg-${Date.now()}`,
      title: input.title.trim(),
      details: input.details.trim(),
      audience: input.audience,
      track: resolvedTrack,
      subStage: input.subStage && input.subStage !== 'جميع الصفوف' ? input.subStage : undefined,
      branch:
        input.branch && input.branch !== 'جميع الفروع' && input.branch !== 'الجميع'
          ? input.branch
          : undefined,
      subject: input.subject?.trim() || undefined,
      courseId: course?.id,
      courseTitle: course?.title || input.subject?.trim() || undefined,
      dueDate: input.dueDate,
      priority: input.priority,
      createdAt,
    };
    setDb((prev) => ({
      ...prev,
      assignments: [created, ...prev.assignments],
    }));
    if (isFirebaseLiveConfigured()) {
      void syncAssignmentToFirestore(created);
    }
    return created;
  };

  const updateAssignment = (
    assignmentId: string,
    input: {
      title: string;
      details: string;
      audience: AssignmentAudience;
      track?: TrackId;
      subStage?: string;
      branch?: string;
      subject?: string;
      courseId?: string;
      dueDate: string;
      priority: AssignmentPriority;
    }
  ) => {
    const course = input.courseId ? db.courses.find((c) => c.id === input.courseId) : undefined;
    const resolvedTrack = input.track || getTrackForAudience(input.audience, db.tracks);
    setDb((prev) => ({
      ...prev,
      assignments: prev.assignments.map((a) => {
        if (a.id !== assignmentId) return a;
        const updated: DailyAssignment = {
          ...a,
          title: input.title.trim(),
          details: input.details.trim(),
          audience: input.audience,
          track: resolvedTrack,
          subStage: input.subStage && input.subStage !== 'جميع الصفوف' ? input.subStage : undefined,
          branch:
            input.branch && input.branch !== 'جميع الفروع' && input.branch !== 'الجميع'
              ? input.branch
              : undefined,
          subject: input.subject?.trim() || undefined,
          courseId: course?.id,
          courseTitle: course?.title || input.subject?.trim() || undefined,
          dueDate: input.dueDate,
          priority: input.priority,
        };
        if (isFirebaseLiveConfigured()) {
          void syncAssignmentToFirestore(updated);
        }
        return updated;
      }),
    }));
  };

  const deleteAssignment = (assignmentId: string) => {
    setDb((prev) => ({
      ...prev,
      assignments: prev.assignments.filter((a) => a.id !== assignmentId),
    }));
    if (isFirebaseLiveConfigured()) {
      void deleteAssignmentFromFirestore(assignmentId);
    }
  };

  const toggleAssignmentCompleted = (assignmentId: string) => {
    if (!currentUser) return;
    setDb((prev) => {
      const existing = prev.completedAssignments[currentUser.id] ?? [];
      const next = existing.includes(assignmentId)
        ? existing.filter((id) => id !== assignmentId)
        : [...existing, assignmentId];
      return {
        ...prev,
        completedAssignments: {
          ...prev.completedAssignments,
          [currentUser.id]: next,
        },
      };
    });
  };

  const markAssignmentNotificationsRead = (assignmentIds: string[]) => {
    if (!currentUser || assignmentIds.length === 0) return;
    setDb((prev) => {
      const existing = prev.readAssignmentNotifications[currentUser.id] ?? [];
      const merged = Array.from(new Set([...existing, ...assignmentIds]));
      return {
        ...prev,
        readAssignmentNotifications: {
          ...prev.readAssignmentNotifications,
          [currentUser.id]: merged,
        },
      };
    });
  };

  // --- Live Quiz Chat Room Handlers ---
  const scheduleSimulatedResponses = useCallback(
    (
      sessionId: string,
      questionCard: LiveQuizQuestionCard,
      participants: LiveQuizRoomSession['participants']
    ) => {
      const simStudents = participants.filter((p) => p.isSimulated);
      const maxWindowMs = Math.max(2200, (questionCard.durationSeconds - 1) * 1000);

      simStudents.forEach((student, idx) => {
        // Stagger realistic response times between 1.6s and 85% of question duration
        const delayMs = Math.min(
          maxWindowMs - 300,
          Math.round(1600 + ((idx + 1) / (simStudents.length + 1)) * (maxWindowMs - 1800) + Math.random() * 900)
        );
        // Realistic accuracy distribution: top students ~85%, others ~65%
        const accuracyRate = idx === 0 ? 0.88 : idx === 1 ? 0.8 : 0.65;
        const willBeCorrect = Math.random() < accuracyRate;
        const wrongIndices = questionCard.options
          .map((_, i) => i)
          .filter((i) => i !== questionCard.correctIndex);
        const chosenIndex = willBeCorrect
          ? questionCard.correctIndex
          : wrongIndices[Math.floor(Math.random() * wrongIndices.length)] ?? 0;

        const timerId = window.setTimeout(() => {
          setLiveQuizRoom((prev) => {
            if (prev.id !== sessionId || prev.status !== 'active') return prev;
            const now = Date.now();
            return {
              ...prev,
              questions: prev.questions.map((q) => {
                if (q.id !== questionCard.id) return q;
                if (now > q.expiresAt + 500 || q.answers[student.id]) return q;
                return {
                  ...q,
                  answers: {
                    ...q.answers,
                    [student.id]: {
                      studentId: student.id,
                      studentName: student.name,
                      selectedIndex: chosenIndex,
                      isCorrect: chosenIndex === q.correctIndex,
                      responseTimeMs: Math.min(q.durationSeconds * 1000, Math.max(800, now - q.sentAt)),
                      answeredAt: now,
                    },
                  },
                };
              }),
            };
          });
        }, Math.max(1200, delayMs));

        simTimeoutsRef.current.push(timerId);
      });
    },
    []
  );

  const startLiveQuizRoom = (input: {
    title: string;
    audience: AssignmentAudience;
    track?: TrackId;
    subStage?: string;
    branch?: string;
    subject?: string;
    courseId?: string;
    durationMinutes: number;
    defaultQuestionSeconds: number;
    isDemoPreview?: boolean;
  }) => {
    clearSimulatedAnswerTimers();
    const now = Date.now();
    const safeMinutes = Math.max(1, Math.min(180, input.durationMinutes || 15));
    const safeSeconds = Math.max(5, Math.min(120, input.defaultQuestionSeconds || 15));
    const course = input.courseId ? db.courses.find((c) => c.id === input.courseId) : undefined;
    const resolvedTrack = input.track || getTrackForAudience(input.audience, db.tracks);
    const simParticipants = buildSimulatedParticipants(
      input.audience,
      currentUser?.role === 'student' ? currentUser.id : undefined
    );

    const participants =
      currentUser && currentUser.role === 'student'
        ? [
            {
              id: currentUser.id,
              name: currentUser.fullName,
              phone: currentUser.phone,
              joinedAt: formatCurrentTimeHHMM(),
              isSimulated: false,
            },
            ...simParticipants,
          ]
        : simParticipants;

    const sessionId = `lq-${now}`;
    const resolvedTitle =
      input.title.trim() ||
      `محادثة كوز مباشر — ${input.subject ? `${input.subject} · ` : ''}${getAudienceLabel(input.audience, db.tracks)}`;

    const newRoom: LiveQuizRoomSession = {
      id: sessionId,
      status: 'active',
      title: resolvedTitle,
      audience: input.audience,
      track: resolvedTrack,
      subStage: input.subStage && input.subStage !== 'جميع الصفوف' ? input.subStage : undefined,
      branch:
        input.branch && input.branch !== 'جميع الفروع' && input.branch !== 'الجميع'
          ? input.branch
          : undefined,
      subject: input.subject?.trim() || undefined,
      courseId: course?.id,
      courseTitle: course?.title || input.subject?.trim() || undefined,
      durationMinutes: safeMinutes,
      defaultQuestionSeconds: safeSeconds,
      startedAt: now,
      endsAt: now + safeMinutes * 60 * 1000,
      isDemoPreview: Boolean(input.isDemoPreview),
      participants,
      questions: [],
      finalLeaderboard: [],
      systemMessages: [
        {
          id: `sys-${now}`,
          text: `فتحت الأستاذة تبارك الزيرجاوي غرفة «${resolvedTitle}» (${safeMinutes} دقيقة) — استعدوا للإجابة السريعة قبل انتهاء العداد!`,
          timestamp: formatCurrentTimeHHMM(),
        },
      ],
    };

    setLiveQuizRoom(newRoom);
    if (isFirebaseLiveConfigured()) {
      void syncLiveQuizRoomToFirestore(newRoom);
    }
  };

  const sendLiveQuizQuestion = useCallback(
    (input: {
      question: string;
      options: string[];
      correctIndex: number;
      durationSeconds: number;
    }) => {
      const cleanOptions = input.options.map((o) => o.trim()).filter(Boolean);
      if (!input.question.trim() || cleanOptions.length < 2) return;

      const safeDuration = Math.max(5, Math.min(120, input.durationSeconds || 15));
      const now = Date.now();
      const safeCorrect = Math.max(0, Math.min(cleanOptions.length - 1, input.correctIndex));

      let createdCard: LiveQuizQuestionCard | null = null;
      let activeSessionId = '';
      let activeParticipants: LiveQuizRoomSession['participants'] = [];

      setLiveQuizRoom((prev) => {
        if (prev.status !== 'active') return prev;
        activeSessionId = prev.id;
        activeParticipants = prev.participants;
        const card: LiveQuizQuestionCard = {
          id: `lqq-${now}-${Math.floor(Math.random() * 1000)}`,
          order: prev.questions.length + 1,
          question: input.question.trim(),
          options: cleanOptions,
          correctIndex: safeCorrect,
          durationSeconds: safeDuration,
          sentAt: now,
          expiresAt: now + safeDuration * 1000,
          answers: {},
        };
        createdCard = card;
        const nextRoom: LiveQuizRoomSession = {
          ...prev,
          questions: [...prev.questions, card],
        };
        if (isFirebaseLiveConfigured()) {
          void syncLiveQuizRoomToFirestore(nextRoom);
        }
        return nextRoom;
      });

      // Trigger simulated classmates' real-time responses on the next tick
      window.setTimeout(() => {
        if (createdCard && activeSessionId) {
          scheduleSimulatedResponses(activeSessionId, createdCard, activeParticipants);
        }
      }, 50);
    },
    [scheduleSimulatedResponses]
  );

  const startDemoLiveQuizPreview = () => {
    clearSimulatedAnswerTimers();
    const audience: AssignmentAudience =
      currentUser && currentUser.role === 'student'
        ? getAudienceForStudent(currentUser)
        : 'vocational6';
    const targetTrack = getTrackForAudience(audience, db.tracks);
    const matchingCourse = db.courses.find((c) => c.track === targetTrack);
    const now = Date.now();
    const sessionId = `lq-demo-${now}`;

    const simParticipants = buildSimulatedParticipants(
      audience,
      currentUser?.role === 'student' ? currentUser.id : undefined
    );
    const participants =
      currentUser && currentUser.role === 'student'
        ? [
            {
              id: currentUser.id,
              name: currentUser.fullName,
              phone: currentUser.phone,
              joinedAt: formatCurrentTimeHHMM(),
              isSimulated: false,
            },
            ...simParticipants,
          ]
        : simParticipants;

    const presetsList =
      DEMO_LIVE_QUIZ_QUESTIONS[audience] ?? DEMO_LIVE_QUIZ_QUESTIONS.vocational6;
    const firstPreset = presetsList[0];
    const firstQuestion: LiveQuizQuestionCard = {
      id: `lqq-demo-${now}`,
      order: 1,
      question: firstPreset.question,
      options: firstPreset.options,
      correctIndex: firstPreset.correctIndex,
      durationSeconds: firstPreset.durationSeconds,
      sentAt: now,
      expiresAt: now + firstPreset.durationSeconds * 1000,
      answers: {},
    };

    const demoRoom: LiveQuizRoomSession = {
      id: sessionId,
      status: 'active',
      title: `كوز مباشر تجريبي — ${getAudienceLabel(audience, db.tracks)}`,
      audience,
      track: targetTrack,
      branch:
        audience === 'vocational6' || audience === 'vocational45'
          ? currentUser?.branch || 'جميع الفروع'
          : undefined,
      courseId: matchingCourse?.id,
      courseTitle: matchingCourse?.title,
      durationMinutes: 15,
      defaultQuestionSeconds: 15,
      startedAt: now,
      endsAt: now + 15 * 60 * 1000,
      isDemoPreview: true,
      participants,
      questions: [firstQuestion],
      finalLeaderboard: [],
      systemMessages: [
        {
          id: `sys-demo-${now}`,
          text: `مرحباً بكم في معاينة محادثة الكوز المباشر! انضم ${participants.length} طلاب الآن وبدأ السؤال الأول.`,
          timestamp: formatCurrentTimeHHMM(),
        },
      ],
    };

    setLiveQuizRoom(demoRoom);
    scheduleSimulatedResponses(sessionId, firstQuestion, participants);
  };

  const submitLiveQuizAnswer = (questionId: string, selectedIndex: number) => {
    if (!currentUser || currentUser.role !== 'student') return;
    const now = Date.now();
    // Automatically log student attendance for participating in the live quiz chat room
    recordStudentAttendance({
      studentId: currentUser.id,
      source: 'live_quiz_chat',
      sessionKey: liveQuizRoom.id,
      title: `كوز مباشر: ${liveQuizRoom.title}`,
    });
    setLiveQuizRoom((prev) => {
      if (prev.status !== 'active') return prev;
      const nextRoom: LiveQuizRoomSession = {
        ...prev,
        questions: prev.questions.map((q) => {
          if (q.id !== questionId) return q;
          // Enforce strict timeout lock & single submission
          if (now > q.expiresAt || q.answers[currentUser.id]) return q;
          return {
            ...q,
            answers: {
              ...q.answers,
              [currentUser.id]: {
                studentId: currentUser.id,
                studentName: currentUser.fullName,
                selectedIndex,
                isCorrect: selectedIndex === q.correctIndex,
                responseTimeMs: Math.max(300, now - q.sentAt),
                answeredAt: now,
              },
            },
          };
        }),
      };
      if (isFirebaseLiveConfigured()) {
        void syncLiveQuizRoomToFirestore(nextRoom);
      }
      return nextRoom;
    });
  };

  const endLiveQuizRoom = useCallback(() => {
    clearSimulatedAnswerTimers();
    const now = Date.now();
    const completedAt = `${new Date(now).toISOString().slice(0, 10)} ${formatCurrentTimeHHMM()}`;

    setLiveQuizRoom((prev) => {
      if (prev.status !== 'active') return prev;
      const leaderboard = computeLiveQuizLeaderboard(prev);

      // Save personal result records automatically for every participant
      const createdResults: StudentLiveQuizResult[] = leaderboard.map((entry) => ({
        id: `lqr-${prev.id}-${entry.studentId}`,
        sessionId: prev.id,
        sessionTitle: prev.title,
        audience: prev.audience,
        courseTitle: prev.courseTitle,
        studentId: entry.studentId,
        studentName: entry.studentName,
        totalQuestions: entry.totalQuestions,
        correctCount: entry.correctCount,
        percentage: entry.percentage,
        rank: entry.rank,
        totalParticipants: leaderboard.length,
        levelLabel: entry.levelLabel,
        medal: entry.medal,
        avgResponseMs: entry.avgResponseMs,
        completedAt,
        isRead: false,
      }));

      setDb((dbPrev) => {
        const filtered = dbPrev.liveQuizResults.filter((r) => r.sessionId !== prev.id);
        return {
          ...dbPrev,
          liveQuizResults: [...createdResults, ...filtered],
        };
      });

      const endedRoom: LiveQuizRoomSession = {
        ...prev,
        status: 'ended',
        endedAt: now,
        finalLeaderboard: leaderboard,
        systemMessages: [
          ...prev.systemMessages,
          {
            id: `sys-end-${now}`,
            text: `انتهت جلسة الكوزات المباشرة وتم احتساب الدرجات والمستويات وإرسال الإحصائيات إلى حسابات جميع الطلاب تلقائياً.`,
            timestamp: formatCurrentTimeHHMM(),
          },
        ],
      };
      if (isFirebaseLiveConfigured()) {
        void syncLiveQuizRoomToFirestore(endedRoom);
      }
      return endedRoom;
    });
  }, [clearSimulatedAnswerTimers]);

  // Automatically end the Live Quiz Chat Room when session duration expires
  useEffect(() => {
    if (liveQuizRoom.status !== 'active' || !liveQuizRoom.endsAt) return;
    const remainingMs = liveQuizRoom.endsAt - Date.now();
    if (remainingMs <= 0) {
      endLiveQuizRoom();
      return;
    }
    const timer = window.setTimeout(() => {
      endLiveQuizRoom();
    }, remainingMs);
    return () => window.clearTimeout(timer);
  }, [liveQuizRoom.status, liveQuizRoom.endsAt, liveQuizRoom.id, endLiveQuizRoom]);

  const resetLiveQuizRoom = () => {
    clearSimulatedAnswerTimers();
    const idleRoom = createIdleLiveQuizRoom();
    setLiveQuizRoom(idleRoom);
    if (isFirebaseLiveConfigured()) {
      void syncLiveQuizRoomToFirestore(idleRoom);
    }
  };

  const markLiveQuizResultsRead = (resultIds: string[]) => {
    if (resultIds.length === 0) return;
    setDb((prev) => ({
      ...prev,
      liveQuizResults: prev.liveQuizResults.map((r) =>
        resultIds.includes(r.id) ? { ...r, isRead: true } : r
      ),
    }));
  };

  // --- Monthly Payments & Subscriptions Handlers ---
  const updatePaymentSettings = (updates: Partial<PaymentSettings>) => {
    setDb((prev) => ({
      ...prev,
      paymentSettings: {
        ...prev.paymentSettings,
        ...updates,
        gracePeriodDays: 5,
      },
    }));
  };

  const updateStudentDueDate = (studentId: string, newDueDate: string) => {
    if (!newDueDate) return;
    setDb((prev) => ({
      ...prev,
      users: prev.users.map((u) => {
        if (u.id !== studentId) return u;
        const updated = { ...u, subscriptionDueDate: newDueDate };
        if (isFirebaseLiveConfigured()) {
          void syncUserProfileToFirestore(updated);
        }
        return updated;
      }),
    }));
  };

  const renewStudentSubscription = (studentId: string, customDueDate?: string): string => {
    const target = db.users.find((u) => u.id === studentId);
    const resolvedDate =
      customDueDate?.trim() || computeNextMonthDueDate(target?.subscriptionDueDate);
    setDb((prev) => ({
      ...prev,
      users: prev.users.map((u) => {
        if (u.id !== studentId) return u;
        const updated = { ...u, subscriptionDueDate: resolvedDate, isActive: true };
        if (isFirebaseLiveConfigured()) {
          void syncUserProfileToFirestore(updated);
        }
        return updated;
      }),
    }));
    return resolvedDate;
  };

  const submitRenewalRequest = (input: {
    receiptImageDataUrl: string;
    receiptFileName?: string;
    note?: string;
  }): RenewalRequest | null => {
    if (!currentUser || currentUser.role !== 'student') return null;
    const now = new Date();
    const submittedAt = `${now.toISOString().slice(0, 10)} ${formatCurrentTimeHHMM()}`;
    const created: RenewalRequest = {
      id: `ren-${Date.now()}`,
      studentId: currentUser.id,
      studentName: currentUser.fullName,
      studentPhone: currentUser.phone,
      trackLabel: getTrackLabel(currentUser.track, db.tracks),
      subStage: `${currentUser.subStage}${
        currentUser.branch
          ? ` · ${currentUser.branch}`
          : currentUser.department
            ? ` · ${currentUser.department}`
            : ''
      }`,
      amountIqd: db.paymentSettings.monthlyFeeIqd,
      receiptImageDataUrl: input.receiptImageDataUrl,
      receiptFileName: input.receiptFileName,
      note: input.note?.trim() || undefined,
      status: 'pending',
      submittedAt,
    };
    setDb((prev) => ({
      ...prev,
      renewalRequests: [created, ...prev.renewalRequests],
    }));
    return created;
  };

  const approveRenewalRequest = (requestId: string, customDueDate?: string) => {
    const req = db.renewalRequests.find((r) => r.id === requestId);
    if (!req) return;
    const student = db.users.find((u) => u.id === req.studentId);
    const nextDue =
      customDueDate?.trim() || computeNextMonthDueDate(student?.subscriptionDueDate);
    const reviewedAt = `${new Date().toISOString().slice(0, 10)} ${formatCurrentTimeHHMM()}`;

    setDb((prev) => ({
      ...prev,
      users: prev.users.map((u) => {
        if (u.id !== req.studentId) return u;
        const updated = { ...u, subscriptionDueDate: nextDue, isActive: true };
        if (isFirebaseLiveConfigured()) {
          void syncUserProfileToFirestore(updated);
        }
        return updated;
      }),
      renewalRequests: prev.renewalRequests.map((r) =>
        r.id === requestId
          ? { ...r, status: 'approved', reviewedAt, newDueDate: nextDue }
          : r
      ),
    }));
  };

  const rejectRenewalRequest = (requestId: string) => {
    const reviewedAt = `${new Date().toISOString().slice(0, 10)} ${formatCurrentTimeHHMM()}`;
    setDb((prev) => ({
      ...prev,
      renewalRequests: prev.renewalRequests.map((r) =>
        r.id === requestId ? { ...r, status: 'rejected', reviewedAt } : r
      ),
    }));
  };

  // Printed Booklets & Predictions Store Handlers
  const addStoreItem: PlatformContextValue['addStoreItem'] = (input) => {
    const newItem: StoreItem = {
      id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: input.title.trim(),
      subject: input.subject.trim(),
      track: input.track,
      subStage: input.subStage.trim(),
      branch: input.branch?.trim() || undefined,
      category: input.category,
      description: input.description.trim(),
      priceIqd: Math.max(0, Math.round(Number(input.priceIqd) || 0)),
      coverImage: input.coverImage?.trim() || 'auto',
      pagesInfo: input.pagesInfo?.trim() || undefined,
      inStock: input.inStock ?? true,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setDb((prev) => ({
      ...prev,
      storeItems: [newItem, ...prev.storeItems],
    }));
    if (isFirebaseLiveConfigured()) {
      void syncStoreItemToFirestore(newItem);
    }

    return newItem;
  };

  const updateStoreItem: PlatformContextValue['updateStoreItem'] = (itemId, updates) => {
    setDb((prev) => ({
      ...prev,
      storeItems: prev.storeItems.map((item) => {
        if (item.id !== itemId) return item;
        const updatedItem: StoreItem = {
          ...item,
          ...updates,
          title: updates.title !== undefined ? updates.title.trim() : item.title,
          subject: updates.subject !== undefined ? updates.subject.trim() : item.subject,
          subStage: updates.subStage !== undefined ? updates.subStage.trim() : item.subStage,
          branch: updates.branch !== undefined ? updates.branch.trim() || undefined : item.branch,
          description:
            updates.description !== undefined ? updates.description.trim() : item.description,
          priceIqd:
            updates.priceIqd !== undefined
              ? Math.max(0, Math.round(Number(updates.priceIqd) || 0))
              : item.priceIqd,
        };
        if (isFirebaseLiveConfigured()) {
          void syncStoreItemToFirestore(updatedItem);
        }
        return updatedItem;
      }),
    }));
  };

  const deleteStoreItem = (itemId: string) => {
    setDb((prev) => ({
      ...prev,
      storeItems: prev.storeItems.filter((item) => item.id !== itemId),
    }));
    if (isFirebaseLiveConfigured()) {
      void deleteStoreItemFromFirestore(itemId);
    }
  };

  const updateStoreDeliverySettings = (updates: Partial<StoreDeliverySettings>) => {
    setDb((prev) => ({
      ...prev,
      storeDeliverySettings: {
        ...prev.storeDeliverySettings,
        ...updates,
        baghdadFeeIqd:
          updates.baghdadFeeIqd !== undefined
            ? Math.max(0, Math.round(Number(updates.baghdadFeeIqd) || 0))
            : prev.storeDeliverySettings.baghdadFeeIqd,
        provincesFeeIqd:
          updates.provincesFeeIqd !== undefined
            ? Math.max(0, Math.round(Number(updates.provincesFeeIqd) || 0))
            : prev.storeDeliverySettings.provincesFeeIqd,
      },
    }));
  };

  const createStoreOrder: PlatformContextValue['createStoreOrder'] = (input) => {
    const item = db.storeItems.find((i) => i.id === input.itemId);
    if (!item) return null;

    const quantity = Math.max(1, Math.min(20, Math.round(input.quantity) || 1));
    const deliveryFeeIqd = getDeliveryFeeForGovernorate(
      input.governorate,
      db.storeDeliverySettings
    );
    const totalIqd = item.priceIqd * quantity + deliveryFeeIqd;
    const now = new Date();
    const createdAt = `${now.toISOString().slice(0, 10)} ${formatCurrentTimeHHMM()}`;
    const receiptNum = `TB-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const order: StoreOrder = {
      id: `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      receiptNumber: receiptNum,
      itemId: item.id,
      itemTitle: item.title,
      subject: item.subject,
      trackLabel: getTrackLabel(item.track, db.tracks),
      subStage: item.branch ? `${item.subStage} · ${item.branch}` : item.subStage,
      studentId: currentUser?.id,
      studentName: input.studentName.trim(),
      phone: input.phone.trim(),
      governorate: input.governorate.trim(),
      address: input.address.trim(),
      quantity,
      unitPriceIqd: item.priceIqd,
      deliveryFeeIqd,
      totalIqd,
      status: 'preparing',
      createdAt,
    };

    setDb((prev) => ({
      ...prev,
      storeOrders: [order, ...prev.storeOrders],
    }));
    if (isFirebaseLiveConfigured()) {
      void syncStoreOrderToFirestore(order);
    }

    return order;
  };

  const updateStoreOrderStatus = (orderId: string, status: StoreOrderStatus) => {
    const updatedAt = `${new Date().toISOString().slice(0, 10)} ${formatCurrentTimeHHMM()}`;
    setDb((prev) => ({
      ...prev,
      storeOrders: prev.storeOrders.map((ord) =>
        ord.id === orderId ? { ...ord, status, updatedAt } : ord
      ),
    }));
    if (isFirebaseLiveConfigured()) {
      void updateStoreOrderStatusInFirestore(orderId, status, updatedAt);
    }
  };

  const deleteStoreOrder = (orderId: string) => {
    setDb((prev) => ({
      ...prev,
      storeOrders: prev.storeOrders.filter((ord) => ord.id !== orderId),
    }));
    if (isFirebaseLiveConfigured()) {
      void deleteStoreOrderFromFirestore(orderId);
    }
  };

  // Dynamic WhatsApp Support Number (Persisted in Firestore `settings/platform`)
  const updateSupportWhatsappNumber = async (
    rawPhone: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleaned = rawPhone.trim();
    const digitsOnly = cleaned.replace(/[^\d+]/g, '');
    if (digitsOnly.replace(/\D/g, '').length < 8) {
      return {
        success: false,
        error: 'يرجى إدخال رقم واتساب صحيح (مثال: 07848333046 أو 9647848333046).',
      };
    }

    setDb((prev) => ({
      ...prev,
      supportWhatsappNumber: cleaned,
    }));

    if (isFirebaseLiveConfigured()) {
      const saved = await syncSupportWhatsappNumberToFirestore(cleaned);
      if (!saved) {
        return {
          success: true,
          error: 'تم الحفظ محلياً، وسيُزامن مع السحابة فور توفر صلاحية الكتابة.',
        };
      }
    }

    return { success: true };
  };

  // Teacher CV, Complaints & Inquiries Handlers
  const updateTeacherCV: PlatformContextValue['updateTeacherCV'] = (cv) => {
    const updatedAt = new Date().toISOString().slice(0, 10);
    setDb((prev) => ({
      ...prev,
      teacherCV: {
        ...cv,
        fullName: cv.fullName.trim(),
        academicTitle: cv.academicTitle.trim(),
        specialization: cv.specialization.trim(),
        subjectsTaught: cv.subjectsTaught.map((s) => s.trim()).filter(Boolean),
        degree: cv.degree.trim(),
        qualifications: cv.qualifications.trim(),
        age: cv.age.trim(),
        yearsExperience: cv.yearsExperience.trim(),
        governorate: cv.governorate.trim(),
        area: cv.area.trim(),
        instituteAddress: cv.instituteAddress.trim(),
        bio: cv.bio.trim(),
        achievements: cv.achievements.map((a) => a.trim()).filter(Boolean),
        phone: cv.phone.trim(),
        whatsapp: cv.whatsapp.trim(),
        telegram: cv.telegram?.trim() || undefined,
        instagram: cv.instagram?.trim() || undefined,
        facebook: cv.facebook?.trim() || undefined,
        updatedAt,
      },
    }));
  };

  const submitComplaint: PlatformContextValue['submitComplaint'] = (input) => {
    if (!currentUser || currentUser.role !== 'student') return null;
    if (!input.details.trim()) return null;
    const now = new Date();
    const createdAt = `${now.toISOString().slice(0, 10)} ${formatCurrentTimeHHMM()}`;
    const created: StudentComplaint = {
      id: `cmp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      studentId: currentUser.id,
      studentName: currentUser.fullName,
      studentPhone: currentUser.phone,
      trackLabel: getTrackLabel(currentUser.track, db.tracks),
      subStage: `${currentUser.subStage}${
        currentUser.branch
          ? ` · ${currentUser.branch}`
          : currentUser.department
            ? ` · ${currentUser.department}`
            : ''
      }`,
      category: input.category,
      details: input.details.trim(),
      isPrivateToAdmin: input.isPrivateToAdmin,
      status: 'pending',
      isReplyReadByStudent: true,
      createdAt,
    };
    setDb((prev) => ({
      ...prev,
      complaints: [created, ...prev.complaints],
    }));
    if (isFirebaseLiveConfigured()) {
      void syncComplaintToFirestore(created);
    }
    return created;
  };

  const replyToComplaint = (complaintId: string, replyText: string, markResolved = true) => {
    if (!replyText.trim()) return;
    const repliedAt = `${new Date().toISOString().slice(0, 10)} ${formatCurrentTimeHHMM()}`;
    setDb((prev) => ({
      ...prev,
      complaints: prev.complaints.map((c) => {
        if (c.id !== complaintId) return c;
        const updated: StudentComplaint = {
          ...c,
          adminReply: replyText.trim(),
          repliedAt,
          status: markResolved ? 'resolved' : c.status,
          isReplyReadByStudent: false,
        };
        if (isFirebaseLiveConfigured()) {
          void syncComplaintToFirestore(updated);
        }
        return updated;
      }),
    }));
  };

  const updateComplaintStatus = (complaintId: string, status: ComplaintStatus) => {
    setDb((prev) => ({
      ...prev,
      complaints: prev.complaints.map((c) => {
        if (c.id !== complaintId) return c;
        const updated = { ...c, status };
        if (isFirebaseLiveConfigured()) {
          void syncComplaintToFirestore(updated);
        }
        return updated;
      }),
    }));
  };

  const deleteComplaint = (complaintId: string) => {
    setDb((prev) => ({
      ...prev,
      complaints: prev.complaints.filter((c) => c.id !== complaintId),
    }));
    if (isFirebaseLiveConfigured()) {
      void deleteComplaintFromFirestore(complaintId);
    }
  };

  const markComplaintRepliesRead = (complaintIds: string[]) => {
    if (complaintIds.length === 0) return;
    const idSet = new Set(complaintIds);
    setDb((prev) => ({
      ...prev,
      complaints: prev.complaints.map((c) =>
        idSet.has(c.id) ? { ...c, isReplyReadByStudent: true } : c
      ),
    }));
  };

  const submitInquiry: PlatformContextValue['submitInquiry'] = (input) => {
    if (!currentUser || currentUser.role !== 'student') return null;
    if (!input.title.trim() || !input.details.trim()) return null;
    const now = new Date();
    const createdAt = `${now.toISOString().slice(0, 10)} ${formatCurrentTimeHHMM()}`;
    const created: StudentInquiry = {
      id: `inq-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      studentId: currentUser.id,
      studentName: currentUser.fullName,
      studentPhone: currentUser.phone,
      trackLabel: getTrackLabel(currentUser.track, db.tracks),
      subStage: `${currentUser.subStage}${
        currentUser.branch
          ? ` · ${currentUser.branch}`
          : currentUser.department
            ? ` · ${currentUser.department}`
            : ''
      }`,
      title: input.title.trim(),
      details: input.details.trim(),
      status: 'pending',
      isReplyReadByStudent: true,
      createdAt,
    };
    setDb((prev) => ({
      ...prev,
      inquiries: [created, ...prev.inquiries],
    }));
    if (isFirebaseLiveConfigured()) {
      void syncInquiryToFirestore(created);
    }
    return created;
  };

  const replyToInquiry = (inquiryId: string, replyText: string) => {
    if (!replyText.trim()) return;
    const repliedAt = `${new Date().toISOString().slice(0, 10)} ${formatCurrentTimeHHMM()}`;
    setDb((prev) => ({
      ...prev,
      inquiries: prev.inquiries.map((inq) => {
        if (inq.id !== inquiryId) return inq;
        const updated: StudentInquiry = {
          ...inq,
          adminReply: replyText.trim(),
          repliedAt,
          status: 'answered',
          isReplyReadByStudent: false,
        };
        if (isFirebaseLiveConfigured()) {
          void syncInquiryToFirestore(updated);
        }
        return updated;
      }),
    }));
  };

  const deleteInquiry = (inquiryId: string) => {
    setDb((prev) => ({
      ...prev,
      inquiries: prev.inquiries.filter((inq) => inq.id !== inquiryId),
    }));
    if (isFirebaseLiveConfigured()) {
      void deleteInquiryFromFirestore(inquiryId);
    }
  };

  const markInquiryRepliesRead = (inquiryIds: string[]) => {
    if (inquiryIds.length === 0) return;
    const idSet = new Set(inquiryIds);
    setDb((prev) => ({
      ...prev,
      inquiries: prev.inquiries.map((inq) =>
        idSet.has(inq.id) ? { ...inq, isReplyReadByStudent: true } : inq
      ),
    }));
  };

  // Weekly Live Schedule CRUD
  const addWeeklySlot: PlatformContextValue['addWeeklySlot'] = (input) => {
    const slot: WeeklyLiveSlot = {
      id: `ws-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      dayOfWeek: input.dayOfWeek,
      timeLabel: input.timeLabel.trim(),
      track: input.track,
      subStage: input.subStage.trim() || 'جميع الصفوف',
      branch:
        input.branch && input.branch !== 'جميع الفروع' && input.branch !== 'الجميع'
          ? input.branch.trim()
          : undefined,
      subject: input.subject.trim(),
      note: input.note?.trim() || undefined,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setDb((prev) => ({
      ...prev,
      weeklySchedule: [...prev.weeklySchedule, slot],
    }));
    if (isFirebaseLiveConfigured()) {
      void syncWeeklySlotToFirestore(slot);
    }
    return slot;
  };

  const updateWeeklySlot: PlatformContextValue['updateWeeklySlot'] = (slotId, updates) => {
    setDb((prev) => ({
      ...prev,
      weeklySchedule: prev.weeklySchedule.map((slot) => {
        if (slot.id !== slotId) return slot;
        const updated: WeeklyLiveSlot = {
          ...slot,
          ...updates,
          timeLabel: updates.timeLabel !== undefined ? updates.timeLabel.trim() : slot.timeLabel,
          subject: updates.subject !== undefined ? updates.subject.trim() : slot.subject,
          branch:
            updates.branch !== undefined
              ? updates.branch === 'جميع الفروع' || updates.branch === 'الجميع' || !updates.branch.trim()
                ? undefined
                : updates.branch.trim()
              : slot.branch,
          note: updates.note !== undefined ? updates.note.trim() || undefined : slot.note,
        };
        if (isFirebaseLiveConfigured()) {
          void syncWeeklySlotToFirestore(updated);
        }
        return updated;
      }),
    }));
  };

  const deleteWeeklySlot = (slotId: string) => {
    setDb((prev) => ({
      ...prev,
      weeklySchedule: prev.weeklySchedule.filter((s) => s.id !== slotId),
    }));
    if (isFirebaseLiveConfigured()) {
      void deleteWeeklySlotFromFirestore(slotId);
    }
  };

  // Breaking Announcement Banner Handlers
  const updateBreakingAnnouncement: PlatformContextValue['updateBreakingAnnouncement'] = (
    updates
  ) => {
    const updatedAt = `${new Date().toISOString().slice(0, 10)} ${formatCurrentTimeHHMM()}`;
    setDb((prev) => ({
      ...prev,
      breakingAnnouncement: {
        ...prev.breakingAnnouncement,
        ...updates,
        message:
          updates.message !== undefined
            ? updates.message.trim()
            : prev.breakingAnnouncement.message,
        updatedAt,
      },
    }));
  };

  const toggleBreakingAnnouncement = () => {
    const updatedAt = `${new Date().toISOString().slice(0, 10)} ${formatCurrentTimeHHMM()}`;
    setDb((prev) => ({
      ...prev,
      breakingAnnouncement: {
        ...prev.breakingAnnouncement,
        isActive: !prev.breakingAnnouncement.isActive,
        updatedAt,
      },
    }));
  };

  const resetDemoPlatform = () => {
    clearSimulatedAnswerTimers();
    const fresh = resetDatabase();
    setDb(fresh);
    setLiveQuizRoom(createIdleLiveQuizRoom());
    setCurrentUserId(null);
    setDeviceLockViolation(null);
  };

  return (
    <PlatformContext.Provider
      value={{
        db,
        liveSession,
        currentUser,
        activeAppMode,
        isPreviewMode: IS_PREVIEW_MODE,
        isFirebaseLive,
        authAccessToken,
        refreshFromFirestore,
        currentDeviceId,
        deviceLockViolation,
        clearDeviceLockViolation,
        rotateSimulatedDeviceId,
        login,
        registerStudent,
        logout,
        updateMyParentPhone,
        updateStudentParentPhone,
        redeemCode,
        markLessonWatched,
        saveQuizAttempt,
        recordStudentAttendance,
        toggleMyRaiseHand,
        sendLiveChatMessage,
        startLiveBroadcast,
        endLiveBroadcast,
        setLiveShareMode,
        setLiveSlideIndex,
        toggleParticipantMic,
        muteAllParticipants,
        simulateIncomingRaiseHand,
        isSuperAdmin,
        canDelete,
        hasPermission,
        verifyTeacherPin,
        getTrackName,
        addModerator,
        updateModerator,
        toggleModeratorActive,
        deleteModerator,
        addTrack,
        updateTrack,
        deleteTrack,
        generateCodes,
        deleteActivationCode,
        toggleStudentActive,
        resetStudentDevice,
        updateStudentProfile,
        deleteStudent,
        addNewCourse,
        updateCourse,
        deleteCourse,
        addLessonToCourse,
        updateLessonInCourse,
        deleteLessonFromCourse,
        addPdfToCourse,
        updatePdfInCourse,
        deletePdfFromCourse,
        addQuizToCourse,
        updateQuizInCourse,
        deleteQuizFromCourse,
        createAssignment,
        updateAssignment,
        deleteAssignment,
        toggleAssignmentCompleted,
        markAssignmentNotificationsRead,
        liveQuizRoom,
        startLiveQuizRoom,
        startDemoLiveQuizPreview,
        sendLiveQuizQuestion,
        submitLiveQuizAnswer,
        endLiveQuizRoom,
        resetLiveQuizRoom,
        markLiveQuizResultsRead,
        addWeeklySlot,
        updateWeeklySlot,
        deleteWeeklySlot,
        updateBreakingAnnouncement,
        toggleBreakingAnnouncement,
        updatePaymentSettings,
        updateStudentDueDate,
        renewStudentSubscription,
        submitRenewalRequest,
        approveRenewalRequest,
        rejectRenewalRequest,
        addStoreItem,
        updateStoreItem,
        deleteStoreItem,
        updateStoreDeliverySettings,
        createStoreOrder,
        updateStoreOrderStatus,
        deleteStoreOrder,
        updateSupportWhatsappNumber,
        updateTeacherCV,
        submitComplaint,
        replyToComplaint,
        updateComplaintStatus,
        deleteComplaint,
        markComplaintRepliesRead,
        submitInquiry,
        replyToInquiry,
        deleteInquiry,
        markInquiryRepliesRead,
        resetDemoPlatform,
      }}
    >
      {children}
    </PlatformContext.Provider>
  );
};

export function usePlatform(): PlatformContextValue {
  const ctx = useContext(PlatformContext);
  if (!ctx) {
    throw new Error('usePlatform must be used within a PlatformProvider');
  }
  return ctx;
}
