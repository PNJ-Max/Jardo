import { useZones } from '@/api/queries';
import { ChipSelect } from '@/components/ui';

const noZone = 0;

/** Choix facultatif de la zone d'un élément, parmi celles de son espace. */
export function ZoneSelect({
  spaceId,
  value,
  onChange,
  error,
}: {
  spaceId: number;
  value: number | null;
  onChange: (zoneId: number | null) => void;
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
