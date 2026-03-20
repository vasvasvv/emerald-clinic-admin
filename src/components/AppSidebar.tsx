import { LayoutDashboard, Calendar, ClipboardList, Users, Newspaper, Bell, ExternalLink, LogOut, Menu } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useI18n } from '@/lib/i18n';
import { useNavigate } from 'react-router-dom';
import { clearAdminSession } from '@/lib/auth';

const primaryNavItems = [
  { key: 'dashboard' as const, url: '/', icon: LayoutDashboard },
  { key: 'appointments' as const, url: '/appointments', icon: Calendar },
  { key: 'records' as const, url: '/records', icon: ClipboardList },
  { key: 'notifications' as const, url: '/notifications', icon: Bell },
];

const secondaryNavItems = [
  { key: 'doctors' as const, url: '/doctors', icon: Users },
  { key: 'news' as const, url: '/news', icon: Newspaper },
];

const logoSrc = '/emerald-icon.png';

function SidebarContent({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const { t } = useI18n();
  const navigate = useNavigate();

  const linkClass = mobile
    ? 'flex items-center gap-3 px-3 py-3 rounded-2xl text-base text-muted-foreground hover:bg-secondary/70 transition-colors duration-200'
    : 'flex items-center gap-3 px-3 py-2.5 rounded-2xl text-muted-foreground hover:bg-secondary/60 transition-colors duration-200';

  const activeClass = mobile ? 'bg-secondary text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]' : 'bg-secondary text-foreground';

  return (
    <div className={`flex h-full flex-col ${mobile ? 'px-1 pt-8' : ''}`}>
      {!mobile && (
        <div className="flex items-center gap-3 px-4 h-20 border-b border-border/70">
          <img src={logoSrc} alt="Дентіс адмін" className="h-11 w-11 rounded-2xl object-cover shadow-[0_12px_24px_rgba(0,0,0,0.24)]" />
          <span className="font-heading font-semibold text-foreground text-lg truncate">Дентіс адмін</span>
        </div>
      )}

      <nav className="flex-1 px-2 py-4">
        <div className="space-y-1">
          {primaryNavItems.map((item) => (
            <NavLink
              key={item.key}
              to={item.url}
              end={item.url === '/'}
              className={linkClass}
              activeClassName={activeClass}
              onClick={onNavigate}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className={`${mobile ? 'text-[15px]' : 'text-sm'} font-medium`}>{t(item.key)}</span>
            </NavLink>
          ))}
        </div>

        <div className="mt-5 rounded-[28px] border border-border/70 bg-secondary/30 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <p className="text-sm font-semibold text-foreground">{t('dentalChart')}</p>
          <a
            href="https://dentis-clinic.pp.ua/"
            target="_blank"
            rel="noreferrer"
            onClick={onNavigate}
            className="mt-3 inline-flex w-full items-center justify-between rounded-2xl bg-primary/15 px-3.5 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/25"
          >
            <span>{t('openDentalChart')}</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </nav>

      <div className="border-t border-border/70 px-2 py-4 space-y-1">
        {secondaryNavItems.map((item) => (
          <NavLink
            key={item.key}
            to={item.url}
            className={linkClass}
            activeClassName={activeClass}
            onClick={onNavigate}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span className={`${mobile ? 'text-[15px]' : 'text-sm'} font-medium`}>{t(item.key)}</span>
          </NavLink>
        ))}

        <button
          onClick={() => {
            clearAdminSession();
            onNavigate?.();
            navigate('/login');
          }}
          className="flex items-center gap-3 w-full px-3 py-3 rounded-2xl text-destructive/85 hover:bg-destructive/10 transition-colors duration-200"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span className={`${mobile ? 'text-[15px]' : 'text-sm'} font-medium`}>{t('logout')}</span>
        </button>
      </div>
    </div>
  );
}

export function AppSidebar() {
  return (
    <>
      <header className="emerald-mobile-header fixed inset-x-0 top-0 z-40 h-[74px] border-b border-border/70 bg-[linear-gradient(180deg,hsl(176,50%,7%)_0%,hsl(176,55%,10%)_100%)] backdrop-blur-xl">
        <div className="flex h-full items-center gap-3 px-4">
          <Sheet>
            <SheetTrigger asChild>
              <button className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-secondary/45 text-foreground transition-colors hover:bg-secondary/70">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[86vw] max-w-[340px] border-r border-border/70 bg-[linear-gradient(180deg,hsl(176,50%,7%)_0%,hsl(176,55%,10%)_100%)] p-0 text-foreground">
              <div className="flex items-center gap-3 px-5 pt-6">
                <img src={logoSrc} alt="Дентіс адмін" className="h-11 w-11 rounded-2xl object-cover shadow-[0_12px_24px_rgba(0,0,0,0.24)]" />
                <div>
                  <p className="font-heading text-lg font-semibold">Дентіс адмін</p>
                  <p className="text-xs text-muted-foreground">Панель керування</p>
                </div>
              </div>
              <SidebarContent mobile />
            </SheetContent>
          </Sheet>

          <img src={logoSrc} alt="Дентіс адмін" className="h-10 w-10 rounded-2xl object-cover shadow-[0_10px_22px_rgba(0,0,0,0.24)]" />
          <div className="min-w-0">
            <p className="font-heading text-base font-semibold text-foreground leading-none">Дентіс адмін</p>
            <p className="mt-1 text-xs text-muted-foreground">Клінічна адмінка</p>
          </div>
        </div>
      </header>

      <aside className="emerald-desktop-sidebar flex h-screen sticky top-0 w-[280px] flex-col border-r border-border/70 bg-[linear-gradient(180deg,hsl(176,50%,6%)_0%,hsl(176,55%,9%)_100%)]">
        <SidebarContent />
      </aside>
    </>
  );
}
