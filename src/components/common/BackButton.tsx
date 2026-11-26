import React from 'react';
import { ArrowRight } from 'lucide-react';

export interface BackButtonProps {
  onClick: () => void;
  label?: string;
  variant?: 'light' | 'dark' | 'gold' | 'subtle';
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Unified RTL Arabic Back Button
 * Right-pointing arrow (ArrowRight) + "رجوع" across all sub-screens, drawers, and modals.
 */
export const BackButton: React.FC<BackButtonProps> = ({
  onClick,
  label = 'رجوع',
  variant = 'light',
  size = 'md',
  className = '',
}) => {
  const variantStyles: Record<NonNullable<BackButtonProps['variant']>, string> = {
    light:
      'bg-white border border-slate-200 text-[#0F172A] hover:border-[#0F172A] hover:bg-slate-50 shadow-xs',
    dark:
      'bg-white/10 border border-white/15 text-amber-300 hover:bg-white/15 hover:text-amber-200',
    gold:
      'bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/25',
    subtle:
      'bg-slate-100 border border-slate-200/80 text-slate-800 hover:bg-slate-200/80',
  };

  const sizeStyles =
    size === 'sm'
      ? 'min-h-[34px] px-3 py-1 text-xs rounded-lg gap-1.5'
      : 'min-h-[40px] px-3.5 py-2 text-xs sm:text-sm rounded-xl gap-2';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`inline-flex items-center justify-center font-extrabold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${sizeStyles} ${variantStyles[variant]} ${className}`}
    >
      <ArrowRight className={size === 'sm' ? 'h-3.5 w-3.5 shrink-0' : 'h-4 w-4 shrink-0'} />
      <span>{label}</span>
    </button>
  );
};
