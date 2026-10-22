// Port de Jardo.Api.Tests/DueDateCalculatorTests.cs : mêmes scénarios, mêmes dates.
import { addDays } from '@/domain/dates';
import { calculateDueState, type DueState } from '@/domain/due-date';

const today = '2026-06-15';

// La date de création ne compte que pour une tâche ponctuelle.
const longAgo = '2020-01-01';

const ago = (days: number) => addDays(today, -days);

const everyNDays = (intervalDays: number, lastDoneOn: string | null, startDate = '2026-01-01'): DueState =>
  calculateDueState({ recurrence: 'EveryNDays', startDate, intervalDays, lastDoneOn, createdOn: longAgo, today });

const yearly = (startDate: string, lastDoneOn: string | null): DueState =>
  calculateDueState({ recurrence: 'Yearly', startDate, intervalDays: null, lastDoneOn, createdOn: longAgo, today });

const once = (date: string, createdOn: string, lastDoneOn: string | null): DueState =>
  calculateDueState({ recurrence: 'Once', startDate: date, intervalDays: null, lastDoneOn, createdOn, today });

describe('échéance des tâches', () => {
  it('une tâche faite aujourd\'hui est à jour jusqu\'à la prochaine échéance', () => {
    const state = everyNDays(2, today);

    expect(state.status).toBe('Ok');
    expect(state.nextDueDate).toBe(addDays(today, 2));
    expect(state.daysOverdue).toBe(0);
  });

  it('une tâche dont l\'échéance tombe aujourd\'hui est DueSoon', () => {
    const state = everyNDays(3, ago(3));

    expect(state.status).toBe('DueSoon');
    expect(state.nextDueDate).toBe(today);
    expect(state.daysOverdue).toBe(0);
  });

  it.each([
    [3, 1],
    [5, 3],
    [30, 28],
  ])('une échéance dépassée donne le nombre de jours de retard (faite il y a %i jours, %i de retard)', (doneDaysAgo, expectedDaysOverdue) => {
    const state = everyNDays(2, ago(doneDaysAgo));

    expect(state.status).toBe('Overdue');
    expect(state.daysOverdue).toBe(expectedDaysOverdue);
    expect(state.lastDoneOn).toBe(ago(doneDaysAgo));
  });

  it('jamais faite, l\'échéance est la date de départ', () => {
    expect(everyNDays(3, null, addDays(today, 5)).nextDueDate).toBe(addDays(today, 5));

    const late = everyNDays(3, null, ago(4));

    expect(late.status).toBe('Overdue');
    expect(late.daysOverdue).toBe(4);
  });

  it('un historique antérieur à la date de départ ne met pas la tâche en retard', () => {
    const state = everyNDays(3, ago(10), today);

    expect(state.status).toBe('DueSoon');
    expect(state.nextDueDate).toBe(today);
  });

  it('faite juste avant la date de départ, l\'échéance suit l\'intervalle', () => {
    const state = everyNDays(3, ago(1), today);

    expect(state.nextDueDate).toBe(addDays(today, 2));
  });

  it('une tâche tous les N jours sans intervalle est refusée', () => {
    expect(() =>
      calculateDueState({
        recurrence: 'EveryNDays',
        startDate: today,
        intervalDays: null,
        lastDoneOn: null,
        createdOn: longAgo,
        today,
      }),
    ).toThrow(RangeError);
  });

  it('une tâche annuelle jamais faite est due depuis sa date de départ', () => {
    const state = yearly('2026-02-01', null);

    expect(state.nextDueDate).toBe('2026-02-01');
    expect(state.status).toBe('Overdue');
    expect(state.daysOverdue).toBe(134);
  });

  it.each([
    ['2026-01-25', '2027-02-01'], // Une semaine d'avance : compte pour le 1er février.
    ['2026-01-02', '2027-02-01'], // 30 jours d'avance : compte encore.
    ['2026-01-01', '2026-02-01'], // 31 jours d'avance : trop tôt, le 1er février reste dû.
    ['2026-02-01', '2027-02-01'],
    ['2026-03-15', '2027-02-01'], // En retard : compte pour le 1er février passé.
    ['2026-06-10', '2027-02-01'], // Une taille en vert ne fait pas la taille d'hiver suivante.
    ['2025-06-01', '2026-02-01'], // Avant la date de départ : ne compte pas.
  ])('une tâche annuelle compte ce qui est fait jusqu\'à un mois avant (faite le %s, due le %s)', (doneOn, expectedDue) => {
    expect(yearly('2026-02-01', doneOn).nextDueDate).toBe(expectedDue);
  });

  it.each([
    ['2024-03-01', '2025-02-28'],
    ['2027-03-01', '2028-02-29'],
  ])('une tâche annuelle du 29 février revient le 28 hors année bissextile (faite le %s, due le %s)', (doneOn, expectedDue) => {
    expect(yearly('2024-02-29', doneOn).nextDueDate).toBe(expectedDue);
  });

  it('une tâche ponctuelle pas encore faite est due à sa date', () => {
    expect(once(addDays(today, 3), today, null).status).toBe('Ok');

    const late = once(ago(2), ago(10), null);

    expect(late.status).toBe('Overdue');
    expect(late.daysOverdue).toBe(2);
  });

  it.each([
    [5, 3], // Faite en avance : prévue dans 5 jours, faite il y a 3 jours.
    [-5, 10], // Faite le jour de sa création.
    [-5, 2], // Faite après sa date, en retard.
  ])('une tâche ponctuelle est close par une intervention depuis sa création (prévue dans %i jours, faite il y a %i jours)', (plannedInDays, doneDaysAgo) => {
    const state = once(addDays(today, plannedInDays), ago(10), ago(doneDaysAgo));

    expect(state.nextDueDate).toBeNull();
    expect(state.status).toBe('Ok');
    expect(state.daysOverdue).toBe(0);
  });

  it('une intervention antérieure à la création ne clôt pas une tâche ponctuelle', () => {
    const state = once(addDays(today, 3), today, ago(1));

    expect(state.nextDueDate).toBe(addDays(today, 3));
    expect(state.status).toBe('Ok');
    expect(state.lastDoneOn).toBe(ago(1));
  });
});
