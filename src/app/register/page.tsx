
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
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthChecked(true);
      if (user) {
        setCurrentUser(user);
        // User is logged in. Check if company already exists.
        // If company exists, they shouldn't be on this page (AuthRedirectHandler should manage this for other routes).
        // If they land here directly and company exists, redirect to dashboard.
        const companyDocRef = doc(db, "aziende", user.uid);
        const companyDocSnap = await getDoc(companyDocRef);
        if (companyDocSnap.exists()) {
          router.replace('/dashboard');
        } else {
          // No company profile found, allow to complete registration.
          // The form will use currentUser to prefill email.
          setLoading(false);
        }
      } else {
        // No user logged in, show form for new full registration.
        setCurrentUser(null);
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
      <UnifiedRegisterForm currentUser={currentUser} />
    </AuthLayout>
  );
}
