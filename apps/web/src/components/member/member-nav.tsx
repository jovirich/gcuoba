'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type MemberNavItem = {
  href: string;
  label: string;
};

const memberNavItems: MemberNavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/profile', label: 'Profile' },
  { href: '/notifications', label: 'Notifications' },
  { href: '/documents', label: 'Documents' },
  { href: '/dues', label: 'Dues' },
  { href: '/events', label: 'Events' },
  { href: '/announcements', label: 'Announcements' },
];

export function MemberNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2">
      {memberNavItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`btn-pill text-sm transition ${
              active
                ? 'border-red-300 bg-red-100 text-red-800'
                : 'hover:border-red-200 hover:bg-red-50'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}


