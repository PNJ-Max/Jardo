import { Pressable, Text, View, useWindowDimensions } from 'react-native';

import { layoutOptions } from '@/lib/garden-map';
import type { DrawnLayout } from '@/map/scenes';
import { createStyles, spacing } from '@/theme';

import { MapPreview } from './map-preview';

const MAX_WIDTH = 480;

/** Choix du modèle de carte, chacun sur son aperçu dessiné. */
export function LayoutChoice({ value, onChange }: { value: DrawnLayout; onChange: (layout: DrawnLayout) => void }) {
  const styles = useStyles();
  const { width: screenWidth } = useWindowDimensions();
  const width = Math.min(MAX_WIDTH, screenWidth - 2 * spacing.md) - 4;
  const height = Math.round(width * 0.5);

  return (
    <View style={styles.list} accessibilityRole="radiogroup" accessibilityLabel="Modèle de carte">
      {layoutOptions.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            aria-selected={selected}
            aria-checked={selected}
            accessibilityLabel={`${option.label}. ${option.hint}`}
            style={({ pressed }) => [styles.tile, selected && styles.tileSelected, pressed && { opacity: 0.8 }]}>
            <View style={styles.preview}>
              <MapPreview layout={option.value} width={width} height={height} />
            </View>
            <View style={styles.caption}>
              <Text style={[styles.label, selected && styles.labelSelected]}>{option.label}</Text>
              <Text style={styles.hint}>{option.hint}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = createStyles(({ colors, fonts, typography, spacing, radius }) => ({
  list: { gap: spacing.sm },
  tile: {
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  tileSelected: { borderColor: colors.primary, backgroundColor: colors.tile },
  preview: { borderTopLeftRadius: radius.lg - 2, borderTopRightRadius: radius.lg - 2, overflow: 'hidden' },
  caption: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 2 },
  label: { ...typography.subtitle, color: colors.text },
  labelSelected: { color: colors.primary },
  hint: { ...typography.caption, color: colors.textMuted },
}));
