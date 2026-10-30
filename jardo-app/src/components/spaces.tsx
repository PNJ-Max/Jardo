import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';

import type { Space } from '@/api/types';
import { ArchivedBadge } from '@/components/items';
import { Badge, Card } from '@/components/ui';
import { SpaceVignette } from '@/components/vignettes/space-vignette';
import { spaceKinds } from '@/lib/garden';
import { createStyles, useTheme } from '@/theme';

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count > 1 ? pluralForm : singular}`;
}

export function SpaceRow({ space, onPress }: { space: Space; onPress: () => void }) {
  const { colors, due } = useTheme();
  const styles = useStyles();
  const kindLabel = spaceKinds[space.kind].label;
  const contents = [
    // « Potager · Potager » n'apprendrait rien : le type ne s'affiche que s'il diffère du nom.
    kindLabel !== space.name ? kindLabel : null,
    space.zoneCount > 0 ? plural(space.zoneCount, 'zone', 'zones') : null,
    plural(space.itemCount, 'élément', 'éléments'),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Card onPress={onPress} style={styles.row}>
      <View style={styles.vignette}>
        <SpaceVignette kind={space.kind} width={72} height={60} padding={4} />
      </View>
      <View style={styles.body}>
        <Text style={styles.name}>{space.name}</Text>
        <Text style={styles.contents}>{contents}</Text>
        {space.isArchived ? (
          <ArchivedBadge />
        ) : space.dueTaskCount > 0 ? (
          <Badge
            {...due.DueSoon}
            icon="calendar-outline"
            text={plural(space.dueTaskCount, 'tâche à faire', 'tâches à faire')}
          />
        ) : (
          <Badge {...due.Ok} icon="checkmark-circle-outline" text="À jour" />
        )}
      </View>
      <Ionicons aria-hidden name="chevron-forward" size={20} color={colors.textMuted} />
    </Card>
  );
}

const useStyles = createStyles(({ colors, typography, spacing, radius }) => ({
  vignette: { borderRadius: radius.md, backgroundColor: colors.tile, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  body: { flex: 1, gap: spacing.xs },
  name: { ...typography.subtitle, color: colors.text },
  contents: { ...typography.caption, color: colors.textMuted },
}));
