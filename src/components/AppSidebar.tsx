import { useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  Users,
  Newspaper,
  Bell,
  LogOut,
  Stethoscope,
  ChevronLeft,
  ScanLine,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useI18n } from '@/lib/i18n';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import type { ComponentType } from 'react';

type NavItem = {
  key: 'dashboard' | 'appointments' | 'records' | 'dentalCharts' | 'xrays' | 'notifications' | 'doctors' | 'news';
  url: string;
  icon: ComponentType<{ className?: string }>;
  label?: string;
};

const primaryNavItems: NavItem[] = [
  { key: 'dashboard', url: '/', icon: LayoutDashboard },
  { key: 'appointments', url: '/appointments', icon: Calendar },
  { key: 'records', url: '/records', icon: ClipboardList },
  { key: 'dentalCharts', url: '/dental-charts', icon: Stethoscope },
  { key: 'xrays', url: '/xrays', icon: ScanLine, label: 'X-Rays' },
  { key: 'notifications', url: '/notifications', icon: Bell },
];

const secondaryNavItems: NavItem[] = [
  { key: 'doctors', url: '/doctors', icon: Users },
  { key: 'news', url: '/news', icon: Newspaper },
];

const logoSrc = '/emerald-general.png';

function SidebarContent({ collapsed, onCollapse }: { collapsed: boolean; onCollapse?: () => void }) {
  const { t } = useI18n();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const linkClass = collapsed
    ? 'glass-button flex items-center justify-center'
    : 'glass-button flex items-center gap-3';

  const activeClass = '!bg-gradient-end !text-white !border-glass !shadow-glass';

  return (
    <div className="flex h-full flex-col">
      <div className={`px-4 ${collapsed ? 'py-4' : 'py-5'}`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <img src={logoSrc} className={`${collapsed ? 'h-14 w-14' : 'h-16 w-16'} rounded-[1.4rem]`} />
          {!collapsed && <div className="text-white font-bold text-xl">Дентіс</div>}
        </div>

        {!collapsed && onCollapse && (
          <button onClick={onCollapse} className="glass-button mt-4 flex items-center gap-2 px-3 py-2">
            <ChevronLeft className="h-4 w-4" />
            Згорнути
          </button>
        )}
      </div>

      <nav className="flex-1 px-2 py-4 space-y-2">
        {primaryNavItems.map((item) => (
          <NavLink key={item.key} to={item.url} className={linkClass} activeClassName={activeClass}>
            <item.icon className="h-5 w-5" />
            {!collapsed && (
              <span>
                {item.label ||
                  t(
                    item.key as
                      | 'dashboard'
                      | 'appointments'
                      | 'records'
                      | 'dentalCharts'
                      | 'notifications'
                      | 'doctors'
                      | 'news',
                  )}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-2 py-4 border-t space-y-2">
        {secondaryNavItems.map((item) => (
          <NavLink key={item.key} to={item.url} className={linkClass} activeClassName={activeClass}>
            <item.icon className="h-5 w-5" />
            {!collapsed && (
              <span>
                {item.label ||
                  t(
                    item.key as
                      | 'dashboard'
                      | 'appointments'
                      | 'records'
                      | 'dentalCharts'
                      | 'notifications'
                      | 'doctors'
                      | 'news',
                  )}
              </span>
            )}
          </NavLink>
        ))}

        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className={`glass-button w-full text-red-400 ${collapsed ? 'justify-center' : 'gap-3'}`}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>{t('logout')}</span>}
        </button>
      </div>
    </div>
  );
}

export function AppSidebar({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (v: boolean) => void }) {
  const inactivityTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const resetTimer = () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = window.setTimeout(() => setCollapsed(true), 20000);
    };

    resetTimer();
    window.addEventListener('mousemove', resetTimer);

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      window.removeEventListener('mousemove', resetTimer);
    };
  }, [setCollapsed]);

  return (
    <aside
      className={`glass-sidebar fixed left-0 top-0 z-40 h-screen transition-all duration-300 ${
        collapsed ? 'w-[86px]' : 'w-[280px]'
      }`}
    >
      <SidebarContent collapsed={collapsed} onCollapse={() => setCollapsed(true)} />
    </aside>
  );
}
