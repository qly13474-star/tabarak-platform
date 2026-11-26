import React, { useState } from 'react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  MapPin,
  Phone,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Trophy,
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { IRAQ_GOVERNORATES } from '../../utils/store';

export const AdminTeacherCV: React.FC = () => {
  const { db, updateTeacherCV } = usePlatform();
  const cv = db.teacherCV;

  const [fullName, setFullName] = useState(cv.fullName);
  const [academicTitle, setAcademicTitle] = useState(cv.academicTitle);
  const [specialization, setSpecialization] = useState(cv.specialization);
  const [subjectsTaught, setSubjectsTaught] = useState<string[]>(cv.subjectsTaught);
  const [newSubjectInput, setNewSubjectInput] = useState('');
  const [degree, setDegree] = useState(cv.degree);
  const [qualifications, setQualifications] = useState(cv.qualifications);
  const [age, setAge] = useState(cv.age);
  const [yearsExperience, setYearsExperience] = useState(cv.yearsExperience);
  const [governorate, setGovernorate] = useState(cv.governorate);
  const [area, setArea] = useState(cv.area);
  const [instituteAddress, setInstituteAddress] = useState(cv.instituteAddress);
  const [bio, setBio] = useState(cv.bio);
  const [achievements, setAchievements] = useState<string[]>(cv.achievements);
  const [newAchievementInput, setNewAchievementInput] = useState('');
  const [phone, setPhone] = useState(cv.phone);
  const [whatsapp, setWhatsapp] = useState(cv.whatsapp);
  const [telegram, setTelegram] = useState(cv.telegram ?? '');
  const [instagram, setInstagram] = useState(cv.instagram ?? '');
  const [facebook, setFacebook] = useState(cv.facebook ?? '');
  const [savedNotice, setSavedNotice] = useState(false);

  const handleAddSubject = () => {
    const trimmed = newSubjectInput.trim();
    if (!trimmed) return;
    setSubjectsTaught((prev) => [...prev, trimmed]);
    setNewSubjectInput('');
  };

  const handleRemoveSubject = (index: number) => {
    setSubjectsTaught((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddAchievement = () => {
    const trimmed = newAchievementInput.trim();
    if (!trimmed) return;
    setAchievements((prev) => [...prev, trimmed]);
    setNewAchievementInput('');
  };

  const handleRemoveAchievement = (index: number) => {
    setAchievements((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateTeacherCV({
      fullName: fullName || 'تبارك الأزيرجاوي',
      academicTitle,
      specialization,
      subjectsTaught,
      degree,
      qualifications,
      age,
      yearsExperience,
      governorate,
      area,
      instituteAddress,
      bio,
      achievements,
      phone,
      whatsapp,
      telegram,
      instagram,
      facebook,
    });
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 4000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold text-[#B48A1E]">
            الصفحة التعريفية للأستاذة في تطبيق الطالب
          </p>
          <h1 className="mt-1 text-xl sm:text-2xl font-extrabold text-slate-900">
            إدارة السيرة الذاتية (CV)
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            عدّلي جميع بياناتك الأكاديمية، العنوان، الإنجازات، وروابط التواصل لتظهر فوراً لجميع الطلاب من القائمة المنسدلة.
          </p>
        </div>
        <div className="text-xs text-slate-500">
          آخر تحديث:{' '}
          <strong className="font-mono text-slate-900" dir="ltr">
            {cv.updatedAt}
          </strong>
        </div>
      </div>

      {savedNotice && (
        <div
          role="status"
          className="flex items-center gap-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3.5 text-sm font-bold text-emerald-900"
        >
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>
            تم حفظ تعديلات السيرة الذاتية بنجاح! أصبحت المعلومات المحدّثة ظاهرة الآن لجميع الطلاب.
          </span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Basic Identity & Experience */}
        <section className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <GraduationCap className="h-5 w-5 text-[#B48A1E]" />
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
              المعلومات الأساسية والخبرة التدريسية
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                الاسم الكامل
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="تبارك الأزيرجاوي"
                className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-sm text-slate-900 focus:border-[#0F172A] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                اللقب العلمي والصفة الأكاديمية
              </label>
              <input
                type="text"
                required
                value={academicTitle}
                onChange={(e) => setAcademicTitle(e.target.value)}
                placeholder="أستاذة وباحثة أكاديمية متخصصة..."
                className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-sm text-slate-900 focus:border-[#0F172A] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                العمر
              </label>
              <input
                type="text"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="مثال: 31 سنة"
                className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-sm text-slate-900 focus:border-[#0F172A] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                سنوات الخبرة في التدريس
              </label>
              <input
                type="text"
                value={yearsExperience}
                onChange={(e) => setYearsExperience(e.target.value)}
                placeholder="مثال: 9 سنوات في التدريس الحضوري والإلكتروني"
                className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-sm text-slate-900 focus:border-[#0F172A] focus:outline-none"
              />
            </div>
          </div>
        </section>

        {/* Section 2: Specialization, Degree & Subjects Taught */}
        <section className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Award className="h-5 w-5 text-[#B48A1E]" />
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
              الشهادة الجامعية والاختصاص والمواد الدراسية
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                الاختصاص الدقيق
              </label>
              <input
                type="text"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder="علوم الحاسوب والرياضيات التطبيقية..."
                className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-sm text-slate-900 focus:border-[#0F172A] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                الشهادة الجامعية
              </label>
              <input
                type="text"
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                placeholder="ماجستير علوم الحاسوب — جامعة بغداد"
                className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-sm text-slate-900 focus:border-[#0F172A] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
              المؤهلات العلمية والشهادات التدريبية
            </label>
            <textarea
              rows={2}
              value={qualifications}
              onChange={(e) => setQualifications(e.target.value)}
              placeholder="اكتبي تفاصيل البكالوريوس والماجستير وشهادات طرائق التدريس..."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0F172A] focus:outline-none font-reading"
            />
          </div>

          {/* Subjects Taught List */}
          <div className="space-y-2.5">
            <label className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700">
              <BookOpen className="h-3.5 w-3.5 text-[#B48A1E]" />
              <span>المواد التي تدرّسها الأستاذة ({subjectsTaught.length})</span>
            </label>

            <div className="flex gap-2">
              <input
                type="text"
                value={newSubjectInput}
                onChange={(e) => setNewSubjectInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubject();
                  }
                }}
                placeholder="أضيفي مادة جديدة (مثلاً: قواعد اللغة الإنجليزية — الثالث متوسط)"
                className="flex-1 min-h-[42px] rounded-xl border border-slate-300 px-3.5 text-sm text-slate-900 focus:border-[#0F172A] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddSubject}
                className="min-h-[42px] inline-flex items-center gap-1.5 rounded-xl bg-[#0F172A] px-4 text-xs font-extrabold text-white hover:bg-slate-800 whitespace-nowrap"
              >
                <Plus className="h-4 w-4 text-[#D4AF37]" />
                <span>إضافة</span>
              </button>
            </div>

            {subjectsTaught.length > 0 && (
              <ul className="space-y-2 pt-1">
                {subjectsTaught.map((sub, idx) => (
                  <li
                    key={`${sub}-${idx}`}
                    className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-800"
                  >
                    <span>{sub}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubject(idx)}
                      aria-label="حذف المادة"
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Section 3: Residence & Institute Address */}
        <section className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <MapPin className="h-5 w-5 text-[#B48A1E]" />
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
              مكان السكن والعنوان التفصيلي (موقع المعهد أو التدريس)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                المحافظة
              </label>
              <select
                value={governorate}
                onChange={(e) => setGovernorate(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-[#0F172A] focus:outline-none"
              >
                {IRAQ_GOVERNORATES.map((gov) => (
                  <option key={gov} value={gov}>
                    {gov}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                المنطقة / الحي
              </label>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="مثال: الكرادة الشرقية / المنصور"
                className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-sm text-slate-900 focus:border-[#0F172A] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
              العنوان التفصيلي للمعهد أو موقع التدريس الحضوري
            </label>
            <input
              type="text"
              value={instituteAddress}
              onChange={(e) => setInstituteAddress(e.target.value)}
              placeholder="المحافظة — المنطقة — أقرب نقطة دالة واسم المعهد..."
              className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-sm text-slate-900 focus:border-[#0F172A] focus:outline-none"
            />
          </div>
        </section>

        {/* Section 4: Bio & Achievements */}
        <section className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sparkles className="h-5 w-5 text-[#B48A1E]" />
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
              النبذة الشخصية والإنجازات ومعدلات الطلاب السابقة
            </h2>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
              نبذة شخصية ورسالة للطلبة
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="اكتبي نبذة تعريفية عن أسلوبك في التدريس ورؤيتك الأكاديمية..."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0F172A] focus:outline-none font-reading"
            />
          </div>

          <div className="space-y-2.5">
            <label className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700">
              <Trophy className="h-3.5 w-3.5 text-[#B48A1E]" />
              <span>الإنجازات ومعدلات الطلاب السابقة ({achievements.length})</span>
            </label>

            <div className="flex gap-2">
              <input
                type="text"
                value={newAchievementInput}
                onChange={(e) => setNewAchievementInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAchievement();
                  }
                }}
                placeholder="أضيفي إنجازاً أو نسبة نجاح أو عدد الأوائل..."
                className="flex-1 min-h-[42px] rounded-xl border border-slate-300 px-3.5 text-sm text-slate-900 focus:border-[#0F172A] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddAchievement}
                className="min-h-[42px] inline-flex items-center gap-1.5 rounded-xl bg-[#0F172A] px-4 text-xs font-extrabold text-white hover:bg-slate-800 whitespace-nowrap"
              >
                <Plus className="h-4 w-4 text-[#D4AF37]" />
                <span>إضافة</span>
              </button>
            </div>

            {achievements.length > 0 && (
              <ul className="space-y-2 pt-1">
                {achievements.map((ach, idx) => (
                  <li
                    key={`${ach}-${idx}`}
                    className="flex items-start justify-between gap-3 rounded-xl bg-amber-50/50 border border-amber-200/70 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-800"
                  >
                    <span className="leading-relaxed">{ach}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAchievement(idx)}
                      aria-label="حذف الإنجاز"
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Section 5: Contact Numbers & Social Links */}
        <section className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Phone className="h-5 w-5 text-[#B48A1E]" />
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
              أرقام التواصل وروابط الحسابات الرسمية
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                رقم الهاتف الرسمي
              </label>
              <input
                type="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07701234567"
                className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-sm font-mono text-slate-900 focus:border-[#0F172A] focus:outline-none text-left"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                رقم الواتساب
              </label>
              <input
                type="tel"
                dir="ltr"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="07701234567"
                className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-sm font-mono text-slate-900 focus:border-[#0F172A] focus:outline-none text-left"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                رابط قناة التليجرام (اختياري)
              </label>
              <input
                type="url"
                dir="ltr"
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                placeholder="https://t.me/username"
                className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-sm font-mono text-slate-900 focus:border-[#0F172A] focus:outline-none text-left"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                رابط حساب إنستغرام (اختياري)
              </label>
              <input
                type="url"
                dir="ltr"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="https://instagram.com/username"
                className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-sm font-mono text-slate-900 focus:border-[#0F172A] focus:outline-none text-left"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                رابط صفحة فيسبوك (اختياري)
              </label>
              <input
                type="url"
                dir="ltr"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                placeholder="https://facebook.com/pagename"
                className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-sm font-mono text-slate-900 focus:border-[#0F172A] focus:outline-none text-left"
              />
            </div>
          </div>
        </section>

        {/* Sticky/Prominent Save Button */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="submit"
            className="w-full sm:w-auto min-h-[50px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#D4AF37] to-[#F59E0B] px-8 text-sm font-extrabold text-slate-950 shadow-sm hover:brightness-105 transition-all"
          >
            <Save className="h-4 w-4" />
            <span>حفظ التعديلات وتحديث السيرة الذاتية للطلاب</span>
          </button>
        </div>
      </form>
    </div>
  );
};
