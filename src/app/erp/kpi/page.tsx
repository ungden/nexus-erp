'use client';

import { useState } from 'react';
import { Target, TrendingUp, Award, BarChart3, ChevronRight, X, Trash2 } from 'lucide-react';
import { useAppContext, KPI as AppKPI, KpiStatus } from '@/context/AppContext';

export default function KPI() {
  const { kpis, setKpis } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newKpi, setNewKpi] = useState<Partial<AppKPI>>({ status: 'on-track' });

  const handleAddKpi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKpi.title || !newKpi.target || !newKpi.current) return;
    
    const target = Number(newKpi.target);
    const current = Number(newKpi.current);
    const progress = Math.min(Math.round((current / target) * 100), 100);

    const kpi: AppKPI = {
      id: Date.now(),
      title: newKpi.title,
      target,
      current,
      progress,
      status: newKpi.status as KpiStatus,
      department: newKpi.department || 'Chung',
    };
    
    setKpis([...kpis, kpi]);
    setIsModalOpen(false);
    setNewKpi({ status: 'on-track' });
  };

  const deleteKpi = (id: number) => {
    if (confirm('Bạn có chắc chắn muốn xóa KPI này?')) {
      setKpis(kpis.filter(k => k.id !== id));
    }
  };

  const completedCount = kpis.filter(k => k.progress >= 100).length;
  const inProgressCount = kpis.filter(k => k.progress < 100).length;

  const formatValue = (value: number, title: string) => {
    if (title.toLowerCase().includes('doanh thu') || title.toLowerCase().includes('chi phí')) {
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    }
    if (title.toLowerCase().includes('tỷ lệ') || title.toLowerCase().includes('giảm')) {
      return `${value}%`;
    }
    return value.toString();
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Đánh giá Năng lực & KPI</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Theo dõi mục tiêu (OKR/KPI) của công ty, phòng ban và cá nhân.
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-white hover:bg-primary/90 h-10 py-2 px-4"
        >
          <Target className="mr-2 h-4 w-4" /> Thiết lập Mục tiêu
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* KPI Overview Cards */}
        <div className="glass-card p-6 flex items-center space-x-4">
          <div className="p-3 bg-green-100 rounded-lg text-green-600">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Mục tiêu hoàn thành</p>
            <p className="text-2xl font-bold text-foreground">{completedCount}/{kpis.length}</p>
          </div>
        </div>
        <div className="glass-card p-6 flex items-center space-x-4">
          <div className="p-3 bg-yellow-100 rounded-lg text-yellow-600">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Đang thực hiện</p>
            <p className="text-2xl font-bold text-foreground">{inProgressCount}</p>
          </div>
        </div>
        <div className="glass-card p-6 flex items-center space-x-4">
          <div className="p-3 bg-primary/10 rounded-lg text-primary">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Điểm đánh giá TB</p>
            <p className="text-2xl font-bold text-foreground">4.2/5.0</p>
          </div>
        </div>
      </div>

      {/* KPI List */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-medium text-foreground">Tiến độ Mục tiêu (Công ty)</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {kpis.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Chưa có mục tiêu nào được thiết lập.</div>
          ) : kpis.map((kpi) => (
            <div key={kpi.id} className="p-6 hover:bg-muted/30 transition-colors group">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <h3 className="text-sm font-medium text-foreground">{kpi.title}</h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted/50 text-gray-800">
                    {kpi.department}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={() => deleteKpi(kpi.id)} className="text-muted-foreground/70 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button className="text-muted-foreground/70 hover:text-muted-foreground">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                <span>Đạt được: <strong className="text-foreground">{formatValue(kpi.current, kpi.title)}</strong></span>
                <span>Mục tiêu: <strong className="text-foreground">{formatValue(kpi.target, kpi.title)}</strong></span>
              </div>
              
              <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${
                    kpi.status === 'on-track' ? 'bg-green-500' : 
                    kpi.status === 'at-risk' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${kpi.progress}%` }}
                />
              </div>
              <div className="mt-2 text-right text-xs font-medium text-muted-foreground">
                {kpi.progress}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add KPI Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-foreground">Thiết lập Mục tiêu mới</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground/70 hover:text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddKpi} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground/90 mb-1">Tên mục tiêu (KPI/OKR)</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={newKpi.title || ''}
                  onChange={e => setNewKpi({...newKpi, title: e.target.value})}
                  placeholder="VD: Doanh thu Q4/2023"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground/90 mb-1">Mục tiêu cần đạt</label>
                  <input 
                    required
                    type="number" 
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={newKpi.target || ''}
                    onChange={e => setNewKpi({...newKpi, target: Number(e.target.value)})}
                    placeholder="VD: 5000000000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/90 mb-1">Hiện tại</label>
                  <input 
                    required
                    type="number" 
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={newKpi.current || ''}
                    onChange={e => setNewKpi({...newKpi, current: Number(e.target.value)})}
                    placeholder="VD: 1000000000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground/90 mb-1">Trạng thái</label>
                  <select 
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={newKpi.status || 'on-track'}
                    onChange={e => setNewKpi({...newKpi, status: e.target.value as KpiStatus})}
                  >
                    <option value="on-track">Đúng tiến độ</option>
                    <option value="at-risk">Có nguy cơ</option>
                    <option value="behind">Chậm trễ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/90 mb-1">Phòng ban phụ trách</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={newKpi.department || ''}
                    onChange={e => setNewKpi({...newKpi, department: e.target.value})}
                    placeholder="VD: Sales"
                  />
                </div>
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
                  Lưu mục tiêu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
