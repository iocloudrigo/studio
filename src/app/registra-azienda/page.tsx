
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { type User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { RegistraAziendaForm } from '@/components/auth/RegistraAziendaForm';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function RegistraAziendaPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthChecked(true);
      if (user) {
        setCurrentUser(user);
        const companyDocRef = doc(db, "aziende", user.uid);
        const companyDocSnap = await getDoc(companyDocRef);
        if (companyDocSnap.exists()) {
          router.replace('/dashboard'); // Azienda già registrata, vai alla dashboard
        } else {
          setLoading(false); // Utente loggato, azienda non esiste, mostra form
        }
      } else {
        router.replace('/'); // Utente non loggato, vai al login
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (!authChecked || loading) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center justify-center min-h-[200px]">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Verifica in corso...</p>
        </div>
      </AuthLayout>
    );
  }

  if (!currentUser) {
    // Questo stato non dovrebbe essere raggiunto se la logica sopra è corretta,
    // ma serve come fallback nel caso l'utente venga perso prima del rendering del form.
    // Il redirect a '/' nell'useEffect dovrebbe aver già gestito questo.
     return (
      <AuthLayout>
        <Card>
          <CardHeader>
            <CardTitle>Accesso Richiesto</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Devi essere autenticato per registrare un'azienda.</p>
            <Button onClick={() => router.push('/')} className="mt-4">Vai al Login</Button>
          </CardContent>
        </Card>
      </AuthLayout>
     );
  }

  return (
    <AuthLayout>
      <RegistraAziendaForm user={currentUser} />
    </AuthLayout>
  );
}
