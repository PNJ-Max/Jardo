import type { Href } from 'expo-router';

import type { GardenMap, Id, Space, SpaceKind, Zone } from '@/api/types';

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
