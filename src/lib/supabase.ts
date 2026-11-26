/**
 * Real Supabase Client & Production Data Repository
 *
 * Connects to https://ffyoyacdkljvzcctoiwg.supabase.co using environment variables:
 *   - VITE_SUPABASE_URL
 *   - VITE_SUPABASE_ANON_KEY (Publishable key starting with sb_publishable_ or anon JWT)
 *
 * Handles:
 *   1. Phone + Password login (Students) & Username/Phone + Password login (Super Admin & Moderators)
 *   2. Fetching & syncing Courses, Store Orders, Attendance Records, and Moderator Permissions
 *   3. Graceful fallback when VITE_SUPABASE_ANON_KEY is not yet configured in .env.local
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  ActivationCode,
  AdminPermissionKey,
  AttendanceRecord,
  Course,
  DailyAssignment,
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

function readCleanViteEnv(value: string | undefined): string {
  const trimmed = (value || '').trim();
  if (!trimmed || trimmed.startsWith('[') || trimmed.includes('MY_')) {
    return '';
  }
  return trimmed;
}

const SUPABASE_URL = readCleanViteEnv(import.meta.env.VITE_SUPABASE_URL);
const SUPABASE_ANON_KEY = readCleanViteEnv(import.meta.env.VITE_SUPABASE_ANON_KEY);

export const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          autoRefreshToken: true,
          persistSession: false, // Access tokens stay in JS memory (safer against XSS)
          detectSessionInUrl: false,
        },
      })
    : null;

export function isSupabaseLiveConfigured(): boolean {
  return Boolean(supabase);
}

export function getSupabaseUrl(): string {
  return SUPABASE_URL;
}

/**
 * Converts an Iraqi phone number or admin username into a unified deterministic auth email
 * so Supabase Auth email+password matches consistently across both registration and login.
 */
export function buildSyntheticAuthEmail(identifier: string): string {
  const cleaned = identifier.trim().toLowerCase().replace(/\s+/g, '');
  if (cleaned.includes('@')) return cleaned;
  return `${cleaned}@tabarak.edu.iq`;
}

function buildCandidateAuthEmails(identifier: string): string[] {
  const cleaned = identifier.trim().toLowerCase().replace(/\s+/g, '');
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
// Row <-> Domain Model Mappers (snake_case DB rows -> camelCase TypeScript)
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

export function mapUserRow(row: DbRecord): UserProfile {
  return {
    id: asString(row.id),
    fullName: asString(row.full_name),
    phone: asString(row.phone),
    username: asOptionalString(row.username),
    parentPhone: asOptionalString(row.parent_phone),
    // Never expose stored password hashes to UI; keep empty string when hydrated from Supabase
    password: '',
    role: row.role === 'admin' ? 'admin' : 'student',
    isSuperAdmin: asBoolean(row.is_super_admin, false),
    adminRoleTitle: asOptionalString(row.admin_role_title),
    permissions: Array.isArray(row.permissions)
      ? (row.permissions.filter((p): p is AdminPermissionKey => typeof p === 'string'))
      : undefined,
    track: asString(row.track, 'intermediate'),
    subStage: asString(row.sub_stage, 'عام'),
    branch: asOptionalString(row.branch),
    department: asOptionalString(row.department),
    deviceId: typeof row.device_id === 'string' ? row.device_id : null,
    isActive: asBoolean(row.is_active, true),
    enrolledCourseIds: asStringArray(row.enrolled_course_ids),
    unlockedLessonIds: asStringArray(row.unlocked_lesson_ids),
    subscriptionDueDate: asOptionalString(row.subscription_due_date),
    createdAt: asString(row.created_at, new Date().toISOString().slice(0, 10)).slice(0, 10),
    lastLoginAt: asString(row.last_login_at, 'الآن'),
  };
}

export function mapUserToRow(user: UserProfile, authUserId?: string): DbRecord {
  const payload: DbRecord = {
    id: user.id,
    full_name: user.fullName,
    phone: user.phone,
    username: user.username ?? null,
    parent_phone: user.parentPhone ?? null,
    role: user.role,
    is_super_admin: Boolean(user.isSuperAdmin),
    admin_role_title: user.adminRoleTitle ?? null,
    permissions: user.permissions ?? [],
    track: user.track,
    sub_stage: user.subStage,
    branch: user.branch ?? null,
    department: user.department ?? null,
    device_id: user.deviceId,
    is_active: user.isActive,
    enrolled_course_ids: user.enrolledCourseIds,
    unlocked_lesson_ids: user.unlockedLessonIds ?? [],
    subscription_due_date: user.subscriptionDueDate ?? null,
    last_login_at: user.lastLoginAt,
  };
  if (authUserId) {
    payload.auth_user_id = authUserId;
  }
  return payload;
}

export function mapCourseRow(row: DbRecord): Course {
  return {
    id: asString(row.id),
    title: asString(row.title),
    subtitle: asString(row.subtitle),
    track: asString(row.track, 'intermediate'),
    subStage: asString(row.sub_stage, 'عام'),
    branch: asOptionalString(row.branch),
    subject: asOptionalString(row.subject),
    instructor: asString(row.instructor, 'الأستاذة تبارك الأزيرجاوي'),
    coverImage: asString(row.cover_image, 'auto'),
    description: asString(row.description),
    totalHours: asString(row.total_hours, '0 ساعة'),
    priceIqd: asNumber(row.price_iqd, 0),
    lessons: Array.isArray(row.lessons) ? (row.lessons as Course['lessons']) : [],
    notes: Array.isArray(row.notes) ? (row.notes as Course['notes']) : [],
    quizzes: Array.isArray(row.quizzes) ? (row.quizzes as Course['quizzes']) : [],
  };
}

export function mapCourseToRow(course: Course): DbRecord {
  return {
    id: course.id,
    title: course.title,
    subtitle: course.subtitle,
    track: course.track,
    sub_stage: course.subStage,
    branch: course.branch ?? null,
    subject: course.subject ?? null,
    instructor: course.instructor,
    cover_image: course.coverImage,
    description: course.description,
    total_hours: course.totalHours,
    price_iqd: course.priceIqd ?? 0,
    lessons: course.lessons,
    notes: course.notes,
    quizzes: course.quizzes,
  };
}

export function mapStoreOrderRow(row: DbRecord): StoreOrder {
  const rawStatus = asString(row.status, 'preparing');
  const status: StoreOrderStatus =
    rawStatus === 'shipped' || rawStatus === 'delivered' ? rawStatus : 'preparing';

  return {
    id: asString(row.id),
    receiptNumber: asString(row.receipt_number),
    itemId: asString(row.item_id),
    itemTitle: asString(row.item_title),
    subject: asString(row.subject),
    trackLabel: asString(row.track_label),
    subStage: asString(row.sub_stage),
    studentId: asOptionalString(row.student_id),
    studentName: asString(row.student_name),
    phone: asString(row.phone),
    governorate: asString(row.governorate),
    address: asString(row.address),
    quantity: asNumber(row.quantity, 1),
    unitPriceIqd: asNumber(row.unit_price_iqd, 0),
    deliveryFeeIqd: asNumber(row.delivery_fee_iqd, 0),
    totalIqd: asNumber(row.total_iqd, 0),
    status,
    createdAt: asString(row.created_at),
    updatedAt: asOptionalString(row.updated_at),
  };
}

export function mapStoreOrderToRow(order: StoreOrder): DbRecord {
  return {
    id: order.id,
    receipt_number: order.receiptNumber,
    item_id: order.itemId,
    item_title: order.itemTitle,
    subject: order.subject,
    track_label: order.trackLabel,
    sub_stage: order.subStage,
    student_id: order.studentId ?? null,
    student_name: order.studentName,
    phone: order.phone,
    governorate: order.governorate,
    address: order.address,
    quantity: order.quantity,
    unit_price_iqd: order.unitPriceIqd,
    delivery_fee_iqd: order.deliveryFeeIqd,
    total_iqd: order.totalIqd,
    status: order.status,
    created_at: order.createdAt,
    updated_at: order.updatedAt ?? null,
  };
}

export function mapAttendanceRow(row: DbRecord): AttendanceRecord {
  const rawSource = asString(row.source, 'live_broadcast');
  const source: AttendanceRecord['source'] =
    rawSource === 'course_quiz' || rawSource === 'live_quiz_chat' ? rawSource : 'live_broadcast';
  return {
    id: asString(row.id),
    studentId: asString(row.student_id),
    source,
    sessionKey: asString(row.session_key),
    title: asString(row.title),
    dateISO: asString(row.date_iso, new Date().toISOString().slice(0, 10)),
    timestamp: asString(row.timestamp, formatCurrentTimeHHMM()),
  };
}

export function mapAttendanceToRow(rec: AttendanceRecord): DbRecord {
  return {
    id: rec.id,
    student_id: rec.studentId,
    source: rec.source,
    session_key: rec.sessionKey,
    title: rec.title,
    date_iso: rec.dateISO,
    timestamp: rec.timestamp,
  };
}

// ============================================================================
// 1. Authentication (Phone/Username + Password via Supabase Auth + users table)
// ============================================================================

export interface SupabaseLoginResponse {
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

export async function signInWithPhonePassword(params: {
  identifier: string;
  password: string;
  mode: 'student' | 'admin';
  strictStudentOnly?: boolean;
  deviceId: string;
}): Promise<SupabaseLoginResponse> {
  if (!supabase) {
    return {
      success: false,
      error: 'لم يتم ربط Supabase بعد.',
    };
  }

  const cleanIdentifier = params.identifier.trim();
  const isAdminMode = params.mode === 'admin';
  const candidateEmails = buildCandidateAuthEmails(cleanIdentifier);

  let authSession: { session: { access_token: string } | null; user: { id: string } | null } | null =
    null;

  // Try unified & legacy synthetic email formats consistently
  for (const email of candidateEmails) {
    const attempt = await supabase.auth.signInWithPassword({
      email,
      password: params.password,
    });
    if (attempt.data?.session && attempt.data?.user) {
      authSession = attempt.data;
      break;
    }
  }

  // Also try E.164 Iraqi phone auth if input is an 11-digit 07xxxxxxxxx number
  const digitsOnly = cleanIdentifier.replace(/\D/g, '');
  if (!authSession?.session && /^07\d{9}$/.test(digitsOnly)) {
    const e164Phone = `+964${digitsOnly.slice(1)}`;
    const phoneAuth = await supabase.auth.signInWithPassword({
      phone: e164Phone,
      password: params.password,
    });
    if (phoneAuth.data?.session && phoneAuth.data?.user) {
      authSession = phoneAuth.data;
    }
  }

  if (!authSession?.session || !authSession.user) {
    return {
      success: false,
      error: isAdminMode
        ? 'بيانات الدخول الإدارية غير صحيحة. تحققي من اسم المستخدم/الهاتف وكلمة المرور.'
        : 'رقم الهاتف أو كلمة المرور غير صحيحة.',
    };
  }

  const authUserId = authSession.user.id;
  const accessToken = authSession.session.access_token;

  // Fetch matching profile from `users` table using parameterized .eq() queries
  let { data: profileRow, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (!profileRow && !profileError) {
    const fallbackRes = await supabase
      .from('users')
      .select('*')
      .eq('id', authUserId)
      .maybeSingle();
    profileRow = fallbackRes.data;
    profileError = fallbackRes.error;
  }

  if (!profileRow && !profileError && digitsOnly) {
    const byPhoneRes = await supabase
      .from('users')
      .select('*')
      .eq('phone', digitsOnly)
      .maybeSingle();
    profileRow = byPhoneRes.data;
    profileError = byPhoneRes.error;
  }

  if (profileError || !profileRow) {
    await supabase.auth.signOut();
    return {
      success: false,
      error: 'تم التحقق من الحساب ولكن لم يُعثر على ملف المستخدم في جدول users.',
    };
  }

  const user = mapUserRow(profileRow as DbRecord);

  // Enforce strict portal isolation: student portal accepts students only; admin portal accepts admins only
  if ((params.strictStudentOnly || params.mode === 'student') && user.role !== 'student') {
    await supabase.auth.signOut();
    return { success: false, error: 'هذا التطبيق مخصص لحسابات الطلبة فقط.' };
  }
  if (params.mode === 'admin' && user.role !== 'admin') {
    await supabase.auth.signOut();
    return { success: false, error: 'هذه البوابة مخصصة لإدارة المنصة والمشرفين المعتمدين فقط.' };
  }

  if (!user.isActive) {
    await supabase.auth.signOut();
    return {
      success: false,
      error:
        user.role === 'admin'
          ? 'تم إيقاف حساب المشرف مؤقتاً من قبل السوبر أدمن (الأستاذة تبارك).'
          : 'تم تعليق هذا الحساب مؤقتاً من قبل الإدارة. يرجى التواصل مع الأستاذة تبارك الأزيرجاوي.',
    };
  }

  // Enforce Single Device Lock for students
  if (user.role === 'student') {
    if (user.deviceId && user.deviceId !== params.deviceId) {
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'هذا الحساب مرتبط بجهاز آخر.',
        deviceLockViolation: {
          studentId: user.id,
          studentName: user.fullName,
          phone: user.phone,
          registeredDeviceId: user.deviceId,
          attemptedDeviceId: params.deviceId,
        },
      };
    }

    const nowLabel = `اليوم ${formatCurrentTimeHHMM()}`;
    if (!user.deviceId) {
      await supabase
        .from('users')
        .update({ device_id: params.deviceId, last_login_at: nowLabel })
        .eq('id', user.id);
      user.deviceId = params.deviceId;
      user.lastLoginAt = nowLabel;
    } else {
      await supabase.from('users').update({ last_login_at: nowLabel }).eq('id', user.id);
      user.lastLoginAt = nowLabel;
    }
  }

  return {
    success: true,
    user,
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
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  try {
    const res = await fetch('/api/auth/verify-pin', {
      method: 'POST',
      headers,
      body: JSON.stringify({ pin }),
    });
    if (res.ok) {
      const data = (await res.json()) as { valid?: boolean };
      return Boolean(data.valid);
    }
  } catch {
    // Fallback below when hosted on static Cloudflare Pages / Netlify without server.ts
  }

  // Static hosting fallback: verify password directly via Supabase Auth for the active Super Admin
  if (supabase && adminIdentifier) {
    for (const email of buildCandidateAuthEmails(adminIdentifier)) {
      const check = await supabase.auth.signInWithPassword({ email, password: pin });
      if (check.data?.session && check.data?.user) {
        return true;
      }
    }
  }
  return false;
}

export async function registerStudentInSupabase(params: {
  user: UserProfile;
  password: string;
}): Promise<{ success: boolean; user?: UserProfile; accessToken?: string; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase غير مفعّل.' };
  }

  const email = buildSyntheticAuthEmail(params.user.phone);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password: params.password,
    options: {
      data: {
        full_name: params.user.fullName,
        phone: params.user.phone,
        role: 'student',
      },
    },
  });

  if (signUpError || !signUpData.user) {
    return {
      success: false,
      error: signUpError?.message?.includes('already')
        ? 'رقم الهاتف مسجّل مسبقاً في المنصة.'
        : 'تعذر إنشاء الحساب في قاعدة البيانات. يرجى المحاولة مجدداً.',
    };
  }

  const authUserId = signUpData.user.id;
  const profileToInsert: UserProfile = {
    ...params.user,
    id: authUserId,
    password: '',
  };

  const { error: insertError } = await supabase
    .from('users')
    .upsert(mapUserToRow(profileToInsert, authUserId));

  if (insertError) {
    return {
      success: false,
      error: 'تم إنشاء الحساب ولكن تعذر حفظ بيانات الطالب في جدول users.',
    };
  }

  return {
    success: true,
    user: profileToInsert,
    accessToken: signUpData.session?.access_token,
  };
}

export async function signOutFromSupabase(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getActiveSupabaseAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

// ============================================================================
// 2. Real Table Queries: Courses, Store Orders, Attendance, Moderators & Users
// ============================================================================

export async function fetchCoursesFromSupabase(): Promise<Course[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: false });
  if (error || !data) return null;
  return data.map((row) => mapCourseRow(row as DbRecord));
}

export async function fetchStoreOrdersFromSupabase(): Promise<StoreOrder[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('store_orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error || !data) return null;
  return data.map((row) => mapStoreOrderRow(row as DbRecord));
}

export async function fetchAttendanceRecordsFromSupabase(
  studentId?: string
): Promise<AttendanceRecord[] | null> {
  if (!supabase) return null;
  let query = supabase
    .from('attendance_records')
    .select('*')
    .order('date_iso', { ascending: false });
  if (studentId) {
    query = query.eq('student_id', studentId);
  }
  const { data, error } = await query;
  if (error || !data) return null;
  return data.map((row) => mapAttendanceRow(row as DbRecord));
}

export async function fetchModeratorsFromSupabase(): Promise<UserProfile[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'admin')
    .order('created_at', { ascending: false });
  if (error || !data) return null;
  return data.map((row) => mapUserRow(row as DbRecord));
}

export async function fetchAllUsersFromSupabase(): Promise<UserProfile[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
  if (error || !data) return null;
  return data.map((row) => mapUserRow(row as DbRecord));
}

export interface SupabaseHydrationSnapshot {
  users?: UserProfile[];
  courses?: Course[];
  storeOrders?: StoreOrder[];
  attendanceRecords?: AttendanceRecord[];
  tracks?: TrackOption[];
  storeItems?: StoreItem[];
  activationCodes?: ActivationCode[];
  renewalRequests?: RenewalRequest[];
  complaints?: StudentComplaint[];
  inquiries?: StudentInquiry[];
  assignments?: DailyAssignment[];
  weeklySchedule?: WeeklyLiveSlot[];
}

export async function fetchPlatformSnapshotFromSupabase(): Promise<SupabaseHydrationSnapshot | null> {
  if (!supabase) return null;

  const [usersRes, coursesRes, ordersRes, attendanceRes, tracksRes, storeItemsRes] =
    await Promise.allSettled([
      fetchAllUsersFromSupabase(),
      fetchCoursesFromSupabase(),
      fetchStoreOrdersFromSupabase(),
      fetchAttendanceRecordsFromSupabase(),
      supabase.from('tracks').select('*'),
      supabase.from('store_items').select('*').order('created_at', { ascending: false }),
    ]);

  const snapshot: SupabaseHydrationSnapshot = {};

  if (usersRes.status === 'fulfilled' && usersRes.value && usersRes.value.length > 0) {
    snapshot.users = usersRes.value;
  }
  if (coursesRes.status === 'fulfilled' && coursesRes.value && coursesRes.value.length > 0) {
    snapshot.courses = coursesRes.value;
  }
  if (ordersRes.status === 'fulfilled' && ordersRes.value) {
    snapshot.storeOrders = ordersRes.value;
  }
  if (attendanceRes.status === 'fulfilled' && attendanceRes.value) {
    snapshot.attendanceRecords = attendanceRes.value;
  }
  if (
    tracksRes.status === 'fulfilled' &&
    !tracksRes.value.error &&
    Array.isArray(tracksRes.value.data) &&
    tracksRes.value.data.length > 0
  ) {
    snapshot.tracks = tracksRes.value.data.map((r: DbRecord) => ({
      id: asString(r.id),
      label: asString(r.label),
      shortLabel: asString(r.short_label, asString(r.label)),
      description: asString(r.description),
      subStages: asStringArray(r.sub_stages),
      branches: Array.isArray(r.branches) ? asStringArray(r.branches) : undefined,
      departments: Array.isArray(r.departments) ? asStringArray(r.departments) : undefined,
      subjects: asStringArray(r.subjects),
      specializationLabel: asOptionalString(r.specialization_label),
      coverImage: asString(r.cover_image, 'auto'),
    }));
  }
  if (
    storeItemsRes.status === 'fulfilled' &&
    !storeItemsRes.value.error &&
    Array.isArray(storeItemsRes.value.data) &&
    storeItemsRes.value.data.length > 0
  ) {
    snapshot.storeItems = storeItemsRes.value.data.map((r: DbRecord) => ({
      id: asString(r.id),
      title: asString(r.title),
      subject: asString(r.subject),
      track: asString(r.track, 'intermediate'),
      subStage: asString(r.sub_stage),
      branch: asOptionalString(r.branch),
      category: r.category === 'predictions' ? 'predictions' : 'booklet',
      description: asString(r.description),
      priceIqd: asNumber(r.price_iqd, 0),
      coverImage: asString(r.cover_image, 'auto'),
      pagesInfo: asOptionalString(r.pages_info),
      inStock: asBoolean(r.in_stock, true),
      createdAt: asString(r.created_at),
    }));
  }

  return snapshot;
}

// ============================================================================
// 3. Write-Through Sync Helpers (Persist mutations directly to Supabase tables)
// ============================================================================

export async function syncCourseToSupabase(course: Course): Promise<void> {
  if (!supabase) return;
  await supabase.from('courses').upsert(mapCourseToRow(course));
}

export async function deleteCourseFromSupabase(courseId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from('courses').delete().eq('id', courseId);
}

export async function syncStoreOrderToSupabase(order: StoreOrder): Promise<void> {
  if (!supabase) return;
  await supabase.from('store_orders').upsert(mapStoreOrderToRow(order));
}

export async function updateStoreOrderStatusInSupabase(
  orderId: string,
  status: StoreOrderStatus,
  updatedAt: string
): Promise<void> {
  if (!supabase) return;
  await supabase.from('store_orders').update({ status, updated_at: updatedAt }).eq('id', orderId);
}

export async function syncAttendanceToSupabase(record: AttendanceRecord): Promise<void> {
  if (!supabase) return;
  await supabase.from('attendance_records').upsert(mapAttendanceToRow(record));
}

export async function syncUserProfileToSupabase(user: UserProfile): Promise<void> {
  if (!supabase) return;
  await supabase.from('users').upsert(mapUserToRow(user));
}

export async function deleteUserFromSupabase(userId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from('users').delete().eq('id', userId);
}
