import { useEffect, useState } from 'react';
import { LayoutDashboard, Calendar, ClipboardList, Users, Newspaper, Bell, LogOut, Stethoscope, ChevronLeft } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useI18n } from '@/lib/i18n';
import { useNavigate } from 'react-router-dom';
import { clearAdminSession } from '@/lib/auth';

const primaryNavItems = [
  { key: 'dashboard' as const, url: '/', icon: LayoutDashboard },
  { key: 'appointments' as const, url: '/appointments', icon: Calendar },
  { key: 'records' as const, url: '/records', icon: ClipboardList },
  { key: 'dentalCharts' as const, url: '/dental-charts', icon: Stethoscope },
  { key: 'notifications' as const, url: '/notifications', icon: Bell },
];

const secondaryNavItems = [
  { key: 'doctors' as const, url: '/doctors', icon: Users },
  { key: 'news' as const, url: '/news', icon: Newspaper },
];

const logoSrc = '/emerald-general.png';

function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className={`flex min-w-0 items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
      <img src={logoSrc} alt="Дентіс адмін" className="h-12 w-12 rounded-2xl object-cover shadow-[0_12px_24px_rgba(0,0,0,0.24)]" />
      {!collapsed && (
        <div className="min-w-0 leading-none">
          <p className="truncate font-heading text-[1.35rem] font-bold tracking-[-0.02em] text-foreground">Дентіс</p>
          <p className="mt-1 truncate text-[0.78rem] font-light uppercase tracking-[0.28em] text-muted-foreground">Адмін</p>
        </div>
      )}
    </div>
  );
}

function SidebarContent({
  collapsed = false,
  onCollapse,
}: {
  collapsed?: boolean;
  onCollapse?: () => void;
}) {
  const { t } = useI18n();
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
            <NavLink key={item.key} to={item.url} end={item.url === '/'} className={linkClass} activeClassName={activeClass}>
              <item.icon className="h-[1.15rem] w-[1.15rem] flex-shrink-0" />
              {!collapsed && <span className="text-[0.98rem] font-medium">{t(item.key)}</span>}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="space-y-1.5 border-t border-border/70 px-2 py-4">
        {secondaryNavItems.map((item) => (
          <NavLink key={item.key} to={item.url} className={linkClass} activeClassName={activeClass}>
            <item.icon className="h-[1.15rem] w-[1.15rem] flex-shrink-0" />
            {!collapsed && <span className="text-[0.98rem] font-medium">{t(item.key)}</span>}
          </NavLink>
        ))}

        <button
          onClick={() => {
            clearAdminSession();
            navigate('/login');
          }}
          className={`flex w-full items-center rounded-2xl px-3 py-3 text-destructive/85 transition-colors duration-200 hover:bg-destructive/10 ${collapsed ? 'justify-center' : 'gap-3'}`}
        >
          <LogOut className="h-[1.15rem] w-[1.15rem] flex-shrink-0" />
          {!collapsed && <span className="text-[0.98rem] font-medium">{t('logout')}</span>}
        </button>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const [compactMode, setCompactMode] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 1200 : false));
  const [collapsed, setCollapsed] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 1200 : false));

  useEffect(() => {
    const updateLayout = () => {
      const compact = window.innerWidth < 1200;
      setCompactMode(compact);
      setCollapsed(compact);
    };
    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

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
