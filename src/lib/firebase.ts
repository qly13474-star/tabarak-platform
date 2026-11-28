/**
 * Firebase Authentication & Cloud Firestore Production Client
 *
 * Uses the configured Firebase project (`tabarak-platform`) for:
 *   1. Email/Password Authentication with deterministic Iraqi phone synthetic emails (`{phone}@tabarak.edu.iq`)
 *   2. Real-time Cloud Firestore listeners (`onSnapshot`) across users, tracks, courses,
 *      store items, store orders, attendance records, device locks, and live quiz chat rooms
 *   3. Write-through persistence & Single Device Lock enforcement
 */

import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  getAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  User as FirebaseAuthUser,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  query,
  setDoc,
  Unsubscribe,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  ActivationCode,
  AdminPermissionKey,
  AttendanceRecord,
  Course,
  DailyAssignment,
  LiveQuizRoomSession,
  RenewalRequest,
  StoreItem,
  StoreOrder,
  StoreOrderStatus,
  StudentComplaint,
  StudentInquiry,
  TrackOption,
  UserProfile,
  WeeklyLiveSlot,
} from '../types';
import { formatCurrentTimeHHMM } from '../services/livekit';

export const firebaseConfig = {
  apiKey: 'AIzaSyCtHwPx2K5DaR-QQsxol_uIYpM9w0dPjvg',
  authDomain: 'tabarak-platform.firebaseapp.com',
  projectId: 'tabarak-platform',
  storageBucket: 'tabarak-platform.firebasestorage.app',
  messagingSenderId: '316837026458',
  appId: '1:316837026458:web:a841e7a3281d2f03765d23',
};

export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firestoreDb = getFirestore(firebaseApp);

export function isFirebaseLiveConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

// ============================================================================
// Startup Connection Validation & Structured Firestore Error Handling
// ============================================================================

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function buildFirestoreErrorInfo(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  return {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: firebaseAuth.currentUser?.uid ?? null,
      email: firebaseAuth.currentUser?.email ?? null,
      emailVerified: firebaseAuth.currentUser?.emailVerified ?? null,
      isAnonymous: firebaseAuth.currentUser?.isAnonymous ?? null,
      tenantId: firebaseAuth.currentUser?.tenantId ?? null,
      providerInfo:
        firebaseAuth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo = buildFirestoreErrorInfo(error, operationType, path);
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function logFirestoreErrorNonFatal(
  error: unknown,
  operationType: OperationType,
  path: string | null
): void {
  const errInfo = buildFirestoreErrorInfo(error, operationType, path);
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

async function testConnection(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await getDocFromServer(doc(firestoreDb, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();

// ============================================================================
// Synthetic Email Formatting (Consistent across Registration & Login)
// ============================================================================

function normalizeAuthIdentifier(identifier: string): string {
  return identifier
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

export function buildSyntheticAuthEmail(identifier: string): string {
  const cleaned = normalizeAuthIdentifier(identifier);
  if (cleaned.includes('@')) return cleaned;
  return `${cleaned}@tabarak.edu.iq`;
}

function buildCandidateAuthEmails(identifier: string): string[] {
  const cleaned = normalizeAuthIdentifier(identifier);
  if (cleaned.includes('@')) return [cleaned];
  const digits = cleaned.replace(/\D/g, '');
  const base = digits.length >= 9 && /^07\d{9}$/.test(digits) ? digits : cleaned;
  return Array.from(
    new Set([
      `${base}@tabarak.edu.iq`,
      `${base}@student.tabarak.edu.iq`,
      `${base}@admin.tabarak.edu.iq`,
    ])
  );
}

// ============================================================================
// Firestore Document <-> Domain Model Mappers (supports camelCase & snake_case)
// ============================================================================

type DbRecord = Record<string, unknown>;

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function asOptionalString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v : undefined;
}

function asNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function asBoolean(v: unknown, fallback = false): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((item): item is string => typeof item === 'string') : [];
}

/**
 * Recursively strips `undefined` values because Firestore rejects `undefined` fields.
 */
function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = stripUndefinedDeep(v);
      }
    }
    return out as T;
  }
  return value;
}

export function mapUserDoc(row: DbRecord, fallbackId = ''): UserProfile {
  return {
    id: asString(row.id, fallbackId),
    fullName: asString(row.fullName ?? row.full_name),
    phone: asString(row.phone),
    username: asOptionalString(row.username),
    parentPhone: asOptionalString(row.parentPhone ?? row.parent_phone),
    password: '',
    role: row.role === 'admin' ? 'admin' : 'student',
    isSuperAdmin: asBoolean(row.isSuperAdmin ?? row.is_super_admin, false),
    adminRoleTitle: asOptionalString(row.adminRoleTitle ?? row.admin_role_title),
    permissions: Array.isArray(row.permissions)
      ? row.permissions.filter((p): p is AdminPermissionKey => typeof p === 'string')
      : undefined,
    track: asString(row.track, 'intermediate'),
    subStage: asString(row.subStage ?? row.sub_stage, 'عام'),
    branch: asOptionalString(row.branch),
    department: asOptionalString(row.department),
    deviceId:
      typeof (row.deviceId ?? row.device_id) === 'string'
        ? ((row.deviceId ?? row.device_id) as string)
        : null,
    isActive: asBoolean(row.isActive ?? row.is_active, true),
    enrolledCourseIds: asStringArray(row.enrolledCourseIds ?? row.enrolled_course_ids),
    unlockedLessonIds: asStringArray(row.unlockedLessonIds ?? row.unlocked_lesson_ids),
    subscriptionDueDate: asOptionalString(row.subscriptionDueDate ?? row.subscription_due_date),
    createdAt: asString(row.createdAt ?? row.created_at, new Date().toISOString().slice(0, 10)).slice(
      0,
      10
    ),
    lastLoginAt: asString(row.lastLoginAt ?? row.last_login_at, 'الآن'),
  };
}

export function mapUserToFirestoreDoc(user: UserProfile, authUid?: string): DbRecord {
  const payload: DbRecord = {
    id: user.id,
    fullName: user.fullName,
    phone: user.phone,
    username: user.username ?? null,
    parentPhone: user.parentPhone ?? null,
    role: user.role,
    isSuperAdmin: Boolean(user.isSuperAdmin),
    adminRoleTitle: user.adminRoleTitle ?? null,
    permissions: user.permissions ?? [],
    track: user.track,
    subStage: user.subStage,
    branch: user.branch ?? null,
    department: user.department ?? null,
    deviceId: user.deviceId ?? null,
    isActive: user.isActive,
    enrolledCourseIds: user.enrolledCourseIds ?? [],
    unlockedLessonIds: user.unlockedLessonIds ?? [],
    subscriptionDueDate: user.subscriptionDueDate ?? null,
    createdAt: user.createdAt || new Date().toISOString().slice(0, 10),
    lastLoginAt: user.lastLoginAt || 'الآن',
  };
  if (authUid) {
    payload.authUid = authUid;
  }
  return stripUndefinedDeep(payload);
}

export function mapTrackDoc(row: DbRecord, fallbackId = ''): TrackOption {
  return {
    id: asString(row.id, fallbackId),
    label: asString(row.label),
    shortLabel: asString(row.shortLabel ?? row.short_label, asString(row.label)),
    description: asString(row.description),
    subStages: asStringArray(row.subStages ?? row.sub_stages),
    branches: Array.isArray(row.branches) ? asStringArray(row.branches) : undefined,
    departments: Array.isArray(row.departments) ? asStringArray(row.departments) : undefined,
    subjects: asStringArray(row.subjects),
    specializationLabel: asOptionalString(row.specializationLabel ?? row.specialization_label),
    coverImage: asString(row.coverImage ?? row.cover_image, 'auto'),
  };
}

export function mapCourseDoc(row: DbRecord, fallbackId = ''): Course {
  return {
    id: asString(row.id, fallbackId),
    title: asString(row.title),
    subtitle: asString(row.subtitle),
    track: asString(row.track, 'intermediate'),
    subStage: asString(row.subStage ?? row.sub_stage, 'عام'),
    branch: asOptionalString(row.branch),
    subject: asOptionalString(row.subject),
    instructor: asString(row.instructor, 'الأستاذة تبارك الزيرجاوي'),
    coverImage: asString(row.coverImage ?? row.cover_image, 'auto'),
    description: asString(row.description),
    totalHours: asString(row.totalHours ?? row.total_hours, '0 ساعة'),
    priceIqd: asNumber(row.priceIqd ?? row.price_iqd, 0),
    lessons: Array.isArray(row.lessons) ? (row.lessons as Course['lessons']) : [],
    notes: Array.isArray(row.notes) ? (row.notes as Course['notes']) : [],
    quizzes: Array.isArray(row.quizzes) ? (row.quizzes as Course['quizzes']) : [],
  };
}

export function mapStoreItemDoc(row: DbRecord, fallbackId = ''): StoreItem {
  return {
    id: asString(row.id, fallbackId),
    title: asString(row.title),
    subject: asString(row.subject),
    track: asString(row.track, 'intermediate'),
    subStage: asString(row.subStage ?? row.sub_stage),
    branch: asOptionalString(row.branch),
    category: row.category === 'predictions' ? 'predictions' : 'booklet',
    description: asString(row.description),
    priceIqd: asNumber(row.priceIqd ?? row.price_iqd, 0),
    coverImage: asString(row.coverImage ?? row.cover_image, 'auto'),
    pagesInfo: asOptionalString(row.pagesInfo ?? row.pages_info),
    inStock: asBoolean(row.inStock ?? row.in_stock, true),
    createdAt: asString(row.createdAt ?? row.created_at),
  };
}

export function mapStoreOrderDoc(row: DbRecord, fallbackId = ''): StoreOrder {
  const rawStatus = asString(row.status, 'preparing');
  const status: StoreOrderStatus =
    rawStatus === 'shipped' || rawStatus === 'delivered' ? rawStatus : 'preparing';

  return {
    id: asString(row.id, fallbackId),
    receiptNumber: asString(row.receiptNumber ?? row.receipt_number),
    itemId: asString(row.itemId ?? row.item_id),
    itemTitle: asString(row.itemTitle ?? row.item_title),
    subject: asString(row.subject),
    trackLabel: asString(row.trackLabel ?? row.track_label),
    subStage: asString(row.subStage ?? row.sub_stage),
    studentId: asOptionalString(row.studentId ?? row.student_id),
    studentName: asString(row.studentName ?? row.student_name),
    phone: asString(row.phone),
    governorate: asString(row.governorate),
    address: asString(row.address),
    quantity: asNumber(row.quantity, 1),
    unitPriceIqd: asNumber(row.unitPriceIqd ?? row.unit_price_iqd, 0),
    deliveryFeeIqd: asNumber(row.deliveryFeeIqd ?? row.delivery_fee_iqd, 0),
    totalIqd: asNumber(row.totalIqd ?? row.total_iqd, 0),
    status,
    createdAt: asString(row.createdAt ?? row.created_at),
    updatedAt: asOptionalString(row.updatedAt ?? row.updated_at),
  };
}

export function mapAttendanceDoc(row: DbRecord, fallbackId = ''): AttendanceRecord {
  const rawSource = asString(row.source, 'live_broadcast');
  const source: AttendanceRecord['source'] =
    rawSource === 'course_quiz' || rawSource === 'live_quiz_chat' ? rawSource : 'live_broadcast';
  return {
    id: asString(row.id, fallbackId),
    studentId: asString(row.studentId ?? row.student_id),
    source,
    sessionKey: asString(row.sessionKey ?? row.session_key),
    title: asString(row.title),
    dateISO: asString(row.dateISO ?? row.date_iso, new Date().toISOString().slice(0, 10)),
    timestamp: asString(row.timestamp, formatCurrentTimeHHMM()),
  };
}

// ============================================================================
// 1. Firebase Authentication (Email/Password via synthetic Iraqi phone emails)
// ============================================================================

export interface FirebaseLoginResponse {
  success: boolean;
  user?: UserProfile;
  accessToken?: string;
  error?: string;
  deviceLockViolation?: {
    studentId: string;
    studentName: string;
    phone: string;
    registeredDeviceId: string;
    attemptedDeviceId: string;
  };
}

function getFirebaseAuthErrorCode(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err && typeof err.code === 'string') {
    return err.code;
  }
  return '';
}

export async function signInWithPhonePassword(params: {
  identifier: string;
  password: string;
  mode: 'student' | 'admin';
  strictStudentOnly?: boolean;
  deviceId: string;
}): Promise<FirebaseLoginResponse> {
  const cleanIdentifier = params.identifier.trim();
  const isAdminMode = params.mode === 'admin';
  const candidateEmails = buildCandidateAuthEmails(cleanIdentifier);

  let authUser: FirebaseAuthUser | null = null;
  let lastErrorCode = '';

  for (const email of candidateEmails) {
    try {
      const cred = await signInWithEmailAndPassword(firebaseAuth, email, params.password);
      if (cred.user) {
        authUser = cred.user;
        break;
      }
    } catch (err) {
      lastErrorCode = getFirebaseAuthErrorCode(err);
      // If wrong password or too many requests, no need to continue trying legacy email formats
      if (lastErrorCode === 'auth/too-many-requests') {
        return {
          success: false,
          error: 'تم تجاوز عدد محاولات تسجيل الدخول. يرجى الانتظار قليلاً ثم إعادة المحاولة.',
        };
      }
    }
  }

  if (!authUser) {
    return {
      success: false,
      error: isAdminMode
        ? 'بيانات الدخول الإدارية غير صحيحة. تحققي من اسم المستخدم/الهاتف وكلمة المرور.'
        : 'رقم الهاتف أو كلمة المرور غير صحيحة.',
    };
  }

  const authUserId = authUser.uid;
  const accessToken = await authUser.getIdToken();

  // Fetch matching profile from Firestore `users/{uid}`
  let profileData: DbRecord | null = null;
  let resolvedDocId = authUserId;
  const digitsOnly = cleanIdentifier.replace(/\D/g, '');

  try {
    const directSnap = await getDoc(doc(firestoreDb, 'users', authUserId));
    if (directSnap.exists()) {
      profileData = directSnap.data() as DbRecord;
      resolvedDocId = directSnap.id;
    }
  } catch (err) {
    logFirestoreErrorNonFatal(err, OperationType.GET, `users/${authUserId}`);
  }

  if (!profileData && digitsOnly) {
    try {
      const byPhoneSnap = await getDocs(
        query(collection(firestoreDb, 'users'), where('phone', '==', digitsOnly), limit(1))
      );
      if (!byPhoneSnap.empty) {
        const firstDoc = byPhoneSnap.docs[0];
        profileData = firstDoc.data() as DbRecord;
        resolvedDocId = firstDoc.id;
      }
    } catch (err) {
      logFirestoreErrorNonFatal(err, OperationType.LIST, 'users');
    }
  }

  if (!profileData) {
    await signOut(firebaseAuth);
    return {
      success: false,
      error: 'تم التحقق من الحساب ولكن لم يُعثر على ملف المستخدم في Firestore.',
    };
  }

  const user = mapUserDoc(profileData, resolvedDocId);

  // Enforce strict portal isolation
  if ((params.strictStudentOnly || params.mode === 'student') && user.role !== 'student') {
    await signOut(firebaseAuth);
    return { success: false, error: 'هذا التطبيق مخصص لحسابات الطلبة فقط.' };
  }
  if (params.mode === 'admin' && user.role !== 'admin') {
    await signOut(firebaseAuth);
    return { success: false, error: 'هذه البوابة مخصصة لإدارة المنصة والمشرفين المعتمدين فقط.' };
  }

  if (!user.isActive) {
    await signOut(firebaseAuth);
    return {
      success: false,
      error:
        user.role === 'admin'
          ? 'تم إيقاف حساب المشرف مؤقتاً من قبل السوبر أدمن (الأستاذة تبارك).'
          : 'تم تعليق هذا الحساب مؤقتاً من قبل الإدارة. يرجى التواصل مع الأستاذة تبارك الزيرجاوي.',
    };
  }

  // Enforce Single Device Lock for students (checks both user profile and `device_locks/{id}`)
  if (user.role === 'student') {
    let registeredDeviceId = user.deviceId;

    if (!registeredDeviceId) {
      try {
        const lockSnap = await getDoc(doc(firestoreDb, 'device_locks', user.id));
        if (lockSnap.exists()) {
          const lockDevice = lockSnap.data()?.deviceId;
          if (typeof lockDevice === 'string' && lockDevice.trim()) {
            registeredDeviceId = lockDevice;
          }
        }
      } catch (err) {
        logFirestoreErrorNonFatal(err, OperationType.GET, `device_locks/${user.id}`);
      }
    }

    if (registeredDeviceId && registeredDeviceId !== params.deviceId) {
      await signOut(firebaseAuth);
      return {
        success: false,
        error: 'هذا الحساب مرتبط بجهاز آخر.',
        deviceLockViolation: {
          studentId: user.id,
          studentName: user.fullName,
          phone: user.phone,
          registeredDeviceId,
          attemptedDeviceId: params.deviceId,
        },
      };
    }

    const nowLabel = `اليوم ${formatCurrentTimeHHMM()}`;
    if (!registeredDeviceId) {
      try {
        await updateDoc(doc(firestoreDb, 'users', user.id), {
          deviceId: params.deviceId,
          lastLoginAt: nowLabel,
        });
      } catch (err) {
        logFirestoreErrorNonFatal(err, OperationType.UPDATE, `users/${user.id}`);
      }
      await syncDeviceLockToFirestore(user.id, params.deviceId, user.phone);
      user.deviceId = params.deviceId;
      user.lastLoginAt = nowLabel;
    } else {
      try {
        await updateDoc(doc(firestoreDb, 'users', user.id), {
          lastLoginAt: nowLabel,
        });
      } catch (err) {
        logFirestoreErrorNonFatal(err, OperationType.UPDATE, `users/${user.id}`);
      }
      user.lastLoginAt = nowLabel;
    }
  }

  return {
    success: true,
    user,
    accessToken,
  };
}

export async function registerStudentInFirebase(params: {
  user: UserProfile;
  password: string;
}): Promise<{ success: boolean; user?: UserProfile; accessToken?: string; error?: string }> {
  const email = buildSyntheticAuthEmail(params.user.phone);

  let authUser: FirebaseAuthUser;
  try {
    const cred = await createUserWithEmailAndPassword(firebaseAuth, email, params.password);
    authUser = cred.user;
  } catch (err) {
    const code = getFirebaseAuthErrorCode(err);
    if (code === 'auth/email-already-in-use') {
      return {
        success: false,
        error: 'رقم الهاتف مسجّل مسبقاً في المنصة. يمكنك تسجيل الدخول مباشرة.',
      };
    }
    if (code === 'auth/weak-password') {
      return {
        success: false,
        error: 'كلمة المرور ضعيفة. يرجى اختيار كلمة مرور من 6 أحرف أو أرقام على الأقل.',
      };
    }
    if (code === 'auth/operation-not-allowed') {
      return {
        success: false,
        error: 'يرجى تفعيل مزود البريد وكلمة المرور (Email/Password) من لوحة Firebase Authentication.',
      };
    }
    return {
      success: false,
      error: 'تعذر إنشاء الحساب في Firebase. يرجى المحاولة مجدداً.',
    };
  }

  const authUid = authUser.uid;
  const accessToken = await authUser.getIdToken();
  const profileToInsert: UserProfile = {
    ...params.user,
    id: authUid,
    role: 'student',
    isSuperAdmin: false,
    password: '',
  };

  try {
    await setDoc(
      doc(firestoreDb, 'users', authUid),
      mapUserToFirestoreDoc(profileToInsert, authUid)
    );
  } catch (err) {
    logFirestoreErrorNonFatal(err, OperationType.CREATE, `users/${authUid}`);
    return {
      success: false,
      error: 'تم إنشاء الحساب ولكن تعذر حفظ بيانات الطالب في Firestore.',
    };
  }

  if (profileToInsert.deviceId) {
    await syncDeviceLockToFirestore(authUid, profileToInsert.deviceId, profileToInsert.phone);
  }

  return {
    success: true,
    user: profileToInsert,
    accessToken,
  };
}

export async function signInSuperAdminViaServer(params: {
  identifier: string;
  password: string;
}): Promise<{ success: boolean; user?: UserProfile; accessToken?: string; error?: string }> {
  try {
    const res = await fetch('/api/auth/super-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      user?: UserProfile;
      accessToken?: string;
      error?: string;
    };
    if (!res.ok || !data.success || !data.user) {
      return { success: false, error: data.error || 'رقم الهاتف أو كلمة المرور غير صحيحة.' };
    }

    // Also attempt background Firebase Auth sign-in so Firestore admin writes have an authenticated Firebase session
    try {
      const candidateEmails = buildCandidateAuthEmails(params.identifier);
      for (const email of candidateEmails) {
        try {
          const cred = await signInWithEmailAndPassword(firebaseAuth, email, params.password);
          if (cred.user) {
            const firebaseToken = await cred.user.getIdToken();
            return {
              success: true,
              user: { ...data.user, id: cred.user.uid },
              accessToken: firebaseToken || data.accessToken,
            };
          }
        } catch {
          // Try next candidate email
        }
      }
    } catch {
      // Keep server-verified Super Admin session active
    }

    return { success: true, user: data.user, accessToken: data.accessToken };
  } catch {
    return { success: false, error: 'تعذر الاتصال بخادم التحقق.' };
  }
}

export async function verifySuperAdminPinOnServer(
  pin: string,
  accessToken?: string | null,
  adminIdentifier?: string
): Promise<boolean> {
  const cleanPin = pin.trim();
  if (!cleanPin) return false;

  // 1. Primary verification: Firebase Auth re-authentication against the active signed-in admin
  const activeAuthUser = firebaseAuth.currentUser;
  if (activeAuthUser?.email) {
    try {
      const credential = EmailAuthProvider.credential(activeAuthUser.email, cleanPin);
      await reauthenticateWithCredential(activeAuthUser, credential);
      return true;
    } catch {
      // Fall through to server-side scrypt check (covers server-token Super Admin session)
    }
  }

  // 2. Server-side constant-time scrypt check with Bearer authentication
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  try {
    const res = await fetch('/api/auth/verify-pin', {
      method: 'POST',
      headers,
      body: JSON.stringify({ pin: cleanPin }),
    });
    if (res.ok) {
      const data = (await res.json()) as { valid?: boolean };
      if (data.valid) return true;
    }
  } catch {
    // Fallback below when hosted statically without Express server.ts
  }

  // 3. Static hosting fallback: verify password directly via Firebase Auth for the active Super Admin
  if (adminIdentifier) {
    for (const email of buildCandidateAuthEmails(adminIdentifier)) {
      try {
        const cred = await signInWithEmailAndPassword(firebaseAuth, email, cleanPin);
        if (cred.user) return true;
      } catch {
        // Try next candidate email
      }
    }
  }

  return false;
}

export async function signOutFromFirebase(): Promise<void> {
  try {
    await signOut(firebaseAuth);
  } catch {
    // Ignore sign-out errors
  }
}

export async function getActiveFirebaseIdToken(): Promise<string | null> {
  const user = firebaseAuth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch {
    return null;
  }
}

export function subscribeToFirebaseAuth(
  callback: (user: FirebaseAuthUser | null) => void
): Unsubscribe {
  return onAuthStateChanged(firebaseAuth, callback);
}

// ============================================================================
// 2. Cloud Firestore Queries & Real-Time Listeners (`onSnapshot`)
// ============================================================================

export interface FirestoreHydrationSnapshot {
  users?: UserProfile[];
  courses?: Course[];
  storeOrders?: StoreOrder[];
  attendanceRecords?: AttendanceRecord[];
  tracks?: TrackOption[];
  storeItems?: StoreItem[];
  liveQuizRoom?: LiveQuizRoomSession;
  activationCodes?: ActivationCode[];
  renewalRequests?: RenewalRequest[];
  complaints?: StudentComplaint[];
  inquiries?: StudentInquiry[];
  assignments?: DailyAssignment[];
  weeklySchedule?: WeeklyLiveSlot[];
  supportWhatsappNumber?: string;
}

export async function fetchPlatformSettingsFromFirestore(): Promise<{
  supportWhatsappNumber?: string;
} | null> {
  const path = 'settings/platform';
  try {
    const snap = await getDoc(doc(firestoreDb, 'settings', 'platform'));
    if (!snap.exists()) return null;
    const data = snap.data() as DbRecord;
    const phone = asOptionalString(data.supportWhatsappNumber ?? data.support_whatsapp_number);
    return phone ? { supportWhatsappNumber: phone } : null;
  } catch (err) {
    logFirestoreErrorNonFatal(err, OperationType.GET, path);
    return null;
  }
}

export async function fetchTracksFromFirestore(): Promise<TrackOption[] | null> {
  const colPath = 'tracks';
  try {
    const snap = await getDocs(collection(firestoreDb, colPath));
    return snap.docs.map((d) => mapTrackDoc(d.data() as DbRecord, d.id));
  } catch (err) {
    logFirestoreErrorNonFatal(err, OperationType.LIST, colPath);
    return null;
  }
}

export async function fetchCoursesFromFirestore(): Promise<Course[] | null> {
  const colPath = 'courses';
  try {
    const snap = await getDocs(collection(firestoreDb, colPath));
    return snap.docs.map((d) => mapCourseDoc(d.data() as DbRecord, d.id));
  } catch (err) {
    logFirestoreErrorNonFatal(err, OperationType.LIST, colPath);
    return null;
  }
}

export async function fetchStoreItemsFromFirestore(): Promise<StoreItem[] | null> {
  const colPath = 'store_items';
  try {
    const snap = await getDocs(collection(firestoreDb, colPath));
    return snap.docs.map((d) => mapStoreItemDoc(d.data() as DbRecord, d.id));
  } catch (err) {
    logFirestoreErrorNonFatal(err, OperationType.LIST, colPath);
    return null;
  }
}

export async function fetchStoreOrdersFromFirestore(
  studentId?: string
): Promise<StoreOrder[] | null> {
  const colPath = 'store_orders';
  try {
    const q = studentId
      ? query(collection(firestoreDb, colPath), where('studentId', '==', studentId))
      : collection(firestoreDb, colPath);
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapStoreOrderDoc(d.data() as DbRecord, d.id));
  } catch (err) {
    logFirestoreErrorNonFatal(err, OperationType.LIST, colPath);
    return null;
  }
}

export async function fetchAttendanceRecordsFromFirestore(
  studentId?: string
): Promise<AttendanceRecord[] | null> {
  const colPath = 'attendance_records';
  try {
    const q = studentId
      ? query(collection(firestoreDb, colPath), where('studentId', '==', studentId))
      : collection(firestoreDb, colPath);
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapAttendanceDoc(d.data() as DbRecord, d.id));
  } catch (err) {
    logFirestoreErrorNonFatal(err, OperationType.LIST, colPath);
    return null;
  }
}

export async function fetchAllUsersFromFirestore(): Promise<UserProfile[] | null> {
  const colPath = 'users';
  try {
    const snap = await getDocs(collection(firestoreDb, colPath));
    return snap.docs.map((d) => mapUserDoc(d.data() as DbRecord, d.id));
  } catch (err) {
    logFirestoreErrorNonFatal(err, OperationType.LIST, colPath);
    return null;
  }
}

export async function fetchWeeklyScheduleFromFirestore(): Promise<WeeklyLiveSlot[] | null> {
  const colPath = 'weekly_schedule';
  try {
    const snap = await getDocs(collection(firestoreDb, colPath));
    return snap.docs.map((d) => ({ ...(d.data() as WeeklyLiveSlot), id: d.id }));
  } catch (err) {
    logFirestoreErrorNonFatal(err, OperationType.LIST, colPath);
    return null;
  }
}

export async function fetchAssignmentsFromFirestore(): Promise<DailyAssignment[] | null> {
  const colPath = 'assignments';
  try {
    const snap = await getDocs(collection(firestoreDb, colPath));
    return snap.docs.map((d) => ({ ...(d.data() as DailyAssignment), id: d.id }));
  } catch (err) {
    logFirestoreErrorNonFatal(err, OperationType.LIST, colPath);
    return null;
  }
}

export async function fetchActivationCodesFromFirestore(): Promise<ActivationCode[] | null> {
  const colPath = 'activation_codes';
  try {
    const snap = await getDocs(collection(firestoreDb, colPath));
    return snap.docs.map((d) => ({ ...(d.data() as ActivationCode), id: d.id }));
  } catch (err) {
    logFirestoreErrorNonFatal(err, OperationType.LIST, colPath);
    return null;
  }
}

export async function fetchComplaintsFromFirestore(
  studentId?: string
): Promise<StudentComplaint[] | null> {
  const colPath = 'complaints';
  try {
    const q = studentId
      ? query(collection(firestoreDb, colPath), where('studentId', '==', studentId))
      : collection(firestoreDb, colPath);
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ ...(d.data() as StudentComplaint), id: d.id }));
  } catch (err) {
    logFirestoreErrorNonFatal(err, OperationType.LIST, colPath);
    return null;
  }
}

export async function fetchInquiriesFromFirestore(
  studentId?: string
): Promise<StudentInquiry[] | null> {
  const colPath = 'inquiries';
  try {
    const q = studentId
      ? query(collection(firestoreDb, colPath), where('studentId', '==', studentId))
      : collection(firestoreDb, colPath);
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ ...(d.data() as StudentInquiry), id: d.id }));
  } catch (err) {
    logFirestoreErrorNonFatal(err, OperationType.LIST, colPath);
    return null;
  }
}

export async function fetchPlatformSnapshotFromFirestore(options?: {
  role?: 'admin' | 'student';
  userId?: string;
}): Promise<FirestoreHydrationSnapshot | null> {
  const isAdmin = options?.role === 'admin';
  const studentId = options?.role === 'student' ? options.userId : undefined;
  const isAuthenticated = isAdmin || Boolean(studentId);

  const [
    tracksRes,
    coursesRes,
    storeItemsRes,
    settingsRes,
    weeklyScheduleRes,
    usersRes,
    ordersRes,
    attendanceRes,
    assignmentsRes,
    codesRes,
    complaintsRes,
    inquiriesRes,
  ] = await Promise.allSettled([
    fetchTracksFromFirestore(),
    fetchCoursesFromFirestore(),
    fetchStoreItemsFromFirestore(),
    fetchPlatformSettingsFromFirestore(),
    fetchWeeklyScheduleFromFirestore(),
    isAdmin ? fetchAllUsersFromFirestore() : Promise.resolve(null),
    isAuthenticated ? fetchStoreOrdersFromFirestore(studentId) : Promise.resolve(null),
    isAuthenticated ? fetchAttendanceRecordsFromFirestore(studentId) : Promise.resolve(null),
    isAuthenticated ? fetchAssignmentsFromFirestore() : Promise.resolve(null),
    isAdmin ? fetchActivationCodesFromFirestore() : Promise.resolve(null),
    isAuthenticated ? fetchComplaintsFromFirestore(studentId) : Promise.resolve(null),
    isAuthenticated ? fetchInquiriesFromFirestore(studentId) : Promise.resolve(null),
  ]);

  const snapshot: FirestoreHydrationSnapshot = {};

  if (tracksRes.status === 'fulfilled' && tracksRes.value && tracksRes.value.length > 0) {
    snapshot.tracks = tracksRes.value;
  }
  if (coursesRes.status === 'fulfilled' && coursesRes.value && coursesRes.value.length > 0) {
    snapshot.courses = coursesRes.value;
  }
  if (
    storeItemsRes.status === 'fulfilled' &&
    storeItemsRes.value &&
    storeItemsRes.value.length > 0
  ) {
    snapshot.storeItems = storeItemsRes.value;
  }
  if (settingsRes.status === 'fulfilled' && settingsRes.value?.supportWhatsappNumber) {
    snapshot.supportWhatsappNumber = settingsRes.value.supportWhatsappNumber;
  }
  if (
    weeklyScheduleRes.status === 'fulfilled' &&
    weeklyScheduleRes.value &&
    weeklyScheduleRes.value.length > 0
  ) {
    snapshot.weeklySchedule = weeklyScheduleRes.value;
  }
  if (usersRes.status === 'fulfilled' && usersRes.value && usersRes.value.length > 0) {
    snapshot.users = usersRes.value;
  }
  if (ordersRes.status === 'fulfilled' && ordersRes.value && ordersRes.value.length > 0) {
    snapshot.storeOrders = ordersRes.value;
  }
  if (
    attendanceRes.status === 'fulfilled' &&
    attendanceRes.value &&
    attendanceRes.value.length > 0
  ) {
    snapshot.attendanceRecords = attendanceRes.value;
  }
  if (
    assignmentsRes.status === 'fulfilled' &&
    assignmentsRes.value &&
    assignmentsRes.value.length > 0
  ) {
    snapshot.assignments = assignmentsRes.value;
  }
  if (codesRes.status === 'fulfilled' && codesRes.value && codesRes.value.length > 0) {
    snapshot.activationCodes = codesRes.value;
  }
  if (
    complaintsRes.status === 'fulfilled' &&
    complaintsRes.value &&
    complaintsRes.value.length > 0
  ) {
    snapshot.complaints = complaintsRes.value;
  }
  if (
    inquiriesRes.status === 'fulfilled' &&
    inquiriesRes.value &&
    inquiriesRes.value.length > 0
  ) {
    snapshot.inquiries = inquiriesRes.value;
  }

  return snapshot;
}

export interface PlatformRealtimeCallbacks {
  onTracks?: (tracks: TrackOption[]) => void;
  onCourses?: (courses: Course[]) => void;
  onStoreItems?: (items: StoreItem[]) => void;
  onSupportWhatsappNumber?: (phone: string) => void;
  onWeeklySchedule?: (slots: WeeklyLiveSlot[]) => void;
  onAssignments?: (assignments: DailyAssignment[]) => void;
  onActivationCodes?: (codes: ActivationCode[]) => void;
  onComplaints?: (complaints: StudentComplaint[]) => void;
  onInquiries?: (inquiries: StudentInquiry[]) => void;
  onUsers?: (users: UserProfile[]) => void;
  onCurrentUserProfile?: (user: UserProfile) => void;
  onStoreOrders?: (orders: StoreOrder[]) => void;
  onAttendanceRecords?: (records: AttendanceRecord[]) => void;
  onLiveQuizRoom?: (room: LiveQuizRoomSession) => void;
}

/**
 * Attaches real-time Cloud Firestore `onSnapshot` listeners for live updates.
 * Public catalog collections (`tracks`, `courses`, `store_items`) subscribe immediately;
 * user-scoped / admin-scoped collections subscribe once Firebase Auth is active.
 */
export function subscribeToPlatformRealtime(params: {
  authUid: string | null;
  role: 'admin' | 'student' | null;
  callbacks: PlatformRealtimeCallbacks;
}): () => void {
  const unsubs: Unsubscribe[] = [];

  // 1. Public / Catalog Collections
  unsubs.push(
    onSnapshot(
      collection(firestoreDb, 'tracks'),
      (snap) => {
        if (snap.empty) return;
        params.callbacks.onTracks?.(snap.docs.map((d) => mapTrackDoc(d.data() as DbRecord, d.id)));
      },
      (error) => {
        logFirestoreErrorNonFatal(error, OperationType.LIST, 'tracks');
      }
    )
  );

  unsubs.push(
    onSnapshot(
      collection(firestoreDb, 'courses'),
      (snap) => {
        if (snap.empty) return;
        params.callbacks.onCourses?.(
          snap.docs.map((d) => mapCourseDoc(d.data() as DbRecord, d.id))
        );
      },
      (error) => {
        logFirestoreErrorNonFatal(error, OperationType.LIST, 'courses');
      }
    )
  );

  unsubs.push(
    onSnapshot(
      collection(firestoreDb, 'store_items'),
      (snap) => {
        if (snap.empty) return;
        params.callbacks.onStoreItems?.(
          snap.docs.map((d) => mapStoreItemDoc(d.data() as DbRecord, d.id))
        );
      },
      (error) => {
        logFirestoreErrorNonFatal(error, OperationType.LIST, 'store_items');
      }
    )
  );

  // Public Platform Settings (`settings/platform` -> `supportWhatsappNumber`)
  unsubs.push(
    onSnapshot(
      doc(firestoreDb, 'settings', 'platform'),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as DbRecord;
        const phone = asOptionalString(data.supportWhatsappNumber ?? data.support_whatsapp_number);
        if (phone) {
          params.callbacks.onSupportWhatsappNumber?.(phone);
        }
      },
      (error) => {
        logFirestoreErrorNonFatal(error, OperationType.GET, 'settings/platform');
      }
    )
  );

  // Public Weekly Live Schedule (`weekly_schedule`)
  unsubs.push(
    onSnapshot(
      collection(firestoreDb, 'weekly_schedule'),
      (snap) => {
        if (snap.empty) return;
        params.callbacks.onWeeklySchedule?.(
          snap.docs.map((d) => ({ ...(d.data() as WeeklyLiveSlot), id: d.id }))
        );
      },
      (error) => {
        logFirestoreErrorNonFatal(error, OperationType.LIST, 'weekly_schedule');
      }
    )
  );

  // 2. Authenticated Realtime Listeners (Role-Scoped)
  if (params.authUid && params.role) {
    // Active Live Quiz Chat Room
    unsubs.push(
      onSnapshot(
        doc(firestoreDb, 'live_quiz_rooms', 'active'),
        (snap) => {
          if (!snap.exists()) return;
          const data = snap.data() as LiveQuizRoomSession;
          if (data && data.status) {
            params.callbacks.onLiveQuizRoom?.(data);
          }
        },
        (error) => {
          logFirestoreErrorNonFatal(error, OperationType.GET, 'live_quiz_rooms/active');
        }
      )
    );

    // Daily Assignments (signed-in students & admins)
    unsubs.push(
      onSnapshot(
        collection(firestoreDb, 'assignments'),
        (snap) => {
          if (snap.empty) return;
          params.callbacks.onAssignments?.(
            snap.docs.map((d) => ({ ...(d.data() as DailyAssignment), id: d.id }))
          );
        },
        (error) => {
          logFirestoreErrorNonFatal(error, OperationType.LIST, 'assignments');
        }
      )
    );

    if (params.role === 'admin') {
      unsubs.push(
        onSnapshot(
          collection(firestoreDb, 'users'),
          (snap) => {
            if (snap.empty) return;
            params.callbacks.onUsers?.(
              snap.docs.map((d) => mapUserDoc(d.data() as DbRecord, d.id))
            );
          },
          (error) => {
            logFirestoreErrorNonFatal(error, OperationType.LIST, 'users');
          }
        )
      );

      unsubs.push(
        onSnapshot(
          collection(firestoreDb, 'store_orders'),
          (snap) => {
            params.callbacks.onStoreOrders?.(
              snap.docs.map((d) => mapStoreOrderDoc(d.data() as DbRecord, d.id))
            );
          },
          (error) => {
            logFirestoreErrorNonFatal(error, OperationType.LIST, 'store_orders');
          }
        )
      );

      unsubs.push(
        onSnapshot(
          collection(firestoreDb, 'attendance_records'),
          (snap) => {
            params.callbacks.onAttendanceRecords?.(
              snap.docs.map((d) => mapAttendanceDoc(d.data() as DbRecord, d.id))
            );
          },
          (error) => {
            logFirestoreErrorNonFatal(error, OperationType.LIST, 'attendance_records');
          }
        )
      );

      unsubs.push(
        onSnapshot(
          collection(firestoreDb, 'activation_codes'),
          (snap) => {
            if (snap.empty) return;
            params.callbacks.onActivationCodes?.(
              snap.docs.map((d) => ({ ...(d.data() as ActivationCode), id: d.id }))
            );
          },
          (error) => {
            logFirestoreErrorNonFatal(error, OperationType.LIST, 'activation_codes');
          }
        )
      );

      unsubs.push(
        onSnapshot(
          collection(firestoreDb, 'complaints'),
          (snap) => {
            if (snap.empty) return;
            params.callbacks.onComplaints?.(
              snap.docs.map((d) => ({ ...(d.data() as StudentComplaint), id: d.id }))
            );
          },
          (error) => {
            logFirestoreErrorNonFatal(error, OperationType.LIST, 'complaints');
          }
        )
      );

      unsubs.push(
        onSnapshot(
          collection(firestoreDb, 'inquiries'),
          (snap) => {
            if (snap.empty) return;
            params.callbacks.onInquiries?.(
              snap.docs.map((d) => ({ ...(d.data() as StudentInquiry), id: d.id }))
            );
          },
          (error) => {
            logFirestoreErrorNonFatal(error, OperationType.LIST, 'inquiries');
          }
        )
      );
    } else if (params.role === 'student') {
      const uid = params.authUid;
      unsubs.push(
        onSnapshot(
          doc(firestoreDb, 'users', uid),
          (snap) => {
            if (!snap.exists()) return;
            params.callbacks.onCurrentUserProfile?.(mapUserDoc(snap.data() as DbRecord, snap.id));
          },
          (error) => {
            logFirestoreErrorNonFatal(error, OperationType.GET, `users/${uid}`);
          }
        )
      );

      unsubs.push(
        onSnapshot(
          query(collection(firestoreDb, 'store_orders'), where('studentId', '==', uid)),
          (snap) => {
            params.callbacks.onStoreOrders?.(
              snap.docs.map((d) => mapStoreOrderDoc(d.data() as DbRecord, d.id))
            );
          },
          (error) => {
            logFirestoreErrorNonFatal(error, OperationType.LIST, 'store_orders');
          }
        )
      );

      unsubs.push(
        onSnapshot(
          query(collection(firestoreDb, 'attendance_records'), where('studentId', '==', uid)),
          (snap) => {
            params.callbacks.onAttendanceRecords?.(
              snap.docs.map((d) => mapAttendanceDoc(d.data() as DbRecord, d.id))
            );
          },
          (error) => {
            logFirestoreErrorNonFatal(error, OperationType.LIST, 'attendance_records');
          }
        )
      );

      unsubs.push(
        onSnapshot(
          query(collection(firestoreDb, 'complaints'), where('studentId', '==', uid)),
          (snap) => {
            params.callbacks.onComplaints?.(
              snap.docs.map((d) => ({ ...(d.data() as StudentComplaint), id: d.id }))
            );
          },
          (error) => {
            logFirestoreErrorNonFatal(error, OperationType.LIST, 'complaints');
          }
        )
      );

      unsubs.push(
        onSnapshot(
          query(collection(firestoreDb, 'inquiries'), where('studentId', '==', uid)),
          (snap) => {
            params.callbacks.onInquiries?.(
              snap.docs.map((d) => ({ ...(d.data() as StudentInquiry), id: d.id }))
            );
          },
          (error) => {
            logFirestoreErrorNonFatal(error, OperationType.LIST, 'inquiries');
          }
        )
      );
    }
  }

  return () => {
    unsubs.forEach((unsub) => {
      try {
        unsub();
      } catch {
        // Ignore cleanup error
      }
    });
  };
}

// ============================================================================
// 3. Write-Through Sync Helpers (Persist mutations directly to Cloud Firestore)
// ============================================================================

export async function syncUserProfileToFirestore(user: UserProfile): Promise<void> {
  const path = `users/${user.id}`;
  try {
    await setDoc(doc(firestoreDb, 'users', user.id), mapUserToFirestoreDoc(user), { merge: true });
  } catch (err) {
    logFirestoreErrorNonFatal(err, OperationType.WRITE, path);
  }
}

export async function deleteUserFromFirestore(userId: string): Promise<void> {
  const path = `users/${userId}`;
  try {
    await deleteDoc(doc(firestoreDb, 'users', userId));
  } catch (err) {
    logFirestoreErrorNonFatal(err, OperationType.DELETE, path);
  }
}

export async function syncDeviceLockToFirestore(
  studentId: string,
  deviceId: string,
  phone: string
): Promise<void> {
  const path = `device_locks/${studentId}`;
  try {
    await setDoc(
      doc(firestoreDb, 'device_locks', studentId),
      {
        studentId,
        deviceId,
        phone,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    logFirestoreErrorNonFatal(err, OperationType.WRITE, path);
  }
}

export async function clearDeviceLockInFirestore(studentId: string): Promise<void> {
  const path = `device_locks/${studentId}`;
  try {
    await deleteDoc(doc(firestoreDb, 'device_locks', studentId));
  } catch (err) {
    logFirestoreErrorNonFatal(err, OperationType.DELETE, path);
  }
}

export async function syncTrackToFirestore(track: TrackOption): Promise<void> {
  const path = `tracks/${track.id}`;
  try {
    await setDoc(doc(firestoreDb, 'tracks', track.id), stripUndefinedDeep(track), { merge: true });
  } catch (err) {
    logFirestoreErrorNonFatal(err, OperationType.WRITE, path);
  }
}

export async function deleteTrackFromFirestore(trackId: string): Promise<void> {
  const path = `tracks/${trackId}`;
  try {
    await deleteDoc(doc(firestoreDb, 'tracks', trackId));
  } catch (err) {
    logFirestoreErrorNonFatal(err, OperationType.DELETE, path);
  }
}

export async function syncCourseToFirestore(course: Course): Promise<void> {
  const path = `courses/${course.id}`;
  try {
    await setDoc(doc(firestoreDb, 'courses', course.id), stripUndefinedDeep(course), {
      merge: true,
    });
  } catch (err) {
    logFirestoreErrorNonFatal(err, OperationType.WRITE, path);
  }
}

export async function deleteCourseFromFirestore(courseId: string): Promise<void> {
  const path = `courses/${courseId}`;
  try {
    await deleteDoc(doc(firestoreDb, 'courses', courseId));
  } catch (err) {
    logFirestoreErrorNonFatal(err, OperationType.DELETE, path);
  }
}

export async function syncStoreItemToFirestore(item: StoreItem): Promise<void> {
  const path = `store_items/${item.id}`;
  try {
    await setDoc(doc(firestoreDb, 'store_items', item.id), stripUndefinedDeep(item), {
      merge: true,
    });
  } catch (err) {
    logFirestoreErrorNonFatal(err, OperationType.WRITE, path);
  }
}

export async function deleteStoreItemFromFirestore(itemId: string): Promise<void> {
  const path = `store_items/${itemId}`;
  try {
    await deleteDoc(doc(firestoreDb, 'store_items', itemId));
  } catch (err) {
    logFirestoreErrorNonFatal(err, OperationType.DELETE, path);
  }
}

export async function syncStoreOrderToFirestore(order: StoreOrder): Promise<void> {
  const path = `store_orders/${order.id}`;
  try {
    await setDoc(doc(firestoreDb, 'store_orders', order.id), stripUndefinedDeep(order), {
      merge: true,
    });
  } catch (err) {
    logFirestoreErrorNonFatal(err, OperationType.WRITE, path);
  }
}

export async function updateStoreOrderStatusInFirestore(
  orderId: string,
  status: StoreOrderStatus,
  updatedAt: string
): Promise<void> {
  const path = `store_orders/${orderId}`;
  try {
    await updateDoc(doc(firestoreDb, 'store_orders', orderId), { status, updatedAt });
  } catch (err) {
    logFirestoreErrorNonFatal(err, OperationType.UPDATE, path);
  }
}

export async function syncAttendanceToFirestore(record: AttendanceRecord): Promise<void> {
  const path = `attendance_records/${record.id}`;
  try {
    await setDoc(doc(firestoreDb, 'attendance_records', record.id), stripUndefinedDeep(record), {
      merge: true,
    });
  } catch (err) {
    logFirestoreErrorNonFatal(err, OperationType.WRITE, path);
  }
}

export async function syncLiveQuizRoomToFirestore(room: LiveQuizRoomSession): Promise<void> {
  const path = 'live_quiz_rooms/active';
  try {
    await setDoc(doc(firestoreDb, 'live_quiz_rooms', 'active'), stripUndefinedDeep(room), {
      merge: true,
    });
  } catch (err) {
    logFirestoreErrorNonFatal(err, OperationType.WRITE, path);
  }
}

export async function syncSupportWhatsappNumberToFirestore(
  supportWhatsappNumber: string
): Promise<boolean> {
  const path = 'settings/platform';
  try {
    await setDoc(
      doc(firestoreDb, 'settings', 'platform'),
      {
        supportWhatsappNumber: supportWhatsappNumber.trim(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    logFirestoreErrorNonFatal(err, OperationType.WRITE, path);
    return false;
  }
}

export async function deleteStoreOrderFromFirestore(orderId: string): Promise<void> {
  const path = `store_orders/${orderId}`;
  try {
    await deleteDoc(doc(firestoreDb, 'store_orders', orderId));
  } catch (err) {
    logFirestoreErrorNonFatal(err, OperationType.DELETE, path);
  }
}

export async function syncActivationCodeToFirestore(code: ActivationCode): Promise<void> {
  const path = `activation_codes/${code.id}`;
  try {
    await setDoc(doc(firestoreDb, 'activation_codes', code.id), stripUndefinedDeep(code), {
      merge: true,
    });
  } catch (err) {
    logFirestoreErrorNonFatal(err, OperationType.WRITE, path);
  }
}

export async function deleteActivationCodeFromFirestore(codeId: string): Promise<void> {
  const path = `activation_codes/${codeId}`;
  try {
    await deleteDoc(doc(firestoreDb, 'activation_codes', codeId));
  } catch (err) {
    logFirestoreErrorNonFatal(err, OperationType.DELETE, path);
  }
}

export async function syncWeeklySlotToFirestore(slot: WeeklyLiveSlot): Promise<void> {
  const path = `weekly_schedule/${slot.id}`;
  try {
    await setDoc(doc(firestoreDb, 'weekly_schedule', slot.id), stripUndefinedDeep(slot), {
      merge: true,
    });
  } catch (err) {
    logFirestoreErrorNonFatal(err, OperationType.WRITE, path);
  }
}

export async function deleteWeeklySlotFromFirestore(slotId: string): Promise<void> {
  const path = `weekly_schedule/${slotId}`;
  try {
    await deleteDoc(doc(firestoreDb, 'weekly_schedule', slotId));
  } catch (err) {
    logFirestoreErrorNonFatal(err, OperationType.DELETE, path);
  }
}

export async function syncAssignmentToFirestore(assignment: DailyAssignment): Promise<void> {
  const path = `assignments/${assignment.id}`;
  try {
    await setDoc(doc(firestoreDb, 'assignments', assignment.id), stripUndefinedDeep(assignment), {
      merge: true,
    });
  } catch (err) {
    logFirestoreErrorNonFatal(err, OperationType.WRITE, path);
  }
}

export async function deleteAssignmentFromFirestore(assignmentId: string): Promise<void> {
  const path = `assignments/${assignmentId}`;
  try {
    await deleteDoc(doc(firestoreDb, 'assignments', assignmentId));
  } catch (err) {
    logFirestoreErrorNonFatal(err, OperationType.DELETE, path);
  }
}

export async function syncComplaintToFirestore(complaint: StudentComplaint): Promise<void> {
  const path = `complaints/${complaint.id}`;
  try {
    await setDoc(doc(firestoreDb, 'complaints', complaint.id), stripUndefinedDeep(complaint), {
      merge: true,
    });
  } catch (err) {
    logFirestoreErrorNonFatal(err, OperationType.WRITE, path);
  }
}

export async function deleteComplaintFromFirestore(complaintId: string): Promise<void> {
  const path = `complaints/${complaintId}`;
  try {
    await deleteDoc(doc(firestoreDb, 'complaints', complaintId));
  } catch (err) {
    logFirestoreErrorNonFatal(err, OperationType.DELETE, path);
  }
}

export async function syncInquiryToFirestore(inquiry: StudentInquiry): Promise<void> {
  const path = `inquiries/${inquiry.id}`;
  try {
    await setDoc(doc(firestoreDb, 'inquiries', inquiry.id), stripUndefinedDeep(inquiry), {
      merge: true,
    });
  } catch (err) {
    logFirestoreErrorNonFatal(err, OperationType.WRITE, path);
  }
}

export async function deleteInquiryFromFirestore(inquiryId: string): Promise<void> {
  const path = `inquiries/${inquiryId}`;
  try {
    await deleteDoc(doc(firestoreDb, 'inquiries', inquiryId));
  } catch (err) {
    logFirestoreErrorNonFatal(err, OperationType.DELETE, path);
  }
}
