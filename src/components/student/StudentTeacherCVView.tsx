import React from 'react';
import {
  Award,
  BookOpen,
  Briefcase,
  Calendar,
  ExternalLink,
  GraduationCap,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  Sparkles,
  Trophy,
  UserCheck,
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { PlatformSubPageBar } from '../common/PlatformThemeUI';

function formatWhatsAppLink(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  const intl = digits.startsWith('07')
    ? `964${digits.slice(1)}`
    : digits.startsWith('964')
      ? digits
      : `964${digits}`;
  return `https://wa.me/${intl}`;
}

export const StudentTeacherCVView: React.FC<{
  onBack?: () => void;
  onOpenInquiries?: () => void;
}> = ({ onBack, onOpenInquiries }) => {
  const { db } = usePlatform();
  const cv = db.teacherCV;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {onBack && (
        <PlatformSubPageBar onBack={onBack} sectionLabel="السيرة الذاتية للأستاذة (CV)" />
      )}
      {/* Royal Navy & Gold Editorial Header Card */}
      <section className="rounded-3xl bg-[#110D1F] text-white overflow-hidden border border-purple-500/20 shadow-lg">
        <div className="p-6 sm:p-8 lg:p-10 relative">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 via-violet-600 to-fuchsia-600 text-white shrink-0 shadow-lg">
              <GraduationCap className="h-10 w-10 sm:h-12 sm:w-12" />
            </div>

            <div className="space-y-2 min-w-0">
              <p className="text-xs font-extrabold text-purple-300">
                السيرة الذاتية المعتمدة (CV)
              </p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                الأستاذة {cv.fullName}
              </h1>
              <p className="text-sm sm:text-base text-slate-200 font-semibold leading-relaxed">
                {cv.academicTitle}
              </p>
            </div>
          </div>

          {/* Quick Fact Bar */}
          <div className="mt-7 pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <div className="flex items-center gap-2 text-xs text-amber-300 font-bold">
                <Briefcase className="h-4 w-4 shrink-0" />
                <span>سنوات الخبرة</span>
              </div>
              <p className="mt-1.5 text-sm font-extrabold text-white">
                {cv.yearsExperience || '—'}
              </p>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <div className="flex items-center gap-2 text-xs text-amber-300 font-bold">
                <Calendar className="h-4 w-4 shrink-0" />
                <span>العمر</span>
              </div>
              <p className="mt-1.5 text-sm font-extrabold text-white">
                {cv.age || '—'}
              </p>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <div className="flex items-center gap-2 text-xs text-amber-300 font-bold">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>محافظة السكن والتدريس</span>
              </div>
              <p className="mt-1.5 text-sm font-extrabold text-white">
                {cv.governorate}
                {cv.area ? ` — ${cv.area}` : ''}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bio & Teaching Philosophy */}
      {cv.bio && (
        <section className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-6 sm:p-7 space-y-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-5 w-5 text-purple-300" />
            <h2 className="text-base sm:text-lg font-extrabold text-white">
              نبذة شخصية ورسالة التدريس
            </h2>
          </div>
          <p className="text-sm sm:text-base text-slate-200 font-reading leading-loose">
            {cv.bio}
          </p>
        </section>
      )}

      {/* Academic Credentials & Specialization */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <section className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <Award className="h-5 w-5 text-purple-300" />
            <h2 className="text-base font-extrabold text-white">
              الشهادة الجامعية والمؤهلات العلمية
            </h2>
          </div>
          <div className="rounded-xl bg-amber-500/12 border border-amber-400/35 p-4">
            <p className="text-xs font-bold text-[#9A7415]">الشهادة الأكاديمية</p>
            <p className="mt-1 text-sm font-extrabold text-white">{cv.degree}</p>
          </div>
          {cv.qualifications && (
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-slate-400">المؤهلات والدورات التخصصية</p>
              <p className="text-sm text-slate-200 font-reading leading-relaxed">
                {cv.qualifications}
              </p>
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <BookOpen className="h-5 w-5 text-purple-300" />
            <h2 className="text-base font-extrabold text-white">
              الاختصاص الدقيق والمواد التي تدرّسها
            </h2>
          </div>
          <div className="rounded-xl bg-white/[0.04] border border-purple-500/20 p-4">
            <p className="text-xs font-bold text-slate-400">الاختصاص الدقيق</p>
            <p className="mt-1 text-sm font-extrabold text-white">{cv.specialization}</p>
          </div>

          {cv.subjectsTaught.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400">المواد والمناهج المعتمدة</p>
              <ul className="space-y-2">
                {cv.subjectsTaught.map((subject, index) => (
                  <li
                    key={`${subject}-${index}`}
                    className="flex items-start gap-2.5 text-sm font-semibold text-slate-100"
                  >
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 shrink-0" />
                    <span>{subject}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      {/* Achievements & Top Student Results */}
      {cv.achievements.length > 0 && (
        <section className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-6 sm:p-7 space-y-4">
          <div className="flex items-center gap-2.5">
            <Trophy className="h-5 w-5 text-purple-300" />
            <h2 className="text-base sm:text-lg font-extrabold text-white">
              الإنجازات ومعدلات الطلبة السابقة
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {cv.achievements.map((achievement, idx) => (
              <div
                key={`${achievement}-${idx}`}
                className="rounded-xl bg-white/[0.04] border border-purple-500/20 p-4 flex items-start gap-3"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 shadow-[0_8px_22px_-6px_rgba(147,51,234,0.65)] text-xs font-extrabold text-purple-300 font-mono shrink-0">
                  {idx + 1}
                </span>
                <p className="text-sm text-slate-200 font-reading leading-relaxed">
                  {achievement}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Residence, Institute Address & Official Contact Channels */}
      <section className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-6 sm:p-7 space-y-5">
        <div className="flex items-center gap-2.5">
          <MapPin className="h-5 w-5 text-purple-300" />
          <h2 className="text-base sm:text-lg font-extrabold text-white">
            موقع التدريس والعنوان التفصيلي والتواصل
          </h2>
        </div>

        <div className="rounded-xl bg-white/[0.04] border border-purple-500/20 p-4 sm:p-5 space-y-2">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-slate-400">
            <span>
              المحافظة: <strong className="text-white">{cv.governorate}</strong>
            </span>
            {cv.area && (
              <span>
                المنطقة: <strong className="text-white">{cv.area}</strong>
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-white leading-relaxed">
            {cv.instituteAddress}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {cv.phone && (
            <a
              href={`tel:${cv.phone}`}
              className="min-h-[48px] rounded-xl border border-purple-500/20 bg-white/[0.045] backdrop-blur-xl px-4 py-3 flex items-center justify-between gap-3 hover:border-purple-400/60 transition-colors"
            >
              <span className="flex items-center gap-2.5 text-xs font-bold text-slate-200">
                <Phone className="h-4 w-4 text-purple-300" />
                <span>الهاتف الرسمي</span>
              </span>
              <span className="font-mono text-xs font-extrabold text-white tabular-nums" dir="ltr">
                {cv.phone}
              </span>
            </a>
          )}

          {cv.whatsapp && (
            <a
              href={formatWhatsAppLink(cv.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[48px] rounded-xl bg-emerald-600 px-4 py-3 flex items-center justify-between gap-3 text-white hover:bg-emerald-700 transition-colors"
            >
              <span className="flex items-center gap-2.5 text-xs font-extrabold">
                <MessageCircle className="h-4 w-4" />
                <span>تواصل عبر واتساب</span>
              </span>
              <ExternalLink className="h-3.5 w-3.5 opacity-80" />
            </a>
          )}

          {cv.telegram && (
            <a
              href={cv.telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[48px] rounded-xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 shadow-[0_8px_22px_-6px_rgba(147,51,234,0.65)] px-4 py-3 flex items-center justify-between gap-3 text-white hover:brightness-110 transition-colors"
            >
              <span className="flex items-center gap-2.5 text-xs font-extrabold">
                <Send className="h-4 w-4 text-purple-300" />
                <span>قناة التليجرام</span>
              </span>
              <ExternalLink className="h-3.5 w-3.5 text-amber-300" />
            </a>
          )}

          {cv.instagram && (
            <a
              href={cv.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[48px] rounded-xl border border-purple-500/20 bg-white/[0.04] px-4 py-3 flex items-center justify-between gap-3 text-white hover:border-purple-400/60 transition-colors"
            >
              <span className="flex items-center gap-2.5 text-xs font-extrabold">
                <UserCheck className="h-4 w-4 text-purple-300" />
                <span>حساب إنستغرام</span>
              </span>
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
            </a>
          )}

          {cv.facebook && (
            <a
              href={cv.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[48px] rounded-xl border border-purple-500/20 bg-white/[0.04] px-4 py-3 flex items-center justify-between gap-3 text-white hover:border-purple-400/60 transition-colors"
            >
              <span className="flex items-center gap-2.5 text-xs font-extrabold">
                <UserCheck className="h-4 w-4 text-purple-300" />
                <span>صفحة فيسبوك</span>
              </span>
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
            </a>
          )}
        </div>

        <div className="pt-3 border-t border-purple-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
          <span>
            آخر تحديث للسيرة الذاتية:{' '}
            <strong className="font-mono text-slate-200" dir="ltr">
              {cv.updatedAt}
            </strong>
          </span>
          {onOpenInquiries && (
            <button
              type="button"
              onClick={onOpenInquiries}
              className="self-start sm:self-auto font-extrabold text-purple-300 hover:underline"
            >
              لديك سؤال دراسي أو عام؟ أرسل استفساراً للأستاذة ←
            </button>
          )}
        </div>
      </section>
    </div>
  );
};
