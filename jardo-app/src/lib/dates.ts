// Les dates du jardin (journal, échéances, semis…) sont des jours sans heure : "YYYY-MM-DD",
// sans heure ni fuseau. On les garde en chaîne. Passer par new Date("2026-10-02") les
// interpréterait en UTC minuit, ce qui affiche la veille dans un fuseau négatif.

/** Date locale → "YYYY-MM-DD", dans le fuseau du téléphone. */
export function toDateOnly(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "YYYY-MM-DD" → minuit local de ce jour-là. */
export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export const today = () => toDateOnly(new Date());

const isThisYear = (date: Date) => date.getFullYear() === new Date().getFullYear();

/** "2026-10-02" → "ven. 2 oct." ; l'année n'apparaît que si ce n'est pas l'année en cours. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = parseDateOnly(value);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: isThisYear(date) ? undefined : 'numeric',
  });
}

/** "2026-10-02" → "2 octobre 2026" */
export function formatLongDate(value: string): string {
  return parseDateOnly(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** En-tête de jour du journal : « Aujourd'hui », « Hier », puis « vendredi 2 octobre ». */
export function formatDayHeading(value: string): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (value === today()) return "Aujourd'hui";
  if (value === toDateOnly(yesterday)) return 'Hier';

  const date = parseDateOnly(value);
  const label = date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: isThisYear(date) ? undefined : 'numeric',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}
