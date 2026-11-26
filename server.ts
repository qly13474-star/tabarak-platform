import crypto from 'crypto';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { AccessToken } from 'livekit-server-sdk';

// Load .env.local first (if created locally), then .env
dotenv.config({ path: '.env.local' });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_STRICT_STUDENT_APP = (process.env.VITE_APP_MODE || '').trim().toLowerCase() === 'student';

// Ephemeral in-memory HMAC signing key fallback (never persisted to disk)
const SERVER_SESSION_SECRET =
  (process.env.SESSION_SECRET || '').trim() || crypto.randomBytes(32).toString('hex');

// Precomputed salted scrypt digest for the default Super Admin password (overridden by SUPER_ADMIN_PASSWORD env var when set)
const DEFAULT_SUPER_ADMIN_PHONE = '07848333046';
const DEFAULT_SUPER_ADMIN_USERNAME = 'tabarak';
const DEFAULT_SUPER_ADMIN_SCRYPT_SALT = 'tabarak_sa_2026_v1';
const DEFAULT_SUPER_ADMIN_SCRYPT_HEX =
  'c3dce322748764d50a13b2b54ab0b4c67886059377741c52fad57640ba0df0cf3ccf15d9e52f151f5c31dc6f8818aa3c6f99234987bb4acb53af5a0a8eeb7d5d';

function cleanEnvValue(value: string | undefined): string {
  const trimmed = (value || '').trim();
  if (!trimmed || trimmed.startsWith('[') || trimmed.includes('MY_')) {
    return '';
  }
  return trimmed;
}

function safeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function getConfiguredSuperAdminPhone(): string {
  return cleanEnvValue(process.env.SUPER_ADMIN_PHONE) || DEFAULT_SUPER_ADMIN_PHONE;
}

function verifySuperAdminPassword(candidatePassword: string): boolean {
  const cleanPass = candidatePassword.trim();
  if (!cleanPass) return false;

  const envPassword = cleanEnvValue(process.env.SUPER_ADMIN_PASSWORD);
  if (envPassword) {
    return safeEqualStrings(cleanPass, envPassword);
  }

  const derived = crypto.scryptSync(cleanPass, DEFAULT_SUPER_ADMIN_SCRYPT_SALT, 64);
  const expected = Buffer.from(DEFAULT_SUPER_ADMIN_SCRYPT_HEX, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

function verifySuperAdminIdentifier(rawIdentifier: string): boolean {
  const clean = rawIdentifier.trim();
  if (!clean) return false;
  const digits = clean.replace(/\D/g, '');
  const lower = clean.toLowerCase();
  const configuredPhone = getConfiguredSuperAdminPhone();

  return (
    digits === configuredPhone ||
    clean === configuredPhone ||
    lower === DEFAULT_SUPER_ADMIN_USERNAME ||
    lower === `${configuredPhone}@tabarak.edu.iq` ||
    lower === `${configuredPhone}@admin.tabarak.edu.iq`
  );
}

function signServerAdminToken(payload: {
  id: string;
  fullName: string;
  role: 'admin';
  isSuperAdmin: boolean;
}): string {
  const headerB64 = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'TABARAK-SA' })).toString(
    'base64url'
  );
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60; // 12 hours
  const bodyB64 = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  const sig = crypto
    .createHmac('sha256', SERVER_SESSION_SECRET)
    .update(`${headerB64}.${bodyB64}`)
    .digest('base64url');
  return `${headerB64}.${bodyB64}.${sig}`;
}

function verifyServerAdminToken(
  token: string
): { id: string; fullName: string; role: 'admin'; isSuperAdmin: boolean } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, bodyB64, sig] = parts;
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8')) as {
      typ?: string;
    };
    if (header.typ !== 'TABARAK-SA') return null;

    const expectedSig = crypto
      .createHmac('sha256', SERVER_SESSION_SECRET)
      .update(`${headerB64}.${bodyB64}`)
      .digest('base64url');
    if (!safeEqualStrings(sig, expectedSig)) return null;

    const body = JSON.parse(Buffer.from(bodyB64, 'base64url').toString('utf8')) as {
      id?: string;
      fullName?: string;
      role?: string;
      isSuperAdmin?: boolean;
      exp?: number;
    };
    if (!body.exp || Math.floor(Date.now() / 1000) > body.exp) return null;
    if (body.role !== 'admin' || !body.id) return null;

    return {
      id: body.id,
      fullName: body.fullName || 'الأستاذة تبارك الأزيرجاوي',
      role: 'admin',
      isSuperAdmin: Boolean(body.isSuperAdmin),
    };
  } catch {
    return null;
  }
}

function buildSuperAdminProfile() {
  const phone = getConfiguredSuperAdminPhone();
  return {
    id: 'admin-tabarak',
    fullName: 'الأستاذة تبارك الأزيرجاوي',
    phone,
    username: DEFAULT_SUPER_ADMIN_USERNAME,
    password: '',
    role: 'admin' as const,
    isSuperAdmin: true,
    adminRoleTitle: 'السوبر أدمن — صاحبة المنصة',
    track: 'intermediate',
    subStage: 'الإدارة الأكاديمية',
    deviceId: null,
    isActive: true,
    enrolledCourseIds: [] as string[],
    createdAt: '2025-09-01',
    lastLoginAt: 'الآن',
  };
}

function getLiveKitServerConfig() {
  const wsUrl = cleanEnvValue(process.env.LIVEKIT_URL);
  const apiKey = cleanEnvValue(process.env.LIVEKIT_API_KEY);
  const apiSecret = cleanEnvValue(process.env.LIVEKIT_API_SECRET);
  const isValidWsUrl =
    wsUrl.startsWith('wss://') ||
    (!IS_PRODUCTION && (wsUrl.startsWith('ws://localhost') || wsUrl.startsWith('ws://127.0.0.1')));

  return {
    wsUrl,
    apiKey,
    apiSecret,
    configured: Boolean(wsUrl && apiKey && apiSecret && isValidWsUrl),
  };
}

function getSupabaseServerConfig() {
  const url = cleanEnvValue(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
  const serviceRoleKey = cleanEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const anonKey = cleanEnvValue(process.env.VITE_SUPABASE_ANON_KEY);
  return {
    url,
    serviceRoleKey,
    anonKey,
    configured: Boolean(url && (serviceRoleKey || anonKey)),
  };
}

function isSubscriptionExpiredWithGrace(dueDateIso?: string | null, graceDays = 3): boolean {
  if (!dueDateIso) return false;
  const due = new Date(`${dueDateIso}T23:59:59Z`);
  if (Number.isNaN(due.getTime())) return false;
  const cutoffMs = due.getTime() + graceDays * 24 * 60 * 60 * 1000;
  return Date.now() > cutoffMs;
}

interface VerifiedLiveUser {
  id: string;
  fullName: string;
  role: 'admin' | 'student';
  canPublish: boolean;
  roomAdmin: boolean;
}

async function verifyCallerForLiveKit(params: {
  authHeader?: string;
  courseId?: string;
}): Promise<{ ok: true; user: VerifiedLiveUser } | { ok: false; status: number; error: string }> {
  const bearerToken = params.authHeader?.startsWith('Bearer ')
    ? params.authHeader.slice(7).trim()
    : '';

  if (!bearerToken) {
    return {
      ok: false,
      status: 401,
      error: 'يرجى تسجيل الدخول أولاً للحصول على رمز الدخول إلى قاعة البث المباشر.',
    };
  }

  // 1. Accept verified server-issued Super Admin session token immediately
  const serverAdmin = verifyServerAdminToken(bearerToken);
  if (serverAdmin) {
    return {
      ok: true,
      user: {
        id: serverAdmin.id,
        fullName: serverAdmin.fullName,
        role: 'admin',
        canPublish: true,
        roomAdmin: true,
      },
    };
  }

  // 2. Otherwise verify Supabase JWT & check active subscription / course enrollment
  const sbConfig = getSupabaseServerConfig();
  if (!sbConfig.configured) {
    return {
      ok: false,
      status: 503,
      error: 'إعدادات Supabase غير مكتملة على الخادم للتحقق من صلاحية الدخول للبث.',
    };
  }

  const supabaseServer = createClient(
    sbConfig.url,
    sbConfig.serviceRoleKey || sbConfig.anonKey,
    sbConfig.serviceRoleKey
      ? { auth: { autoRefreshToken: false, persistSession: false } }
      : {
          auth: { autoRefreshToken: false, persistSession: false },
          global: { headers: { Authorization: `Bearer ${bearerToken}` } },
        }
  );

  const { data: authData, error: authError } = await supabaseServer.auth.getUser(bearerToken);
  if (authError || !authData?.user) {
    return {
      ok: false,
      status: 401,
      error: 'جلسة المستخدم غير صالحة أو منتهية الصلاحية. يرجى إعادة تسجيل الدخول.',
    };
  }

  const authUser = authData.user;

  let { data: profile, error: profileError } = await supabaseServer
    .from('users')
    .select(
      'id, full_name, role, is_super_admin, permissions, is_active, enrolled_course_ids, subscription_due_date'
    )
    .eq('auth_user_id', authUser.id)
    .maybeSingle();

  if (!profile && !profileError) {
    const fallbackRes = await supabaseServer
      .from('users')
      .select(
        'id, full_name, role, is_super_admin, permissions, is_active, enrolled_course_ids, subscription_due_date'
      )
      .eq('id', authUser.id)
      .maybeSingle();
    profile = fallbackRes.data;
    profileError = fallbackRes.error;
  }

  if (profileError || !profile) {
    return {
      ok: false,
      status: 403,
      error: 'تعذر العثور على ملف المستخدم في قاعدة البيانات.',
    };
  }

  if (profile.is_active === false) {
    return {
      ok: false,
      status: 403,
      error: 'هذا الحساب موقوف حالياً ولا يملك صلاحية الدخول للبث المباشر.',
    };
  }

  if (profile.role === 'admin') {
    const perms: string[] = Array.isArray(profile.permissions) ? profile.permissions : [];
    const allowedLive = Boolean(profile.is_super_admin) || perms.includes('live_announcements');
    if (!allowedLive) {
      return {
        ok: false,
        status: 403,
        error: 'حساب المشرف لا يمتلك صلاحية إدارة البث المباشر.',
      };
    }
    return {
      ok: true,
      user: {
        id: String(profile.id),
        fullName: String(profile.full_name || 'الأستاذة تبارك الأزيرجاوي'),
        role: 'admin',
        canPublish: true,
        roomAdmin: true,
      },
    };
  }

  if (isSubscriptionExpiredWithGrace(profile.subscription_due_date, 3)) {
    return {
      ok: false,
      status: 403,
      error: 'انتهت صلاحية الاشتراك الشهري ومهلة السماح. يرجى تجديد الاشتراك للدخول إلى البث المباشر.',
    };
  }

  if (params.courseId) {
    const { data: course } = await supabaseServer
      .from('courses')
      .select('id, price_iqd')
      .eq('id', params.courseId)
      .maybeSingle();

    const enrolledCourses: string[] = Array.isArray(profile.enrolled_course_ids)
      ? profile.enrolled_course_ids
      : [];
    const isPaidCourse = course && Number(course.price_iqd || 0) > 0;
    if (isPaidCourse && !enrolledCourses.includes(params.courseId)) {
      return {
        ok: false,
        status: 403,
        error: 'يجب أن يكون لديك اشتراك فعّال في هذه الدورة للانضمام إلى بثها المباشر.',
      };
    }
  }

  return {
    ok: true,
    user: {
      id: String(profile.id),
      fullName: String(profile.full_name || 'طالب'),
      role: 'student',
      canPublish: false,
      roomAdmin: false,
    },
  };
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  // Sliding-window rate limiter for admin authentication endpoints (10 failures / 15 min per IP)
  const authRateMap = new Map<string, { count: number; resetAt: number }>();
  const AUTH_WINDOW_MS = 15 * 60 * 1000;
  const AUTH_MAX_ATTEMPTS = 10;

  const getClientIp = (req: Request): string => {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
      return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || 'unknown';
  };

  const checkRateLimit = (ip: string): boolean => {
    const now = Date.now();
    const entry = authRateMap.get(ip);
    if (!entry || now > entry.resetAt) {
      authRateMap.set(ip, { count: 0, resetAt: now + AUTH_WINDOW_MS });
      return true;
    }
    return entry.count < AUTH_MAX_ATTEMPTS;
  };

  const recordAuthFailure = (ip: string) => {
    const now = Date.now();
    const entry = authRateMap.get(ip);
    if (!entry || now > entry.resetAt) {
      authRateMap.set(ip, { count: 1, resetAt: now + AUTH_WINDOW_MS });
    } else {
      entry.count += 1;
    }
  };

  // Server-side Super Admin Authentication (verifies credentials strictly on server via scrypt/timingSafeEqual)
  app.post('/api/auth/super-admin', (req: Request, res: Response) => {
    if (IS_STRICT_STUDENT_APP) {
      return res.status(403).json({ success: false, error: 'هذا البناء مخصص لتطبيق الطلبة فقط.' });
    }

    const clientIp = getClientIp(req);
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({
        success: false,
        error: 'تم تجاوز الحد المسموح لمحاولات الدخول. يرجى الانتظار 15 دقيقة ثم المحاولة مجدداً.',
      });
    }

    const identifier = typeof req.body?.identifier === 'string' ? req.body.identifier.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!verifySuperAdminIdentifier(identifier) || !verifySuperAdminPassword(password)) {
      recordAuthFailure(clientIp);
      return res.status(401).json({
        success: false,
        error: 'رقم الهاتف أو كلمة المرور غير صحيحة.',
      });
    }

    authRateMap.delete(clientIp);
    const user = buildSuperAdminProfile();
    const accessToken = signServerAdminToken({
      id: user.id,
      fullName: user.fullName,
      role: 'admin',
      isSuperAdmin: true,
    });

    return res.json({
      success: true,
      user,
      accessToken,
    });
  });

  // Server-side Super Admin PIN confirmation for protected deletions (requires authenticated Admin Bearer session)
  app.post('/api/auth/verify-pin', async (req: Request, res: Response) => {
    if (IS_STRICT_STUDENT_APP) {
      return res.status(403).json({ valid: false, error: 'غير مصرح في تطبيق الطلبة.' });
    }

    const clientIp = getClientIp(req);
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({ valid: false, error: 'تم تجاوز الحد المسموح للمحاولات.' });
    }

    const authHeader = req.headers.authorization || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!bearer) {
      return res.status(401).json({ valid: false, error: 'يجب تسجيل الدخول كإدارة أولاً.' });
    }

    let isAuthenticatedAdmin = Boolean(verifyServerAdminToken(bearer));
    if (!isAuthenticatedAdmin) {
      const verified = await verifyCallerForLiveKit({ authHeader });
      isAuthenticatedAdmin = verified.ok && verified.user.role === 'admin';
    }

    if (!isAuthenticatedAdmin) {
      return res.status(403).json({ valid: false, error: 'صلاحية غير كافية.' });
    }

    const pin = typeof req.body?.pin === 'string' ? req.body.pin : '';
    const valid = verifySuperAdminPassword(pin);
    if (!valid) {
      recordAuthFailure(clientIp);
    } else {
      authRateMap.delete(clientIp);
    }
    return res.json({ valid });
  });

  // Public health & LiveKit readiness check (never leaks secrets)
  app.get('/api/livekit/status', (_req: Request, res: Response) => {
    const lk = getLiveKitServerConfig();
    const sb = getSupabaseServerConfig();
    res.json({
      livekitConfigured: lk.configured,
      supabaseConfigured: sb.configured,
    });
  });

  // Secure LiveKit Access Token Endpoint
  app.post('/api/livekit/token', async (req: Request, res: Response) => {
    try {
      const lk = getLiveKitServerConfig();
      if (!lk.configured) {
        return res.status(503).json({
          error: 'إعدادات سيرفر LiveKit (LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET) غير مضافة بعد في البيئة.',
        });
      }

      const rawRoomName = typeof req.body?.roomName === 'string' ? req.body.roomName.trim() : '';
      const rawCourseId = typeof req.body?.courseId === 'string' ? req.body.courseId.trim() : '';

      if (!rawRoomName || rawRoomName.length > 120 || !/^[a-zA-Z0-9_-]+$/.test(rawRoomName)) {
        return res.status(400).json({
          error: 'اسم غرفة البث غير صالح.',
        });
      }

      if (rawCourseId && (rawCourseId.length > 120 || !/^[a-zA-Z0-9_-]+$/.test(rawCourseId))) {
        return res.status(400).json({
          error: 'معرّف الدورة غير صالح.',
        });
      }

      const verification = await verifyCallerForLiveKit({
        authHeader: req.headers.authorization,
        courseId: rawCourseId || undefined,
      });

      if (!verification.ok) {
        return res.status(verification.status).json({ error: verification.error });
      }

      const { user } = verification;
      const ttlSeconds = 2 * 60 * 60;

      const at = new AccessToken(lk.apiKey, lk.apiSecret, {
        identity: user.id,
        name: user.fullName,
        ttl: ttlSeconds,
        metadata: JSON.stringify({ role: user.role }),
      });

      at.addGrant({
        roomJoin: true,
        room: rawRoomName,
        roomAdmin: user.roomAdmin,
        canPublish: user.canPublish,
        canSubscribe: true,
        canPublishData: true,
      });

      const jwt = await at.toJwt();

      return res.json({
        token: jwt,
        wsUrl: lk.wsUrl,
        roomName: rawRoomName,
        role: user.role,
        canPublish: user.canPublish,
        expiresInSeconds: ttlSeconds,
      });
    } catch (err) {
      console.error('LiveKit token endpoint error:', err instanceof Error ? err.message : 'Unknown error');
      return res.status(500).json({
        error: 'حدث خطأ داخلي أثناء توليد رمز الدخول لقاعة البث المباشر.',
      });
    }
  });

  if (!IS_PRODUCTION) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Tabarak Academy server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
