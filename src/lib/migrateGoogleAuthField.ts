import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

export async function migrateGoogleAuthField() {
  const aziendeRef = collection(db, 'aziende');
  const snapshot = await getDocs(aziendeRef);

  const promises: Promise<any>[] = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();

    if (!data.google_auth) {
      const update = updateDoc(doc(db, 'aziende', docSnap.id), {
        google_auth: {
          google_calendar_connected: false,
          google_email: null,
          google_access_token: null,
          connected_at: null,
        },
      });

      promises.push(update);
      console.log(`Aggiunto google_auth a ${docSnap.id}`);
    } else {
      console.log(`Skipped (già esiste): ${docSnap.id}`);
    }
  });

  await Promise.all(promises);
  console.log('Migrazione completata.');
}
