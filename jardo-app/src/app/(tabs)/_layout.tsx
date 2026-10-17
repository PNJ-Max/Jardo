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
        headerTitleStyle: { color: colors.text, fontFamily: fonts.heading },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'À arroser',
          tabBarIcon: ({ color, size }) => <Ionicons name="water" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="zones"
        options={{
          title: 'Zones',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="plantes"
        options={{
          title: 'Plantes',
          tabBarIcon: ({ color, size }) => <Ionicons name="leaf" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
