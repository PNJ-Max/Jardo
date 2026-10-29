import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { UndoProvider } from '@/components/undo';
import { databaseName, initDatabase } from '@/data/database';
import { fromExpo } from '@/data/db';
import { createServices, ServicesProvider } from '@/data/services';
import { fontAssets, loadThemePreference, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

// SQLiteProvider ne rend ses enfants qu'une fois la base ouverte et migrée : l'écran de démarrage
// reste affiché jusque-là.
function HideSplashScreen() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);
  return null;
}

// Une seule instance de Db par connexion : la file des transactions ne protège qu'à cette condition.
function LocalServices({ children }: { children: ReactNode }) {
  const database = useSQLiteContext();
  const services = useMemo(() => createServices(fromExpo(database)), [database]);
  return <ServicesProvider services={services}>{children}</ServicesProvider>;
}

export default function RootLayout() {
  // Créé dans un useState pour qu'il survive aux re-rendus et au rechargement à chaud :
  // recréer le client viderait le cache à chaque fois.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // Une lecture locale qui échoue échouera encore : pas de nouvelle tentative.
          queries: { retry: false },
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

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SQLiteProvider databaseName={databaseName} onInit={initDatabase}>
        <HideSplashScreen />
        <LocalServices>
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
                  {/* La vignette de l'espace tient lieu d'en-tête, avec son propre bouton retour. */}
                  <Stack.Screen name="space/[id]" options={{ title: 'Espace', headerShown: false }} />
                  <Stack.Screen name="zone/[id]" options={{ title: 'Zone' }} />
                  <Stack.Screen name="plant/[id]" options={{ title: 'Plante' }} />
                  <Stack.Screen name="wood-pile/[id]" options={{ title: 'Tas de bois' }} />
                  {/* Les formulaires s'ouvrent en modale : on y entre pour une action, puis on revient. */}
                  <Stack.Screen name="space/form" options={{ presentation: 'modal', title: 'Espace', headerShown: false }} />
                  <Stack.Screen name="zone/form" options={{ presentation: 'modal', title: 'Zone', headerShown: false }} />
                  <Stack.Screen name="plant/form" options={{ presentation: 'modal', title: 'Plante', headerShown: false }} />
                  <Stack.Screen name="wood-pile/form" options={{ presentation: 'modal', title: 'Tas de bois', headerShown: false }} />
                  <Stack.Screen name="entry/form" options={{ presentation: 'modal', title: 'Intervention', headerShown: false }} />
                  <Stack.Screen name="task/form" options={{ presentation: 'modal', title: 'Tâche', headerShown: false }} />
                  <Stack.Screen name="task/done" options={{ presentation: 'modal', title: 'Fait', headerShown: false }} />
                  <Stack.Screen name="settings" options={{ title: 'Réglages' }} />
                </Stack>
              </UndoProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </LocalServices>
      </SQLiteProvider>
    </GestureHandlerRootView>
  );
}
