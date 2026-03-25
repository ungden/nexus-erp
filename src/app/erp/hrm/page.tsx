'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Search, Plus, Mail, X, Wallet, TrendingUp, AlertCircle, ChevronRight, Users, Briefcase } from 'lucide-react';
import { useAppContext, Employee } from '@/context/AppContext';
import { formatVND, formatNumber } from '@/lib/format';
import {
  ReactFlow, Background, Controls, MiniMap,
  type Node, type Edge, Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';

// ── Org Chart Node Component ──────────────────────────────
function OrgChartNode({ data }: { data: { employee: Employee } }) {
  const emp = data.employee;
  const statusColor = emp.status === 'Đang làm việc' ? 'bg-emerald-400' : 'bg-amber-400';

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-4 w-56 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
            {emp.name.charAt(0)}
          </div>
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${statusColor}`} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{emp.name}</p>
          <p className="text-[11px] font-medium text-primary truncate">{emp.role}</p>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-medium truncate">{emp.department}</span>
        <span className="text-[10px] font-semibold text-muted-foreground">{formatVND(emp.baseSalary)}</span>
      </div>
    </div>
  );
}

const nodeTypes = { orgNode: OrgChartNode };

// ── Dagre layout ──────────────────────────────────────────
function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 40 });

  nodes.forEach((node) => g.setNode(node.id, { width: 224, height: 90 }));
  edges.forEach((edge) => g.setEdge(edge.source, edge.target));

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const pos = g.node(node.id);
    return { ...node, position: { x: pos.x - 112, y: pos.y - 45 } };
  });

  return { nodes: layoutedNodes, edges };
}

// ── DEPT COLORS ───────────────────────────────────────────
const DEPT_COLORS = ['#4f46e5', '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

// ── Main Component ────────────────────────────────────────
export default function HRM() {
  const { employees, setEmployees, finance, tasks } = useAppContext();
  const [activeTab, setActiveTab] = useState<'list' | 'org'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({ status: 'Đang làm việc', managerId: 1 });
  const [activeDept, setActiveDept] = useState<string | null>(null);

  const hrBudget = (finance.targetRevenue * finance.allocations.hr) / 100;
  const currentPayroll = useMemo(() => employees.reduce((s, e) => s + e.baseSalary, 0), [employees]);
  const remainingBudget = hrBudget - currentPayroll;

  // ── Department stats ────────────────────────────────────
  const deptStats = useMemo(() => {
    const map: Record<string, { count: number; salary: number }> = {};
    employees.forEach(e => {
      if (!map[e.department]) map[e.department] = { count: 0, salary: 0 };
      map[e.department].count++;
      map[e.department].salary += e.baseSalary;
    });
    return Object.entries(map).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.count - a.count);
  }, [employees]);

  const employeeMetricsMap = useMemo(() => {
    const map = new Map<number, { todo: number; inProgress: number; done: number; totalBonus: number; rate: number }>();
    employees.forEach(emp => {
      const empTasks = tasks.filter(t => t.assigneeId === emp.id);
      const todo = empTasks.filter(t => t.status === 'todo').length;
      const inProgress = empTasks.filter(t => t.status === 'in-progress').length;
      const done = empTasks.filter(t => t.status === 'done').length;
      const totalBonus = empTasks.reduce((s, t) => s + (t.bonusAmount || 0), 0);
      const rate = empTasks.length > 0 ? Math.round(done / empTasks.length * 100) : 0;
      map.set(emp.id, { todo, inProgress, done, totalBonus, rate });
    });
    return map;
  }, [employees, tasks]);

  // ── Search ──────────────────────────────────────────────
  const filteredEmployees = useMemo(() => {
    let result = employees;
    if (activeDept) result = result.filter(e => e.department === activeDept);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q) || e.role.toLowerCase().includes(q)
      );
    }
    return result;
  }, [employees, searchQuery, activeDept]);

  // ── ReactFlow org chart ─────────────────────────────────
  const { orgNodes, orgEdges } = useMemo(() => {
    const nodes: Node[] = employees.map(emp => ({
      id: String(emp.id),
      type: 'orgNode',
      data: { employee: emp },
      position: { x: 0, y: 0 },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    }));
    const edges: Edge[] = employees
      .filter(e => e.managerId != null)
      .map(e => ({
        id: `e-${e.managerId}-${e.id}`,
        source: String(e.managerId),
        target: String(e.id),
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#94a3b8', strokeWidth: 2 },
      }));
    const { nodes: ln, edges: le } = getLayoutedElements(nodes, edges);
    return { orgNodes: ln, orgEdges: le };
  }, [employees]);

  // ── CRUD ────────────────────────────────────────────────
  const handleAddEmployee = useCallback((e: React.FormEvent) => {
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
  }, [employees, newEmployee, setEmployees]);

  const deleteEmployee = useCallback((id: number) => {
    if (confirm('Bạn có chắc chắn muốn xóa nhân viên này?')) {
      setEmployees(employees.filter(e => e.id !== id));
    }
  }, [employees, setEmployees]);

  return (
    <div className="space-y-6 relative">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Quản trị Nhân sự</h1>
          <p className="mt-1 text-sm text-muted-foreground">Hồ sơ nhân viên, sơ đồ tổ chức, ngân sách HR</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-muted/50 p-1 rounded-lg">
            {(['list', 'org'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors ${activeTab === tab ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                {tab === 'list' ? 'Danh sách' : 'Sơ đồ tổ chức'}
              </button>
            ))}
          </div>
          <button onClick={() => setIsModalOpen(true)} className="inline-flex items-center px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary/90">
            <Plus className="mr-1.5 h-4 w-4" /> Thêm
          </button>
        </div>
      </div>

      {/* ── Overview cards ─────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
          <p className="text-[10px] font-bold text-primary uppercase">Ngân sách HR</p>
          <p className="text-lg font-bold text-primary mt-1">{formatVND(hrBudget)}</p>
          <p className="text-[10px] text-primary/70">{finance.allocations.hr}% doanh thu</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Quỹ lương</p>
          <p className="text-lg font-bold text-foreground mt-1">{formatVND(currentPayroll)}</p>
          <p className="text-[10px] text-muted-foreground">{employees.length} nhân sự</p>
          <p className="text-[10px] text-muted-foreground">TB: {formatVND(Math.round(currentPayroll / (employees.length || 1)))}/người</p>
        </div>
        <div className={`rounded-xl p-4 border ${remainingBudget >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <p className={`text-[10px] font-bold uppercase ${remainingBudget >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Còn lại</p>
          <p className={`text-lg font-bold mt-1 ${remainingBudget >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{formatVND(remainingBudget)}</p>
          <p className={`text-[10px] ${remainingBudget >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{remainingBudget >= 0 ? 'Có thể tuyển thêm' : 'Vượt ngân sách'}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Sử dụng ngân sách</p>
          <div className="mt-2">
            <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{
                width: `${hrBudget > 0 ? Math.min(100, Math.round(currentPayroll / hrBudget * 100)) : 0}%`,
                background: currentPayroll <= hrBudget ? '#10b981' : '#ef4444',
              }} />
            </div>
            <p className="text-xs font-bold text-foreground mt-1">{hrBudget > 0 ? Math.round(currentPayroll / hrBudget * 100) : 0}%</p>
          </div>
        </div>
      </div>

      {/* ── Department breakdown ───────────────────────────── */}
      {deptStats.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3"><Briefcase className="w-4 h-4 text-violet-500" /> Phòng ban</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {deptStats.map((dept, i) => {
              const maxCount = Math.max(...deptStats.map(d => d.count), 1);
              return (
                <div key={dept.name} className="bg-muted/20 rounded-lg p-3 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: DEPT_COLORS[i % DEPT_COLORS.length] }} />
                    <p className="text-xs font-bold text-foreground truncate">{dept.name}</p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-foreground">{dept.count}</span>
                    <span className="text-[10px] text-muted-foreground">người</span>
                  </div>
                  <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden mt-1.5">
                    <div className="h-full rounded-full" style={{ width: `${(dept.count / maxCount) * 100}%`, background: DEPT_COLORS[i % DEPT_COLORS.length] }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{formatVND(dept.salary)}/th</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Department filter chips */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveDept(null)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${!activeDept ? 'bg-primary text-white' : 'bg-muted/30 text-foreground border border-border hover:bg-muted/50'}`}
        >
          Tất cả ({employees.length})
        </button>
        {deptStats.map((dept, i) => (
          <button
            key={dept.name}
            onClick={() => setActiveDept(activeDept === dept.name ? null : dept.name)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors flex items-center gap-1.5 ${activeDept === dept.name ? 'bg-primary text-white' : 'bg-muted/30 text-foreground border border-border hover:bg-muted/50'}`}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: activeDept === dept.name ? 'white' : DEPT_COLORS[i % DEPT_COLORS.length] }} />
            {dept.name} ({dept.count})
          </button>
        ))}
      </div>

      {/* ── Tab content ────────────────────────────────────── */}
      {activeTab === 'list' ? (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm theo tên, email, phòng ban..."
                className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>
          <div className="p-4">
            {filteredEmployees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-xl">Không tìm thấy nhân viên.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEmployees.map((person) => (
                  <div key={person.id} className="glass-card flex flex-col p-4 hover:shadow-md transition-shadow relative group border-l-4" style={{ borderLeftColor: DEPT_COLORS[deptStats.findIndex(d => d.name === person.department) % DEPT_COLORS.length] || '#94a3b8' }}>
                    <button onClick={() => deleteEmployee(person.id)} className="absolute top-3 right-3 text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="h-4 w-4" />
                    </button>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative shrink-0">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">{person.name.charAt(0)}</div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${person.status === 'Đang làm việc' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-foreground truncate">{person.name}</h3>
                        <div className="flex gap-1.5 mt-1">
                          <span className="px-2 py-0.5 text-[9px] font-semibold bg-blue-100 text-blue-800 rounded">{person.role}</span>
                          <span className="px-2 py-0.5 text-[9px] font-semibold bg-violet-100 text-violet-800 rounded">{person.department}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-xs text-muted-foreground mb-3">
                      {person.email && <div className="flex items-center gap-2"><Mail className="h-3 w-3" /><span className="truncate">{person.email}</span></div>}
                      <div className="flex items-center gap-2"><Wallet className="h-3 w-3" /><span className="font-semibold text-foreground">{formatVND(person.baseSalary, 'full')}</span></div>
                    </div>
                    {/* Task metrics */}
                    {(() => {
                      const m = employeeMetricsMap.get(person.id);
                      if (!m) return null;
                      const total = m.todo + m.inProgress + m.done;
                      return (
                        <div className="space-y-2 mb-3">
                          {total > 0 && (
                            <>
                              <div className="flex items-center gap-3 text-[10px]">
                                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-400" />{m.todo} chờ</span>
                                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />{m.inProgress} đang làm</span>
                                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{m.done} xong</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-muted/40 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${m.rate}%` }} />
                                </div>
                                <span className="text-[10px] font-bold text-foreground">{m.rate}%</span>
                              </div>
                            </>
                          )}
                          {m.totalBonus > 0 && (
                            <span className="inline-block text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                              +{formatVND(m.totalBonus)} thưởng
                            </span>
                          )}
                        </div>
                      );
                    })()}
                    <div className="mt-auto pt-3 border-t border-border">
                      <Link href={`/erp/hrm/${person.id}`} className="text-primary hover:text-primary/80 font-medium text-xs flex items-center justify-center">
                        Xem chi tiết <ChevronRight className="h-3 w-3 ml-1" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Org Chart with ReactFlow ────────────────────── */
        <div className="glass-card overflow-hidden" style={{ height: '600px' }}>
          {employees.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Thêm nhân viên để xem sơ đồ tổ chức</p>
            </div>
          ) : (
            <ReactFlow
              nodes={orgNodes}
              edges={orgEdges}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              minZoom={0.3}
              maxZoom={1.5}
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#e2e8f0" gap={20} />
              <Controls showInteractive={false} />
              <MiniMap
                nodeColor="#4f46e5"
                maskColor="rgba(255,255,255,0.8)"
                style={{ border: '1px solid #e2e8f0', borderRadius: 8 }}
              />
            </ReactFlow>
          )}
        </div>
      )}

      {/* ── Add Employee Modal ─────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-foreground">Thêm nhân viên mới</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleAddEmployee} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Họ và tên</label>
                <input required type="text" className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={newEmployee.name || ''} onChange={e => setNewEmployee({...newEmployee, name: e.target.value})} placeholder="Nguyễn Văn A" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Email</label>
                <input required type="email" className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={newEmployee.email || ''} onChange={e => setNewEmployee({...newEmployee, email: e.target.value})} placeholder="a.nguyen@company.com" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Phòng ban</label>
                  <input type="text" className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={newEmployee.department || ''} onChange={e => setNewEmployee({...newEmployee, department: e.target.value})} placeholder="Sales" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Chức vụ</label>
                  <input type="text" className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={newEmployee.role || ''} onChange={e => setNewEmployee({...newEmployee, role: e.target.value})} placeholder="Nhân viên" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Lương (VNĐ)</label>
                  <input required type="text" className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={newEmployee.baseSalary ? formatNumber(Number(String(newEmployee.baseSalary).replace(/\D/g, ''))) : ''}
                    onChange={e => setNewEmployee({...newEmployee, baseSalary: Number(e.target.value.replace(/\D/g, ''))})} placeholder="15.000.000" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Quản lý</label>
                  <select className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={newEmployee.managerId || ''} onChange={e => setNewEmployee({...newEmployee, managerId: e.target.value ? Number(e.target.value) : null})}>
                    <option value="">-- Không --</option>
                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>)}
                  </select>
                </div>
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-foreground bg-muted/30 border border-border rounded-lg hover:bg-muted/50">Hủy</button>
                <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90">Thêm mới</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
