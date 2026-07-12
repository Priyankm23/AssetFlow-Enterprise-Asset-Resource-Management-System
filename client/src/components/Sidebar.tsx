import { useState } from 'react';
import {
  LayoutDashboard,
  Building2,
  Package,
  ArrowLeftRight,
  CalendarDays,
  Wrench,
  ClipboardCheck,
  BarChart3,
  Bell,
  LogOut,
  Boxes,
  Menu,
  X,
} from 'lucide-react';
import type { Route } from '../lib/router';
import { useAuth } from '../lib/auth';

const navItems: { route: Route; label: string; icon: typeof LayoutDashboard }[] = [
  { route: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { route: 'org-setup', label: 'Organization Setup', icon: Building2 },
  { route: 'assets', label: 'Assets', icon: Package },
  { route: 'allocation', label: 'Allocation & Transfer', icon: ArrowLeftRight },
  { route: 'booking', label: 'Resource Booking', icon: CalendarDays },
  { route: 'maintenance', label: 'Maintenance', icon: Wrench },
  { route: 'audit', label: 'Audit', icon: ClipboardCheck },
  { route: 'reports', label: 'Reports', icon: BarChart3 },
  { route: 'notifications', label: 'Notifications', icon: Bell },
];

export function Sidebar({ current, onNavigate }: { current: Route; onNavigate: (r: Route) => void }) {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (r: Route) => {
    onNavigate(r);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-40 w-9 h-9 rounded-lg bg-ink-800 text-white flex items-center justify-center shadow-elevated"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && <div className="lg:hidden fixed inset-0 bg-ink-900/50 z-40" onClick={() => setMobileOpen(false)} />}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-60 bg-ink-800 flex flex-col shrink-0 transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-ink-700/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent-500 flex items-center justify-center">
              <Boxes className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-white font-semibold text-sm tracking-tight">AssetFlow</span>
          </div>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden text-ink-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2.5 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => {
            const active = current === item.route;
            const Icon = item.icon;
            return (
              <button
                key={item.route}
                onClick={() => handleNav(item.route)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition-all duration-150 ${
                  active
                    ? 'bg-accent-500/15 text-accent-300 border border-accent-500/20'
                    : 'text-ink-200 hover:bg-ink-700/50 hover:text-white border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-accent-400' : 'text-ink-300'}`} />
                <span className="truncate">{item.label}</span>
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-400" />}
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-3 py-3 border-t border-ink-700/50">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-ink-600 flex items-center justify-center text-xs font-semibold text-white shrink-0">
              {user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2) ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-white truncate">{user?.name}</div>
              <div className="text-[10px] text-ink-300 truncate">{user?.role}</div>
            </div>
            <button onClick={logout} className="text-ink-300 hover:text-status-lost transition-colors p-1" title="Sign out">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
