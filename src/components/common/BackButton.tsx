import React from 'react';
import { ArrowRight } from 'lucide-react';

interface BackButtonProps {
  onClick: () => void;
  label?: string;
  variant?: 'light' | 'dark' | 'ghost' | 'subtle';
  size?: 'sm' | 'md';
  className?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({
  onClick,
  label = 'العودة',
  variant = 'light',
  size = 'md',
  className = '',
}) => {
  const styles =
    variant === 'dark'
      ? 'bg-white/10 hover:bg-purple-500/25 text-white border border-purple-400/30 hover:border-purple-300/60'
      : variant === 'ghost'
        ? 'bg-transparent hover:bg-white/10 text-slate-200 hover:text-white border border-transparent hover:border-purple-500/25'
        : variant === 'subtle'
          ? 'bg-white/[0.06] hover:bg-purple-500/20 text-purple-100 hover:text-white border border-purple-500/25 hover:border-purple-400/50'
          : 'bg-white/5 hover:bg-purple-500/15 text-purple-100 hover:text-white border border-purple-500/25 hover:border-purple-400/50 backdrop-blur-xl shadow-sm';

  const sizeStyles =
    size === 'sm' ? 'px-2.5 py-1.5 text-xs gap-1.5' : 'px-3.5 py-2 text-xs sm:text-sm gap-2';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-xl font-bold transition-all cursor-pointer select-none active:scale-[0.98] ${styles} ${sizeStyles} ${className}`}
    >
      <ArrowRight className="h-4 w-4 shrink-0 text-purple-300" />
      <span>{label}</span>
    </button>
  );
};
