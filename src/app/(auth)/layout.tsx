import { Logo } from '@/components/ui/logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-[#111111] p-12 relative overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,140,0,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,140,0,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />
        {/* Orange glow */}
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#FF8C00]/10 rounded-full blur-3xl" />

        <div className="relative">
          <Logo size="md" variant="dark" showSlogan />
        </div>

        <div className="relative">
          <p className="text-5xl font-black text-white leading-tight mb-4">السباق بدا</p>
          <p className="text-white/40 text-lg leading-relaxed mb-10">
            La plateforme de gestion du jour de course — check-in, points de contrôle, bénévoles, tout en temps réel.
          </p>
          <ul className="space-y-3">
            {[
              'Check-in QR instantané',
              'Suivi des points de contrôle',
              'Gestion des bénévoles',
              'Dashboard live mis à jour toutes les 10s',
            ].map((f) => (
              <li key={f} className="flex items-center gap-3 text-white/70 text-sm">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#FF8C00]/20 text-[#FF8C00] text-xs font-bold">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-white/20 text-xs">© 2026 كورسة — Race Day Management</p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center bg-[#111111] px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo size="sm" variant="dark" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
