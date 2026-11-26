import React, { useState } from 'react';
import {
  Plus,
  Video,
  FileText,
  BookOpen,
  CheckCircle2,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Tag,
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { Course, Lesson, TrackId } from '../../types';
import { formatIqd } from '../../utils/subscription';
import { SecurityPinModal } from './SecurityPinModal';

interface PendingDelete {
  title: string;
  itemLabel: string;
  warningDetail: string;
  onConfirm: () => void;
}

export const AdminCourses: React.FC = () => {
  const {
    db,
    getTrackName,
    addNewCourse,
    updateCourse,
    deleteCourse,
    addLessonToCourse,
    updateLessonInCourse,
    deleteLessonFromCourse,
    addPdfToCourse,
  } = usePlatform();

  const defaultTrack = db.tracks[1] ?? db.tracks[0];
  const [trackFilter, setTrackFilter] = useState<'all' | 'vocational6' | TrackId>('all');
  const [activeForm, setActiveForm] = useState<'none' | 'course' | 'lesson' | 'pdf'>('none');
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(db.courses[0]?.id ?? null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  // Course Form State (Create or Edit)
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseSubtitle, setCourseSubtitle] = useState('');
  const [courseTrack, setCourseTrack] = useState<TrackId>(defaultTrack?.id ?? 'vocational');
  const [courseSubStage, setCourseSubStage] = useState(defaultTrack?.subStages[0] ?? '');
  const [courseBranch, setCourseBranch] = useState(
    defaultTrack?.branches?.[0] ?? defaultTrack?.departments?.[0] ?? ''
  );
  const [courseSubject, setCourseSubject] = useState('');
  const [courseHours, setCourseHours] = useState('24 ساعة مسجلة');
  const [coursePriceIqd, setCoursePriceIqd] = useState<number>(50000);
  const [courseDesc, setCourseDesc] = useState('');

  // Lesson Form State (Create or Edit)
  const [targetCourseId, setTargetCourseId] = useState(db.courses[0]?.id ?? '');
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDuration, setLessonDuration] = useState('35:00');
  const [lessonVideoUrl, setLessonVideoUrl] = useState('');
  const [lessonPriceIqd, setLessonPriceIqd] = useState<number>(10000);
  const [lessonDesc, setLessonDesc] = useState('');

  // Add PDF State
  const [pdfTitle, setPdfTitle] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfPages, setPdfPages] = useState(12);

  const selectedTrackOption =
    db.tracks.find((t) => t.id === courseTrack) ?? db.tracks[0];
  const selectedTrackSpecs =
    selectedTrackOption?.branches ?? selectedTrackOption?.departments ?? [];
  const selectedTrackSpecLabel =
    selectedTrackOption?.specializationLabel ||
    (selectedTrackOption?.id === 'university' ? 'القسم الجامعي' : 'الفرع / التخصص');

  const notify = (msg: string) => {
    setFeedback(msg);
    window.setTimeout(() => setFeedback(null), 4500);
  };

  const openCreateCourseForm = () => {
    const trk = db.tracks[1] ?? db.tracks[0];
    setEditingCourseId(null);
    setCourseTitle('');
    setCourseSubtitle('');
    setCourseTrack(trk?.id ?? 'vocational');
    setCourseSubStage(trk?.subStages[0] ?? '');
    setCourseBranch(trk?.branches?.[0] ?? trk?.departments?.[0] ?? '');
    setCourseSubject(trk?.subjects?.[0] ?? '');
    setCourseHours('24 ساعة مسجلة');
    setCoursePriceIqd(50000);
    setCourseDesc('');
    setActiveForm('course');
  };

  const openEditCourseForm = (course: Course) => {
    setEditingCourseId(course.id);
    setCourseTitle(course.title);
    setCourseSubtitle(course.subtitle);
    setCourseTrack(course.track);
    setCourseSubStage(course.subStage);
    setCourseBranch(course.branch ?? '');
    setCourseSubject(course.subject ?? '');
    setCourseHours(course.totalHours);
    setCoursePriceIqd(course.priceIqd ?? 0);
    setCourseDesc(course.description);
    setActiveForm('course');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openCreateLessonForm = (courseId?: string) => {
    setEditingLessonId(null);
    if (courseId) setTargetCourseId(courseId);
    setLessonTitle('');
    setLessonDuration('35:00');
    setLessonVideoUrl('');
    setLessonPriceIqd(10000);
    setLessonDesc('');
    setActiveForm('lesson');
  };

  const openEditLessonForm = (courseId: string, lesson: Lesson) => {
    setTargetCourseId(courseId);
    setEditingLessonId(lesson.id);
    setLessonTitle(lesson.title);
    setLessonDuration(lesson.duration);
    setLessonVideoUrl(lesson.videoUrl);
    setLessonPriceIqd(lesson.priceIqd ?? 0);
    setLessonDesc(lesson.description);
    setActiveForm('lesson');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseTitle.trim()) return;
    const safePrice = Math.max(0, Number(coursePriceIqd || 0));

    if (editingCourseId) {
      updateCourse(editingCourseId, {
        title: courseTitle.trim(),
        subtitle: courseSubtitle.trim(),
        track: courseTrack,
        subStage: courseSubStage,
        branch: selectedTrackSpecs.length > 0 ? courseBranch : undefined,
        subject: courseSubject.trim() || undefined,
        description: courseDesc.trim(),
        totalHours: courseHours.trim(),
        priceIqd: safePrice,
      });
      setEditingCourseId(null);
      setActiveForm('none');
      notify(`تم تحديث بيانات وسعر الدورة «${courseTitle.trim()}» بنجاح.`);
    } else {
      const created = addNewCourse({
        title: courseTitle,
        subtitle: courseSubtitle,
        track: courseTrack,
        subStage: courseSubStage,
        branch: selectedTrackSpecs.length > 0 ? courseBranch : undefined,
        subject: courseSubject.trim() || undefined,
        description: courseDesc,
        totalHours: courseHours,
        priceIqd: safePrice,
      });
      setTargetCourseId(created.id);
      setExpandedCourseId(created.id);
      setActiveForm('none');
      notify(`تمت إضافة الدورة الجديدة «${created.title}» بسعر ${safePrice === 0 ? 'مجاني' : formatIqd(safePrice)}.`);
    }
  };

  const handleSaveLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCourseId || !lessonTitle.trim()) return;
    const safePrice = Math.max(0, Number(lessonPriceIqd || 0));

    if (editingLessonId) {
      updateLessonInCourse(targetCourseId, editingLessonId, {
        title: lessonTitle.trim(),
        duration: lessonDuration.trim(),
        videoUrl: lessonVideoUrl.trim(),
        description: lessonDesc.trim(),
        priceIqd: safePrice,
      });
      setEditingLessonId(null);
      setActiveForm('none');
      notify(`تم تحديث المحاضرة «${lessonTitle.trim()}» وسعرها بنجاح.`);
    } else {
      addLessonToCourse(targetCourseId, {
        title: lessonTitle,
        duration: lessonDuration,
        videoUrl: lessonVideoUrl,
        description: lessonDesc,
        priceIqd: safePrice,
      });
      setExpandedCourseId(targetCourseId);
      setLessonTitle('');
      setLessonVideoUrl('');
      setLessonDesc('');
      setActiveForm('none');
      notify('تمت إضافة المحاضرة المسجّلة وتحديد سعرها بنجاح.');
    }
  };

  const handleAddPdf = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCourseId || !pdfTitle.trim()) return;
    addPdfToCourse(targetCourseId, {
      title: pdfTitle,
      fileUrl: pdfUrl,
      pageCount: pdfPages,
    });
    setPdfTitle('');
    setPdfUrl('');
    setActiveForm('none');
    notify('تم رفع رابط الملزمة المحمية (PDF) وإضافتها إلى الدورة بنجاح.');
  };

  const visibleCourses = db.courses.filter((c) => {
    if (trackFilter === 'all') return true;
    if (trackFilter === 'vocational6') {
      return c.track === 'vocational' && c.subStage.includes('السادس المهني');
    }
    return c.track === trackFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            إدارة الدورات والمحاضرات والأسعار
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            أضيفي وعدّلي الدورات والمحاضرات وحدّدي سعر كل دورة أو محاضرة فردية بالدينار العراقي (أو مجانية).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              activeForm === 'course' && !editingCourseId
                ? setActiveForm('none')
                : openCreateCourseForm()
            }
            className="min-h-[42px] inline-flex items-center gap-1.5 rounded-xl bg-[#0F172A] px-4 text-xs font-bold text-white hover:bg-slate-800 whitespace-nowrap"
          >
            <Plus className="h-4 w-4 text-[#D4AF37]" />
            <span>دورة جديدة</span>
          </button>
          <button
            type="button"
            onClick={() =>
              activeForm === 'lesson' && !editingLessonId
                ? setActiveForm('none')
                : openCreateLessonForm()
            }
            className="min-h-[42px] inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 text-xs font-bold text-slate-800 hover:bg-slate-50 whitespace-nowrap"
          >
            <Video className="h-4 w-4 text-[#B48A1E]" />
            <span>إضافة محاضرة</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveForm(activeForm === 'pdf' ? 'none' : 'pdf')}
            className="min-h-[42px] inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 text-xs font-bold text-slate-800 hover:bg-slate-50 whitespace-nowrap"
          >
            <FileText className="h-4 w-4 text-[#B48A1E]" />
            <span>رفع ملزمة PDF</span>
          </button>
        </div>
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

      {/* Course Create / Edit Form with Manual IQD Pricing */}
      {activeForm === 'course' && (
        <form
          onSubmit={handleSaveCourse}
          className="rounded-2xl bg-white border-2 border-[#0F172A]/15 p-6 space-y-4"
        >
          <h2 className="text-base font-extrabold text-slate-900">
            {editingCourseId ? 'تعديل بيانات وسعر الدورة' : 'إضافة دورة تعليمية جديدة'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم الدورة</label>
              <input
                type="text"
                required
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                placeholder="مثال: الفيزياء المبسّطة — الثالث متوسط"
                className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">عنوان فرعي مختصر</label>
              <input
                type="text"
                value={courseSubtitle}
                onChange={(e) => setCourseSubtitle(e.target.value)}
                placeholder="شرح المسائل والقوانين الوزارية"
                className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">المرحلة الدراسية</label>
              <select
                value={courseTrack}
                onChange={(e) => {
                  const next = e.target.value as TrackId;
                  setCourseTrack(next);
                  const opt = db.tracks.find((t) => t.id === next);
                  if (opt) {
                    setCourseSubStage(opt.subStages[0] ?? '');
                    const specs = opt.branches ?? opt.departments ?? [];
                    setCourseBranch(specs[0] ?? '');
                  }
                }}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm"
              >
                {db.tracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">الصف / المرحلة</label>
              <select
                value={courseSubStage}
                onChange={(e) => setCourseSubStage(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm"
              >
                {(selectedTrackOption?.subStages ?? []).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            {selectedTrackSpecs.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {selectedTrackSpecLabel}
                </label>
                <select
                  value={courseBranch}
                  onChange={(e) => setCourseBranch(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm"
                >
                  {selectedTrackSpecs.map((br) => (
                    <option key={br} value={br}>
                      {br}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                المادة الدراسية (من مواد المرحلة أو كتابة يدوية)
              </label>
              <input
                type="text"
                list="admin-course-subjects-list"
                value={courseSubject}
                onChange={(e) => setCourseSubject(e.target.value)}
                placeholder="مثال: الرياضيات، اللغة الإنجليزية، الحاسوب..."
                className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm"
              />
              <datalist id="admin-course-subjects-list">
                {(selectedTrackOption?.subjects ?? []).map((subj) => (
                  <option key={subj} value={subj} />
                ))}
              </datalist>
            </div>

            {/* Manual Course Price in IQD + Free Toggle */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                سعر الدورة الكاملة (بالدينار العراقي — 0 يعني مجانية)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  step={1000}
                  dir="ltr"
                  value={coursePriceIqd}
                  onChange={(e) => setCoursePriceIqd(Math.max(0, Number(e.target.value)))}
                  className="flex-1 min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-left font-mono text-sm font-bold text-slate-900 tabular-nums"
                />
                <button
                  type="button"
                  onClick={() => setCoursePriceIqd(0)}
                  className={`min-h-[44px] rounded-xl border px-3 text-xs font-extrabold whitespace-nowrap ${
                    coursePriceIqd === 0
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-50 text-slate-700 border-slate-300 hover:border-slate-500'
                  }`}
                >
                  مجانية
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">مجموع الساعات</label>
              <input
                type="text"
                value={courseHours}
                onChange={(e) => setCourseHours(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">وصف الدورة</label>
              <input
                type="text"
                value={courseDesc}
                onChange={(e) => setCourseDesc(e.target.value)}
                placeholder="ملخص محتوى الدورة والفصول المغطاة"
                className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              className="min-h-[44px] rounded-xl bg-[#0F172A] px-5 text-sm font-bold text-white hover:bg-slate-800"
            >
              {editingCourseId ? 'حفظ التعديلات' : 'حفظ الدورة الجديدة'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingCourseId(null);
                setActiveForm('none');
              }}
              className="min-h-[44px] rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-600"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      {/* Lesson Create / Edit Form with Manual IQD Pricing */}
      {activeForm === 'lesson' && (
        <form
          onSubmit={handleSaveLesson}
          className="rounded-2xl bg-white border-2 border-[#0F172A]/15 p-6 space-y-4"
        >
          <h2 className="text-base font-extrabold text-slate-900">
            {editingLessonId ? 'تعديل المحاضرة وسعرها الفردي' : 'إضافة محاضرة مسجّلة جديدة'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">الدورة</label>
              <select
                value={targetCourseId}
                disabled={Boolean(editingLessonId)}
                onChange={(e) => setTargetCourseId(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm disabled:bg-slate-100"
              >
                {db.courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">عنوان المحاضرة</label>
              <input
                type="text"
                required
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                placeholder="مثال: المحاضرة 4 — حل المتباينات المركبة"
                className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-sm"
              />
            </div>

            {/* Individual Lesson Price in IQD */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                سعر المحاضرة الفردية (بالدينار العراقي — 0 يعني مجانية)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  step={1000}
                  dir="ltr"
                  value={lessonPriceIqd}
                  onChange={(e) => setLessonPriceIqd(Math.max(0, Number(e.target.value)))}
                  className="flex-1 min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-left font-mono text-sm font-bold text-slate-900 tabular-nums"
                />
                <button
                  type="button"
                  onClick={() => setLessonPriceIqd(0)}
                  className={`min-h-[44px] rounded-xl border px-3 text-xs font-extrabold whitespace-nowrap ${
                    lessonPriceIqd === 0
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-50 text-slate-700 border-slate-300 hover:border-slate-500'
                  }`}
                >
                  مجانية
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">مدة الفيديو</label>
              <input
                type="text"
                dir="ltr"
                value={lessonDuration}
                onChange={(e) => setLessonDuration(e.target.value)}
                placeholder="35:00"
                className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-left font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                رابط الفيديو المحمي (Bunny / Vimeo / HLS)
              </label>
              <input
                type="text"
                dir="ltr"
                value={lessonVideoUrl}
                onChange={(e) => setLessonVideoUrl(e.target.value)}
                placeholder="https://stream.tabarak-academy.iq/lesson-04.m3u8"
                className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-left font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                وصف مختصر للمحاضرة
              </label>
              <input
                type="text"
                value={lessonDesc}
                onChange={(e) => setLessonDesc(e.target.value)}
                placeholder="أهم المواضيع والتمارين المشروحة داخل الدرس"
                className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              className="min-h-[44px] rounded-xl bg-[#0F172A] px-5 text-sm font-bold text-white hover:bg-slate-800"
            >
              {editingLessonId ? 'حفظ تعديلات المحاضرة' : 'إضافة المحاضرة إلى الدورة'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingLessonId(null);
                setActiveForm('none');
              }}
              className="min-h-[44px] rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-600"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      {activeForm === 'pdf' && (
        <form
          onSubmit={handleAddPdf}
          className="rounded-2xl bg-white border border-slate-200 p-6 space-y-4"
        >
          <h2 className="text-base font-extrabold text-slate-900">رفع رابط ملزمة PDF محمية</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">الدورة</label>
              <select
                value={targetCourseId}
                onChange={(e) => setTargetCourseId(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm"
              >
                {db.courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">عنوان الملزمة</label>
              <input
                type="text"
                required
                value={pdfTitle}
                onChange={(e) => setPdfTitle(e.target.value)}
                placeholder="مثال: ملزمة الفصل الثاني — المرشحات الوزارية"
                className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                رابط ملف PDF (Supabase Storage)
              </label>
              <input
                type="url"
                dir="ltr"
                value={pdfUrl}
                onChange={(e) => setPdfUrl(e.target.value)}
                placeholder="https://storage.tabarak-academy.iq/notes/ch2.pdf"
                className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-left font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">عدد الصفحات</label>
              <input
                type="number"
                min={1}
                max={200}
                value={pdfPages}
                onChange={(e) => setPdfPages(Number(e.target.value))}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 font-mono text-sm tabular-nums"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              className="min-h-[44px] rounded-xl bg-[#0F172A] px-5 text-sm font-bold text-white hover:bg-slate-800"
            >
              رفع وإضافة الملزمة
            </button>
            <button
              type="button"
              onClick={() => setActiveForm('none')}
              className="min-h-[44px] rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-600"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      {/* Courses List by Dynamic Track */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: `الكل (${db.courses.length})` },
            ...(db.tracks.some((t) => t.id === 'vocational')
              ? [{ id: 'vocational6', label: 'السادس المهني (وزاري)' }]
              : []),
            ...db.tracks.map((t) => ({ id: t.id, label: t.shortLabel || t.label })),
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTrackFilter(item.id)}
              className={`min-h-[40px] rounded-xl px-3.5 text-xs font-bold transition-colors whitespace-nowrap ${
                trackFilter === item.id
                  ? 'bg-[#0F172A] text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-400'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4">
          {visibleCourses.map((course) => {
            const isExpanded = expandedCourseId === course.id;
            const coursePrice = course.priceIqd ?? 0;

            return (
              <div
                key={course.id}
                className="rounded-2xl bg-white border border-slate-200 overflow-hidden"
              >
                <div className="p-5 flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-bold text-[#B48A1E]">
                          {getTrackName(course.track)} · {course.subStage}
                          {course.branch ? ` (${course.branch})` : ''}
                          {course.subject ? ` · ${course.subject}` : ''}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{course.totalHours}</span>
                      </div>
                      <h3 className="text-base font-extrabold text-slate-900">{course.title}</h3>
                      <p className="text-xs text-slate-600 font-reading line-clamp-2">
                        {course.description}
                      </p>
                    </div>

                    {/* Course Price Display */}
                    <div className="shrink-0 text-right sm:text-left">
                      <span className="block text-[11px] text-slate-500">سعر الدورة الكاملة</span>
                      <strong
                        className={`inline-flex items-center gap-1 font-mono text-base font-extrabold tabular-nums ${
                          coursePrice === 0 ? 'text-emerald-700' : 'text-[#0F172A]'
                        }`}
                      >
                        <Tag className="h-3.5 w-3.5 text-[#B48A1E]" />
                        {coursePrice === 0 ? 'مجانية' : formatIqd(coursePrice)}
                      </strong>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                    <button
                      type="button"
                      onClick={() => setExpandedCourseId(isExpanded ? null : course.id)}
                      className="inline-flex items-center gap-2 font-bold text-[#0F172A] hover:text-[#B48A1E]"
                    >
                      <BookOpen className="h-3.5 w-3.5 text-[#B48A1E]" />
                      <span className="tabular-nums">
                        {course.lessons.length} محاضرات · {course.notes.length} ملازم ·{' '}
                        {course.quizzes.length} كوزات
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openCreateLessonForm(course.id)}
                        className="min-h-[34px] rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-[#0F172A] hover:border-[#0F172A]"
                      >
                        + محاضرة
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTargetCourseId(course.id);
                          setActiveForm('pdf');
                        }}
                        className="min-h-[34px] rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-[#B48A1E] hover:border-[#B48A1E]"
                      >
                        + ملزمة
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditCourseForm(course)}
                        className="min-h-[34px] inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 hover:border-[#0F172A]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span>تعديل السعر/الدورة</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPendingDelete({
                            title: 'حذف دورة تعليمية بالكامل',
                            itemLabel: course.title,
                            warningDetail:
                              'سيتم حذف الدورة بجميع محاضراتها وملازمها وكوزاتها من المنصة نهائياً.',
                            onConfirm: () => {
                              deleteCourse(course.id);
                              setPendingDelete(null);
                              notify(`تم حذف الدورة «${course.title}» نهائياً.`);
                            },
                          })
                        }
                        className="min-h-[34px] inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 text-xs font-bold text-red-700 hover:bg-red-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>حذف الدورة</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expandable Lessons Pricing & Management List */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50/70 px-5 py-4 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold text-slate-800">
                        محاضرات الدورة والأسعار الفردية ({course.lessons.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => openCreateLessonForm(course.id)}
                        className="font-bold text-[#B48A1E] hover:underline"
                      >
                        + إضافة محاضرة جديدة
                      </button>
                    </div>

                    {course.lessons.length === 0 ? (
                      <p className="text-xs text-slate-500 py-2">
                        لا توجد محاضرات مضافة بعد داخل هذه الدورة.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-200/80 rounded-xl border border-slate-200 bg-white overflow-hidden">
                        {course.lessons.map((lesson) => {
                          const lp = lesson.priceIqd ?? 0;
                          return (
                            <div
                              key={lesson.id}
                              className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                            >
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900">{lesson.title}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                                  المدة: <span dir="ltr">{lesson.duration}</span> · السعر الفردي:{' '}
                                  <strong
                                    className={
                                      lp === 0 ? 'text-emerald-700' : 'text-[#0F172A] font-mono'
                                    }
                                  >
                                    {lp === 0 ? 'مجانية' : formatIqd(lp)}
                                  </strong>
                                </p>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => openEditLessonForm(course.id, lesson)}
                                  className="min-h-[32px] inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 font-bold text-slate-700 hover:border-[#0F172A]"
                                >
                                  <Pencil className="h-3 w-3" />
                                  <span>تعديل</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPendingDelete({
                                      title: 'حذف محاضرة من الدورة',
                                      itemLabel: `${lesson.title} (${course.title})`,
                                      warningDetail:
                                        'سيتم حذف هذه المحاضرة نهائياً من الدورة ومن حسابات الطلبة.',
                                      onConfirm: () => {
                                        deleteLessonFromCourse(course.id, lesson.id);
                                        setPendingDelete(null);
                                        notify(`تم حذف المحاضرة «${lesson.title}» بنجاح.`);
                                      },
                                    })
                                  }
                                  className="min-h-[32px] inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 font-bold text-red-700 hover:bg-red-100"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  <span>حذف</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mandatory Security PIN Confirmation Modal */}
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
