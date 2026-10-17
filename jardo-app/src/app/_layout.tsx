import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';

import { colors } from '@/theme';

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

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.text },
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="zone/[id]" options={{ title: 'Zone' }} />
        <Stack.Screen name="plante/[id]" options={{ title: 'Plante' }} />
        {/* Les formulaires s'ouvrent en modale : on y entre pour une action, puis on revient. */}
        <Stack.Screen name="zone/form" options={{ presentation: 'modal', title: 'Zone' }} />
        <Stack.Screen name="plante/form" options={{ presentation: 'modal', title: 'Plante' }} />
        <Stack.Screen name="plante/observation" options={{ presentation: 'modal', title: 'Observation' }} />
      </Stack>
    </QueryClientProvider>
  );
}
