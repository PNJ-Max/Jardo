import AsyncStorage from '@react-native-async-storage/async-storage';

import { addDays, type DateOnly } from '@/domain/dates';
import type { Forecast, WeatherPlace } from '@/lib/weather';

/** Le bouchon de `fetch` posé par test/setup.ts : une réponse d'Open-Meteo, en JSON. */
export const respond = (body: unknown, status = 200) => async () => ({ ok: status < 400, status, json: async () => body });

/** Remet le réseau bouchonné hors ligne, sans appel noté. */
export function goOffline() {
  (global.fetch as jest.Mock).mockReset().mockRejectedValue(new Error('Pas de réseau dans les tests.'));
}

/** Une réponse quotidienne d'Open-Meteo sur huit jours depuis `from` : pluie la veille, puis averses. */
export function openMeteoDaily(from: DateOnly) {
  const time = Array.from({ length: 8 }, (_, index) => addDays(from, index));
  return {
    latitude: 50.46,
    longitude: 4.87,
    timezone: 'Europe/Brussels',
    daily_units: { temperature_2m_max: '°C', precipitation_sum: 'mm' },
    daily: {
      time,
      weather_code: [63, 81, 3, 0, 2, 45, 71, 95] as (number | null)[],
      temperature_2m_min: time.map(() => 6),
      temperature_2m_max: time.map(() => 12),
      precipitation_sum: [8.4, 2, 0, 0, 0, 0, 1, 12] as (number | null)[],
    },
  };
}

export const namur: WeatherPlace = { name: 'Namur', region: 'Wallonie', country: 'Belgique', latitude: 50.4669, longitude: 4.86746 };

/** La ville retenue et sa prévision, gardées sur le téléphone comme après une lecture du réseau. */
export async function keepForecast(forecast: Omit<Forecast, 'latitude' | 'longitude'>, place = namur) {
  await AsyncStorage.setItem('jardo.weatherPlace', JSON.stringify(place));
  await AsyncStorage.setItem('jardo.forecast', JSON.stringify({ ...forecast, latitude: place.latitude, longitude: place.longitude }));
}
