import { AppSidebar } from '@/components/AppSidebar';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <main className="flex-1 overflow-auto emerald-main-shell">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
