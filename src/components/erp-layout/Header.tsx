"use client"

import { Menu, Bell, Search, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const displayEmail = user?.email ?? '';
  const shortEmail = displayEmail.length > 24 ? displayEmail.slice(0, 22) + '…' : displayEmail;
  const initials = (user?.user_metadata?.full_name as string)?.[0]?.toUpperCase()
    || displayEmail[0]?.toUpperCase()
    || '?';

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-x-4 border-b border-border bg-card/80 backdrop-blur-xl px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      <button
        type="button"
        className="-m-2.5 p-2.5 text-muted-foreground lg:hidden"
        onClick={onMenuClick}
      >
        <span className="sr-only">Mở sidebar</span>
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <form className="relative flex flex-1" action="#" method="GET">
          <label htmlFor="search-field" className="sr-only">
            Tìm kiếm
          </label>
          <Search
            className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="search-field"
            className="block h-full w-full border-0 py-0 pl-8 pr-0 text-foreground bg-transparent placeholder:text-muted-foreground focus:ring-0 sm:text-sm"
            placeholder="Tìm kiếm khách hàng, nhân viên, công việc..."
            type="search"
            name="search"
          />
        </form>
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          <button type="button" className="-m-2.5 p-2.5 text-muted-foreground hover:text-foreground relative">
            <span className="sr-only">Xem thông báo</span>
            <Bell className="h-6 w-6" aria-hidden="true" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-border" aria-hidden="true" />

          <div className="flex items-center gap-x-2 lg:gap-x-3">
            <div className="flex items-center gap-x-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                {initials}
              </div>
              <span className="hidden lg:flex lg:items-center">
                <span className="ml-1 text-sm font-medium leading-6 text-foreground" aria-hidden="true" title={displayEmail}>
                  {shortEmail}
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="-m-1.5 p-1.5 text-muted-foreground hover:text-red-500 transition-colors"
              title="Đăng xuất"
            >
              <span className="sr-only">Đăng xuất</span>
              <LogOut className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
