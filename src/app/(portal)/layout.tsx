import { PortalSidebar } from '@/components/layout/portal-sidebar';
import { ErrorBoundary } from '@/components/error-boundary';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col lg:flex-row">
      <PortalSidebar />
      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  );
}
