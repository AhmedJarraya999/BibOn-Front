'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, Users, Flag, ClipboardList, UserCheck, QrCode, LogOut, Building2, BarChart2, Menu, X, Timer, Package, Activity, ChevronDown, Check, Utensils, Award, AlertTriangle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { logout, getUser } from '@/lib/auth';
import { useOrg } from '@/lib/org-context';
import { Logo } from '@/components/ui/logo';

const organizerLinks = [
  { href: '/dashboard', label: 'Live Dashboard', icon: Activity },
  { href: '/organizations', label: 'Organizations', icon: Building2 },
  { href: '/events', label: 'Events', icon: Calendar },
  { href: '/races', label: 'Races', icon: Flag },
  { href: '/participants', label: 'Participants', icon: Users },
  { href: '/registrations', label: 'Registrations', icon: ClipboardList },
  { href: '/volunteers', label: 'Volunteers', icon: UserCheck },
  { href: '/attendance', label: 'Attendance', icon: BarChart2 },
  { href: '/reclamations', label: 'Reclamations', icon: AlertTriangle },
];

const allVolunteerLinks = [
  { href: '/checkin', label: 'Check-in', icon: QrCode, permission: 'CHECK_IN' },
  { href: '/distribution', label: 'Bib Distribution', icon: Package, permission: 'BIB_DISTRIBUTION' },
  { href: '/ravito', label: 'Ravito Station', icon: Utensils, permission: 'RAVITO' },
  { href: '/medals', label: 'Medal Distribution', icon: Award, permission: 'MEDAL' },
  { href: '/finish', label: 'Finish Line', icon: Timer, permission: 'FINISH' },
];

function OrgSwitcher() {
  const { activeOrg, setActiveOrg, organizations } = useOrg();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (organizations.length === 0) return null;

  return (
    <div ref={ref} className="relative border-b border-gray-200 px-3 py-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-gray-50"
      >
        {activeOrg?.logoUrl ? (
          <img src={activeOrg.logoUrl} alt="" className="h-7 w-7 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <Building2 className="h-3.5 w-3.5" />
          </div>
        )}
        <span className="flex-1 truncate text-sm font-medium text-gray-800">{activeOrg?.name ?? 'Select org'}</span>
        <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full z-50 mt-1 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
          {organizations.map((org) => (
            <button
              key={org.id}
              onClick={() => { setActiveOrg(org); setOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
            >
              {org.logoUrl ? (
                <img src={org.logoUrl} alt="" className="h-6 w-6 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <Building2 className="h-3 w-3" />
                </div>
              )}
              <span className="flex-1 truncate text-gray-800">{org.name}</span>
              {activeOrg?.id === org.id && <Check className="h-3.5 w-3.5 text-blue-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NavContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const user = getUser();
  const isVolunteer = user?.role === 'VOLUNTEER';
  const volunteerPerms: string[] = user?.permissions ?? [];
  const volunteerLinks = isVolunteer
    ? allVolunteerLinks.filter((l) => volunteerPerms.includes(l.permission))
    : [];
  const links = isVolunteer ? volunteerLinks : organizerLinks;

  return (
    <>
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-6">
        <Logo size="sm" />
        {onClose && (
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {!isVolunteer && <OrgSwitcher />}

      <nav className="flex-1 space-y-1 p-4">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname.startsWith(href)
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-gray-200 p-4">
        <div className="mb-3 px-3">
          <p className="text-sm font-medium text-gray-900">{user?.name}</p>
          <p className="text-xs text-gray-500">{user?.role}</p>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:hidden">
        <Logo size="sm" />
        <button
          onClick={() => setOpen(true)}
          className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-white shadow-xl transition-transform duration-300 lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <NavContent onClose={() => setOpen(false)} />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex h-screen w-60 shrink-0 flex-col border-r border-gray-200 bg-white">
        <NavContent />
      </aside>
    </>
  );
}
