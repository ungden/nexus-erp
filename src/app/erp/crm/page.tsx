'use client';

import { useState, useMemo } from 'react';
import {
  Plus, Calendar, X, Edit2, Search, Trash2,
  Users, Handshake, BarChart3, Receipt,
  Building2, User, Phone, Mail, Inbox
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  useAppContext,
  Deal,
  Stage,
  Customer,
  CustomerType,
  Partner,
  Receivable,
  Payable,
} from '@/context/AppContext';
import { formatVND, formatNumber } from '@/lib/format';

// ─── Kanban stage config ────────────────────────────────────
const stages: { name: Stage; color: string }[] = [
  { name: 'Tiếp cận', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { name: 'Đàm phán', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { name: 'Chốt sale', color: 'bg-green-100 text-green-800 border-green-200' },
  { name: 'Thất bại', color: 'bg-red-100 text-red-800 border-red-200' },
];

// ─── Tab definitions ────────────────────────────────────────
type Tab = 'customers' | 'pipeline' | 'partners' | 'debts';
const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'customers', label: 'Khách hàng', icon: Users },
  { key: 'pipeline', label: 'Cơ hội', icon: BarChart3 },
  { key: 'partners', label: 'Đối tác & NCC', icon: Handshake },
  { key: 'debts', label: 'Công nợ', icon: Receipt },
];

// ─── Shared input class ─────────────────────────────────────
const inputCls =
  'w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background text-foreground';

// ═════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════
export default function CRM() {
  const {
    deals, setDeals,
    customers, setCustomers,
    partners, setPartners,
    receivables, setReceivables,
    payables, setPayables,
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<Tab>('customers');

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          Quản lý Khách hàng (CRM)
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Quản lý khách hàng, phễu cơ hội, đối tác và công nợ.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto p-1 bg-muted/30 rounded-full w-fit border border-border/50">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              'relative flex items-center gap-2 px-5 py-2 text-sm font-medium whitespace-nowrap rounded-full transition-colors z-10',
              activeTab === t.key
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            )}
          >
            {activeTab === t.key && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-background shadow-sm rounded-full -z-10 border border-border/50"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'customers' && (
          <CustomersTab
            customers={customers}
            setCustomers={setCustomers}
          />
        )}
        {activeTab === 'pipeline' && (
          <PipelineTab
            deals={deals}
            setDeals={setDeals}
            customers={customers}
          />
        )}
        {activeTab === 'partners' && (
          <PartnersTab
            partners={partners}
            setPartners={setPartners}
          />
        )}
        {activeTab === 'debts' && (
          <DebtsTab
            receivables={receivables}
            setReceivables={setReceivables}
            payables={payables}
            setPayables={setPayables}
            customers={customers}
            partners={partners}
          />
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// TAB 1 — KHÁCH HÀNG
// ═════════════════════════════════════════════════════════════
function CustomersTab({
  customers,
  setCustomers,
}: {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
}) {
  const [filter, setFilter] = useState<'all' | CustomerType>('all');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCust, setNewCust] = useState<Partial<Customer>>({ type: 'B2B' });

  const filtered = useMemo(() => {
    let list = customers;
    if (filter !== 'all') list = list.filter((c) => c.type === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.company || '').toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.includes(q),
      );
    }
    return list;
  }, [customers, filter, search]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCust.name || !newCust.phone || !newCust.email) return;
    const c: Customer = {
      id: 'c' + Date.now(),
      name: newCust.name!,
      type: newCust.type as CustomerType,
      company: newCust.company,
      taxId: newCust.taxId,
      phone: newCust.phone!,
      email: newCust.email!,
      address: newCust.address,
      contactPerson: newCust.contactPerson,
      notes: newCust.notes,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setCustomers((prev) => [...prev, c]);
    setIsModalOpen(false);
    setNewCust({ type: 'B2B' });
  };

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa khách hàng này?')) {
      setCustomers((prev) => prev.filter((c) => c.id !== id));
    }
  };

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex gap-2">
          {(['all', 'B2B', 'B2C'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-full border transition-colors',
                filter === f
                  ? 'bg-primary text-white border-primary'
                  : 'bg-card text-foreground/80 border-border hover:bg-muted/30',
              )}
            >
              {f === 'all' ? 'Tất cả' : f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm kiếm khách hàng..."
              className={cn(inputCls, 'pl-9')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => {
              setNewCust({ type: 'B2B' });
              setIsModalOpen(true);
            }}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-white hover:bg-primary/90 h-10 px-4 whitespace-nowrap"
          >
            <Plus className="mr-2 h-4 w-4" /> Thêm KH
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tên</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Loại</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Công ty / MST</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Liên hệ</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Địa chỉ</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ngày tạo</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr
                key={c.id}
                className="border-b border-border/50 hover:bg-primary/5 hover:shadow-sm transition-all group"
              >
                <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      c.type === 'B2B'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700',
                    )}
                  >
                    {c.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {c.type === 'B2B' ? (
                    <span>
                      {c.company}
                      {c.taxId && (
                        <span className="block text-xs text-muted-foreground/70">
                          MST: {c.taxId}
                        </span>
                      )}
                    </span>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Phone className="h-3 w-3" /> {c.phone}
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground text-xs mt-0.5">
                    <Mail className="h-3 w-3" /> {c.email}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {c.address || '-'}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{c.createdAt}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/70 hover:text-red-600"
                    title="Xóa"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center">
                    <Inbox className="h-10 w-10 mb-3 opacity-20" />
                    <p>Không tìm thấy khách hàng nào.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Customer Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-foreground">Thêm khách hàng mới</h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-muted-foreground/70 hover:text-muted-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleAdd} className="space-y-4">
                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-foreground/90 mb-1">
                    Loại khách hàng
                  </label>
                  <div className="flex gap-3">
                    {(['B2B', 'B2C'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setNewCust((p) => ({ ...p, type: t }))}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-2 py-2 rounded-md border text-sm font-medium transition-colors',
                          newCust.type === t
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-card border-border text-foreground/70 hover:bg-muted/30',
                        )}
                      >
                        {t === 'B2B' ? (
                          <Building2 className="h-4 w-4" />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/90 mb-1">
                    Tên {newCust.type === 'B2B' ? 'công ty' : 'khách hàng'} *
                  </label>
                  <input
                    required
                    type="text"
                    className={inputCls}
                    value={newCust.name || ''}
                    onChange={(e) => setNewCust((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                {newCust.type === 'B2B' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-foreground/90 mb-1">
                        Tên công ty
                      </label>
                      <input
                        type="text"
                        className={inputCls}
                        value={newCust.company || ''}
                        onChange={(e) =>
                          setNewCust((p) => ({ ...p, company: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground/90 mb-1">
                        Mã số thuế (MST)
                      </label>
                      <input
                        type="text"
                        className={inputCls}
                        value={newCust.taxId || ''}
                        onChange={(e) =>
                          setNewCust((p) => ({ ...p, taxId: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground/90 mb-1">
                        Người liên hệ
                      </label>
                      <input
                        type="text"
                        className={inputCls}
                        value={newCust.contactPerson || ''}
                        onChange={(e) =>
                          setNewCust((p) => ({ ...p, contactPerson: e.target.value }))
                        }
                      />
                    </div>
                  </>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground/90 mb-1">
                      Số điện thoại *
                    </label>
                    <input
                      required
                      type="text"
                      className={inputCls}
                      value={newCust.phone || ''}
                      onChange={(e) => setNewCust((p) => ({ ...p, phone: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/90 mb-1">
                      Email *
                    </label>
                    <input
                      required
                      type="email"
                      className={inputCls}
                      value={newCust.email || ''}
                      onChange={(e) => setNewCust((p) => ({ ...p, email: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/90 mb-1">
                    Địa chỉ
                  </label>
                  <input
                    type="text"
                    className={inputCls}
                    value={newCust.address || ''}
                    onChange={(e) => setNewCust((p) => ({ ...p, address: e.target.value }))}
                  />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-foreground/90 bg-card border border-border rounded-md hover:bg-muted/30"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90"
                  >
                    Thêm mới
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ═════════════════════════════════════════════════════════════
// TAB 2 — CƠ HỘI (PIPELINE / KANBAN)
// ═════════════════════════════════════════════════════════════
function PipelineTab({
  deals,
  setDeals,
  customers,
}: {
  deals: Deal[];
  setDeals: React.Dispatch<React.SetStateAction<Deal[]>>;
  customers: Customer[];
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDeal, setNewDeal] = useState<Partial<Deal>>({ stage: 'Tiếp cận' });
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);

  const customerName = (id?: string) =>
    customers.find((c) => c.id === id)?.name || '';

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('dealId', id);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = (e: React.DragEvent, newStage: Stage) => {
    const dealId = e.dataTransfer.getData('dealId');
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage: newStage } : d)),
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeal.title || !newDeal.company || !newDeal.amount) return;

    if (editingDeal) {
      setDeals((prev) =>
        prev.map((d) =>
          d.id === editingDeal.id
            ? {
                ...d,
                title: newDeal.title!,
                company: newDeal.company!,
                amount: Number(newDeal.amount),
                stage: (newDeal.stage as Stage) || d.stage,
                customerId: newDeal.customerId,
              }
            : d,
        ),
      );
      setEditingDeal(null);
    } else {
      const deal: Deal = {
        id: Date.now().toString(),
        title: newDeal.title!,
        company: newDeal.company!,
        amount: Number(newDeal.amount),
        stage: (newDeal.stage as Stage) || 'Tiếp cận',
        date: new Date().toLocaleDateString('vi-VN'),
        customerId: newDeal.customerId,
      };
      setDeals((prev) => [...prev, deal]);
    }
    setIsModalOpen(false);
    setNewDeal({ stage: 'Tiếp cận' });
  };

  const openEdit = (deal: Deal) => {
    setEditingDeal(deal);
    setNewDeal({
      title: deal.title,
      company: deal.company,
      amount: deal.amount,
      stage: deal.stage,
      customerId: deal.customerId,
    });
    setIsModalOpen(true);
  };

  const deleteDeal = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa cơ hội này?')) {
      setDeals((prev) => prev.filter((d) => d.id !== id));
    }
  };

  return (
    <>
      {/* Add button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => {
            setEditingDeal(null);
            setNewDeal({ stage: 'Tiếp cận' });
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-white hover:bg-primary/90 h-10 px-4"
        >
          <Plus className="mr-2 h-4 w-4" /> Thêm cơ hội
        </button>
      </div>

      {/* Kanban */}
      <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <div
            key={stage.name}
            className="flex-shrink-0 w-80 flex flex-col bg-muted/30 rounded-xl border border-border"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage.name)}
          >
            <div className="p-4 border-b border-border flex items-center justify-between bg-card rounded-t-xl">
              <h3
                className={cn(
                  'text-sm font-semibold px-2.5 py-1 rounded-full border',
                  stage.color,
                )}
              >
                {stage.name}
              </h3>
              <span className="text-sm font-medium text-muted-foreground">
                {deals.filter((d) => d.stage === stage.name).length}
              </span>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4 min-h-[200px]">
              {deals
                .filter((d) => d.stage === stage.name)
                .map((deal) => (
                  <motion.div
                    key={deal.id}
                    whileHover={{ y: -4, scale: 1.02 }}
                    draggable
                    onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, deal.id)}
                    className="glass-card p-4 cursor-grab active:cursor-grabbing hover:border-primary transition-all group relative hover:shadow-md"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-sm font-medium text-foreground pr-12">
                        {deal.title}
                      </h4>
                      <div className="absolute top-2 right-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(deal)}
                          className="text-muted-foreground/70 hover:text-primary"
                          title="Sửa"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteDeal(deal.id)}
                          className="text-muted-foreground/70 hover:text-red-600"
                          title="Xóa"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {deal.company}
                    </p>
                    {deal.customerId && (
                      <p className="text-xs text-primary/80 flex items-center gap-1 mb-2">
                        <User className="h-3 w-3" />
                        {customerName(deal.customerId)}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50">
                      <div className="font-semibold text-primary">
                        {formatVND(deal.amount, 'full')}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {deal.date}
                      </div>
                    </div>
                  </motion.div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Deal Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card p-6 w-full max-w-md shadow-xl"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-foreground">
                  {editingDeal ? 'Chỉnh sửa cơ hội' : 'Thêm cơ hội mới'}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-muted-foreground/70 hover:text-muted-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground/90 mb-1">
                    Tên cơ hội / Hợp đồng
                  </label>
                  <input
                    required
                    type="text"
                    className={inputCls}
                    value={newDeal.title || ''}
                    onChange={(e) =>
                      setNewDeal((p) => ({ ...p, title: e.target.value }))
                    }
                    placeholder="VD: Hợp đồng phần mềm ERP"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/90 mb-1">
                    Khách hàng
                  </label>
                  <select
                    className={inputCls}
                    value={newDeal.customerId || ''}
                    onChange={(e) => {
                      const cid = e.target.value;
                      const cust = customers.find((c) => c.id === cid);
                      setNewDeal((p) => ({
                        ...p,
                        customerId: cid || undefined,
                        company: cust?.name || p.company || '',
                      }));
                    }}
                  >
                    <option value="">-- Chọn khách hàng --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/90 mb-1">
                    Tên công ty / Khách hàng
                  </label>
                  <input
                    required
                    type="text"
                    className={inputCls}
                    value={newDeal.company || ''}
                    onChange={(e) =>
                      setNewDeal((p) => ({ ...p, company: e.target.value }))
                    }
                    placeholder="VD: Công ty TNHH ABC"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/90 mb-1">
                    Giá trị dự kiến (VNĐ)
                  </label>
                  <input
                    required
                    type="text"
                    className={inputCls}
                    value={newDeal.amount ? formatNumber(Number(String(newDeal.amount).replace(/\D/g, ''))) : ''}
                    onChange={(e) =>
                      setNewDeal((p) => ({ ...p, amount: Number(e.target.value.replace(/\D/g, '')) }))
                    }
                    placeholder="VD: 150.000.000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/90 mb-1">
                    Giai đoạn
                  </label>
                  <select
                    className={inputCls}
                    value={newDeal.stage || 'Tiếp cận'}
                    onChange={(e) =>
                      setNewDeal((p) => ({ ...p, stage: e.target.value as Stage }))
                    }
                  >
                    {stages.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-foreground/90 bg-card border border-border rounded-md hover:bg-muted/30"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90"
                  >
                    {editingDeal ? 'Lưu thay đổi' : 'Thêm mới'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ═════════════════════════════════════════════════════════════
// TAB 3 — ĐỐI TÁC & NCC
// ═════════════════════════════════════════════════════════════
function PartnersTab({
  partners,
  setPartners,
}: {
  partners: Partner[];
  setPartners: React.Dispatch<React.SetStateAction<Partner[]>>;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newP, setNewP] = useState<Partial<Partner>>({ type: 'Đối tác' });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newP.name || !newP.contactPerson || !newP.phone || !newP.email) return;
    const p: Partner = {
      id: 'p' + Date.now(),
      name: newP.name!,
      type: newP.type as Partner['type'],
      contactPerson: newP.contactPerson!,
      phone: newP.phone!,
      email: newP.email!,
      notes: newP.notes,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setPartners((prev) => [...prev, p]);
    setIsModalOpen(false);
    setNewP({ type: 'Đối tác' });
  };

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa?')) {
      setPartners((prev) => prev.filter((p) => p.id !== id));
    }
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => {
            setNewP({ type: 'Đối tác' });
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-white hover:bg-primary/90 h-10 px-4"
        >
          <Plus className="mr-2 h-4 w-4" /> Thêm đối tác
        </button>
      </div>

      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tên</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Loại</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Người liên hệ</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">SĐT</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ghi chú</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {partners.map((p) => (
              <tr
                key={p.id}
                className="border-b border-border/50 hover:bg-primary/5 hover:shadow-sm transition-all group"
              >
                <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      p.type === 'Đối tác'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-orange-100 text-orange-700',
                    )}
                  >
                    {p.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{p.contactPerson}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.phone}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.email}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {p.notes || '-'}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/70 hover:text-red-600"
                    title="Xóa"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {partners.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center">
                    <Inbox className="h-10 w-10 mb-3 opacity-20" />
                    <p>Chưa có đối tác nào.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Partner Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card p-6 w-full max-w-md shadow-xl"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-foreground">Thêm đối tác / NCC</h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-muted-foreground/70 hover:text-muted-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground/90 mb-1">
                    Tên đối tác *
                  </label>
                  <input
                    required
                    type="text"
                    className={inputCls}
                    value={newP.name || ''}
                    onChange={(e) => setNewP((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/90 mb-1">
                    Loại
                  </label>
                  <select
                    className={inputCls}
                    value={newP.type || 'Đối tác'}
                    onChange={(e) =>
                      setNewP((p) => ({ ...p, type: e.target.value as Partner['type'] }))
                    }
                  >
                    <option value="Đối tác">Đối tác</option>
                    <option value="Nhà cung cấp">Nhà cung cấp</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/90 mb-1">
                    Người liên hệ *
                  </label>
                  <input
                    required
                    type="text"
                    className={inputCls}
                    value={newP.contactPerson || ''}
                    onChange={(e) =>
                      setNewP((p) => ({ ...p, contactPerson: e.target.value }))
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground/90 mb-1">
                      SĐT *
                    </label>
                    <input
                      required
                      type="text"
                      className={inputCls}
                      value={newP.phone || ''}
                      onChange={(e) =>
                        setNewP((p) => ({ ...p, phone: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/90 mb-1">
                      Email *
                    </label>
                    <input
                      required
                      type="email"
                      className={inputCls}
                      value={newP.email || ''}
                      onChange={(e) =>
                        setNewP((p) => ({ ...p, email: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/90 mb-1">
                    Ghi chú
                  </label>
                  <input
                    type="text"
                    className={inputCls}
                    value={newP.notes || ''}
                    onChange={(e) => setNewP((p) => ({ ...p, notes: e.target.value }))}
                  />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-foreground/90 bg-card border border-border rounded-md hover:bg-muted/30"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90"
                  >
                    Thêm mới
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ═════════════════════════════════════════════════════════════
// TAB 4 — CÔNG NỢ (DEBTS)
// ═════════════════════════════════════════════════════════════
type DebtSub = 'receivable' | 'payable';

function DebtsTab({
  receivables,
  setReceivables,
  payables,
  setPayables,
  customers,
  partners,
}: {
  receivables: Receivable[];
  setReceivables: React.Dispatch<React.SetStateAction<Receivable[]>>;
  payables: Payable[];
  setPayables: React.Dispatch<React.SetStateAction<Payable[]>>;
  customers: Customer[];
  partners: Partner[];
}) {
  const [sub, setSub] = useState<DebtSub>('receivable');

  // Avoid unused lint warnings — setters kept for future CRUD
  void setReceivables;
  void setPayables;

  const totalReceivable = receivables.reduce((s, r) => s + r.amount, 0);
  const totalPaidReceivable = receivables.reduce((s, r) => s + r.paidAmount, 0);
  const totalPayable = payables.reduce((s, p) => s + p.amount, 0);
  const totalPaidPayable = payables.reduce((s, p) => s + p.paidAmount, 0);
  const netCashFlow = totalPaidReceivable - totalPaidPayable;

  const custName = (id: string) =>
    customers.find((c) => c.id === id)?.name || id;
  const partnerName = (id: string) =>
    partners.find((p) => p.id === id)?.name || id;

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      'Đã thu đủ': 'bg-green-100 text-green-700',
      'Đã trả đủ': 'bg-green-100 text-green-700',
      'Thu một phần': 'bg-yellow-100 text-yellow-700',
      'Trả một phần': 'bg-yellow-100 text-yellow-700',
      'Chưa thu': 'bg-blue-100 text-blue-700',
      'Chưa trả': 'bg-blue-100 text-blue-700',
      'Quá hạn': 'bg-red-100 text-red-700',
    };
    return (
      <span
        className={cn(
          'px-2 py-0.5 rounded-full text-xs font-medium',
          map[status] || 'bg-gray-100 text-gray-700',
        )}
      >
        {status}
      </span>
    );
  };

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="glass-card p-4">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Tổng phải thu
          </p>
          <p className="text-lg font-bold text-foreground">
            {formatVND(totalReceivable, 'full')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Đã thu: {formatVND(totalPaidReceivable, 'full')}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Tổng phải trả
          </p>
          <p className="text-lg font-bold text-foreground">
            {formatVND(totalPayable, 'full')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Đã trả: {formatVND(totalPaidPayable, 'full')}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Dòng tiền ròng
          </p>
          <p
            className={cn(
              'text-lg font-bold',
              netCashFlow >= 0 ? 'text-green-600' : 'text-red-600',
            )}
          >
            {netCashFlow >= 0 ? '+' : ''}
            {formatVND(netCashFlow, 'full')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Thu thực tế − Trả thực tế
          </p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 mb-4">
        {([
          { key: 'receivable' as DebtSub, label: 'Phải thu' },
          { key: 'payable' as DebtSub, label: 'Phải trả' },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setSub(t.key)}
            className={cn(
              'px-4 py-1.5 text-sm font-medium rounded-full border transition-colors',
              sub === t.key
                ? 'bg-primary text-white border-primary'
                : 'bg-card text-foreground/80 border-border hover:bg-muted/30',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tables */}
      {sub === 'receivable' ? (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Khách hàng
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Số tiền
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Đã thu
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Còn lại
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Hạn thanh toán
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Trạng thái
                </th>
              </tr>
            </thead>
            <tbody>
              {receivables.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border/50 hover:bg-primary/5 hover:shadow-sm transition-all"
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {custName(r.customerId)}
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">
                    {formatVND(r.amount, 'full')}
                  </td>
                  <td className="px-4 py-3 text-right text-green-600">
                    {formatVND(r.paidAmount, 'full')}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-foreground">
                    {formatVND(r.amount - r.paidAmount, 'full')}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.dueDate}</td>
                  <td className="px-4 py-3">{statusBadge(r.status)}</td>
                </tr>
              ))}
              {receivables.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <Inbox className="h-10 w-10 mb-3 opacity-20" />
                      <p>Không có công nợ phải thu.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Nhà cung cấp
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Mô tả
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Số tiền
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Đã trả
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Còn lại
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Hạn
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Trạng thái
                </th>
              </tr>
            </thead>
            <tbody>
              {payables.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-border/50 hover:bg-primary/5 hover:shadow-sm transition-all"
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {partnerName(p.partnerId)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.description}</td>
                  <td className="px-4 py-3 text-right text-foreground">
                    {formatVND(p.amount, 'full')}
                  </td>
                  <td className="px-4 py-3 text-right text-green-600">
                    {formatVND(p.paidAmount, 'full')}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-foreground">
                    {formatVND(p.amount - p.paidAmount, 'full')}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.dueDate}</td>
                  <td className="px-4 py-3">{statusBadge(p.status)}</td>
                </tr>
              ))}
              {payables.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <Inbox className="h-10 w-10 mb-3 opacity-20" />
                      <p>Không có công nợ phải trả.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
