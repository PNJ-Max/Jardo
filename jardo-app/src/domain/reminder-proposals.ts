import type { DateOnly } from './dates';
import {
  fortnightOf,
  nextFortnightStart,
  nextPlantingWindow,
  rangeContains,
  windowsFor,
  type Climate,
  type FortnightRange,
  type Species,
  type WindowKind,
} from './species';
import type { Id, JournalEntryKind, TaskRecurrence } from './types';

// Les rappels que le catalogue propose pour une plante. Voir docs/etude-catalogue-especes.md.

/** Un rappel tel qu'il sera créé, si l'utilisateur l'accepte. */
export type ReminderProposal = {
  kind: JournalEntryKind;
  /** La fenêtre qui donne la date. Null pour l'arrosage, qui part d'aujourd'hui. */
  window: WindowKind | null;
  recurrence: TaskRecurrence;
  intervalDays: number | null;
  startDate: DateOnly;
};

export type ProposalInput = {
  species: Species;
  /** `id` est null pour une plante pas encore créée. */
  plant: { id: Id | null; zoneId: Id | null; sownDate: DateOnly | null; plantedDate: DateOnly | null };
  /** Les tâches de l'espace de la plante, ou une partie : celles qui ne la concernent pas sont ignorées. */
  tasks: readonly { kind: JournalEntryKind; zoneId: Id | null; itemId: Id | null; isCompleted: boolean }[];
  on: DateOnly;
  climate: Climate;
};

const earliest = (ranges: readonly FortnightRange[], on: DateOnly) =>
  ranges.map((range) => nextFortnightStart(range.from, on)).reduce((a, b) => (a < b ? a : b));

export function proposeReminders({ species, plant, tasks, on, climate }: ProposalInput): ReminderProposal[] {
  const covering = tasks.filter((task) =>
    task.itemId !== null ? task.itemId === plant.id : task.zoneId === null || task.zoneId === plant.zoneId,
  );
  const planned = (kind: JournalEntryKind) => covering.some((task) => task.kind === kind && !task.isCompleted);
  // Une tâche ponctuelle faite sur la plante ne se repropose pas : un semis noté n'est pas à refaire.
  const closed = (kind: JournalEntryKind) => covering.some((task) => task.kind === kind && task.isCompleted && task.itemId !== null);
  const asked = (kind: JournalEntryKind) => planned(kind) || closed(kind);

  const isFruit = species.category === 'FruitTree' || species.category === 'SmallFruit';
  const proposals: ReminderProposal[] = [];

  if (species.wateringEveryDays !== undefined && !planned('Watering')) {
    proposals.push({
      kind: 'Watering',
      window: null,
      recurrence: 'EveryNDays',
      intervalDays: species.wateringEveryDays,
      startDate: on,
    });
  }

  if (plant.plantedDate === null && !asked('Planting')) {
    const sown = plant.sownDate !== null || asked('Sowing');
    const next = nextPlantingWindow(species, on, climate, sown ? ['plant'] : undefined);
    if (next) {
      proposals.push({
        kind: next.kind === 'plant' ? 'Planting' : 'Sowing',
        window: next.kind,
        recurrence: 'Once',
        intervalDays: null,
        startDate: next.opensIn === 0 ? on : nextFortnightStart(next.range.from, on),
      });
    }
  }

  const harvests = windowsFor(species, 'harvest', climate);
  if (harvests.length > 0) {
    if (isFruit || species.perennial) {
      if (!planned('Harvest')) {
        proposals.push(yearly('Harvest', 'harvest', harvests, on));
      }
    } else if (!asked('Harvest')) {
      const open = harvests.some((range) => rangeContains(range, fortnightOf(on)));
      proposals.push({
        kind: 'Harvest',
        window: 'harvest',
        recurrence: 'Once',
        intervalDays: null,
        startDate: open ? on : earliest(harvests, on),
      });
    }
  }

  const prunings = windowsFor(species, 'prune', climate);
  if (isFruit && prunings.length > 0 && !planned('Pruning')) {
    proposals.push(yearly('Pruning', 'prune', prunings, on));
  }

  return proposals;
}

// La date de départ d'une tâche annuelle fixe aussi son jour anniversaire : même dans une fenêtre
// ouverte, elle reste au début d'une fenêtre, à venir pour ne pas naître en retard.
function yearly(kind: JournalEntryKind, window: WindowKind, ranges: readonly FortnightRange[], on: DateOnly): ReminderProposal {
  return { kind, window, recurrence: 'Yearly', intervalDays: null, startDate: earliest(ranges, on) };
}
