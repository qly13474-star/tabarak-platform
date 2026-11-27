import React from 'react';
import { BookOpen, GraduationCap, Info, Radio, Sparkles } from 'lucide-react';
import { BackButton } from './BackButton';

export type DynamicCoverCategory = 'course' | 'booklet' | 'live' | 'stage' | 'default' | string;

interface DynamicThemedCoverProps {
  title: string;
  badgeText?: string;
  category?: DynamicCoverCategory;
  className?: string;
}

export const DynamicThemedCover: React.FC<DynamicThemedCoverProps> = ({
  title,
  badgeText,
  category = 'default',
  className = '',
}) => {
  const Icon =
    category === 'live'
      ? Radio
      : category === 'booklet'
        ? BookOpen
        : GraduationCap;

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-[#1D113A] via-[#120B24] to-[#090712] text-white flex flex-col items-center justify-center p-5 text-center select-none ${className}`}
    >
      {/* Ambient purple radial glow */}
      <div
        className="pointer-events-none absolute -top-12 -right-12 h-36 w-36 rounded-full bg-purple-600/30 blur-2xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-fuchsia-600/20 blur-2xl"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center gap-2.5 max-w-full">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 via-violet-600 to-fuchsia-600 text-white shadow-[0_0_24px_-4px_rgba(168,85,247,0.8)] border border-purple-300/35">
          <Icon className="h-6 w-6" />
        </div>
        {badgeText && (
          <span className="inline-flex items-center gap-1 rounded-xl bg-purple-500/20 border border-purple-400/35 px-2.5 py-0.5 text-[10px] font-extrabold text-purple-200">
            <Sparkles className="h-3 w-3 text-fuchsia-300" />
            <span>{badgeText}</span>
          </span>
        )}
        <p className="text-xs sm:text-sm font-black text-white leading-snug line-clamp-2 px-2">
          {title}
        </p>
        <span className="text-[10px] font-bold text-purple-300/85">
          منصة الأستاذة تبارك الزيرجاوي
        </span>
      </div>
    </div>
  );
};

interface PlatformSubPageBarProps {
  onBack: () => void;
  sectionLabel: string;
  backLabel?: string;
  rightSlot?: React.ReactNode;
}

export const PlatformSubPageBar: React.FC<PlatformSubPageBarProps> = ({
  onBack,
  sectionLabel,
  backLabel = 'العودة للرئيسية',
  rightSlot,
}) => (
  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 px-4 py-3 shadow-[0_10px_30px_-14px_rgba(9,7,18,0.85)]">
    <div className="flex items-center gap-3 min-w-0">
      <BackButton onClick={onBack} label={backLabel} variant="subtle" size="sm" />
      <div className="h-5 w-px bg-purple-500/25 shrink-0" />
      <span className="text-xs sm:text-sm font-black text-white truncate">{sectionLabel}</span>
    </div>
    {rightSlot && <div className="flex items-center gap-2 shrink-0">{rightSlot}</div>}
  </div>
);

interface PageSectionHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  variant?: 'dark' | 'light';
}

export const PageSectionHeader: React.FC<PageSectionHeaderProps> = ({
  title,
  subtitle,
  eyebrow,
  icon,
  actions,
  variant = 'light',
}) => {
  if (variant === 'dark') {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-[#1A1033] via-[#130C26] to-[#0E091D] border border-purple-500/30 p-5 sm:p-6 text-white shadow-[0_16px_44px_-16px_rgba(124,58,237,0.45)]">
        <div
          className="pointer-events-none absolute -top-16 -left-16 h-48 w-48 rounded-full bg-purple-600/20 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            {icon && (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 via-violet-600 to-fuchsia-600 text-white shadow-[0_0_24px_-4px_rgba(168,85,247,0.7)] border border-purple-300/30">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              {eyebrow && (
                <p className="text-[11px] font-extrabold text-purple-300 flex items-center gap-1.5 mb-1">
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-fuchsia-400" />
                  <span>{eyebrow}</span>
                </p>
              )}
              <h2 className="text-lg sm:text-2xl font-black text-white leading-tight">{title}</h2>
              {subtitle && (
                <p className="mt-1.5 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/25 p-5 sm:p-6 shadow-[0_12px_36px_-14px_rgba(9,7,18,0.8)]">
      <div
        className="pointer-events-none absolute -top-14 -left-10 h-36 w-36 rounded-full bg-purple-600/15 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          {icon && (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600/90 via-violet-600/90 to-fuchsia-600/90 text-white shadow-[0_0_20px_-4px_rgba(168,85,247,0.6)] border border-purple-300/25">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[11px] font-extrabold text-purple-300 mb-0.5">{eyebrow}</p>
            )}
            <h2 className="text-lg sm:text-xl font-black text-white leading-tight">{title}</h2>
            {subtitle && (
              <p className="mt-1 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
};

interface StageBadgeProps {
  stageName?: string;
  gradeName?: string;
  size?: 'sm' | 'md';
  tone?: 'navy' | 'gold' | 'soft';
}

export const StageBadge: React.FC<StageBadgeProps> = ({
  stageName,
  gradeName,
  size = 'sm',
  tone = 'soft',
}) => {
  const label = [stageName, gradeName].filter(Boolean).join(' · ') || 'غير محدد';
  const toneClasses =
    tone === 'navy'
      ? 'bg-[#161029] text-purple-200 border border-purple-500/35'
      : tone === 'gold'
        ? 'bg-gradient-to-l from-purple-600/30 to-fuchsia-600/30 text-purple-100 border border-purple-400/45'
        : 'bg-purple-500/15 text-purple-200 border border-purple-500/30';

  const sizeClasses =
    size === 'md' ? 'px-3 py-1.5 text-xs gap-1.5' : 'px-2.5 py-1 text-[11px] gap-1';

  return (
    <span
      className={`inline-flex items-center rounded-xl font-extrabold leading-none ${toneClasses} ${sizeClasses}`}
    >
      <GraduationCap className="h-3.5 w-3.5 shrink-0 text-purple-300" />
      <span className="truncate max-w-[230px]">{label}</span>
    </span>
  );
};

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: React.ReactNode;
  accent?: 'navy' | 'gold' | 'emerald' | 'blue' | 'purple' | 'rose';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  sublabel,
  icon,
  accent = 'purple',
  onClick,
}) => {
  const accentMap: Record<string, { iconBg: string; border: string; valueColor: string }> = {
    navy: {
      iconBg: 'bg-purple-500/20 text-purple-300 border border-purple-400/30',
      border: 'border-purple-500/20 hover:border-purple-400/50',
      valueColor: 'text-white',
    },
    gold: {
      iconBg: 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-400/30',
      border: 'border-fuchsia-500/25 hover:border-fuchsia-400/55',
      valueColor: 'text-white',
    },
    emerald: {
      iconBg: 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30',
      border: 'border-emerald-500/25 hover:border-emerald-400/50',
      valueColor: 'text-white',
    },
    blue: {
      iconBg: 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30',
      border: 'border-indigo-500/25 hover:border-indigo-400/50',
      valueColor: 'text-white',
    },
    purple: {
      iconBg: 'bg-violet-500/20 text-violet-300 border border-violet-400/35',
      border: 'border-purple-500/25 hover:border-purple-400/55',
      valueColor: 'text-white',
    },
    rose: {
      iconBg: 'bg-rose-500/15 text-rose-300 border border-rose-400/30',
      border: 'border-rose-500/25 hover:border-rose-400/50',
      valueColor: 'text-white',
    },
  };

  const styles = accentMap[accent] || accentMap.purple;
  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`text-right w-full rounded-2xl bg-white/[0.045] backdrop-blur-xl border ${styles.border} p-4 sm:p-5 transition-all shadow-[0_10px_30px_-14px_rgba(9,7,18,0.85)] ${
        onClick
          ? 'hover:bg-white/[0.07] hover:shadow-[0_14px_34px_-12px_rgba(124,58,237,0.4)] active:scale-[0.99] cursor-pointer'
          : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-300 truncate">{label}</p>
          <p
            className={`mt-1.5 text-2xl sm:text-3xl font-black font-mono tabular-nums leading-none ${styles.valueColor}`}
          >
            {value}
          </p>
          {sublabel && (
            <p className="mt-2 text-[11px] font-medium text-purple-300/85 truncate">{sublabel}</p>
          )}
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles.iconBg}`}
        >
          {icon}
        </div>
      </div>
    </Wrapper>
  );
};

interface StatusBadgeProps {
  label: string;
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'gold';
  dot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  tone = 'neutral',
  dot = false,
}) => {
  const toneMap: Record<string, { box: string; dotColor: string }> = {
    success: {
      box: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/35',
      dotColor: 'bg-emerald-400',
    },
    warning: {
      box: 'bg-amber-500/15 text-amber-300 border-amber-400/35',
      dotColor: 'bg-amber-400',
    },
    danger: {
      box: 'bg-rose-500/15 text-rose-300 border-rose-400/35',
      dotColor: 'bg-rose-400',
    },
    info: {
      box: 'bg-sky-500/15 text-sky-300 border-sky-400/35',
      dotColor: 'bg-sky-400',
    },
    gold: {
      box: 'bg-purple-500/20 text-purple-200 border-purple-400/45',
      dotColor: 'bg-purple-400',
    },
    neutral: {
      box: 'bg-white/5 text-slate-300 border-purple-500/20',
      dotColor: 'bg-slate-400',
    },
  };

  const style = toneMap[tone] || toneMap.neutral;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px] font-extrabold leading-none ${style.box}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${style.dotColor}`} />}
      <span>{label}</span>
    </span>
  );
};

interface EmptyStateCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyStateCard: React.FC<EmptyStateCardProps> = ({
  icon,
  title,
  description,
  action,
}) => (
  <div className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-dashed border-purple-500/35 p-8 sm:p-10 text-center">
    <div className="mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/15 border border-purple-400/30 text-purple-300">
      {icon}
    </div>
    <h3 className="text-base font-black text-white">{title}</h3>
    <p className="mt-1.5 text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
      {description}
    </p>
    {action && <div className="mt-5 flex justify-center">{action}</div>}
  </div>
);

interface InfoCalloutProps {
  title?: string;
  children: React.ReactNode;
  tone?: 'gold' | 'info' | 'warning';
}

export const InfoCallout: React.FC<InfoCalloutProps> = ({
  title,
  children,
  tone = 'gold',
}) => {
  const styles =
    tone === 'warning'
      ? 'bg-amber-500/10 border-amber-400/35 text-amber-100'
      : tone === 'info'
        ? 'bg-sky-500/10 border-sky-400/35 text-sky-100'
        : 'bg-purple-500/10 border-purple-400/35 text-purple-100';

  return (
    <div className={`rounded-2xl border backdrop-blur-xl p-4 text-xs sm:text-sm leading-relaxed ${styles}`}>
      <div className="flex items-start gap-2.5">
        <Info className="h-4 w-4 shrink-0 mt-0.5 text-purple-300" />
        <div className="min-w-0">
          {title && <p className="font-extrabold text-white mb-0.5">{title}</p>}
          <div className="text-slate-200">{children}</div>
        </div>
      </div>
    </div>
  );
};
