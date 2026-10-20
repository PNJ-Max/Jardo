import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';

import type { JournalEntry } from '@/api/types';
import { Card } from '@/components/ui';
import { entryKinds, formatQuantity, measureUnits, targetLabel } from '@/lib/garden';
import { createStyles, useTheme } from '@/theme';

/** Les champs propres au type : quantité, hauteur, problème, traitement. */
function entryDetails(entry: JournalEntry): string[] {
  const details: string[] = [];
  if (entry.quantity !== null && entry.quantityUnit) {
    const sign = entry.kind === 'WoodSupply' ? '+ ' : entry.kind === 'WoodConsumption' ? '− ' : '';
    details.push(`${sign}${formatQuantity(entry.quantity, measureUnits[entry.quantityUnit])}`);
  }
  if (entry.heightCm !== null) details.push(`Hauteur : ${entry.heightCm} cm`);
  if (entry.problem) details.push(`Problème : ${entry.problem}`);
  if (entry.treatment) details.push(`Traitement : ${entry.treatment}`);
  return details;
}

type JournalEntryRowProps = {
  entry: JournalEntry;
  onPress: () => void;
};

export function JournalEntryRow({ entry, onPress }: JournalEntryRowProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const kind = entryKinds[entry.kind];
  const details = entryDetails(entry);

  return (
    <Card onPress={onPress} style={styles.row}>
      <View style={styles.icon}>
        <Ionicons name={kind.icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.body}>
        <Text style={styles.kind}>{kind.label}</Text>
        <Text style={styles.target}>{targetLabel(entry)}</Text>
        {details.length > 0 && <Text style={styles.details}>{details.join(' · ')}</Text>}
        {entry.note && <Text style={styles.note}>{entry.note}</Text>}
      </View>
    </Card>
  );
}

const useStyles = createStyles(({ colors, fonts, typography, spacing }) => ({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.successTint,
  },
  body: { flex: 1, gap: 2 },
  kind: { ...typography.body, fontFamily: fonts.bodySemiBold, color: colors.text },
  target: { ...typography.caption, color: colors.textMuted },
  details: { ...typography.caption, fontFamily: fonts.bodySemiBold, color: colors.text },
  note: { ...typography.body, color: colors.text },
}));
