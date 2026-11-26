/**
 * Supabase Edge Function: livekit-token
 *
 * Deploy with:
 *   supabase functions deploy livekit-token
 *
 * Required Supabase Edge Secrets (set via `supabase secrets set`):
 *   LIVEKIT_URL=wss://your-project.livekit.cloud
 *   LIVEKIT_API_KEY=...
 *   LIVEKIT_API_SECRET=...
 *   SUPABASE_URL=https://ffyoyacdkljvzcctoiwg.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *   ALLOWED_ORIGIN=https://your-production-domain.com
 *
 * LIVEKIT_API_SECRET NEVER leaves this Edge Function.
 */

// @ts-nocheck — Deno Edge Runtime file (executed by Supabase Edge Functions, not Vite)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

function base64UrlEncode(input: Uint8Array | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function signLiveKitJwt(
  apiKey: string,
  apiSecret: string,
  claims: Record<string, unknown>
): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const nowSec = Math.floor(Date.now() / 1000);
  const payload = {
    iss: apiKey,
    nbf: nowSec,
    iat: nowSec,
    exp: nowSec + 2 * 60 * 60, // 2 hours
    ...claims,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(apiSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );
  const encodedSig = base64UrlEncode(new Uint8Array(signatureBuffer));
  return `${signingInput}.${encodedSig}`;
}

function isSubscriptionExpiredWithGrace(dueDateIso?: string | null, graceDays = 3): boolean {
  if (!dueDateIso) return false;
  const due = new Date(`${dueDateIso}T23:59:59Z`);
  if (Number.isNaN(due.getTime())) return false;
  return Date.now() > due.getTime() + graceDays * 24 * 60 * 60 * 1000;
}

Deno.serve(async (req: Request) => {
  const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || '';
  const requestOrigin = req.headers.get('Origin') || '';
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
  if (allowedOrigin && requestOrigin === allowedOrigin) {
    corsHeaders['Access-Control-Allow-Origin'] = allowedOrigin;
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const livekitUrl = (Deno.env.get('LIVEKIT_URL') || '').trim();
    const livekitApiKey = (Deno.env.get('LIVEKIT_API_KEY') || '').trim();
    const livekitApiSecret = (Deno.env.get('LIVEKIT_API_SECRET') || '').trim();
    const supabaseUrl = (Deno.env.get('SUPABASE_URL') || '').trim();
    const supabaseServiceKey = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '').trim();

    if (!livekitUrl.startsWith('wss://') || !livekitApiKey || !livekitApiSecret) {
      return new Response(JSON.stringify({ error: 'إعدادات LiveKit غير مكتملة على الخادم.' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization') || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!bearerToken) {
      return new Response(JSON.stringify({ error: 'يجب تسجيل الدخول أولاً.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const roomName = typeof body?.roomName === 'string' ? body.roomName.trim() : '';
    const courseId = typeof body?.courseId === 'string' ? body.courseId.trim() : '';

    if (!roomName || roomName.length > 120 || !/^[a-zA-Z0-9_-]+$/.test(roomName)) {
      return new Response(JSON.stringify({ error: 'اسم غرفة البث غير صالح.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(bearerToken);
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: 'جلسة المستخدم غير صالحة.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select(
        'id, full_name, role, is_super_admin, permissions, is_active, enrolled_course_ids, subscription_due_date'
      )
      .eq('auth_user_id', authData.user.id)
      .maybeSingle();

    if (!profile && !profileError) {
      const fallbackRes = await supabaseAdmin
        .from('users')
        .select(
          'id, full_name, role, is_super_admin, permissions, is_active, enrolled_course_ids, subscription_due_date'
        )
        .eq('id', authData.user.id)
        .maybeSingle();
      profile = fallbackRes.data;
      profileError = fallbackRes.error;
    }

    if (profileError || !profile || profile.is_active === false) {
      return new Response(JSON.stringify({ error: 'الحساب غير نشط أو غير مصرّح له بالبث.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let canPublish = false;
    let roomAdmin = false;

    if (profile.role === 'admin') {
      const perms: string[] = Array.isArray(profile.permissions) ? profile.permissions : [];
      if (!profile.is_super_admin && !perms.includes('live_announcements')) {
        return new Response(JSON.stringify({ error: 'لا تملك صلاحية البث المباشر.' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      canPublish = true;
      roomAdmin = true;
    } else {
      if (isSubscriptionExpiredWithGrace(profile.subscription_due_date, 3)) {
        return new Response(
          JSON.stringify({ error: 'انتهى الاشتراك الشهري. يرجى التجديد للدخول للبث.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (courseId) {
        const { data: course } = await supabaseAdmin
          .from('courses')
          .select('id, price_iqd')
          .eq('id', courseId)
          .maybeSingle();
        const enrolled: string[] = Array.isArray(profile.enrolled_course_ids)
          ? profile.enrolled_course_ids
          : [];
        if (course && Number(course.price_iqd || 0) > 0 && !enrolled.includes(courseId)) {
          return new Response(
            JSON.stringify({ error: 'يجب الاشتراك في هذه الدورة للانضمام إلى بثها المباشر.' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    const token = await signLiveKitJwt(livekitApiKey, livekitApiSecret, {
      sub: String(profile.id),
      name: String(profile.full_name || 'مشارك'),
      metadata: JSON.stringify({ role: profile.role }),
      video: {
        roomJoin: true,
        room: roomName,
        roomAdmin,
        canPublish,
        canSubscribe: true,
        canPublishData: true,
      },
    });

    return new Response(
      JSON.stringify({
        token,
        wsUrl: livekitUrl,
        roomName,
        role: profile.role,
        canPublish,
        expiresInSeconds: 7200,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
