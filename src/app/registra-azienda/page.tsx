
"use client";

import { useEffect, useState } from 'react';
import { type User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { RegistraAziendaForm } from '@/components/auth/RegistraAziendaForm';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';

export default function RegisterCompanyPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthChecked(true);
      if (user) {
        setCurrentUser(user);
        // User is logged in. Check if company already exists.
        const companyDocRef = doc(db, "aziende", user.uid);
        const companyDocSnap = await getDoc(companyDocRef);
        if (companyDocSnap.exists()) {
          // Company already exists, should not be on this page. Redirect to dashboard.
          router.replace('/dashboard');
        } else {
          // No company profile found, allow to complete registration.
          setLoading(false);
        }
      } else {
        // No user logged in, redirect to login page.
        router.replace('/');
      }
    });
    return () => unsubscribe();
  }, [router]);

  if (!authChecked || loading) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center justify-center min-h-[200px]">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </AuthLayout>
    );
  }

  if (!currentUser) {
    // Should have been redirected by useEffect, but as a fallback
    return (
      <AuthLayout>
        <p>Devi essere autenticato per registrare un&apos;azienda.</p>
         <Button onClick={() => router.push('/')} className="mt-4">Vai al Login</Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <RegistraAziendaForm currentUser={currentUser} />
    </AuthLayout>
  );
}
