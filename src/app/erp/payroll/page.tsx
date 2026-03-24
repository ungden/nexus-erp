'use client';

import { useState, useMemo } from 'react';
import { Download, Eye, Calculator, CheckCircle, X, AlertCircle, DollarSign, Clock, Award } from 'lucide-react';
import { useAppContext, PayrollRecord } from '@/context/AppContext';
import { formatVND, formatNumber } from '@/lib/format';

export default function Payroll() {
  const { payrolls, setPayrolls, employees } = useAppContext();
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollRecord | null>(null);
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState(false);

  const approvePayroll = (id: number) => {
    setPayrolls(payrolls.map(p => p.id === id ? { ...p, status: 'Đã duyệt' } : p));
    if (selectedPayslip && selectedPayslip.id === id) {
      setSelectedPayslip({ ...selectedPayslip, status: 'Đã duyệt' });
    }
  };

  const getEmployeeInfo = (employeeId: number) => {
    const emp = employees.find(e => e.id === employeeId);
    return {
      name: emp?.name || 'Unknown',
      department: emp?.department || 'Unknown'
    };
  };

  // ── Header scorecard stats ──────────────────────────────────
  const totalPayroll = useMemo(() => payrolls.reduce((sum, p) => sum + p.total, 0), [payrolls]);
  const pendingCount = useMemo(() => payrolls.filter(p => p.status === 'Chờ duyệt').length, [payrolls]);
  const totalKpiBonus = useMemo(() => payrolls.reduce((sum, p) => sum + p.kpiBonus, 0), [payrolls]);

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lương thưởng (C&B)</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tính lương tự động, quản lý phiếu lương và tạm ứng.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (confirm('Tạo bảng lương cho tháng hiện tại?')) {
                const newPayrolls = employees.map(emp => ({
                  id: Date.now() + emp.id,
                  employeeId: emp.id,
                  month: new Date().toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' }),
                  base: emp.baseSalary,
                  commission: 0,
                  kpiBonus: 0,
                  deduction: 0,
                  total: emp.baseSalary,
                  status: 'Chờ duyệt' as const
                }));
                setPayrolls([...payrolls, ...newPayrolls]);
              }
            }}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-primary text-primary hover:bg-primary/5 h-10 py-2 px-4"
          >
            <Calculator className="mr-2 h-4 w-4" /> Tạo bảng lương
          </button>
          <button
            onClick={() => setIsFormulaModalOpen(true)}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-border bg-card text-foreground/90 hover:bg-muted/30 h-10 py-2 px-4"
          >
            <Calculator className="mr-2 h-4 w-4" /> Công thức lương
          </button>
          <button
            onClick={() => alert('Đang xuất file Excel...')}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-white hover:bg-primary/90 h-10 py-2 px-4"
          >
            <Download className="mr-2 h-4 w-4" /> Xuất Excel
          </button>
        </div>
      </div>

      {/* ── Header scorecards (3 cards) ──────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="bg-card rounded-xl border border-border border-l-4 border-l-primary p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10">
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Tổng lương tháng này</p>
            <p className="text-xl font-bold text-foreground">{formatVND(totalPayroll)}</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border border-l-4 border-l-amber-500 p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10">
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Chờ duyệt</p>
            <p className="text-xl font-bold text-foreground">{formatNumber(pendingCount)}</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border border-l-4 border-l-emerald-500 p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10">
            <Award className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Tổng thưởng KPI</p>
            <p className="text-xl font-bold text-foreground">{formatVND(totalKpiBonus)}</p>
          </div>
        </div>
      </div>

      {/* Formula Preview */}
      <div className="bg-primary/5 rounded-xl border border-primary/20 p-6 flex items-start space-x-4">
        <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
          <Calculator className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-primary">Công thức lương hiện tại (Sales)</h3>
          <p className="mt-1 text-sm text-primary/90 font-mono bg-card p-2 rounded border border-primary/30 inline-block">
            Tổng nhận = Lương cứng + Hoa hồng (từ CRM) + Thưởng KPI - Phạt đi muộn - Thuế/Bảo hiểm
          </p>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-medium text-foreground">Bảng lương</h2>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Trạng thái: Đang chờ duyệt
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-muted/30">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Tháng</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Nhân viên</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Lương cứng</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Hoa hồng</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Thưởng KPI</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Khấu trừ</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground uppercase tracking-wider">Thực nhận</th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Trạng thái</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Hành động</span></th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-gray-200">
              {payrolls.map((row) => {
                const empInfo = getEmployeeInfo(row.employeeId);
                const isPending = row.status === 'Chờ duyệt';
                const hasBonus = row.kpiBonus > 0;
                return (
                <tr key={row.id} className={`hover:bg-muted/30 transition-colors ${isPending ? 'bg-amber-50/50' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{row.month}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-foreground">{empInfo.name}</div>
                    <div className="text-sm text-muted-foreground">{empInfo.department}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground text-right">{formatVND(row.base, 'full')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium text-right">+{formatVND(row.commission, 'full')}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${hasBonus ? 'text-emerald-600' : 'text-green-600'}`}>
                    {hasBonus && <span className="inline-block mr-1 w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    +{formatVND(row.kpiBonus, 'full')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium text-right">-{formatVND(row.deduction, 'full')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-foreground text-right">{formatVND(row.total, 'full')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {row.status === 'Đã duyệt' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="mr-1 h-3 w-3" /> Đã duyệt
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Chờ duyệt
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => setSelectedPayslip(row)}
                      className="text-primary hover:text-primary flex items-center justify-end w-full"
                    >
                      <Eye className="h-4 w-4 mr-1" /> Xem phiếu
                    </button>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payslip Modal */}
      {selectedPayslip && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">Phiếu lương Tháng {selectedPayslip.month}</h2>
                <p className="text-sm text-muted-foreground">{getEmployeeInfo(selectedPayslip.employeeId).name} - {getEmployeeInfo(selectedPayslip.employeeId).department}</p>
              </div>
              <button onClick={() => setSelectedPayslip(null)} className="text-muted-foreground/70 hover:text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Lương cơ bản:</span>
                <span className="font-medium">{formatVND(selectedPayslip.base, 'full')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Hoa hồng (CRM):</span>
                <span className="font-medium text-green-600">+{formatVND(selectedPayslip.commission, 'full')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Thưởng KPI:</span>
                <span className="font-medium text-green-600">+{formatVND(selectedPayslip.kpiBonus, 'full')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Khấu trừ (Thuế, BH, Đi muộn):</span>
                <span className="font-medium text-red-600">-{formatVND(selectedPayslip.deduction, 'full')}</span>
              </div>
              <div className="pt-4 border-t border-border flex justify-between items-center">
                <span className="font-bold text-foreground">Thực nhận:</span>
                <span className="text-xl font-bold text-primary">{formatVND(selectedPayslip.total, 'full')}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSelectedPayslip(null)}
                className="px-4 py-2 text-sm font-medium text-foreground/90 bg-card border border-border rounded-md hover:bg-muted/30"
              >
                Đóng
              </button>
              {selectedPayslip.status === 'Chờ duyệt' && (
                <button
                  onClick={() => approvePayroll(selectedPayslip.id)}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90"
                >
                  Duyệt phiếu lương
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Formula Modal */}
      {isFormulaModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 w-full max-w-lg shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-foreground">Cấu hình Công thức lương</h2>
              <button onClick={() => setIsFormulaModalOpen(false)} className="text-muted-foreground/70 hover:text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-yellow-50 p-4 rounded-lg flex items-start space-x-3 border border-yellow-100">
                <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  Tính năng chỉnh sửa công thức động đang được phát triển. Hiện tại hệ thống sử dụng công thức mặc định.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/90 mb-1">Công thức (Sales)</label>
                <textarea
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-sm"
                  rows={4}
                  defaultValue="[Lương_cơ_bản] + [Hoa_hồng_CRM] + [Thưởng_KPI] - [Phạt_đi_muộn] - [Thuế_TNCN] - [BHYT_BHXH]"
                  readOnly
                />
              </div>
              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => setIsFormulaModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90"
                >
                  Đã hiểu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
