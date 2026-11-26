import React, { useMemo, useState } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Pencil,
  Trash2,
  Ban,
  CheckCircle2,
  Eye,
  EyeOff,
  AlertCircle,
  Lock,
  KeyRound,
  X,
  CheckSquare,
  Square,
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { AdminPermissionKey, UserProfile } from '../../types';
import {
  ADMIN_PERMISSION_DEFINITIONS,
  ALL_ADMIN_PERMISSIONS,
  getPermissionMeta,
  isSuperAdminUser,
} from '../../utils/adminPermissions';
import { SecurityPinModal } from './SecurityPinModal';

const ROLE_SUGGESTIONS = [
  'مسؤول الملازم والتوصيل',
  'مشرف الكوزات والتحاضير',
  'مسؤول الاشتراكات والطلاب',
  'مسؤول الشكاوى والاستفسارات',
  'مشرف البث المباشر والجدول',
];

export const AdminModerators: React.FC = () => {
  const {
    db,
    isSuperAdmin,
    addModerator,
    updateModerator,
    toggleModeratorActive,
    deleteModerator,
  } = usePlatform();

  // Form state (Add or Edit Moderator)
  const [editingModId, setEditingModId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [adminRoleTitle, setAdminRoleTitle] = useState('');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<AdminPermissionKey[]>([
    'store_delivery',
    'complaints_inquiries',
  ]);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [modToDelete, setModToDelete] = useState<UserProfile | null>(null);

  const moderators = useMemo(
    () => db.users.filter((u) => u.role === 'admin' && !isSuperAdminUser(u)),
    [db.users]
  );

  // Hard security guard — strictly Super Admin only
  if (!isSuperAdmin) {
    return (
      <div className="rounded-2xl bg-white border border-red-200 p-8 text-center space-y-2">
        <Lock className="h-8 w-8 text-red-600 mx-auto" />
        <h1 className="text-lg font-extrabold text-slate-900">صلاحية محصورة بالسوبر أدمن</h1>
        <p className="text-sm text-slate-600">
          قسم إدارة المشرفين والأدمنية متاح حصرياً لحساب السوبر أدمن (الأستاذة تبارك الأزيرجاوي) فقط.
        </p>
      </div>
    );
  }

  const notify = (msg: string) => {
    setFeedback(msg);
    window.setTimeout(() => setFeedback(null), 5000);
  };

  const resetForm = () => {
    setEditingModId(null);
    setFullName('');
    setAdminRoleTitle('');
    setLoginIdentifier('');
    setPassword('');
    setShowPassword(false);
    setSelectedPermissions(['store_delivery', 'complaints_inquiries']);
    setFormError(null);
  };

  const togglePermission = (key: AdminPermissionKey) => {
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleEditModerator = (mod: UserProfile) => {
    setEditingModId(mod.id);
    setFullName(mod.fullName);
    setAdminRoleTitle(mod.adminRoleTitle ?? '');
    setLoginIdentifier(mod.username || mod.phone);
    setPassword(mod.password);
    setSelectedPermissions(mod.permissions ?? []);
    setFormError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (editingModId) {
      const res = updateModerator(editingModId, {
        fullName,
        adminRoleTitle,
        loginIdentifier,
        password,
        permissions: selectedPermissions,
      });
      if (!res.success) {
        setFormError(res.error ?? 'تعذر تحديث بيانات المشرف.');
        return;
      }
      notify(`تم تحديث صلاحيات ودور المشرف «${fullName.trim()}» بنجاح.`);
      resetForm();
    } else {
      const res = addModerator({
        fullName,
        adminRoleTitle,
        loginIdentifier,
        password,
        permissions: selectedPermissions,
      });
      if (!res.success) {
        setFormError(res.error ?? 'تعذر إضافة المشرف.');
        return;
      }
      notify(
        `تم إنشاء حساب المشرف «${fullName.trim()}» (${adminRoleTitle.trim()}) بنجاح! يمكنه الدخول الآن من المسار السري /admin.`
      );
      resetForm();
    }
  };

  const handleToggleStatus = (mod: UserProfile) => {
    toggleModeratorActive(mod.id);
    notify(
      mod.isActive
        ? `تم إيقاف حساب المشرف «${mod.fullName}» مؤقتاً ولن يتمكن من الدخول لحين إعادة التفعيل.`
        : `تم إعادة تفعيل حساب المشرف «${mod.fullName}» بنجاح.`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#B48A1E] mb-1">
            <ShieldCheck className="h-4 w-4" />
            <span>صلاحية السوبر أدمن الحصرية — الأستاذة تبارك الأزيرجاوي</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            إدارة المشرفين والأدمنية (Sub-Admins &amp; Moderators)
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            أضيفي مشرفين ومساعدين بأسماء أدوار حرة وصلاحيات مخصصة بدقة، مع إمكانية تعديل الصلاحيات أو الإيقاف الفوري في أي وقت.
          </p>
        </div>

        <div className="rounded-xl bg-[#0F172A] text-white px-4 py-3 text-xs shrink-0 space-y-0.5">
          <p className="text-slate-400">عدد المشرفين الحاليين</p>
          <p className="font-mono text-lg font-extrabold text-[#D4AF37] tabular-nums">
            {moderators.length} مشرف ({moderators.filter((m) => m.isActive).length} نشط)
          </p>
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

      {/* Add / Edit Moderator Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm"
      >
        <div className="bg-[#0F172A] px-5 py-4 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4AF37] text-slate-950 shrink-0">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white">
                {editingModId ? 'تعديل صلاحيات ودور المشرف' : 'إضافة مشرف / أدمن جديد'}
              </h2>
              <p className="text-[11px] text-amber-300">
                يدخل المشرف عبر الرابط السري /admin ولا يرى سوى الأقسام المصرح له بها فقط.
              </p>
            </div>
          </div>

          {editingModId && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/10"
            >
              <X className="h-3.5 w-3.5" />
              <span>إلغاء التعديل</span>
            </button>
          )}
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {formError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs sm:text-sm font-bold text-red-800"
            >
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Moderator Basic Identity & Credentials */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="mod-fullname" className="block text-xs font-bold text-slate-700 mb-1.5">
                الاسم الكامل للمشرف
              </label>
              <input
                id="mod-fullname"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="مثال: علي حسين الساعدي"
                className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-900 focus:border-[#0F172A] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="mod-role" className="block text-xs font-bold text-slate-700 mb-1.5">
                المسمى الوظيفي / الدور (اكتبيه يدوياً بحرية)
              </label>
              <input
                id="mod-role"
                type="text"
                list="moderator-role-suggestions"
                required
                value={adminRoleTitle}
                onChange={(e) => setAdminRoleTitle(e.target.value)}
                placeholder="مثال: مسؤول الملازم والتوصيل / مشرف الكوزات والتحاضير"
                className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-900 focus:border-[#0F172A] focus:outline-none"
              />
              <datalist id="moderator-role-suggestions">
                {ROLE_SUGGESTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>

            <div>
              <label htmlFor="mod-login" className="block text-xs font-bold text-slate-700 mb-1.5">
                بيانات الدخول: اسم المستخدم أو رقم الهاتف
              </label>
              <input
                id="mod-login"
                type="text"
                dir="ltr"
                required
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                placeholder="mod_store أو 0771XXXXXXX"
                className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-left font-mono text-sm font-bold text-slate-900 focus:border-[#0F172A] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="mod-password" className="block text-xs font-bold text-slate-700 mb-1.5">
                كلمة المرور / رمز الدخول الخاص بالمشرف
              </label>
              <div className="relative">
                <input
                  id="mod-password"
                  type={showPassword ? 'text' : 'password'}
                  dir="ltr"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white pl-11 pr-3.5 text-left font-mono text-sm font-bold text-slate-900 focus:border-[#0F172A] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Granular Permissions Checkboxes */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  تحديد الصلاحيات الممنوحة ({selectedPermissions.length} من {ADMIN_PERMISSION_DEFINITIONS.length})
                </h3>
                <p className="text-xs text-slate-500">
                  تبقى إدارة المشرفين وتعديل السيرة الذاتية (CV) محصورة بحساب السوبر أدمن فقط.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPermissions([...ALL_ADMIN_PERMISSIONS])}
                  className="min-h-[34px] rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:border-[#0F172A]"
                >
                  تحديد الكل
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPermissions([])}
                  className="min-h-[34px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  إلغاء التحديد
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {ADMIN_PERMISSION_DEFINITIONS.map((perm) => {
                const checked = selectedPermissions.includes(perm.key);
                const isDeletePerm = perm.key === 'can_delete';
                return (
                  <label
                    key={perm.key}
                    className={`cursor-pointer rounded-xl border p-3.5 flex items-start gap-3 transition-colors select-none ${
                      checked
                        ? isDeletePerm
                          ? 'border-red-400 bg-red-50/60'
                          : 'border-[#0F172A] bg-amber-50/40'
                        : 'border-slate-200 bg-slate-50/40 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePermission(perm.key)}
                      className="sr-only"
                    />
                    <span className="mt-0.5 shrink-0">
                      {checked ? (
                        <CheckSquare
                          className={`h-5 w-5 ${isDeletePerm ? 'text-red-600' : 'text-[#0F172A]'}`}
                        />
                      ) : (
                        <Square className="h-5 w-5 text-slate-400" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 space-y-0.5">
                      <span className="block text-xs sm:text-sm font-extrabold text-slate-900 leading-snug">
                        {perm.label}
                      </span>
                      <span className="block text-[11px] text-slate-500 leading-relaxed">
                        {perm.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <button
              type="submit"
              className="min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#D4AF37] to-[#F59E0B] px-6 text-sm font-extrabold text-slate-950 hover:brightness-105"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>{editingModId ? 'حفظ تعديلات المشرف' : 'إضافة المشرف وتفعيل الحساب'}</span>
            </button>
            {editingModId && (
              <button
                type="button"
                onClick={resetForm}
                className="min-h-[46px] rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                إلغاء
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Current Moderators Table */}
      <section className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              قائمة المشرفين والأدمنية الحاليين ({moderators.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              تابعي أدوار المشرفين، عدّلي صلاحياتهم فوراً، أو أوقفي أي حساب بضغطة زر.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-200 px-3 py-1.5 text-[11px] font-bold text-slate-800">
            <KeyRound className="h-3.5 w-3.5 text-[#B48A1E]" />
            <span>
              دخول المشرفين من الرابط السري:{' '}
              <strong className="font-mono text-[#0F172A]" dir="ltr">
                /admin
              </strong>
            </span>
          </div>
        </div>

        {moderators.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            لا يوجد مشرفون مضافون حالياً. يمكنكِ إضافة أول مشرف من النموذج أعلاه.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
                  <th className="py-3 px-4">المشرف وبيانات الدخول</th>
                  <th className="py-3 px-4">الدور الوظيفي</th>
                  <th className="py-3 px-4">الصلاحيات الممنوحة</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4 text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {moderators.map((mod) => {
                  const perms = mod.permissions ?? [];
                  return (
                    <tr key={mod.id} className="hover:bg-slate-50/70 align-top">
                      <td className="py-4 px-4 whitespace-nowrap">
                        <p className="text-sm font-extrabold text-slate-900">{mod.fullName}</p>
                        <div className="mt-1 space-y-0.5 text-[11px] text-slate-500 font-mono" dir="ltr">
                          <div>
                            {mod.username ? `User: ${mod.username}` : `Phone: ${mod.phone}`}
                            {mod.username && mod.phone && mod.phone !== mod.username
                              ? ` · ${mod.phone}`
                              : ''}
                          </div>
                          <div className="text-slate-400">Pass: {mod.password}</div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span className="inline-flex items-center rounded-lg bg-[#0F172A] px-2.5 py-1 text-xs font-bold text-[#D4AF37]">
                          {mod.adminRoleTitle || 'مشرف عام'}
                        </span>
                      </td>

                      <td className="py-4 px-4 min-w-[240px]">
                        <div className="flex flex-wrap gap-1.5">
                          {perms.map((pKey) => {
                            const meta = getPermissionMeta(pKey);
                            return (
                              <span
                                key={pKey}
                                className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-bold border ${
                                  pKey === 'can_delete'
                                    ? 'bg-red-50 text-red-700 border-red-200'
                                    : 'bg-slate-100 text-slate-800 border-slate-200'
                                }`}
                              >
                                {meta?.shortLabel ?? pKey}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-extrabold ${
                            mod.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              mod.isActive ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                          />
                          <span>{mod.isActive ? 'نشط' : 'موقوف مؤقتاً'}</span>
                        </span>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditModerator(mod)}
                            className="min-h-[36px] inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-800 hover:border-[#0F172A]"
                          >
                            <Pencil className="h-3.5 w-3.5 text-[#B48A1E]" />
                            <span>تعديل الصلاحيات والدور</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(mod)}
                            className={`min-h-[36px] inline-flex items-center gap-1 rounded-lg px-2.5 text-xs font-bold border ${
                              mod.isActive
                                ? 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                                : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            }`}
                          >
                            {mod.isActive ? (
                              <>
                                <Ban className="h-3.5 w-3.5" />
                                <span>إيقاف مؤقت</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>تفعيل الحساب</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => setModToDelete(mod)}
                            className="min-h-[36px] inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 text-xs font-bold text-red-700 hover:bg-red-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>حذف المشرف</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Mandatory Super Admin PIN Confirmation for Deleting Moderators */}
      <SecurityPinModal
        isOpen={Boolean(modToDelete)}
        requireSuperAdmin={true}
        title="حذف حساب المشرف نهائياً"
        itemLabel={
          modToDelete ? `${modToDelete.fullName} (${modToDelete.adminRoleTitle || 'مشرف'})` : ''
        }
        warningDetail="سيتم حذف حساب المشرف وسحب جميع صلاحياته من لوحة التحكم فوراً."
        onConfirm={() => {
          if (!modToDelete) return;
          deleteModerator(modToDelete.id);
          notify(`تم حذف حساب المشرف «${modToDelete.fullName}» نهائياً.`);
          setModToDelete(null);
        }}
        onCancel={() => setModToDelete(null)}
      />
    </div>
  );
};
