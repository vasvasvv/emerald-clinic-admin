import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AppSidebar, SidebarContent, mobileBottomNavItems } from '@/components/AppSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  const { t } = useI18n();

  const closeMobileDrawer = () => setMobileDrawerOpen(false);

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* фон */}
      <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0">
        <source src="/background.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-black/40 z-10" />

      {!isMobile && <AppSidebar collapsed={collapsed} setCollapsed={setCollapsed} />}

      <div
        className={cn(
          'relative z-20 flex transition-all duration-300',
          isMobile ? 'pl-0 pb-16' : collapsed ? 'pl-[86px]' : 'pl-[280px]',
        )}
      >
        <main className="flex-1 min-h-screen">
          <div className="max-w-7xl mx-auto px-4 py-6">{children}</div>
        </main>
      </div>

      {isMobile && (
        <>
          <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-glass-border bg-[linear-gradient(180deg,rgba(24,56,53,0.97)_0%,rgba(16,39,37,0.99)_100%)] backdrop-blur-md">
            <div className="grid h-16 grid-cols-5">
              {mobileBottomNavItems.map((item) => {
                const isActive = pathname === item.url;
                return (
                  <Link
                    key={item.key}
                    to={item.url}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1 text-[11px] transition-colors',
                      isActive ? 'text-white' : 'text-muted-foreground',
                    )}
                    onClick={closeMobileDrawer}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{t(item.key)}</span>
                  </Link>
                );
              })}

              <button
                type="button"
                className="flex flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-white"
                onClick={() => setMobileDrawerOpen(true)}
              >
                <span className="text-lg leading-none">☰</span>
                <span>Menu</span>
              </button>
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
              'glass-sidebar fixed right-0 top-0 z-50 h-screen w-[280px] transform transition-transform duration-300',
              mobileDrawerOpen ? 'translate-x-0' : 'translate-x-full',
            )}
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
