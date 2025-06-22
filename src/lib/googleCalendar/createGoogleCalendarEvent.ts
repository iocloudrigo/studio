import { getNextWeekdayDate } from './getNextWeekdayDate';
import { parseFasciaOraria } from './parseFasciaOraria';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function createGoogleCalendarEvent(
  richiesta: any,
  calendarId: string,
  accessToken: string
) {
  const date = getNextWeekdayDate(richiesta.giorno_preferito);
  const { start, end } = parseFasciaOraria(richiesta.fascia_oraria);
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

  const event = {
    summary: `Intervento per ${richiesta.customer}`,
    description: `Servizio: ${richiesta.service}\nTecnico: ${
      richiesta.assegnato_a_tecnico_nome || 'N/D'
    }\nNote: ${richiesta.note_aggiuntive || 'Nessuna'}`,
    location: richiesta.indirizzo_intervento,
    start: {
      dateTime: `${dateStr}T${start}:00`,
      timeZone: 'Europe/Rome',
    },
    end: {
      dateTime: `${dateStr}T${end}:00`,
      timeZone: 'Europe/Rome',
    },
    attendees: richiesta.email_cliente
      ? [{ email: richiesta.email_cliente }]
      : [],
  };

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    console.error('Google Calendar Error', error);
    throw new Error("Errore durante la creazione dell'evento.");
  }

  const createdEvent = await response.json();

  await updateDoc(doc(db, 'richieste_clienti', richiesta.id), {
    google_calendar_event_id: createdEvent.id,
  });

  return createdEvent.id;
}
