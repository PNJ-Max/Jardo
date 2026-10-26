import { randomUUID } from 'expo-crypto';

import type { DateOnly } from '@/domain/dates';
import { acceptsPlants } from '@/domain/kinds';
import { quantityUnits, type Id, type QuantityUnit } from '@/domain/types';

import type { Clock } from './clock';
import type { Db, SqlValue } from './db';
import { ensureValidPlacement, moveHistory, type Noun } from './item-placement';
import { businessRule, notFound } from './problem';
import { optionalText, Validation } from './validation';

/**
 * Une culture, un arbre ou un arbuste : un sujet seul ou un groupe de sujets identiques suivis
 * ensemble (« 3 pommiers Golden »), au choix de l'utilisateur.
 */
export type Plant = {
  id: Id;
  name: string;
  species: string | null;
  variety: string | null;
  quantity: number;
  quantityUnit: QuantityUnit;
  sownDate: DateOnly | null;
  plantedDate: DateOnly | null;
  isArchived: boolean;
  createdAt: string;
  spaceId: Id;
  spaceName: string;
  zoneId: Id | null;
  zoneName: string | null;
};

/** Changer d'espace ou de zone la déplace ; la zone, facultative, doit appartenir à l'espace. */
export type PlantInput = {
  name: string;
  species?: string | null;
  variety?: string | null;
  /** 1 par défaut. */
  quantity?: number;
  /** `Plants` par défaut. */
  quantityUnit?: QuantityUnit;
  sownDate?: DateOnly | null;
  plantedDate?: DateOnly | null;
  spaceId: Id;
  zoneId?: Id | null;
};

type PlantRow = {
  id: Id;
  name: string;
  species: string | null;
  variety: string | null;
  quantity: number;
  quantity_unit: QuantityUnit;
  sown_date: DateOnly | null;
  planted_date: DateOnly | null;
  is_archived: number;
  created_at: string;
  space_id: Id;
  space_name: string;
  zone_id: Id | null;
  zone_name: string | null;
};

const plantNoun: Noun = { plural: 'de plantes', singular: 'une plante' };

const selectPlants = `
  SELECT p.id, p.name, p.species, p.variety, p.quantity, p.quantity_unit, p.sown_date, p.planted_date,
    p.is_archived, p.created_at, p.space_id, s.name AS space_name, p.zone_id, z.name AS zone_name
  FROM garden_items p
  JOIN spaces s ON s.id = p.space_id
  LEFT JOIN zones z ON z.id = p.zone_id
  WHERE p.item_type = 'Plant'`;

const toPlant = (row: PlantRow): Plant => ({
  id: row.id,
  name: row.name,
  species: row.species,
  variety: row.variety,
  quantity: row.quantity,
  quantityUnit: row.quantity_unit,
  sownDate: row.sown_date,
  plantedDate: row.planted_date,
  isArchived: row.is_archived === 1,
  createdAt: row.created_at,
  spaceId: row.space_id,
  spaceName: row.space_name,
  zoneId: row.zone_id,
  zoneName: row.zone_name,
});

/** On ne compte pas un demi-pied ; un demi-rang ou 1,5 m² ont un sens. */
const acceptsQuantity = (unit: QuantityUnit, quantity: number) =>
  quantity > 0 && (unit !== 'Plants' || Number.isInteger(quantity));

export function ensureQuantityFits(unit: QuantityUnit, quantity: number) {
  if (!acceptsQuantity(unit, quantity)) {
    throw businessRule(`La quantité ${quantity} ne convient pas : elle doit être positive, et un nombre de pieds est entier.`);
  }
}

export function validate(input: PlantInput) {
  new Validation()
    .required('Name', 'Nom', input.name, 100)
    .optional('Species', 'Espèce', input.species, 100)
    .optional('Variety', 'Variété', input.variety, 100)
    .range('Quantity', 'Quantité', input.quantity ?? 1, 0.01, 100000)
    .oneOf('QuantityUnit', 'Unité', input.quantityUnit ?? 'Plants', quantityUnits)
    .date('SownDate', 'Date de semis', input.sownDate)
    .date('PlantedDate', 'Date de plantation', input.plantedDate)
    .id('SpaceId', 'Espace', input.spaceId)
    .id('ZoneId', 'Zone', input.zoneId, { nullable: true })
    .done();
}

/** Les valeurs de `PlantInput`, dans l'ordre des colonnes du nom à la date de plantation. */
function plantParams(input: PlantInput): SqlValue[] {
  const quantity = input.quantity ?? 1;
  const quantityUnit = input.quantityUnit ?? 'Plants';

  ensureQuantityFits(quantityUnit, quantity);

  return [
    input.name.trim(),
    optionalText(input.species),
    optionalText(input.variety),
    quantity,
    quantityUnit,
    input.sownDate ?? null,
    input.plantedDate ?? null,
  ];
}

/** Gestion des plantes (`PlantService`). */
export function createPlantService(db: Db, clock: Clock) {
  async function getById(id: Id): Promise<Plant> {
    const row = await db.first<PlantRow>(`${selectPlants} AND p.id = ?`, [id]);
    if (!row) throw notFound('Plant', id);
    return toPlant(row);
  }

  async function existing(id: Id) {
    const plant = await db.first<{ space_id: Id; zone_id: Id | null }>(
      "SELECT space_id, zone_id FROM garden_items WHERE id = ? AND item_type = 'Plant'",
      [id],
    );
    if (!plant) throw notFound('Plant', id);
    return plant;
  }

  return {
    /** Triées par espace, zone puis nom. Les archivées, et celles des espaces archivés, seulement sur demande. */
    async getAll({
      spaceId,
      zoneId,
      includeArchived = false,
    }: { spaceId?: Id; zoneId?: Id; includeArchived?: boolean } = {}): Promise<Plant[]> {
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

      const rows = await db.all<PlantRow>(`${selectPlants} ${filters.join(' ')} ORDER BY s.name, z.name, p.name`, params);
      return rows.map(toPlant);
    },

    getById,

    async create(input: PlantInput): Promise<Plant> {
      validate(input);
      const id = randomUUID();
      const zoneId = input.zoneId ?? null;

      await db.transaction(async () => {
        await ensureValidPlacement(db, input.spaceId, zoneId, true, acceptsPlants, plantNoun);
        await db.run(
          `INSERT INTO garden_items (id, item_type, space_id, zone_id, created_at,
             name, species, variety, quantity, quantity_unit, sown_date, planted_date)
           VALUES (?, 'Plant', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, input.spaceId, zoneId, clock().toISOString(), ...plantParams(input)],
        );
      });

      return getById(id);
    },

    async update(id: Id, input: PlantInput): Promise<Plant> {
      validate(input);
      const zoneId = input.zoneId ?? null;

      await db.transaction(async () => {
        const plant = await existing(id);
        await ensureValidPlacement(db, input.spaceId, zoneId, input.spaceId !== plant.space_id, acceptsPlants, plantNoun);

        const params = plantParams(input);
        if (plant.space_id !== input.spaceId || plant.zone_id !== zoneId) {
          await moveHistory(db, id, input.spaceId, zoneId);
        }

        await db.run(
          `UPDATE garden_items SET space_id = ?, zone_id = ?,
             name = ?, species = ?, variety = ?, quantity = ?, quantity_unit = ?, sown_date = ?, planted_date = ?
           WHERE id = ?`,
          [input.spaceId, zoneId, ...params, id],
        );
      });

      return getById(id);
    },

    async setArchived(id: Id, isArchived: boolean): Promise<Plant> {
      await db.transaction(async () => {
        await existing(id);
        await db.run('UPDATE garden_items SET is_archived = ? WHERE id = ?', [isArchived ? 1 : 0, id]);
      });

      return getById(id);
    },

    /** Son journal et ses tâches partent avec elle, par les cascades du schéma. */
    async delete(id: Id): Promise<void> {
      await db.transaction(async () => {
        await existing(id);
        await db.run('DELETE FROM garden_items WHERE id = ?', [id]);
      });
    },
  };
}
