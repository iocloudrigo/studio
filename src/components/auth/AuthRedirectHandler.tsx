
"use client";

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// Define public routes that don't require auth and shouldn't trigger company registration check for logged-in users.
const PUBLIC_ROUTES_ALLOWING_LOGGED_IN_NO_COMPANY = ['/richiedi-intervento'];
// Define the comprehensive registration route
const COMPREHENSIVE_REGISTER_ROUTE = '/register';
// Define the dashboard base route
const DASHBOARD_BASE_ROUTE = '/dashboard';

export function AuthRedirectHandler({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      setIsLoading(true); // Set loading true on each auth state check

      if (user) {
        // User is authenticated
        const companyDocRef = doc(db, "aziende", user.uid);
        const companyDocSnap = await getDoc(companyDocRef);
        const companyExists = companyDocSnap.exists();

        if (pathname === '/') {
          // User is authenticated and on the login page.
          // Per user requirement: DO NOTHING on initial load if already authenticated and on '/'.
          // LoginForm will handle navigation after an explicit login attempt.
        } else if (pathname === COMPREHENSIVE_REGISTER_ROUTE) {
          // User is authenticated and on the register page.
          if (companyExists) {
            // If they are on /register but already have a company, send to dashboard.
            router.replace(DASHBOARD_BASE_ROUTE);
          }
          // Else, they are on /register, no company, this is the correct place to be (e.g. after Google login, no company).
        } else if (pathname.startsWith(DASHBOARD_BASE_ROUTE)) {
          // User is authenticated and on a dashboard page.
          if (!companyExists) {
            // If on dashboard but no company profile, redirect to register.
            router.replace(COMPREHENSIVE_REGISTER_ROUTE);
          }
          // Else, company exists, they are on dashboard, stay.
        } else if (!PUBLIC_ROUTES_ALLOWING_LOGGED_IN_NO_COMPANY.some(route => pathname.startsWith(route))) {
          // Authenticated, on some other page that's not public-allowed-no-company
          // (e.g. a hypothetical /settings page, or if they typed a random protected URL)
           if (!companyExists) {
             // If no company, redirect to register.
             router.replace(COMPREHENSIVE_REGISTER_ROUTE);
           }
          // If company exists, they can stay on this other authenticated page.
        }
        // If on a PUBLIC_ROUTES_ALLOWING_LOGGED_IN_NO_COMPANY, they can stay regardless of company status.

      } else {
        // User is NOT authenticated
        // If trying to access dashboard, redirect to login.
        // Unauthenticated users can freely access '/', '/register', and public pages.
        if (pathname.startsWith(DASHBOARD_BASE_ROUTE)) {
          router.replace('/');
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [pathname]); // Removed router from deps to avoid re-runs if router object identity changes.

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
