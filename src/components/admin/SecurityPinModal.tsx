import React, { useEffect, useState } from 'react';
import { ShieldAlert, Lock, Eye, EyeOff, X, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';

interface SecurityPinModalProps {
  isOpen: boolean;
  title: string;
  itemLabel: string;
  warningDetail?: string;
  requireSuperAdmin?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const SecurityPinModal: React.FC<SecurityPinModalProps> = ({
  isOpen,
  title,
  itemLabel,
  warningDetail,
  requireSuperAdmin = false,
  onConfirm,
  onCancel,
}) => {
  const { verifyTeacherPin, isSuperAdmin, canDelete } = usePlatform();
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const isDeleteAllowed = requireSuperAdmin ? isSuperAdmin : canDelete;

  useEffect(() => {
    if (isOpen) {
      setPinInput('');
      setShowPin(false);
      setError(null);
      setIsVerifying(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVerifying) return;

    if (!isDeleteAllowed) {
      setError(
        requireSuperAdmin
          ? 'هذه العملية محصورة بحساب السوبر أدمن (الأستاذة تبارك) فقط.'
          : 'عذراً، حسابك لا يمتلك صلاحية الحذف. يرجى مراجعة الأستاذة تبارك الزيرجاوي.'
      );
      return;
    }

    if (!pinInput.trim()) {
      setError('يرجى إدخال رمز الدخول لتأكيد عملية الحذف.');
      return;
    }

    setIsVerifying(true);
    setError(null);
    try {
      const isValidPin = await verifyTeacherPin(pinInput, requireSuperAdmin);
      if (!isValidPin) {
        setError('رمز الدخول غير صحيح، تم إلغاء عملية الحذف');
        return;
      }

      setError(null);
      setPinInput('');
      onConfirm();
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="security-pin-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#110D1F]/95 backdrop-blur-2xl border border-purple-500/35 shadow-[0_24px_80px_-16px_rgba(124,58,237,0.55)] overflow-hidden">
        {/* Top Security Header */}
        <div className="bg-gradient-to-l from-purple-950/75 via-[#161029] to-[#110D1F] px-5 py-4 text-white flex items-center justify-between gap-3 border-b border-purple-500/25">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-300 shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h2 id="security-pin-modal-title" className="text-sm sm:text-base font-black text-white">
                {title}
              </h2>
              <p className="text-[11px] text-purple-300 font-semibold">
                {requireSuperAdmin
                  ? 'حماية السوبر أدمن — يتطلب رمز دخول الأستاذة تبارك'
                  : 'تأكيد أمني إلزامي — حماية البيانات من الحذف بالخطأ'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isVerifying}
            aria-label="إغلاق نافذة التأكيد"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          <div className="rounded-xl bg-rose-500/10 border border-rose-400/35 p-3.5 space-y-1">
            <p className="text-xs font-bold text-rose-300">أنتِ على وشك حذف العنصر التالي نهائياً:</p>
            <p className="text-sm font-black text-white">{itemLabel}</p>
            {warningDetail && (
              <p className="text-xs text-rose-200/90 leading-relaxed pt-0.5">{warningDetail}</p>
            )}
          </div>

          {!isDeleteAllowed ? (
            <div className="rounded-xl bg-amber-500/15 border border-amber-400/35 p-4 text-xs font-bold text-amber-200 leading-relaxed">
              عذراً، هذا الحساب لا يمتلك صلاحية الحذف. تبقى عمليات الحذف محصورة بالسوبر أدمن (الأستاذة تبارك) أو المشرفين المصرّح لهم بصلاحية الحذف فقط.
            </div>
          ) : (
            <div>
              <label
                htmlFor="teacher-security-pin"
                className="block text-xs font-extrabold text-slate-200 mb-1.5"
              >
                رمز الدخول (كلمة المرور) لتأكيد الحذف
              </label>
              <div className="relative">
                <input
                  id="teacher-security-pin"
                  type={showPin ? 'text' : 'password'}
                  dir="ltr"
                  autoFocus
                  disabled={isVerifying}
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="••••••••"
                  className="w-full min-h-[46px] rounded-xl border border-purple-500/30 bg-white/[0.05] pl-11 pr-10 text-left font-mono text-sm font-bold text-white focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 disabled:opacity-60"
                />
                <Lock className="h-4 w-4 text-purple-300/70 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPin((v) => !v)}
                  aria-label={showPin ? 'إخفاء الرمز' : 'إظهار الرمز'}
                  className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
                >
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl bg-rose-500/15 border border-rose-400/40 px-3.5 py-2.5 text-xs font-bold text-rose-200"
            >
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center gap-2.5 pt-2">
            {isDeleteAllowed && (
              <button
                type="submit"
                disabled={isVerifying}
                className="flex-1 min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-rose-600 via-red-600 to-fuchsia-700 px-4 text-sm font-black text-white shadow-[0_8px_22px_-6px_rgba(225,29,72,0.75)] hover:brightness-110 transition-all cursor-pointer disabled:opacity-60"
              >
                {isVerifying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                <span>{isVerifying ? 'جاري التحقق...' : 'تأكيد الحذف'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              disabled={isVerifying}
              className={`${
                isDeleteAllowed ? '' : 'flex-1'
              } min-h-[46px] rounded-xl border border-purple-500/25 bg-white/5 px-4 text-sm font-bold text-slate-200 hover:bg-white/10 hover:text-white cursor-pointer disabled:opacity-50`}
            >
              {isDeleteAllowed ? 'إلغاء' : 'إغلاق'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
