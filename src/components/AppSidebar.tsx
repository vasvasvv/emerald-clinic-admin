import { 
  LayoutDashboard, Calendar, ClipboardList, Users, Newspaper, Bell, ExternalLink,
  LogOut, ChevronLeft, ChevronRight, Languages
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useI18n } from '@/lib/i18n';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearAdminSession } from '@/lib/auth';

const navItems = [
  { key: 'dashboard' as const, url: '/', icon: LayoutDashboard },
  { key: 'appointments' as const, url: '/appointments', icon: Calendar },
  { key: 'records' as const, url: '/records', icon: ClipboardList },
  { key: 'doctors' as const, url: '/doctors', icon: Users },
  { key: 'news' as const, url: '/news', icon: Newspaper },
  { key: 'notifications' as const, url: '/notifications', icon: Bell },
];

export function AppSidebar() {
  const { t, lang, setLang } = useI18n();
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  return (
    <aside
      className={`flex flex-col h-screen sticky top-0 transition-all duration-300 border-r border-border ${
        collapsed ? 'w-[72px]' : 'w-64'
      }`}
      style={{
        background: 'linear-gradient(180deg, hsl(176, 50%, 6%) 0%, hsl(176, 55%, 9%) 100%)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-primary-foreground font-heading font-bold text-lg">D</span>
        </div>
        {!collapsed && (
          <span className="font-heading font-semibold text-foreground text-lg truncate">
            DentAdmin
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.key}
            to={item.url}
            end={item.url === '/'}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-secondary/60 transition-colors duration-150"
            activeClassName="bg-secondary text-foreground"
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">{t(item.key)}</span>}
          </NavLink>
        ))}

        <div className={`mt-4 rounded-2xl border border-border/70 bg-secondary/35 p-3 ${collapsed ? 'px-2' : ''}`}>
          {!collapsed ? (
            <>
              <p className="text-sm font-semibold text-foreground">{t('dentalChart')}</p>
              <a
                href="https://dentis-clinic.pp.ua/"
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex w-full items-center justify-between rounded-xl bg-primary/15 px-3 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/25"
              >
                <span>{t('openDentalChart')}</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </>
          ) : (
            <a
              href="https://dentis-clinic.pp.ua/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center rounded-xl bg-primary/15 px-2 py-2.5 text-primary transition-colors hover:bg-primary/25"
              title={t('dentalChart')}
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          )}
        </div>
      </nav>

      {/* Bottom */}
      <div className="p-2 space-y-1 border-t border-border">
        {/* Language toggle */}
        <button
          onClick={() => setLang(lang === 'uk' ? 'en' : 'uk')}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-secondary/60 transition-colors duration-150"
        >
          <Languages className="w-5 h-5 flex-shrink-0" />
          {!collapsed && (
            <span className="text-sm font-medium">{lang === 'uk' ? 'EN' : 'UA'}</span>
          )}
        </button>

        {/* Collapse */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-secondary/60 transition-colors duration-150"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5 flex-shrink-0" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">Collapse</span>
            </>
          )}
        </button>

        {/* Logout */}
        <button
          onClick={() => {
            clearAdminSession();
            navigate('/login');
          }}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-destructive/80 hover:bg-destructive/10 transition-colors duration-150"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">{t('logout')}</span>}
        </button>
      </div>
    </aside>
  );
}
