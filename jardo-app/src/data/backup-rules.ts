import {
  acceptsPlants,
  acceptsWoodPiles,
  entryKindLabel,
  isEntryKindAllowedIn,
  isWoodKind,
  spaceKindLabel,
} from '@/domain/kinds';
import type { Id, JournalEntryKind, MeasureUnit, QuantityUnit, SpaceKind, TaskRecurrence } from '@/domain/types';
import { remainingSteres } from '@/domain/wood-pile';

import type { BackupRow, BackupTables } from './backup';
import { findLayout, findSlot } from './garden-layouts';
import { ensureFieldsFitKind, validate as validateEntry } from './journal';
import { ensureQuantityFits, validate as validatePlant } from './plants';
import { businessRule, invalidBackup, ProblemError } from './problem';
import { validate as validateSpace } from './spaces';
import { ensureTaskFields, validate as validateTask } from './tasks';
import { optionalText, Validation } from './validation';
import { validate as validateWoodPile } from './wood-piles';
import { validate as validateZone } from './zones';

// Les règles des services, rejouées sur le contenu d'un fichier d'export. Ce que la base contient
// déjà reste valable : un espace ou un élément archivé garde son historique, une entrée ancienne
// reste au journal. La date future du journal n'est pas revérifiée : elle dépend du jour de l'import.

type Item = BackupRow<'garden_items'>;

/** Passe `check` ; un refus devient le refus du fichier, avec la ligne en cause. */
function apply(where: string, check: () => void) {
  try {
    check();
  } catch (error) {
    if (!(error instanceof ProblemError)) throw error;
    const [fieldErrors] = Object.values(error.problem.errors ?? {});
    throw invalidBackup(`${where} : ${fieldErrors?.[0] ?? error.message}`);
  }
}

function indexById<T extends { id: Id }>(label: string, rows: readonly T[]): Map<Id, T> {
  const index = new Map<Id, T>();
  for (const row of rows) {
    if (index.has(row.id)) throw invalidBackup(`L'identifiant ${row.id} apparaît deux fois parmi les ${label}.`);
    index.set(row.id, row);
  }
  return index;
}

function ensureUnique(seen: Set<string>, key: string, message: string) {
  if (seen.has(key)) throw businessRule(message);
  seen.add(key);
}

const plantColumns = ['species', 'variety', 'quantity', 'quantity_unit', 'sown_date', 'planted_date'] as const;
const woodPileColumns = ['wood_species', 'initial_steres', 'log_length_cm', 'cut_date', 'drying_months'] as const;

const itemLabel = (item: Item) =>
  `${item.item_type === 'WoodPile' ? 'Tas de bois' : item.item_type === 'Plant' ? 'Plante' : 'Élément'} « ${item.name} »`;

/** Vérifie tout le contenu d'un export ; la première règle enfreinte refuse le fichier entier. */
export function checkBackupRules(tables: BackupTables): void {
  const [garden, ...otherGardens] = tables.gardens;
  if (!garden || otherGardens.length > 0) throw invalidBackup('Le fichier doit contenir un et un seul jardin.');

  apply('Jardin', () => {
    new Validation().required('Name', 'Nom', garden.name, 100).done();
    if (garden.map_layout !== null && !findLayout(garden.map_layout)) {
      throw businessRule(`Le modèle de carte « ${garden.map_layout} » n'existe pas.`);
    }
  });

  const spaces = indexById('espaces', tables.spaces);
  const zones = indexById('zones', tables.zones);
  const items = indexById('éléments', tables.garden_items);
  indexById('entrées du journal', tables.journal_entries);
  indexById('tâches', tables.garden_tasks);
  indexById('emplacements de la carte', tables.garden_map_slots);

  const existingSpace = (spaceId: Id) => {
    const space = spaces.get(spaceId);
    if (!space) throw businessRule(`L'espace ${spaceId} n'existe pas.`);
    return { ...space, kind: space.kind as SpaceKind };
  };

  const existingZoneOf = (zoneId: Id, space: { id: Id; name: string }) => {
    const zone = zones.get(zoneId);
    if (!zone) throw businessRule(`La zone ${zoneId} n'existe pas.`);
    if (zone.space_id !== space.id) throw businessRule(`La zone « ${zone.name} » n'appartient pas à l'espace « ${space.name} ».`);
    return zone;
  };

  const spaceNames = new Set<string>();
  for (const space of tables.spaces) {
    apply(`Espace « ${space.name} »`, () => {
      if (space.garden_id !== garden.id) throw businessRule("L'espace n'appartient pas au jardin du fichier.");
      validateSpace({ name: space.name, kind: space.kind as SpaceKind, description: space.description });
      ensureUnique(spaceNames, space.name, `Un espace nommé « ${space.name} » existe déjà.`);
    });
  }

  const zoneNames = new Set<string>();
  for (const zone of tables.zones) {
    apply(`Zone « ${zone.name} »`, () => {
      existingSpace(zone.space_id);
      validateZone({ name: zone.name, description: zone.description });
      ensureUnique(zoneNames, JSON.stringify([zone.space_id, zone.name]), `Une zone nommée « ${zone.name} » existe déjà dans cet espace.`);
    });
  }

  for (const item of tables.garden_items) {
    apply(itemLabel(item), () => {
      const isPlant = item.item_type === 'Plant';
      if (!isPlant && item.item_type !== 'WoodPile') throw businessRule(`Le type d'élément « ${item.item_type} » n'est pas reconnu.`);

      const space = existingSpace(item.space_id);
      if (!(isPlant ? acceptsPlants : acceptsWoodPiles)(space.kind)) {
        throw businessRule(
          `L'espace « ${space.name} » est un espace ${spaceKindLabel(space.kind)} : ` +
            `il n'accueille pas ${isPlant ? 'de plantes' : 'de tas de bois'}.`,
        );
      }
      if (item.zone_id !== null) existingZoneOf(item.zone_id, space);

      if ((isPlant ? woodPileColumns : plantColumns).some((column) => item[column] !== null)) {
        throw businessRule(`Un élément porte les champs d'un seul type : ${isPlant ? 'une plante' : 'un tas de bois'}.`);
      }

      if (isPlant) {
        // Le service donne 1 pied par défaut ; en base, la quantité et son unité sont toujours là.
        if (item.quantity === null || item.quantity_unit === null) throw businessRule('Une plante a une quantité et son unité.');
        validatePlant({
          name: item.name,
          species: item.species,
          variety: item.variety,
          quantity: item.quantity,
          quantityUnit: item.quantity_unit as QuantityUnit,
          sownDate: item.sown_date,
          plantedDate: item.planted_date,
          spaceId: item.space_id,
          zoneId: item.zone_id,
        });
        ensureQuantityFits(item.quantity_unit as QuantityUnit, item.quantity);
      } else {
        validateWoodPile({
          name: item.name,
          woodSpecies: item.wood_species,
          initialSteres: item.initial_steres as number,
          logLengthCm: item.log_length_cm,
          cutDate: item.cut_date as string,
          dryingMonths: item.drying_months as number,
          spaceId: item.space_id,
          zoneId: item.zone_id,
        });
      }
    });
  }

  /** La cible d'une entrée ou d'une tâche, comme `resolveInterventionTarget` : l'élément emporte sa zone. */
  const checkTarget = (kind: JournalEntryKind, spaceId: Id, zoneId: Id | null, itemId: Id | null) => {
    const space = existingSpace(spaceId);
    if (!isEntryKindAllowedIn(kind, space.kind)) {
      throw businessRule(
        `L'espace « ${space.name} » est un espace ${spaceKindLabel(space.kind)} : ` +
          `il n'accueille pas d'intervention « ${entryKindLabel(kind)} ».`,
      );
    }
    if (zoneId !== null) existingZoneOf(zoneId, space);
    if (itemId === null) return;

    const item = items.get(itemId);
    if (!item) throw businessRule(`L'élément ${itemId} n'existe pas.`);
    if (item.space_id !== spaceId) throw businessRule(`L'élément « ${item.name} » n'est pas dans l'espace « ${space.name} ».`);
    if (item.zone_id !== zoneId) throw businessRule(`L'élément « ${item.name} » n'est pas dans la zone indiquée.`);
  };

  for (const entry of tables.journal_entries) {
    apply(`Entrée du journal du ${entry.date}`, () => {
      const kind = entry.kind as JournalEntryKind;
      const fields = {
        note: optionalText(entry.note),
        quantity: entry.quantity,
        quantityUnit: entry.quantity_unit as MeasureUnit | null,
        heightCm: entry.height_cm,
        problem: optionalText(entry.problem),
        treatment: optionalText(entry.treatment),
      };
      validateEntry({ ...fields, date: entry.date, kind, spaceId: entry.space_id, zoneId: entry.zone_id, itemId: entry.item_id });
      ensureFieldsFitKind(kind, fields);
      checkTarget(kind, entry.space_id, entry.zone_id, entry.item_id);
    });
  }

  for (const pile of tables.garden_items.filter((item) => item.item_type === 'WoodPile')) {
    const movements = tables.journal_entries
      .filter((entry) => entry.item_id === pile.id && isWoodKind(entry.kind as JournalEntryKind))
      .map((entry) => ({ kind: entry.kind as JournalEntryKind, steres: entry.quantity ?? 0 }));
    const stock = remainingSteres(pile.initial_steres as number, movements);
    if (stock < 0) {
      throw invalidBackup(`${itemLabel(pile)} : le journal fait passer son stock sous zéro, à ${stock} stères.`);
    }
  }

  for (const task of tables.garden_tasks) {
    apply(task.title ? `Tâche « ${task.title} »` : `Tâche du ${task.start_date}`, () => {
      const kind = task.kind as JournalEntryKind;
      const recurrence = task.recurrence as TaskRecurrence;
      validateTask({
        kind,
        title: task.title,
        recurrence,
        intervalDays: task.interval_days,
        startDate: task.start_date,
        spaceId: task.space_id,
        zoneId: task.zone_id,
        itemId: task.item_id,
      });
      ensureTaskFields(kind, recurrence, task.interval_days, optionalText(task.title));
      checkTarget(kind, task.space_id, task.zone_id, task.item_id);
    });
  }

  const layout = garden.map_layout === null ? null : findLayout(garden.map_layout)!;
  const usedTargets = new Set<string>();
  const usedKeys = new Set<string>();
  for (const slot of tables.garden_map_slots) {
    apply(`Carte, emplacement « ${slot.slot_key} »`, () => {
      if (slot.garden_id !== garden.id) throw businessRule("L'emplacement n'appartient pas au jardin du fichier.");
      if (!layout) throw businessRule('Sans modèle de carte, aucun emplacement ne peut être affecté.');

      const definition = findSlot(layout, slot.slot_key);
      if (!definition) throw businessRule(`L'emplacement n'existe pas dans le modèle « ${layout.key} ».`);
      ensureUnique(usedKeys, slot.slot_key, "L'emplacement est affecté plusieurs fois.");

      const space = existingSpace(slot.space_id);
      if (space.is_archived) throw businessRule(`L'espace « ${space.name} » est archivé : il n'a pas sa place sur la carte.`);
      if (space.kind !== definition.kind) {
        throw businessRule(
          `L'emplacement n'accepte qu'un espace ${spaceKindLabel(definition.kind)} : ` +
            `« ${space.name} » est un espace ${spaceKindLabel(space.kind)}.`,
        );
      }

      if (!definition.acceptsZone) {
        if (slot.zone_id !== null) throw businessRule("L'emplacement accueille un espace entier, pas une zone.");
      } else {
        if (slot.zone_id === null) throw businessRule(`L'emplacement accueille une zone de l'espace ${spaceKindLabel(definition.kind)}.`);
        existingZoneOf(slot.zone_id, space);
      }

      ensureUnique(
        usedTargets,
        JSON.stringify([slot.space_id, slot.zone_id]),
        `« ${space.name} » est déjà posé sur la carte : un espace ou une zone n'a qu'un emplacement.`,
      );
    });
  }
}
