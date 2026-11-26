import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  EyeOff,
  MessageSquareWarning,
  Search,
  Send,
  Trash2,
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { ComplaintStatus, StudentComplaint } from '../../types';
import { COMPLAINT_CATEGORY_LABELS } from '../student/StudentComplaintsView';
import { SecurityPinModal } from './SecurityPinModal';

export const AdminComplaints: React.FC = () => {
  const { db, replyToComplaint, updateComplaintStatus, deleteComplaint } = usePlatform();

  const [statusFilter, setStatusFilter] = useState<'all' | ComplaintStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [pendingDelete, setPendingDelete] = useState<StudentComplaint | null>(null);

  const pendingCount = db.complaints.filter((c) => c.status === 'pending').length;
  const resolvedCount = db.complaints.filter((c) => c.status === 'resolved').length;

  const filteredComplaints = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return db.complaints.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.studentName.toLowerCase().includes(q) ||
        c.studentPhone.includes(q) ||
        c.details.toLowerCase().includes(q) ||
        COMPLAINT_CATEGORY_LABELS[c.category].toLowerCase().includes(q)
      );
    });
  }, [db.complaints, statusFilter, searchQuery]);

  const handleSendReply = (complaint: StudentComplaint) => {
    const text = (replyDrafts[complaint.id] ?? complaint.adminReply ?? '').trim();
    if (!text) return;
    replyToComplaint(complaint.id, text, true);
    setReplyDrafts((prev) => ({ ...prev, [complaint.id]: '' }));
    setFeedbackMsg(`تم إرسال الرد على شكوى «${complaint.studentName}» وتحديث حالتها إلى «تم الحل».`);
    window.setTimeout(() => setFeedbackMsg(''), 4000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold text-[#B48A1E]">متابعة جودة المنصة ورضا الطلبة</p>
          <h1 className="mt-1 text-xl sm:text-2xl font-extrabold text-slate-900">
            الشكاوى الواردة ({db.complaints.length})
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            راجعي شكاوى الطلاب، اكتبي الرد المناسب، غيّري الحالة إلى «تم الحل»، أو احذفي الشكاوى المنتهية بحماية رمز الدخول.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-1.5 text-amber-800 tabular-nums">
            قيد المراجعة: {pendingCount}
          </span>
          <span className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-emerald-800 tabular-nums">
            تم الحل: {resolvedCount}
          </span>
        </div>
      </div>

      {feedbackMsg && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs sm:text-sm font-bold text-emerald-900"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {(
            [
              { id: 'all', label: `الكل (${db.complaints.length})` },
              { id: 'pending', label: `قيد المراجعة (${pendingCount})` },
              { id: 'resolved', label: `تم الحل (${resolvedCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`min-h-[38px] rounded-xl px-3.5 text-xs font-extrabold transition-colors ${
                statusFilter === tab.id
                  ? 'bg-[#0F172A] text-[#D4AF37]'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
            placeholder="بحث باسم الطالب أو الهاتف أو التفاصيل..."
            className="w-full min-h-[40px] rounded-xl border border-slate-200 bg-slate-50 pr-9 pl-3 text-xs text-slate-900 focus:border-[#0F172A] focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Complaints List */}
      {filteredComplaints.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center space-y-2">
          <MessageSquareWarning className="h-9 w-9 text-slate-300 mx-auto" />
          <p className="text-sm font-extrabold text-slate-700">لا توجد شكاوى مطابقة للتصفية الحالية</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredComplaints.map((cmp) => {
            const isResolved = cmp.status === 'resolved';
            const draft = replyDrafts[cmp.id] ?? '';

            return (
              <article
                key={cmp.id}
                className="rounded-2xl bg-white border border-slate-200 overflow-hidden"
              >
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-extrabold text-slate-900">
                        {cmp.isPrivateToAdmin ? 'طالب (شكوى خاصة وسرية للإدارة)' : cmp.studentName}
                      </span>
                      {cmp.isPrivateToAdmin && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-[#0F172A] px-2 py-0.5 text-[10px] font-bold text-[#D4AF37]">
                          <EyeOff className="h-3 w-3" />
                          <span>خاص للإدارة</span>
                        </span>
                      )}
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-600 font-semibold">
                        {cmp.trackLabel} ({cmp.subStage})
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                      <span className="font-bold text-[#9A7415]">
                        {COMPLAINT_CATEGORY_LABELS[cmp.category]}
                      </span>
                      {!cmp.isPrivateToAdmin && (
                        <span className="font-mono" dir="ltr">
                          {cmp.studentPhone}
                        </span>
                      )}
                      <span className="font-mono" dir="ltr">
                        {cmp.createdAt}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        updateComplaintStatus(cmp.id, isResolved ? 'pending' : 'resolved')
                      }
                      className={`min-h-[36px] inline-flex items-center gap-1.5 rounded-xl px-3 text-xs font-extrabold border transition-colors ${
                        isResolved
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                          : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                      }`}
                    >
                      {isResolved ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <Clock className="h-3.5 w-3.5" />
                      )}
                      <span>{isResolved ? 'تم الحل' : 'تحديد كـ تم الحل'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPendingDelete(cmp)}
                      aria-label="حذف الشكوى"
                      className="min-h-[36px] w-9 inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <p className="text-sm text-slate-800 font-reading leading-relaxed">
                    {cmp.details}
                  </p>

                  {cmp.adminReply && (
                    <div className="rounded-xl bg-emerald-50/70 border border-emerald-200 p-4 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-emerald-900">ردكِ الحالي للطالب</span>
                        {cmp.repliedAt && (
                          <span className="font-mono text-[11px] text-emerald-700" dir="ltr">
                            {cmp.repliedAt}
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-emerald-950 font-reading leading-relaxed">
                        {cmp.adminReply}
                      </p>
                    </div>
                  )}

                  {/* Reply Input Box */}
                  <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                    <input
                      type="text"
                      value={draft}
                      onChange={(e) =>
                        setReplyDrafts((prev) => ({ ...prev, [cmp.id]: e.target.value }))
                      }
                      placeholder={
                        cmp.adminReply
                          ? 'اكتبي رداً محدّثاً للطالب...'
                          : 'اكتبي ردكِ للطالب ليصله فوراً مع تحويل الحالة إلى «تم الحل»...'
                      }
                      className="flex-1 min-h-[42px] rounded-xl border border-slate-300 px-3.5 text-xs sm:text-sm text-slate-900 focus:border-[#0F172A] focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={!draft.trim()}
                      onClick={() => handleSendReply(cmp)}
                      className="min-h-[42px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0F172A] px-4 text-xs font-extrabold text-[#D4AF37] hover:bg-slate-800 disabled:opacity-40 whitespace-nowrap"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>إرسال الرد وتم الحل</span>
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
        title="تأكيد حذف الشكوى"
        itemLabel={
          pendingDelete
            ? `شكوى (${COMPLAINT_CATEGORY_LABELS[pendingDelete.category]}) — ${
                pendingDelete.isPrivateToAdmin ? 'شكوى خاصة' : pendingDelete.studentName
              }`
            : ''
        }
        warningDetail="سيتم حذف هذه الشكوى وسجل الرد المرتبط بها نهائياً من قاعدة البيانات."
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            deleteComplaint(pendingDelete.id);
            setPendingDelete(null);
            setFeedbackMsg('تم حذف الشكوى بنجاح بعد التحقق من رمز الأمان.');
            window.setTimeout(() => setFeedbackMsg(''), 3500);
          }
        }}
      />
    </div>
  );
};
