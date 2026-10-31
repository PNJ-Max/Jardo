import type { Clock } from '@/data/clock';
import { addDays, daysBetween, type DateOnly } from '@/domain/dates';

import { parseDateOnly, toDateOnly } from './dates';
import type { SpaceGroup } from './today';

// La météo, telle que l'écran la dit : pictogramme, libellé, phrase du jour et note d'arrosage.
// La lecture et le cache de la prévision sont dans forecast.ts.

/** La ville retenue dans les réglages : la prévision est lue à ses coordonnées. */
export type WeatherPlace = { name: string; region: string | null; country: string | null; latitude: number; longitude: number };

/** Un jour de prévision : températures en °C, pluie (précipitations) en mm, code météo OMM. */
export type DayForecast = { date: DateOnly; min: number; max: number; rainMm: number; code: number };

/** La dernière prévision lue, gardée sur le téléphone : la veille, aujourd'hui et six jours. */
export type Forecast = { latitude: number; longitude: number; fetchedAt: string; days: DayForecast[] };

/** Un pictogramme par famille de temps. */
export type WeatherKind = 'Clear' | 'PartlyCloudy' | 'Cloudy' | 'Fog' | 'Rain' | 'Snow' | 'Storm';

// Codes OMM (WMO 4677) tels qu'Open-Meteo les renvoie : https://open-meteo.com/en/docs
const codes: Record<number, [WeatherKind, string]> = {
  0: ['Clear', 'Ensoleillé'],
  1: ['Clear', 'Plutôt ensoleillé'],
  2: ['PartlyCloudy', 'Éclaircies'],
  3: ['Cloudy', 'Couvert'],
  45: ['Fog', 'Brouillard'],
  48: ['Fog', 'Brouillard givrant'],
  51: ['Rain', 'Bruine légère'],
  53: ['Rain', 'Bruine'],
  55: ['Rain', 'Bruine dense'],
  56: ['Rain', 'Bruine verglaçante'],
  57: ['Rain', 'Bruine verglaçante'],
  61: ['Rain', 'Pluie faible'],
  63: ['Rain', 'Pluie'],
  65: ['Rain', 'Forte pluie'],
  66: ['Rain', 'Pluie verglaçante'],
  67: ['Rain', 'Forte pluie verglaçante'],
  71: ['Snow', 'Neige faible'],
  73: ['Snow', 'Neige'],
  75: ['Snow', 'Forte neige'],
  77: ['Snow', 'Grains de neige'],
  80: ['Rain', 'Averses légères'],
  81: ['Rain', 'Averses'],
  82: ['Rain', 'Fortes averses'],
  85: ['Snow', 'Averses de neige'],
  86: ['Snow', 'Fortes averses de neige'],
  95: ['Storm', 'Orage'],
  96: ['Storm', 'Orage et grêle'],
  99: ['Storm', 'Orage et forte grêle'],
};

export function describeWeather(code: number): { kind: WeatherKind; label: string } {
  const [kind, label] = codes[code] ?? ['Cloudy', 'Temps variable'];
  return { kind, label };
}

/** Le soleil du ciel d'Aujourd'hui reste caché les jours gris. */
export const isSunny = (kind: WeatherKind) => kind === 'Clear' || kind === 'PartlyCloudy';

const degrees = (value: number) => Math.round(value) || 0;
const millimetres = (value: number) => Math.round(value);

/** Sous le millimètre, la pluie ne vaut pas d'être annoncée : le libellé dit déjà la bruine. */
const rainShown = (day: DayForecast) => millimetres(day.rainMm) >= 1;

/** « Averses · 8° à 14° · 6 mm » */
export function weatherSummary(day: DayForecast): string {
  const parts = [describeWeather(day.code).label, `${degrees(day.min)}° à ${degrees(day.max)}°`];
  if (rainShown(day)) parts.push(`${millimetres(day.rainMm)} mm`);
  return parts.join(' · ');
}

/** « Averses, de 8 à 14 degrés, 6 millimètres de pluie » : la même chose, pour le lecteur d'écran. */
export function spokenWeather(day: DayForecast): string {
  const parts = [describeWeather(day.code).label, `de ${degrees(day.min)} à ${degrees(day.max)} degrés`];
  if (rainShown(day)) parts.push(`${millimetres(day.rainMm)} millimètres de pluie`);
  return parts.join(', ');
}

export const forecastDay = (forecast: Forecast, date: DateOnly) => forecast.days.find((day) => day.date === date);

const hourMs = 3_600_000;

/** Au-delà, la prévision gardée est dite ancienne et l'écran dit de quand elle date. */
export const oldForecastMs = 6 * hourMs;

/** « Prévision de 7 h », « Prévision d'hier », « Prévision du mardi 27 octobre » ; rien si elle est récente. */
export function forecastAge(forecast: Forecast, clock: Clock): string | null {
  const now = clock();
  const fetched = new Date(forecast.fetchedAt);
  if (now.getTime() - fetched.getTime() < oldForecastMs) return null;

  const fetchedOn = toDateOnly(fetched);
  const days = daysBetween(fetchedOn, toDateOnly(now));
  if (days === 0) return `Prévision de ${fetched.getHours()} h`;
  if (days === 1) return "Prévision d'hier";
  return `Prévision du ${parseDateOnly(fetchedOn).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`;
}

export type TodayWeather = { kind: WeatherKind; summary: string; spoken: string; age: string | null };

/** Le temps du jour dans le ciel d'Aujourd'hui ; rien si la prévision gardée ne va pas jusqu'à aujourd'hui. */
export function todayWeather(forecast: Forecast, clock: Clock): TodayWeather | null {
  const day = forecastDay(forecast, toDateOnly(clock()));
  if (!day) return null;
  const age = forecastAge(forecast, clock);
  return {
    kind: describeWeather(day.code).kind,
    summary: weatherSummary(day),
    spoken: `Météo du jour : ${spokenWeather(day).toLocaleLowerCase('fr')}.${age ? ` ${age}.` : ''}`,
    age,
  };
}

/**
 * La pluie qui dispense d'un arrosage ordinaire : 1 mm de pluie, c'est 1 litre par mètre carré, et
 * un arrosoir de 10 litres sur 2 m² en donne 5. En dessous, l'eau mouille à peine la surface et
 * s'évapore, surtout sous le feuillage.
 */
export const rainThresholdMm = 5;

/**
 * « Il a plu 8 mm hier : l'arrosage peut attendre. » La note informe, elle ne change aucune
 * échéance. Seulement sur une prévision lue aujourd'hui : dans une plus ancienne, la pluie de la
 * veille n'était qu'annoncée.
 */
export function rainNote(forecast: Forecast, clock: Clock): string | null {
  const today = toDateOnly(clock());
  if (toDateOnly(new Date(forecast.fetchedAt)) !== today) return null;

  const fell = millimetres(forecastDay(forecast, addDays(today, -1))?.rainMm ?? 0);
  const expected = millimetres(forecastDay(forecast, today)?.rainMm ?? 0);
  const hasFallen = fell >= rainThresholdMm;
  const isExpected = expected >= rainThresholdMm;

  if (hasFallen && isExpected) return `Il a plu ${fell} mm hier et ${expected} mm sont prévus aujourd'hui : l'arrosage peut attendre.`;
  if (hasFallen) return `Il a plu ${fell} mm hier : l'arrosage peut attendre.`;
  if (isExpected) return `${expected} mm de pluie prévus aujourd'hui : l'arrosage peut attendre.`;
  return null;
}

/** La pluie n'entre pas dans la serre : la note ne vaut que pour les arrosages en plein air. */
export const rainNoteApplies = (group: SpaceGroup) =>
  group.spaceKind !== 'Greenhouse' && group.tasks.some((task) => task.kind === 'Watering');
