import { Pressable, Text, View } from 'react-native';

import { createStyles } from '@/theme';

type TabsProps<T extends string> = {
  tabs: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
};

/** Onglets en haut d'une fiche : des parts égales de la largeur, soulignées quand actives. */
export function Tabs<T extends string>({ tabs, value, onChange }: TabsProps<T>) {
  const styles = useStyles();

  return (
    <View style={styles.bar} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const selected = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={({ pressed }) => [styles.tab, pressed && { opacity: 0.6 }]}>
            <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
              {tab.label}
            </Text>
            <View style={[styles.indicator, selected && styles.indicatorSelected]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = createStyles(({ colors, fonts, typography, spacing }) => ({
  bar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: spacing.xs },
  label: { ...typography.body, fontFamily: fonts.bodySemiBold, color: colors.textMuted, paddingBottom: spacing.sm },
  labelSelected: { color: colors.primary },
  indicator: { alignSelf: 'stretch', height: 3, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  indicatorSelected: { backgroundColor: colors.primary },
}));
