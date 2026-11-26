/**
 * Device ID Binding Service (Capacitor Android Ready)
 *
 * In a Capacitor Android APK build, install `@capacitor/device` and resolve
 * `Device.getId()` inside `getNativeOrWebDeviceId()`.
 * In the web preview, a deterministic persistent ID is stored in localStorage
 * along with a simulation helper so the Device Lock security screen can be
 * demonstrated and verified immediately.
 */

const DEVICE_ID_STORAGE_KEY = 'tabarak_academy_device_id_v1';

interface CapacitorWindow extends Window {
  Capacitor?: {
    isNativePlatform?: () => boolean;
    Plugins?: {
      Device?: {
        getId: () => Promise<{ identifier: string }>;
      };
    };
  };
}

function generateRandomDeviceId(): string {
  const segmentA = Math.random().toString(36).substring(2, 6).toUpperCase();
  const segmentB = Math.floor(1000 + Math.random() * 9000).toString();
  return `AND-${segmentA}-${segmentB}`;
}

export function getCurrentDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'AND-SERVER-0000';
  }
  const existing = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (existing) {
    return existing;
  }
  const created = generateRandomDeviceId();
  window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, created);
  return created;
}

export async function getNativeOrWebDeviceId(): Promise<string> {
  const capWindow = window as CapacitorWindow;
  try {
    if (capWindow.Capacitor?.isNativePlatform?.() && capWindow.Capacitor?.Plugins?.Device) {
      const info = await capWindow.Capacitor.Plugins.Device.getId();
      if (info?.identifier) {
        return info.identifier;
      }
    }
  } catch {
    // Fallback to web persistent ID
  }
  return getCurrentDeviceId();
}

export function simulateNewDeviceId(): string {
  const nextId = generateRandomDeviceId();
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, nextId);
  }
  return nextId;
}

export function normalizeArabicPhoneDigits(raw: string): string {
  const western = raw
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
  let digits = western.replace(/\D/g, '');
  if (digits.startsWith('00964')) {
    digits = `0${digits.slice(5)}`;
  } else if (digits.startsWith('964') && digits.length >= 12) {
    digits = `0${digits.slice(3)}`;
  }
  return digits;
}

export function validateIraqiPhone(raw: string): { valid: boolean; normalized: string; error?: string } {
  const digits = normalizeArabicPhoneDigits(raw);
  if (!digits) {
    return { valid: false, normalized: '', error: 'يرجى إدخال رقم الهاتف العراقي.' };
  }
  if (!digits.startsWith('07')) {
    return { valid: false, normalized: digits, error: 'يجب أن يبدأ رقم الهاتف العراقي بـ 07.' };
  }
  if (digits.length !== 11) {
    return { valid: false, normalized: digits, error: 'يجب أن يتكوّن رقم الهاتف العراقي من 11 رقماً (مثال: 07712345678).' };
  }
  return { valid: true, normalized: digits };
}
