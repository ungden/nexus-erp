"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  Target, 
  Banknote, 
  CheckSquare, 
  Settings,
  Hexagon,
  Sparkles,
  GitBranchPlus,
  Map,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';

const mainNav = [
  { name: 'Tổng quan', href: '/erp', icon: LayoutDashboard },
  { name: 'Khách hàng (CRM)', href: '/erp/crm', icon: Users },
  { name: 'Nhân sự (HRM)', href: '/erp/hrm', icon: Briefcase },
  { name: 'KPI & Đánh giá', href: '/erp/kpi', icon: Target },
  { name: 'Lương thưởng', href: '/erp/payroll', icon: Banknote },
  { name: 'Công việc', href: '/erp/tasks', icon: CheckSquare },
  { name: 'Cài đặt', href: '/erp/settings', icon: Settings },
];

const planNav = [
  { name: 'Tạo AI Roadmap', href: '/erp/plan', icon: Sparkles },
  { name: 'Xem Roadmap', href: '/erp/plan/view', icon: Map },
  { name: 'Sơ đồ tư duy', href: '/erp/plan/mindmap', icon: GitBranchPlus },
];

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  collapsed: boolean;
  setCollapsed: (val: boolean) => void;
}

export function Sidebar({ isOpen, setIsOpen, collapsed, setCollapsed }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/erp') return pathname === '/erp';
    // Exact match for plan sub-routes
    if (href === '/erp/plan') return pathname === '/erp/plan';
    return pathname.startsWith(href);
  };

  const NavItem = ({ item }: { item: typeof mainNav[0] }) => {
    const active = isActive(item.href);
    return (
      <li>
        <Link
          href={item.href}
          title={collapsed ? item.name : undefined}
          className={cn(
            active
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
            'group flex items-center gap-x-3 rounded-lg p-2.5 text-sm leading-6 font-medium transition-colors',
            collapsed && 'justify-center px-2'
          )}
          onClick={() => setIsOpen(false)}
        >
          <item.icon
            className={cn(
              active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
              'h-5 w-5 shrink-0'
            )}
            aria-hidden="true"
          />
          {!collapsed && <span>{item.name}</span>}
        </Link>
      </li>
    );
  };

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 bg-card/80 backdrop-blur-xl border-r border-border transform transition-all duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col",
        collapsed ? "w-16" : "w-64",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className={cn(
          "flex h-16 shrink-0 items-center border-b border-border",
          collapsed ? "justify-center px-2" : "px-6"
        )}>
          <Link href="/erp" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-sm shrink-0">
              <Hexagon size={18} />
            </div>
            {!collapsed && (
              <span className="font-bold text-lg text-foreground tracking-tight">
                NexusERP
              </span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className={cn("flex-1 overflow-y-auto space-y-6", collapsed ? "p-2" : "p-4")}>
          <div>
            {!collapsed && (
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2.5 mb-2">
                Quản trị
              </p>
            )}
            <ul role="list" className="space-y-1">
              {mainNav.map((item) => <NavItem key={item.href} item={item} />)}
            </ul>
          </div>

          <div>
            {!collapsed && (
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2.5 mb-2">
                Kế hoạch AI
              </p>
            )}
            <ul role="list" className="space-y-1">
              {planNav.map((item) => <NavItem key={item.href} item={item} />)}
            </ul>
          </div>
        </nav>

        {/* Collapse toggle */}
        <div className={cn("border-t border-border", collapsed ? "p-2" : "p-3")}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "flex items-center gap-2 rounded-lg p-2 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors w-full",
              collapsed ? "justify-center" : ""
            )}
            title={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4 shrink-0" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 shrink-0" />
                <span className="text-xs">Thu gọn</span>
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
