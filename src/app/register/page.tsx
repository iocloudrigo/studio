
"use client";

import { useEffect, useState } from 'react';
import { type User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { UnifiedRegisterForm } from '@/components/auth/UnifiedRegisterForm';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';

export default function RegisterPage() {
  const router = useRouter();
  // currentUser state is not strictly needed here anymore as UnifiedRegisterForm doesn't take it as a prop.
  // However, this onAuthStateChanged logic is useful to redirect already logged-in and company-registered users.
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthChecked(true);
      if (user) {
        // User is logged in. Check if company already exists.
        // If company exists, they shouldn't be on this page.
        const companyDocRef = doc(db, "aziende", user.uid);
        const companyDocSnap = await getDoc(companyDocRef);
        if (companyDocSnap.exists()) {
          router.replace('/dashboard'); // Redirect to dashboard if company already registered
        } else {
          // No company profile found, but user is logged in (e.g. from a previous session attempt).
          // This scenario is less likely with Google Auth removed.
          // For now, allow to stay on register page; UnifiedRegisterForm will handle new user creation.
          // If the user logged in via a different tab and then came here, they could see this.
          // The form itself will force new credential entry.
          setLoading(false);
        }
      } else {
        // No user logged in, show form for new full registration.
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
      <UnifiedRegisterForm />
    </AuthLayout>
  );
}
