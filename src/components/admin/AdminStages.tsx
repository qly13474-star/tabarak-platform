import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  CheckCircle2,
  GraduationCap,
  FolderTree,
  BookOpen,
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { TrackOption } from '../../types';
import { SecurityPinModal } from './SecurityPinModal';

interface PendingDeleteAction {
  title: string;
  itemLabel: string;
  warningDetail: string;
  onConfirm: () => void;
}

export const AdminStages: React.FC = () => {
  const { db, addTrack, updateTrack, deleteTrack } = usePlatform();

  // Create New Stage Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newStageLabel, setNewStageLabel] = useState('');
  const [newStageDesc, setNewStageDesc] = useState('');
  const [newStageClasses, setNewStageClasses] = useState('');
  const [newStageSpecsLabel, setNewStageSpecsLabel] = useState('التخصص / القسم');
  const [newStageSpecs, setNewStageSpecs] = useState('');
  const [newStageSubjects, setNewStageSubjects] = useState('');

  // Inline Edit Stage Header
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editTrackLabel, setEditTrackLabel] = useState('');
  const [editTrackDesc, setEditTrackDesc] = useState('');

  // Quick-add class / branch / subject inputs per track
  const [newClassDrafts, setNewClassDrafts] = useState<Record<string, string>>({});
  const [newSpecDrafts, setNewSpecDrafts] = useState<Record<string, string>>({});
  const [newSubjectDrafts, setNewSubjectDrafts] = useState<Record<string, string>>({});

  // Inline rename of a specific class, spec, or subject
  const [editingItem, setEditingItem] = useState<{
    trackId: string;
    kind: 'subStage' | 'spec' | 'subject';
    index: number;
    value: string;
  } | null>(null);

  // Feedback toast & Security PIN Delete Modal
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDeleteAction | null>(null);

  const notify = (msg: string) => {
    setFeedback(msg);
    window.setTimeout(() => setFeedback(null), 4500);
  };

  const getTrackSpecs = (track: TrackOption): { key: 'branches' | 'departments'; list: string[]; label: string } => {
    if (track.id === 'university' || (track.departments && !track.branches)) {
      return {
        key: 'departments',
        list: track.departments ?? [],
        label: track.specializationLabel || 'الأقسام الجامعية',
      };
    }
    return {
      key: 'branches',
      list: track.branches ?? [],
      label: track.specializationLabel || (track.id === 'vocational' ? 'الفروع المهنية' : 'الفروع / التخصصات'),
    };
  };

  const handleCreateTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageLabel.trim()) return;
    const parsedClasses = newStageClasses
      .split(/[،,\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const parsedSpecs = newStageSpecs
      .split(/[،,\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const parsedSubjects = newStageSubjects
      .split(/[،,\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const created = addTrack({
      label: newStageLabel,
      shortLabel: newStageLabel,
      description: newStageDesc,
      subStages: parsedClasses.length > 0 ? parsedClasses : ['الصف الأول'],
      branches: parsedSpecs.length > 0 ? parsedSpecs : undefined,
      subjects: parsedSubjects,
      specializationLabel: parsedSpecs.length > 0 ? newStageSpecsLabel : undefined,
    });

    setNewStageLabel('');
    setNewStageDesc('');
    setNewStageClasses('');
    setNewStageSpecs('');
    setNewStageSubjects('');
    setShowCreateForm(false);
    notify(
      `تمت إضافة المرحلة الدراسية «${created.label}» بنجاح وستظهر فوراً في تسجيل الطلاب والدورات والكوزات وجدول البث.`
    );
  };

  const handleSaveTrackHeader = (trackId: string) => {
    if (!editTrackLabel.trim()) return;
    updateTrack(trackId, {
      label: editTrackLabel.trim(),
      shortLabel: editTrackLabel.trim(),
      description: editTrackDesc.trim(),
    });
    setEditingTrackId(null);
    notify('تم تحديث بيانات المرحلة الدراسية بنجاح.');
  };

  const handleAddClass = (track: TrackOption) => {
    const val = (newClassDrafts[track.id] ?? '').trim();
    if (!val) return;
    if (track.subStages.includes(val)) {
      notify('هذا الصف موجود مسبقاً ضمن هذه المرحلة.');
      return;
    }
    updateTrack(track.id, { subStages: [...track.subStages, val] });
    setNewClassDrafts((prev) => ({ ...prev, [track.id]: '' }));
    notify(`تمت إضافة الصف «${val}» إلى «${track.label}» تلقائياً.`);
  };

  const handleAddSpec = (track: TrackOption) => {
    const val = (newSpecDrafts[track.id] ?? '').trim();
    if (!val) return;
    const specInfo = getTrackSpecs(track);
    if (specInfo.list.includes(val)) {
      notify('هذا الفرع / القسم موجود مسبقاً ضمن هذه المرحلة.');
      return;
    }
    updateTrack(track.id, {
      [specInfo.key]: [...specInfo.list, val],
      specializationLabel: track.specializationLabel || specInfo.label,
    });
    setNewSpecDrafts((prev) => ({ ...prev, [track.id]: '' }));
    notify(`تمت إضافة «${val}» إلى «${track.label}» وسيظهر فوراً للطلاب.`);
  };

  const handleAddSubject = (track: TrackOption) => {
    const val = (newSubjectDrafts[track.id] ?? '').trim();
    if (!val) return;
    const currentSubjects = track.subjects ?? [];
    if (currentSubjects.includes(val)) {
      notify('هذه المادة مضافة مسبقاً ضمن هذه المرحلة.');
      return;
    }
    updateTrack(track.id, {
      subjects: [...currentSubjects, val],
    });
    setNewSubjectDrafts((prev) => ({ ...prev, [track.id]: '' }));
    notify(`تمت إضافة المادة «${val}» إلى «${track.label}» وستظهر فوراً في جميع القوائم.`);
  };

  const handleSaveInlineRename = () => {
    if (!editingItem) return;
    const cleanVal = editingItem.value.trim();
    if (!cleanVal) return;
    const track = db.tracks.find((t) => t.id === editingItem.trackId);
    if (!track) return;

    if (editingItem.kind === 'subStage') {
      const next = track.subStages.map((s, i) => (i === editingItem.index ? cleanVal : s));
      updateTrack(track.id, { subStages: next });
      notify(`تم تعديل اسم الصف إلى «${cleanVal}» بنجاح.`);
    } else if (editingItem.kind === 'subject') {
      const currentSubjects = track.subjects ?? [];
      const next = currentSubjects.map((s, i) => (i === editingItem.index ? cleanVal : s));
      updateTrack(track.id, { subjects: next });
      notify(`تم تعديل اسم المادة إلى «${cleanVal}» بنجاح.`);
    } else {
      const specInfo = getTrackSpecs(track);
      const next = specInfo.list.map((s, i) => (i === editingItem.index ? cleanVal : s));
      updateTrack(track.id, { [specInfo.key]: next });
      notify(`تم تعديل اسم القسم/الفرع إلى «${cleanVal}» بنجاح.`);
    }
    setEditingItem(null);
  };

  const requestDeleteTrack = (track: TrackOption) => {
    if (db.tracks.length <= 1) {
      notify('يجب إبقاء مرحلة دراسية واحدة على الأقل في المنصة.');
      return;
    }
    setPendingDelete({
      title: 'حذف مرحلة دراسية كاملة',
      itemLabel: track.label,
      warningDetail:
        'سيتم إزالة هذه المرحلة من شاشة تسجيل الطلاب الجدد وفلاتر الدورات. تأكدي من عدم وجود حاجة لها قبل المتابعة.',
      onConfirm: () => {
        deleteTrack(track.id);
        setPendingDelete(null);
        notify(`تم حذف المرحلة «${track.label}» بنجاح.`);
      },
    });
  };

  const requestDeleteClass = (track: TrackOption, classIndex: number, className: string) => {
    if (track.subStages.length <= 1) {
      notify('يجب إبقاء صف واحد على الأقل داخل المرحلة الدراسية.');
      return;
    }
    setPendingDelete({
      title: 'حذف صف دراسي',
      itemLabel: `${className} (${track.label})`,
      warningDetail: 'سيتم حذف هذا الصف من قائمة الصفوف المتاحة لتسجيل الطلاب الجدد وإنشاء الدورات.',
      onConfirm: () => {
        updateTrack(track.id, {
          subStages: track.subStages.filter((_, idx) => idx !== classIndex),
        });
        setPendingDelete(null);
        notify(`تم حذف الصف «${className}» بنجاح.`);
      },
    });
  };

  const requestDeleteSpec = (track: TrackOption, specIndex: number, specName: string) => {
    const specInfo = getTrackSpecs(track);
    setPendingDelete({
      title: 'حذف فرع / قسم دراسي',
      itemLabel: `${specName} (${track.label})`,
      warningDetail: 'سيتم حذف هذا الفرع / القسم من شاشة التسجيل وفلاتر الدورات فوراً.',
      onConfirm: () => {
        const nextList = specInfo.list.filter((_, idx) => idx !== specIndex);
        updateTrack(track.id, {
          [specInfo.key]: nextList.length > 0 ? nextList : undefined,
        });
        setPendingDelete(null);
        notify(`تم حذف «${specName}» بنجاح.`);
      },
    });
  };

  const requestDeleteSubject = (track: TrackOption, subjectIndex: number, subjectName: string) => {
    const currentSubjects = track.subjects ?? [];
    setPendingDelete({
      title: 'حذف مادة دراسية',
      itemLabel: `${subjectName} (${track.label})`,
      warningDetail:
        'سيتم حذف هذه المادة من قوائم المواد في الدورات والكوزات والتحاضير وجدول البث.',
      onConfirm: () => {
        const nextList = currentSubjects.filter((_, idx) => idx !== subjectIndex);
        updateTrack(track.id, { subjects: nextList });
        setPendingDelete(null);
        notify(`تم حذف المادة «${subjectName}» بنجاح.`);
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">
            إدارة المراحل والأقسام والمواد الدراسية
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            تحكّمي يدوياً بنسبة 100% بالمراحل والصفوف والفروع المهنية والأقسام الجامعية والمواد الدراسية، لتتحدّث فوراً في جميع أنحاء المنصة.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateForm((v) => !v)}
          className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 shadow-[0_8px_22px_-6px_rgba(147,51,234,0.65)] px-4 text-xs sm:text-sm font-extrabold text-white hover:brightness-110 whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4 text-purple-300" />
          <span>{showCreateForm ? 'إغلاق النموذج' : 'إضافة مرحلة دراسية جديدة'}</span>
        </button>
      </div>

      {feedback && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-400/35 px-4 py-3 text-xs sm:text-sm font-semibold text-emerald-200"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Create New Stage Form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateTrack}
          className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border-2 border-purple-500/25 p-5 sm:p-6 space-y-4"
        >
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-purple-300" />
            <h2 className="text-base font-extrabold text-white">
              إنشاء مرحلة دراسية / مسار جديد
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                اسم المرحلة الدراسية
              </label>
              <input
                type="text"
                required
                value={newStageLabel}
                onChange={(e) => setNewStageLabel(e.target.value)}
                placeholder="مثال: الإعدادية العام (العلمي والأدبي)"
                className="w-full min-h-[44px] rounded-xl border border-purple-500/25 px-3.5 text-sm focus:border-purple-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                وصف مختصر للمرحلة
              </label>
              <input
                type="text"
                value={newStageDesc}
                onChange={(e) => setNewStageDesc(e.target.value)}
                placeholder="مثال: الرابع والخامس والسادس العلمي والأدبي"
                className="w-full min-h-[44px] rounded-xl border border-purple-500/25 px-3.5 text-sm focus:border-purple-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                الصفوف الدراسية (افصلي بينها بفاصلة)
              </label>
              <input
                type="text"
                required
                value={newStageClasses}
                onChange={(e) => setNewStageClasses(e.target.value)}
                placeholder="الرابع الإعدادي، الخامس الإعدادي، السادس الإعدادي"
                className="w-full min-h-[44px] rounded-xl border border-purple-500/25 px-3.5 text-sm focus:border-purple-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                الفروع / الأقسام (اختياري — افصلي بفاصلة)
              </label>
              <input
                type="text"
                value={newStageSpecs}
                onChange={(e) => setNewStageSpecs(e.target.value)}
                placeholder="مثال: العلمي، الأدبي (أو اتركيه فارغاً)"
                className="w-full min-h-[44px] rounded-xl border border-purple-500/25 px-3.5 text-sm focus:border-purple-400 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                المواد الدراسية لهذه المرحلة (اختياري — افصلي بفاصلة)
              </label>
              <input
                type="text"
                value={newStageSubjects}
                onChange={(e) => setNewStageSubjects(e.target.value)}
                placeholder="مثال: اللغة الإنجليزية، الرياضيات، الفيزياء، الحاسوب..."
                className="w-full min-h-[44px] rounded-xl border border-purple-500/25 px-3.5 text-sm focus:border-purple-400 focus:outline-none"
              />
            </div>

            {newStageSpecs.trim() && (
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  تسمية حقل التخصص في التسجيل
                </label>
                <input
                  type="text"
                  value={newStageSpecsLabel}
                  onChange={(e) => setNewStageSpecsLabel(e.target.value)}
                  placeholder="الفرع / القسم"
                  className="w-full min-h-[44px] rounded-xl border border-purple-500/25 px-3.5 text-sm focus:border-purple-400 focus:outline-none"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              className="min-h-[44px] rounded-xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 shadow-[0_8px_22px_-6px_rgba(147,51,234,0.65)] px-5 text-sm font-extrabold text-white hover:brightness-110"
            >
              حفظ وإضافة المرحلة
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="min-h-[44px] rounded-xl border border-purple-500/25 px-4 text-sm font-semibold text-slate-300"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      {/* Existing Stages Cards */}
      <div className="space-y-5">
        {db.tracks.map((track) => {
          const specInfo = getTrackSpecs(track);
          const isEditingHeader = editingTrackId === track.id;
          const studentsInTrack = db.users.filter(
            (u) => u.role === 'student' && u.track === track.id
          ).length;
          const coursesInTrack = db.courses.filter((c) => c.track === track.id).length;

          return (
            <section
              key={track.id}
              className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 overflow-hidden"
            >
              {/* Stage Header */}
              <div className="bg-white/[0.04] border-b border-purple-500/20 px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                {isEditingHeader ? (
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      value={editTrackLabel}
                      onChange={(e) => setEditTrackLabel(e.target.value)}
                      className="min-h-[40px] rounded-xl border border-purple-500/25 bg-white/[0.045] backdrop-blur-xl px-3 text-sm font-bold text-white"
                    />
                    <input
                      type="text"
                      value={editTrackDesc}
                      onChange={(e) => setEditTrackDesc(e.target.value)}
                      className="min-h-[40px] rounded-xl border border-purple-500/25 bg-white/[0.045] backdrop-blur-xl px-3 text-xs text-slate-200"
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-purple-300" />
                      <h2 className="text-base font-extrabold text-white">{track.label}</h2>
                      <span className="text-xs text-slate-400 tabular-nums">
                        · {studentsInTrack} طالب · {coursesInTrack} دورات
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{track.description}</p>
                  </div>
                )}

                <div className="flex items-center gap-2 shrink-0">
                  {isEditingHeader ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSaveTrackHeader(track.id)}
                        className="min-h-[36px] inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>حفظ</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingTrackId(null)}
                        className="min-h-[36px] inline-flex items-center gap-1 rounded-lg border border-purple-500/25 bg-white/[0.045] backdrop-blur-xl px-3 text-xs font-bold text-slate-300"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>إلغاء</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTrackId(track.id);
                          setEditTrackLabel(track.label);
                          setEditTrackDesc(track.description);
                        }}
                        className="min-h-[36px] inline-flex items-center gap-1 rounded-lg border border-purple-500/20 bg-white/[0.045] backdrop-blur-xl px-3 text-xs font-bold text-slate-200 hover:border-purple-400/60"
                      >
                        <Pencil className="h-3.5 w-3.5 text-purple-300" />
                        <span>تعديل الاسم</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDeleteTrack(track)}
                        className="min-h-[36px] inline-flex items-center gap-1 rounded-lg border border-rose-400/35 bg-rose-500/15 px-3 text-xs font-bold text-rose-300 hover:bg-rose-500/25"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>حذف المرحلة</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Stage Body: Classes, Branches/Departments & Subjects */}
              <div className="p-5 grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Sub-Stages / Classes Column */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold text-slate-100 flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-purple-300" />
                      <span>الصفوف والمراحل الفرعية ({track.subStages.length})</span>
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {track.subStages.map((cls, idx) => {
                      const isEditingThis =
                        editingItem?.trackId === track.id &&
                        editingItem.kind === 'subStage' &&
                        editingItem.index === idx;

                      return (
                        <div
                          key={`${cls}-${idx}`}
                          className="flex items-center justify-between gap-2 rounded-xl border border-purple-500/20 bg-white/[0.035] px-3.5 py-2.5"
                        >
                          {isEditingThis ? (
                            <div className="flex-1 flex items-center gap-2">
                              <input
                                type="text"
                                value={editingItem.value}
                                onChange={(e) =>
                                  setEditingItem({ ...editingItem, value: e.target.value })
                                }
                                className="flex-1 min-h-[34px] rounded-lg border border-purple-500/25 bg-white/[0.045] backdrop-blur-xl px-2.5 text-xs font-bold text-white"
                              />
                              <button
                                type="button"
                                onClick={handleSaveInlineRename}
                                className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-emerald-600 text-white"
                                aria-label="حفظ"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingItem(null)}
                                className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-purple-500/25 bg-white/[0.045] backdrop-blur-xl text-slate-300"
                                aria-label="إلغاء"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="text-xs sm:text-sm font-bold text-white">
                                {cls}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingItem({
                                      trackId: track.id,
                                      kind: 'subStage',
                                      index: idx,
                                      value: cls,
                                    })
                                  }
                                  aria-label={`تعديل ${cls}`}
                                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:bg-white/15 hover:text-white"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => requestDeleteClass(track, idx, cls)}
                                  aria-label={`حذف ${cls}`}
                                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-rose-400 hover:bg-rose-500/20"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Quick Add Class Input */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={newClassDrafts[track.id] ?? ''}
                      onChange={(e) =>
                        setNewClassDrafts((prev) => ({ ...prev, [track.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddClass(track);
                        }
                      }}
                      placeholder="أضيفي صفاً جديداً (مثلاً: الثالث متوسط — متميزين)"
                      className="flex-1 min-h-[40px] rounded-xl border border-purple-500/25 bg-[#110D1F]/85 px-3 text-xs text-white focus:border-purple-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddClass(track)}
                      className="min-h-[40px] inline-flex items-center gap-1 rounded-xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 shadow-[0_8px_22px_-6px_rgba(147,51,234,0.65)] px-3.5 text-xs font-bold text-white hover:brightness-110 whitespace-nowrap"
                    >
                      <Plus className="h-3.5 w-3.5 text-purple-300" />
                      <span>إضافة صف</span>
                    </button>
                  </div>
                </div>

                {/* Branches / Departments Column */}
                <div className="space-y-3 lg:border-r lg:border-slate-100 lg:pr-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold text-slate-100 flex items-center gap-1.5">
                      <FolderTree className="h-3.5 w-3.5 text-purple-300" />
                      <span>
                        {specInfo.label} ({specInfo.list.length})
                      </span>
                    </h3>
                  </div>

                  {specInfo.list.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-purple-500/20 bg-white/[0.035] p-3.5 text-xs text-slate-400">
                      لا توجد فروع أو أقسام فرعية لهذه المرحلة حالياً. يمكنكِ إضافة تخصص أو قسم في أي وقت بالأسفل.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {specInfo.list.map((spec, idx) => {
                        const isEditingThis =
                          editingItem?.trackId === track.id &&
                          editingItem.kind === 'spec' &&
                          editingItem.index === idx;

                        return (
                          <div
                            key={`${spec}-${idx}`}
                            className="flex items-center justify-between gap-2 rounded-xl border border-purple-500/20 bg-white/[0.035] px-3.5 py-2.5"
                          >
                            {isEditingThis ? (
                              <div className="flex-1 flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editingItem.value}
                                  onChange={(e) =>
                                    setEditingItem({ ...editingItem, value: e.target.value })
                                  }
                                  className="flex-1 min-h-[34px] rounded-lg border border-purple-500/25 bg-white/[0.045] backdrop-blur-xl px-2.5 text-xs font-bold text-white"
                                />
                                <button
                                  type="button"
                                  onClick={handleSaveInlineRename}
                                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-emerald-600 text-white"
                                  aria-label="حفظ"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingItem(null)}
                                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-purple-500/25 bg-white/[0.045] backdrop-blur-xl text-slate-300"
                                  aria-label="إلغاء"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <span className="text-xs sm:text-sm font-bold text-white">
                                  {spec}
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditingItem({
                                        trackId: track.id,
                                        kind: 'spec',
                                        index: idx,
                                        value: spec,
                                      })
                                    }
                                    aria-label={`تعديل ${spec}`}
                                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:bg-white/15 hover:text-white"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => requestDeleteSpec(track, idx, spec)}
                                    aria-label={`حذف ${spec}`}
                                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-rose-400 hover:bg-rose-500/20"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Quick Add Branch / Department Input */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={newSpecDrafts[track.id] ?? ''}
                      onChange={(e) =>
                        setNewSpecDrafts((prev) => ({ ...prev, [track.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSpec(track);
                        }
                      }}
                      placeholder={
                        track.id === 'university'
                          ? 'أضيفي قسماً جامعياً (مثلاً: هندسة البرمجيات)'
                          : 'أضيفي فرعاً أو تخصصاً (مثلاً: الفرع الزراعي)'
                      }
                      className="flex-1 min-h-[40px] rounded-xl border border-purple-500/25 bg-[#110D1F]/85 px-3 text-xs text-white focus:border-purple-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddSpec(track)}
                      className="min-h-[40px] inline-flex items-center gap-1 rounded-xl border border-purple-400 bg-white/[0.045] backdrop-blur-xl px-3.5 text-xs font-bold text-white hover:bg-white/[0.08] whitespace-nowrap"
                    >
                      <Plus className="h-3.5 w-3.5 text-purple-300" />
                      <span>إضافة قسم/فرع</span>
                    </button>
                  </div>
                </div>

                {/* Subjects Column */}
                <div className="space-y-3 xl:border-r xl:border-slate-100 xl:pr-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold text-slate-100 flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-purple-300" />
                      <span>المواد الدراسية ({(track.subjects ?? []).length})</span>
                    </h3>
                  </div>

                  {(track.subjects ?? []).length === 0 ? (
                    <p className="rounded-xl border border-dashed border-purple-500/20 bg-white/[0.035] p-3.5 text-xs text-slate-400">
                      لم تُضَف مواد لهذه المرحلة بعد. أضيفي أي مادة بالأسفل لتظهر في الدورات والكوزات وجدول البث والمشتريات.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {(track.subjects ?? []).map((subj, idx) => {
                        const isEditingThis =
                          editingItem?.trackId === track.id &&
                          editingItem.kind === 'subject' &&
                          editingItem.index === idx;

                        return (
                          <div
                            key={`${subj}-${idx}`}
                            className="flex items-center justify-between gap-2 rounded-xl border border-purple-500/20 bg-white/[0.035] px-3.5 py-2.5"
                          >
                            {isEditingThis ? (
                              <div className="flex-1 flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editingItem.value}
                                  onChange={(e) =>
                                    setEditingItem({ ...editingItem, value: e.target.value })
                                  }
                                  className="flex-1 min-h-[34px] rounded-lg border border-purple-500/25 bg-white/[0.045] backdrop-blur-xl px-2.5 text-xs font-bold text-white"
                                />
                                <button
                                  type="button"
                                  onClick={handleSaveInlineRename}
                                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-emerald-600 text-white"
                                  aria-label="حفظ"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingItem(null)}
                                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-purple-500/25 bg-white/[0.045] backdrop-blur-xl text-slate-300"
                                  aria-label="إلغاء"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <span className="text-xs sm:text-sm font-bold text-white">
                                  {subj}
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditingItem({
                                        trackId: track.id,
                                        kind: 'subject',
                                        index: idx,
                                        value: subj,
                                      })
                                    }
                                    aria-label={`تعديل ${subj}`}
                                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:bg-white/15 hover:text-white"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => requestDeleteSubject(track, idx, subj)}
                                    aria-label={`حذف ${subj}`}
                                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-rose-400 hover:bg-rose-500/20"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Quick Add Subject Input */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={newSubjectDrafts[track.id] ?? ''}
                      onChange={(e) =>
                        setNewSubjectDrafts((prev) => ({ ...prev, [track.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSubject(track);
                        }
                      }}
                      placeholder="أضيفي مادة (مثلاً: اللغة الإنجليزية، الرياضيات...)"
                      className="flex-1 min-h-[40px] rounded-xl border border-purple-500/25 bg-[#110D1F]/85 px-3 text-xs text-white focus:border-purple-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddSubject(track)}
                      className="min-h-[40px] inline-flex items-center gap-1 rounded-xl bg-amber-500/15 border border-amber-400/40 px-3.5 text-xs font-extrabold text-white hover:bg-amber-500/25 whitespace-nowrap"
                    >
                      <Plus className="h-3.5 w-3.5 text-purple-300" />
                      <span>إضافة مادة</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* Security PIN Confirmation Modal for all deletions */}
      <SecurityPinModal
        isOpen={Boolean(pendingDelete)}
        title={pendingDelete?.title ?? 'تأكيد الحذف'}
        itemLabel={pendingDelete?.itemLabel ?? ''}
        warningDetail={pendingDelete?.warningDetail}
        onConfirm={() => pendingDelete?.onConfirm()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
};
