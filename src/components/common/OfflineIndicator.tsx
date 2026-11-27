import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/usePWAInstall';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-2xl bg-[#161029]/95 backdrop-blur-xl px-4 py-2.5 text-xs font-extrabold text-purple-100 shadow-[0_12px_32px_-8px_rgba(124,58,237,0.65)] border border-purple-400/45"
    >
      <WifiOff className="h-4 w-4 shrink-0 text-fuchsia-400" />
      <span>وضع عدم الاتصال — يتم عرض البيانات المحفوظة مؤقتاً</span>
    </div>
  );
};
