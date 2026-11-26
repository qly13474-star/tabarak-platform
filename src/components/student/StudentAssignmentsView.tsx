import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Circle,
  ClipboardList,
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { DailyAssignment } from '../../types';
import {
  getAudienceLabel,
  getRelativeDateISO,
  isAssignmentForStudent,
} from '../../services/supabase';

import { PlatformSubPageBar } from '../common/PlatformThemeUI';

type StatusFilter = 'all' | 'pending' | 'completed';

interface AssignmentGroup {
  key: 'today' | 'tomorrow' | 'upcoming' | 'past';
  title: string;
  subtitle: string;
  items: DailyAssignment[];
}

interface StudentAssignmentsViewProps {
  onBack?: () => void;
}

export const StudentAssignmentsView: React.FC<StudentAssignmentsViewProps> = ({ onBack }) => {
  const {
    db,
    currentUser,
    getTrackName,
    toggleAssignmentCompleted,
    markAssignmentNotificationsRead,
  } = usePlatform();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const todayISO = getRelativeDateISO(0);
  const tomorrowISO = getRelativeDateISO(1);

  const stageAssignments = useMemo(() => {
    if (!currentUser) return [];
    return db.assignments
      .filter((a) => isAssignmentForStudent(a, currentUser))
      .sort((a, b) => {
        if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        if (a.priority !== b.priority) return a.priority === 'urgent' ? -1 : 1;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [db.assignments, currentUser]);

  // Mark stage assignments as read as soon as the student views the schedule
  useEffect(() => {
    if (!currentUser || stageAssignments.length === 0) return;
    const readIds = db.readAssignmentNotifications[currentUser.id] ?? [];
    const unreadIds = stageAssignments
      .filter((a) => !readIds.includes(a.id))
      .map((a) => a.id);
    if (unreadIds.length > 0) {
      markAssignmentNotificationsRead(unreadIds);
    }
  }, [currentUser, stageAssignments, db.readAssignmentNotifications, markAssignmentNotificationsRead]);

  if (!currentUser) return null;

  const completedIds = db.completedAssignments[currentUser.id] ?? [];
  const totalCount = stageAssignments.length;
  const completedCount = stageAssignments.filter((a) => completedIds.includes(a.id)).length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const visibleAssignments = stageAssignments.filter((a) => {
    const done = completedIds.includes(a.id);
    if (statusFilter === 'completed') return done;
    if (statusFilter === 'pending') return !done;
    return true;
  });

  const rawGroups: AssignmentGroup[] = [
    {
      key: 'today',
      title: 'تحاضير اليوم',
      subtitle: todayISO,
      items: visibleAssignments.filter((a) => a.dueDate === todayISO),
    },
    {
      key: 'tomorrow',
      title: 'تحاضير غداً',
      subtitle: tomorrowISO,
      items: visibleAssignments.filter((a) => a.dueDate === tomorrowISO),
    },
    {
      key: 'upcoming',
      title: 'التحاضير القادمة',
      subtitle: 'الأيام المقبلة',
      items: visibleAssignments.filter((a) => a.dueDate > tomorrowISO),
    },
    {
      key: 'past',
      title: 'تحاضير سابقة',
      subtitle: 'مواعيد مضت',
      items: visibleAssignments.filter((a) => a.dueDate < todayISO),
    },
  ];
  const groups = rawGroups.filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      {onBack && (
        <PlatformSubPageBar onBack={onBack} sectionLabel="جدول التحاضير والواجبات اليومية" />
      )}
      {/* Header & Progress Summary */}
      <section className="rounded-2xl bg-[#0F172A] text-white p-5 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-[#D4AF37]">
              {getTrackName(currentUser.track)} · {currentUser.subStage}
              {currentUser.branch ? ` · فرع ${currentUser.branch}` : ''}
            </p>
            <h1 className="mt-1 text-xl sm:text-2xl font-extrabold text-white">
              جدول التحاضير والواجبات اليومية
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-300 font-reading">
              تظهر لك هنا جميع التحاضير والواجبات المرسلة من الأستاذة تبارك لمرحلتك الدراسية مرتبة حسب التاريخ.
            </p>
          </div>

          <div className="text-right sm:text-left shrink-0">
            <p className="text-xs text-slate-400">نسبة إنجاز التحاضير</p>
            <p className="text-2xl font-extrabold text-[#D4AF37] font-mono tabular-nums">
              {completedCount} / {totalCount}
              <span className="text-xs font-bold text-slate-300 mr-2">({progressPct}%)</span>
            </p>
          </div>
        </div>

        {/* Clean Progress Track */}
        <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-l from-[#D4AF37] to-[#F59E0B] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </section>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`min-h-[40px] rounded-xl px-4 text-xs font-bold transition-colors ${
              statusFilter === 'all'
                ? 'bg-[#0F172A] text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-400'
            }`}
          >
            الكل ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`min-h-[40px] rounded-xl px-4 text-xs font-bold transition-colors ${
              statusFilter === 'pending'
                ? 'bg-[#0F172A] text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-400'
            }`}
          >
            المتبقية ({totalCount - completedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('completed')}
            className={`min-h-[40px] rounded-xl px-4 text-xs font-bold transition-colors ${
              statusFilter === 'completed'
                ? 'bg-[#0F172A] text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-400'
            }`}
          >
            المكتملة ({completedCount})
          </button>
        </div>

        <p className="text-xs text-slate-500">
          اضغط على «تم إكمال التحضير» بعد إنهاء الدراسة لمتابعة تقدمك اليومي.
        </p>
      </div>

      {/* Chronological Groups */}
      {groups.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center space-y-2">
          <ClipboardList className="h-8 w-8 text-slate-300 mx-auto" />
          <p className="text-sm font-extrabold text-slate-800">
            {statusFilter === 'pending' && totalCount > 0
              ? 'ممتاز! لقد أكملت جميع التحاضير والواجبات المقررة لمرحلتك.'
              : 'لا توجد تحاضير مطابقة لهذا التصنيف حالياً.'}
          </p>
          <p className="text-xs text-slate-500">
            عندما ترسل الأستاذة تبارك تحضيراً جديداً لمرحلتك سيصلك تنبيه فوري في جرس الإشعارات.
          </p>
        </div>
      ) : (
        <div className="space-y-7">
          {groups.map((group) => (
            <section key={group.key} className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <Calendar
                    className={`h-4 w-4 ${
                      group.key === 'today' ? 'text-red-600' : 'text-[#B48A1E]'
                    }`}
                  />
                  <h2 className="text-base font-extrabold text-slate-900">{group.title}</h2>
                </div>
                <span className="text-xs font-mono text-slate-500 tabular-nums" dir="ltr">
                  {group.subtitle}
                </span>
              </div>

              <div className="space-y-3">
                {group.items.map((asg) => {
                  const isDone = completedIds.includes(asg.id);
                  const isUrgent = asg.priority === 'urgent';

                  return (
                    <article
                      key={asg.id}
                      className={`rounded-2xl border p-5 transition-colors ${
                        isDone
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : isUrgent
                            ? 'bg-white border-red-200'
                            : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            {isUrgent ? (
                              <span className="inline-flex items-center gap-1 font-extrabold text-red-700">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                <span>مهم وعاجل</span>
                              </span>
                            ) : (
                              <span className="font-bold text-slate-500">تحضير يومي</span>
                            )}
                            <span className="text-slate-300">·</span>
                            <span className="inline-flex items-center gap-1 font-bold text-[#B48A1E]">
                              <BookOpen className="h-3.5 w-3.5" />
                              <span>{asg.courseTitle || getAudienceLabel(asg.audience)}</span>
                            </span>
                            <span className="text-slate-300">·</span>
                            <span className="font-mono text-slate-500 tabular-nums" dir="ltr">
                              {asg.dueDate}
                            </span>
                          </div>

                          <h3
                            className={`text-base font-extrabold leading-snug ${
                              isDone ? 'text-slate-500 line-through' : 'text-slate-900'
                            }`}
                          >
                            {asg.title}
                          </h3>

                          <p className="text-sm text-slate-600 font-reading leading-relaxed">
                            {asg.details}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleAssignmentCompleted(asg.id)}
                          className={`min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl px-4 text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 ${
                            isDone
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-[#0F172A] text-white hover:bg-slate-800'
                          }`}
                        >
                          {isDone ? (
                            <>
                              <CheckCircle2 className="h-4 w-4" />
                              <span>تم الإكمال ✓</span>
                            </>
                          ) : (
                            <>
                              <Circle className="h-4 w-4 text-[#D4AF37]" />
                              <span>تم إكمال التحضير</span>
                            </>
                          )}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};
