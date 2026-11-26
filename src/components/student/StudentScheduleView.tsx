import React, { useMemo } from 'react';
import { CalendarDays, Clock, Radio, BookOpen, ArrowLeft } from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { ARABIC_WEEKDAYS, isWeeklySlotForStudent } from '../../utils/parentReport';
import { PlatformSubPageBar } from '../common/PlatformThemeUI';

interface StudentScheduleViewProps {
  onBack: () => void;
  onJoinLive: () => void;
}

export const StudentScheduleView: React.FC<StudentScheduleViewProps> = ({
  onBack,
  onJoinLive,
}) => {
  const { db, currentUser, liveSession, getTrackName } = usePlatform();

  const mySlots = useMemo(() => {
    if (!currentUser) return [];
    return db.weeklySchedule.filter((slot) => isWeeklySlotForStudent(slot, currentUser));
  }, [db.weeklySchedule, currentUser]);

  const groupedByDay = useMemo(() => {
    return ARABIC_WEEKDAYS.map((day) => ({
      day,
      slots: mySlots.filter((s) => s.dayOfWeek === day),
    })).filter((group) => group.slots.length > 0);
  }, [mySlots]);

  if (!currentUser) return null;

  const isLiveNowForMe = liveSession.isLive && liveSession.track === currentUser.track;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PlatformSubPageBar onBack={onBack} sectionLabel="جدول البث الأسبوعي" />

      {/* Royal Navy & Gold Header */}
      <section className="rounded-2xl bg-[#0F172A] text-white p-6 sm:p-7 border border-[#D4AF37]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#D4AF37]">
            <CalendarDays className="h-4 w-4" />
            <span>مواعيد البث المباشر الخاصة بمرحلتك فقط</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">
            جدول البث الأسبوعي — {getTrackName(currentUser.track)}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            {currentUser.subStage}
            {currentUser.branch ? ` · فرع ${currentUser.branch}` : ''}
            {currentUser.department ? ` · قسم ${currentUser.department}` : ''}
            {' · '}جميع المواعيد بتوقيت بغداد
          </p>
        </div>

        {liveSession.isLive && (
          <button
            type="button"
            onClick={onJoinLive}
            className="min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#D4AF37] to-[#F59E0B] px-5 text-xs sm:text-sm font-extrabold text-slate-950 hover:brightness-105 whitespace-nowrap shrink-0"
          >
            <Radio className="h-4 w-4" />
            <span>{isLiveNowForMe ? 'دخول البث المباشر الآن' : 'معاينة قاعة البث'}</span>
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
      </section>

      {/* Schedule Grouped by Weekday */}
      {groupedByDay.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center space-y-2">
          <CalendarDays className="h-8 w-8 text-slate-300 mx-auto" />
          <p className="text-sm font-extrabold text-slate-800">
            لا توجد مواعيد بث مجدولة لمرحلتك حالياً
          </p>
          <p className="text-xs text-slate-500 font-reading">
            فور إضافة الأستاذة تبارك لمواعيد البث الأسبوعية الخاصة بصفك، ستظهر لك هنا تلقائياً ومرتبة حسب الأيام.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByDay.map(({ day, slots }) => (
            <section
              key={day}
              className="rounded-2xl bg-white border border-slate-200 overflow-hidden"
            >
              <div className="bg-slate-50 border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0F172A] text-[#D4AF37]">
                    <CalendarDays className="h-4 w-4" />
                  </span>
                  <h2 className="text-sm sm:text-base font-extrabold text-[#0F172A]">
                    يوم {day}
                  </h2>
                </div>
                <span className="text-xs font-bold text-slate-500 tabular-nums">
                  {slots.length} {slots.length === 1 ? 'محاضرة بث' : 'محاضرات بث'}
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {slots.map((slot) => (
                  <div
                    key={slot.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1 font-extrabold text-[#B48A1E] tabular-nums">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{slot.timeLabel}</span>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-slate-700">{slot.subStage}</span>
                        {slot.branch && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-slate-700">{slot.branch}</span>
                          </>
                        )}
                      </div>
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-[#B48A1E] shrink-0" />
                        <span>{slot.subject}</span>
                      </h3>
                      {slot.note && (
                        <p className="text-xs sm:text-sm text-slate-600 font-reading">
                          {slot.note}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={onJoinLive}
                      className="min-h-[42px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0F172A] px-4 text-xs font-extrabold text-[#D4AF37] hover:bg-slate-800 whitespace-nowrap shrink-0"
                    >
                      <Radio className="h-3.5 w-3.5" />
                      <span>قاعة البث المباشر</span>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};
