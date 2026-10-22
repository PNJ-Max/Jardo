import { randomUUID } from 'expo-crypto';

import { spaceKindLabel } from '@/domain/kinds';
import type { Id, SpaceKind } from '@/domain/types';

import type { Db } from './db';
import { findLayout, findSlot } from './garden-layouts';
import { gardenId } from './garden';
import { businessRule } from './problem';
import { optionalText, Validation } from './validation';

/** Un emplacement occupé. Les emplacements libres du modèle n'y figurent pas. */
export type GardenMapSlot = {
  slotKey: string;
  spaceId: Id;
  spaceName: string;
  spaceKind: SpaceKind;
  zoneId: Id | null;
  zoneName: string | null;
};

/** La carte du jardin : de quoi la dessiner en un appel. */
export type GardenMap = {
  /** Clé du modèle de carte. Null tant que la carte n'est pas configurée. */
  layout: string | null;
  slots: GardenMapSlot[];
};

/** L'espace, ou la zone d'un espace, posé sur un emplacement. `zoneId` : obligatoire pour un carré du potager, interdit pour les autres. */
export type GardenMapSlotInput = { slotKey: string; spaceId: Id; zoneId?: Id | null };

/** Le modèle et toutes les affectations. Ce qui n'est pas listé est libéré. */
export type GardenMapInput = {
  /** Clé du modèle, par exemple « terraced-long ». Null pour retirer la carte. */
  layout?: string | null;
  slots: GardenMapSlotInput[];
};

type Assignment = { slotKey: string; spaceId: Id; zoneId: Id | null };

/** La carte du jardin : le modèle de scène choisi et les espaces posés sur ses emplacements (`GardenMapService`). */
export function createGardenMapService(db: Db) {
  async function get(): Promise<GardenMap> {
    const garden = (await db.first<{ map_layout: string | null }>('SELECT map_layout FROM gardens ORDER BY rowid LIMIT 1'))!;

    const slots = await db.all<{
      slot_key: string;
      space_id: Id;
      space_name: string;
      space_kind: SpaceKind;
      zone_id: Id | null;
      zone_name: string | null;
    }>(
      `SELECT m.slot_key, m.space_id, s.name AS space_name, s.kind AS space_kind, m.zone_id, z.name AS zone_name
       FROM garden_map_slots m
       JOIN spaces s ON s.id = m.space_id
       LEFT JOIN zones z ON z.id = m.zone_id
       ORDER BY m.slot_key`,
    );

    return {
      layout: garden.map_layout,
      slots: slots.map((slot) => ({
        slotKey: slot.slot_key,
        spaceId: slot.space_id,
        spaceName: slot.space_name,
        spaceKind: slot.space_kind,
        zoneId: slot.zone_id,
        zoneName: slot.zone_name,
      })),
    };
  }

  async function validateAssignments(layoutKey: string | null, slots: GardenMapSlotInput[]): Promise<Assignment[]> {
    if (layoutKey === null) {
      if (slots.length > 0) throw businessRule('Sans modèle de carte, aucun emplacement ne peut être affecté.');
      return [];
    }

    const layout = findLayout(layoutKey);
    if (!layout) throw businessRule(`Le modèle de carte « ${layoutKey} » n'existe pas.`);

    const assignments: Assignment[] = [];
    const usedKeys = new Set<string>();
    const usedTargets = new Set<string>();

    for (const slot of slots) {
      const slotKey = slot.slotKey.trim();
      const zoneId = slot.zoneId ?? null;

      const definition = findSlot(layout, slotKey);
      if (!definition) throw businessRule(`L'emplacement « ${slotKey} » n'existe pas dans le modèle « ${layout.key} ».`);
      if (usedKeys.has(slotKey)) throw businessRule(`L'emplacement « ${slotKey} » est affecté plusieurs fois.`);
      usedKeys.add(slotKey);

      const space = await db.first<{ id: Id; name: string; kind: SpaceKind; is_archived: number }>(
        'SELECT id, name, kind, is_archived FROM spaces WHERE id = ?',
        [slot.spaceId],
      );
      if (!space) throw businessRule(`L'espace ${slot.spaceId} n'existe pas.`);

      if (space.is_archived) {
        throw businessRule(`L'espace « ${space.name} » est archivé : réactivez-le avant de le placer sur la carte.`);
      }

      if (space.kind !== definition.kind) {
        throw businessRule(
          `L'emplacement « ${slotKey} » n'accepte qu'un espace ${spaceKindLabel(definition.kind)} : ` +
            `« ${space.name} » est un espace ${spaceKindLabel(space.kind)}.`,
        );
      }

      if (!definition.acceptsZone) {
        if (zoneId !== null) throw businessRule(`L'emplacement « ${slotKey} » accueille un espace entier, pas une zone.`);
      } else {
        if (zoneId === null) {
          throw businessRule(`L'emplacement « ${slotKey} » accueille une zone de l'espace ${spaceKindLabel(definition.kind)}.`);
        }

        const zone = await db.first<{ name: string; space_id: Id }>('SELECT name, space_id FROM zones WHERE id = ?', [zoneId]);
        if (!zone) throw businessRule(`La zone ${zoneId} n'existe pas.`);
        if (zone.space_id !== space.id) {
          throw businessRule(`La zone « ${zone.name} » n'appartient pas à l'espace « ${space.name} ».`);
        }
      }

      const target = JSON.stringify([slot.spaceId, zoneId]);
      if (usedTargets.has(target)) {
        throw businessRule(`« ${space.name} » est déjà posé sur la carte : un espace ou une zone n'a qu'un emplacement.`);
      }
      usedTargets.add(target);

      assignments.push({ slotKey, spaceId: slot.spaceId, zoneId });
    }

    return assignments;
  }

  return {
    get,

    /** Remplace le modèle et toutes les affectations, en une transaction : en entier ou pas du tout. */
    async replace(input: GardenMapInput): Promise<GardenMap> {
      const validation = new Validation().optional('Layout', 'Modèle', input.layout, 50);
      input.slots.forEach((slot, index) => {
        validation
          .required(`Slots[${index}].SlotKey`, 'Emplacement', slot.slotKey, 50)
          .id(`Slots[${index}].SpaceId`, 'Espace', slot.spaceId)
          .id(`Slots[${index}].ZoneId`, 'Zone', slot.zoneId, { nullable: true });
      });
      validation.done();

      const layoutKey = optionalText(input.layout);

      await db.transaction(async () => {
        const assignments = await validateAssignments(layoutKey, input.slots);
        const garden = await gardenId(db);

        await db.run('UPDATE gardens SET map_layout = ? WHERE id = ?', [layoutKey, garden]);
        await db.run('DELETE FROM garden_map_slots WHERE garden_id = ?', [garden]);
        for (const { slotKey, spaceId, zoneId } of assignments) {
          await db.run('INSERT INTO garden_map_slots (id, garden_id, slot_key, space_id, zone_id) VALUES (?, ?, ?, ?, ?)', [
            randomUUID(),
            garden,
            slotKey,
            spaceId,
            zoneId,
          ]);
        }
      });

      return get();
    },
  };
}
