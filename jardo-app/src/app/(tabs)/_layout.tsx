import { router, Tabs, useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';

import { useGardenMap, useSpaces } from '@/api/queries';
import { TabIcon } from '@/components/pictograms';
import { needsMapSetup } from '@/lib/garden-map';
import { useTheme } from '@/theme';

type Stage = 'deciding' | 'setup' | 'inSetup' | 'tabs';

/**
 * Au lancement, un jardin vide ouvre l'assistant de la carte par-dessus les onglets. On décide une
 * seule fois, et les onglets ne se montent qu'au retour de l'assistant : la liste vide ne
 * transparaît ni avant ni pendant son fondu. Passé, l'assistant ne revient qu'au prochain lancement.
 */
function useFirstLaunchSetup(): boolean {
  const map = useGardenMap();
  const spaces = useSpaces(true);
  const focused = useIsFocused();
  const [stage, setStage] = useState<Stage>('deciding');

  if (stage === 'deciding' && !map.isPending && !spaces.isPending) {
    setStage(map.data && spaces.data && needsMapSetup(map.data, spaces.data) ? 'setup' : 'tabs');
  } else if (stage === 'setup' && !focused) {
    setStage('inSetup');
  } else if (stage === 'inSetup' && focused) {
    setStage('tabs');
  }

  useEffect(() => {
    if (stage === 'setup') router.push('/setup');
  }, [stage]);

  return stage === 'tabs';
}

export default function TabLayout() {
  const { colors, fonts } = useTheme();
  const ready = useFirstLaunchSetup();

  if (!ready) return null;

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
