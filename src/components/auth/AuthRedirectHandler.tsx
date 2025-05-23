
"use client";

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// Define public routes that don't require auth and shouldn't trigger company registration check for logged-in users.
const PUBLIC_ROUTES_ALLOWING_LOGGED_IN_NO_COMPANY = ['/richiedi-intervento'];
// Define authentication routes
const AUTH_ROUTES = ['/']; // Login is now the only primary auth route, /register is for new sign-ups
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
      setIsLoading(true);
      if (user) {
        // User is authenticated
        const companyDocRef = doc(db, "aziende", user.uid);
        const companyDocSnap = await getDoc(companyDocRef);

        if (companyDocSnap.exists()) {
          // Company is registered
          // If user is on login page or the comprehensive register page, redirect to dashboard
          if (pathname === '/' || pathname === COMPREHENSIVE_REGISTER_ROUTE) {
            router.replace(DASHBOARD_BASE_ROUTE);
          }
        } else {
          // Company is NOT registered
          const isPublicAllowedRoute = PUBLIC_ROUTES_ALLOWING_LOGGED_IN_NO_COMPANY.some(route => pathname.startsWith(route));
          // If user is authenticated but company is not registered, and they are not on the register page or an allowed public page,
          // redirect them to the register page to complete company details.
          if (pathname !== COMPREHENSIVE_REGISTER_ROUTE && !isPublicAllowedRoute) {
            router.replace(COMPREHENSIVE_REGISTER_ROUTE);
          }
        }
      } else {
        // User is not authenticated
        // If trying to access dashboard or a page that requires auth (like the register page if it were for profile completion only),
        // redirect to login.
        // Note: /register is now also for initiating new sign-ups, so unauthenticated access to /register is fine.
        if (pathname.startsWith(DASHBOARD_BASE_ROUTE)) {
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
