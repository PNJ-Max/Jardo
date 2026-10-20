import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { UndoProvider } from '@/components/undo';
import { fontAssets, loadThemePreference, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Créé dans un useState pour qu'il survive aux re-rendus et au rechargement à chaud :
  // recréer le client viderait le cache à chaque fois.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // Une seule nouvelle tentative : en local, si l'API est éteinte, on veut le
          // savoir vite plutôt qu'attendre trois essais.
          queries: { retry: 1 },
        },
      }),
  );
  const [fontsLoaded, fontsError] = useFonts(fontAssets);
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);
  const theme = useTheme();

  // En cas d'échec de chargement, l'app démarre quand même avec la police système.
  const ready = (fontsLoaded || fontsError !== null) && preferenceLoaded;

  useEffect(() => {
    loadThemePreference().finally(() => setPreferenceLoaded(true));
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={theme.navigation}>
        <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
        <UndoProvider>
          <Stack
            screenOptions={{
              headerTintColor: theme.colors.primary,
              headerTitleStyle: { color: theme.colors.text, fontFamily: theme.fonts.heading },
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="space/[id]" options={{ title: 'Espace' }} />
            <Stack.Screen name="zone/[id]" options={{ title: 'Zone' }} />
            <Stack.Screen name="plant/[id]" options={{ title: 'Plante' }} />
            <Stack.Screen name="wood-pile/[id]" options={{ title: 'Tas de bois' }} />
            {/* Les formulaires s'ouvrent en modale : on y entre pour une action, puis on revient. */}
            <Stack.Screen name="space/form" options={{ presentation: 'modal', title: 'Espace' }} />
            <Stack.Screen name="zone/form" options={{ presentation: 'modal', title: 'Zone' }} />
            <Stack.Screen name="plant/form" options={{ presentation: 'modal', title: 'Plante' }} />
            <Stack.Screen name="wood-pile/form" options={{ presentation: 'modal', title: 'Tas de bois' }} />
            <Stack.Screen name="entry/form" options={{ presentation: 'modal', title: 'Intervention' }} />
            <Stack.Screen name="task/form" options={{ presentation: 'modal', title: 'Tâche' }} />
            <Stack.Screen name="task/done" options={{ presentation: 'modal', title: 'Fait' }} />
            <Stack.Screen name="settings" options={{ presentation: 'modal', title: 'Réglages' }} />
          </Stack>
        </UndoProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
