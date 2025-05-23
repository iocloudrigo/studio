import type { PropsWithChildren } from 'react';
import { Logo } from '@/components/shared/Logo';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function PublicLayout({ children, companyName }: PropsWithChildren<{ companyName?: string }>) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 max-w-screen-2xl items-center justify-between">
          <Link href="/" passHref>
            <Logo />
          </Link>
          {companyName && <span className="text-lg font-semibold text-foreground">{companyName}</span>}
          <Button variant="outline" asChild>
            <Link href="/">Accesso Aziendale</Link>
          </Button>
        </div>
      </header>
      <main className="flex-1 container py-8">
        {children}
      </main>
      <footer className="py-6 md:px-8 md:py-0 border-t">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-20 md:flex-row">
          <p className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-left">
            © {new Date().getFullYear()} Incastro SaaS. Tutti i diritti riservati.
          </p>
        </div>
      </footer>
    </div>
  );
}
