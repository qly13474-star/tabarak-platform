import React, { useEffect, useState } from 'react';
import { ShieldAlert, Lock, Eye, EyeOff, X, Trash2, AlertCircle } from 'lucide-react';
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
  const { verifyTeacherPin, isSuperAdmin, canDelete, isPreviewMode } = usePlatform();
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDeleteAllowed = requireSuperAdmin ? isSuperAdmin : canDelete;

  useEffect(() => {
    if (isOpen) {
      setPinInput('');
      setShowPin(false);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDeleteAllowed) {
      setError(
        requireSuperAdmin
          ? 'هذه العملية محصورة بحساب السوبر أدمن (الأستاذة تبارك) فقط.'
          : 'عذراً، حسابك لا يمتلك صلاحية الحذف. يرجى مراجعة الأستاذة تبارك الأزيرجاوي.'
      );
      return;
    }

    if (!pinInput.trim()) {
      setError(
        requireSuperAdmin
          ? 'يرجى إدخال رمز دخول السوبر أدمن (كلمة مرور الأستاذة) لإتمام عملية الحذف.'
          : 'يرجى إدخال رمز الدخول (كلمة المرور) لإتمام عملية الحذف.'
      );
      return;
    }

    const isValidPin = await verifyTeacherPin(pinInput, requireSuperAdmin);
    if (!isValidPin) {
      setError(
        requireSuperAdmin
          ? 'رمز دخول السوبر أدمن غير صحيح! تم رفض وإلغاء عملية الحذف.'
          : 'رمز الدخول غير صحيح! تم رفض وإلغاء عملية الحذف لحماية بيانات المنصة.'
      );
      return;
    }

    setError(null);
    setPinInput('');
    onConfirm();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="security-pin-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-white border border-red-200 shadow-2xl overflow-hidden">
        {/* Top Security Header */}
        <div className="bg-[#0F172A] px-5 py-4 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600/20 border border-red-400/40 text-red-400 shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h2 id="security-pin-modal-title" className="text-sm sm:text-base font-extrabold text-white">
                {title}
              </h2>
              <p className="text-[11px] text-amber-300 font-semibold">
                {requireSuperAdmin
                  ? 'حماية السوبر أدمن — يتطلب رمز دخول الأستاذة تبارك'
                  : 'تأكيد أمني إلزامي — حماية البيانات من الحذف بالخطأ'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="إغلاق نافذة التأكيد"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 space-y-1">
            <p className="text-xs font-bold text-red-800">أنتِ على وشك حذف العنصر التالي نهائياً:</p>
            <p className="text-sm font-extrabold text-slate-900">{itemLabel}</p>
            {warningDetail && (
              <p className="text-xs text-red-700/90 leading-relaxed pt-0.5">{warningDetail}</p>
            )}
          </div>

          {!isDeleteAllowed ? (
            <div className="rounded-xl bg-amber-50 border border-amber-300 p-4 text-xs font-bold text-amber-950 leading-relaxed">
              عذراً، هذا الحساب لا يمتلك صلاحية الحذف. تبقى عمليات الحذف محصورة بالسوبر أدمن (الأستاذة تبارك) أو المشرفين المصرّح لهم بصلاحية الحذف فقط.
            </div>
          ) : (
            <div>
              <label
                htmlFor="teacher-security-pin"
                className="block text-xs font-extrabold text-slate-700 mb-1.5"
              >
                {requireSuperAdmin
                  ? 'أدخلي رمز دخول السوبر أدمن (الأستاذة تبارك) لتأكيد الحذف'
                  : 'أدخلي رمز الدخول (كلمة المرور) لتأكيد الحذف'}
              </label>
            <div className="relative">
              <input
                id="teacher-security-pin"
                type={showPin ? 'text' : 'password'}
                dir="ltr"
                autoFocus
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="••••••••"
                className="w-full min-h-[46px] rounded-xl border border-slate-300 bg-slate-50 pl-11 pr-10 text-left font-mono text-sm font-bold text-slate-900 focus:border-red-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
              <Lock className="h-4 w-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPin((v) => !v)}
                aria-label={showPin ? 'إخفاء الرمز' : 'إظهار الرمز'}
                className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/70"
              >
                {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {isPreviewMode && isSuperAdmin && (
              <p className="mt-1.5 text-[11px] text-slate-500">
                أدخلي كلمة مرور حساب السوبر أدمن الخاصة بالأستاذة تبارك للتأكيد.
              </p>
            )}
          </div>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-300 px-3.5 py-2.5 text-xs font-bold text-red-800"
            >
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center gap-2.5 pt-2">
            {isDeleteAllowed && (
              <button
                type="submit"
                className="flex-1 min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-extrabold text-white hover:bg-red-700 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span>تأكيد الحذف النهائي</span>
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              className={`${
                isDeleteAllowed ? '' : 'flex-1'
              } min-h-[46px] rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50`}
            >
              {isDeleteAllowed ? 'إلغاء' : 'إغلاق'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
