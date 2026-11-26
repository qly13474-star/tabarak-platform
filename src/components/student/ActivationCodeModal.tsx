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

  // Unused codes matching this student's track (full courses + individual lessons) for easy demo testing
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm p-0 sm:p-4"
    >
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
        {/* Mobile grab handle */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1.5 rounded-full bg-slate-300" />
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <BackButton onClick={onClose} label="رجوع" variant="subtle" size="sm" />
            <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F172A] text-[#D4AF37] shrink-0">
              <KeyRound className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 id="activation-modal-title" className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                تفعيل كود دورة أو محاضرة
              </h2>
              <p className="text-[11px] text-slate-500 truncate">أدخل الكود المطبوع على كارت الاشتراك</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleRedeem} className="p-6 space-y-4">
          <div>
            <label htmlFor="course-code-input" className="block text-sm font-semibold text-slate-700 mb-1.5">
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
              className="w-full min-h-[48px] rounded-xl border border-slate-300 bg-slate-50 px-4 text-center font-mono text-base font-semibold tracking-wider text-slate-900 uppercase placeholder:text-slate-400 focus:border-[#0F172A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25"
            />
          </div>

          {feedback && (
            <div
              role="status"
              className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          {availableDemoCodes.length > 0 && (
            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5">
              <p className="text-xs font-semibold text-slate-600 mb-2">
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
                      className="w-full min-h-[46px] flex items-center justify-between gap-2 rounded-lg bg-white border border-slate-200 px-3 py-2 text-right hover:border-[#0F172A] transition-colors"
                    >
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-slate-800 truncate">
                          {isLessonCode
                            ? entry.lessonTitle ?? 'محاضرة فردية'
                            : course?.title ?? 'دورة متاحة'}
                        </span>
                        <span className="block text-[10px] text-slate-500">
                          {isLessonCode ? 'كود محاضرة فردية' : 'كود دورة كاملة'} ·{' '}
                          <strong className="font-mono text-[#B48A1E]">
                            {price === 0 ? 'مجاني' : formatIqd(price)}
                          </strong>
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-[#0F172A] shrink-0" dir="ltr">
                        <Copy className="h-3 w-3 text-amber-600" />
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
              className="flex-1 min-h-[48px] rounded-xl bg-[#0F172A] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800"
            >
              تفعيل الكود فوراً
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

