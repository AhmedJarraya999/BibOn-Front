import { Logo } from '@/components/ui/logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-red-600 p-12">
        <Logo size="md" />
        <div>
          <p className="text-4xl font-black text-white leading-tight mb-4">
            السباق بدا
          </p>
          <p className="text-red-200 text-lg leading-relaxed mb-10">
            La plateforme de gestion du jour de course — check-in, points de contrôle, bénévoles, tout en temps réel.
          </p>
          <ul className="space-y-3">
            {[
              'Check-in QR instantané',
              'Suivi des points de contrôle',
              'Gestion des bénévoles',
              'Dashboard live mis à jour toutes les 10s',
            ].map((f) => (
              <li key={f} className="flex items-center gap-3 text-white text-sm">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-red-300 text-xs">© 2026 BibOn — Race Day Management</p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo size="sm" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
