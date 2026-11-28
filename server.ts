import crypto from 'crypto';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
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
      fullName: body.fullName || 'الأستاذة تبارك الزيرجاوي',
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
    fullName: 'الأستاذة تبارك الزيرجاوي',
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

function getFirebaseServerConfig() {
  const projectId = cleanEnvValue(process.env.FIREBASE_PROJECT_ID) || 'tabarak-platform';
  const apiKey =
    cleanEnvValue(process.env.FIREBASE_WEB_API_KEY) ||
    'AIzaSyCtHwPx2K5DaR-QQsxol_uIYpM9w0dPjvg';
  return {
    projectId,
    apiKey,
    configured: Boolean(projectId && apiKey),
  };
}

function decodeFirestoreField(field: unknown): unknown {
  if (!field || typeof field !== 'object') return undefined;
  const f = field as Record<string, unknown>;
  if ('stringValue' in f) return f.stringValue;
  if ('booleanValue' in f) return Boolean(f.booleanValue);
  if ('integerValue' in f) return Number(f.integerValue);
  if ('doubleValue' in f) return Number(f.doubleValue);
  if ('nullValue' in f) return null;
  if ('arrayValue' in f && f.arrayValue && typeof f.arrayValue === 'object') {
    const values = (f.arrayValue as { values?: unknown[] }).values;
    return Array.isArray(values) ? values.map((v) => decodeFirestoreField(v)) : [];
  }
  if ('mapValue' in f && f.mapValue && typeof f.mapValue === 'object') {
    const fields = (f.mapValue as { fields?: Record<string, unknown> }).fields || {};
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = decodeFirestoreField(v);
    }
    return out;
  }
  return undefined;
}

async function fetchFirestoreDocumentWithBearer(
  projectId: string,
  docPath: string,
  idToken: string
): Promise<Record<string, unknown> | null> {
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId
  )}/databases/(default)/documents/${docPath}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) return null;
  const body = (await res.json().catch(() => null)) as {
    fields?: Record<string, unknown>;
  } | null;
  if (!body?.fields) return null;
  const decoded: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body.fields)) {
    decoded[k] = decodeFirestoreField(v);
  }
  return decoded;
}

function isSubscriptionExpiredWithGrace(dueDateIso?: string | null, graceDays = 5): boolean {
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

  // 2. Otherwise verify Firebase ID token & check Firestore profile / subscription / course enrollment
  const fbConfig = getFirebaseServerConfig();
  if (!fbConfig.configured) {
    return {
      ok: false,
      status: 503,
      error: 'إعدادات Firebase غير مكتملة على الخادم للتحقق من صلاحية الدخول للبث.',
    };
  }

  let firebaseUid = '';
  let firebaseEmail = '';
  try {
    const lookupRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(
        fbConfig.apiKey
      )}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: bearerToken }),
      }
    );
    if (!lookupRes.ok) {
      return {
        ok: false,
        status: 401,
        error: 'جلسة المستخدم غير صالحة أو منتهية الصلاحية. يرجى إعادة تسجيل الدخول.',
      };
    }
    const lookupData = (await lookupRes.json()) as {
      users?: { localId?: string; email?: string }[];
    };
    const fbUser = lookupData.users?.[0];
    if (!fbUser?.localId) {
      return {
        ok: false,
        status: 401,
        error: 'جلسة المستخدم غير صالحة أو منتهية الصلاحية. يرجى إعادة تسجيل الدخول.',
      };
    }
    firebaseUid = fbUser.localId;
    firebaseEmail = fbUser.email || '';
  } catch {
    return {
      ok: false,
      status: 503,
      error: 'تعذر الاتصال بخدمة التحقق من Firebase Authentication.',
    };
  }

  const profile = await fetchFirestoreDocumentWithBearer(
    fbConfig.projectId,
    `users/${encodeURIComponent(firebaseUid)}`,
    bearerToken
  );

  // Allow configured Super Admin email even if users/{uid} document has not been seeded yet
  if (!profile) {
    if (verifySuperAdminIdentifier(firebaseEmail)) {
      return {
        ok: true,
        user: {
          id: firebaseUid,
          fullName: 'الأستاذة تبارك الزيرجاوي',
          role: 'admin',
          canPublish: true,
          roomAdmin: true,
        },
      };
    }
    return {
      ok: false,
      status: 403,
      error: 'تعذر العثور على ملف المستخدم في قاعدة البيانات.',
    };
  }

  const isActive = profile.isActive !== false && profile.is_active !== false;
  if (!isActive) {
    return {
      ok: false,
      status: 403,
      error: 'هذا الحساب موقوف حالياً ولا يملك صلاحية الدخول للبث المباشر.',
    };
  }

  const fullName = String(profile.fullName || profile.full_name || 'مستخدم');
  const role = profile.role === 'admin' ? 'admin' : 'student';

  if (role === 'admin') {
    const perms: string[] = Array.isArray(profile.permissions)
      ? profile.permissions.filter((p): p is string => typeof p === 'string')
      : [];
    const isSuper = Boolean(profile.isSuperAdmin ?? profile.is_super_admin);
    const allowedLive = isSuper || perms.includes('live_announcements');
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
        id: String(profile.id || firebaseUid),
        fullName: fullName || 'الأستاذة تبارك الزيرجاوي',
        role: 'admin',
        canPublish: true,
        roomAdmin: true,
      },
    };
  }

  const dueDate =
    typeof (profile.subscriptionDueDate ?? profile.subscription_due_date) === 'string'
      ? String(profile.subscriptionDueDate ?? profile.subscription_due_date)
      : null;

  if (isSubscriptionExpiredWithGrace(dueDate, 5)) {
    return {
      ok: false,
      status: 403,
      error: 'انتهت صلاحية الاشتراك الشهري ومهلة السماح. يرجى تجديد الاشتراك للدخول إلى البث المباشر.',
    };
  }

  if (params.courseId) {
    const course = await fetchFirestoreDocumentWithBearer(
      fbConfig.projectId,
      `courses/${encodeURIComponent(params.courseId)}`,
      bearerToken
    );

    const enrolledRaw = profile.enrolledCourseIds ?? profile.enrolled_course_ids;
    const enrolledCourses: string[] = Array.isArray(enrolledRaw)
      ? enrolledRaw.filter((c): c is string => typeof c === 'string')
      : [];
    const coursePrice = Number(course?.priceIqd ?? course?.price_iqd ?? 0);
    const isPaidCourse = Boolean(course) && coursePrice > 0;
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
      id: String(profile.id || firebaseUid),
      fullName: fullName || 'طالب',
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
    const fb = getFirebaseServerConfig();
    res.json({
      livekitConfigured: lk.configured,
      firebaseConfigured: fb.configured,
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
    // Serve a WebSocket-free /@vite/client shim when HMR is disabled so Vite never attempts
    // a failing WebSocket connection (Error: WebSocket closed without opened.) behind HTTPS proxies.
    app.get('/@vite/client', (_req: Request, res: Response) => {
      res.type('application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.send(`
const sheetsMap = new Map();

export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    document.head.appendChild(style);
    sheetsMap.set(id, style);
  } else {
    style.textContent = content;
  }
}

export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    document.head.removeChild(style);
    sheetsMap.delete(id);
  }
}

export function createHotContext() {
  const noop = () => {};
  return {
    data: {},
    accept: noop,
    acceptExports: noop,
    dispose: noop,
    prune: noop,
    decline: noop,
    invalidate: noop,
    on: noop,
    off: noop,
    send: noop,
  };
}

export function injectQuery(url, queryToInject) {
  if (typeof url !== 'string' || (!url.startsWith('.') && !url.startsWith('/'))) {
    return url;
  }
  const pathname = url.replace(/[?#].*$/, '');
  const search = url.slice(pathname.length).replace(/#.*$/, '');
  const hash = url.includes('#') ? url.slice(url.indexOf('#')) : '';
  return pathname + '?' + queryToInject + (search ? '&' + search.slice(1) : '') + hash;
}

export class ErrorOverlay extends HTMLElement {}
`);
    });

    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
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
