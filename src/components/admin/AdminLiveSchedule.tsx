import React, { useMemo, useState } from 'react';
import {
  CalendarDays,
  Clock,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  X,
  BookOpen,
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { ArabicWeekday, TrackId, WeeklyLiveSlot } from '../../types';
import { ARABIC_WEEKDAYS } from '../../utils/parentReport';
import { SecurityPinModal } from './SecurityPinModal';

export const AdminLiveSchedule: React.FC = () => {
  const { db, getTrackName, addWeeklySlot, updateWeeklySlot, deleteWeeklySlot } = usePlatform();

  const defaultTrack = db.tracks[1] ?? db.tracks[0];
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [dayOfWeek, setDayOfWeek] = useState<ArabicWeekday>('السبت');
  const [timeLabel, setTimeLabel] = useState('08:00 مساءً');
  const [track, setTrack] = useState<TrackId>(defaultTrack?.id ?? 'vocational');
  const [subStage, setSubStage] = useState<string>(defaultTrack?.subStages[0] ?? 'جميع الصفوف');
  const [branch, setBranch] = useState<string>('جميع الفروع');
  const [subject, setSubject] = useState<string>(defaultTrack?.subjects?.[0] ?? '');
  const [note, setNote] = useState('');

  const [filterTrack, setFilterTrack] = useState<'all' | TrackId>('all');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<WeeklyLiveSlot | null>(null);

  const selectedTrackObj = db.tracks.find((t) => t.id === track) ?? db.tracks[0];
  const selectedSpecs = selectedTrackObj?.branches ?? selectedTrackObj?.departments ?? [];
  const selectedSubjects = selectedTrackObj?.subjects ?? [];

  const notify = (msg: string) => {
    setFeedback(msg);
    window.setTimeout(() => setFeedback(null), 4500);
  };

  const handleTrackChange = (nextTrackId: TrackId) => {
    setTrack(nextTrackId);
    const obj = db.tracks.find((t) => t.id === nextTrackId);
    if (obj) {
      setSubStage(obj.subStages[0] ?? 'جميع الصفوف');
      setBranch('جميع الفروع');
      setSubject(obj.subjects?.[0] ?? '');
    }
  };

  const resetForm = () => {
    setEditingSlotId(null);
    setDayOfWeek('السبت');
    setTimeLabel('08:00 مساءً');
    const trk = db.tracks[1] ?? db.tracks[0];
    setTrack(trk?.id ?? 'vocational');
    setSubStage(trk?.subStages[0] ?? 'جميع الصفوف');
    setBranch('جميع الفروع');
    setSubject(trk?.subjects?.[0] ?? '');
    setNote('');
    setFormError(null);
  };

  const handleEditSlot = (slot: WeeklyLiveSlot) => {
    setEditingSlotId(slot.id);
    setDayOfWeek(slot.dayOfWeek);
    setTimeLabel(slot.timeLabel);
    setTrack(slot.track);
    setSubStage(slot.subStage || 'جميع الصفوف');
    setBranch(slot.branch || 'جميع الفروع');
    setSubject(slot.subject);
    setNote(slot.note ?? '');
    setFormError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!timeLabel.trim()) {
      setFormError('يرجى تحديد ساعة وموعد البث المباشر.');
      return;
    }
    if (!subject.trim()) {
      setFormError('يرجى اختيار أو كتابة اسم المادة الدراسية.');
      return;
    }

    const payload = {
      dayOfWeek,
      timeLabel,
      track,
      subStage,
      branch: selectedSpecs.length > 0 ? branch : undefined,
      subject,
      note,
    };

    if (editingSlotId) {
      updateWeeklySlot(editingSlotId, payload);
      notify(`تم تعديل موعد بث «${subject.trim()}» ليوم ${dayOfWeek} بنجاح.`);
      resetForm();
    } else {
      addWeeklySlot(payload);
      notify(`تمت إضافة موعد بث «${subject.trim()}» (${dayOfWeek} · ${timeLabel.trim()}) للجدول الأسبوعي.`);
      resetForm();
    }
  };

  const groupedByDay = useMemo(() => {
    const filtered =
      filterTrack === 'all'
        ? db.weeklySchedule
        : db.weeklySchedule.filter((s) => s.track === filterTrack);

    return ARABIC_WEEKDAYS.map((day) => ({
      day,
      slots: filtered.filter((s) => s.dayOfWeek === day),
    })).filter((g) => g.slots.length > 0);
  }, [db.weeklySchedule, filterTrack]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
          إدارة جدول البث الأسبوعي (Weekly Live Schedule)
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          حدّدي مواعيد البث الأسبوعية لكل مرحلة وصف وفرع ومادة، وستظهر تلقائياً لكل طالب حسب مرحلته فقط.
        </p>
      </div>

      {feedback && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs sm:text-sm font-semibold text-emerald-900"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Add / Edit Schedule Slot Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-6 space-y-4"
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-[#B48A1E]" />
            <h2 className="text-base font-extrabold text-slate-900">
              {editingSlotId ? 'تعديل موعد بث أسبوعي' : 'إضافة موعد بث أسبوعي جديد'}
            </h2>
          </div>
          {editingSlotId && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900"
            >
              <X className="h-3.5 w-3.5" />
              <span>إلغاء التعديل</span>
            </button>
          )}
        </div>

        {formError && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-xs font-bold text-red-800">
            {formError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">اليوم</label>
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(e.target.value as ArabicWeekday)}
              className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 focus:border-[#0F172A] focus:outline-none"
            >
              {ARABIC_WEEKDAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">الساعة (توقيت بغداد)</label>
            <input
              type="text"
              required
              value={timeLabel}
              onChange={(e) => setTimeLabel(e.target.value)}
              placeholder="مثال: 08:00 مساءً"
              className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-bold text-slate-900 focus:border-[#0F172A] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">المرحلة الدراسية</label>
            <select
              value={track}
              onChange={(e) => handleTrackChange(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 focus:border-[#0F172A] focus:outline-none"
            >
              {db.tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">الصف / المرحلة الفرعية</label>
            <select
              value={subStage}
              onChange={(e) => setSubStage(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 focus:border-[#0F172A] focus:outline-none"
            >
              <option value="جميع الصفوف">جميع الصفوف في هذه المرحلة</option>
              {(selectedTrackObj?.subStages ?? []).map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>

          {selectedSpecs.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {selectedTrackObj?.specializationLabel || 'الفرع / القسم'}
              </label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 focus:border-[#0F172A] focus:outline-none"
              >
                <option value="جميع الفروع">جميع الفروع والأقسام</option>
                {selectedSpecs.map((sp) => (
                  <option key={sp} value={sp}>
                    {sp}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">المادة الدراسية</label>
            <input
              type="text"
              list="schedule-track-subjects"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="اختاري مادة أو اكتبيها يدوياً"
              className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-bold text-slate-900 focus:border-[#0F172A] focus:outline-none"
            />
            <datalist id="schedule-track-subjects">
              {selectedSubjects.map((sub) => (
                <option key={sub} value={sub} />
              ))}
            </datalist>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            ملاحظة أو عنوان الموضوع (اختياري)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="مثال: مراجعة الفصل الثالث وحل نماذج وزارية مباشرة"
            className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-[#0F172A] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="submit"
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-[#0F172A] px-5 text-sm font-extrabold text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4 text-[#D4AF37]" />
            <span>{editingSlotId ? 'حفظ التعديلات' : 'إضافة إلى جدول البث'}</span>
          </button>
          {editingSlotId && (
            <button
              type="button"
              onClick={resetForm}
              className="min-h-[44px] rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-600"
            >
              إلغاء
            </button>
          )}
        </div>
      </form>

      {/* Filter & Schedule List */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-extrabold text-slate-900 tabular-nums">
            المواعيد المجدولة ({db.weeklySchedule.length})
          </h2>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterTrack('all')}
              className={`min-h-[38px] rounded-xl px-3.5 text-xs font-bold transition-colors whitespace-nowrap ${
                filterTrack === 'all'
                  ? 'bg-[#0F172A] text-[#D4AF37]'
                  : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-400'
              }`}
            >
              جميع المراحل
            </button>
            {db.tracks.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilterTrack(t.id)}
                className={`min-h-[38px] rounded-xl px-3.5 text-xs font-bold transition-colors whitespace-nowrap ${
                  filterTrack === t.id
                    ? 'bg-[#0F172A] text-[#D4AF37]'
                    : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-400'
                }`}
              >
                {t.shortLabel || t.label}
              </button>
            ))}
          </div>
        </div>

        {groupedByDay.length === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center text-xs text-slate-500">
            لا توجد مواعيد بث مجدولة لهذه المرحلة حالياً. يمكنكِ إضافة أول موعد من النموذج أعلاه.
          </div>
        ) : (
          <div className="space-y-4">
            {groupedByDay.map(({ day, slots }) => (
              <section
                key={day}
                className="rounded-2xl bg-white border border-slate-200 overflow-hidden"
              >
                <div className="bg-[#0F172A] text-white px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-[#D4AF37]" />
                    <h3 className="text-sm font-extrabold">يوم {day}</h3>
                  </div>
                  <span className="text-xs text-amber-300 tabular-nums">{slots.length} مواعيد</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {slots.map((slot) => (
                    <div
                      key={slot.id}
                      className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="inline-flex items-center gap-1 font-extrabold text-[#B48A1E] tabular-nums">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{slot.timeLabel}</span>
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="font-bold text-slate-700">
                            {getTrackName(slot.track)}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="text-slate-600">{slot.subStage}</span>
                          {slot.branch && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span className="font-semibold text-[#0F172A]">{slot.branch}</span>
                            </>
                          )}
                        </div>
                        <p className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                          <BookOpen className="h-4 w-4 text-[#B48A1E] shrink-0" />
                          <span>{slot.subject}</span>
                        </p>
                        {slot.note && (
                          <p className="text-xs text-slate-500 font-reading">{slot.note}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditSlot(slot)}
                          className="min-h-[36px] inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-[#0F172A]"
                        >
                          <Pencil className="h-3.5 w-3.5 text-[#B48A1E]" />
                          <span>تعديل</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDelete(slot)}
                          className="min-h-[36px] inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 hover:bg-red-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>حذف</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <SecurityPinModal
        isOpen={Boolean(pendingDelete)}
        title="حذف موعد من جدول البث الأسبوعي"
        itemLabel={
          pendingDelete
            ? `${pendingDelete.dayOfWeek} (${pendingDelete.timeLabel}) — ${pendingDelete.subject}`
            : ''
        }
        warningDetail="سيتم إزالة هذا الموعد من جدول البث الأسبوعي لدى الطلبة فوراً."
        onConfirm={() => {
          if (!pendingDelete) return;
          deleteWeeklySlot(pendingDelete.id);
          notify(`تم حذف موعد بث «${pendingDelete.subject}» بنجاح.`);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
};
