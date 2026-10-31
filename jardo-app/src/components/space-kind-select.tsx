import { Pressable, Text, View, useWindowDimensions } from 'react-native';

import type { SpaceKind } from '@/api/types';
import { FieldMessage, useFieldStyles } from '@/components/ui/form';
import { SpaceVignette } from '@/components/vignettes/space-vignette';
import { spaceKindOptions } from '@/lib/garden';
import { createStyles, spacing } from '@/theme';

const COLUMNS = 3;
const MAX_WIDTH = 150;

/** Choix du type d'un espace sur la scène de chacun des cinq types. */
export function SpaceKindSelect({
  value,
  onChange,
  error,
}: {
  value: SpaceKind | undefined;
  onChange: (kind: SpaceKind) => void;
  error?: string;
}) {
  const fieldStyles = useFieldStyles();
  const styles = useStyles();
  const { width: screenWidth } = useWindowDimensions();
  const gaps = (COLUMNS - 1) * spacing.sm;
  const width = Math.min(MAX_WIDTH, Math.floor((screenWidth - 2 * spacing.md - gaps) / COLUMNS));

  return (
    <View style={fieldStyles.field}>
      <Text style={fieldStyles.label}>Type</Text>
      <View style={styles.grid} accessibilityRole="radiogroup" accessibilityLabel="Type">
        {spaceKindOptions.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              accessibilityRole="radio"
              aria-selected={selected}
              aria-checked={selected}
              accessibilityLabel={option.label}
              style={({ pressed }) => [styles.tile, { width }, selected && styles.tileSelected, pressed && { opacity: 0.7 }]}>
              <SpaceVignette kind={option.value} width={width - 8} height={Math.round(width * 0.7)} padding={2} />
              <Text style={[styles.label, selected && styles.labelSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <FieldMessage error={error} />
    </View>
  );
}

const useStyles = createStyles(({ colors, fonts, typography, spacing, radius }) => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: 2,
    paddingBottom: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.surfaceSunken,
  },
  tileSelected: { backgroundColor: colors.tile, borderColor: colors.primary },
  label: { ...typography.caption, color: colors.text, textAlign: 'center', paddingHorizontal: spacing.xs },
  labelSelected: { fontFamily: fonts.bodySemiBold, color: colors.primary },
}));
