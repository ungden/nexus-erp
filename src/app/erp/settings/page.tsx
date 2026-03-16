'use client';

import { useState } from 'react';
import { Settings as SettingsIcon, Shield, Users, Database, Key, Plus, X, Trash2, Edit2 } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';

interface Role {
  id: number;
  name: string;
  users: number;
  permissions: string[];
}

const initialRoles: Role[] = [
  { id: 1, name: 'Quản trị viên (Admin)', users: 2, permissions: ['Tất cả quyền'] },
  { id: 2, name: 'Trưởng phòng Sales', users: 3, permissions: ['Xem CRM', 'Sửa CRM', 'Xem KPI'] },
  { id: 3, name: 'Nhân viên HR', users: 5, permissions: ['Xem HRM', 'Sửa HRM', 'Xem Lương'] },
];

export default function Settings() {
  const { employees } = useAppContext();
  const [activeTab, setActiveTab] = useState('roles');
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRole, setNewRole] = useState<Partial<Role>>({ permissions: [] });

  const handleAddRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRole.name) return;
    
    const role: Role = {
      id: Date.now(),
      name: newRole.name,
      users: 0,
      permissions: newRole.permissions || ['Xem cơ bản'],
    };
    
    setRoles([...roles, role]);
    setIsModalOpen(false);
    setNewRole({ permissions: [] });
  };

  const deleteRole = (id: number) => {
    if (confirm('Bạn có chắc chắn muốn xóa vai trò này?')) {
      setRoles(roles.filter(r => r.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Cài đặt Hệ thống</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Quản lý phân quyền, bảo mật và cấu hình chung của doanh nghiệp.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Settings Sidebar */}
        <div className="w-full md:w-64 shrink-0">
          <nav className="space-y-1">
            <button 
              onClick={() => setActiveTab('roles')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'roles' ? 'bg-primary/5 text-primary/90' : 'text-foreground hover:bg-muted/30 hover:text-foreground'
              }`}
            >
              <Shield className={`mr-3 h-5 w-5 ${activeTab === 'roles' ? 'text-primary/80' : 'text-muted-foreground/70'}`} />
              Vai trò & Phân quyền
            </button>
            <button 
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'users' ? 'bg-primary/5 text-primary/90' : 'text-foreground hover:bg-muted/30 hover:text-foreground'
              }`}
            >
              <Users className={`mr-3 h-5 w-5 ${activeTab === 'users' ? 'text-primary/80' : 'text-muted-foreground/70'}`} />
              Quản lý Người dùng
            </button>
            <button 
              onClick={() => setActiveTab('activity')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'activity' ? 'bg-primary/5 text-primary/90' : 'text-foreground hover:bg-muted/30 hover:text-foreground'
              }`}
            >
              <Database className={`mr-3 h-5 w-5 ${activeTab === 'activity' ? 'text-primary/80' : 'text-muted-foreground/70'}`} />
              Nhật ký Hoạt động
            </button>
            <button 
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'security' ? 'bg-primary/5 text-primary/90' : 'text-foreground hover:bg-muted/30 hover:text-foreground'
              }`}
            >
              <Key className={`mr-3 h-5 w-5 ${activeTab === 'security' ? 'text-primary/80' : 'text-muted-foreground/70'}`} />
              Bảo mật
            </button>
            <button 
              onClick={() => setActiveTab('general')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'general' ? 'bg-primary/5 text-primary/90' : 'text-foreground hover:bg-muted/30 hover:text-foreground'
              }`}
            >
              <SettingsIcon className={`mr-3 h-5 w-5 ${activeTab === 'general' ? 'text-primary/80' : 'text-muted-foreground/70'}`} />
              Cấu hình Chung
            </button>
          </nav>
        </div>

        {/* Settings Content */}
        <div className="flex-1 glass-card overflow-hidden">
          {activeTab === 'roles' && (
            <div>
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium text-foreground">Vai trò & Phân quyền</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Quản lý các nhóm quyền truy cập vào hệ thống.</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-white hover:bg-primary/90 h-10 py-2 px-4"
                >
                  <Plus className="mr-2 h-4 w-4" /> Thêm vai trò
                </button>
              </div>
              <div className="divide-y divide-gray-200">
                {roles.map((role) => (
                  <div key={role.id} className="p-6 flex items-center justify-between hover:bg-muted/30 transition-colors group">
                    <div>
                      <h3 className="text-sm font-medium text-foreground">{role.name}</h3>
                      <div className="mt-1 flex items-center space-x-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{role.users} người dùng</span>
                        <span>•</span>
                        <span>Quyền: {role.permissions.join(', ')}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button className="text-sm font-medium text-primary hover:text-primary">
                        Chỉnh sửa
                      </button>
                      <button 
                        onClick={() => deleteRole(role.id)}
                        className="text-muted-foreground/70 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div>
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium text-foreground">Quản lý Người dùng</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Danh sách tài khoản có quyền truy cập hệ thống.</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-muted/30">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Tên người dùng</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Phòng ban</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Chức vụ</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Trạng thái</th>
                      <th scope="col" className="relative px-6 py-3"><span className="sr-only">Hành động</span></th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-gray-200">
                    {employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold mr-3">
                              {emp.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-foreground">{emp.name}</div>
                              <div className="text-sm text-muted-foreground">{emp.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{emp.department}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{emp.role}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Hoạt động
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button className="text-primary hover:text-primary">
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div>
              <div className="p-6 border-b border-border">
                <h2 className="text-lg font-medium text-foreground">Nhật ký Hoạt động (Audit Log)</h2>
                <p className="mt-1 text-sm text-muted-foreground">Theo dõi các thay đổi quan trọng trong hệ thống.</p>
              </div>
              <div className="p-6">
                <div className="flow-root">
                  <ul className="-mb-8">
                    <li>
                      <div className="relative pb-8">
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center ring-8 ring-white">
                              <Users className="h-4 w-4 text-green-600" />
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Nguyễn Văn A <span className="font-medium text-foreground">đã thêm nhân viên mới</span> (Đinh Thị F)</p>
                            </div>
                            <div className="text-right text-sm whitespace-nowrap text-muted-foreground">
                              <time dateTime="2023-10-20">10 phút trước</time>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                    <li>
                      <div className="relative pb-8">
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center ring-8 ring-white">
                              <Database className="h-4 w-4 text-blue-600" />
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Hệ thống <span className="font-medium text-foreground">đã tự động sao lưu dữ liệu</span></p>
                            </div>
                            <div className="text-right text-sm whitespace-nowrap text-muted-foreground">
                              <time dateTime="2023-10-20">2 giờ trước</time>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                    <li>
                      <div className="relative pb-8">
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center ring-8 ring-white">
                              <Shield className="h-4 w-4 text-primary" />
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Trần Thị B <span className="font-medium text-foreground">đã thay đổi quyền truy cập</span> của Lê Văn C</p>
                            </div>
                            <div className="text-right text-sm whitespace-nowrap text-muted-foreground">
                              <time dateTime="2023-10-19">Hôm qua</time>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab !== 'roles' && activeTab !== 'activity' && activeTab !== 'users' && (
            <div className="p-12 text-center">
              <SettingsIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-2 text-sm font-medium text-foreground">Tính năng đang được phát triển</h3>
              <p className="mt-1 text-sm text-muted-foreground">Phần cấu hình này sẽ sớm được cập nhật trong phiên bản tới.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Role Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-foreground">Thêm vai trò mới</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground/70 hover:text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddRole} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground/90 mb-1">Tên vai trò</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={newRole.name || ''}
                  onChange={e => setNewRole({...newRole, name: e.target.value})}
                  placeholder="VD: Quản lý dự án"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/90 mb-2">Quyền truy cập (Mặc định)</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input type="checkbox" className="rounded border-border text-primary focus:ring-primary/50" defaultChecked />
                    <span className="ml-2 text-sm text-foreground/90">Xem Dashboard</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="rounded border-border text-primary focus:ring-primary/50" />
                    <span className="ml-2 text-sm text-foreground/90">Quản lý Nhân sự (HRM)</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="rounded border-border text-primary focus:ring-primary/50" />
                    <span className="ml-2 text-sm text-foreground/90">Quản lý Khách hàng (CRM)</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="rounded border-border text-primary focus:ring-primary/50" />
                    <span className="ml-2 text-sm text-foreground/90">Duyệt bảng lương</span>
                  </label>
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
                  Tạo vai trò
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
