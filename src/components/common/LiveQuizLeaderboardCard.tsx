import React from 'react';
import { Award, CheckCircle2, Clock, Trophy } from 'lucide-react';
import { LiveQuizLeaderboardEntry } from '../../types';

interface LiveQuizLeaderboardCardProps {
  sessionTitle: string;
  totalQuestions: number;
  entries: LiveQuizLeaderboardEntry[];
  highlightStudentId?: string;
}

export const LiveQuizLeaderboardCard: React.FC<LiveQuizLeaderboardCardProps> = ({
  sessionTitle,
  totalQuestions,
  entries,
  highlightStudentId,
}) => {
  const myEntry = highlightStudentId
    ? entries.find((e) => e.studentId === highlightStudentId)
    : undefined;

  return (
    <section
      aria-label="الإحصائيات النهائية ولوحة المستويات"
      className="rounded-2xl bg-[#0F172A] text-white border border-[#D4AF37]/50 overflow-hidden shadow-lg"
    >
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-l from-[#1E293B] to-[#0F172A] border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4AF37] text-slate-950 shrink-0">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#D4AF37]">
              الإحصائيات النهائية ولوحة المستويات
            </p>
            <h3 className="text-sm sm:text-base font-extrabold text-white">{sessionTitle}</h3>
          </div>
        </div>
        <div className="text-xs text-slate-300 font-mono tabular-nums">
          {totalQuestions} أسئلة · {entries.length} مشارك
        </div>
      </div>

      {/* Personal Student Summary (when viewed by a participating student) */}
      {myEntry && (
        <div className="mx-5 mt-5 rounded-xl bg-white/10 border border-[#D4AF37]/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Award className="h-6 w-6 text-[#D4AF37] shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-300">
                نتيجتك الشخصية — تم حفظها تلقائياً في «نتائجي» وإشعاراتك
              </p>
              <p className="mt-0.5 text-sm sm:text-base font-extrabold text-white">
                {myEntry.levelLabel} {myEntry.medal ?? ''} · المركز {myEntry.rank} من{' '}
                {entries.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
            <div>
              <span className="block text-slate-400">الصحيحة</span>
              <strong className="text-sm text-white">
                {myEntry.correctCount}/{myEntry.totalQuestions}
              </strong>
            </div>
            <div className="h-7 w-px bg-white/15" />
            <div>
              <span className="block text-slate-400">النسبة</span>
              <strong className="text-base text-[#D4AF37]">{myEntry.percentage}%</strong>
            </div>
          </div>
        </div>
      )}

      {/* Full Ranked Leaderboard */}
      <div className="p-5 space-y-2.5">
        {entries.length === 0 ? (
          <p className="text-center text-xs text-slate-400 py-4">
            لم يشارك أي طالب في هذه الجلسة.
          </p>
        ) : (
          entries.map((entry) => {
            const isMe = highlightStudentId === entry.studentId;
            const isTop3 = entry.rank <= 3;

            return (
              <div
                key={entry.studentId}
                className={`rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 border transition-colors ${
                  isMe
                    ? 'bg-[#D4AF37]/20 border-[#D4AF37]'
                    : isTop3
                      ? 'bg-slate-800/80 border-white/15'
                      : 'bg-slate-900/60 border-white/10'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`min-w-[96px] text-xs font-extrabold whitespace-nowrap ${
                      isTop3 ? 'text-[#D4AF37]' : 'text-slate-300'
                    }`}
                  >
                    <span>{entry.levelLabel}</span>
                    {entry.medal && (
                      <span className="mr-1" aria-hidden="true">
                        {entry.medal}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-white truncate">
                      {entry.studentName}
                      {isMe && (
                        <span className="mr-2 text-[11px] font-bold text-[#D4AF37]">(أنت)</span>
                      )}
                    </p>
                    <div className="flex items-center gap-2.5 text-[11px] text-slate-400 font-mono tabular-nums mt-0.5">
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                        {entry.correctCount}/{entry.totalQuestions} صحيحة
                      </span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3 text-amber-300" />
                        متوسط {(entry.avgResponseMs / 1000).toFixed(1)} ث
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-left shrink-0">
                  <span
                    className={`font-mono text-lg font-extrabold tabular-nums ${
                      entry.percentage >= 80
                        ? 'text-emerald-400'
                        : entry.percentage >= 50
                          ? 'text-[#F59E0B]'
                          : 'text-red-400'
                    }`}
                  >
                    {entry.percentage}%
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
