import { useState } from 'react';
import { LayoutDashboard, Calendar, ClipboardList, Users, Newspaper, Bell, LogOut, Menu, Stethoscope } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
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

function Brand() {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <img src={logoSrc} alt="Дентіс адмін" className="h-12 w-12 rounded-2xl object-cover shadow-[0_12px_24px_rgba(0,0,0,0.24)]" />
      <div className="min-w-0 leading-none">
        <p className="truncate font-heading text-[1.35rem] font-bold tracking-[-0.02em] text-foreground">Дентіс</p>
        <p className="mt-1 truncate text-[0.78rem] font-light uppercase tracking-[0.28em] text-muted-foreground">Адмін</p>
      </div>
    </div>
  );
}

function SidebarContent({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const { t } = useI18n();
  const navigate = useNavigate();

  const linkClass = mobile
    ? 'flex items-center gap-3 px-3 py-3 rounded-2xl text-[1rem] text-muted-foreground hover:bg-secondary/70 transition-colors duration-200'
    : 'flex items-center gap-3 px-3 py-3 rounded-2xl text-muted-foreground hover:bg-secondary/60 transition-colors duration-200';

  const activeClass = mobile ? 'bg-secondary text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]' : 'bg-secondary text-foreground';

  return (
    <div className={`flex h-full flex-col ${mobile ? 'px-1 pt-6' : ''}`}>
      {!mobile && (
        <div className="flex items-center gap-3 px-4 py-5">
          <Brand />
        </div>
      )}

      <nav className="flex-1 px-2 py-4">
        <div className="space-y-1.5">
          {primaryNavItems.map((item) => (
            <NavLink
              key={item.key}
              to={item.url}
              end={item.url === '/'}
              className={linkClass}
              activeClassName={activeClass}
              onClick={onNavigate}
            >
              <item.icon className="h-[1.15rem] w-[1.15rem] flex-shrink-0" />
              <span className={`${mobile ? 'text-[1rem]' : 'text-[0.98rem]'} font-medium`}>{t(item.key)}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="border-t border-border/70 px-2 py-4 space-y-1.5">
        {secondaryNavItems.map((item) => (
          <NavLink
            key={item.key}
            to={item.url}
            className={linkClass}
            activeClassName={activeClass}
            onClick={onNavigate}
          >
            <item.icon className="h-[1.15rem] w-[1.15rem] flex-shrink-0" />
            <span className={`${mobile ? 'text-[1rem]' : 'text-[0.98rem]'} font-medium`}>{t(item.key)}</span>
          </NavLink>
        ))}

        <button
          onClick={() => {
            clearAdminSession();
            onNavigate?.();
            navigate('/login');
          }}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-destructive/85 transition-colors duration-200 hover:bg-destructive/10"
        >
          <LogOut className="h-[1.15rem] w-[1.15rem] flex-shrink-0" />
          <span className={`${mobile ? 'text-[1rem]' : 'text-[0.98rem]'} font-medium`}>{t('logout')}</span>
        </button>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <div className="emerald-mobile-toggle fixed left-3 top-3 z-40">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button className="inline-flex items-center gap-3 rounded-2xl border border-border/70 bg-[linear-gradient(180deg,hsl(176,50%,8%)_0%,hsl(176,55%,10%)_100%)] px-3 py-2.5 text-left shadow-[0_14px_32px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-colors hover:bg-secondary/70">
              <img src={logoSrc} alt="Дентіс адмін" className="h-10 w-10 rounded-2xl object-cover shadow-[0_10px_22px_rgba(0,0,0,0.24)]" />
              <div className="min-w-0 leading-none">
                <p className="truncate font-heading text-[1.1rem] font-bold tracking-[-0.02em] text-foreground">Дентіс</p>
                <p className="mt-1 flex items-center gap-2 text-[0.7rem] font-light uppercase tracking-[0.24em] text-muted-foreground">
                  Адмін
                  <Menu className="h-3.5 w-3.5" />
                </p>
              </div>
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[86vw] max-w-[340px] border-r border-border/70 bg-[linear-gradient(180deg,hsl(176,50%,7%)_0%,hsl(176,55%,10%)_100%)] p-0 text-foreground">
            <div className="px-5 pt-6">
              <Brand />
            </div>
            <SidebarContent mobile onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      <aside className="emerald-desktop-sidebar sticky top-0 flex h-screen w-[280px] flex-col border-r border-border/70 bg-[linear-gradient(180deg,hsl(176,50%,6%)_0%,hsl(176,55%,9%)_100%)]">
        <SidebarContent />
      </aside>
    </>
  );
}
