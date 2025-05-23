
"use client";

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

const LOGIN_ROUTE = '/';
const REGISTER_ROUTE = '/register'; // Unified registration page
const DASHBOARD_BASE_ROUTE = '/dashboard';
// Public routes that logged-in users (even without a company) can access
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
          // DO NOTHING. Let them explicitly try to login again or navigate elsewhere.
          // LoginForm will handle redirection upon successful re-login.
        } else if (pathname === REGISTER_ROUTE) {
          // User is authenticated and on the unified registration page.
          if (companyExists) {
            // If they somehow got to /register but already have a company, send to dashboard.
            router.replace(DASHBOARD_BASE_ROUTE);
          }
          // Else, they are on /register; this is fine if they are completing company details
          // after a Google login, for example. The form itself will handle this.
        } else if (pathname.startsWith(DASHBOARD_BASE_ROUTE)) {
          // User is authenticated and on a dashboard page.
          if (!companyExists) {
            // If on dashboard but no company profile, redirect to complete company registration.
            router.replace(REGISTER_ROUTE);
          }
          // Else, company exists, they are on dashboard, stay.
        } else if (PUBLIC_ROUTES_ALLOWING_LOGGED_IN_NO_COMPANY.some(route => pathname.startsWith(route))) {
          // User is on a public page that allows logged-in users without a company (e.g. /richiedi-intervento)
          // Do nothing, let them stay.
        } else {
          // Authenticated, on some other page not handled above.
          // If company exists, assume it's a valid page or a sub-page of dashboard.
          // If no company, and not on a public-allowed page, redirect to register company.
           if (!companyExists) {
             router.replace(REGISTER_ROUTE);
           }
        }
      } else {
        // User is NOT authenticated
        // If trying to access a protected route, redirect to login.
        const isProtectedRoute = pathname.startsWith(DASHBOARD_BASE_ROUTE) ||
                               pathname === REGISTER_ROUTE; // Access to /register is for unauthenticated or those completing company profile

        if (isProtectedRoute) {
           router.replace(LOGIN_ROUTE);
        }
        // Unauthenticated users can freely access LOGIN_ROUTE and public pages.
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
