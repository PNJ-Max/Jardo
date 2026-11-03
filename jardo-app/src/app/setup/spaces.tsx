import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useSetupGardenMap } from '@/api/queries';
import type { SpaceKind } from '@/api/types';
import { leaveSetup, SetupPage } from '@/components/setup';
import { Button, FormError, Group } from '@/components/ui';
import { SpaceVignette } from '@/components/vignettes/space-vignette';
import { countryHouse } from '@/data/garden-layouts';
import { spaceKindOptions } from '@/lib/garden';
import { setupInput } from '@/lib/garden-map';
import { isDrawn } from '@/map/scenes';
import { createStyles, spacing, useTheme } from '@/theme';

const VIGNETTE_WIDTH = 72;

export default function SetupSpacesScreen() {
  const styles = useStyles();
  const params = useLocalSearchParams<{ layout?: string }>();
  const layout = params.layout && isDrawn(params.layout) ? params.layout : countryHouse;
  const setup = useSetupGardenMap();
  const [kinds, setKinds] = useState<SpaceKind[]>([]);
  const [beds, setBeds] = useState(false);
  const hasVegetableGarden = kinds.includes('VegetableGarden');

  const toggle = (kind: SpaceKind) => {
    setup.reset();
    setKinds((current) => (current.includes(kind) ? current.filter((other) => other !== kind) : [...current, kind]));
  };

  return (
    <SetupPage
      step="Étape 2 sur 2"
      title="Vos espaces"
      intro="Cochez ce que vous avez : chaque espace prend sa place sur la carte. Vous pourrez ensuite en ajouter, en renommer ou en retirer."
      footer={
        <>
          <FormError error={setup.error} />
          <Button
            title={kinds.length > 0 ? 'Créer mon jardin' : 'Afficher la carte'}
            icon="checkmark"
            loading={setup.isPending}
            onPress={() => setup.mutate(setupInput(layout, kinds, hasVegetableGarden && beds), { onSuccess: leaveSetup })}
          />
        </>
      }>
      <Group style={styles.group}>
        {spaceKindOptions.map((option) => (
          <View key={option.value}>
            <CheckRow
              label={option.label}
              checked={kinds.includes(option.value)}
              onPress={() => toggle(option.value)}
              illustration={<SpaceVignette kind={option.value} width={VIGNETTE_WIDTH} height={52} padding={2} />}
            />
            {option.value === 'VegetableGarden' && hasVegetableGarden && (
              <CheckRow
                label="Ajouter quatre carrés"
                hint="Des zones « Carré 1 » à « Carré 4 », dessinées dans le potager."
                checked={beds}
                onPress={() => setBeds(!beds)}
                nested
              />
            )}
          </View>
        ))}
      </Group>
    </SetupPage>
  );
}

type CheckRowProps = {
  label: string;
  hint?: string;
  checked: boolean;
  onPress: () => void;
  illustration?: ReactNode;
  /** Une option de la ligne au-dessus, en retrait sous son texte. */
  nested?: boolean;
};

function CheckRow({ label, hint, checked, onPress, illustration, nested = false }: CheckRowProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      aria-checked={checked}
      accessibilityLabel={label}
      accessibilityHint={hint}
      style={({ pressed }) => [styles.row, nested && styles.nested, pressed && { opacity: 0.7 }]}>
      {illustration}
      <View style={styles.rowText}>
        <Text style={[styles.label, nested && styles.nestedLabel]}>{label}</Text>
        {hint && <Text style={styles.hint}>{hint}</Text>}
      </View>
      <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={26} color={checked ? colors.primary : colors.textMuted} aria-hidden />
    </Pressable>
  );
}

const useStyles = createStyles(({ colors, fonts, typography }) => ({
  group: { marginHorizontal: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  nested: { minHeight: 56, paddingLeft: VIGNETTE_WIDTH + 2 * spacing.md },
  rowText: { flex: 1, gap: 2 },
  label: { ...typography.subtitle, color: colors.text },
  nestedLabel: { ...typography.body, fontFamily: fonts.bodySemiBold },
  hint: { ...typography.caption, color: colors.textMuted },
}));
