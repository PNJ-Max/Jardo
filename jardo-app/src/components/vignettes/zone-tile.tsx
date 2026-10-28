import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View, type DimensionValue } from 'react-native';

import { createStyles, useTheme } from '@/theme';

import { decorPalette } from './scenes';

const SQUARE = 52;

/** Places des plantes dans le carré, en fractions de la terre, selon leur nombre. */
const LAYOUTS: [number, number][][] = [
  [],
  [[0.5, 0.5]],
  [[0.3, 0.3], [0.7, 0.7]],
  [[0.28, 0.3], [0.72, 0.3], [0.5, 0.72]],
  [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  [[0.24, 0.24], [0.76, 0.24], [0.5, 0.5], [0.24, 0.76], [0.76, 0.76]],
  [[0.2, 0.3], [0.5, 0.3], [0.8, 0.3], [0.2, 0.72], [0.5, 0.72], [0.8, 0.72]],
];

type PlantStyle = 'tomato' | 'lettuce' | 'leafy';
const PLANT_STYLES: PlantStyle[] = ['tomato', 'lettuce', 'leafy'];

/** Un style de plantes stable pour une zone donnée, pour que les carrés ne se ressemblent pas tous. */
function plantStyleOf(seed: string): PlantStyle {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return PLANT_STYLES[Math.abs(hash) % PLANT_STYLES.length];
}

const at = (fraction: number, size: number): DimensionValue => `${fraction * 100 - (size / 40) * 50}%`;

/** Un carré de terre vu de dessus, bordé de bois, garni d'autant de plantes que la zone en compte (six au plus). */
function ZoneSquare({ seed, plants }: { seed: string; plants: number }) {
  const { scheme } = useTheme();
  const pal = decorPalette(scheme);
  const styles = useStyles();
  const layout = LAYOUTS[Math.min(plants, LAYOUTS.length - 1)];
  const style = plantStyleOf(seed);
  const size = layout.length > 4 ? 11 : layout.length > 2 ? 14 : layout.length > 1 ? 16 : 18;
  const [leaf, heart] =
    style === 'lettuce' ? [pal.lettuce, pal.leafLight] : style === 'leafy' ? [pal.leaf, pal.leafLight] : [pal.leaf, null];

  return (
    <View style={[styles.square, { backgroundColor: pal.wood, borderColor: pal.woodDark }]}>
      <View style={[styles.soil, { backgroundColor: pal.soilBed }]}>
        {layout.length === 0
          ? [0.3, 0.5, 0.7].map((y) => <View key={y} style={[styles.furrow, { top: `${y * 100}%`, backgroundColor: pal.mulch }]} />)
          : layout.map(([x, y], i) => (
              <View
                key={i}
                style={[styles.plant, { left: at(x, size), top: at(y, size), width: size, height: size, borderRadius: size / 2, backgroundColor: leaf }]}>
                {heart && <View style={[styles.heart, { backgroundColor: heart }]} />}
                {style === 'tomato' && i % 2 === 0 && <View style={[styles.fruit, { backgroundColor: pal.tomato }]} />}
              </View>
            ))}
      </View>
    </View>
  );
}

type ZoneTileProps = { name: string; caption: string; seed: string; plants: number; onPress: () => void };

/** Une zone dans le contenu d'un espace : son carré, son nom et ce qu'elle contient. */
export function ZoneTile({ name, caption, seed, plants, onPress }: ZoneTileProps) {
  const styles = useStyles();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${caption}`}
      style={({ pressed }) => [styles.tile, pressed && { opacity: 0.7 }]}>
      <ZoneSquare seed={seed} plants={plants} />
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>
        <Text style={styles.caption}>{caption}</Text>
      </View>
    </Pressable>
  );
}

/** « Ajouter une zone » : un carré vide en pointillés. */
export function AddZoneTile({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Ajouter une zone"
      style={({ pressed }) => [styles.tile, styles.addTile, pressed && { opacity: 0.7 }]}>
      <View style={[styles.square, styles.addSquare]}>
        <Ionicons name="add" size={24} color={colors.primary} />
      </View>
      <Text style={[styles.name, styles.addLabel]}>Ajouter une zone</Text>
    </Pressable>
  );
}

const useStyles = createStyles(({ colors, fonts, typography, spacing, radius }) => ({
  tile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    padding: 10,
    minHeight: SQUARE + 20,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  square: { width: SQUARE, height: SQUARE, borderRadius: 10, borderWidth: 1, padding: 5 },
  soil: { flex: 1, borderRadius: 6, overflow: 'hidden' },
  furrow: { position: 'absolute', left: '15%', right: '15%', height: 2, borderRadius: 1, opacity: 0.8 },
  plant: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  heart: { width: '45%', height: '45%', borderRadius: 99 },
  fruit: { position: 'absolute', right: 0, bottom: 1, width: 4, height: 4, borderRadius: 2 },
  text: { flex: 1, gap: 1 },
  name: { ...typography.body, fontFamily: fonts.heading, color: colors.text },
  caption: { ...typography.caption, color: colors.textMuted },
  addTile: { backgroundColor: 'transparent', borderWidth: 2, borderStyle: 'dashed', borderColor: colors.leafPale },
  addSquare: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderStyle: 'dashed', borderColor: colors.leafPale },
  addLabel: { flex: 1, color: colors.primary },
}));
