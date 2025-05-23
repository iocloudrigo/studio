
"use client";

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react'; // For loading state

// Definisci le route pubbliche che non dovrebbero causare un redirect a /registra-azienda
// se l'utente è loggato ma non ha un'azienda.
const PUBLIC_ROUTES_ALLOWING_LOGGED_IN_NO_COMPANY = ['/richiedi-intervento']; 
// Definisci le route di autenticazione
const AUTH_ROUTES = ['/', '/register'];
// Definisci la route per la registrazione dell'azienda
const REGISTER_COMPANY_ROUTE = '/registra-azienda';
// Definisci le route della dashboard
const DASHBOARD_BASE_ROUTE = '/dashboard';


export function AuthRedirectHandler({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      setIsLoading(true);
      if (user) {
        // Utente autenticato
        const companyDocRef = doc(db, "aziende", user.uid);
        const companyDocSnap = await getDoc(companyDocRef);

        if (companyDocSnap.exists()) {
          // L'azienda è registrata
          if (AUTH_ROUTES.includes(pathname) || pathname === REGISTER_COMPANY_ROUTE) {
            router.replace(DASHBOARD_BASE_ROUTE);
          }
        } else {
          // L'azienda NON è registrata
          const isPublicAllowedRoute = PUBLIC_ROUTES_ALLOWING_LOGGED_IN_NO_COMPANY.some(route => pathname.startsWith(route));
          if (pathname !== REGISTER_COMPANY_ROUTE && !isPublicAllowedRoute) {
            router.replace(REGISTER_COMPANY_ROUTE);
          }
        }
      } else {
        // Utente non autenticato
        if (pathname.startsWith(DASHBOARD_BASE_ROUTE) || pathname === REGISTER_COMPANY_ROUTE) {
          router.replace('/');
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [pathname, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
