// Les jours du jardin sont des chaînes "YYYY-MM-DD" : l'ordre alphabétique est l'ordre
// chronologique, et on les compare directement avec < et >.
// L'arithmétique passe par Date.UTC, qui ne fait ici que du calcul calendaire : on ne lit jamais
// un jour avec le fuseau du téléphone, donc rien ne décale d'un jour.

/** Un jour du calendrier, "YYYY-MM-DD". */
export type DateOnly = string;

const pattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const millisecondsPerDay = 86_400_000;

const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

function parse(value: DateOnly): { year: number; month: number; day: number } {
  const match = pattern.exec(value);
  if (!match) throw new RangeError(`« ${value} » n'est pas un jour au format AAAA-MM-JJ.`);

  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    throw new RangeError(`« ${value} » n'est pas un jour du calendrier.`);
  }
  return { year, month, day };
}

function format(year: number, month: number, day: number): DateOnly {
  const pad = (n: number, length: number) => String(n).padStart(length, '0');
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

/** Le nombre de jours depuis une origine commune : la différence de deux jours est un entier. */
function dayNumber(value: DateOnly): number {
  const { year, month, day } = parse(value);
  return Date.UTC(year, month - 1, day) / millisecondsPerDay;
}

/** Jours entre deux dates : positif si `later` suit `earlier`. */
export const daysBetween = (earlier: DateOnly, later: DateOnly) => dayNumber(later) - dayNumber(earlier);

export function addDays(value: DateOnly, days: number): DateOnly {
  const date = new Date((dayNumber(value) + days) * millisecondsPerDay);
  return format(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/** Comme DateOnly.AddMonths en .NET : le quantième est ramené à la fin du mois s'il n'existe pas. */
export function addMonths(value: DateOnly, months: number): DateOnly {
  const { year, month, day } = parse(value);
  const total = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(total / 12);
  const targetMonth = total - targetYear * 12 + 1;
  return format(targetYear, targetMonth, Math.min(day, daysInMonth(targetYear, targetMonth)));
}

/** Comme DateOnly.AddYears en .NET : le 29 février d'une année bissextile devient le 28. */
export const addYears = (value: DateOnly, years: number) => addMonths(value, years * 12);

export const yearOf = (value: DateOnly) => parse(value).year;
