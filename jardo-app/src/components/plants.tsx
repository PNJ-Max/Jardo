import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Plant } from '@/api/types';
import { Card } from '@/components/ui';
import { formatDate } from '@/lib/dates';
import { colors, spacing, wateringStyle } from '@/theme';

/**
 * Le voyant d'arrosage. Il affiche tel quel ce que l'API a calculé : le front ne
 * refait jamais le calcul d'échéance, sinon les deux finiraient par diverger.
 */
export function WateringBadge({ plant }: { plant: Plant }) {
  if (plant.isArchived) {
    return <Badge color={colors.textMuted} text="Archivée" />;
  }

  const { color, background } = wateringStyle[plant.wateringStatus];
  const text =
    plant.wateringStatus === 'Overdue'
      ? `En retard de ${plant.daysOverdue} j`
      : plant.wateringStatus === 'DueSoon'
        ? "À arroser aujourd'hui"
        : `Prochain : ${formatDate(plant.nextWateringDate)}`;

  return <Badge color={color} background={background} text={text} />;
}

function Badge({ color, background, text }: { color: string; background?: string; text: string }) {
  return (
    <View style={[styles.badge, { borderColor: color, backgroundColor: background }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.badgeText, { color }]}>{text}</Text>
    </View>
  );
}

type PlantRowProps = {
  plant: Plant;
  /** Affiche le bouton d'arrosage rapide à droite. */
  onWater?: () => void;
  /** Masque le nom de zone, inutile quand on est déjà dans l'écran de la zone. */
  hideZone?: boolean;
};

export function PlantRow({ plant, onWater, hideZone }: PlantRowProps) {
  const subtitle = [plant.species, hideZone ? null : plant.zoneName].filter(Boolean).join(' · ');

  return (
    <Card onPress={() => router.push(`/plante/${plant.id}`)} style={styles.row}>
      <View style={styles.rowBody}>
        <Text style={styles.name}>{plant.name}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <WateringBadge plant={plant} />
      </View>

      {onWater && (
        <Pressable
          onPress={(event) => {
            // Sans ça, sur le web, le clic remonte jusqu'à la carte et ouvre la fiche.
            event.stopPropagation();
            onWater();
          }}
          accessibilityLabel={`Marquer ${plant.name} comme arrosée`}
          hitSlop={8}
          style={({ pressed }) => [styles.waterButton, pressed && { opacity: 0.6 }]}>
          <Ionicons name="water" size={24} color={colors.primaryText} />
        </Pressable>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowBody: { flex: 1, gap: spacing.xs },
  name: { fontSize: 17, fontWeight: '600', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 2,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: { fontSize: 13, fontWeight: '600' },
  waterButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.water,
  },
});
