import React, { useState } from 'react';
import { KeyRound, X, CheckCircle2, AlertCircle, Copy } from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { formatIqd } from '../../utils/subscription';
import { BackButton } from '../common/BackButton';

interface ActivationCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivated?: (courseTitle?: string) => void;
}

export const ActivationCodeModal: React.FC<ActivationCodeModalProps> = ({
  isOpen,
  onClose,
  onActivated,
}) => {
  const { db, currentUser, redeemCode } = usePlatform();
  const [codeInput, setCodeInput] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen || !currentUser) return null;

  const unlockedLessonIds = currentUser.unlockedLessonIds ?? [];

  const availableDemoCodes = db.activationCodes
    .filter((c) => {
      if (c.isUsed || c.track !== currentUser.track) return false;
      if (currentUser.enrolledCourseIds.includes(c.courseId)) return false;
      if (c.targetType === 'lesson' && c.lessonId && unlockedLessonIds.includes(c.lessonId)) {
        return false;
      }
      return true;
    })
    .slice(0, 3);

  const handleRedeem = (e: React.FormEvent) => {
    e.preventDefault();
    const res = redeemCode(codeInput);
    if (res.success) {
      setFeedback({ type: 'success', text: res.message });
      setCodeInput('');
      if (onActivated) onActivated(res.courseTitle);
    } else {
      setFeedback({ type: 'error', text: res.message });
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="activation-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-md p-0 sm:p-4"
    >
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-[#110D1F]/95 backdrop-blur-2xl border border-purple-500/35 shadow-[0_24px_80px_-16px_rgba(124,58,237,0.6)] overflow-hidden">
        {/* Mobile grab handle */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1.5 rounded-full bg-purple-500/40" />
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-purple-500/20">
          <div className="flex items-center gap-2.5 min-w-0">
            <BackButton onClick={onClose} label="رجوع" variant="subtle" size="sm" />
            <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white shadow-[0_0_16px_-4px_rgba(168,85,247,0.75)] shrink-0">
              <KeyRound className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 id="activation-modal-title" className="text-sm sm:text-base font-black text-white truncate">
                تفعيل كود دورة أو محاضرة
              </h2>
              <p className="text-[11px] text-purple-300 truncate">أدخل الكود المطبوع على كارت الاشتراك</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 border border-purple-500/20 text-slate-300 hover:bg-purple-500/20 hover:text-white shrink-0 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleRedeem} className="p-6 space-y-4">
          <div>
            <label htmlFor="course-code-input" className="block text-sm font-bold text-slate-200 mb-1.5">
              كود التفعيل
            </label>
            <input
              id="course-code-input"
              type="text"
              dir="ltr"
              value={codeInput}
              onChange={(e) => {
                setCodeInput(e.target.value.toUpperCase());
                setFeedback(null);
              }}
              placeholder="TAB-VOC-3318-L2"
              className="w-full min-h-[48px] rounded-xl border border-purple-500/30 bg-white/[0.05] px-4 text-center font-mono text-base font-bold tracking-wider text-white uppercase placeholder:text-slate-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
            />
          </div>

          {feedback && (
            <div
              role="status"
              className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/15 border border-emerald-400/35 text-emerald-200'
                  : 'bg-rose-500/15 border border-rose-400/35 text-rose-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          {availableDemoCodes.length > 0 && (
            <div className="rounded-2xl bg-white/[0.04] border border-purple-500/20 p-3.5">
              <p className="text-xs font-bold text-purple-200 mb-2">
                أكواد جاهزة للتجربة السريعة (اضغط للإدخال):
              </p>
              <div className="space-y-1.5">
                {availableDemoCodes.map((entry) => {
                  const course = db.courses.find((c) => c.id === entry.courseId);
                  const isLessonCode = entry.targetType === 'lesson';
                  const price = entry.priceIqd ?? (isLessonCode ? 0 : course?.priceIqd ?? 0);
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => {
                        setCodeInput(entry.code);
                        setFeedback(null);
                      }}
                      className="w-full min-h-[46px] flex items-center justify-between gap-2 rounded-xl bg-[#090712]/70 border border-purple-500/20 px-3 py-2 text-right hover:border-purple-400/60 transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-white truncate">
                          {isLessonCode
                            ? entry.lessonTitle ?? 'محاضرة فردية'
                            : course?.title ?? 'دورة متاحة'}
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          {isLessonCode ? 'كود محاضرة فردية' : 'كود دورة كاملة'} ·{' '}
                          <strong className="font-mono text-purple-300">
                            {price === 0 ? 'مجاني' : formatIqd(price)}
                          </strong>
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-purple-200 shrink-0" dir="ltr">
                        <Copy className="h-3 w-3 text-fuchsia-400" />
                        {entry.code}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 min-h-[48px] rounded-2xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-black text-white shadow-[0_8px_24px_-6px_rgba(147,51,234,0.75)] hover:brightness-110 transition-all cursor-pointer"
            >
              تفعيل الكود فوراً
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] rounded-2xl border border-purple-500/25 bg-white/5 px-4 py-3 text-sm font-bold text-slate-200 hover:bg-white/10 hover:text-white cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
