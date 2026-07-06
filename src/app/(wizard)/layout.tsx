import { ErrorBoundary } from '@/components/error-boundary';

export default function WizardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#111111]">
      <ErrorBoundary>{children}</ErrorBoundary>
    </div>
  );
}
