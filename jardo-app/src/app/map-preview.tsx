import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { MapViewport } from '@/components/map/map-viewport';
import { ChipSelect } from '@/components/ui';
import type { SlotKey } from '@/map/layouts';
import { terracedLongScene } from '@/map/terraced-long';
import { createStyles, useTheme } from '@/theme';

type Engine = 'svg' | 'skia';

// Dans la carte v1, ce seront les noms des espaces et des zones affectés aux emplacements.
const slotLabels: Record<SlotKey, string> = {
  orchard: 'Verger',
  'small-fruit': 'Petits fruits',
  vegetable: 'Potager',
  'bed-1': 'Carré 1',
  'bed-2': 'Carré 2',
  'bed-3': 'Carré 3',
  'bed-4': 'Carré 4',
  greenhouse: 'Serre',
  firewood: 'Bois de chauffage',
};

const engineOptions: { value: Engine; label: string }[] = [
  { value: 'svg', label: 'SVG' },
  { value: 'skia', label: 'Skia' },
];

/**
 * Aperçu de la carte du jardin, avant qu'elle ne remplace la liste de l'onglet Jardin : la
 * scène du modèle mitoyen, et le choix du moteur de rendu le temps de l'essai technique.
 */
export default function MapPreviewScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const scene = terracedLongScene(theme.scheme);
  const [engine, setEngine] = useState<Engine>('svg');
  const [selected, setSelected] = useState<SlotKey | null>(null);
  const [recenter, setRecenter] = useState(0);

  return (
    <GestureHandlerRootView style={[styles.screen, { backgroundColor: scene.background }]}>
      <View style={styles.toolbar}>
        <View style={styles.engine}>
          <ChipSelect label="Rendu" options={engineOptions} value={engine} onChange={setEngine} />
        </View>
        <Pressable
          onPress={() => setRecenter((n) => n + 1)}
          accessibilityRole="button"
          accessibilityLabel="Recentrer la carte"
          style={({ pressed }) => [styles.round, pressed && { opacity: 0.7 }]}>
          <Ionicons name="scan-outline" size={20} color={theme.colors.primary} />
        </Pressable>
      </View>
      <MapViewport scene={scene} labels={slotLabels} engine={engine} selected={selected} onSelect={setSelected} recenter={recenter} />
      <View style={styles.status} pointerEvents="none">
        <Text style={selected ? styles.key : styles.hint}>
          {selected ?? 'Touchez un emplacement. Pincez pour zoomer.'}
        </Text>
      </View>
    </GestureHandlerRootView>
  );
}

const useStyles = createStyles(({ colors, fonts, typography, spacing }) => ({
  screen: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  engine: { flex: 1 },
  round: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  status: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    alignItems: 'center',
  },
  key: {
    ...typography.body,
    fontFamily: fonts.bodySemiBold,
    color: colors.primaryText,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    overflow: 'hidden',
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    overflow: 'hidden',
  },
}));
