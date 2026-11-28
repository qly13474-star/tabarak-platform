/**
 * App Mode & Dedicated Admin Route Configuration
 *
 * - Root URL (`/`) and Capacitor Android APK (`VITE_APP_MODE=student`):
 *   Always opens the Student App ONLY, with zero admin UI or demo quick-login buttons.
 * - Dedicated Admin URL (`/admin` or `#/admin`), or dedicated Admin Web Build (`VITE_APP_MODE=admin`):
 *   Opens the Teacher Super Admin & Moderators login portal and dashboard exclusively.
 */

export type ActiveAppMode = 'student' | 'admin';
export type EnvAppMode = ActiveAppMode | 'production';

export const SECRET_ADMIN_ROUTE = '/admin';

function resolveEnvAppMode(): EnvAppMode {
  const raw = (import.meta.env.VITE_APP_MODE || '').toString().trim().toLowerCase();
  if (raw === 'student') return 'student';
  if (raw === 'admin') return 'admin';
  return 'production';
}

export const ENV_APP_MODE: EnvAppMode = resolveEnvAppMode();
export const IS_STRICT_STUDENT_BUILD = ENV_APP_MODE === 'student';
export const IS_STRICT_ADMIN_BUILD = ENV_APP_MODE === 'admin';
export const IS_PREVIEW_MODE = false;

export function isSecretAdminRouteActive(): boolean {
  if (IS_STRICT_STUDENT_BUILD) return false;
  if (IS_STRICT_ADMIN_BUILD) return true;
  if (typeof window === 'undefined') return false;

  const pathname = window.location.pathname.replace(/\/+$/, '').toLowerCase();
  const hash = window.location.hash.replace(/\/+$/, '').toLowerCase();

  return (
    pathname === SECRET_ADMIN_ROUTE ||
    pathname.startsWith(`${SECRET_ADMIN_ROUTE}/`) ||
    pathname.endsWith(SECRET_ADMIN_ROUTE) ||
    pathname.includes(`${SECRET_ADMIN_ROUTE}/`) ||
    hash === `#${SECRET_ADMIN_ROUTE}` ||
    hash.startsWith(`#${SECRET_ADMIN_ROUTE}/`) ||
    hash === '#admin'
  );
}

export function resolveActiveAppModeFromLocation(): ActiveAppMode {
  return isSecretAdminRouteActive() ? 'admin' : 'student';
}
