import { useZones } from '@/api/queries';
import type { Id } from '@/api/types';
import { ChipSelect } from '@/components/ui';

const noZone = 'none';

/** Choix facultatif de la zone d'un élément, parmi celles de son espace. */
export function ZoneSelect({
  spaceId,
  value,
  onChange,
  error,
}: {
  spaceId: Id;
  value: Id | null;
  onChange: (zoneId: Id | null) => void;
  error?: string;
}) {
  const zones = useZones(spaceId);

  // Un espace sans zone n'a rien à proposer : le champ n'apparaît pas.
  if (!zones.data?.length) return null;

  return (
    <ChipSelect
      label="Zone"
      options={[{ value: noZone, label: 'Aucune' }, ...zones.data.map((zone) => ({ value: zone.id, label: zone.name }))]}
      value={value ?? noZone}
      onChange={(zoneId) => onChange(zoneId === noZone ? null : zoneId)}
      error={error}
    />
  );
}
