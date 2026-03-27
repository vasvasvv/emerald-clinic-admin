import { useEffect, useRef, useState } from 'react';
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
  { key: 'dashboard' as const, url: '/', icon: LayoutDashboard },
  { key: 'appointments' as const, url: '/appointments', icon: Calendar },
  { key: 'records' as const, url: '/records', icon: ClipboardList },
  { key: 'dentalCharts' as const, url: '/dental-charts', icon: Stethoscope },
  { key: 'xrays' as const, url: '/xrays', icon: ScanLine, label: 'Знімки' },
  { key: 'notifications' as const, url: '/notifications', icon: Bell },
];

const secondaryNavItems: NavItem[] = [
  { key: 'doctors' as const, url: '/doctors', icon: Users },
  { key: 'news' as const, url: '/news', icon: Newspaper },
];

const logoSrc = '/emerald-general.png';
const SIDEBAR_COLLAPSED_KEY = 'emerald-sidebar-collapsed';

function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className={`flex min-w-0 items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
      <img
        src={logoSrc}
        alt="Дентіс адмін"
        className={`${collapsed ? 'h-14 w-14' : 'h-16 w-16'} rounded-[1.4rem] object-cover shadow-[0_12px_24px_rgba(0,0,0,0.24)]`}
      />
      {!collapsed && (
        <div className="min-w-0 leading-none">
          <p className="truncate font-heading text-[1.5rem] font-bold tracking-[-0.02em] text-foreground">Дентіс</p>
          <p className="mt-1 truncate text-[0.78rem] font-light uppercase tracking-[0.28em] text-muted-foreground">
            Адмін
          </p>
        </div>
      )}
    </div>
  );
}

function SidebarContent({ collapsed = false, onCollapse }: { collapsed?: boolean; onCollapse?: () => void }) {
  const { t } = useI18n();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const linkClass = collapsed
    ? 'flex items-center justify-center rounded-2xl px-3 py-3 text-muted-foreground hover:bg-secondary/60 transition-colors duration-200'
    : 'flex items-center gap-3 rounded-2xl px-3 py-3 text-muted-foreground hover:bg-secondary/60 transition-colors duration-200';

  const activeClass = collapsed
    ? 'bg-secondary text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
    : 'bg-secondary text-foreground';

  return (
    <div className="flex h-full flex-col">
      <div className={`px-4 ${collapsed ? 'py-4' : 'py-5'}`}>
        <Brand collapsed={collapsed} />
        {!collapsed && onCollapse && (
          <button
            onClick={onCollapse}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border/70 bg-secondary/35 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Згорнути
          </button>
        )}
      </div>

      <nav className="flex-1 px-2 py-4">
        <div className="space-y-1.5">
          {primaryNavItems.map((item) => (
            <NavLink
              key={item.key}
              to={item.url}
              end={item.url === '/'}
              className={linkClass}
              activeClassName={activeClass}
            >
              <item.icon className="h-[1.24rem] w-[1.24rem] flex-shrink-0" />
              {!collapsed && <span className="text-[1.08rem] font-medium">{item.label ?? t(item.key)}</span>}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="space-y-1.5 border-t border-border/70 px-2 py-4">
        {secondaryNavItems.map((item) => (
          <NavLink key={item.key} to={item.url} className={linkClass} activeClassName={activeClass}>
            <item.icon className="h-[1.24rem] w-[1.24rem] flex-shrink-0" />
            {!collapsed && <span className="text-[1.08rem] font-medium">{item.label ?? t(item.key)}</span>}
          </NavLink>
        ))}

        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className={`flex w-full items-center rounded-2xl px-3 py-3 text-destructive/85 transition-colors duration-200 hover:bg-destructive/10 ${collapsed ? 'justify-center' : 'gap-3'}`}
        >
          <LogOut className="h-[1.24rem] w-[1.24rem] flex-shrink-0" />
          {!collapsed && <span className="text-[1.08rem] font-medium">{t('logout')}</span>}
        </button>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const [compactMode, setCompactMode] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1200 : false,
  );
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (window.innerWidth >= 1200) return false;
    return window.sessionStorage.getItem(SIDEBAR_COLLAPSED_KEY) !== 'false';
  });
  const inactivityTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const updateLayout = () => {
      const compact = window.innerWidth < 1200;
      setCompactMode(compact);
      if (!compact) {
        setCollapsed(false);
        window.sessionStorage.removeItem(SIDEBAR_COLLAPSED_KEY);
        return;
      }
      const storedValue = window.sessionStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      setCollapsed(storedValue !== 'false');
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  useEffect(() => {
    if (!compactMode) return;
    window.sessionStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  }, [collapsed, compactMode]);

  useEffect(() => {
    if (!compactMode || collapsed) {
      if (inactivityTimerRef.current) window.clearTimeout(inactivityTimerRef.current);
      return;
    }

    const resetTimer = () => {
      if (inactivityTimerRef.current) window.clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = window.setTimeout(() => {
        setCollapsed(true);
      }, 20000);
    };

    const events: Array<keyof WindowEventMap> = ['pointerdown', 'mousemove', 'keydown', 'touchstart', 'wheel'];
    resetTimer();
    events.forEach((eventName) => window.addEventListener(eventName, resetTimer, { passive: true }));

    return () => {
      if (inactivityTimerRef.current) window.clearTimeout(inactivityTimerRef.current);
      events.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
    };
  }, [compactMode, collapsed]);

  return (
    <aside
      onClickCapture={(event) => {
        if (!compactMode || !collapsed) return;
        event.preventDefault();
        event.stopPropagation();
        setCollapsed(false);
      }}
      className={`emerald-sidebar sticky top-0 flex h-screen flex-col border-r border-border/70 bg-[linear-gradient(180deg,hsl(176,50%,6%)_0%,hsl(176,55%,9%)_100%)] transition-[width] duration-300 ${collapsed ? 'w-[86px]' : 'w-[280px]'}`}
    >
      <SidebarContent collapsed={collapsed} onCollapse={compactMode ? () => setCollapsed(true) : undefined} />
    </aside>
  );
}
