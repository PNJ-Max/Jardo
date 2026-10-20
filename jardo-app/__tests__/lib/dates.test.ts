import { formatDate, formatDayHeading, formatLongDate, parseDateOnly, toDateOnly, today } from '@/lib/dates';

describe('dates du jardin', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 9, 20, 23, 30));
  });
  afterEach(() => jest.useRealTimers());

  it('convertit une date locale en YYYY-MM-DD sans décalage de fuseau', () => {
    expect(toDateOnly(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(today()).toBe('2026-10-20');
  });

  it('relit une chaîne comme minuit local du même jour', () => {
    const date = parseDateOnly('2026-10-02');
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([2026, 9, 2, 0]);
    expect(toDateOnly(parseDateOnly('2026-03-29'))).toBe('2026-03-29');
  });

  it('affiche la date courte, avec l\'année seulement si ce n\'est pas l\'année en cours', () => {
    expect(formatDate('2026-10-02')).toBe('ven. 2 oct.');
    expect(formatDate('2025-10-02')).toBe('jeu. 2 oct. 2025');
    expect(formatDate(null)).toBe('—');
  });

  it('affiche la date longue', () => {
    expect(formatLongDate('2026-10-02')).toBe('2 octobre 2026');
  });

  it('titre les jours du journal : Aujourd\'hui, Hier, puis le jour en toutes lettres', () => {
    expect(formatDayHeading('2026-10-20')).toBe("Aujourd'hui");
    expect(formatDayHeading('2026-10-19')).toBe('Hier');
    expect(formatDayHeading('2026-10-02')).toBe('Vendredi 2 octobre');
    expect(formatDayHeading('2025-10-02')).toBe('Jeudi 2 octobre 2025');
  });

  it('trouve « hier » à travers un changement de mois', () => {
    jest.setSystemTime(new Date(2026, 10, 1, 8, 0));
    expect(formatDayHeading('2026-10-31')).toBe('Hier');
  });
});
