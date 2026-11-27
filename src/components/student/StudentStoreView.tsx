import React, { useMemo, useState } from 'react';
import {
  ShoppingBag,
  Truck,
  MapPin,
  Phone,
  User,
  Plus,
  Minus,
  X,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  Copy,
  Package,
  FileText,
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { StoreItem, StoreOrder } from '../../types';
import { formatIqd } from '../../utils/subscription';
import {
  buildStoreOrderReceiptText,
  buildWhatsAppStoreOrderUrl,
  getDeliveryFeeForGovernorate,
  getOrderStatusMeta,
  IRAQ_GOVERNORATES,
} from '../../utils/store';
import { validateIraqiPhone } from '../../services/deviceLock';
import { SafeImage } from '../common/SafeImage';
import { BackButton } from '../common/BackButton';
import { PlatformSubPageBar } from '../common/PlatformThemeUI';

interface StudentStoreViewProps {
  onBack?: () => void;
}

export const StudentStoreView: React.FC<StudentStoreViewProps> = ({ onBack }) => {
  const { db, currentUser, getTrackName, createStoreOrder } = usePlatform();

  const [viewMode, setViewMode] = useState<'catalog' | 'orders'>('catalog');
  const [selectedTrackFilter, setSelectedTrackFilter] = useState<string>('all');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');

  // Order Receipt Modal state
  const [activeItem, setActiveItem] = useState<StoreItem | null>(null);
  const [studentName, setStudentName] = useState('');
  const [phone, setPhone] = useState('');
  const [governorate, setGovernorate] = useState<string>('بغداد');
  const [address, setAddress] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<StoreOrder | null>(null);
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  const deliverySettings = db.storeDeliverySettings;

  // Subjects available within the selected stage/track filter
  const availableSubjects = useMemo(() => {
    const matching =
      selectedTrackFilter === 'all'
        ? db.storeItems
        : db.storeItems.filter((item) => item.track === selectedTrackFilter);
    return Array.from(new Set(matching.map((item) => item.subject)));
  }, [db.storeItems, selectedTrackFilter]);

  // Filtered catalog items
  const filteredItems = useMemo(() => {
    return db.storeItems.filter((item) => {
      if (selectedTrackFilter !== 'all' && item.track !== selectedTrackFilter) return false;
      if (selectedSubjectFilter !== 'all' && item.subject !== selectedSubjectFilter) return false;
      return true;
    });
  }, [db.storeItems, selectedTrackFilter, selectedSubjectFilter]);

  // Previous orders for this student
  const myOrders = useMemo(() => {
    if (!currentUser) return [];
    return db.storeOrders.filter(
      (ord) => ord.studentId === currentUser.id || ord.phone === currentUser.phone
    );
  }, [db.storeOrders, currentUser]);

  if (!currentUser) return null;

  const openOrderModal = (item: StoreItem) => {
    setActiveItem(item);
    setStudentName(currentUser.fullName);
    setPhone(currentUser.phone);
    setGovernorate('بغداد');
    setAddress('');
    setQuantity(1);
    setFormError(null);
    setConfirmedOrder(null);
    setCopiedReceipt(false);
  };

  const closeOrderModal = () => {
    setActiveItem(null);
    setConfirmedOrder(null);
    setFormError(null);
  };

  const modalDeliveryFee = getDeliveryFeeForGovernorate(governorate, deliverySettings);
  const modalSubtotal = activeItem ? activeItem.priceIqd * quantity : 0;
  const modalTotal = modalSubtotal + modalDeliveryFee;

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem) return;
    setFormError(null);

    if (studentName.trim().length < 3) {
      setFormError('يرجى كتابة الاسم الكامل للطالب.');
      return;
    }
    const phoneCheck = validateIraqiPhone(phone);
    if (!phoneCheck.valid) {
      setFormError(phoneCheck.error ?? 'يرجى إدخال رقم هاتف عراقي صحيح يبدأ بـ 07.');
      return;
    }
    if (!governorate) {
      setFormError('يرجى اختيار محافظة السكن.');
      return;
    }
    if (address.trim().length < 6) {
      setFormError('يرجى كتابة العنوان التفصيلي وأقرب نقطة دالة لضمان وصول المندوب.');
      return;
    }

    const created = createStoreOrder({
      itemId: activeItem.id,
      studentName,
      phone: phone.trim(),
      governorate,
      address,
      quantity,
    });

    if (!created) {
      setFormError('تعذر تثبيت الطلب، يرجى المحاولة مجدداً.');
      return;
    }

    setConfirmedOrder(created);

    // Trigger WhatsApp URL via synthetic anchor element (respects iframe / no window.open)
    const waUrl = buildWhatsAppStoreOrderUrl(db.paymentSettings.whatsappNumber, created);
    const link = document.createElement('a');
    link.href = waUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyReceipt = async (order: StoreOrder) => {
    const text = buildStoreOrderReceiptText(order);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedReceipt(true);
      window.setTimeout(() => setCopiedReceipt(false), 3000);
    } catch {
      // Clipboard API unavailable
    }
  };

  return (
    <div className="space-y-6">
      {onBack && (
        <PlatformSubPageBar onBack={onBack} sectionLabel="المشتريات · الملازم والمرشحات الورقية" />
      )}
      {/* Storefront Hero Header */}
      <section className="rounded-2xl bg-[#110D1F] text-white p-5 sm:p-7 space-y-5">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <p className="text-xs font-bold text-purple-300">
              المطبوعات الرسمية لمنصة الأستاذة تبارك الزيرجاوي
            </p>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-snug">
              الملازم والمرشحات الورقية لآخر السنة
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-reading leading-relaxed">
              اطلب الملازم المنهجية ومرشحات الدور الأول المطبوعة بجودة عالية مع خدمة التوصيل السريع إلى جميع محافظات العراق الـ 18.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t md:border-t-0 border-purple-500/20 pt-3 md:pt-0 text-xs shrink-0">
            <div>
              <span className="block text-slate-400">توصيل بغداد</span>
              <strong className="font-mono text-sm text-purple-300 tabular-nums">
                {formatIqd(deliverySettings.baghdadFeeIqd)}
              </strong>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <span className="block text-slate-400">توصيل المحافظات</span>
              <strong className="font-mono text-sm text-purple-300 tabular-nums">
                {formatIqd(deliverySettings.provincesFeeIqd)}
              </strong>
            </div>
          </div>
        </div>

        {/* Segmented View Switcher: Catalog vs My Orders */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-purple-500/20">
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white/[0.06]">
            <button
              type="button"
              onClick={() => setViewMode('catalog')}
              className={`min-h-[40px] inline-flex items-center gap-1.5 rounded-lg px-4 text-xs font-bold transition-colors whitespace-nowrap ${
                viewMode === 'catalog'
                  ? 'bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>الملازم والمرشحات ({db.storeItems.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('orders')}
              className={`min-h-[40px] inline-flex items-center gap-1.5 rounded-lg px-4 text-xs font-bold transition-colors whitespace-nowrap ${
                viewMode === 'orders'
                  ? 'bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Package className="h-3.5 w-3.5" />
              <span>طلباتي السابقة ({myOrders.length})</span>
            </button>
          </div>

          <p className="text-xs text-slate-300 inline-flex items-center gap-1.5">
            <Truck className="h-4 w-4 text-purple-300 shrink-0" />
            <span>{deliverySettings.estimatedDeliveryText}</span>
          </p>
        </div>
      </section>

      {viewMode === 'catalog' ? (
        <>
          {/* Filters Toolbar: Stage/Track + Subject */}
          <section className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-7 space-y-1.5">
                <span className="block text-xs font-bold text-slate-300">
                  القسم / المرحلة الدراسية
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTrackFilter('all');
                      setSelectedSubjectFilter('all');
                    }}
                    className={`min-h-[40px] rounded-xl px-3.5 text-xs font-bold transition-colors whitespace-nowrap ${
                      selectedTrackFilter === 'all'
                        ? 'bg-[#110D1F] text-white'
                        : 'bg-white/[0.06] text-slate-200 hover:bg-white/15'
                    }`}
                  >
                    جميع الأقسام ({db.storeItems.length})
                  </button>
                  {db.tracks.map((tr) => (
                    <button
                      key={tr.id}
                      type="button"
                      onClick={() => {
                        setSelectedTrackFilter(tr.id);
                        setSelectedSubjectFilter('all');
                      }}
                      className={`min-h-[40px] rounded-xl px-3.5 text-xs font-bold transition-colors whitespace-nowrap ${
                        selectedTrackFilter === tr.id
                          ? 'bg-[#110D1F] text-white'
                          : 'bg-white/[0.06] text-slate-200 hover:bg-white/15'
                      }`}
                    >
                      {tr.shortLabel}
                    </button>
                  ))}
                </div>
              </div>

              <div className="md:col-span-5 space-y-1.5">
                <label
                  htmlFor="store-subject-filter"
                  className="block text-xs font-bold text-slate-300"
                >
                  المادة المطلوبة
                </label>
                <select
                  id="store-subject-filter"
                  value={selectedSubjectFilter}
                  onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                  className="w-full min-h-[42px] rounded-xl border border-purple-500/25 bg-[#110D1F]/85 px-3.5 text-sm font-semibold text-white focus:border-purple-400 focus:outline-none"
                >
                  <option value="all">جميع المواد ({availableSubjects.length})</option>
                  {availableSubjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Uniform 3-Column Store Product Grid */}
          {filteredItems.length === 0 ? (
            <div className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 p-10 text-center space-y-2">
              <p className="text-sm font-extrabold text-white">
                لا توجد ملازم أو مرشحات مطابقة للفلتر المختار حالياً.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedTrackFilter('all');
                  setSelectedSubjectFilter('all');
                }}
                className="min-h-[40px] mt-2 inline-flex items-center rounded-xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 shadow-[0_8px_22px_-6px_rgba(147,51,234,0.65)] px-4 text-xs font-bold text-white"
              >
                عرض جميع الملازم والمرشحات
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => {
                const trackName = getTrackName(item.track);
                const minDelivery = Math.min(
                  deliverySettings.baghdadFeeIqd,
                  deliverySettings.provincesFeeIqd
                );
                const totalWithBaghdad = item.priceIqd + deliverySettings.baghdadFeeIqd;

                return (
                  <article
                    key={item.id}
                    className="group rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:border-purple-400/55"
                  >
                    {/* 4:3 Editorial Product Cover */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-white/[0.06]">
                      <SafeImage
                        src={item.coverImage}
                        alt={item.title}
                        fallbackTitle={item.title}
                        badgeText={item.subject}
                        category={item.category}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/15 to-transparent" />
                      <div className="absolute bottom-3 right-4 left-4 flex items-center justify-between gap-2 text-xs text-white">
                        <span className="font-bold text-purple-300 truncate">
                          {item.category === 'predictions' ? 'مرشحات آخر السنة' : 'ملزمة منهجية'} ·{' '}
                          {item.subject}
                        </span>
                        {!item.inStock && (
                          <span className="font-bold text-red-300 shrink-0">نفدت الكمية</span>
                        )}
                      </div>
                    </div>

                    {/* Product Body & Pricing Breakdown */}
                    <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-400">
                          {trackName} · {item.subStage}
                          {item.branch ? ` · ${item.branch}` : ''}
                        </p>
                        <h2 className="text-base font-extrabold text-white leading-snug">
                          {item.title}
                        </h2>
                        <p className="text-xs text-slate-300 leading-relaxed font-reading line-clamp-3">
                          {item.description}
                        </p>
                        {item.pagesInfo && (
                          <p className="text-[11px] font-semibold text-slate-400 pt-0.5">
                            {item.pagesInfo}
                          </p>
                        )}
                      </div>

                      <div className="space-y-3.5 pt-3.5 border-t border-purple-500/15">
                        {/* Transparent Pricing Summary */}
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">سعر الملزمة</span>
                            <strong className="font-mono text-sm font-extrabold text-white tabular-nums">
                              {formatIqd(item.priceIqd)}
                            </strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">
                              التوصيل (بغداد {formatIqd(deliverySettings.baghdadFeeIqd)} · المحافظات{' '}
                              {formatIqd(deliverySettings.provincesFeeIqd)})
                            </span>
                            <span className="font-mono font-semibold text-slate-200 tabular-nums shrink-0">
                              +{formatIqd(minDelivery)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-1.5 border-t border-dashed border-purple-500/20">
                            <span className="font-bold text-slate-200">الإجمالي مع التوصيل (بغداد)</span>
                            <strong className="font-mono text-sm font-extrabold text-purple-300 tabular-nums">
                              {formatIqd(totalWithBaghdad)}
                            </strong>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={!item.inStock}
                          onClick={() => openOrderModal(item)}
                          className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 shadow-[0_8px_22px_-6px_rgba(147,51,234,0.65)] px-4 text-sm font-extrabold text-white hover:brightness-110 disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
                        >
                          <ShoppingBag className="h-4 w-4 text-purple-300" />
                          <span>{item.inStock ? 'اطلب الآن' : 'غير متوفرة حالياً'}</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* My Previous Orders History */
        <section className="rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-purple-500/20 overflow-hidden">
          <div className="px-5 py-4 border-b border-purple-500/15 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-white">
                سجل طلباتي من الملازم والمرشحات ({myOrders.length})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                تابعي حالة تجهيز وشحن ملزمتك أولاً بأول فور تحديثها من الأستاذة تبارك.
              </p>
            </div>
          </div>

          {myOrders.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <p className="text-sm font-bold text-slate-200">
                لم تقم بطلب أي ملزمة أو مرشحة ورقية بعد.
              </p>
              <button
                type="button"
                onClick={() => setViewMode('catalog')}
                className="min-h-[42px] inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 shadow-[0_8px_22px_-6px_rgba(147,51,234,0.65)] px-5 text-xs font-bold text-white"
              >
                <ShoppingBag className="h-4 w-4 text-purple-300" />
                <span>تصفح الملازم والمرشحات</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-purple-500/15">
              {myOrders.map((order) => {
                const statusMeta = getOrderStatusMeta(order.status);
                const waUrl = buildWhatsAppStoreOrderUrl(
                  db.paymentSettings.whatsappNumber,
                  order
                );
                return (
                  <article
                    key={order.id}
                    className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-mono font-extrabold text-white" dir="ltr">
                          #{order.receiptNumber}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className={`font-extrabold ${statusMeta.textClass}`}>
                          {statusMeta.label}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="font-mono text-slate-400" dir="ltr">
                          {order.createdAt}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-extrabold text-white">
                        {order.itemTitle}
                      </h3>
                      <p className="text-xs text-slate-300">
                        {order.trackLabel} ({order.subStage}) · الكمية:{' '}
                        <strong className="font-mono">{order.quantity}</strong> · المحافظة:{' '}
                        <strong>{order.governorate}</strong> ({order.address})
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 shrink-0">
                      <div className="text-right lg:text-left">
                        <span className="block text-[11px] text-slate-400">المبلغ الكلي</span>
                        <strong className="font-mono text-base font-extrabold text-white tabular-nums">
                          {formatIqd(order.totalIqd)}
                        </strong>
                      </div>
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 text-xs font-extrabold text-white hover:bg-emerald-700 whitespace-nowrap"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span>إعادة إرسال للواتساب</span>
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Order Receipt Modal ("وصل الطلب") */}
      {activeItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-receipt-modal-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/65 backdrop-blur-sm p-0 sm:p-4"
        >
          <div className="w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-[#110D1F]/95 backdrop-blur-2xl border border-purple-500/20 shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-[#110D1F] text-white px-5 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <BackButton onClick={closeOrderModal} label="رجوع" variant="dark" size="sm" />
                <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-l from-purple-600 via-violet-600 to-fuchsia-600 text-white shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h2
                    id="order-receipt-modal-title"
                    className="text-sm sm:text-base font-extrabold text-white truncate"
                  >
                    {confirmedOrder ? 'تم تثبيت وصل الطلب بنجاح' : 'وصل طلب ملزمة / مرشحة ورقية'}
                  </h2>
                  <p className="text-[11px] text-purple-300 truncate">{activeItem.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeOrderModal}
                aria-label="إغلاق النافذة"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 hover:bg-white/10 hover:text-white shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {confirmedOrder ? (
              /* Post-Order Confirmed Receipt View */
              <div className="p-5 sm:p-6 space-y-5">
                <div className="flex items-start gap-3 rounded-xl bg-emerald-500/15 border border-emerald-400/35 p-4 text-emerald-200">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
                  <div className="space-y-1 text-xs sm:text-sm">
                    <p className="font-extrabold">
                      تم تسجيل طلبك وحفظه برقم وصل{' '}
                      <span className="font-mono" dir="ltr">
                        #{confirmedOrder.receiptNumber}
                      </span>
                    </p>
                    <p className="font-reading text-emerald-200">
                      اضغط على الزر الأخضر أدناه لفتح واتساب الأستاذة تبارك مباشرة وإرسال تفاصيل الوصل الجاهزة لتثبيت الشحن.
                    </p>
                  </div>
                </div>

                {/* Printed Receipt Card Summary */}
                <div className="rounded-xl bg-white/[0.04] border border-purple-500/20 p-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">رقم الوصل</span>
                    <strong className="font-mono text-sm font-extrabold text-white" dir="ltr">
                      {confirmedOrder.receiptNumber}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between border-t border-purple-500/20 pt-2">
                    <span className="text-slate-400">الاسم ورقم الهاتف</span>
                    <strong className="text-white">
                      {confirmedOrder.studentName} ·{' '}
                      <span className="font-mono" dir="ltr">
                        {confirmedOrder.phone}
                      </span>
                    </strong>
                  </div>
                  <div className="flex items-center justify-between border-t border-purple-500/20 pt-2">
                    <span className="text-slate-400">العنوان</span>
                    <strong className="text-white text-left">
                      {confirmedOrder.governorate} — {confirmedOrder.address}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between border-t border-purple-500/20 pt-2">
                    <span className="text-slate-400">
                      المادة ({confirmedOrder.quantity} × {formatIqd(confirmedOrder.unitPriceIqd)})
                    </span>
                    <strong className="font-mono text-white tabular-nums">
                      {formatIqd(confirmedOrder.unitPriceIqd * confirmedOrder.quantity)}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between border-t border-purple-500/20 pt-2">
                    <span className="text-slate-400">أجور التوصيل ({confirmedOrder.governorate})</span>
                    <strong className="font-mono text-white tabular-nums">
                      {formatIqd(confirmedOrder.deliveryFeeIqd)}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between border-t-2 border-purple-500/25 pt-2.5 text-sm">
                    <span className="font-extrabold text-white">المبلغ الإجمالي الكلي</span>
                    <strong className="font-mono text-base font-extrabold text-purple-300 tabular-nums">
                      {formatIqd(confirmedOrder.totalIqd)}
                    </strong>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <a
                    href={buildWhatsAppStoreOrderUrl(
                      db.paymentSettings.whatsappNumber,
                      confirmedOrder
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-extrabold text-white hover:bg-emerald-700 transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>فتح واتساب الأستاذة وإرسال الوصل</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => handleCopyReceipt(confirmedOrder)}
                    className="min-h-[48px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-purple-500/25 bg-white/[0.045] backdrop-blur-xl px-4 text-xs font-bold text-slate-100 hover:bg-white/[0.08]"
                  >
                    <Copy className="h-4 w-4 text-purple-300" />
                    <span>{copiedReceipt ? 'تم نسخ الوصل ✓' : 'نسخ نص الوصل'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    closeOrderModal();
                    setViewMode('orders');
                  }}
                  className="w-full min-h-[42px] rounded-xl bg-white/[0.06] text-xs font-bold text-slate-200 hover:bg-white/15"
                >
                  متابعة حالة طلباتي السابقة
                </button>
              </div>
            ) : (
              /* Order Input Form */
              <form onSubmit={handleSubmitOrder} className="p-5 sm:p-6 space-y-4">
                {formError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-xl bg-rose-500/15 border border-rose-400/35 px-4 py-3 text-xs font-bold text-rose-200"
                  >
                    <AlertCircle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label
                      htmlFor="order-student-name"
                      className="block text-xs font-bold text-slate-200 mb-1.5"
                    >
                      الاسم الكامل للطالب
                    </label>
                    <div className="relative">
                      <input
                        id="order-student-name"
                        type="text"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        placeholder="الاسم الثلاثي"
                        className="w-full min-h-[44px] rounded-xl border border-purple-500/25 bg-[#110D1F]/85 pr-10 pl-3.5 text-sm font-semibold text-white focus:border-purple-400 focus:outline-none"
                      />
                      <User className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="order-student-phone"
                      className="block text-xs font-bold text-slate-200 mb-1.5"
                    >
                      رقم الهاتف العراقي (يبدأ بـ 07)
                    </label>
                    <div className="relative">
                      <input
                        id="order-student-phone"
                        type="tel"
                        inputMode="numeric"
                        dir="ltr"
                        maxLength={11}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                        placeholder="07701234567"
                        className="w-full min-h-[44px] rounded-xl border border-purple-500/25 bg-[#110D1F]/85 pl-10 pr-3.5 text-left font-mono text-sm font-semibold text-white tabular-nums focus:border-purple-400 focus:outline-none"
                      />
                      <Phone className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label
                      htmlFor="order-governorate"
                      className="block text-xs font-bold text-slate-200 mb-1.5"
                    >
                      محافظة السكن (18 محافظة عراقية)
                    </label>
                    <div className="relative">
                      <select
                        id="order-governorate"
                        value={governorate}
                        onChange={(e) => setGovernorate(e.target.value)}
                        className="w-full min-h-[44px] rounded-xl border border-purple-500/25 bg-[#110D1F]/85 pr-10 pl-3 text-sm font-semibold text-white focus:border-purple-400 focus:outline-none"
                      >
                        {IRAQ_GOVERNORATES.map((gov) => (
                          <option key={gov} value={gov}>
                            {gov} (التوصيل:{' '}
                            {formatIqd(getDeliveryFeeForGovernorate(gov, deliverySettings))})
                          </option>
                        ))}
                      </select>
                      <MapPin className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <span className="block text-xs font-bold text-slate-200 mb-1.5">
                      الكمية المطلوبة (عدد النسخ)
                    </span>
                    <div className="flex items-center justify-between rounded-xl border border-purple-500/25 bg-white/[0.045] backdrop-blur-xl px-2 min-h-[44px]">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        aria-label="تقليل الكمية"
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-slate-100 hover:bg-white/15"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="font-mono text-base font-extrabold text-white tabular-nums">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                        aria-label="زيادة الكمية"
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-slate-100 hover:bg-white/15"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="order-address"
                    className="block text-xs font-bold text-slate-200 mb-1.5"
                  >
                    العنوان التفصيلي وأقرب نقطة دالة
                  </label>
                  <textarea
                    id="order-address"
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="مثال: حي المنصور — شارع 14 رمضان، قرب مطعم الساعة"
                    className="w-full rounded-xl border border-purple-500/25 bg-[#110D1F]/85 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-purple-400 focus:outline-none"
                  />
                </div>

                {/* Final Invoice Summary */}
                <div className="rounded-xl bg-white/[0.04] border border-purple-500/20 p-4 space-y-2 text-xs">
                  <p className="font-extrabold text-white mb-1">ملخص الفاتورة النهائية</p>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>
                      سعر المادة ({formatIqd(activeItem.priceIqd)} × {quantity})
                    </span>
                    <strong className="font-mono text-white tabular-nums">
                      {formatIqd(modalSubtotal)}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>أجور التوصيل إلى محافظة {governorate}</span>
                    <strong className="font-mono text-white tabular-nums">
                      {formatIqd(modalDeliveryFee)}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-purple-500/20 text-sm">
                    <span className="font-extrabold text-white">
                      المبلغ الكلي المطلوب عند الاستلام
                    </span>
                    <strong className="font-mono text-lg font-extrabold text-purple-300 tabular-nums">
                      {formatIqd(modalTotal)}
                    </strong>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                  <button
                    type="submit"
                    className="flex-1 min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-extrabold text-white hover:bg-emerald-700 transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>إرسال الطلب إلى واتساب الأستاذة</span>
                  </button>
                  <button
                    type="button"
                    onClick={closeOrderModal}
                    className="min-h-[48px] rounded-xl border border-purple-500/25 bg-white/[0.045] backdrop-blur-xl px-5 text-sm font-bold text-slate-200 hover:bg-white/[0.08]"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
