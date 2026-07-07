import { ErrorBoundary } from '@/components/error-boundary';

export default function CheckInGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh' }}>
      <ErrorBoundary>{children}</ErrorBoundary>
    </div>
  );
}
