import React from 'react';
import {
  BookOpen,
  FileText,
  GraduationCap,
  Layers,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { BackButton } from './BackButton';

export type DynamicCoverCategory =
  | 'course'
  | 'booklet'
  | 'predictions'
  | 'stage'
  | 'default';

interface DynamicThemedCoverProps {
  title?: string;
  badgeText?: string;
  category?: DynamicCoverCategory;
  className?: string;
}

/**
 * Automatic Royal Navy (#0F172A / #1E293B) & Gold (#D4AF37 / #F59E0B) Cover Art.
 * Rendered automatically whenever a dynamic course, booklet, prediction, or stage
 * is created without a custom image or if an image fails to load.
 */
export const DynamicThemedCover: React.FC<DynamicThemedCoverProps> = ({
  title,
  badgeText,
  category = 'default',
  className = '',
}) => {
  const Icon =
    category === 'predictions'
      ? Sparkles
      : category === 'booklet'
        ? FileText
        : category === 'stage'
          ? Layers
          : category === 'course'
            ? GraduationCap
            : category === 'default'
              ? BookOpen
              : ShoppingBag;

  const defaultLabel =
    category === 'predictions'
      ? 'مرشحات وزارية'
      : category === 'booklet'
        ? 'ملزمة مطبوعة'
        : category === 'stage'
          ? 'قسم دراسي معتمد'
          : category === 'course'
            ? 'دورة تعليمية'
            : 'منصة الأستاذة تبارك';

  return (
    <div
      className={`relative overflow-hidden flex flex-col items-center justify-center bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0B1120] text-center p-5 select-none ${className}`}
    >
      {/* Subtle Architectural Gold Frame Lines */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-2.5 rounded-xl border border-[#D4AF37]/25"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 -left-10 h-28 w-28 rounded-full bg-[#D4AF37]/10 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-10 -right-10 h-28 w-28 rounded-full bg-[#F59E0B]/10 blur-2xl"
      />

      <div className="relative z-10 flex flex-col items-center gap-2.5 max-w-[90%]">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#F59E0B] text-slate-950 shadow-md">
          <Icon className="h-6 w-6" />
        </div>

        <span className="text-[11px] font-extrabold text-[#D4AF37] tracking-wide">
          {badgeText || defaultLabel}
        </span>

        {title && (
          <p className="text-xs sm:text-sm font-extrabold text-white leading-snug line-clamp-2">
            {title}
          </p>
        )}

        <div className="h-0.5 w-10 rounded-full bg-[#D4AF37]/60 mt-0.5" />
      </div>
    </div>
  );
};

interface PlatformCardProps {
  children: React.ReactNode;
  variant?: 'surface' | 'navy' | 'amber';
  className?: string;
}

/**
 * Reusable themed card container so all dynamic additions inherit identical visual tokens.
 */
export const PlatformCard: React.FC<PlatformCardProps> = ({
  children,
  variant = 'surface',
  className = '',
}) => {
  const styles =
    variant === 'navy'
      ? 'bg-[#0F172A] text-white border border-slate-800'
      : variant === 'amber'
        ? 'bg-amber-50/70 text-slate-900 border border-amber-200'
        : 'bg-white text-slate-900 border border-slate-200';

  return <div className={`rounded-2xl ${styles} ${className}`}>{children}</div>;
};

interface PlatformSubPageBarProps {
  onBack: () => void;
  backLabel?: string;
  sectionLabel?: string;
  rightAction?: React.ReactNode;
}

/**
 * Unified top navigation bar for sub-pages with consistent BackButton + context label.
 */
export const PlatformSubPageBar: React.FC<PlatformSubPageBarProps> = ({
  onBack,
  backLabel = 'رجوع',
  sectionLabel,
  rightAction,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <BackButton onClick={onBack} label={backLabel} variant="light" />
        {sectionLabel && (
          <span className="text-xs sm:text-sm font-bold text-slate-500 truncate">
            {sectionLabel}
          </span>
        )}
      </div>
      {rightAction && <div className="shrink-0">{rightAction}</div>}
    </div>
  );
};
