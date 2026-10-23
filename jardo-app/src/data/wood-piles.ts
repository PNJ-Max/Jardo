import { randomUUID } from 'expo-crypto';

import type { DateOnly } from '@/domain/dates';
import { acceptsWoodPiles } from '@/domain/kinds';
import type { DryingStatus, Id } from '@/domain/types';
import { drying, remainingSteres } from '@/domain/wood-pile';
import { toDateOnly } from '@/lib/dates';

import type { Clock } from './clock';
import type { Db, SqlValue } from './db';
import { ensureValidPlacement, moveHistory, type Noun } from './item-placement';
import { businessRule, notFound } from './problem';
import { optionalText, Validation } from './validation';
import { loadWoodMovements } from './wood-movements';

/** Un tas de bois tel que l'API le renvoyait, avec son stock et son séchage calculés. */
export type WoodPile = {
  id: Id;
  name: string;
  /** Essence : chêne, hêtre, charme… */
  woodSpecies: string | null;
  /** Volume du tas à sa constitution, en stères. */
  initialSteres: number;
  logLengthCm: number | null;
  cutDate: DateOnly;
  /** Durée de séchage à partir de la coupe, en mois ; 0 pour du bois acheté sec. */
  dryingMonths: number;
  isArchived: boolean;
  createdAt: string;
  spaceId: Id;
  spaceName: string;
  zoneId: Id | null;
  zoneName: string | null;
  /**
   * Stock restant en stères : volume initial, plus les apports, moins les consommations notés au
   * journal sur ce tas. Une entrée notée sur l'espace ou la zone, sans tas, n'y compte pas.
   */
  remainingSteres: number;
  dryingStatus: DryingStatus;
  /** Le jour où le bois est prêt à brûler : à venir si en séchage, passé s'il est prêt depuis. */
  readyOn: DateOnly;
};

/**
 * Changer d'espace ou de zone déplace le tas ; la zone, facultative, doit appartenir à l'espace. Le
 * volume initial ne peut pas descendre sous ce qui a déjà été consommé.
 */
export type WoodPileInput = {
  name: string;
  woodSpecies?: string | null;
  initialSteres: number;
  logLengthCm?: number | null;
  cutDate: DateOnly;
  dryingMonths: number;
  spaceId: Id;
  zoneId?: Id | null;
};

type WoodPileRow = {
  id: Id;
  name: string;
  wood_species: string | null;
  initial_steres: number;
  log_length_cm: number | null;
  cut_date: DateOnly;
  drying_months: number;
  is_archived: number;
  created_at: string;
  space_id: Id;
  space_name: string;
  zone_id: Id | null;
  zone_name: string | null;
};

const woodPileNoun: Noun = { plural: 'de tas de bois', singular: 'un tas de bois' };

const selectPiles = `
  SELECT p.id, p.name, p.wood_species, p.initial_steres, p.log_length_cm, p.cut_date, p.drying_months,
    p.is_archived, p.created_at, p.space_id, s.name AS space_name, p.zone_id, z.name AS zone_name
  FROM garden_items p
  JOIN spaces s ON s.id = p.space_id
  LEFT JOIN zones z ON z.id = p.zone_id
  WHERE p.item_type = 'WoodPile'`;

const validate = (input: WoodPileInput) =>
  new Validation()
    .required('Name', 'Nom', input.name, 100)
    .optional('WoodSpecies', 'Essence', input.woodSpecies, 100)
    .range('InitialSteres', 'Volume initial', input.initialSteres, 0.01, 10000)
    .optionalRange('LogLengthCm', 'Longueur des bûches', input.logLengthCm, 10, 200, { integer: true })
    .date('CutDate', 'Date de coupe', input.cutDate, { required: true })
    .range('DryingMonths', 'Durée de séchage', input.dryingMonths, 0, 60, { integer: true })
    .id('SpaceId', 'Espace', input.spaceId)
    .id('ZoneId', 'Zone', input.zoneId, { nullable: true })
    .done();

/** Les valeurs de `WoodPileInput`, dans l'ordre des colonnes du nom à la durée de séchage. */
const pileParams = (input: WoodPileInput): SqlValue[] => [
  input.name.trim(),
  optionalText(input.woodSpecies),
  input.initialSteres,
  input.logLengthCm ?? null,
  input.cutDate,
  input.dryingMonths,
];

/** Gestion des tas de bois de chauffage (`WoodPileService`). Stock et séchage se calculent à chaque lecture. */
export function createWoodPileService(db: Db, clock: Clock) {
  // Le stock dépend du journal et le séchage du jour : rien de cela n'est en base.
  async function toPiles(rows: readonly WoodPileRow[]): Promise<WoodPile[]> {
    const movements = await loadWoodMovements(
      db,
      rows.map((row) => row.id),
      null,
    );
    const today = toDateOnly(clock());

    return rows.map((row) => {
      const state = drying(row.cut_date, row.drying_months, today);

      return {
        id: row.id,
        name: row.name,
        woodSpecies: row.wood_species,
        initialSteres: row.initial_steres,
        logLengthCm: row.log_length_cm,
        cutDate: row.cut_date,
        dryingMonths: row.drying_months,
        isArchived: row.is_archived === 1,
        createdAt: row.created_at,
        spaceId: row.space_id,
        spaceName: row.space_name,
        zoneId: row.zone_id,
        zoneName: row.zone_name,
        remainingSteres: remainingSteres(row.initial_steres, movements.get(row.id) ?? []),
        dryingStatus: state.status,
        readyOn: state.readyOn,
      };
    });
  }

  async function getById(id: Id): Promise<WoodPile> {
    const row = await db.first<WoodPileRow>(`${selectPiles} AND p.id = ?`, [id]);
    if (!row) throw notFound('WoodPile', id);
    return (await toPiles([row]))[0];
  }

  async function existing(id: Id) {
    const pile = await db.first<{ name: string; space_id: Id; zone_id: Id | null }>(
      "SELECT name, space_id, zone_id FROM garden_items WHERE id = ? AND item_type = 'WoodPile'",
      [id],
    );
    if (!pile) throw notFound('WoodPile', id);
    return pile;
  }

  return {
    /** Triés par espace, zone puis nom. Les archivés, et ceux des espaces archivés, seulement sur demande. */
    async getAll({
      spaceId,
      zoneId,
      includeArchived = false,
    }: { spaceId?: Id; zoneId?: Id; includeArchived?: boolean } = {}): Promise<WoodPile[]> {
      const filters: string[] = [];
      const params: SqlValue[] = [];

      if (spaceId !== undefined) {
        filters.push('AND p.space_id = ?');
        params.push(spaceId);
      }
      if (zoneId !== undefined) {
        filters.push('AND p.zone_id = ?');
        params.push(zoneId);
      }
      if (!includeArchived) filters.push('AND p.is_archived = 0 AND s.is_archived = 0');

      return toPiles(await db.all<WoodPileRow>(`${selectPiles} ${filters.join(' ')} ORDER BY s.name, z.name, p.name`, params));
    },

    getById,

    async create(input: WoodPileInput): Promise<WoodPile> {
      validate(input);
      const id = randomUUID();
      const zoneId = input.zoneId ?? null;

      await db.transaction(async () => {
        await ensureValidPlacement(db, input.spaceId, zoneId, true, acceptsWoodPiles, woodPileNoun);
        await db.run(
          `INSERT INTO garden_items (id, item_type, space_id, zone_id, created_at,
             name, wood_species, initial_steres, log_length_cm, cut_date, drying_months)
           VALUES (?, 'WoodPile', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, input.spaceId, zoneId, clock().toISOString(), ...pileParams(input)],
        );
      });

      return getById(id);
    },

    /**
     * Modifie un tas, et le déplace si l'espace ou la zone change : ses entrées de journal et ses
     * tâches le suivent.
     */
    async update(id: Id, input: WoodPileInput): Promise<WoodPile> {
      validate(input);
      const zoneId = input.zoneId ?? null;

      await db.transaction(async () => {
        const pile = await existing(id);
        await ensureValidPlacement(db, input.spaceId, zoneId, input.spaceId !== pile.space_id, acceptsWoodPiles, woodPileNoun);

        const stock = remainingSteres(input.initialSteres, (await loadWoodMovements(db, [id], null)).get(id) ?? []);
        if (stock < 0) {
          throw businessRule(
            `Un volume initial de ${input.initialSteres} stères est inférieur à ce qui a déjà été ` +
              `consommé : le stock du tas « ${pile.name} » passerait à ${stock} stères.`,
          );
        }

        if (pile.space_id !== input.spaceId || pile.zone_id !== zoneId) {
          await moveHistory(db, id, input.spaceId, zoneId);
        }

        await db.run(
          `UPDATE garden_items SET space_id = ?, zone_id = ?,
             name = ?, wood_species = ?, initial_steres = ?, log_length_cm = ?, cut_date = ?, drying_months = ?
           WHERE id = ?`,
          [input.spaceId, zoneId, ...pileParams(input), id],
        );
      });

      return getById(id);
    },

    /** Un tas archivé sort des tâches dues mais conserve tout son historique. */
    async setArchived(id: Id, isArchived: boolean): Promise<WoodPile> {
      await db.transaction(async () => {
        await existing(id);
        await db.run('UPDATE garden_items SET is_archived = ? WHERE id = ?', [isArchived ? 1 : 0, id]);
      });

      return getById(id);
    },

    /** Son journal et ses tâches partent avec lui, par les cascades du schéma. Pour un tas épuisé, préférer l'archivage. */
    async delete(id: Id): Promise<void> {
      await db.transaction(async () => {
        await existing(id);
        await db.run('DELETE FROM garden_items WHERE id = ?', [id]);
      });
    },
  };
}
