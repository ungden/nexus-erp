'use client';

import { useState } from 'react';
import { Plus, Calendar, X, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppContext, Deal, Stage } from '@/context/AppContext';

const stages: { name: Stage; color: string }[] = [
  { name: 'Tiếp cận', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { name: 'Đàm phán', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { name: 'Chốt sale', color: 'bg-green-100 text-green-800 border-green-200' },
  { name: 'Thất bại', color: 'bg-red-100 text-red-800 border-red-200' },
];

export default function CRM() {
  const { deals, setDeals } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDeal, setNewDeal] = useState<Partial<Deal>>({ stage: 'Tiếp cận' });
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('dealId', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, newStage: Stage) => {
    const dealId = e.dataTransfer.getData('dealId');
    setDeals(deals.map(deal => deal.id === dealId ? { ...deal, stage: newStage } : deal));
  };

  const handleAddDeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeal.title || !newDeal.company || !newDeal.amount) return;
    
    if (editingDeal) {
      setDeals(deals.map(d => d.id === editingDeal.id ? {
        ...d,
        title: newDeal.title!,
        company: newDeal.company!,
        amount: Number(newDeal.amount),
        stage: (newDeal.stage as Stage) || d.stage,
      } : d));
      setEditingDeal(null);
    } else {
      const deal: Deal = {
        id: Date.now().toString(),
        title: newDeal.title,
        company: newDeal.company,
        amount: Number(newDeal.amount),
        stage: (newDeal.stage as Stage) || 'Tiếp cận',
        date: new Date().toLocaleDateString('vi-VN'),
      };
      setDeals([...deals, deal]);
    }
    
    setIsModalOpen(false);
    setNewDeal({ stage: 'Tiếp cận' });
  };

  const openEditModal = (deal: Deal) => {
    setEditingDeal(deal);
    setNewDeal({
      title: deal.title,
      company: deal.company,
      amount: deal.amount,
      stage: deal.stage
    });
    setIsModalOpen(true);
  };

  const deleteDeal = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa khách hàng này?')) {
      setDeals(deals.filter(d => d.id !== id));
    }
  };

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quản lý Khách hàng (CRM)</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quản lý phễu khách hàng, theo dõi tiến độ đàm phán và chốt sale.
          </p>
        </div>
        <button 
          onClick={() => {
            setEditingDeal(null);
            setNewDeal({ stage: 'Tiếp cận' });
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-white hover:bg-primary/90 h-10 py-2 px-4"
        >
          <Plus className="mr-2 h-4 w-4" /> Thêm khách hàng
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <div 
            key={stage.name} 
            className="flex-shrink-0 w-80 flex flex-col bg-muted/30 rounded-xl border border-border"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage.name)}
          >
            <div className="p-4 border-b border-border flex items-center justify-between bg-card rounded-t-xl">
              <h3 className={cn("text-sm font-semibold px-2.5 py-1 rounded-full border", stage.color)}>
                {stage.name}
              </h3>
              <span className="text-sm font-medium text-muted-foreground">
                {deals.filter(d => d.stage === stage.name).length}
              </span>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto space-y-4 min-h-[200px]">
              {deals.filter(d => d.stage === stage.name).map((deal) => (
                <div 
                  key={deal.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, deal.id)}
                  className="glass-card p-4 cursor-grab active:cursor-grabbing hover:border-primary transition-colors group relative"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-sm font-medium text-foreground pr-12">{deal.title}</h4>
                    <div className="absolute top-2 right-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openEditModal(deal)}
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
                  <p className="text-xs text-muted-foreground mb-3">{deal.company}</p>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-4 pt-3 border-t border-border/50">
                    <div className="font-semibold text-primary">{formatCurrency(deal.amount)}</div>
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {deal.date}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add Deal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-foreground">Thêm khách hàng mới</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground/70 hover:text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddDeal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground/90 mb-1">Tên cơ hội / Hợp đồng</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={newDeal.title || ''}
                  onChange={e => setNewDeal({...newDeal, title: e.target.value})}
                  placeholder="VD: Hợp đồng phần mềm ERP"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/90 mb-1">Tên công ty / Khách hàng</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={newDeal.company || ''}
                  onChange={e => setNewDeal({...newDeal, company: e.target.value})}
                  placeholder="VD: Công ty TNHH ABC"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/90 mb-1">Giá trị dự kiến (VNĐ)</label>
                <input 
                  required
                  type="number" 
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={newDeal.amount || ''}
                  onChange={e => setNewDeal({...newDeal, amount: Number(e.target.value)})}
                  placeholder="VD: 150000000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/90 mb-1">Giai đoạn</label>
                <select 
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={newDeal.stage || 'Tiếp cận'}
                  onChange={e => setNewDeal({...newDeal, stage: e.target.value as Stage})}
                >
                  {stages.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
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
                  Thêm mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
