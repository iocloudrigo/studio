
"use client";

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

const LOGIN_ROUTE = '/';
const REGISTER_USER_ROUTE = '/register';
const REGISTER_COMPANY_ROUTE = '/registra-azienda';
const DASHBOARD_BASE_ROUTE = '/dashboard';
const PUBLIC_ROUTES_ALLOWING_LOGGED_IN_NO_COMPANY = ['/richiedi-intervento'];


export function AuthRedirectHandler({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      setIsLoading(true);

      if (user) {
        // User is authenticated
        const companyDocRef = doc(db, "aziende", user.uid);
        const companyDocSnap = await getDoc(companyDocRef);
        const companyExists = companyDocSnap.exists();

        if (pathname === LOGIN_ROUTE) {
          // User is authenticated and on the login page.
          // DO NOTHING. Let the user explicitly try to login again if they want to,
          // or navigate elsewhere. LoginForm will handle redirection on submit.
        } else if (pathname === REGISTER_USER_ROUTE) {
          // User is authenticated and on the user registration page.
          if (companyExists) {
            // If they somehow got to /register (user credentials) but already have a company, send to dashboard.
            router.replace(DASHBOARD_BASE_ROUTE);
          }
          // Else, they are on /register; this might be an odd state if already logged in.
          // For now, allow, but ideally, a logged-in user shouldn't hit /register.
        } else if (pathname === REGISTER_COMPANY_ROUTE) {
          // User is authenticated and on the company registration page.
          if (companyExists) {
            // If on /registra-azienda but company already exists, send to dashboard.
            router.replace(DASHBOARD_BASE_ROUTE);
          }
          // Else, they are on /registra-azienda, no company, this is the correct place.
        } else if (pathname.startsWith(DASHBOARD_BASE_ROUTE)) {
          // User is authenticated and on a dashboard page.
          if (!companyExists) {
            // If on dashboard but no company profile, redirect to complete company registration.
            router.replace(REGISTER_COMPANY_ROUTE);
          }
          // Else, company exists, they are on dashboard, stay.
        } else if (PUBLIC_ROUTES_ALLOWING_LOGGED_IN_NO_COMPANY.some(route => pathname.startsWith(route))) {
          // User is on a public page that allows logged-in users without a company (e.g. /richiedi-intervento)
          // Do nothing, let them stay.
        } else {
          // Authenticated, on some other page not handled above.
          // If no company, redirect to register company. Otherwise, let them be (might be a valid page).
          // This case needs careful consideration if there are other protected routes.
          // For now, if not dashboard and no company, assume they need to register company.
           if (!companyExists) {
             router.replace(REGISTER_COMPANY_ROUTE);
           }
        }
      } else {
        // User is NOT authenticated
        // If trying to access a protected route, redirect to login.
        const isProtectedRoute = pathname.startsWith(DASHBOARD_BASE_ROUTE) || 
                               pathname === REGISTER_COMPANY_ROUTE ||
                               (pathname === REGISTER_USER_ROUTE); // REGISTER_USER_ROUTE is for unauth users

        if (isProtectedRoute && pathname !== REGISTER_USER_ROUTE) { // Allow unauth to access /register
           router.replace(LOGIN_ROUTE);
        }
        // Unauthenticated users can freely access LOGIN_ROUTE, REGISTER_USER_ROUTE and public pages.
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
