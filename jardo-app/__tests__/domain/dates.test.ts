import { addDays, addMonths, addYears, daysBetween, yearOf } from '@/domain/dates';

describe('jours du calendrier', () => {
  it('ajoute des jours à travers les fins de mois et d\'année', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
    expect(addDays('2026-06-15', 0)).toBe('2026-06-15');
  });

  it('compte un jour de plus à travers le changement d\'heure', () => {
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2);
  });

  it('donne l\'écart signé entre deux jours', () => {
    expect(daysBetween('2026-02-01', '2026-06-15')).toBe(134);
    expect(daysBetween('2026-06-15', '2026-02-01')).toBe(-134);
    expect(daysBetween('2026-06-15', '2026-06-15')).toBe(0);
    expect(daysBetween('2025-12-31', '2026-12-31')).toBe(365);
    expect(daysBetween('2023-12-31', '2024-12-31')).toBe(366);
  });

  it('ajoute des mois en ramenant le quantième à la fin du mois', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonths('2026-01-15', 6)).toBe('2026-07-15');
    expect(addMonths('2026-11-30', 3)).toBe('2027-02-28');
    expect(addMonths('2026-01-15', 0)).toBe('2026-01-15');
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28');
    expect(addMonths('2026-01-15', -2)).toBe('2025-11-15');
  });

  it('ajoute des années, le 29 février devenant le 28 hors année bissextile', () => {
    expect(addYears('2024-02-29', 1)).toBe('2025-02-28');
    expect(addYears('2024-02-29', 4)).toBe('2028-02-29');
    expect(addYears('2026-02-01', 1)).toBe('2027-02-01');
  });

  it('lit l\'année', () => {
    expect(yearOf('2026-12-31')).toBe(2026);
  });

  it.each(['2026-2-1', '2026-02-30', '2026-13-01', '2026-02-01T10:00:00', '', 'hier'])(
    'refuse « %s », qui n\'est pas un jour',
    (value) => {
      expect(() => addDays(value, 1)).toThrow(RangeError);
    },
  );
});
