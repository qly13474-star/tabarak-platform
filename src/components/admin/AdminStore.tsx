import React, { useMemo, useState } from 'react';
import {
  ShoppingBag,
  Plus,
  Edit3,
  Trash2,
  Truck,
  Package,
  CheckCircle2,
  Save,
  X,
  MessageCircle,
  Search,
  MapPin,
  Clock,
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { StoreItem, StoreItemCategory, StoreOrderStatus, TrackId } from '../../types';
import { formatIqd } from '../../utils/subscription';
import {
  buildWhatsAppStudentFollowUpUrl,
  getOrderStatusMeta,
  STORE_COVER_PRESETS,
} from '../../utils/store';
import { SafeImage } from '../common/SafeImage';
import { SecurityPinModal } from './SecurityPinModal';

type StoreAdminTab = 'orders' | 'catalog' | 'delivery';

export const AdminStore: React.FC = () => {
  const {
    db,
    getTrackName,
    addStoreItem,
    updateStoreItem,
    deleteStoreItem,
    updateStoreDeliverySettings,
    updateStoreOrderStatus,
  } = usePlatform();

  const [activeTab, setActiveTab] = useState<StoreAdminTab>('orders');
  const [toast, setToast] = useState<string | null>(null);

  // Order filters
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | StoreOrderStatus>('all');
  const [orderSearch, setOrderSearch] = useState('');

  // Item Create / Edit form
  const defaultTrack = db.tracks[1] ?? db.tracks[0];
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [track, setTrack] = useState<TrackId>(defaultTrack?.id ?? 'vocational');
  const [subStage, setSubStage] = useState(defaultTrack?.subStages[0] ?? '');
  const [branch, setBranch] = useState('');
  const [category, setCategory] = useState<StoreItemCategory>('predictions');
  const [priceIqd, setPriceIqd] = useState<string>('15000');
  const [pagesInfo, setPagesInfo] = useState('');
  const [coverImage, setCoverImage] = useState(STORE_COVER_PRESETS[0].url);
  const [description, setDescription] = useState('');
  const [inStock, setInStock] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // PIN-protected deletion
  const [pendingDeleteItem, setPendingDeleteItem] = useState<StoreItem | null>(null);

  // Delivery settings form
  const [baghdadFee, setBaghdadFee] = useState<string>(
    String(db.storeDeliverySettings.baghdadFeeIqd)
  );
  const [provincesFee, setProvincesFee] = useState<string>(
    String(db.storeDeliverySettings.provincesFeeIqd)
  );
  const [deliveryText, setDeliveryText] = useState<string>(
    db.storeDeliverySettings.estimatedDeliveryText
  );

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 4500);
  };

  const selectedTrackObj = db.tracks.find((t) => t.id === track) ?? db.tracks[0];
  const selectedTrackSpecs =
    selectedTrackObj?.branches ?? selectedTrackObj?.departments ?? [];

  const preparingOrdersCount = db.storeOrders.filter((o) => o.status === 'preparing').length;
  const totalOrdersRevenue = db.storeOrders.reduce((acc, o) => acc + o.totalIqd, 0);

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return db.storeOrders.filter((ord) => {
      if (orderStatusFilter !== 'all' && ord.status !== orderStatusFilter) return false;
      if (!q) return true;
      return (
        ord.receiptNumber.toLowerCase().includes(q) ||
        ord.studentName.toLowerCase().includes(q) ||
        ord.phone.includes(q) ||
        ord.governorate.toLowerCase().includes(q) ||
        ord.itemTitle.toLowerCase().includes(q)
      );
    });
  }, [db.storeOrders, orderStatusFilter, orderSearch]);

  const openCreateForm = () => {
    const firstTrack = db.tracks.find((t) => t.id === 'vocational') ?? db.tracks[0];
    setEditingItemId(null);
    setTitle('');
    setSubject('');
    setTrack(firstTrack?.id ?? 'vocational');
    setSubStage(firstTrack?.subStages[0] ?? '');
    setBranch((firstTrack?.branches ?? firstTrack?.departments)?.[0] ?? '');
    setCategory('predictions');
    setPriceIqd('15000');
    setPagesInfo('100 صفحة · طباعة ملونة فاخرة');
    setCoverImage(STORE_COVER_PRESETS[0].url);
    setDescription('');
    setInStock(true);
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (item: StoreItem) => {
    setEditingItemId(item.id);
    setTitle(item.title);
    setSubject(item.subject);
    setTrack(item.track);
    setSubStage(item.subStage);
    setBranch(item.branch ?? '');
    setCategory(item.category);
    setPriceIqd(String(item.priceIqd));
    setPagesInfo(item.pagesInfo ?? '');
    setCoverImage(item.coverImage);
    setDescription(item.description);
    setInStock(item.inStock);
    setFormError(null);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTrackChange = (nextTrackId: TrackId) => {
    setTrack(nextTrackId);
    const obj = db.tracks.find((t) => t.id === nextTrackId);
    if (obj) {
      setSubStage(obj.subStages[0] ?? '');
      const specs = obj.branches ?? obj.departments ?? [];
      setBranch(specs[0] ?? '');
    }
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (title.trim().length < 4) {
      setFormError('يرجى كتابة عنوان واضح للملزمة أو المرشحة.');
      return;
    }
    if (subject.trim().length < 2) {
      setFormError('يرجى كتابة اسم المادة الدراسية.');
      return;
    }
    const parsedPrice = Number(priceIqd);
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      setFormError('يرجى إدخال سعر صحيح بالدينار العراقي.');
      return;
    }

    const payload = {
      title,
      subject,
      track,
      subStage,
      branch: selectedTrackSpecs.length > 0 ? branch : undefined,
      category,
      description:
        description.trim() || 'ملزمة منهجية ومرشحات مركّزة مطبوعة بأعلى جودة ومرتبة وفق المنهج الوزاري.',
      priceIqd: parsedPrice,
      coverImage,
      pagesInfo,
      inStock,
    };

    if (editingItemId) {
      updateStoreItem(editingItemId, payload);
      showToast(`تم حفظ تعديلات «${title.trim()}» بنجاح.`);
    } else {
      addStoreItem(payload);
      showToast(`تمت إضافة «${title.trim()}» إلى متجر الملازم والمرشحات بنجاح.`);
    }

    setIsFormOpen(false);
    setEditingItemId(null);
  };

  const handleSaveDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    const bgFee = Math.max(0, Math.round(Number(baghdadFee) || 0));
    const prFee = Math.max(0, Math.round(Number(provincesFee) || 0));
    updateStoreDeliverySettings({
      baghdadFeeIqd: bgFee,
      provincesFeeIqd: prFee,
      estimatedDeliveryText:
        deliveryText.trim() || 'التوصيل السريع خلال 24 – 48 ساعة لجميع المحافظات',
    });
    showToast(
      `تم تحديث أجور التوصيل: بغداد (${formatIqd(bgFee)}) والمحافظات (${formatIqd(prFee)}) وتطبيقها تلقائياً في وصل الطالب.`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & KPI Strip */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-[#B48A1E]">المطبوعات والتوصيل للمحافظات</p>
          <h1 className="mt-1 text-xl sm:text-2xl font-extrabold text-slate-900">
            إدارة الملازم والمرشحات (المتجر)
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            إضافة وتعديل الملازم الورقية ومرشحات آخر السنة، تحديد أجور توصيل بغداد والمحافظات، ومتابعة طلبات الطلاب.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setActiveTab('catalog');
            openCreateForm();
          }}
          className="self-start sm:self-auto min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-[#0F172A] px-4 text-xs sm:text-sm font-bold text-white hover:bg-slate-800 whitespace-nowrap"
        >
          <Plus className="h-4 w-4 text-[#D4AF37]" />
          <span>إضافة ملزمة أو مرشحة</span>
        </button>
      </div>

      {toast && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm font-semibold text-emerald-900"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{toast}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-xs text-emerald-700 hover:underline"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* 4-Column Store KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-1">
          <span className="text-xs text-slate-500">الملازم والمرشحات المعروضة</span>
          <p className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
            {db.storeItems.length}
          </p>
          <p className="text-[11px] text-slate-500">
            {db.storeItems.filter((i) => i.inStock).length} متوفر في المخزون
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-1">
          <span className="text-xs text-slate-500">طلبات قيد التجهيز</span>
          <p className="text-2xl font-extrabold text-amber-700 font-mono tabular-nums">
            {preparingOrdersCount}
          </p>
          <p className="text-[11px] text-slate-500">
            من أصل {db.storeOrders.length} طلبات إجمالية
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-1">
          <span className="text-xs text-slate-500">إجمالي قيمة الطلبات</span>
          <p className="text-xl font-extrabold text-emerald-700 font-mono tabular-nums">
            {formatIqd(totalOrdersRevenue)}
          </p>
          <p className="text-[11px] text-slate-500">شامل أجور التوصيل</p>
        </div>

        <div className="rounded-2xl bg-[#0F172A] text-white p-4 space-y-1">
          <span className="text-xs text-slate-300">أجور التوصيل المعتمدة</span>
          <p className="text-sm font-extrabold text-[#F59E0B] font-mono tabular-nums pt-0.5">
            بغداد: {formatIqd(db.storeDeliverySettings.baghdadFeeIqd)}
          </p>
          <p className="text-sm font-extrabold text-white font-mono tabular-nums">
            المحافظات: {formatIqd(db.storeDeliverySettings.provincesFeeIqd)}
          </p>
        </div>
      </div>

      {/* Main 3-Tab Switcher */}
      <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-slate-200/70">
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl px-3 text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${
            activeTab === 'orders'
              ? 'bg-[#0F172A] text-white shadow-sm'
              : 'text-slate-700 hover:text-slate-950'
          }`}
        >
          <Package className="h-4 w-4 shrink-0" />
          <span>الطلبات الواردة ({db.storeOrders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          className={`min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl px-3 text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${
            activeTab === 'catalog'
              ? 'bg-[#0F172A] text-white shadow-sm'
              : 'text-slate-700 hover:text-slate-950'
          }`}
        >
          <ShoppingBag className="h-4 w-4 shrink-0" />
          <span>الملازم والمرشحات ({db.storeItems.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('delivery')}
          className={`min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl px-3 text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${
            activeTab === 'delivery'
              ? 'bg-[#0F172A] text-white shadow-sm'
              : 'text-slate-700 hover:text-slate-950'
          }`}
        >
          <Truck className="h-4 w-4 shrink-0" />
          <span>أجور التوصيل</span>
        </button>
      </div>

      {/* TAB 1: Incoming Student Orders */}
      {activeTab === 'orders' && (
        <section className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="ابحثي برقم الوصل، اسم الطالب، الهاتف، أو المحافظة..."
                className="w-full min-h-[42px] rounded-xl border border-slate-300 bg-slate-50 pr-10 pl-3.5 text-xs sm:text-sm text-slate-900 focus:border-[#0F172A] focus:bg-white focus:outline-none"
              />
              <Search className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'all', label: `الكل (${db.storeOrders.length})` },
                  { id: 'preparing', label: 'قيد التجهيز' },
                  { id: 'shipped', label: 'تم الشحن' },
                  { id: 'delivered', label: 'تم التسليم' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setOrderStatusFilter(f.id)}
                  className={`min-h-[38px] rounded-xl px-3 text-xs font-bold whitespace-nowrap ${
                    orderStatusFilter === f.id
                      ? 'bg-[#0F172A] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              لا توجد طلبات ملازم أو مرشحات مطابقة حالياً.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredOrders.map((order) => {
                const statusMeta = getOrderStatusMeta(order.status);
                const studentWaUrl = buildWhatsAppStudentFollowUpUrl(order);

                return (
                  <article key={order.id} className="p-5 hover:bg-slate-50/50 transition-colors">
                    <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-mono font-extrabold text-[#0F172A]" dir="ltr">
                            #{order.receiptNumber}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className={`font-extrabold ${statusMeta.textClass}`}>
                            {statusMeta.label}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="inline-flex items-center gap-1 text-slate-500 font-mono" dir="ltr">
                            <Clock className="h-3 w-3" />
                            {order.createdAt}
                          </span>
                        </div>

                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                          {order.itemTitle}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                          <div>
                            <span className="text-slate-400">الطالب: </span>
                            <strong className="text-slate-900">{order.studentName}</strong> ·{' '}
                            <span className="font-mono font-semibold text-slate-700" dir="ltr">
                              {order.phone}
                            </span>
                          </div>
                          <div className="flex items-start gap-1">
                            <MapPin className="h-3.5 w-3.5 text-[#B48A1E] mt-0.5 shrink-0" />
                            <span>
                              <strong className="text-slate-900">{order.governorate}</strong> —{' '}
                              {order.address}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">القسم والمادة: </span>
                            <span className="font-semibold text-slate-800">
                              {order.trackLabel} ({order.subStage}) · {order.subject}
                            </span>
                          </div>
                          <div className="font-mono tabular-nums">
                            <span className="font-sans text-slate-400">الفاتورة: </span>
                            {order.quantity} × {formatIqd(order.unitPriceIqd)} + توصيل{' '}
                            {formatIqd(order.deliveryFeeIqd)} ={' '}
                            <strong className="text-[#0F172A] font-extrabold">
                              {formatIqd(order.totalIqd)}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* Order Status Action Controls */}
                      <div className="flex flex-col sm:flex-row xl:flex-col items-stretch sm:items-center xl:items-end gap-2 shrink-0">
                        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100">
                          {(
                            [
                              { id: 'preparing', label: 'قيد التجهيز' },
                              { id: 'shipped', label: 'تم الشحن' },
                              { id: 'delivered', label: 'تم التسليم' },
                            ] as const
                          ).map((st) => (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => {
                                updateStoreOrderStatus(order.id, st.id);
                                showToast(
                                  `تم تحديث حالة الوصل #${order.receiptNumber} إلى «${st.label}».`
                                );
                              }}
                              className={`min-h-[36px] rounded-lg px-2.5 text-[11px] font-extrabold transition-colors whitespace-nowrap ${
                                order.status === st.id
                                  ? 'bg-[#0F172A] text-[#D4AF37] shadow-sm'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              {st.label}
                            </button>
                          ))}
                        </div>

                        <a
                          href={studentWaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 text-xs font-bold text-white hover:bg-emerald-700 whitespace-nowrap"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          <span>مراسلة الطالب عبر واتساب</span>
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: Manage Printed Booklets & Predictions Catalog */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {isFormOpen && (
            <section className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 bg-[#0F172A] text-white flex items-center justify-between gap-2">
                <h2 className="text-sm font-extrabold">
                  {editingItemId ? 'تعديل بيانات الملزمة / المرشحة' : 'إضافة ملزمة أو مرشحة ورقية جديدة'}
                </h2>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="p-1 text-slate-300 hover:text-white"
                  aria-label="إغلاق النموذج"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveItem} className="p-5 sm:p-6 space-y-4">
                {formError && (
                  <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-xs font-bold text-red-800">
                    {formError}
                  </p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      عنوان الملزمة أو المرشحة
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="مثال: مرشحات آخر السنة الذهبية — الرياضيات"
                      className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-sm font-semibold text-slate-900 focus:border-[#0F172A] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      المادة الدراسية (من مواد المرحلة أو كتابة يدوية)
                    </label>
                    <input
                      type="text"
                      list="admin-store-subjects-list"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="مثال: الرياضيات، الحاسوب وتقنية المعلومات، الطبيعيات..."
                      className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-sm font-semibold text-slate-900 focus:border-[#0F172A] focus:outline-none"
                    />
                    <datalist id="admin-store-subjects-list">
                      {(selectedTrackObj?.subjects ?? []).map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      القسم / المرحلة
                    </label>
                    <select
                      value={track}
                      onChange={(e) => handleTrackChange(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900"
                    >
                      {db.tracks.map((tr) => (
                        <option key={tr.id} value={tr.id}>
                          {tr.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      الصف الدراسي
                    </label>
                    <select
                      value={subStage}
                      onChange={(e) => setSubStage(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900"
                    >
                      {(selectedTrackObj?.subStages ?? []).map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedTrackSpecs.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        {selectedTrackObj?.specializationLabel || 'الفرع / التخصص'}
                      </label>
                      <select
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900"
                      >
                        <option value="">عام لجميع الفروع</option>
                        {selectedTrackSpecs.map((sp) => (
                          <option key={sp} value={sp}>
                            {sp}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      النوع
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as StoreItemCategory)}
                      className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900"
                    >
                      <option value="predictions">مرشحات آخر السنة</option>
                      <option value="booklet">ملزمة منهجية</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      سعر الملزمة (بالدينار العراقي)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={500}
                      dir="ltr"
                      value={priceIqd}
                      onChange={(e) => setPriceIqd(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-left font-mono text-sm font-bold text-slate-900 tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      مواصفات الطباعة والصفحات (اختياري)
                    </label>
                    <input
                      type="text"
                      value={pagesInfo}
                      onChange={(e) => setPagesInfo(e.target.value)}
                      placeholder="مثال: 110 صفحة · طباعة ليزرية ملونة"
                      className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-sm text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      صورة الغلاف
                    </label>
                    <select
                      value={coverImage}
                      onChange={(e) => setCoverImage(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900"
                    >
                      {STORE_COVER_PRESETS.map((preset) => (
                        <option key={preset.url} value={preset.url}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    الوصف التفصيلي للملزمة أو المرشحة
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="اكتبي تفاصيل الفصول المشمولة، الأسئلة الوزارية المحلولة، ومميزات الطباعة..."
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 font-reading"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inStock}
                      onChange={(e) => setInStock(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <span>متوفرة حالياً للطلب والتوصيل</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsFormOpen(false)}
                      className="min-h-[44px] rounded-xl border border-slate-300 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-[#D4AF37] to-[#F59E0B] px-6 text-sm font-extrabold text-slate-950 hover:brightness-105"
                    >
                      <Save className="h-4 w-4" />
                      <span>{editingItemId ? 'حفظ التعديلات' : 'نشر في متجر الطلاب'}</span>
                    </button>
                  </div>
                </div>
              </form>
            </section>
          )}

          {/* Catalog Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {db.storeItems.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl bg-white border border-slate-200 overflow-hidden flex flex-col"
              >
                <div className="relative aspect-[4/3] w-full bg-slate-100 overflow-hidden">
                  <SafeImage
                    src={item.coverImage}
                    alt={item.title}
                    fallbackTitle={item.title}
                    badgeText={item.subject}
                    category={item.category}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/15 to-transparent" />
                  <div className="absolute bottom-3 right-4 left-4 flex items-center justify-between gap-2 text-xs text-white">
                    <span className="font-bold text-amber-300 truncate">{item.subject}</span>
                    <strong className="font-mono text-sm font-extrabold text-white tabular-nums shrink-0">
                      {formatIqd(item.priceIqd)}
                    </strong>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold text-slate-500">
                      {getTrackName(item.track)} · {item.subStage}
                      {item.branch ? ` · ${item.branch}` : ''} ·{' '}
                      <span className={item.inStock ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>
                        {item.inStock ? 'متوفرة' : 'نفدت الكمية'}
                      </span>
                    </p>
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-2 font-reading">
                      {item.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => openEditForm(item)}
                      className="min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 hover:border-[#0F172A]"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-[#B48A1E]" />
                      <span>تعديل</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteItem(item)}
                      className="min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50/60 px-3 text-xs font-bold text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>حذف</span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Manual Delivery Pricing Settings */}
      {activeTab === 'delivery' && (
        <section className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-7 max-w-2xl space-y-5">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              إعدادات أجور التوصيل لجميع محافظات العراق
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              حدّدي أجور التوصيل يدوياً لبغداد ولبقية المحافظات العراقية الـ 17 ليتم حسابها تلقائياً داخل وصل الطلب الخاص بالطالب.
            </p>
          </div>

          <form onSubmit={handleSaveDelivery} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="delivery-baghdad-fee"
                  className="block text-xs font-bold text-slate-700 mb-1.5"
                >
                  أجور توصيل محافظة بغداد (د.ع)
                </label>
                <input
                  id="delivery-baghdad-fee"
                  type="number"
                  min={0}
                  step={500}
                  dir="ltr"
                  value={baghdadFee}
                  onChange={(e) => setBaghdadFee(e.target.value)}
                  className="w-full min-h-[46px] rounded-xl border border-slate-300 px-4 text-left font-mono text-base font-extrabold text-slate-900 tabular-nums focus:border-[#0F172A] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="delivery-provinces-fee"
                  className="block text-xs font-bold text-slate-700 mb-1.5"
                >
                  أجور توصيل بقية المحافظات العراقية (د.ع)
                </label>
                <input
                  id="delivery-provinces-fee"
                  type="number"
                  min={0}
                  step={500}
                  dir="ltr"
                  value={provincesFee}
                  onChange={(e) => setProvincesFee(e.target.value)}
                  className="w-full min-h-[46px] rounded-xl border border-slate-300 px-4 text-left font-mono text-base font-extrabold text-slate-900 tabular-nums focus:border-[#0F172A] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="delivery-eta-text"
                className="block text-xs font-bold text-slate-700 mb-1.5"
              >
                ملاحظة مدة التوصيل الظاهرة للطلاب
              </label>
              <input
                id="delivery-eta-text"
                type="text"
                value={deliveryText}
                onChange={(e) => setDeliveryText(e.target.value)}
                placeholder="التوصيل السريع خلال 24 – 48 ساعة لجميع محافظات العراق"
                className="w-full min-h-[46px] rounded-xl border border-slate-300 px-4 text-sm text-slate-900 focus:border-[#0F172A] focus:outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F172A] px-6 text-sm font-extrabold text-white hover:bg-slate-800 transition-colors"
              >
                <Save className="h-4 w-4 text-[#D4AF37]" />
                <span>حفظ أجور التوصيل وتحديث المتجر</span>
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Mandatory Security PIN Confirmation Modal for Booklet Deletion */}
      <SecurityPinModal
        isOpen={Boolean(pendingDeleteItem)}
        title="تأكيد حذف الملزمة / المرشحة"
        itemLabel={pendingDeleteItem?.title ?? ''}
        warningDetail="سيتم إزالة هذه الملزمة نهائياً من متجر المشتريات لدى الطلاب."
        onCancel={() => setPendingDeleteItem(null)}
        onConfirm={() => {
          if (pendingDeleteItem) {
            deleteStoreItem(pendingDeleteItem.id);
            showToast(`تم حذف «${pendingDeleteItem.title}» من المتجر بنجاح.`);
            setPendingDeleteItem(null);
          }
        }}
      />
    </div>
  );
};
