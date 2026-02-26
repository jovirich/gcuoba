'use client';

import { signOut } from 'next-auth/react';

type LogoutButtonProps = {
  className?: string;
  label?: string;
  callbackUrl?: string;
};

export function LogoutButton({
  className = 'btn-secondary',
  label = 'Log out',
  callbackUrl = '/',
}: LogoutButtonProps) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => signOut({ callbackUrl })}
    >
      {label}
    </button>
  );
}
