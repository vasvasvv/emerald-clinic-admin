import { useState } from 'react';
import { AppSidebar } from '@/components/AppSidebar';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* фон */}
      <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0">
        <source src="/background.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-black/40 z-10" />

      <AppSidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* ⬇️ ОЦЕ КЛЮЧ */}
      <div className={`relative z-20 flex transition-all duration-300 ${collapsed ? 'pl-[86px]' : 'pl-[280px]'}`}>
        <main className="flex-1 min-h-screen">
          <div className="max-w-7xl mx-auto px-4 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
