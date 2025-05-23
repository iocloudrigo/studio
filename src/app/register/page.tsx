
"use client";

import { useEffect, useState } from 'react';
import { type User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { RegisterForm } from '@/components/auth/RegisterForm'; // This will be the comprehensive form
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function RegisterPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthChecked(true);
      if (user) {
        // User is logged in (e.g., via Google, then redirected here)
        setCurrentUser(user);
        // Check if company already exists, if so, redirect to dashboard (AuthRedirectHandler might also do this)
        const companyDocRef = doc(db, "aziende", user.uid);
        const companyDocSnap = await getDoc(companyDocRef);
        if (companyDocSnap.exists()) {
          router.replace('/dashboard');
        } else {
          setLoading(false); // Show form to complete company registration
        }
      } else {
        // No user logged in, show form for new email/password registration
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
      <RegisterForm prefilledUser={currentUser} />
    </AuthLayout>
  );
}
