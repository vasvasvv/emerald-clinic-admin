import { useEffect, useRef, useCallback } from 'react';
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
  Smartphone,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useI18n } from '@/lib/i18n';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { canAccessSiteManagement } from '@/lib/admin-user';
import { useIsTablet } from '@/hooks/use-mobile';
import type { ComponentType } from 'react';

type NavItem = {
  key:
    | 'dashboard'
    | 'appointments'
    | 'records'
    | 'dentalCharts'
    | 'xrays'
    | 'notifications'
    | 'appTab'
    | 'doctors'
    | 'news';
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
  { key: 'appTab', url: '/app', icon: Smartphone },
];

const secondaryNavItems: NavItem[] = [
  { key: 'doctors', url: '/doctors', icon: Users },
  { key: 'news', url: '/news', icon: Newspaper },
];

const logoSrc = '/emerald-general.png';

export const mobileBottomNavItems: Array<Pick<NavItem, 'key' | 'url' | 'icon'>> = [
  { key: 'dashboard', url: '/', icon: LayoutDashboard },
  { key: 'records', url: '/records', icon: ClipboardList },
  { key: 'appointments', url: '/appointments', icon: Calendar },
  { key: 'dentalCharts', url: '/dental-charts', icon: Stethoscope },
];

export function SidebarContent({ collapsed, onCollapse }: { collapsed: boolean; onCollapse?: () => void }) {
  const { t } = useI18n();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const canManageSiteContent = canAccessSiteManagement(user);

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
                      | 'appTab'
                      | 'doctors'
                      | 'news',
                  )}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-2 py-4 border-t space-y-2">
        {secondaryNavItems
          .filter((item) => canManageSiteContent || (item.key !== 'doctors' && item.key !== 'news'))
          .map((item) => (
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
                        | 'appTab'
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
  const lastActivityRef = useRef<number>(Date.now());
  const isTablet = useIsTablet();

  // Throttled activity tracking - prevents excessive timer resets
  const handleActivity = useCallback(() => {
    const now = Date.now();
    // Only reset if 500ms passed since last activity (throttling)
    if (now - lastActivityRef.current < 500) return;
    lastActivityRef.current = now;

    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    // 15 seconds for tablets, 20 seconds for desktop
    const timeout = isTablet ? 15000 : 20000;
    inactivityTimerRef.current = window.setTimeout(() => setCollapsed(true), timeout);
  }, [isTablet, setCollapsed]);

  useEffect(() => {
    // Initial timer setup
    const timeout = isTablet ? 15000 : 20000;
    inactivityTimerRef.current = window.setTimeout(() => setCollapsed(true), timeout);

    // Desktop: mousemove only
    if (!isTablet) {
      window.addEventListener('mousemove', handleActivity, { passive: true });
    }
    // Tablet: both mouse and touch events
    else {
      window.addEventListener('mousemove', handleActivity, { passive: true });
      window.addEventListener('touchstart', handleActivity, { passive: true });
      window.addEventListener('click', handleActivity, { passive: true });
    }

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (!isTablet) {
        window.removeEventListener('mousemove', handleActivity);
      } else {
        window.removeEventListener('mousemove', handleActivity);
        window.removeEventListener('touchstart', handleActivity);
        window.removeEventListener('click', handleActivity);
      }
    };
  }, [handleActivity, isTablet, setCollapsed]);

  const handleSidebarClick = () => {
    if (collapsed) {
      setCollapsed(false);
    }
  };

  return (
    <aside
      className={`glass-sidebar fixed left-0 top-0 z-40 h-screen cursor-pointer ${
        collapsed ? 'w-[86px]' : 'w-[280px]'
      }`}
      style={{
        transition: 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        willChange: 'width',
        contain: 'layout',
      }}
      onClick={handleSidebarClick}
    >
      <SidebarContent collapsed={collapsed} onCollapse={() => setCollapsed(true)} />
    </aside>
  );
}
