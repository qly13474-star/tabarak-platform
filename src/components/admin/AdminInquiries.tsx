import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  MessageCircleQuestion,
  Search,
  Send,
  Trash2,
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { InquiryStatus, StudentInquiry } from '../../types';
import { SecurityPinModal } from './SecurityPinModal';

export const AdminInquiries: React.FC = () => {
  const { db, replyToInquiry, deleteInquiry } = usePlatform();

  const [statusFilter, setStatusFilter] = useState<'all' | InquiryStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [pendingDelete, setPendingDelete] = useState<StudentInquiry | null>(null);

  const pendingCount = db.inquiries.filter((i) => i.status === 'pending').length;
  const answeredCount = db.inquiries.filter((i) => i.status === 'answered').length;

  const filteredInquiries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return db.inquiries.filter((inq) => {
      if (statusFilter !== 'all' && inq.status !== statusFilter) return false;
      if (!q) return true;
      return (
        inq.studentName.toLowerCase().includes(q) ||
        inq.studentPhone.includes(q) ||
        inq.title.toLowerCase().includes(q) ||
        inq.details.toLowerCase().includes(q)
      );
    });
  }, [db.inquiries, statusFilter, searchQuery]);

  const handleSendReply = (inquiry: StudentInquiry) => {
    const text = (replyDrafts[inquiry.id] ?? '').trim();
    if (!text) return;
    replyToInquiry(inquiry.id, text);
    setReplyDrafts((prev) => ({ ...prev, [inquiry.id]: '' }));
    setFeedbackMsg(
      `تم إرسال إجابتكِ إلى «${inquiry.studentName}» وإظهار إشعار فوري في حساب الطالب.`
    );
    window.setTimeout(() => setFeedbackMsg(''), 4000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold text-purple-300">
            التواصل الأكاديمي المباشر مع الطلبة
          </p>
          <h1 className="mt-1 text-xl sm:text-2xl font-extrabold text-white">
            استفسارات الطلاب ({db.inquiries.length})
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            أجيبي عن أسئلة الطلاب الدراسية والعامة هنا ليصل الرد فوراً كإشعار داخل حساب الطالب.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="rounded-xl bg-amber-500/15 border border-amber-400/35 px-3 py-1.5 text-amber-200 tabular-nums">
            بانتظار الرد: {pendingCount}
          </span>
          <span className="rounded-xl bg-emerald-500/15 border border-emerald-400/35 px-3 py-1.5 text-emerald-200 tabular-nums">
            تمت الإجابة: {answeredCount}
          </span>
        </div>
      </div>

      {feedbackMsg && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-2xl bg-emerald-500/15 border border-emerald-400/35 px-4 py-3 text-xs sm:text-sm font-bold text-emerald-200"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {(
            [
              { id: 'all', label: `الكل (${db.inquiries.length})` },
              { id: 'pending', label: `بانتظار الرد (${pendingCount})` },
              { id: 'answered', label: `تمت الإجابة (${answeredCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`min-h-[38px] rounded-xl px-3.5 text-xs font-extrabold transition-colors ${
                statusFilter === tab.id
                  ? 'bg-[#110D1F] text-purple-300'
                  : 'bg-white/[0.06] text-slate-300 hover:bg-white/15'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم الطالب أو عنوان الاستفسار..."
            className="w-full min-h-[40px] rounded-xl border border-purple-500/20 bg-white/[0.04] pr-9 pl-3 text-xs text-white focus:border-purple-400 focus:bg-[#161029] focus:outline-none"
          />
        </div>
      </div>

      {/* Inquiries List */}
      {filteredInquiries.length === 0 ? (
        <div className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-10 text-center space-y-2">
          <MessageCircleQuestion className="h-9 w-9 text-slate-300 mx-auto" />
          <p className="text-sm font-extrabold text-slate-200">
            لا توجد استفسارات مطابقة للتصفية الحالية
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInquiries.map((inq) => {
            const isAnswered = inq.status === 'answered';
            const draft = replyDrafts[inq.id] ?? '';

            return (
              <article
                key={inq.id}
                className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 overflow-hidden"
              >
                <div className="px-5 py-4 border-b border-purple-500/15 bg-white/[0.035] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-extrabold text-white">{inq.studentName}</span>
                      <span className="text-slate-300">·</span>
                      <span className="font-mono text-slate-300" dir="ltr">
                        {inq.studentPhone}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-300 font-semibold">
                        {inq.trackLabel} ({inq.subStage})
                      </span>
                    </div>
                    <h2 className="text-sm sm:text-base font-extrabold text-white">
                      {inq.title}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-extrabold ${
                        isAnswered
                          ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/35'
                          : 'bg-amber-500/15 text-amber-200 border border-amber-400/35'
                      }`}
                    >
                      {isAnswered ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <Clock className="h-3.5 w-3.5" />
                      )}
                      <span>{isAnswered ? 'تمت الإجابة' : 'بانتظار الرد'}</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => setPendingDelete(inq)}
                      aria-label="حذف الاستفسار"
                      className="min-h-[34px] w-9 inline-flex items-center justify-center rounded-xl border border-rose-400/35 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>نص الاستفسار:</span>
                    <span className="font-mono" dir="ltr">
                      {inq.createdAt}
                    </span>
                  </div>
                  <p className="text-sm text-slate-100 font-reading leading-relaxed">
                    {inq.details}
                  </p>

                  {inq.adminReply && (
                    <div className="rounded-xl bg-amber-500/12 border border-amber-400/35 p-4 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-purple-300">إجابتكِ للطالب</span>
                        {inq.repliedAt && (
                          <span className="font-mono text-[11px] text-amber-800/80" dir="ltr">
                            {inq.repliedAt}
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-white font-reading leading-relaxed">
                        {inq.adminReply}
                      </p>
                    </div>
                  )}

                  {/* Direct Reply Box */}
                  <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                    <input
                      type="text"
                      value={draft}
                      onChange={(e) =>
                        setReplyDrafts((prev) => ({ ...prev, [inq.id]: e.target.value }))
                      }
                      placeholder={
                        inq.adminReply
                          ? 'عدّلي الإجابة أو أرسلي توضيحاً إضافياً للطالب...'
                          : 'اكتبي إجابتكِ هنا لتصل فوراً كإشعار في حساب الطالب...'
                      }
                      className="flex-1 min-h-[42px] rounded-xl border border-purple-500/25 px-3.5 text-xs sm:text-sm text-white focus:border-purple-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={!draft.trim()}
                      onClick={() => handleSendReply(inq)}
                      className="min-h-[42px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 px-5 text-xs font-extrabold text-white hover:brightness-105 disabled:opacity-40 whitespace-nowrap"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>إرسال الإجابة للطالب</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Teacher Security PIN Modal for Deletion */}
      <SecurityPinModal
        isOpen={Boolean(pendingDelete)}
        title="تأكيد حذف الاستفسار"
        itemLabel={pendingDelete ? `${pendingDelete.title} — ${pendingDelete.studentName}` : ''}
        warningDetail="سيتم حذف هذا الاستفسار والرد المرتبط به نهائياً من قاعدة البيانات."
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            deleteInquiry(pendingDelete.id);
            setPendingDelete(null);
            setFeedbackMsg('تم حذف الاستفسار بنجاح بعد التحقق من رمز الأمان.');
            window.setTimeout(() => setFeedbackMsg(''), 3500);
          }
        }}
      />
    </div>
  );
};
