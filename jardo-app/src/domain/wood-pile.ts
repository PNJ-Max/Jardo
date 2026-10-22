import { addMonths, type DateOnly } from './dates';
import type { DryingStatus, JournalEntryKind } from './types';

/** Un apport ou une consommation de bois, tels que notés au journal. */
export type WoodMovement = { kind: JournalEntryKind; steres: number };

/** L'état de séchage d'un tas à une date donnée. Jamais stocké. */
export type DryingState = {
  status: DryingStatus;
  /**
   * Le jour où le bois est prêt : futur ou aujourd'hui pour un tas prêt dès aujourd'hui, passé pour
   * un tas prêt depuis. Ce jour-là, le bois est déjà prêt.
   */
  readyOn: DateOnly;
};

// Math.round arrondit les milieux vers le haut. L'original .NET (Math.Round) les arrondit vers le
// pair, et le stock doit donner les mêmes centièmes : 0,125 stère fait 0,12.
function roundToEven(value: number): number {
  const floor = Math.floor(value);
  const fraction = value - floor;
  if (fraction < 0.5) return floor;
  if (fraction > 0.5) return floor + 1;
  return floor % 2 === 0 ? floor : floor + 1;
}

/**
 * Stock restant : le volume initial, plus les apports et moins les consommations notés au journal
 * sur ce tas. Arrondi au centième de stère, pour qu'une somme de décimales ne laisse pas un reste
 * fantôme de 1e-15 qui ferait refuser la dernière bûche.
 */
export function remainingSteres(initialSteres: number, movements: readonly WoodMovement[]): number {
  let stock = initialSteres;

  for (const { kind, steres } of movements) {
    if (kind === 'WoodSupply') stock += steres;
    else if (kind === 'WoodConsumption') stock -= steres;
    else throw new RangeError("Seuls l'apport et la consommation de bois changent un stock.");
  }

  return roundToEven(stock * 100) / 100;
}

/**
 * Le bois est prêt à brûler le jour où la durée de séchage est écoulée depuis la coupe, ce jour
 * compris. Un mois de plus se compte au même quantième, ramené à la fin du mois s'il n'existe pas :
 * coupé le 31 janvier, séché un mois, le bois est prêt le 28 février.
 */
export function drying(cutDate: DateOnly, dryingMonths: number, today: DateOnly): DryingState {
  const readyOn = addMonths(cutDate, dryingMonths);

  return { status: today >= readyOn ? 'Ready' : 'Drying', readyOn };
}
