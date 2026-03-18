'use client';

import { useState } from 'react';
import { CheckSquare, Clock, Plus, Calendar, X, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppContext, Task, TaskStatus, TaskPriority, PayrollRecord } from '@/context/AppContext';
import { formatVND, formatNumber } from '@/lib/format';

const statuses: { id: TaskStatus; name: string; color: string }[] = [
  { id: 'todo', name: 'Cần làm', color: 'bg-muted/50 text-gray-800 border-border' },
  { id: 'in-progress', name: 'Đang làm', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'done', name: 'Hoàn thành', color: 'bg-green-100 text-green-800 border-green-200' },
];

export default function Tasks() {
  const { tasks, setTasks, employees, setPayrolls } = useAppContext();
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'mine'>('all');
  const [newTask, setNewTask] = useState<Partial<Task>>({ status: 'todo', priority: 'medium' });
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const currentUser = 4; // Mock current user

  const filteredTasks = tasks.filter(task => {
    if (filter === 'mine') return task.assigneeId === currentUser;
    return true;
  });

  const getEmployeeInfo = (employeeId: number) => {
    const emp = employees.find(e => e.id === employeeId);
    return {
      name: emp?.name || 'Unknown',
      department: emp?.department || 'Unknown'
    };
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('taskId', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handlePayrollUpdate = (employeeId: number, amountDelta: number) => {
    if (amountDelta === 0) return;

    const now = new Date();
    const currentMonth = `${now.getMonth() + 1}`.padStart(2, '0') + '/' + now.getFullYear();
    const employee = employees.find(e => e.id === employeeId);
    const baseSalary = employee?.baseSalary || 0;

    setPayrolls(prev => {
      const existingIndex = prev.findIndex(p => p.employeeId === employeeId && p.month === currentMonth);
      if (existingIndex >= 0) {
        const existing = prev[existingIndex];
        
        // Prevent updates to approved payrolls
        if (existing.status === 'Đã duyệt') {
          alert('Bảng lương tháng này đã được duyệt, không thể thay đổi phần thưởng KPI. Vui lòng liên hệ HR.');
          return prev;
        }

        const newKpiBonus = existing.kpiBonus + amountDelta;
        const newTotal = existing.base + existing.commission + newKpiBonus - existing.deduction;
        
        const newPayrolls = [...prev];
        newPayrolls[existingIndex] = {
          ...existing,
          kpiBonus: newKpiBonus,
          total: newTotal
        };
        return newPayrolls;
      } else {
        if (amountDelta <= 0) return prev; // Avoid creating with negative bonus
        const newPayroll: PayrollRecord = {
          id: Date.now() + Math.floor(Math.random() * 1000),
          employeeId: employeeId,
          month: currentMonth,
          base: baseSalary,
          commission: 0,
          kpiBonus: amountDelta,
          deduction: 0,
          total: baseSalary + amountDelta,
          status: 'Chờ duyệt'
        };
        return [...prev, newPayroll];
      }
    });
  };

  const updateTaskStatus = (task: Task, newStatus: TaskStatus) => {
    if (task.status === newStatus) return;
    
    if (task.bonusAmount && task.bonusAmount > 0) {
      if (task.status !== 'done' && newStatus === 'done') {
        handlePayrollUpdate(task.assigneeId, task.bonusAmount);
      } else if (task.status === 'done' && newStatus !== 'done') {
        handlePayrollUpdate(task.assigneeId, -task.bonusAmount);
      }
    }
  };

  const handleDrop = (e: React.DragEvent, newStatus: TaskStatus) => {
    const taskId = e.dataTransfer.getData('taskId');
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    updateTaskStatus(task, newStatus);
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title || !newTask.assigneeId) return;
    
    const parsedBonus = newTask.bonusAmount ? Number(newTask.bonusAmount.toString().replace(/\./g, '')) : undefined;
    const newStatus = (newTask.status as TaskStatus) || 'todo';
    const newAssigneeId = Number(newTask.assigneeId);

    if (editingTask) {
      // Revert old bonus if task was previously marked 'done'
      if (editingTask.status === 'done' && editingTask.bonusAmount && editingTask.bonusAmount > 0) {
        handlePayrollUpdate(editingTask.assigneeId, -editingTask.bonusAmount);
      }
      
      // Apply new bonus if task is now 'done'
      if (newStatus === 'done' && parsedBonus && parsedBonus > 0) {
        handlePayrollUpdate(newAssigneeId, parsedBonus);
      }

      setTasks(tasks.map(t => t.id === editingTask.id ? {
        ...t,
        title: newTask.title!,
        assigneeId: newAssigneeId,
        dueDate: newTask.dueDate || t.dueDate,
        priority: (newTask.priority as TaskPriority) || t.priority,
        status: newStatus,
        department: newTask.department || t.department,
        bonusAmount: parsedBonus,
      } : t));
      setEditingTask(null);
    } else {
      const task: Task = {
        id: Date.now().toString(),
        title: newTask.title,
        assigneeId: newAssigneeId,
        dueDate: newTask.dueDate || new Date().toLocaleDateString('vi-VN'),
        priority: (newTask.priority as TaskPriority) || 'medium',
        status: newStatus,
        department: newTask.department || 'Chung',
        bonusAmount: parsedBonus,
      };

      if (task.status === 'done' && task.bonusAmount && task.bonusAmount > 0) {
        handlePayrollUpdate(task.assigneeId, task.bonusAmount);
      }

      setTasks([...tasks, task]);
    }
    
    setIsModalOpen(false);
    setNewTask({ status: 'todo', priority: 'medium' });
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setNewTask({
      title: task.title,
      assigneeId: task.assigneeId,
      dueDate: task.dueDate,
      priority: task.priority,
      status: task.status,
      department: task.department,
      bonusAmount: task.bonusAmount
    });
    setIsModalOpen(true);
  };

  const deleteTask = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa công việc này?')) {
      const task = tasks.find(t => t.id === id);
      if (task && task.status === 'done' && task.bonusAmount && task.bonusAmount > 0) {
        handlePayrollUpdate(task.assigneeId, -task.bonusAmount);
      }
      setTasks(tasks.filter(t => t.id !== id));
    }
  };

  const toggleTaskStatus = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    
    updateTaskStatus(task, newStatus);
    setTasks(tasks.map(t => {
      if (t.id === id) {
        return { ...t, status: newStatus };
      }
      return t;
    }));
  };

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quản lý Công việc (Tasks)</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Giao việc, nhắc việc và theo dõi tiến độ dự án.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-muted/50 p-1 rounded-lg">
            <button
              onClick={() => setView('list')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                view === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Danh sách
            </button>
            <button
              onClick={() => setView('kanban')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                view === 'kanban' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Bảng (Kanban)
            </button>
          </div>
          <button 
            onClick={() => {
              setEditingTask(null);
              setNewTask({ status: 'todo', priority: 'medium' });
              setIsModalOpen(true);
            }}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-white hover:bg-primary/90 h-10 py-2 px-4"
          >
            <Plus className="mr-2 h-4 w-4" /> Giao việc mới
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <div className="glass-card flex-1 overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setFilter('all')}
                className={cn("inline-flex items-center px-3 py-1.5 border rounded-md text-sm font-medium transition-colors", filter === 'all' ? "border-border text-foreground/90 bg-card" : "border-transparent text-muted-foreground hover:bg-muted/30")}
              >
                Tất cả
              </button>
              <button 
                onClick={() => setFilter('mine')}
                className={cn("inline-flex items-center px-3 py-1.5 border rounded-md text-sm font-medium transition-colors", filter === 'mine' ? "border-border text-foreground/90 bg-card" : "border-transparent text-muted-foreground hover:bg-muted/30")}
              >
                Của tôi
              </button>
            </div>
          </div>

          <ul role="list" className="divide-y divide-gray-200 overflow-y-auto max-h-[calc(100vh-250px)]">
            {filteredTasks.length === 0 ? (
              <li className="p-8 text-center text-muted-foreground">Không có công việc nào.</li>
            ) : filteredTasks.map((task) => (
              <li key={task.id} className="p-4 hover:bg-muted/30 transition-colors group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button onClick={() => toggleTaskStatus(task.id)} className="flex-shrink-0 focus:outline-none">
                      {task.status === 'done' ? (
                        <CheckSquare className="h-6 w-6 text-green-500" />
                      ) : task.status === 'in-progress' ? (
                        <Clock className="h-6 w-6 text-yellow-500" />
                      ) : (
                        <div className="h-6 w-6 border-2 border-border rounded text-transparent hover:border-indigo-500 transition-colors" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${task.status === 'done' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                        {task.title}
                      </p>
                      <div className="flex flex-wrap items-center mt-1 text-xs text-muted-foreground gap-x-4 gap-y-2">
                        <span className="flex items-center">
                          <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold mr-1 text-[10px]">
                            {getEmployeeInfo(task.assigneeId).name.charAt(0)}
                          </div>
                          {getEmployeeInfo(task.assigneeId).name}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {task.dueDate}
                        </span>
                        <span>{task.department}</span>
                        {task.bonusAmount && task.bonusAmount > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800">
                            💰 Thưởng: +{formatVND(task.bonusAmount, 'full')}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      task.priority === 'high' ? 'bg-red-100 text-red-800' :
                      task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {task.priority === 'high' ? 'Cao' : task.priority === 'medium' ? 'Trung bình' : 'Thấp'}
                    </span>
                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditModal(task)} className="text-muted-foreground/70 hover:text-primary">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => deleteTask(task.id)} className="text-muted-foreground/70 hover:text-red-600">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-6 min-w-max h-full">
            {statuses.map((status) => (
              <div 
                key={status.id} 
                className="w-80 flex flex-col bg-muted/30 rounded-xl border border-border"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, status.id)}
              >
                <div className="p-4 border-b border-border flex items-center justify-between bg-card rounded-t-xl">
                  <h3 className={cn("text-sm font-semibold px-2.5 py-1 rounded-full border", status.color)}>
                    {status.name}
                  </h3>
                  <span className="text-sm font-medium text-muted-foreground">
                    {filteredTasks.filter(t => t.status === status.id).length}
                  </span>
                </div>
                
                <div className="flex-1 p-4 overflow-y-auto space-y-4 min-h-[200px]">
                  {filteredTasks.filter(t => t.status === status.id).map((task) => (
                    <div 
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      className="glass-card p-4 cursor-grab active:cursor-grabbing hover:border-primary transition-colors group relative flex flex-col"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className={`text-sm font-medium pr-12 ${task.status === 'done' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{task.title}</h4>
                        <div className="absolute top-2 right-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditModal(task)} className="text-muted-foreground/70 hover:text-primary">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => deleteTask(task.id)} className="text-muted-foreground/70 hover:text-red-600">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {task.bonusAmount && task.bonusAmount > 0 ? (
                        <div className="mb-2 w-fit inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800">
                          💰 Thưởng: +{formatVND(task.bonusAmount, 'full')}
                        </div>
                      ) : null}

                      <div className="flex items-center justify-between mt-auto pt-2">
                        <div className="flex items-center text-xs text-muted-foreground">
                          <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold mr-2 text-[10px]">
                            {getEmployeeInfo(task.assigneeId).name.charAt(0)}
                          </div>
                          {getEmployeeInfo(task.assigneeId).name}
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                          task.priority === 'high' ? 'bg-red-100 text-red-800' :
                          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {task.priority === 'high' ? 'Cao' : task.priority === 'medium' ? 'TB' : 'Thấp'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 w-full max-w-md shadow-xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-foreground">{editingTask ? 'Chỉnh sửa công việc' : 'Giao việc mới'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground/70 hover:text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground/90 mb-1">Tên công việc</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={newTask.title || ''}
                  onChange={e => setNewTask({...newTask, title: e.target.value})}
                  placeholder="VD: Chuẩn bị báo cáo tài chính"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/90 mb-1">Người phụ trách</label>
                <select 
                  required
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={newTask.assigneeId || ''}
                  onChange={e => setNewTask({...newTask, assigneeId: Number(e.target.value)})}
                >
                  <option value="" disabled>Chọn người phụ trách</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground/90 mb-1">Hạn chót</label>
                  <input 
                    type="date" 
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={newTask.dueDate || ''}
                    onChange={e => setNewTask({...newTask, dueDate: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/90 mb-1">Mức độ ưu tiên</label>
                  <select 
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={newTask.priority || 'medium'}
                    onChange={e => setNewTask({...newTask, priority: e.target.value as TaskPriority})}
                  >
                    <option value="high">Cao</option>
                    <option value="medium">Trung bình</option>
                    <option value="low">Thấp</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground/90 mb-1">Trạng thái</label>
                  <select 
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={newTask.status || 'todo'}
                    onChange={e => setNewTask({...newTask, status: e.target.value as TaskStatus})}
                  >
                    <option value="todo">Cần làm</option>
                    <option value="in-progress">Đang làm</option>
                    <option value="done">Hoàn thành</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/90 mb-1">Mức thưởng (VNĐ)</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={newTask.bonusAmount ? formatNumber(Number(newTask.bonusAmount.toString().replace(/\./g, ''))) : ''}
                    onChange={e => {
                      const val = e.target.value.replace(/\./g, '');
                      if (val === '') {
                        setNewTask({...newTask, bonusAmount: undefined});
                      } else if (!isNaN(Number(val))) {
                        setNewTask({...newTask, bonusAmount: Number(val)});
                      }
                    }}
                    placeholder="VD: 500.000"
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
                  {editingTask ? 'Lưu thay đổi' : 'Giao việc'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
