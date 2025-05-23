
"use client";

import { useEffect, useState } from 'react';
import { type User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { UserCredentialsForm } from '@/components/auth/UserCredentialsForm'; // Changed to UserCredentialsForm
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';

export default function RegisterUserPage() { // Renamed component for clarity
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthChecked(true);
      if (user) {
        // User is already logged in.
        // Check if company also exists. If so, they shouldn't be on this page.
        const companyDocRef = doc(db, "aziende", user.uid);
        const companyDocSnap = await getDoc(companyDocRef);
        if (companyDocSnap.exists()) {
          router.replace('/dashboard'); // Already registered and has company
        } else {
          // Logged in (e.g. via Google, then navigated here by mistake or old link) but no company.
          // They should be on /registra-azienda.
          router.replace('/registra-azienda');
        }
      } else {
        // No user logged in, show form for new email/password user registration.
        setLoading(false);
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

  return (
    <AuthLayout>
      <UserCredentialsForm />
    </AuthLayout>
  );
}
