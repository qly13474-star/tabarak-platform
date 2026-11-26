import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  HelpCircle,
  MessageCircleQuestion,
  Send,
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { PlatformSubPageBar } from '../common/PlatformThemeUI';

export const StudentInquiriesView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { db, currentUser, submitInquiry, markInquiryRepliesRead } = usePlatform();

  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const myInquiries = useMemo(() => {
    if (!currentUser) return [];
    return db.inquiries.filter((inq) => inq.studentId === currentUser.id);
  }, [db.inquiries, currentUser]);

  // Mark answered inquiries as read once viewed
  useEffect(() => {
    const unreadIds = myInquiries
      .filter((inq) => inq.status === 'answered' && !inq.isReplyReadByStudent)
      .map((inq) => inq.id);
    if (unreadIds.length > 0) {
      markInquiryRepliesRead(unreadIds);
    }
  }, [myInquiries, markInquiryRepliesRead]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (title.trim().length < 4) {
      setErrorMsg('يرجى كتابة عنوان واضح للاستفسار.');
      return;
    }
    if (details.trim().length < 8) {
      setErrorMsg('يرجى كتابة تفاصيل سؤالك أو استفسارك لتتمكن الأستاذة من إجابتك بدقة.');
      return;
    }

    const created = submitInquiry({ title, details });
    if (created) {
      setTitle('');
      setDetails('');
      setSuccessMsg(
        'تم إرسال استفسارك للأستاذة تبارك بنجاح! سيصلك إشعار فوري في جرس التنبيهات فور كتابة الرد.'
      );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {onBack && <PlatformSubPageBar onBack={onBack} sectionLabel="الاستفسارات والأسئلة المباشرة" />}
      {/* Header Banner */}
      <section className="rounded-3xl bg-[#0F172A] text-white p-6 sm:p-8 border border-slate-800">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37] shrink-0">
            <MessageCircleQuestion className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-extrabold text-[#D4AF37]">الاستفسارات والأسئلة المباشرة</p>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              اسأل الأستاذة تبارك الأزيرجاوي
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-reading leading-relaxed max-w-2xl">
              لديك استفسار دراسي حول مسألة أو منهج أو سؤال عام حول الدورات والمواعيد؟ أرسله هنا وسيظهر رد الأستاذة مباشرة في حسابك مع إشعار فوري.
            </p>
          </div>
        </div>
      </section>

      {/* Inquiry Form */}
      <section className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-7">
        <h2 className="text-base font-extrabold text-slate-900 mb-4">إرسال استفسار جديد</h2>

        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs font-bold text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs font-bold text-emerald-900">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="inquiry-title"
              className="block text-xs font-extrabold text-slate-700 mb-2"
            >
              عنوان الاستفسار
            </label>
            <input
              id="inquiry-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: سؤال حول حل تمرين الفصل الثاني أو موعد المراجعة الوزارية"
              className="w-full min-h-[46px] rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0F172A] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="inquiry-details"
              className="block text-xs font-extrabold text-slate-700 mb-2"
            >
              تفاصيل الاستفسار
            </label>
            <textarea
              id="inquiry-details"
              rows={4}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="اكتب سؤالك بالتفصيل هنا..."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0F172A] focus:outline-none font-reading"
            />
          </div>

          <div className="pt-1">
            <button
              type="submit"
              className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F172A] px-6 text-sm font-extrabold text-[#D4AF37] hover:bg-slate-800 transition-colors"
            >
              <Send className="h-4 w-4" />
              <span>إرسال الاستفسار</span>
            </button>
          </div>
        </form>
      </section>

      {/* Student's Inquiry History */}
      <section className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
          <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
            سجل استفساراتي وردود الأستاذة ({myInquiries.length})
          </h2>
          <span className="text-xs text-slate-500">الردود تصل فوراً كإشعار</span>
        </div>

        {myInquiries.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <HelpCircle className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">لا توجد استفسارات سابقة بعد</p>
            <p className="text-xs text-slate-500">
              أرسل أول استفسار دراسي أو عام للأستاذة تبارك باستخدام النموذج أعلاه.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {myInquiries.map((inq) => {
              const isAnswered = inq.status === 'answered';
              return (
                <article key={inq.id} className="p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                      {inq.title}
                    </h3>
                    <div className="flex items-center gap-2.5 text-xs">
                      <span
                        className={`inline-flex items-center gap-1 font-extrabold ${
                          isAnswered ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {isAnswered ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <Clock className="h-3.5 w-3.5" />
                        )}
                        <span>{isAnswered ? 'تمت الإجابة' : 'بانتظار رد الأستاذة'}</span>
                      </span>
                      <span className="font-mono text-[11px] text-slate-400" dir="ltr">
                        {inq.createdAt}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-slate-700 font-reading leading-relaxed">
                    {inq.details}
                  </p>

                  {inq.adminReply ? (
                    <div className="rounded-xl bg-amber-50/70 border border-amber-200 p-4 space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-extrabold text-[#9A7415]">
                          إجابة الأستاذة تبارك الأزيرجاوي
                        </span>
                        {inq.repliedAt && (
                          <span className="font-mono text-[11px] text-amber-800/80" dir="ltr">
                            {inq.repliedAt}
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-900 font-reading leading-relaxed">
                        {inq.adminReply}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">
                      تم استلام استفسارك وسيصلك إشعار في الأعلى بمجرد رد الأستاذة.
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
