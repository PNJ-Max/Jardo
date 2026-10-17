// Les dates d'arrosage et d'observation sont des DateOnly côté API : "YYYY-MM-DD",
// sans heure ni fuseau. On les garde en chaîne. Passer par new Date("2026-10-02")
// les interpréterait en UTC minuit, ce qui affiche la veille dans un fuseau négatif.

/** Date du jour au format "YYYY-MM-DD", dans le fuseau du téléphone. */
export function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** "2026-10-02" → "ven. 2 oct." */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export const isDateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
