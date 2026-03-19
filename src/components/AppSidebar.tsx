import { 
  LayoutDashboard, Calendar, ClipboardList, Users, Newspaper, Bell, 
  LogOut, ChevronLeft, ChevronRight, Languages
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useI18n } from '@/lib/i18n';
import { useState } from 'react';

const navItems = [
  { key: 'dashboard' as const, url: '/', icon: LayoutDashboard },
  { key: 'appointments' as const, url: '/appointments', icon: Calendar },
  { key: 'doctors' as const, url: '/doctors', icon: Users },
  { key: 'news' as const, url: '/news', icon: Newspaper },
  { key: 'notifications' as const, url: '/notifications', icon: Bell },
];

export function AppSidebar() {
  const { t, lang, setLang } = useI18n();
  const [collapsed, setCollapsed] = useState(false);

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
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-destructive/80 hover:bg-destructive/10 transition-colors duration-150"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">{t('logout')}</span>}
        </button>
      </div>
    </aside>
  );
}
