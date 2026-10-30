import { Tabs } from 'expo-router';

import { TabIcon } from '@/components/pictograms';
import { useTheme } from '@/theme';

export default function TabLayout() {
  const { colors, fonts } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontFamily: fonts.bodySemiBold },
        // La barre a une hauteur fixe : un libellé agrandi y serait rogné.
        tabBarAllowFontScaling: false,
        // Les fonds viennent aussi du thème : celui du ThemeProvider n'est pas relu par les onglets
        // quand on change de thème en cours de route, et le titre devenait illisible.
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { color: colors.text, fontFamily: fonts.heading },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Jardin',
          tabBarIcon: ({ focused }) => <TabIcon name="garden" focused={focused} size={28} />,
        }}
      />
      <Tabs.Screen
        name="today"
        options={{
          title: "Aujourd'hui",
          // Le ciel du jour tient lieu d'en-tête.
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon name="today" focused={focused} size={28} />,
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          tabBarIcon: ({ focused }) => <TabIcon name="journal" focused={focused} size={28} />,
        }}
      />
    </Tabs>
  );
}
