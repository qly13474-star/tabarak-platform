import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  EyeOff,
  MessageSquareWarning,
  Send,
  Shield,
  User,
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { ComplaintCategory } from '../../types';
import { PlatformSubPageBar } from '../common/PlatformThemeUI';

export const COMPLAINT_CATEGORY_LABELS: Record<ComplaintCategory, string> = {
  technical: 'شكوى تقنية (التطبيق / الفيديو / الصوت)',
  lecture: 'بخصوص محاضرة أو ملزمة',
  subscription: 'بخصوص الاشتراك أو التفعيل',
  other: 'شكوى أو ملاحظة أخرى',
};

export const StudentComplaintsView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { db, currentUser, submitComplaint, markComplaintRepliesRead } = usePlatform();

  const [category, setCategory] = useState<ComplaintCategory>('technical');
  const [details, setDetails] = useState('');
  const [isPrivateToAdmin, setIsPrivateToAdmin] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const myComplaints = useMemo(() => {
    if (!currentUser) return [];
    return db.complaints.filter((c) => c.studentId === currentUser.id);
  }, [db.complaints, currentUser]);

  // Mark unread admin replies as read when student opens the complaints view
  useEffect(() => {
    const unreadIds = myComplaints
      .filter((c) => Boolean(c.adminReply) && c.isReplyReadByStudent === false)
      .map((c) => c.id);
    if (unreadIds.length > 0) {
      markComplaintRepliesRead(unreadIds);
    }
  }, [myComplaints, markComplaintRepliesRead]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (details.trim().length < 10) {
      setErrorMsg('يرجى كتابة تفاصيل الشكوى بوضوح (10 أحرف على الأقل) لتتمكن الإدارة من معالجتها.');
      return;
    }

    const created = submitComplaint({
      category,
      details,
      isPrivateToAdmin,
    });

    if (created) {
      setDetails('');
      setIsPrivateToAdmin(false);
      setSuccessMsg(
        'تم استلام شكواك بنجاح وتحويلها مباشرة إلى لوحة الأستاذة تبارك الزيرجاوي. سيظهر الرد هنا فور المراجعة.'
      );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {onBack && <PlatformSubPageBar onBack={onBack} sectionLabel="صندوق الشكاوى والملاحظات" />}
      {/* Header Banner */}
      <section className="rounded-3xl bg-[#110D1F] text-white p-6 sm:p-8 border border-purple-500/20">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-300 shrink-0">
            <MessageSquareWarning className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-extrabold text-purple-300">صندوق الشكاوى والملاحظات</p>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              تقديم شكوى ومتابعة المعالجة
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-reading leading-relaxed max-w-2xl">
              رأيك يهمنا لتحسين تجربتك التعليمية. يمكنك إرسال أي مشكلة تقنية أو ملاحظة حول المحاضرات أو الاشتراك، وستتابع الأستاذة تبارك معالجتها وترد عليك هنا مباشرة.
            </p>
          </div>
        </div>
      </section>

      {/* New Complaint Form */}
      <section className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-5 sm:p-7">
        <h2 className="text-base font-extrabold text-white mb-4">إرسال شكوى جديدة</h2>

        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-500/15 border border-rose-400/35 px-4 py-3 text-xs font-bold text-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-400/35 px-4 py-3 text-xs font-bold text-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold text-slate-200 mb-2">
              نوع الشكوى
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(Object.keys(COMPLAINT_CATEGORY_LABELS) as ComplaintCategory[]).map((key) => {
                const selected = category === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCategory(key)}
                    className={`min-h-[44px] rounded-xl border px-3.5 py-2.5 text-right text-xs font-bold transition-colors ${
                      selected
                        ? 'border-purple-400 bg-[#110D1F] text-purple-300'
                        : 'border-purple-500/20 bg-white/[0.04] text-slate-200 hover:border-purple-400/50'
                    }`}
                  >
                    {COMPLAINT_CATEGORY_LABELS[key]}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="complaint-details"
              className="block text-xs font-extrabold text-slate-200 mb-2"
            >
              تفاصيل الشكوى
            </label>
            <textarea
              id="complaint-details"
              rows={4}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="اكتب تفاصيل المشكلة أو الملاحظة بوضوح (اسم المحاضرة، وقت حدوث المشكلة، أو أي تفاصيل تساعدنا في الحل السريع)..."
              className="w-full rounded-xl border border-purple-500/25 bg-[#110D1F]/85 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-purple-400 focus:outline-none font-reading"
            />
          </div>

          {/* Privacy Mode Selector */}
          <div>
            <p className="text-xs font-extrabold text-slate-200 mb-2">طريقة الإرسال والخصوصية</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setIsPrivateToAdmin(false)}
                className={`min-h-[48px] rounded-xl border px-4 py-2.5 text-right flex items-center gap-3 transition-colors ${
                  !isPrivateToAdmin
                    ? 'border-amber-400 bg-amber-500/12 text-white'
                    : 'border-purple-500/20 bg-white/[0.045] backdrop-blur-xl text-slate-300 hover:bg-white/[0.08]'
                }`}
              >
                <User className="h-4 w-4 text-purple-300 shrink-0" />
                <div>
                  <span className="block text-xs font-extrabold">إرسال مع اسمي الكامل</span>
                  <span className="block text-[11px] text-slate-400">
                    {currentUser?.fullName}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsPrivateToAdmin(true)}
                className={`min-h-[48px] rounded-xl border px-4 py-2.5 text-right flex items-center gap-3 transition-colors ${
                  isPrivateToAdmin
                    ? 'border-purple-400 bg-[#110D1F] text-white'
                    : 'border-purple-500/20 bg-white/[0.045] backdrop-blur-xl text-slate-300 hover:bg-white/[0.08]'
                }`}
              >
                <EyeOff
                  className={`h-4 w-4 shrink-0 ${
                    isPrivateToAdmin ? 'text-purple-300' : 'text-slate-400'
                  }`}
                />
                <div>
                  <span className="block text-xs font-extrabold">إرسال بشكل خاص وسري للإدارة</span>
                  <span
                    className={`block text-[11px] ${
                      isPrivateToAdmin ? 'text-slate-300' : 'text-slate-400'
                    }`}
                  >
                    تُعامل بسرية تامة ولا يظهر اسمك علناً
                  </span>
                </div>
              </button>
            </div>
          </div>

          <div className="pt-1">
            <button
              type="submit"
              className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 px-6 text-sm font-extrabold text-white hover:brightness-105 transition-all"
            >
              <Send className="h-4 w-4" />
              <span>إرسال الشكوى للأستاذة</span>
            </button>
          </div>
        </form>
      </section>

      {/* Previous Complaints History */}
      <section className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 overflow-hidden">
        <div className="px-5 py-4 border-b border-purple-500/15 flex items-center justify-between gap-2">
          <h2 className="text-sm sm:text-base font-extrabold text-white">
            سجل شكاواي السابقة ({myComplaints.length})
          </h2>
          <span className="text-xs text-slate-400">تُحدَّث الحالة تلقائياً</span>
        </div>

        {myComplaints.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Shield className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-200">لم تقم بإرسال أي شكاوى حتى الآن</p>
            <p className="text-xs text-slate-400">
              في حال واجهت أي مشكلة في المنصة أو المحاضرات يمكنك استخدام النموذج أعلاه في أي وقت.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-purple-500/15">
            {myComplaints.map((cmp) => {
              const isResolved = cmp.status === 'resolved';
              return (
                <article key={cmp.id} className="p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-extrabold text-white">
                        {COMPLAINT_CATEGORY_LABELS[cmp.category]}
                      </span>
                      {cmp.isPrivateToAdmin && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-white/[0.06] px-2 py-0.5 text-[11px] font-bold text-slate-300">
                          <EyeOff className="h-3 w-3" />
                          <span>خاص للإدارة</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 text-xs">
                      <span
                        className={`inline-flex items-center gap-1 font-extrabold ${
                          isResolved ? 'text-emerald-300' : 'text-purple-300'
                        }`}
                      >
                        {isResolved ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <Clock className="h-3.5 w-3.5" />
                        )}
                        <span>{isResolved ? 'تم الحل' : 'قيد المراجعة'}</span>
                      </span>
                      <span className="font-mono text-[11px] text-slate-400" dir="ltr">
                        {cmp.createdAt}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-slate-200 font-reading leading-relaxed">
                    {cmp.details}
                  </p>

                  {cmp.adminReply ? (
                    <div className="rounded-xl bg-emerald-500/12 border border-emerald-400/35 p-4 space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-extrabold text-emerald-200">
                          رد الأستاذة تبارك الزيرجاوي
                        </span>
                        {cmp.repliedAt && (
                          <span className="font-mono text-[11px] text-emerald-300" dir="ltr">
                            {cmp.repliedAt}
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-emerald-200 font-reading leading-relaxed">
                        {cmp.adminReply}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">
                      شكواك قيد المراجعة حالياً من قبل الإدارة، وسيصلك إشعار فور الرد عليها.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
