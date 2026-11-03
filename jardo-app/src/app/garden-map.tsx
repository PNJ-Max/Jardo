import { useState } from 'react';
import { Text, View } from 'react-native';

import { useGardenMap, useSaveGardenMap, useSpaces, useZonesOf } from '@/api/queries';
import type { GardenMap, Id, Space, Zone } from '@/api/types';
import { LayoutChoice } from '@/components/map/layout-choice';
import { ChipSelect, FormPending, FormScreen, SectionTitle } from '@/components/ui';
import { countryHouse } from '@/data/garden-layouts';
import {
  assignSlot,
  placementOf,
  slotChoices,
  slotLabels,
  suggestPlacement,
  toMapInput,
  type Placement,
} from '@/lib/garden-map';
import { goBack } from '@/lib/navigation';
import { isDrawn, type DrawnLayout } from '@/map/scenes';
import { createStyles } from '@/theme';

const title = 'Carte du jardin';

/** Le modèle de la carte et ce qui occupe chacun de ses emplacements, pour un jardin qui a déjà des espaces. */
export default function GardenMapScreen() {
  const map = useGardenMap();
  const spaces = useSpaces();
  const vegetableGardens = (spaces.data ?? []).filter((space) => space.kind === 'VegetableGarden').map((space) => space.id);
  const zones = useZonesOf(vegetableGardens);

  if (!map.data || !spaces.data) {
    return (
      <FormPending
        title={title}
        error={map.error ?? spaces.error}
        onRetry={() => Promise.all([map.refetch(), spaces.refetch()])}
      />
    );
  }

  return <GardenMapForm map={map.data} spaces={spaces.data} zones={zones} />;
}

function GardenMapForm({ map, spaces, zones }: { map: GardenMap; spaces: Space[]; zones: Zone[] }) {
  const styles = useStyles();
  const save = useSaveGardenMap();
  const [layout, setLayout] = useState<DrawnLayout>(isDrawn(map.layout) ? map.layout : countryHouse);
  // Les zones arrivent après les espaces : tant qu'on n'a rien touché, le placement suit les données.
  const [edited, setEdited] = useState<Placement | null>(null);
  const placement = edited ?? (map.layout === null ? suggestPlacement(spaces, zones) : placementOf(map));
  const choices = slotChoices(spaces, zones);
  const hasZones = choices.some((choice) => choice.acceptsZone && choice.options.length > 0);

  const assign = (choice: (typeof choices)[number], target: Id | '') => {
    save.reset();
    setEdited(assignSlot(placement, choice.slot, target === '' ? null : target));
  };

  return (
    <FormScreen
      title={title}
      submitLabel="Enregistrer la carte"
      loading={save.isPending}
      error={save.error}
      onSubmit={() => save.mutate(toMapInput(layout, placement, zones), { onSuccess: goBack })}>
      <View style={styles.section}>
        <SectionTitle>Modèle</SectionTitle>
        <LayoutChoice value={layout} onChange={setLayout} />
      </View>

      <View style={styles.section}>
        <SectionTitle>Emplacements</SectionTitle>
        <Text style={styles.muted}>
          Chaque emplacement accueille un espace de son type, et les carrés des zones du potager. Ce qui n&apos;est pas
          placé reste dans la bande « Hors carte ».
        </Text>
        {choices
          .filter((choice) => !choice.acceptsZone || hasZones)
          .map((choice) => (
            <ChipSelect
              key={choice.slot}
              label={slotLabels[choice.slot]}
              options={[{ value: '', label: 'Libre' }, ...choice.options]}
              value={placement[choice.slot] ?? ''}
              onChange={(target) => assign(choice, target)}
              hint={choice.options.length === 0 ? "Aucun espace de ce type dans le jardin." : undefined}
            />
          ))}
        {!hasZones && (
          <Text style={styles.muted}>
            Les quatre carrés du potager accueillent ses zones : ajoutez-en à votre potager pour les placer ici.
          </Text>
        )}
      </View>
    </FormScreen>
  );
}

const useStyles = createStyles(({ colors, typography, spacing }) => ({
  section: { gap: spacing.sm },
  muted: { ...typography.body, color: colors.textMuted },
}));
