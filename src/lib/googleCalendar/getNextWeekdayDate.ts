const WEEKDAY_MAP: Record<string, number> = {
  Lunedì: 1,
  Martedì: 2,
  Mercoledì: 3,
  Giovedì: 4,
  Venerdì: 5,
  Sabato: 6,
  Domenica: 0,
};

export function getNextWeekdayDate(weekday: string): Date {
  const targetDay = WEEKDAY_MAP[weekday];
  if (targetDay === undefined) throw new Error('Giorno preferito non valido');
  const today = new Date();
  const diff = (targetDay + 7 - today.getDay()) % 7 || 7;
  const result = new Date(today);
  result.setDate(today.getDate() + diff);
  return result;
}
