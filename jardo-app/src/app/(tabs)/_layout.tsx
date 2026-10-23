import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import { useTheme } from '@/theme';

export default function TabLayout() {
  const { colors, fonts } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontFamily: fonts.bodySemiBold },
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
          tabBarIcon: ({ color, size }) => <Ionicons name="leaf-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="today"
        options={{
          title: "Aujourd'hui",
          tabBarIcon: ({ color, size }) => <Ionicons name="today-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          tabBarIcon: ({ color, size }) => <Ionicons name="journal-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
