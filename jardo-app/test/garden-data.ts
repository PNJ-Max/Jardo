import { randomUUID } from 'expo-crypto';

import type { Clock } from '@/data/clock';
import type { SqlValue } from '@/data/db';
import type { DateOnly } from '@/domain/dates';
import type { Id, JournalEntryKind, SpaceKind, TaskRecurrence } from '@/domain/types';

import { createTestDb } from './db';

/** Midi, heure locale, du jour donné : la date du jour reste la même dans tous les fuseaux. */
export const fixedClock = (day: DateOnly): Clock => {
  const [year, month, date] = day.split('-').map(Number);
  return () => new Date(year, month - 1, date, 12);
};

const epoch = '1970-01-01T00:00:00.000Z';

type Space = { id: Id; name: string };
type Zone = { id: Id };
type Item = { id: Id; zoneId: Id | null };

/**
 * Insertions directes en base pour préparer un test, sans passer par les règles des services
 * (`TestData` côté .NET). Le jardin unique existe déjà : la migration le crée.
 */
export async function createGardenFixtures() {
  const db = await createTestDb();
  const garden = (await db.first<{ id: Id }>('SELECT id FROM gardens'))!.id;

  const insert = async (table: string, row: Record<string, SqlValue>): Promise<Id> => {
    const values = { id: randomUUID(), ...row };
    const columns = Object.keys(values);
    await db.run(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
      Object.values(values),
    );
    return values.id;
  };

  return {
    db,
    garden,

    async addSpace(name: string, kind: SpaceKind = 'VegetableGarden', isArchived = false): Promise<Space> {
      const id = await insert('spaces', {
        garden_id: garden,
        name,
        kind,
        is_archived: isArchived ? 1 : 0,
        created_at: epoch,
      });
      return { id, name };
    },

    async addZone(space: Space, name: string): Promise<Zone> {
      return { id: await insert('zones', { space_id: space.id, name, created_at: epoch }) };
    },

    async addPlant(space: Space, zone: Zone | null, name: string, isArchived = false): Promise<Item> {
      const id = await insert('garden_items', {
        item_type: 'Plant',
        space_id: space.id,
        zone_id: zone?.id ?? null,
        name,
        is_archived: isArchived ? 1 : 0,
        quantity: 1,
        quantity_unit: 'Plants',
        created_at: epoch,
      });
      return { id, zoneId: zone?.id ?? null };
    },

    async addWoodPile(space: Space, name: string, isArchived = false): Promise<Item> {
      const id = await insert('garden_items', {
        item_type: 'WoodPile',
        space_id: space.id,
        name,
        is_archived: isArchived ? 1 : 0,
        initial_steres: 10,
        cut_date: '2025-01-01',
        drying_months: 12,
        created_at: epoch,
      });
      return { id, zoneId: null };
    },

    /** Une entrée sur l'élément si donné, sinon sur la zone, sinon sur tout l'espace. */
    async addEntry(kind: JournalEntryKind, date: DateOnly, space: Space, zone: Zone | null = null, item: Item | null = null) {
      return insert('journal_entries', {
        kind,
        date,
        space_id: space.id,
        zone_id: item ? item.zoneId : (zone?.id ?? null),
        item_id: item?.id ?? null,
        created_at: epoch,
      });
    },

    /** Une tâche sur l'élément si donné, sinon sur la zone, sinon sur tout l'espace. */
    async addTask(
      kind: JournalEntryKind,
      recurrence: TaskRecurrence,
      startDate: DateOnly,
      space: Space,
      { zone = null, item = null, intervalDays = null }: { zone?: Zone | null; item?: Item | null; intervalDays?: number | null } = {},
    ) {
      return insert('garden_tasks', {
        kind,
        recurrence,
        start_date: startDate,
        interval_days: intervalDays,
        space_id: space.id,
        zone_id: item ? item.zoneId : (zone?.id ?? null),
        item_id: item?.id ?? null,
        created_at: epoch,
      });
    },

    count: async (table: string, where = '1 = 1', params: SqlValue[] = []) =>
      (await db.first<{ n: number }>(`SELECT count(*) AS n FROM ${table} WHERE ${where}`, params))!.n,
  };
}

export type GardenFixtures = Awaited<ReturnType<typeof createGardenFixtures>>;
