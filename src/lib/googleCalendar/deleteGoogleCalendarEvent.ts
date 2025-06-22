import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export async function deleteGoogleCalendarEvent(
  calendarId: string,
  eventId: string,
  accessToken: string,
  richiestaId: string
) {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok && response.status !== 410 && response.status !== 404) {
    const error = await response.json();
    console.error('Errore eliminazione evento:', error);
    throw new Error("Errore durante l'eliminazione dell'evento.");
  }

  // Удаляем ID события из Firestore
  await updateDoc(doc(db, 'richieste_clienti', richiestaId), {
    google_calendar_event_id: null,
  });
}
