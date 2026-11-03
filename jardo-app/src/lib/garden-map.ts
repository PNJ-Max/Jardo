import type { Href } from 'expo-router';

import type { GardenMap, GardenMapInput, GardenSetupInput, Id, Space, SpaceKind, Zone } from '@/api/types';
import { gardenLayouts, type MapSlotDefinition } from '@/data/garden-layouts';
import { SLOT_KEYS, type SlotKey } from '@/map/layouts';
import type { DrawnLayout } from '@/map/scenes';

import { spaceKinds } from './garden';

export type OffMapTarget = {
  key: string;
  name: string;
  /** Pour une zone, l'espace qui la contient. */
  spaceName: string | null;
  kind: SpaceKind;
  href: Href;
};

/**
 * Les potagers posés sur la carte : seules leurs zones ont des emplacements (les carrés), donc
 * seules elles peuvent manquer à la carte. Les zones d'un autre espace s'ouvrent depuis lui.
 */
export function mappedVegetableGardens(map: GardenMap): Id[] {
  return map.slots
    .filter((slot) => slot.zoneId === null && slot.spaceKind === 'VegetableGarden')
    .map((slot) => slot.spaceId);
}

/**
 * Ce que la carte ne montre pas : les espaces actifs sans emplacement, puis les zones sans carré
 * d'un potager posé sur la carte. `zones` sont celles de `mappedVegetableGardens`.
 */
export function offMapTargets(map: GardenMap, spaces: Space[], zones: Zone[]): OffMapTarget[] {
  const mappedSpaces = new Set(map.slots.filter((slot) => slot.zoneId === null).map((slot) => slot.spaceId));
  const mappedZones = new Set(map.slots.map((slot) => slot.zoneId));
  const active = spaces.filter((space) => !space.isArchived);
  const spaceById = new Map(active.map((space) => [space.id, space]));

  const offSpaces = active
    .filter((space) => !mappedSpaces.has(space.id))
    .map<OffMapTarget>((space) => ({
      key: `space-${space.id}`,
      name: space.name,
      spaceName: null,
      kind: space.kind,
      href: `/space/${space.id}`,
    }));

  const offZones = zones.flatMap<OffMapTarget>((zone) => {
    const space = spaceById.get(zone.spaceId);
    if (!space || !mappedSpaces.has(space.id) || mappedZones.has(zone.id)) return [];
    return [{ key: `zone-${zone.id}`, name: zone.name, spaceName: space.name, kind: space.kind, href: `/zone/${zone.id}` }];
  });

  return [...offSpaces, ...offZones];
}

/** Au premier lancement, un jardin sans carte ni espace, même archivé, ouvre l'assistant. */
export const needsMapSetup = (map: GardenMap, spaces: Space[]) => map.layout === null && spaces.length === 0;

export const layoutOptions: { value: DrawnLayout; label: string; hint: string }[] = [
  { value: 'country-house', label: 'Maison de campagne', hint: "Au milieu d'un grand terrain" },
  { value: 'terraced-long', label: 'Maison mitoyenne', hint: 'Un jardin tout en longueur' },
];

export const slotLabels: Record<SlotKey, string> = {
  orchard: 'Verger',
  'small-fruit': 'Petits fruits',
  vegetable: 'Potager',
  'bed-1': 'Carré 1 du potager',
  'bed-2': 'Carré 2 du potager',
  'bed-3': 'Carré 3 du potager',
  'bed-4': 'Carré 4 du potager',
  greenhouse: 'Serre',
  firewood: 'Bois de chauffage',
};

// Les deux modèles posent les mêmes emplacements (garden-layouts) : ceux de l'un valent pour l'autre.
const slotDefinitions = gardenLayouts[0].slots as readonly (MapSlotDefinition & { key: SlotKey })[];
const spaceSlots = slotDefinitions.filter((slot) => !slot.acceptsZone);
const zoneSlots = slotDefinitions.filter((slot) => slot.acceptsZone);

/** Les espaces cochés dans l'assistant, chacun sur l'emplacement de son type, avec les quatre carrés du potager si on les veut. */
export function setupInput(layout: DrawnLayout, kinds: SpaceKind[], beds: boolean): GardenSetupInput {
  return {
    layout,
    spaces: spaceSlots
      .filter((slot) => kinds.includes(slot.kind))
      .map((slot) => ({
        slotKey: slot.key,
        name: spaceKinds[slot.kind].label,
        kind: slot.kind,
        zones:
          slot.kind === 'VegetableGarden' && beds
            ? zoneSlots.map((zone, index) => ({ slotKey: zone.key, name: `Carré ${index + 1}` }))
            : undefined,
      })),
  };
}

/** Ce qui occupe chaque emplacement : l'identifiant de l'espace, ou de la zone pour un carré. */
export type Placement = Partial<Record<SlotKey, Id | null>>;

export type SlotChoice = { slot: SlotKey; acceptsZone: boolean; options: { value: Id; label: string }[] };

/** Pour chaque emplacement, ce qu'on peut y poser : les espaces actifs de son type, ou les zones des potagers actifs. */
export function slotChoices(spaces: Space[], zones: Zone[]): SlotChoice[] {
  const active = spaces.filter((space) => !space.isArchived);
  const vegetableGardens = new Map(active.filter((space) => space.kind === 'VegetableGarden').map((space) => [space.id, space]));
  const zoneOptions = zones
    .filter((zone) => vegetableGardens.has(zone.spaceId))
    .map((zone) => ({
      value: zone.id,
      label: vegetableGardens.size > 1 ? `${zone.name} · ${vegetableGardens.get(zone.spaceId)!.name}` : zone.name,
    }));

  return slotDefinitions.map((slot) => ({
    slot: slot.key,
    acceptsZone: slot.acceptsZone,
    options: slot.acceptsZone
      ? zoneOptions
      : active.filter((space) => space.kind === slot.kind).map((space) => ({ value: space.id, label: space.name })),
  }));
}

export const placementOf = (map: GardenMap): Placement =>
  Object.fromEntries(map.slots.map((slot) => [slot.slotKey, slot.zoneId ?? slot.spaceId]));

/**
 * Un premier placement pour un jardin qui n'a pas encore de carte : le premier espace actif de
 * chaque type sur son emplacement, et les premières zones de ce potager sur les carrés.
 */
export function suggestPlacement(spaces: Space[], zones: Zone[]): Placement {
  const placement: Placement = {};
  for (const slot of spaceSlots) {
    const space = spaces.find((candidate) => !candidate.isArchived && candidate.kind === slot.kind);
    if (space) placement[slot.key] = space.id;
  }
  const beds = zones.filter((zone) => zone.spaceId === placement.vegetable);
  zoneSlots.forEach((slot, index) => {
    if (beds[index]) placement[slot.key] = beds[index].id;
  });
  return placement;
}

/** Pose `target` sur `slot`. Une zone n'a qu'un carré : posée sur un autre, elle quitte le précédent. */
export function assignSlot(placement: Placement, slot: SlotKey, target: Id | null): Placement {
  const next: Placement = { ...placement, [slot]: target };
  if (target !== null) {
    for (const key of SLOT_KEYS) if (key !== slot && next[key] === target) next[key] = null;
  }
  return next;
}

/** Le placement tel que l'attend `GardenMapService.replace`. */
export function toMapInput(layout: DrawnLayout, placement: Placement, zones: Zone[]): GardenMapInput {
  const zoneById = new Map(zones.map((zone) => [zone.id, zone]));
  const slots = slotDefinitions.flatMap((slot) => {
    const target = placement[slot.key];
    if (!target) return [];
    if (!slot.acceptsZone) return [{ slotKey: slot.key, spaceId: target }];
    const zone = zoneById.get(target);
    return zone ? [{ slotKey: slot.key, spaceId: zone.spaceId, zoneId: zone.id }] : [];
  });
  return { layout, slots };
}
