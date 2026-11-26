import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  ShieldCheck,
  FileText,
  Sun,
  Moon,
} from 'lucide-react';
import { PdfNote } from '../../types';
import { DynamicWatermark } from '../security/DynamicWatermark';
import { PrivacyGuard } from '../security/PrivacyGuard';
import { BackButton } from '../common/BackButton';

interface ProtectedPdfViewerProps {
  note: PdfNote;
  studentName: string;
  studentPhone: string;
  onBack?: () => void;
}

export const ProtectedPdfViewer: React.FC<ProtectedPdfViewerProps> = ({
  note,
  studentName,
  studentPhone,
  onBack,
}) => {
  const [pageIdx, setPageIdx] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [paperMode, setPaperMode] = useState<'light' | 'warm' | 'night'>('light');

  const pages = note.pages;
  const activePage = pages[pageIdx] ?? pages[0];

  const surfaceTheme =
    paperMode === 'night'
      ? 'bg-[#0F172A] text-slate-100 border-slate-700'
      : paperMode === 'warm'
        ? 'bg-[#FAF6EE] text-slate-900 border-amber-200/70'
        : 'bg-white text-slate-900 border-slate-200';

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-100 overflow-hidden">
      {/* Top Toolbar — strictly NO Download and NO Print buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0F172A] px-4 py-3 text-white">
        <div className="flex items-center gap-2.5 min-w-0">
          {onBack && <BackButton onClick={onBack} label="رجوع" variant="dark" size="sm" />}
          <FileText className="h-4 w-4 text-[#D4AF37] shrink-0" />
          <div className="min-w-0">
            <h4 className="text-sm font-bold truncate">{note.title}</h4>
            <p className="text-[11px] text-slate-400">
              عرض داخلي محمي · بدون تحميل أو طباعة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(85, z - 10))}
            aria-label="تصغير النص"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="font-mono text-xs text-slate-300 w-11 text-center tabular-nums" dir="ltr">
            {zoom}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(130, z + 10))}
            aria-label="تكبير النص"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"
          >
            <ZoomIn className="h-4 w-4" />
          </button>

          <div className="mx-1 h-5 w-px bg-slate-700" />

          <button
            type="button"
            onClick={() =>
              setPaperMode((m) => (m === 'light' ? 'warm' : m === 'warm' ? 'night' : 'light'))
            }
            title="تبديل إضاءة القراءة"
            className="flex h-9 items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 text-xs font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap"
          >
            {paperMode === 'night' ? (
              <Moon className="h-3.5 w-3.5 text-amber-300" />
            ) : (
              <Sun className="h-3.5 w-3.5 text-amber-300" />
            )}
            <span>
              {paperMode === 'light' ? 'أبيض' : paperMode === 'warm' ? 'قراءة دافئة' : 'ليلي'}
            </span>
          </button>
        </div>
      </div>

      {/* Protected Page Viewport */}
      <PrivacyGuard active={true} className="p-4 sm:p-6">
        <div
          className={`relative mx-auto max-w-3xl rounded-2xl border p-6 sm:p-10 shadow-sm transition-colors ${surfaceTheme}`}
        >
          <DynamicWatermark
            studentName={studentName}
            studentPhone={studentPhone}
            variant={paperMode === 'night' ? 'dark' : 'light'}
          />

          {activePage ? (
            <div style={{ fontSize: `${zoom}%` }} className="relative z-10 font-reading space-y-5">
              {/* Page Header */}
              <div className="flex items-center justify-between border-b border-current/10 pb-3 text-xs opacity-70">
                <span>{activePage.sectionTitle}</span>
                <span className="tabular-nums">
                  صفحة {activePage.pageNumber} من {pages.length}
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-extrabold font-sans leading-snug">
                {activePage.heading}
              </h3>

              <div className="space-y-3 text-sm sm:text-base leading-8 opacity-90">
                {activePage.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>

              {/* Key Points */}
              <div className="rounded-xl border border-current/10 bg-current/[0.03] p-4 sm:p-5">
                <p className="text-sm font-bold font-sans mb-3 text-amber-700 dark:text-amber-400">
                  النقاط الأساسية للحفظ والفهم
                </p>
                <ul className="space-y-2.5 text-sm leading-7">
                  {activePage.keyPoints.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="font-mono text-xs font-bold text-[#B48A1E] mt-1 tabular-nums">
                        0{idx + 1}.
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {activePage.exampleBox && (
                <div className="rounded-xl bg-[#0F172A] text-white p-5 space-y-2">
                  <p className="text-xs font-bold text-[#D4AF37] font-sans">
                    {activePage.exampleBox.label}
                  </p>
                  <p className="text-sm leading-7 text-slate-100">
                    {activePage.exampleBox.content}
                  </p>
                </div>
              )}

              {/* Page Footer */}
              <div className="pt-4 border-t border-current/10 flex items-center justify-between text-[11px] opacity-65">
                <span>منصة الأستاذة تبارك الأزيرجاوي — جميع الحقوق محفوظة</span>
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>نسخة محمية للعرض فقط</span>
                </span>
              </div>
            </div>
          ) : (
            <p className="text-center text-sm py-12 opacity-70">لا توجد صفحات متاحة في هذه الملزمة.</p>
          )}
        </div>
      </PrivacyGuard>

      {/* Bottom Page Navigation */}
      <div className="flex items-center justify-between bg-white border-t border-slate-200 px-4 py-3">
        <button
          type="button"
          disabled={pageIdx === 0}
          onClick={() => setPageIdx((p) => Math.max(0, p - 1))}
          className="min-h-[42px] inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
          <span>الصفحة السابقة</span>
        </button>

        <span className="text-xs font-semibold text-slate-600 tabular-nums">
          الصفحة {pageIdx + 1} من {pages.length}
        </span>

        <button
          type="button"
          disabled={pageIdx >= pages.length - 1}
          onClick={() => setPageIdx((p) => Math.min(pages.length - 1, p + 1))}
          className="min-h-[42px] inline-flex items-center gap-1.5 rounded-xl bg-[#0F172A] px-3.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-40"
        >
          <span>الصفحة التالية</span>
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
