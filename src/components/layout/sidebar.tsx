'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, Users, Flag, ClipboardList, UserCheck, QrCode, LogOut, Building2, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logout, getUser } from '@/lib/auth';

const organizerLinks = [
  { href: '/organizations', label: 'Organizations', icon: Building2 },
  { href: '/events', label: 'Events', icon: Calendar },
  { href: '/races', label: 'Races', icon: Flag },
  { href: '/participants', label: 'Participants', icon: Users },
  { href: '/registrations', label: 'Registrations', icon: ClipboardList },
  { href: '/volunteers', label: 'Volunteers', icon: UserCheck },
  { href: '/attendance', label: 'Attendance', icon: BarChart2 },
];

const volunteerLinks = [
  { href: '/checkin', label: 'Check-in', icon: QrCode },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = getUser();
  const isVolunteer = user?.role === 'VOLUNTEER';
  const links = isVolunteer ? volunteerLinks : organizerLinks;

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        <span className="text-lg font-bold text-blue-600">RacePlatform</span>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
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
    </aside>
  );
}
