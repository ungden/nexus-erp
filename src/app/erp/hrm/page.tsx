'use client';

import { useState, useMemo } from 'react';
import { Search, Plus, Mail, X, Wallet, TrendingUp, AlertCircle, ChevronRight, ChevronDown } from 'lucide-react';
import { useAppContext, Employee } from '@/context/AppContext';
import { formatVND, formatNumber } from '@/lib/format';

const OrgNode = ({ employee, allEmployees, level = 0 }: { employee: Employee, allEmployees: Employee[], level?: number }) => {
  const [expanded, setExpanded] = useState(true);
  const subordinates = allEmployees.filter(e => e.managerId === employee.id);
  const hasSubordinates = subordinates.length > 0;

  return (
    <div className="flex flex-col items-center">
      <div 
        className={`relative flex flex-col items-center p-4 border border-border rounded-xl bg-card shadow-sm transition-all ${hasSubordinates ? 'cursor-pointer hover:border-primary hover:shadow-md' : ''} w-64`}
        onClick={() => hasSubordinates && setExpanded(!expanded)}
      >
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg mb-3">
          {employee.name.charAt(0)}
        </div>
        <div className="text-center">
          <div className="text-sm font-bold text-foreground">{employee.name}</div>
          <div className="text-xs font-medium text-primary mt-1">{employee.role}</div>
          <div className="text-xs text-muted-foreground mt-1">{employee.department}</div>
        </div>
        {hasSubordinates && (
          <div className="absolute -bottom-3 bg-card border border-border rounded-full p-1 text-muted-foreground/70">
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </div>
        )}
      </div>
      
      {hasSubordinates && expanded && (
        <div className="relative flex justify-center pt-6 mt-6">
          {/* Vertical line from parent to horizontal line */}
          <div className="absolute top-0 left-1/2 w-px h-6 bg-gray-300 -translate-x-1/2 -translate-y-full"></div>
          
          {subordinates.map((sub, index) => (
            <div key={sub.id} className="relative flex flex-col items-center px-4">
              {/* Horizontal line connecting children */}
              {subordinates.length > 1 && (
                <div className="absolute top-0 h-px bg-gray-300" style={{ 
                  left: index === 0 ? '50%' : 0,
                  right: index === subordinates.length - 1 ? '50%' : 0
                }}></div>
              )}
              {/* Vertical line from horizontal line to child */}
              <div className="absolute top-0 left-1/2 w-px h-6 bg-gray-300 -translate-x-1/2"></div>
              <div className="pt-6">
                <OrgNode employee={sub} allEmployees={allEmployees} level={level + 1} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function HRM() {
  const { employees, setEmployees, finance } = useAppContext();
  const [activeTab, setActiveTab] = useState<'list' | 'org'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({ status: 'Đang làm việc', managerId: 1 });

  // Finance-led budget
  const hrBudget = (finance.targetRevenue * finance.allocations.hr) / 100;
  
  const currentPayroll = useMemo(() => {
    return employees.reduce((total, emp) => total + emp.baseSalary, 0);
  }, [employees]);

  const remainingBudget = hrBudget - currentPayroll;

  const filteredEmployees = useMemo(() => {
    if (!searchQuery) return employees;
    const lowerQuery = searchQuery.toLowerCase();
    return employees.filter(emp => 
      emp.name.toLowerCase().includes(lowerQuery) || 
      emp.email.toLowerCase().includes(lowerQuery) ||
      emp.department.toLowerCase().includes(lowerQuery) ||
      emp.role.toLowerCase().includes(lowerQuery)
    );
  }, [employees, searchQuery]);

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployee.name || !newEmployee.email || !newEmployee.baseSalary) return;
    
    const emp: Employee = {
      id: Date.now(),
      name: newEmployee.name,
      role: newEmployee.role || 'Nhân viên',
      department: newEmployee.department || 'Chung',
      email: newEmployee.email,
      phone: newEmployee.phone || '',
      status: newEmployee.status || 'Đang làm việc',
      joinDate: new Date().toLocaleDateString('vi-VN'),
      baseSalary: Number(newEmployee.baseSalary),
      managerId: newEmployee.managerId ? Number(newEmployee.managerId) : null,
    };
    
    setEmployees([...employees, emp]);
    setIsModalOpen(false);
    setNewEmployee({ status: 'Đang làm việc', managerId: 1 });
  };

  const deleteEmployee = (id: number) => {
    if (confirm('Bạn có chắc chắn muốn xóa nhân viên này?')) {
      setEmployees(employees.filter(e => e.id !== id));
    }
  };

  const rootEmployees = employees.filter(e => e.managerId === null);

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quản trị Nhân sự (HRM)</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quản lý hồ sơ nhân viên, sơ đồ tổ chức và ngân sách nhân sự.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-muted/50 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Danh sách
            </button>
            <button
              onClick={() => setActiveTab('org')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'org' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sơ đồ tổ chức
            </button>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-white hover:bg-primary/90 h-10 py-2 px-4"
          >
            <Plus className="mr-2 h-4 w-4" /> Thêm nhân viên
          </button>
        </div>
      </div>

      {/* Finance-Led HR Budget Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-primary/5 rounded-xl p-5 border border-primary/20">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-primary">Ngân sách Nhân sự (Từ Finance)</h3>
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold text-primary">{formatVND(hrBudget, 'full')}</p>
          <p className="mt-1 text-xs text-primary/90">{finance.allocations.hr}% Mục tiêu Doanh thu ({formatVND(finance.targetRevenue, 'full')})</p>
        </div>
        
        <div className="glass-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">Quỹ lương cơ bản hiện tại</h3>
            <TrendingUp className="w-5 h-5 text-muted-foreground/70" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{formatVND(currentPayroll, 'full')}</p>
          <p className="mt-1 text-xs text-muted-foreground">Tổng lương cơ bản của {employees.length} nhân sự</p>
        </div>

        <div className={`rounded-xl p-5 border ${remainingBudget >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
          <div className="flex items-center justify-between">
            <h3 className={`text-sm font-medium ${remainingBudget >= 0 ? 'text-green-900' : 'text-red-900'}`}>
              Ngân sách tuyển dụng còn lại
            </h3>
            <AlertCircle className={`w-5 h-5 ${remainingBudget >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </div>
          <p className={`mt-2 text-2xl font-bold ${remainingBudget >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {formatVND(remainingBudget, 'full')}
          </p>
          <p className={`mt-1 text-xs ${remainingBudget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {remainingBudget >= 0 ? 'Đủ ngân sách để tuyển thêm nhân sự' : 'Cảnh báo: Vượt ngân sách nhân sự'}
          </p>
        </div>
      </div>

      {activeTab === 'list' ? (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm theo tên, email, phòng ban..."
                className="w-full pl-9 pr-4 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-muted/30">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Nhân viên</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Chức vụ / Phòng ban</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Trạng thái</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Lương cơ bản</th>
                  <th scope="col" className="relative px-6 py-3"><span className="sr-only">Hành động</span></th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-gray-200">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      Không tìm thấy nhân viên nào phù hợp.
                    </td>
                  </tr>
                ) : filteredEmployees.map((person) => (
                  <tr key={person.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {person.name.charAt(0)}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-foreground">{person.name}</div>
                          <div className="text-sm text-muted-foreground flex items-center mt-1">
                            <Mail className="h-3 w-3 mr-1" /> {person.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-foreground">{person.role}</div>
                      <div className="text-sm text-muted-foreground">{person.department}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        person.status === 'Đang làm việc' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {person.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-medium text-right">
                      {formatVND(person.baseSalary, 'full')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => deleteEmployee(person.id)} className="text-red-600 hover:text-red-900 opacity-0 group-hover:opacity-100 transition-opacity">
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/50">
            <h2 className="text-sm font-semibold text-foreground/90 uppercase tracking-wider">Cây Tổ chức Doanh nghiệp</h2>
          </div>
          <div className="p-8 overflow-x-auto flex justify-center min-h-[500px]">
            {rootEmployees.map(root => (
              <OrgNode key={root.id} employee={root} allEmployees={employees} />
            ))}
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-foreground">Thêm nhân viên mới</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground/70 hover:text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground/90 mb-1">Họ và tên</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={newEmployee.name || ''}
                  onChange={e => setNewEmployee({...newEmployee, name: e.target.value})}
                  placeholder="VD: Nguyễn Văn A"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/90 mb-1">Email</label>
                <input 
                  required
                  type="email" 
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={newEmployee.email || ''}
                  onChange={e => setNewEmployee({...newEmployee, email: e.target.value})}
                  placeholder="VD: a.nguyen@company.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground/90 mb-1">Phòng ban</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={newEmployee.department || ''}
                    onChange={e => setNewEmployee({...newEmployee, department: e.target.value})}
                    placeholder="VD: Sales"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/90 mb-1">Chức vụ</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={newEmployee.role || ''}
                    onChange={e => setNewEmployee({...newEmployee, role: e.target.value})}
                    placeholder="VD: Nhân viên"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground/90 mb-1">Lương cơ bản (VNĐ)</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={newEmployee.baseSalary ? formatNumber(Number(String(newEmployee.baseSalary).replace(/\D/g, ''))) : ''}
                    onChange={e => setNewEmployee({...newEmployee, baseSalary: Number(e.target.value.replace(/\D/g, ''))})}
                    placeholder="VD: 15.000.000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/90 mb-1">Quản lý trực tiếp</label>
                  <select 
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={newEmployee.managerId || ''}
                    onChange={e => setNewEmployee({...newEmployee, managerId: e.target.value ? Number(e.target.value) : null})}
                  >
                    <option value="">-- Không có --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                    ))}
                  </select>
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
