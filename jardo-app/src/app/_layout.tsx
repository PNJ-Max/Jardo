import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { fontAssets, useTheme } from '@/theme';

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
  const theme = useTheme();

  // En cas d'échec de chargement, l'app démarre quand même avec la police système.
  const ready = fontsLoaded || fontsError !== null;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={theme.navigation}>
        <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerTintColor: theme.colors.primary,
            headerTitleStyle: { color: theme.colors.text, fontFamily: theme.fonts.heading },
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="zone/[id]" options={{ title: 'Zone' }} />
          <Stack.Screen name="plante/[id]" options={{ title: 'Plante' }} />
          {/* Les formulaires s'ouvrent en modale : on y entre pour une action, puis on revient. */}
          <Stack.Screen name="zone/form" options={{ presentation: 'modal', title: 'Zone' }} />
          <Stack.Screen name="plante/form" options={{ presentation: 'modal', title: 'Plante' }} />
          <Stack.Screen name="plante/observation" options={{ presentation: 'modal', title: 'Observation' }} />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
