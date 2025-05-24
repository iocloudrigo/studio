
"use client";

import { useEffect, useState, useRef } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

const LOGIN_ROUTE = '/';
const REGISTER_ROUTE_USER_ONLY = '/register';
const DASHBOARD_BASE_ROUTE = '/dashboard';
const ALWAYS_PUBLIC_ROUTES = ['/richiedi-intervento']; // Rotte sempre pubbliche

export function AuthRedirectHandler({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const authCheckProcessed = useRef(false); // Riferimento per tracciare se il callback di onAuthStateChanged è stato eseguito

  useEffect(() => {
    console.log("[AuthRedirectHandler] useEffect triggered. Pathname:", pathname);
    authCheckProcessed.current = false; // Resetta il flag ad ogni cambio di pathname

    // Timeout di sicurezza per sbloccare il caricamento se Firebase non risponde
    const failsafeTimeoutId = setTimeout(() => {
      if (!authCheckProcessed.current) {
        console.warn("[AuthRedirectHandler] Timeout di sicurezza raggiunto. Lo stato di autenticazione non è stato risolto. Sblocco del caricamento.");
        setIsLoading(false);
      }
    }, 7000); // Timeout di 7 secondi

    const unsubscribe = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      authCheckProcessed.current = true; // Segna che il callback è stato chiamato
      clearTimeout(failsafeTimeoutId); // Annulla il timeout di sicurezza
      console.log("[AuthRedirectHandler] onAuthStateChanged callback started. User UID:", user?.uid);

      try {
        if (user) {
          console.log("[AuthRedirectHandler] User is authenticated. UID:", user.uid);
          const companyDocRef = doc(db, "aziende", user.uid);
          const companyDocSnap = await getDoc(companyDocRef);
          const companyExists = companyDocSnap.exists();
          console.log("[AuthRedirectHandler] Company exists for user:", companyExists);

          if (pathname.startsWith(DASHBOARD_BASE_ROUTE)) {
            if (!companyExists) {
              console.log("[AuthRedirectHandler] User on dashboard but NO company. Redirecting to register.");
              router.replace(REGISTER_ROUTE_USER_ONLY);
            } else {
              console.log("[AuthRedirectHandler] User on dashboard and HAS company. Allowing stay.");
            }
          } else if (pathname === LOGIN_ROUTE || pathname === REGISTER_ROUTE_USER_ONLY) {
            if (companyExists) {
              console.log(`[AuthRedirectHandler] Authenticated user with company on ${pathname}. Redirecting to dashboard.`);
              router.replace(DASHBOARD_BASE_ROUTE);
            } else {
              console.log(`[AuthRedirectHandler] Authenticated user on ${pathname} but NO company. Allowing stay (user will complete registration or login again).`);
            }
          } else if (ALWAYS_PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
            console.log(`[AuthRedirectHandler] Authenticated user on allowed public route ${pathname}. No redirect needed.`);
          } else {
            // Se l'utente è autenticato e su una pagina non gestita esplicitamente,
            // e ha un'azienda, potrebbe essere sensato reindirizzarlo alla dashboard.
            // Se non ha un'azienda, alla pagina di registrazione.
            // Per ora, per minimizzare redirect aggressivi, lo lasciamo stare se non è una dashboard.
            console.log(`[AuthRedirectHandler] Authenticated user on unhandled page ${pathname}. Company exists: ${companyExists}. Allowing stay for now.`);
          }
        } else { // User is NOT authenticated
          console.log("[AuthRedirectHandler] User is NOT authenticated.");
          if (pathname.startsWith(DASHBOARD_BASE_ROUTE)) {
            console.log(`[AuthRedirectHandler] Unauthenticated user on protected dashboard route ${pathname}. Redirecting to login.`);
            router.replace(LOGIN_ROUTE);
          } else {
            console.log(`[AuthRedirectHandler] Unauthenticated user on public/auth route ${pathname}. Allowing stay.`);
          }
        }
      } catch (error) {
        console.error("[AuthRedirectHandler] Error processing auth state:", error);
        // L'errore è loggato, isLoading sarà gestito dal blocco finally
      } finally {
        if (isLoading) { // Controlla se isLoading è ancora true per evitare chiamate multiple se il componente si ri-renderizza velocemente
            console.log("[AuthRedirectHandler] Auth processing finished (within onAuthStateChanged). Setting isLoading to false.");
            setIsLoading(false);
        }
      }
    });

    return () => {
      console.log("[AuthRedirectHandler] Unsubscribing from onAuthStateChanged and clearing timeout.");
      clearTimeout(failsafeTimeoutId);
      unsubscribe();
    };
  }, [pathname, router]); // Dipendenze per rieseguire l'effetto se cambiano

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
