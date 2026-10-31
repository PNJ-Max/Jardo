import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import { usePlaceSearch, useSaveWeatherPlace, useWeatherPlace } from '@/api/weather-queries';
import { WeatherIcon } from '@/components/pictograms';
import { Button, Field, Group, SectionTitle } from '@/components/ui';
import type { TodayWeather, WeatherPlace } from '@/lib/weather';
import { createStyles, useTheme } from '@/theme';

/** Le temps du jour, sous la phrase du ciel : discret, lu d'une traite par le lecteur d'écran. */
export function SkyWeather({ weather }: { weather: TodayWeather }) {
  const styles = useStyles();

  return (
    <View style={styles.sky} accessible accessibilityLabel={weather.spoken}>
      <WeatherIcon kind={weather.kind} size={28} />
      <Text style={styles.skyText}>
        {weather.summary}
        {weather.age && <Text style={styles.age}> · {weather.age}</Text>}
      </Text>
    </View>
  );
}

/** Dans un groupe d'Aujourd'hui, au-dessus de ses arrosages : la pluie tombée ou prévue. */
export function RainNote({ text }: { text: string }) {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <View style={styles.rainNote}>
      <Ionicons name="rainy-outline" size={18} color={colors.water} />
      <Text style={styles.rainNoteText}>{text}</Text>
    </View>
  );
}

const placeDetail = (place: WeatherPlace) => [place.region, place.country].filter(Boolean).join(', ');

/** Réglages : la ville de la météo, choisie par son nom. Pas de GPS, aucune permission de localisation. */
export function WeatherSection() {
  const { colors } = useTheme();
  const styles = useStyles();
  const place = useWeatherPlace();
  const save = useSaveWeatherPlace();
  const search = usePlaceSearch();
  const [name, setName] = useState('');
  const trimmed = name.trim();
  const fieldLabel = place.data ? 'Changer de ville' : 'Ville';

  function choose(chosen: WeatherPlace | null) {
    save.mutate(chosen, {
      onSuccess: () => {
        search.reset();
        setName('');
      },
    });
  }

  return (
    <View style={styles.section}>
      <SectionTitle>Météo</SectionTitle>
      <Text style={styles.muted}>
        Le temps du jour s&apos;affiche sur Aujourd&apos;hui, pour la ville choisie. Sans réseau, la dernière prévision reçue reste
        affichée.
      </Text>

      {place.data && (
        <Group>
          <View style={styles.place}>
            <Ionicons name="location-outline" size={22} color={colors.primary} />
            <View style={styles.placeText}>
              <Text style={styles.placeName}>{place.data.name}</Text>
              {placeDetail(place.data) !== '' && <Text style={styles.muted}>{placeDetail(place.data)}</Text>}
            </View>
            <Button title="Retirer" variant="secondary" loading={save.isPending} onPress={() => choose(null)} />
          </View>
        </Group>
      )}

      <Field
        label={fieldLabel}
        accessibilityLabel={fieldLabel}
        value={name}
        onChangeText={(text) => {
          setName(text);
          search.reset();
        }}
        placeholder="Namur, Lyon, Lausanne…"
        returnKeyType="search"
        autoCorrect={false}
        onSubmitEditing={() => trimmed !== '' && search.mutate(trimmed)}
        maxLength={100}
      />
      <Button
        title="Chercher la ville"
        icon="search"
        variant="secondary"
        disabled={trimmed === ''}
        loading={search.isPending}
        onPress={() => search.mutate(trimmed)}
      />

      {search.error && <Text style={styles.error}>Recherche impossible. Vérifiez la connexion, puis réessayez.</Text>}
      {search.data?.length === 0 && <Text style={styles.muted}>Aucune ville trouvée pour « {search.variables} ».</Text>}
      {search.data && search.data.length > 0 && (
        <Group>
          {search.data.map((result) => (
            <Pressable
              key={`${result.latitude},${result.longitude}`}
              onPress={() => choose(result)}
              disabled={save.isPending}
              accessibilityRole="button"
              accessibilityLabel={[result.name, placeDetail(result)].filter(Boolean).join(', ')}
              style={({ pressed }) => [styles.result, pressed && styles.pressed]}>
              <Text style={styles.placeName}>{result.name}</Text>
              {placeDetail(result) !== '' && <Text style={styles.muted}>{placeDetail(result)}</Text>}
            </Pressable>
          ))}
        </Group>
      )}
      {save.error && <Text style={styles.error}>{save.error.message}</Text>}

      <Text style={styles.credit}>
        Prévisions{' '}
        <Text style={styles.link} accessibilityRole="link" onPress={() => Linking.openURL('https://open-meteo.com/')}>
          Open-Meteo.com
        </Text>{' '}
        (CC BY 4.0), villes GeoNames.
      </Text>
    </View>
  );
}

const useStyles = createStyles(({ colors, fonts, typography, spacing }) => ({
  sky: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  skyText: { ...typography.body, color: colors.textMuted, flexShrink: 1 },
  age: { fontStyle: 'italic' },
  rainNote: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14 },
  rainNoteText: { ...typography.caption, color: colors.water, flex: 1 },
  section: { gap: spacing.sm },
  muted: { ...typography.body, color: colors.textMuted },
  error: { ...typography.body, color: colors.danger },
  place: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14 },
  placeText: { flex: 1 },
  placeName: { ...typography.body, fontFamily: fonts.bodyMedium, color: colors.text },
  result: { paddingVertical: 10, paddingHorizontal: 14, minHeight: 48, justifyContent: 'center' },
  pressed: { backgroundColor: colors.surfaceSunken },
  credit: { ...typography.caption, color: colors.textMuted },
  link: { color: colors.primary, textDecorationLine: 'underline' },
}));
