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
  Map
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

export function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (val: boolean) => void }) {
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
          className={cn(
            active
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
            'group flex gap-x-3 rounded-lg p-2.5 text-sm leading-6 font-medium transition-colors'
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
          {item.name}
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
        "fixed inset-y-0 left-0 z-50 w-64 bg-card/80 backdrop-blur-xl border-r border-border transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-16 shrink-0 items-center px-6 border-b border-border">
          <Link href="/erp" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-sm">
              <Hexagon size={18} />
            </div>
            <span className="font-bold text-lg text-foreground tracking-tight">
              NexusERP
            </span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2.5 mb-2">
              Quản trị
            </p>
            <ul role="list" className="space-y-1">
              {mainNav.map((item) => <NavItem key={item.href} item={item} />)}
            </ul>
          </div>

          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2.5 mb-2">
              Kế hoạch AI
            </p>
            <ul role="list" className="space-y-1">
              {planNav.map((item) => <NavItem key={item.href} item={item} />)}
            </ul>
          </div>
        </nav>
      </div>
    </>
  );
}
