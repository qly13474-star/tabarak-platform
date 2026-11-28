import React, { useCallback, useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Radio,
  KeyRound,
  Users,
  BookOpen,
  LogOut,
  GraduationCap,
  Server,
  ArrowLeft,
  RotateCcw,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  Layers,
  ShoppingBag,
  FileBadge,
  MessageSquareWarning,
  MessageCircleQuestion,
  CalendarClock,
  Megaphone,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  ShieldCheck,
  UserCog,
  MessageCircle,
  Phone,
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { TeacherLiveStudio } from './TeacherLiveStudio';
import { AdminCodes } from './AdminCodes';
import { AdminStudents } from './AdminStudents';
import { AdminCourses } from './AdminCourses';
import { AdminQuizzes } from './AdminQuizzes';
import { AdminAssignments } from './AdminAssignments';
import { AdminPayments } from './AdminPayments';
import { AdminStages } from './AdminStages';
import { AdminStore } from './AdminStore';
import { AdminTeacherCV } from './AdminTeacherCV';
import { AdminComplaints } from './AdminComplaints';
import { AdminInquiries } from './AdminInquiries';
import { AdminLiveSchedule } from './AdminLiveSchedule';
import { AdminModerators } from './AdminModerators';
import { SecurityPinModal } from './SecurityPinModal';
import { BackButton } from '../common/BackButton';
import { useHardwareBackButton } from '../../hooks/useHardwareBackButton';
import { TrackId } from '../../types';
import {
  AdminSectionKey,
  canAccessAdminSection,
  getPermissionMeta,
} from '../../utils/adminPermissions';
import { formatWhatsappCleanNumber } from '../../utils/whatsapp';
import logoImg from '../../assets/images/tabarak_alzirjawi_icon_1795817962070.jpg';

export const AdminDashboardShell: React.FC = () => {
  const {
    db,
    liveSession,
    liveQuizRoom,
    currentUser,
    isSuperAdmin,
    hasPermission,
    logout,
    resetDemoPlatform,
    startDemoLiveQuizPreview,
    getTrackName,
    updateBreakingAnnouncement,
    toggleBreakingAnnouncement,
    updateSupportWhatsappNumber,
  } = usePlatform();
  const [section, setSection] = useState<AdminSectionKey>('overview');
  const [sectionHistory, setSectionHistory] = useState<AdminSectionKey[]>([]);

  // Breaking Announcement Quick Control State
  const [bannerDraft, setBannerDraft] = useState<string>(db.breakingAnnouncement.message);
  const [bannerTarget, setBannerTarget] = useState<'all' | TrackId>(
    db.breakingAnnouncement.targetTrack
  );
  const [bannerSavedMsg, setBannerSavedMsg] = useState<string | null>(null);

  // Dynamic WhatsApp Support Settings State (Super Admin -> Firestore settings/platform)
  const [supportWaDraft, setSupportWaDraft] = useState<string>(
    db.supportWhatsappNumber || db.paymentSettings.whatsappNumber || '07848333046'
  );
  const [supportWaSaving, setSupportWaSaving] = useState(false);
  const [supportWaSavedMsg, setSupportWaSavedMsg] = useState<string | null>(null);
  const [supportWaError, setSupportWaError] = useState<string | null>(null);
  const [showResetPinModal, setShowResetPinModal] = useState(false);

  useEffect(() => {
    setBannerDraft(db.breakingAnnouncement.message);
    setBannerTarget(db.breakingAnnouncement.targetTrack);
  }, [db.breakingAnnouncement.message, db.breakingAnnouncement.targetTrack]);

  useEffect(() => {
    if (db.supportWhatsappNumber) {
      setSupportWaDraft(db.supportWhatsappNumber);
    }
  }, [db.supportWhatsappNumber]);

  useEffect(() => {
    if (currentUser && !canAccessAdminSection(currentUser, section)) {
      setSection('overview');
      setSectionHistory([]);
    }
  }, [currentUser, section]);

  const navigateToSection = useCallback(
    (nextSection: AdminSectionKey) => {
      if (!canAccessAdminSection(currentUser, nextSection)) return;
      setSection((prev) => {
        if (prev !== nextSection) {
          setSectionHistory((hist) => [...hist.slice(-14), prev]);
        }
        return nextSection;
      });
    },
    [currentUser]
  );

  const handleAdminBack = useCallback((): boolean => {
    if (sectionHistory.length > 0) {
      const prev = sectionHistory[sectionHistory.length - 1];
      setSectionHistory((hist) => hist.slice(0, -1));
      setSection(canAccessAdminSection(currentUser, prev) ? prev : 'overview');
      return true;
    }
    if (section !== 'overview') {
      setSection('overview');
      return true;
    }
    return false;
  }, [sectionHistory, section, currentUser]);

  useHardwareBackButton(handleAdminBack, true);

  if (!currentUser) return null;

  const roleSubtitle =
    currentUser.adminRoleTitle?.trim() ||
    (isSuperAdmin ? 'السوبر أدمن — صاحبة المنصة' : 'مشرف بالمنصة');
  const moderatorsCount = db.users.filter((u) => u.role === 'admin' && !u.isSuperAdmin).length;
  const activeModeratorsCount = db.users.filter(
    (u) => u.role === 'admin' && !u.isSuperAdmin && u.isActive
  ).length;
  const students = db.users.filter((u) => u.role === 'student');
  const unusedCodesCount = db.activationCodes.filter((c) => !c.isUsed).length;
  const pendingRenewalsCount = db.renewalRequests.filter((r) => r.status === 'pending').length;
  const preparingStoreOrdersCount = db.storeOrders.filter((o) => o.status === 'preparing').length;
  const pendingComplaintsCount = db.complaints.filter((c) => c.status === 'pending').length;
  const pendingInquiriesCount = db.inquiries.filter((i) => i.status === 'pending').length;

  const allNavItems: {
    id: AdminSectionKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard },
    { id: 'moderators', label: 'إدارة المشرفين والأدمنية', icon: ShieldCheck },
    { id: 'live', label: 'استوديو البث', icon: Radio },
    { id: 'schedule', label: 'جدول البث الأسبوعي', icon: CalendarClock },
    { id: 'assignments', label: 'التحاضير والواجبات', icon: ClipboardList },
    { id: 'quizzes', label: 'إدارة الكوزات', icon: ClipboardCheck },
    { id: 'payments', label: 'الدفع والاشتراكات', icon: CreditCard },
    { id: 'store', label: 'الملازم والمرشحات (المتجر)', icon: ShoppingBag },
    { id: 'codes', label: 'أكواد التفعيل', icon: KeyRound },
    { id: 'students', label: 'الطلاب والأجهزة', icon: Users },
    { id: 'courses', label: 'الدورات والملازم', icon: BookOpen },
    { id: 'stages', label: 'إدارة المراحل والأقسام والمواد', icon: Layers },
    { id: 'cv', label: 'إدارة السيرة الذاتية (CV)', icon: FileBadge },
    { id: 'complaints', label: 'الشكاوى الواردة', icon: MessageSquareWarning },
    { id: 'inquiries', label: 'الاستفسارات', icon: MessageCircleQuestion },
  ];

  const navItems = allNavItems.filter((item) => canAccessAdminSection(currentUser, item.id));

  const handleSaveBreakingBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission('live_announcements')) return;
    if (!bannerDraft.trim()) return;
    updateBreakingAnnouncement({
      message: bannerDraft.trim(),
      targetTrack: bannerTarget,
      isActive: true,
    });
    setBannerSavedMsg('تم نشر شريط الإعلان العاجل وسيظهر فوراً أعلى شاشة الطلاب المستهدفين.');
    window.setTimeout(() => setBannerSavedMsg(null), 4000);
  };

  const handleSaveSupportWhatsapp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin || supportWaSaving) return;
    setSupportWaError(null);
    setSupportWaSavedMsg(null);
    setSupportWaSaving(true);
    try {
      const res = await updateSupportWhatsappNumber(supportWaDraft);
      if (!res.success) {
        setSupportWaError(res.error ?? 'يرجى إدخال رقم واتساب صحيح.');
      } else {
        setSupportWaSavedMsg(
          res.error
            ? `تم حفظ الرقم (${supportWaDraft.trim()}). ${res.error}`
            : `تم حفظ رقم الدعم الفني (${supportWaDraft.trim()}) في قاعدة البيانات وتحديث أزرار الواتساب فوراً.`
        );
        window.setTimeout(() => setSupportWaSavedMsg(null), 5000);
      }
    } finally {
      setSupportWaSaving(false);
    }
  };

  const sectionTitle = navItems.find((n) => n.id === section)?.label ?? 'لوحة التحكم';

  return (
    <div className="min-h-[100dvh] bg-[#090712] text-white flex flex-col lg:flex-row overflow-x-hidden">
      {/* Desktop Sidebar (260px Dark Luxury Obsidian Glass) */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col bg-[#110D1F]/95 backdrop-blur-2xl text-white shrink-0 border-l border-purple-500/20">
        <div className="p-5 border-b border-purple-500/20">
          <div className="flex items-center gap-3">
            {isSuperAdmin ? (
              <img
                src={logoImg}
                alt="منصة الأستاذة تبارك الزيرجاوي"
                className="h-11 w-11 rounded-2xl border border-purple-400/50 shadow-[0_0_20px_-4px_rgba(168,85,247,0.75)] object-cover shrink-0"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 via-violet-600 to-fuchsia-600 text-white shrink-0 shadow-[0_0_20px_-4px_rgba(168,85,247,0.7)]">
                <UserCog className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-black text-white truncate">{currentUser.fullName}</p>
              <p className="text-[11px] text-purple-300 font-bold truncate">{roleSubtitle}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateToSection(item.id)}
                className={`w-full min-h-[46px] flex items-center justify-between gap-3 rounded-xl px-3.5 text-sm font-bold transition-all cursor-pointer ${
                  active
                    ? 'bg-gradient-to-l from-purple-600/35 via-violet-600/25 to-fuchsia-600/20 text-white border border-purple-400/45 shadow-[0_0_20px_-8px_rgba(168,85,247,0.75)]'
                    : 'text-slate-300 border border-transparent hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-purple-300' : ''}`} />
                  <span>{item.label}</span>
                </span>
                {item.id === 'live' && liveSession.isLive && (
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                )}
                {item.id === 'quizzes' && liveQuizRoom.status === 'active' && (
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                )}
                {item.id === 'payments' && pendingRenewalsCount > 0 && (
                  <span className="min-w-[20px] h-5 px-1 rounded-full bg-red-600 text-[10px] font-extrabold text-white flex items-center justify-center font-mono tabular-nums">
                    {pendingRenewalsCount}
                  </span>
                )}
                {item.id === 'store' && preparingStoreOrdersCount > 0 && (
                  <span className="min-w-[20px] h-5 px-1 rounded-full bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 text-[10px] font-extrabold text-white flex items-center justify-center font-mono tabular-nums">
                    {preparingStoreOrdersCount}
                  </span>
                )}
                {item.id === 'complaints' && pendingComplaintsCount > 0 && (
                  <span className="min-w-[20px] h-5 px-1 rounded-full bg-red-600 text-[10px] font-extrabold text-white flex items-center justify-center font-mono tabular-nums">
                    {pendingComplaintsCount}
                  </span>
                )}
                {item.id === 'moderators' && moderatorsCount > 0 && (
                  <span className="min-w-[20px] h-5 px-1 rounded-full bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 text-[10px] font-extrabold text-white flex items-center justify-center font-mono tabular-nums">
                    {activeModeratorsCount}
                  </span>
                )}
                {item.id === 'inquiries' && pendingInquiriesCount > 0 && (
                  <span className="min-w-[20px] h-5 px-1 rounded-full bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 text-[10px] font-extrabold text-white flex items-center justify-center font-mono tabular-nums">
                    {pendingInquiriesCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-purple-500/20">
          <button
            type="button"
            onClick={logout}
            className="w-full min-h-[42px] inline-flex items-center justify-center gap-2 rounded-xl border border-purple-500/20 px-3 text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Workspace Header */}
        <header className="sticky top-0 z-30 bg-[#110D1F]/95 backdrop-blur-2xl border-b border-purple-500/20 px-3 sm:px-6 pt-safe">
          <div className="h-14 flex items-center justify-between gap-2 sm:gap-4 w-full">
          <div className="flex items-center gap-2.5 text-sm min-w-0">
            {section !== 'overview' && (
              <BackButton onClick={handleAdminBack} label="رجوع" variant="subtle" size="sm" />
            )}
            <div className="min-w-0 lg:hidden">
              <p className="font-extrabold text-white truncate text-xs sm:text-sm">
                {section === 'overview' ? currentUser.fullName : sectionTitle}
              </p>
              <p className="text-[10px] font-bold text-purple-300 truncate">{roleSubtitle}</p>
            </div>
            <span className="hidden lg:inline text-slate-400">لوحة التحكم</span>
            <span className="hidden lg:inline text-slate-300">/</span>
            <span className="hidden lg:inline font-bold text-white">{sectionTitle}</span>
            <span className="hidden xl:inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] border border-purple-500/20 px-2.5 py-1 text-[11px] font-bold text-slate-200 mr-2">
              <span className="font-extrabold text-white">{currentUser.fullName}</span>
              <span className="text-slate-300">•</span>
              <span className="text-purple-300">{roleSubtitle}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {hasPermission('quizzes_live_chat') && (
              <button
                type="button"
                onClick={() => {
                  if (liveQuizRoom.status === 'idle') {
                    startDemoLiveQuizPreview();
                  }
                  navigateToSection('quizzes');
                }}
                className="min-h-[38px] hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-amber-500/15 border border-amber-400/40 px-3 text-xs font-extrabold text-white hover:bg-amber-500/25 whitespace-nowrap"
              >
                <ClipboardCheck className="h-3.5 w-3.5 text-purple-300" />
                <span>
                  {liveQuizRoom.status === 'active'
                    ? 'فتح محادثة الكوز المباشر'
                    : 'معاينة محادثة كوز مباشر'}
                </span>
              </button>
            )}
            {hasPermission('live_announcements') && (
              <button
                type="button"
                onClick={() => navigateToSection('live')}
                className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 shadow-[0_8px_22px_-6px_rgba(147,51,234,0.65)] px-3.5 text-xs font-bold text-white hover:brightness-110 whitespace-nowrap"
              >
                <Radio className="h-3.5 w-3.5 text-purple-300" />
                <span>{liveSession.isLive ? 'إدارة البث' : 'بدء بث مباشر'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={logout}
              aria-label="تسجيل الخروج"
              className="lg:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-purple-500/20 text-slate-300 hover:bg-white/[0.08]"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          </div>
        </header>

        {/* Mobile Section Switcher */}
        <div className="lg:hidden bg-white/[0.045] backdrop-blur-xl border-b border-purple-500/20 px-3 py-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 min-w-max">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateToSection(item.id)}
                  className={`min-h-[40px] inline-flex items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold whitespace-nowrap transition-all ${
                    active
                      ? 'bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 text-white shadow-[0_6px_18px_-6px_rgba(147,51,234,0.75)]'
                      : 'bg-white/[0.06] text-slate-200 hover:bg-white/10'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-safe max-w-7xl w-full mx-auto overflow-x-hidden">
          {section === 'overview' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-bold text-purple-300">
                      أهلاً بك، {currentUser.fullName}
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 shadow-[0_8px_22px_-6px_rgba(147,51,234,0.65)] px-2.5 py-0.5 text-[11px] font-extrabold text-white">
                      {roleSubtitle}
                    </span>
                  </div>
                  <h1 className="mt-1 text-xl sm:text-2xl font-extrabold text-white">
                    {isSuperAdmin
                      ? 'ملخص المنصة والإحصائيات'
                      : 'لوحة عمل المشرف — الأقسام المصرّح بها'}
                  </h1>
                </div>
                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowResetPinModal(true)}
                    className="self-start sm:self-auto min-h-[38px] inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>إعادة ضبط البيانات التجريبية</span>
                  </button>
                )}
              </div>

              {!isSuperAdmin && (
                <section className="rounded-2xl bg-[#110D1F] text-white border border-purple-500/20 p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300">
                        <UserCog className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-300 font-semibold">دورك الوظيفي المعتمد</p>
                        <h2 className="text-sm sm:text-base font-extrabold text-purple-300">
                          {roleSubtitle}
                        </h2>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-slate-300">
                      تظهر لكِ/لك الأقسام المصرّح بها من الأستاذة تبارك فقط
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(currentUser.permissions ?? []).length === 0 ? (
                      <span className="text-xs text-purple-300">
                        لم يتم تفعيل أي صلاحية لهذا الحساب حالياً. يرجى التواصل مع الأستاذة تبارك.
                      </span>
                    ) : (
                      (currentUser.permissions ?? []).map((permKey) => {
                        const meta = getPermissionMeta(permKey);
                        if (!meta) return null;
                        return (
                          <span
                            key={permKey}
                            className="inline-flex items-center rounded-lg bg-white/10 border border-purple-500/25 px-2.5 py-1 text-[11px] font-bold text-amber-200"
                          >
                            {meta.label}
                          </span>
                        );
                      })
                    )}
                  </div>
                </section>
              )}

              {/* 4-Column KPI Strip (Tabular Numerals, Flat Single Elevation) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-5 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>إجمالي الطلاب المسجّلين</span>
                    <Users className="h-4 w-4 text-purple-300" />
                  </div>
                  <p className="text-3xl font-extrabold text-white font-mono tabular-nums">
                    {students.length}
                  </p>
                  <p className="text-xs text-slate-400 tabular-nums">
                    {students.filter((s) => s.isActive).length} نشط ·{' '}
                    {students.filter((s) => !s.isActive).length} محظور
                  </p>
                </div>

                <div className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-5 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>الطلاب حسب المرحلة ({db.tracks.length})</span>
                    <GraduationCap className="h-4 w-4 text-purple-300" />
                  </div>
                  <div className="space-y-1.5 pt-1 text-xs">
                    {db.tracks.slice(0, 4).map((trk) => {
                      const count = students.filter((s) => s.track === trk.id).length;
                      return (
                        <div key={trk.id} className="flex items-center justify-between gap-2">
                          <span className="text-slate-300 truncate">
                            {trk.shortLabel || trk.label}
                          </span>
                          <strong className="font-mono text-white tabular-nums shrink-0">
                            {count} طالب
                          </strong>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-5 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>الدورات النشطة والأكواد</span>
                    <BookOpen className="h-4 w-4 text-purple-300" />
                  </div>
                  <p className="text-3xl font-extrabold text-white font-mono tabular-nums">
                    {db.courses.length}
                  </p>
                  <p className="text-xs text-slate-400 tabular-nums">
                    {unusedCodesCount} كود تفعيل متاح للتوزيع
                  </p>
                </div>

                <div className="rounded-2xl bg-[#110D1F] text-white p-5 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>حالة سيرفر البث (LiveKit)</span>
                    <Server className="h-4 w-4 text-purple-300" />
                  </div>
                  <p className="text-2xl font-extrabold text-white font-mono tabular-nums">
                    {liveSession.isLive ? `${liveSession.connectedCount} / 200` : '0 / 200'}
                  </p>
                  <p className="text-xs text-purple-300">
                    {liveSession.isLive
                      ? 'بث مباشر نشط الآن · سعة القاعة 200 طالب'
                      : 'السيرفر جاهز للبث · سعة 200 طالب'}
                  </p>
                </div>
              </div>

              {/* Super Admin Dynamic WhatsApp Support Number Control (Firestore settings/platform) */}
              {isSuperAdmin && (
                <section
                  aria-label="إعدادات الدعم الفني (واتساب)"
                  className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-emerald-500/25 overflow-hidden shadow-[0_12px_32px_-16px_rgba(16,185,129,0.3)]"
                >
                  <div className="px-5 py-3.5 bg-[#110D1F] text-white flex flex-wrap items-center justify-between gap-3 border-b border-purple-500/20">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-400/35 text-emerald-400">
                        <MessageCircle className="h-4 w-4" />
                      </div>
                      <div>
                        <h2 className="text-sm font-extrabold text-white">
                          إعدادات الدعم الفني (واتساب)
                        </h2>
                        <p className="text-[11px] text-slate-400">
                          يتحدّث تلقائياً في شاشة تسجيل الدخول ولوحة تحكم الطلاب عبر Cloud Firestore
                        </p>
                      </div>
                    </div>
                    <span
                      dir="ltr"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-400/30 px-3 py-1 font-mono text-xs font-bold text-emerald-300"
                    >
                      wa.me/{formatWhatsappCleanNumber(supportWaDraft)}
                    </span>
                  </div>

                  <form onSubmit={handleSaveSupportWhatsapp} className="p-5 space-y-3">
                    {supportWaSavedMsg && (
                      <div
                        role="status"
                        className="flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-400/35 px-3.5 py-2.5 text-xs font-bold text-emerald-200"
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>{supportWaSavedMsg}</span>
                      </div>
                    )}
                    {supportWaError && (
                      <div
                        role="alert"
                        className="rounded-xl bg-rose-500/15 border border-rose-400/35 px-3.5 py-2.5 text-xs font-bold text-rose-200"
                      >
                        {supportWaError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
                      <div className="lg:col-span-9">
                        <label
                          htmlFor="admin-support-whatsapp-input"
                          className="block text-xs font-bold text-slate-200 mb-1.5"
                        >
                          رقم هاتف الدعم الفني على واتساب (مثال: 07848333046 أو 9647848333046)
                        </label>
                        <div className="relative">
                          <input
                            id="admin-support-whatsapp-input"
                            type="tel"
                            dir="ltr"
                            value={supportWaDraft}
                            onChange={(e) => setSupportWaDraft(e.target.value)}
                            placeholder="07848333046"
                            className="w-full min-h-[46px] rounded-xl border border-purple-500/25 bg-[#110D1F]/85 pl-11 pr-4 text-left font-mono text-sm font-bold text-white tabular-nums placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
                          />
                          <Phone className="h-4 w-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      <div className="lg:col-span-3">
                        <button
                          type="submit"
                          disabled={supportWaSaving}
                          className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 px-5 text-xs sm:text-sm font-extrabold text-white shadow-[0_8px_22px_-6px_rgba(147,51,234,0.7)] hover:brightness-110 disabled:opacity-60 transition-all whitespace-nowrap cursor-pointer"
                        >
                          <Save className="h-4 w-4" />
                          <span>{supportWaSaving ? 'جاري الحفظ...' : 'حفظ الرقم'}</span>
                        </button>
                      </div>
                    </div>
                  </form>
                </section>
              )}

              {/* Breaking Announcement Banner Control Card */}
              {hasPermission('live_announcements') && (
                <section className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 overflow-hidden">
                  <div className="px-5 py-3.5 bg-[#110D1F] text-white flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Megaphone className="h-4 w-4 text-purple-300" />
                      <h2 className="text-sm font-extrabold">
                        شريط الإعلانات العاجلة (يظهر أعلى الصفحة الرئيسية للطلاب)
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={toggleBreakingAnnouncement}
                      className={`min-h-[36px] inline-flex items-center gap-1.5 rounded-xl px-3.5 text-xs font-extrabold transition-colors whitespace-nowrap ${
                        db.breakingAnnouncement.isActive
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 hover:bg-emerald-500/30'
                          : 'bg-white/[0.06] text-slate-300 border border-purple-500/20 hover:bg-purple-500/25'
                      }`}
                    >
                      {db.breakingAnnouncement.isActive ? (
                        <>
                          <Eye className="h-3.5 w-3.5" />
                          <span>ظاهر للطلاب حالياً — اضغطي للإخفاء</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3.5 w-3.5" />
                          <span>مخفي حالياً — اضغطي للإظهار</span>
                        </>
                      )}
                    </button>
                  </div>

                  <form onSubmit={handleSaveBreakingBanner} className="p-5 space-y-3">
                    {bannerSavedMsg && (
                      <div
                        role="status"
                        className="flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-400/35 px-3.5 py-2.5 text-xs font-bold text-emerald-200"
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>{bannerSavedMsg}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                      <div className="lg:col-span-7">
                        <label className="block text-xs font-bold text-slate-200 mb-1">
                          نص الإعلان العاجل
                        </label>
                        <input
                          type="text"
                          value={bannerDraft}
                          onChange={(e) => setBannerDraft(e.target.value)}
                          placeholder="مثال: تنبيه عاجل — محاضرة بث مباشر مجانية الساعة 8:00 مساءً اليوم!"
                          className="w-full min-h-[44px] rounded-xl border border-purple-500/25 bg-[#110D1F]/85 px-3.5 text-sm font-semibold text-white focus:border-purple-400 focus:outline-none"
                        />
                      </div>

                      <div className="lg:col-span-3">
                        <label className="block text-xs font-bold text-slate-200 mb-1">
                          الفئة المستهدفة
                        </label>
                        <select
                          value={bannerTarget}
                          onChange={(e) => setBannerTarget(e.target.value)}
                          className="w-full min-h-[44px] rounded-xl border border-purple-500/25 bg-white/[0.045] backdrop-blur-xl px-3 text-xs sm:text-sm font-bold text-white"
                        >
                          <option value="all">جميع الطلاب والمراحل</option>
                          {db.tracks.map((trk) => (
                            <option key={trk.id} value={trk.id}>
                              {trk.label} فقط
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="lg:col-span-2 flex items-end">
                        <button
                          type="submit"
                          className="w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 px-4 text-xs font-extrabold text-white hover:brightness-105 whitespace-nowrap"
                        >
                          <Save className="h-3.5 w-3.5" />
                          <span>حفظ ونشر</span>
                        </button>
                      </div>
                    </div>
                  </form>
                </section>
              )}

              {/* Quick Management Shortcuts */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => navigateToSection('moderators')}
                    className="rounded-2xl bg-[#110D1F] text-white border border-purple-500/20 p-5 text-right hover:border-purple-400/60 transition-colors flex flex-col justify-between gap-4"
                  >
                    <div>
                      <ShieldCheck className="h-5 w-5 text-purple-300 mb-3" />
                      <h2 className="text-base font-extrabold text-white">
                        إدارة المشرفين والأدمنية
                      </h2>
                      <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                        أضيفي مشرفين جدد، اكتبي دورهم الوظيفي يدوياً، وحددي صلاحياتهم بدقة ({activeModeratorsCount} نشط من {moderatorsCount}).
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-300">
                      <span>إدارة فريق المشرفين</span>
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </span>
                  </button>
                )}

                {canAccessAdminSection(currentUser, 'live') && (
                  <button
                    type="button"
                    onClick={() => navigateToSection('live')}
                    className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-5 text-right hover:border-purple-400/60 transition-colors flex flex-col justify-between gap-4"
                  >
                    <div>
                      <Radio className="h-5 w-5 text-purple-300 mb-3" />
                      <h2 className="text-base font-extrabold text-white">
                        استوديو البث المباشر
                      </h2>
                      <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                        ابدئي بثاً جديداً، شاركي الملزمة أو السبورة، وتحكمي بطلبات رفع اليد والمايكات.
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-white">
                      <span>فتح الاستوديو</span>
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </span>
                  </button>
                )}

                {canAccessAdminSection(currentUser, 'schedule') && (
                  <button
                    type="button"
                    onClick={() => navigateToSection('schedule')}
                    className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-5 text-right hover:border-purple-400/60 transition-colors flex flex-col justify-between gap-4"
                  >
                    <div>
                      <CalendarClock className="h-5 w-5 text-purple-300 mb-3" />
                      <h2 className="text-base font-extrabold text-white">
                        جدول البث الأسبوعي
                      </h2>
                      <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                        أضيفي وعدّلي أوقات البثوث الأسبوعية ({db.weeklySchedule.length} موعد) ليظهر لكل طالب جدول مرحلته فقط.
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-white">
                      <span>إدارة جدول البث</span>
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </span>
                  </button>
                )}

                {canAccessAdminSection(currentUser, 'assignments') && (
                  <button
                    type="button"
                    onClick={() => navigateToSection('assignments')}
                    className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-5 text-right hover:border-purple-400/60 transition-colors flex flex-col justify-between gap-4"
                  >
                    <div>
                      <ClipboardList className="h-5 w-5 text-purple-300 mb-3" />
                      <h2 className="text-base font-extrabold text-white">
                        التحاضير والواجبات
                      </h2>
                      <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                        أرسلي التحاضير اليومية لأي مرحلة أو صف أو فرع مع إشعار فوري للطلاب.
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-white">
                      <span>إرسال تحضير</span>
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </span>
                  </button>
                )}

                {canAccessAdminSection(currentUser, 'quizzes') && (
                  <button
                    type="button"
                    onClick={() => navigateToSection('quizzes')}
                    className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-5 text-right hover:border-purple-400/60 transition-colors flex flex-col justify-between gap-4"
                  >
                    <div>
                      <ClipboardCheck className="h-5 w-5 text-purple-300 mb-3" />
                      <h2 className="text-base font-extrabold text-white">
                        إدارة الكوزات والنتائج
                      </h2>
                      <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                        أنشئي كوزات مؤقّتة باختيارات متعددة وتابعي ترتيب الطلاب والنسب المئوية تلقائياً.
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-white">
                      <span>إدارة الكوزات</span>
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </span>
                  </button>
                )}

                {canAccessAdminSection(currentUser, 'payments') && (
                  <button
                    type="button"
                    onClick={() => navigateToSection('payments')}
                    className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-5 text-right hover:border-purple-400/60 transition-colors flex flex-col justify-between gap-4"
                  >
                    <div>
                      <CreditCard className="h-5 w-5 text-purple-300 mb-3" />
                      <h2 className="text-base font-extrabold text-white">
                        الدفع والاشتراكات الشهرية
                      </h2>
                      <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                        عدّلي رقم الماستر كارد والواتساب، وراجعي طلبات التجديد ({pendingRenewalsCount} بانتظار الموافقة).
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-white">
                      <span>إدارة الاشتراكات</span>
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </span>
                  </button>
                )}

                {canAccessAdminSection(currentUser, 'codes') && (
                  <button
                    type="button"
                    onClick={() => navigateToSection('codes')}
                    className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-5 text-right hover:border-purple-400/60 transition-colors flex flex-col justify-between gap-4"
                  >
                    <div>
                      <KeyRound className="h-5 w-5 text-purple-300 mb-3" />
                      <h2 className="text-base font-extrabold text-white">
                        توليد أكواد التفعيل
                      </h2>
                      <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                        أنشئي 10 أو 25 أو 50 كوداً لأي دورة مع نسخ سريع ومتابعة الأكواد المستخدمة.
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-white">
                      <span>إدارة الأكواد</span>
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </span>
                  </button>
                )}

                {canAccessAdminSection(currentUser, 'students') && (
                  <button
                    type="button"
                    onClick={() => navigateToSection('students')}
                    className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-5 text-right hover:border-purple-400/60 transition-colors flex flex-col justify-between gap-4"
                  >
                    <div>
                      <Users className="h-5 w-5 text-purple-300 mb-3" />
                      <h2 className="text-base font-extrabold text-white">
                        الطلاب وتقارير أولياء الأمور
                      </h2>
                      <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                        تابعي الحضور والغياب، أرسلي تقرير ولي الأمر عبر واتساب، وفكّي قفل الأجهزة.
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-white">
                      <span>جدول الطلاب</span>
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </span>
                  </button>
                )}

                {canAccessAdminSection(currentUser, 'stages') && (
                  <button
                    type="button"
                    onClick={() => navigateToSection('stages')}
                    className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-5 text-right hover:border-purple-400/60 transition-colors flex flex-col justify-between gap-4"
                  >
                    <div>
                      <Layers className="h-5 w-5 text-purple-300 mb-3" />
                      <h2 className="text-base font-extrabold text-white">
                        المراحل والأقسام والمواد
                      </h2>
                      <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                        أضيفي أو عدّلي المراحل والصفوف والفروع والمواد يدوياً ({db.tracks.length} مراحل نشطة).
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-white">
                      <span>إدارة الأقسام والمواد</span>
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </span>
                  </button>
                )}

                {canAccessAdminSection(currentUser, 'courses') && (
                  <button
                    type="button"
                    onClick={() => navigateToSection('courses')}
                    className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-5 text-right hover:border-purple-400/60 transition-colors flex flex-col justify-between gap-4"
                  >
                    <div>
                      <BookOpen className="h-5 w-5 text-purple-300 mb-3" />
                      <h2 className="text-base font-extrabold text-white">
                        الدورات والملازم
                      </h2>
                      <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                        أضيفي الدورات والمحاضرات والملفات الدراسية وحدّدي أسعارها لكل مرحلة ({db.courses.length} دورة).
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-white">
                      <span>إدارة الدورات</span>
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </span>
                  </button>
                )}

                {canAccessAdminSection(currentUser, 'store') && (
                  <button
                    type="button"
                    onClick={() => navigateToSection('store')}
                    className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-5 text-right hover:border-purple-400/60 transition-colors flex flex-col justify-between gap-4"
                  >
                    <div>
                      <ShoppingBag className="h-5 w-5 text-purple-300 mb-3" />
                      <h2 className="text-base font-extrabold text-white">
                        إدارة الملازم والمرشحات (المتجر)
                      </h2>
                      <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                        أضيفي الملازم الورقية، حدّدي أجور التوصيل لبغداد والمحافظات، وتابعي الطلبات ({preparingStoreOrdersCount} قيد التجهيز).
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-white">
                      <span>إدارة المتجر</span>
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </span>
                  </button>
                )}

                {canAccessAdminSection(currentUser, 'cv') && (
                  <button
                    type="button"
                    onClick={() => navigateToSection('cv')}
                    className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-5 text-right hover:border-purple-400/60 transition-colors flex flex-col justify-between gap-4"
                  >
                    <div>
                      <FileBadge className="h-5 w-5 text-purple-300 mb-3" />
                      <h2 className="text-base font-extrabold text-white">
                        إدارة السيرة الذاتية (CV)
                      </h2>
                      <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                        عدّلي معلوماتك العلمية، مكان السكن والعنوان، الإنجازات، وأرقام التواصل الظاهرة للطلاب.
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-white">
                      <span>تعديل السيرة الذاتية</span>
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </span>
                  </button>
                )}

                {canAccessAdminSection(currentUser, 'complaints') && (
                  <button
                    type="button"
                    onClick={() => navigateToSection('complaints')}
                    className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-5 text-right hover:border-purple-400/60 transition-colors flex flex-col justify-between gap-4"
                  >
                    <div>
                      <MessageSquareWarning className="h-5 w-5 text-purple-300 mb-3" />
                      <h2 className="text-base font-extrabold text-white">
                        الشكاوى الواردة
                      </h2>
                      <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                        راجعي شكاوى الطلبة وردّي عليها مع تحديث الحالة ({pendingComplaintsCount} قيد المراجعة).
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-white">
                      <span>عرض الشكاوى</span>
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </span>
                  </button>
                )}

                {canAccessAdminSection(currentUser, 'inquiries') && (
                  <button
                    type="button"
                    onClick={() => navigateToSection('inquiries')}
                    className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-5 text-right hover:border-purple-400/60 transition-colors flex flex-col justify-between gap-4"
                  >
                    <div>
                      <MessageCircleQuestion className="h-5 w-5 text-purple-300 mb-3" />
                      <h2 className="text-base font-extrabold text-white">
                        استفسارات الطلاب
                      </h2>
                      <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                        أجيبي عن أسئلة الطلاب الدراسية والعامة ({pendingInquiriesCount} بانتظار الرد) لتصل فوراً كإشعار.
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-white">
                      <span>عرض الاستفسارات</span>
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </span>
                  </button>
                )}
              </div>

              {/* Recent Student Registrations Summary Table */}
              {hasPermission('students_attendance') && (
                <div className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 overflow-hidden">
                  <div className="px-5 py-4 border-b border-purple-500/15 flex items-center justify-between">
                    <h2 className="text-sm font-extrabold text-white">
                      أحدث الطلاب المسجّلين في المنصة
                    </h2>
                    <button
                      type="button"
                      onClick={() => navigateToSection('students')}
                      className="text-xs font-bold text-purple-300 hover:underline"
                    >
                      عرض الكل
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-purple-500/15 bg-white/[0.04] text-xs font-bold text-slate-400">
                          <th className="py-2.5 px-4">الاسم</th>
                          <th className="py-2.5 px-4">الهاتف</th>
                          <th className="py-2.5 px-4">المسار</th>
                          <th className="py-2.5 px-4">الجهاز</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-purple-500/15 text-xs">
                        {students.slice(0, 5).map((s) => (
                          <tr key={s.id} className="hover:bg-white/[0.08]">
                            <td className="py-3 px-4 font-bold text-white">{s.fullName}</td>
                            <td
                              className="py-3 px-4 font-mono text-slate-200 tabular-nums"
                              dir="ltr"
                            >
                              {s.phone}
                            </td>
                            <td className="py-3 px-4 text-slate-300">
                              {getTrackName(s.track)} · {s.subStage}
                              {s.branch ? ` (${s.branch})` : ''}
                            </td>
                            <td
                              className="py-3 px-4 font-mono text-slate-400 tabular-nums"
                              dir="ltr"
                            >
                              {s.deviceId ?? 'مفتوح'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {section === 'moderators' && isSuperAdmin && <AdminModerators />}
          {section === 'live' && canAccessAdminSection(currentUser, 'live') && (
            <TeacherLiveStudio />
          )}
          {section === 'schedule' && canAccessAdminSection(currentUser, 'schedule') && (
            <AdminLiveSchedule />
          )}
          {section === 'assignments' && canAccessAdminSection(currentUser, 'assignments') && (
            <AdminAssignments />
          )}
          {section === 'quizzes' && canAccessAdminSection(currentUser, 'quizzes') && (
            <AdminQuizzes />
          )}
          {section === 'payments' && canAccessAdminSection(currentUser, 'payments') && (
            <AdminPayments />
          )}
          {section === 'store' && canAccessAdminSection(currentUser, 'store') && <AdminStore />}
          {section === 'codes' && canAccessAdminSection(currentUser, 'codes') && <AdminCodes />}
          {section === 'students' && canAccessAdminSection(currentUser, 'students') && (
            <AdminStudents />
          )}
          {section === 'courses' && canAccessAdminSection(currentUser, 'courses') && (
            <AdminCourses />
          )}
          {section === 'stages' && canAccessAdminSection(currentUser, 'stages') && <AdminStages />}
          {section === 'cv' && isSuperAdmin && <AdminTeacherCV />}
          {section === 'complaints' && canAccessAdminSection(currentUser, 'complaints') && (
            <AdminComplaints />
          )}
          {section === 'inquiries' && canAccessAdminSection(currentUser, 'inquiries') && (
            <AdminInquiries />
          )}
        </main>
      </div>

      <SecurityPinModal
        isOpen={showResetPinModal}
        requireSuperAdmin
        title="تأكيد إعادة ضبط البيانات التجريبية"
        itemLabel="إعادة ضبط الذاكرة المحلية للمنصة"
        warningDetail="سيؤدي هذا الإجراء إلى إعادة البيانات المحلية للوضع الافتراضي. يتطلب كلمة مرور السوبر أدمن (الأستاذة تبارك الزيرجاوي) للمتابعة."
        onConfirm={() => {
          setShowResetPinModal(false);
          resetDemoPlatform();
        }}
        onCancel={() => setShowResetPinModal(false)}
      />
    </div>
  );
};
