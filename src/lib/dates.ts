// Les dates de séance sont des chaînes locales « AAAA-MM-JJ » (pas de fuseau horaire).

const pad = (n: number) => String(n).padStart(2, '0');

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const todayISO = () => toISO(new Date());

export function addDays(s: string, n: number): string {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** Lundi de la semaine contenant la date. */
export function startOfWeek(s: string): string {
  const d = parseISO(s);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return toISO(d);
}

export const monthKey = (s: string) => s.slice(0, 7);

export function weekDays(s: string): string[] {
  const start = startOfWeek(s);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

const dayFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
const longFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const shortFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const monthFmt = new Intl.DateTimeFormat('fr-FR', { month: 'short' });

export const formatDay = (s: string) => dayFmt.format(parseISO(s));
const wdFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric' });
export const formatWeekdayDay = (s: string) => wdFmt.format(parseISO(s));
const monthYearFmt = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
export const formatMonthYear = (key: string) => monthYearFmt.format(parseISO(key + '-01'));

export function addMonths(key: string, n: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
export const formatLong = (s: string) => longFmt.format(parseISO(s));
export const formatShort = (s: string) => shortFmt.format(parseISO(s));
export const formatMonth = (key: string) => monthFmt.format(parseISO(key + '-01'));
export const weekdayLetter = (s: string) => 'LMMJVSD'[(parseISO(s).getDay() + 6) % 7];

export function relativeDay(s: string): string {
  const t = todayISO();
  if (s === t) return "Aujourd'hui";
  if (s === addDays(t, 1)) return 'Demain';
  if (s === addDays(t, -1)) return 'Hier';
  return formatDay(s);
}
