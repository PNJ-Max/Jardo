// Port de Jardo.Api.Tests/WoodPileCalculatorTests.cs : mêmes scénarios, mêmes valeurs.
import { drying, remainingSteres, type WoodMovement } from '@/domain/wood-pile';

const supply = (steres: number): WoodMovement => ({ kind: 'WoodSupply', steres });
const consumption = (steres: number): WoodMovement => ({ kind: 'WoodConsumption', steres });

describe('stock d\'un tas de bois', () => {
  it('un tas sans mouvement garde son volume initial', () => {
    expect(remainingSteres(8, [])).toBe(8);
  });

  it('les apports s\'ajoutent au volume initial et les consommations s\'en retranchent', () => {
    const stock = remainingSteres(8, [consumption(1), supply(2), consumption(1.5), consumption(3)]);

    expect(stock).toBe(4.5);
  });

  it('consommer tout le stock le laisse à zéro, sans reste de virgule flottante', () => {
    expect(remainingSteres(0.3, [consumption(0.1), consumption(0.2)])).toBe(0);
  });

  it('une consommation au-delà du stock donne un stock négatif', () => {
    expect(remainingSteres(2, [consumption(2.5)])).toBe(-0.5);
  });

  it('une intervention autre que du bois ne compte pas dans un stock', () => {
    expect(() => remainingSteres(2, [{ kind: 'Harvest', steres: 1 }])).toThrow(RangeError);
  });

  // Ajouté au portage : Math.Round arrondit au pair, Math.round de JavaScript vers le haut.
  it.each([
    [0.125, 0.12],
    [0.135, 0.14],
    [-0.125, -0.12],
    [-0.135, -0.14],
  ])('le stock s\'arrondit au centième, un milieu allant au pair comme en .NET (%d donne %d)', (initial, expected) => {
    expect(remainingSteres(initial, [])).toBe(expected);
  });
});

describe('séchage d\'un tas de bois', () => {
  // Coupé le 15 janvier 2026, six mois de séchage : prêt le 15 juillet.
  it.each([
    ['2026-07-14', 'Drying'],
    ['2026-07-15', 'Ready'],
    ['2026-07-16', 'Ready'],
  ] as const)('le bois est prêt le jour où sa durée de séchage est écoulée (le %s : %s)', (today, expected) => {
    const state = drying('2026-01-15', 6, today);

    expect(state.status).toBe(expected);
    expect(state.readyOn).toBe('2026-07-15');
  });

  it('du bois acheté sec est prêt le jour de sa coupe', () => {
    const cutDate = '2026-03-01';

    const state = drying(cutDate, 0, cutDate);

    expect(state.status).toBe('Ready');
    expect(state.readyOn).toBe(cutDate);
  });

  it('un mois de séchage depuis le 31 janvier se termine en fin de février', () => {
    const state = drying('2026-01-31', 1, '2026-02-27');

    expect(state.status).toBe('Drying');
    expect(state.readyOn).toBe('2026-02-28');
  });
});
