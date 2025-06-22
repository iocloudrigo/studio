export function parseFasciaOraria(fascia: string): {
  start: string;
  end: string;
} {
  const match = fascia.match(/(\d{1,2})-(\d{1,2})/);
  if (!match) return { start: '09:00', end: '11:00' }; // fallback
  const [, startHour, endHour] = match;
  return {
    start: `${startHour.padStart(2, '0')}:00`,
    end: `${endHour.padStart(2, '0')}:00`,
  };
}
