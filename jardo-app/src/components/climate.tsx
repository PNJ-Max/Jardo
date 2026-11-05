import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useGarden, useSaveGardenClimate } from '@/api/queries';
import type { Garden } from '@/api/types';
import { FormError, Group, SectionTitle } from '@/components/ui';
import { climates, referenceClimate } from '@/domain/species';
import { climateChoices, climateNames } from '@/lib/species';
import { createStyles, useTheme } from '@/theme';

/** Réglages : le climat du jardin, qui décide des dates du catalogue. */
export function ClimateSection() {
  const { colors } = useTheme();
  const styles = useStyles();
  const garden = useGarden();

  return (
    <View style={styles.section}>
      <SectionTitle>Climat du jardin</SectionTitle>
      {garden.isPending ? (
        <ActivityIndicator color={colors.primary} />
      ) : garden.error ? (
        <Text style={styles.error}>{garden.error.message}</Text>
      ) : (
        <ClimateChoice garden={garden.data} />
      )}
    </View>
  );
}

function ClimateChoice({ garden }: { garden: Garden }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const save = useSaveGardenClimate();

  return (
    <>
      <Text style={styles.intro}>
        {garden.climate
          ? "Les calendriers et les suggestions d'espèces suivent ce climat."
          : `Choisissez d'après vos dernières gelées. En attendant, les dates sont celles d'un ${climateNames[referenceClimate]}.`}
      </Text>
      <View accessibilityRole="radiogroup" accessibilityLabel="Climat du jardin">
        <Group>
          {climates.map((climate) => {
            const { label, frost, regions } = climateChoices[climate];
            const selected = climate === garden.climate;
            return (
              <Pressable
                key={climate}
                onPress={() => save.mutate(climate)}
                accessibilityRole="radio"
                aria-selected={selected}
                aria-checked={selected}
                accessibilityLabel={`${label}. ${frost}. ${regions}.`}
                style={({ pressed }) => [styles.row, selected && styles.rowSelected, pressed && { opacity: 0.7 }]}>
                <Ionicons
                  aria-hidden
                  name={selected ? 'radio-button-on' : 'radio-button-off'}
                  size={22}
                  color={selected ? colors.primary : colors.textMuted}
                />
                <View style={styles.rowText}>
                  <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
                  <Text style={styles.detail}>{frost}</Text>
                  <Text style={styles.detail}>{regions}</Text>
                </View>
              </Pressable>
            );
          })}
        </Group>
      </View>
      <FormError error={save.error} />
    </>
  );
}

const useStyles = createStyles(({ colors, typography, spacing }) => ({
  section: { gap: spacing.sm },
  error: { ...typography.body, color: colors.danger },
  intro: { ...typography.body, color: colors.textMuted },
  row: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.sm + 4, paddingVertical: spacing.sm },
  rowSelected: { backgroundColor: colors.tile },
  rowText: { flex: 1, gap: 2 },
  label: { ...typography.subtitle, color: colors.text },
  labelSelected: { color: colors.primary },
  detail: { ...typography.caption, color: colors.textMuted },
}));
