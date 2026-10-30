import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';

import type { Plant, WoodPile } from '@/api/types';
import { Badge, Card } from '@/components/ui';
import { formatDate } from '@/lib/dates';
import { formatQuantity, quantityUnits, steres } from '@/lib/garden';
import { createStyles, useTheme } from '@/theme';

export function DryingBadge({ pile }: { pile: WoodPile }) {
  const { colors, due } = useTheme();

  return pile.dryingStatus === 'Ready' ? (
    <Badge {...due.Ok} icon="flame-outline" text={`Prêt à brûler depuis le ${formatDate(pile.readyOn)}`} />
  ) : (
    <Badge color={colors.textMuted} icon="hourglass-outline" text={`En séchage jusqu'au ${formatDate(pile.readyOn)}`} />
  );
}

export function ArchivedBadge() {
  const { colors } = useTheme();
  return <Badge color={colors.textMuted} icon="archive-outline" text="Archivé" />;
}

export const plantQuantity = (plant: Plant) => formatQuantity(plant.quantity, quantityUnits[plant.quantityUnit]);

export function PlantRow({ plant, onPress }: { plant: Plant; onPress: () => void }) {
  const styles = useStyles();
  const subtitle = [plant.species, plant.variety, plantQuantity(plant)].filter(Boolean).join(' · ');

  return (
    <Card onPress={onPress} style={styles.row}>
      <View style={styles.body}>
        <Text style={styles.name}>{plant.name}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {plant.isArchived && <ArchivedBadge />}
      </View>
      <Chevron />
    </Card>
  );
}

export function WoodPileRow({ pile, onPress }: { pile: WoodPile; onPress: () => void }) {
  const styles = useStyles();
  const subtitle = [pile.woodSpecies, `Reste ${steres(pile.remainingSteres)}`].filter(Boolean).join(' · ');

  return (
    <Card onPress={onPress} style={styles.row}>
      <View style={styles.body}>
        <Text style={styles.name}>{pile.name}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {pile.isArchived ? <ArchivedBadge /> : <DryingBadge pile={pile} />}
      </View>
      <Chevron />
    </Card>
  );
}

export function Chevron() {
  const { colors } = useTheme();
  return <Ionicons aria-hidden name="chevron-forward" size={20} color={colors.textMuted} />;
}

const useStyles = createStyles(({ colors, fonts, typography, spacing }) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  body: { flex: 1, gap: spacing.xs },
  name: { ...typography.body, fontFamily: fonts.bodySemiBold, color: colors.text },
  subtitle: { ...typography.caption, color: colors.textMuted },
}));
