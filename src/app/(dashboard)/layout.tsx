import { Sidebar } from '@/components/layout/sidebar';
import { ErrorBoundary } from '@/components/error-boundary';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col lg:flex-row">
      <Sidebar />
      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  );
}
