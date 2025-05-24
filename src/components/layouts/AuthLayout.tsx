
import type { PropsWithChildren } from 'react';
import { Logo } from '@/components/shared/Logo';
import Link from 'next/link'; // Importa Link

// This layout is now simpler and might be used for /register or other auth-related pages,
// but not for the main landing/login page anymore.
export function AuthLayout({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8">
        <Link href="/" passHref>
          <Logo />
        </Link>
      </div>
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
