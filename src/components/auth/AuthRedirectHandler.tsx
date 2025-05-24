
"use client";

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

const LOGIN_ROUTE = '/';
const REGISTER_ROUTE_COMPLETE_COMPANY = '/registra-azienda'; // Legacy, ora dovrebbe essere /register
const REGISTER_ROUTE_USER_ONLY = '/register'; // Pagina di registrazione unificata
const DASHBOARD_BASE_ROUTE = '/dashboard';
// Route pubbliche che gli utenti loggati (anche senza azienda) possono accedere senza essere reindirizzati a /register
const PUBLIC_ROUTES_ALLOWING_LOGGED_IN_NO_COMPANY = ['/richiedi-intervento'];

export function AuthRedirectHandler({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log("[AuthRedirectHandler] useEffect triggered. Pathname:", pathname);
    const unsubscribe = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      console.log("[AuthRedirectHandler] onAuthStateChanged callback started. User UID:", user?.uid);
      try {
        if (user) {
          console.log("[AuthRedirectHandler] User is authenticated. UID:", user.uid);
          const companyDocRef = doc(db, "aziende", user.uid);
          const companyDocSnap = await getDoc(companyDocRef);
          const companyExists = companyDocSnap.exists();
          console.log("[AuthRedirectHandler] Company exists for user:", companyExists);

          if (pathname === LOGIN_ROUTE) {
            console.log("[AuthRedirectHandler] User on login page. No auto redirect. LoginForm will handle action.");
            // Non reindirizzare automaticamente se l'utente è sulla pagina di login.
            // Il LoginForm gestirà il redirect dopo un tentativo di login.
          } else if (pathname === REGISTER_ROUTE_USER_ONLY) {
            if (companyExists) {
              console.log(`[AuthRedirectHandler] Authenticated user with company on ${REGISTER_ROUTE_USER_ONLY}. Redirecting to dashboard.`);
              router.replace(DASHBOARD_BASE_ROUTE);
            } else {
              console.log(`[AuthRedirectHandler] Authenticated user without company on ${REGISTER_ROUTE_USER_ONLY}. Allowing to stay.`);
              // Permetti all'utente di rimanere su /register se non ha un'azienda (es. dopo login Google)
            }
          } else if (pathname.startsWith(DASHBOARD_BASE_ROUTE)) {
            if (!companyExists) {
              console.log("[AuthRedirectHandler] Authenticated user on dashboard without company. Redirecting to register.");
              router.replace(REGISTER_ROUTE_USER_ONLY);
            } else {
              console.log("[AuthRedirectHandler] Authenticated user with company on dashboard. Allowing to stay.");
            }
          } else if (PUBLIC_ROUTES_ALLOWING_LOGGED_IN_NO_COMPANY.some(route => pathname.startsWith(route))) {
            console.log(`[AuthRedirectHandler] Authenticated user on allowed public route ${pathname}. No redirect needed.`);
          } else {
            // Utente autenticato su una pagina non gestita specificamente
            if (!companyExists) {
              console.log(`[AuthRedirectHandler] Authenticated user on ${pathname} without company. Redirecting to register.`);
              router.replace(REGISTER_ROUTE_USER_ONLY);
            } else {
              console.log(`[AuthRedirectHandler] Authenticated user on ${pathname} with company. Assuming valid page or allowing stay.`);
            }
          }
        } else { // User is NOT authenticated
          console.log("[AuthRedirectHandler] User is not authenticated.");
          const isDashboardRoute = pathname.startsWith(DASHBOARD_BASE_ROUTE);
          // La pagina /register è accessibile anche da non autenticati
          const isSensitiveRegisterRoute = pathname.startsWith(REGISTER_ROUTE_COMPLETE_COMPANY) && pathname !== REGISTER_ROUTE_USER_ONLY;


          if (isDashboardRoute || isSensitiveRegisterRoute) {
             console.log(`[AuthRedirectHandler] Unauthenticated user on protected route ${pathname}. Redirecting to login.`);
            router.replace(LOGIN_ROUTE);
          } else if (pathname === LOGIN_ROUTE) {
             console.log("[AuthRedirectHandler] Unauthenticated user on login page. No redirect needed.");
          } else if (pathname === REGISTER_ROUTE_USER_ONLY){
            console.log("[AuthRedirectHandler] Unauthenticated user on register page. No redirect needed.");
          }
           else {
            console.log(`[AuthRedirectHandler] Unauthenticated user on public route ${pathname}. No redirect needed.`);
          }
        }
      } catch (error) {
        console.error("[AuthRedirectHandler] Error processing auth state:", error);
        // Potresti voler mostrare un errore all'utente qui o reindirizzare a una pagina di errore generica
      } finally {
        console.log("[AuthRedirectHandler] Auth processing finished. Setting isLoading to false.");
        setIsLoading(false);
      }
    });

    return () => {
      console.log("[AuthRedirectHandler] Unsubscribing from onAuthStateChanged.");
      unsubscribe();
    };
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
