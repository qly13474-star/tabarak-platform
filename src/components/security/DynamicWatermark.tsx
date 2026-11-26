import React, { useEffect, useState } from 'react';

interface DynamicWatermarkProps {
  studentName: string;
  studentPhone: string;
  variant?: 'dark' | 'light';
}

interface Position {
  topPercent: number;
  leftPercent: number;
  rotation: number;
}

function getNextRandomPosition(prev?: Position): Position {
  // Keep watermark safely inside 12%..76% vertical and 8%..62% horizontal so it never clips
  let topPercent = 14 + Math.floor(Math.random() * 62);
  let leftPercent = 10 + Math.floor(Math.random() * 52);

  // Ensure noticeable movement on each 10-second hop
  if (prev && Math.abs(prev.topPercent - topPercent) < 16 && Math.abs(prev.leftPercent - leftPercent) < 16) {
    topPercent = prev.topPercent > 45 ? 18 : 68;
    leftPercent = prev.leftPercent > 35 ? 12 : 56;
  }

  const rotation = Math.floor(Math.random() * 11) - 5; // -5deg to +5deg
  return { topPercent, leftPercent, rotation };
}

export const DynamicWatermark: React.FC<DynamicWatermarkProps> = ({
  studentName,
  studentPhone,
  variant = 'dark',
}) => {
  const [pos, setPos] = useState<Position>(() => getNextRandomPosition());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPos((current) => getNextRandomPosition(current));
    }, 10000); // Reposition every 10 seconds to deter screen recording

    return () => window.clearInterval(interval);
  }, []);

  const colorClasses =
    variant === 'dark'
      ? 'text-white/35 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]'
      : 'text-slate-900/20';

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none select-none absolute inset-0 z-30 overflow-hidden"
    >
      <div
        className={`absolute transition-all duration-700 ease-out ${colorClasses}`}
        style={{
          top: `${pos.topPercent}%`,
          left: `${pos.leftPercent}%`,
          transform: `rotate(${pos.rotation}deg)`,
        }}
      >
        <div className="flex flex-col items-center text-center leading-tight">
          <span className="text-xs sm:text-sm font-bold whitespace-nowrap">{studentName}</span>
          <span className="font-mono text-[11px] sm:text-xs font-semibold tracking-wider tabular-nums" dir="ltr">
            {studentPhone}
          </span>
        </div>
      </div>
    </div>
  );
};
