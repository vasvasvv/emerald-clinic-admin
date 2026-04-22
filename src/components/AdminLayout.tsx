import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { AppSidebar, SidebarContent, mobileBottomNavItems } from '@/components/AppSidebar';
import { useIsMobile, useIsTablet } from '@/hooks/use-mobile';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const { pathname } = useLocation();
  const { t } = useI18n();

  const closeMobileDrawer = () => setMobileDrawerOpen(false);

  const showMobileStyle = isMobile || isTablet;

  return (
    <div className="relative min-h-screen min-h-dvh w-full overflow-hidden ios-safe-top">
      {!showMobileStyle && <AppSidebar collapsed={collapsed} setCollapsed={setCollapsed} />}

      <div
        className={cn('relative z-20 flex', showMobileStyle ? 'pl-0' : collapsed ? 'pl-[86px]' : 'pl-[280px]')}
        style={{
          transition: 'padding-left 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
          willChange: 'padding-left',
          contain: 'layout',
        }}
      >
        <main className="flex-1 min-h-screen min-h-dvh" style={{ transform: 'translateZ(0)' }}>
          <div className={cn('max-w-7xl mx-auto px-4 py-6', showMobileStyle && 'pb-24')}>{children}</div>
        </main>
      </div>

      {/* Bottom navigation for mobile and tablet */}
      {showMobileStyle && (
        <>
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-2 pb-4 ios-safe-bottom">
            <div className="pointer-events-auto relative mx-auto max-w-4xl overflow-visible">
              <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-[linear-gradient(180deg,rgba(24,56,53,0.95)_0%,rgba(16,39,37,0.98)_100%)] p-2 shadow-2xl backdrop-blur-xl">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 pointer-events-none z-0" />

                <div className="relative z-10 grid grid-cols-5 gap-1">
                  {mobileBottomNavItems.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.url;

                    return (
                      <Link
                        key={item.key}
                        to={item.url}
                        className="group relative flex flex-col items-center"
                        onClick={closeMobileDrawer}
                      >
                        <div className="relative flex h-full w-full flex-col items-center justify-center gap-1 rounded-3xl py-2.5">
                          {active && <div className="absolute -inset-1 z-10 rounded-[1.4rem] bg-emerald-900/40" />}

                          <Icon
                            className={`relative z-20 h-7 w-7 transition-colors duration-200 ${
                              active ? 'text-white' : 'text-emerald-200/70 group-hover:text-emerald-100'
                            }`}
                          />

                          <span
                            className={`relative z-20 text-[11px] font-medium leading-none transition-colors ${
                              active ? 'font-semibold text-white' : 'text-emerald-200/60 group-hover:text-emerald-100'
                            }`}
                          >
                            {t(
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
                        </div>
                      </Link>
                    );
                  })}

                  {/* Menu button */}
                  <button
                    className="group relative flex flex-col items-center"
                    onClick={() => setMobileDrawerOpen(true)}
                    type="button"
                  >
                    <div
                      className={`relative flex w-full flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2.5 transition-colors ${
                        mobileDrawerOpen ? 'bg-emerald-500/20' : 'bg-transparent'
                      }`}
                    >
                      <Menu
                        className={`relative z-10 h-7 w-7 transition-colors ${
                          mobileDrawerOpen ? 'text-white' : 'text-emerald-200/60 group-hover:text-emerald-100'
                        }`}
                      />
                      <span
                        className={`relative z-10 text-[11px] font-medium leading-none transition-colors ${
                          mobileDrawerOpen
                            ? 'text-white font-semibold'
                            : 'text-emerald-200/60 group-hover:text-emerald-100'
                        }`}
                      >
                        Меню
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div
            className={cn(
              'fixed inset-0 z-40 bg-black/50 transition-opacity duration-300',
              mobileDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
            )}
            onClick={closeMobileDrawer}
          />

          <aside
            className={cn(
              'glass-sidebar fixed right-0 z-50 h-screen w-[280px] transform',
              mobileDrawerOpen ? 'translate-x-0' : 'translate-x-full',
            )}
            style={{
              transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              willChange: 'transform',
              top: 'env(safe-area-inset-top)',
              height: 'calc(100vh - env(safe-area-inset-top))',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div onClick={closeMobileDrawer} className="h-full">
              <SidebarContent collapsed={false} />
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
