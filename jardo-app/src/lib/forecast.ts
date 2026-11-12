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

/** Au-delà, le réseau compte comme absent : sur Android, une connexion qui pend n'expire jamais d'elle-même. */
export const requestTimeoutMs = 8000;

async function getJson(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Open-Meteo a répondu ${response.status}.`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

// Une réponse vient de l'extérieur, et ce qu'on en garde reste affiché tant que la prévision est
// récente : un nom qui n'est pas un texte ou un code `__proto__` y ferait tomber l'écran.
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isWithin = (value: unknown, limit: number): value is number => isNumber(value) && Math.abs(value) <= limit;
const isText = (value: unknown): value is string => typeof value === 'string' && value.length <= 200;
const isDay = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
const textOrNull = (value: unknown) => (isText(value) ? value : null);

type GeocodingResult = { name: unknown; latitude: unknown; longitude: unknown; admin1?: unknown; country?: unknown };

function toPlace(result: GeocodingResult | null): WeatherPlace | null {
  if (!isText(result?.name) || !isWithin(result.latitude, 90) || !isWithin(result.longitude, 180)) return null;
  return {
    name: result.name,
    region: textOrNull(result.admin1),
    country: textOrNull(result.country),
    latitude: result.latitude,
    longitude: result.longitude,
  };
}

const placesAsked = 8;

/** Les villes dont le nom commence par `name`, recherchées par le géocodage d'Open-Meteo. */
export async function searchPlaces(name: string): Promise<WeatherPlace[]> {
  const body: { results?: unknown } | null = await getJson(
    `${geocodingUrl}?name=${encodeURIComponent(name)}&count=${placesAsked}&language=fr&format=json`,
  );
  const results: (GeocodingResult | null)[] = Array.isArray(body?.results) ? body.results : [];
  return results
    .slice(0, placesAsked)
    .map(toPlace)
    .filter((place) => place !== null);
}

type DailyResponse = {
  daily: {
    time: unknown[];
    weather_code: unknown[];
    temperature_2m_min: unknown[];
    temperature_2m_max: unknown[];
    precipitation_sum: unknown[];
  };
};

/** La veille, aujourd'hui et six jours. */
const daysAsked = 8;

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
  daily.time.slice(0, daysAsked).forEach((date, index) => {
    const [code, min, max, rain] = [
      daily.weather_code[index],
      daily.temperature_2m_min[index],
      daily.temperature_2m_max[index],
      daily.precipitation_sum[index],
    ];
    // Un jour que le modèle ne couvre pas encore arrive vide : il est omis.
    if (!isDay(date) || !isNumber(code) || !isNumber(min) || !isNumber(max)) return;
    days.push({ date, code, min, max, rainMm: isNumber(rain) ? rain : 0 });
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

/** La dernière prévision gardée pour ce lieu, si ancienne soit-elle, sans appeler le réseau. */
export async function readKeptForecast(place: WeatherPlace): Promise<Forecast | null> {
  const stored = await readJson<Forecast>(forecastKey);
  return stored && isFor(stored, place) ? stored : null;
}

/**
 * La prévision du lieu : celle gardée si elle est récente ; sinon celle du réseau, gardée à son
 * tour ; sans réseau, la gardée, si ancienne soit-elle. Jamais d'erreur : sans prévision, rien.
 */
export async function loadForecast(place: WeatherPlace, clock: Clock): Promise<Forecast | null> {
  const kept = await readKeptForecast(place);
  if (kept && isRecent(kept, clock)) return kept;

  try {
    const fresh = await fetchForecast(place, clock);
    await AsyncStorage.setItem(forecastKey, JSON.stringify(fresh)).catch(() => {});
    return fresh;
  } catch {
    return kept;
  }
}
