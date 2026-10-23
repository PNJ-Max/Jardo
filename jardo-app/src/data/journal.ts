import { randomUUID } from 'expo-crypto';

import type { DateOnly } from '@/domain/dates';
import { acceptsQuantity, entryKindLabel, isWoodKind } from '@/domain/kinds';
import {
  journalEntryKinds,
  measureUnits,
  type Id,
  type ItemKind,
  type JournalEntryKind,
  type MeasureUnit,
} from '@/domain/types';
import { remainingSteres, type WoodMovement } from '@/domain/wood-pile';
import { toDateOnly } from '@/lib/dates';

import type { Clock } from './clock';
import type { Db, SqlValue } from './db';
import {
  resolveInterventionTarget,
  targetCondition,
  type InterventionTarget,
  type TargetNames,
} from './intervention-target';
import { businessRule, notFound } from './problem';
import { optionalText, Validation } from './validation';
import { loadWoodMovements } from './wood-movements';

/** Une entrée du journal telle que l'API la renvoyait, avec le nom de sa cible. */
export type JournalEntry = {
  id: Id;
  date: DateOnly;
  kind: JournalEntryKind;
  note: string | null;
  quantity: number | null;
  quantityUnit: MeasureUnit | null;
  heightCm: number | null;
  problem: string | null;
  treatment: string | null;
  createdAt: string;
  spaceId: Id;
  spaceName: string;
  zoneId: Id | null;
  zoneName: string | null;
  /** Null pour une entrée sur une zone ou sur tout l'espace. */
  itemId: Id | null;
  itemName: string | null;
  /** Null sans élément visé. */
  itemKind: ItemKind | null;
};

/**
 * Pour noter ou corriger une intervention. La cible est un espace, et éventuellement une de ses
 * zones ou un de ses éléments. Les champs facultatifs dépendent du type : quantité pour la récolte
 * et le bois, hauteur pour l'observation, problème et traitement pour l'observation et le traitement.
 */
export type JournalEntryInput = {
  /** Une date future est refusée. */
  date: DateOnly;
  kind: JournalEntryKind;
  note?: string | null;
  quantity?: number | null;
  quantityUnit?: MeasureUnit | null;
  heightCm?: number | null;
  problem?: string | null;
  treatment?: string | null;
  spaceId: Id;
  zoneId?: Id | null;
  /** Si l'élément est dans une zone, l'entrée la prend d'office. */
  itemId?: Id | null;
};

type JournalRow = TargetNames & {
  id: Id;
  date: DateOnly;
  kind: JournalEntryKind;
  note: string | null;
  quantity: number | null;
  quantity_unit: MeasureUnit | null;
  height_cm: number | null;
  problem: string | null;
  treatment: string | null;
  created_at: string;
  space_id: Id;
  zone_id: Id | null;
  item_id: Id | null;
};

const selectEntries = `
  SELECT e.id, e.date, e.kind, e.note, e.quantity, e.quantity_unit, e.height_cm, e.problem, e.treatment,
    e.created_at, e.space_id, s.name AS space_name, e.zone_id, z.name AS zone_name,
    e.item_id, i.name AS item_name, i.item_type
  FROM journal_entries e
  JOIN spaces s ON s.id = e.space_id
  LEFT JOIN zones z ON z.id = e.zone_id
  LEFT JOIN garden_items i ON i.id = e.item_id`;

const toEntry = (row: JournalRow): JournalEntry => ({
  id: row.id,
  date: row.date,
  kind: row.kind,
  note: row.note,
  quantity: row.quantity,
  quantityUnit: row.quantity_unit,
  heightCm: row.height_cm,
  problem: row.problem,
  treatment: row.treatment,
  createdAt: row.created_at,
  spaceId: row.space_id,
  spaceName: row.space_name,
  zoneId: row.zone_id,
  zoneName: row.zone_name,
  itemId: row.item_id,
  itemName: row.item_name,
  itemKind: row.item_type,
});

function validate(input: JournalEntryInput) {
  new Validation()
    .date('Date', 'Date', input.date, { required: true })
    .oneOf('Kind', 'Type', input.kind, journalEntryKinds)
    .optional('Note', 'Note', input.note, 1000)
    .optionalRange('Quantity', 'Quantité', input.quantity, 0.001, 100000)
    .optionalOneOf('QuantityUnit', 'Unité', input.quantityUnit, measureUnits)
    .optionalRange('HeightCm', 'Hauteur', input.heightCm, 0, 1000, { integer: true })
    .optional('Problem', 'Problème', input.problem, 500)
    .optional('Treatment', 'Traitement', input.treatment, 500)
    .id('SpaceId', 'Espace', input.spaceId)
    .id('ZoneId', 'Zone', input.zoneId, { nullable: true })
    .id('ItemId', 'Élément', input.itemId, { nullable: true })
    .done();
}

type Fields = {
  note: string | null;
  quantity: number | null;
  quantityUnit: MeasureUnit | null;
  heightCm: number | null;
  problem: string | null;
  treatment: string | null;
};

function ensureFieldsFitKind(kind: JournalEntryKind, { note, quantity, quantityUnit, heightCm, problem, treatment }: Fields) {
  const label = entryKindLabel(kind);

  if ((quantity !== null) !== (quantityUnit !== null)) {
    throw businessRule('Une quantité se note avec son unité, et une unité avec sa quantité.');
  }
  if (quantity !== null && !acceptsQuantity(kind)) {
    throw businessRule(`Une entrée « ${label} » ne porte pas de quantité : seuls la récolte et le bois en ont une.`);
  }
  if (isWoodKind(kind) && quantityUnit !== 'Steres') {
    throw businessRule(`Une entrée « ${label} » se note avec un volume en stères.`);
  }
  if (kind === 'Harvest' && quantityUnit === 'Steres') {
    throw businessRule('Une récolte se compte en kilos, en grammes ou à la pièce, pas en stères.');
  }
  if (heightCm !== null && kind !== 'Observation') {
    throw businessRule('Une hauteur se note avec une observation.');
  }
  if ((problem !== null || treatment !== null) && kind !== 'Observation' && kind !== 'Treatment') {
    throw businessRule('Un problème constaté ou un traitement appliqué se note avec une observation ou un traitement.');
  }
  if (kind === 'Observation' && note === null && heightCm === null && problem === null) {
    throw businessRule('Une observation porte au moins une note, une hauteur ou un problème constaté.');
  }
  if (kind === 'Other' && note === null) {
    throw businessRule("Une entrée « autre » a besoin d'une note pour dire ce qui a été fait.");
  }
}

/**
 * Le stock d'un tas se calcule à partir du journal, jamais stocké : le refus d'une consommation
 * qui le ferait passer sous zéro se joue donc à l'écriture. On recompte sans l'entrée visée et on y
 * substitue sa nouvelle valeur. À appeler dans la transaction de l'écriture : c'est elle qui rend
 * la vérification et l'écriture indivisibles.
 */
async function ensureWoodStockStaysPositive(
  db: Db,
  itemIds: readonly (Id | null)[],
  pending: { itemId: Id; movement: WoodMovement } | null,
  excludedEntryId: Id | null,
) {
  const candidateIds = [...new Set(itemIds.filter((id): id is Id => id !== null))];
  if (candidateIds.length === 0) return;

  const piles = await db.all<{ id: Id; name: string; initial_steres: number }>(
    `SELECT id, name, initial_steres FROM garden_items
     WHERE item_type = 'WoodPile' AND id IN (${candidateIds.map(() => '?').join(', ')})`,
    candidateIds,
  );
  if (piles.length === 0) return;

  const movements = await loadWoodMovements(
    db,
    piles.map((pile) => pile.id),
    excludedEntryId,
  );

  for (const pile of piles) {
    const pileMovements = [...(movements.get(pile.id) ?? [])];
    if (pending?.itemId === pile.id) pileMovements.push(pending.movement);

    const stock = remainingSteres(pile.initial_steres, pileMovements);
    if (stock < 0) {
      throw businessRule(
        `Le stock du tas « ${pile.name} » ne peut pas passer sous zéro : ` +
          `cette opération le ferait passer à ${stock} stères.`,
      );
    }
  }
}

type Prepared = Fields & { date: DateOnly; kind: JournalEntryKind; target: InterventionTarget };

/**
 * Toutes les règles d'une entrée avant son écriture : validation, date, champs du type, cible,
 * stock de bois. À appeler dans la transaction de l'écriture.
 *
 * @param existing L'entrée corrigée, null pour une création.
 */
async function prepare(
  db: Db,
  clock: Clock,
  input: JournalEntryInput,
  existing: { id: Id; kind: JournalEntryKind; space_id: Id; zone_id: Id | null; item_id: Id | null } | null,
): Promise<Prepared> {
  const { kind, date } = input;

  // Une date future ferait passer une tâche pour faite avant qu'elle le soit, et masquerait
  // une plante de la liste « à arroser ». Le passé est accepté : saisie tardive.
  if (date > toDateOnly(clock())) {
    throw businessRule(`La date ${date} est dans le futur : le journal ne note que ce qui a été fait.`);
  }

  const fields: Fields = {
    note: optionalText(input.note),
    quantity: input.quantity ?? null,
    quantityUnit: input.quantityUnit ?? null,
    heightCm: input.heightCm ?? null,
    problem: optionalText(input.problem),
    treatment: optionalText(input.treatment),
  };
  ensureFieldsFitKind(kind, fields);

  const previousWoodItemId = existing && isWoodKind(existing.kind) ? existing.item_id : null;
  const target = await resolveInterventionTarget(
    db,
    { spaceId: input.spaceId, zoneId: input.zoneId ?? null, itemId: input.itemId ?? null },
    kind,
    existing && { spaceId: existing.space_id, zoneId: existing.zone_id, itemId: existing.item_id },
    'noter une intervention',
  );

  // Avant d'écrire : l'entrée change de tas, de type ou de volume, ce qui peut vider un tas
  // autant que remplir un autre.
  if (isWoodKind(kind) || previousWoodItemId !== null) {
    await ensureWoodStockStaysPositive(
      db,
      [previousWoodItemId, target.itemId],
      isWoodKind(kind) && target.itemId !== null
        ? { itemId: target.itemId, movement: { kind, steres: fields.quantity! } }
        : null,
      existing?.id ?? null,
    );
  }

  return { ...fields, date, kind, target };
}

/**
 * Valide et insère une entrée. Hors transaction : l'appelant l'ouvre, pour que « Fait » lise sa
 * tâche et note l'entrée d'un seul tenant.
 */
export async function insertJournalEntry(db: Db, clock: Clock, input: JournalEntryInput): Promise<Id> {
  validate(input);
  const entry = await prepare(db, clock, input, null);
  const id = randomUUID();

  await db.run(
    `INSERT INTO journal_entries (id, kind, date, space_id, zone_id, item_id, note, quantity, quantity_unit,
       height_cm, problem, treatment, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      entry.kind,
      entry.date,
      entry.target.spaceId,
      entry.target.zoneId,
      entry.target.itemId,
      entry.note,
      entry.quantity,
      entry.quantityUnit,
      entry.heightCm,
      entry.problem,
      entry.treatment,
      clock().toISOString(),
    ],
  );
  return id;
}

/** Le journal d'interventions (`JournalService`). */
export function createJournalService(db: Db, clock: Clock) {
  async function getById(id: Id): Promise<JournalEntry> {
    const row = await db.first<JournalRow>(`${selectEntries} WHERE e.id = ?`, [id]);
    if (!row) throw notFound('JournalEntry', id);
    return toEntry(row);
  }

  async function existing(id: Id) {
    const entry = await db.first<{ id: Id; kind: JournalEntryKind; space_id: Id; zone_id: Id | null; item_id: Id | null }>(
      'SELECT id, kind, space_id, zone_id, item_id FROM journal_entries WHERE id = ?',
      [id],
    );
    if (!entry) throw notFound('JournalEntry', id);
    return entry;
  }

  return {
    /**
     * Du plus récent au plus ancien. Sans cible, tout le jardin. Pour une cible, ce qui la
     * concerne : ses entrées, celles de ce qu'elle contient, et celles notées sur la zone ou
     * l'espace qui la contient.
     */
    async getAll({
      spaceId,
      zoneId,
      itemId,
      kinds,
    }: { spaceId?: Id | null; zoneId?: Id | null; itemId?: Id | null; kinds?: readonly JournalEntryKind[] } = {}): Promise<
      JournalEntry[]
    > {
      const condition = await targetCondition(
        db,
        'e',
        { spaceId, zoneId, itemId },
        'Le journal se lit pour une seule cible à la fois : un espace, une zone ou un élément.',
      );

      const filters: string[] = [];
      const params: SqlValue[] = [];
      if (condition) {
        filters.push(condition.sql);
        params.push(...condition.params);
      }
      if (kinds && kinds.length > 0) {
        filters.push(`e.kind IN (${kinds.map(() => '?').join(', ')})`);
        params.push(...kinds);
      }

      // Le rowid, ordre d'insertion, départage les entrées d'un même jour.
      const rows = await db.all<JournalRow>(
        `${selectEntries} ${filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : ''} ORDER BY e.date DESC, e.rowid DESC`,
        params,
      );
      return rows.map(toEntry);
    },

    getById,

    async create(input: JournalEntryInput): Promise<JournalEntry> {
      const id = await db.transaction(() => insertJournalEntry(db, clock, input));
      return getById(id);
    },

    /** Corrige une entrée, cible comprise. Une entrée d'un élément ou d'un espace archivé reste corrigeable. */
    async update(id: Id, input: JournalEntryInput): Promise<JournalEntry> {
      validate(input);

      await db.transaction(async () => {
        const current = await existing(id);
        const entry = await prepare(db, clock, input, current);

        await db.run(
          `UPDATE journal_entries SET kind = ?, date = ?, space_id = ?, zone_id = ?, item_id = ?, note = ?,
             quantity = ?, quantity_unit = ?, height_cm = ?, problem = ?, treatment = ?
           WHERE id = ?`,
          [
            entry.kind,
            entry.date,
            entry.target.spaceId,
            entry.target.zoneId,
            entry.target.itemId,
            entry.note,
            entry.quantity,
            entry.quantityUnit,
            entry.heightCm,
            entry.problem,
            entry.treatment,
            id,
          ],
        );
      });

      return getById(id);
    },

    async delete(id: Id): Promise<void> {
      await db.transaction(async () => {
        const entry = await existing(id);

        // Supprimer un apport peut laisser un stock que les consommations dépassent.
        if (isWoodKind(entry.kind)) await ensureWoodStockStaysPositive(db, [entry.item_id], null, id);

        await db.run('DELETE FROM journal_entries WHERE id = ?', [id]);
      });
    },
  };
}
