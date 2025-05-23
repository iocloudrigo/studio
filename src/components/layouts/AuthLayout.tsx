import type { PropsWithChildren } from 'react';
import { Logo } from '@/components/shared/Logo';

export function AuthLayout({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8">
        <Logo />
      </div>
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
