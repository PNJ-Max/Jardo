import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Clock } from '@/data/clock';

import { toDateOnly } from './dates';
import type { DayForecast, Forecast, WeatherPlace } from './weather';

// La ville et la dernière prévision sont des préférences de l'appareil, comme le thème : rangées
// dans AsyncStorage, hors de la base et de la sauvegarde du jardin. L'app marche sans réseau : la
// prévision gardée s'affiche, et le réseau n'est appelé qu'au plus toutes les trois heures.

const placeKey = 'jardo.weatherPlace';
const forecastKey = 'jardo.forecast';

/** Au plus une lecture du réseau par période, et toujours une le jour venu : la pluie de la veille change. */
export const refreshAfterMs = 3 * 3_600_000;

const geocodingUrl = 'https://geocoding-api.open-meteo.com/v1/search';
const forecastUrl = 'https://api.open-meteo.com/v1/forecast';

async function readJson<T>(key: string): Promise<T | null> {
  const stored = await AsyncStorage.getItem(key).catch(() => null);
  if (stored === null) return null;
  try {
    return JSON.parse(stored) as T;
  } catch {
    return null;
  }
}

export const readPlace = () => readJson<WeatherPlace>(placeKey);

/** Retirer la ville retire aussi sa prévision : rien ne s'affiche plus. */
export async function savePlace(place: WeatherPlace | null) {
  if (place) await AsyncStorage.setItem(placeKey, JSON.stringify(place));
  else await AsyncStorage.multiRemove([placeKey, forecastKey]);
}

async function getJson(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Open-Meteo a répondu ${response.status}.`);
  return response.json();
}

type GeocodingResult = { name: string; latitude: number; longitude: number; admin1?: string; country?: string };

/** Les villes dont le nom commence par `name`, recherchées par le géocodage d'Open-Meteo. */
export async function searchPlaces(name: string): Promise<WeatherPlace[]> {
  const body: { results?: GeocodingResult[] } = await getJson(
    `${geocodingUrl}?name=${encodeURIComponent(name)}&count=8&language=fr&format=json`,
  );
  return (body.results ?? []).map((result) => ({
    name: result.name,
    region: result.admin1 ?? null,
    country: result.country ?? null,
    latitude: result.latitude,
    longitude: result.longitude,
  }));
}

type DailyResponse = {
  daily: {
    time: string[];
    weather_code: (number | null)[];
    temperature_2m_min: (number | null)[];
    temperature_2m_max: (number | null)[];
    precipitation_sum: (number | null)[];
  };
};

/** La prévision quotidienne du lieu, dans son fuseau : la veille, aujourd'hui et six jours. */
export async function fetchForecast(place: WeatherPlace, clock: Clock): Promise<Forecast> {
  const query = [
    `latitude=${place.latitude}`,
    `longitude=${place.longitude}`,
    'daily=weather_code,temperature_2m_min,temperature_2m_max,precipitation_sum',
    'timezone=auto',
    'past_days=1',
    'forecast_days=7',
  ].join('&');
  const { daily }: DailyResponse = await getJson(`${forecastUrl}?${query}`);

  const days: DayForecast[] = [];
  daily.time.forEach((date, index) => {
    const [code, min, max] = [daily.weather_code[index], daily.temperature_2m_min[index], daily.temperature_2m_max[index]];
    // Un jour que le modèle ne couvre pas encore arrive vide : il est omis.
    if (code === null || min === null || max === null) return;
    days.push({ date, code, min, max, rainMm: daily.precipitation_sum[index] ?? 0 });
  });
  return { latitude: place.latitude, longitude: place.longitude, fetchedAt: clock().toISOString(), days };
}

const isFor = (forecast: Forecast, place: WeatherPlace) =>
  forecast.latitude === place.latitude && forecast.longitude === place.longitude;

function isRecent(forecast: Forecast, clock: Clock) {
  const now = clock();
  const fetched = new Date(forecast.fetchedAt);
  return now.getTime() - fetched.getTime() < refreshAfterMs && toDateOnly(fetched) === toDateOnly(now);
}

/**
 * La prévision du lieu : celle gardée si elle est récente ; sinon celle du réseau, gardée à son
 * tour ; sans réseau, la gardée, si ancienne soit-elle. Jamais d'erreur : sans prévision, rien.
 */
export async function loadForecast(place: WeatherPlace, clock: Clock): Promise<Forecast | null> {
  const stored = await readJson<Forecast>(forecastKey);
  const kept = stored && isFor(stored, place) ? stored : null;
  if (kept && isRecent(kept, clock)) return kept;

  try {
    const fresh = await fetchForecast(place, clock);
    await AsyncStorage.setItem(forecastKey, JSON.stringify(fresh)).catch(() => {});
    return fresh;
  } catch {
    return kept;
  }
}
