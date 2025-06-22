import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase'; // тот же импорт, как в твоём файле lib/firebase.ts

export async function connectGoogleCalendar() {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/calendar');

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential || !credential.accessToken)
      throw new Error('Token non trovato');

    const user = result.user;
    const accessToken = credential.accessToken;
    const email = user.email ?? null;

    // Обновление Firestore
    const aziendaRef = doc(db, 'aziende', user.uid);
    await updateDoc(aziendaRef, {
      google_auth: {
        google_calendar_connected: true,
        google_email: email,
        google_access_token: accessToken,
        connected_at: new Date().toISOString(),
      },
    });

    return { success: true, accessToken, email };
  } catch (err: any) {
    console.error('[GoogleAuth] Errore:', err);
    return { success: false, error: err.message };
  }
}
