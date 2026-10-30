import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Clock } from '@/data/clock';
import { loadForecast, readPlace, savePlace, searchPlaces } from '@/lib/forecast';
import { forecastAge } from '@/lib/weather';

import { goOffline, namur, openMeteoDaily, respond } from '../../test/weather';

const at = (iso: string): Clock => () => new Date(iso);
const fetchMock = global.fetch as jest.Mock;

beforeEach(async () => {
  goOffline();
  await AsyncStorage.clear();
});

describe('prévision', () => {
  it("lit la veille, aujourd'hui et six jours, dans le fuseau du lieu", async () => {
    fetchMock.mockImplementationOnce(respond(openMeteoDaily('2026-10-29')));

    const forecast = await loadForecast(namur, at('2026-10-30T09:00:00'));

    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe('https://api.open-meteo.com/v1/forecast');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      latitude: '50.4669',
      longitude: '4.86746',
      daily: 'weather_code,temperature_2m_min,temperature_2m_max,precipitation_sum',
      timezone: 'auto',
      past_days: '1',
      forecast_days: '7',
    });
    expect(forecast?.days).toHaveLength(8);
    expect(forecast?.days[0]).toEqual({ date: '2026-10-29', min: 6, max: 12, rainMm: 8.4, code: 63 });
  });

  it('omet un jour que le modèle ne couvre pas encore', async () => {
    const body = openMeteoDaily('2026-10-29');
    body.daily.weather_code[7] = null;
    fetchMock.mockImplementationOnce(respond(body));

    expect((await loadForecast(namur, at('2026-10-30T09:00:00')))?.days).toHaveLength(7);
  });

  it("ne rappelle pas le réseau avant trois heures, puis garde la nouvelle", async () => {
    fetchMock.mockImplementation(respond(openMeteoDaily('2026-10-29')));

    await loadForecast(namur, at('2026-10-30T09:00:00'));
    await loadForecast(namur, at('2026-10-30T11:30:00'));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const later = await loadForecast(namur, at('2026-10-30T12:30:00'));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(later?.fetchedAt).toBe(new Date('2026-10-30T12:30:00').toISOString());
  });

  it('relit la prévision gardée hors ligne, et dit de quand elle date', async () => {
    fetchMock.mockImplementationOnce(respond(openMeteoDaily('2026-10-29')));
    await loadForecast(namur, at('2026-10-30T09:00:00'));

    const nextDay = at('2026-10-31T08:00:00');
    const offline = await loadForecast(namur, nextDay);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(offline?.days).toHaveLength(8);
    expect(forecastAge(offline!, nextDay)).toBe("Prévision d'hier");
  });

  it("sans prévision gardée ni réseau, il n'y a rien, sans erreur", async () => {
    await expect(loadForecast(namur, at('2026-10-30T09:00:00'))).resolves.toBeNull();
  });

  it("une réponse d'erreur du service compte comme l'absence de réseau", async () => {
    fetchMock.mockImplementationOnce(respond({ error: true, reason: 'Trop de requêtes' }, 429));
    await expect(loadForecast(namur, at('2026-10-30T09:00:00'))).resolves.toBeNull();
  });

  it("ne montre pas la prévision gardée d'une autre ville", async () => {
    fetchMock.mockImplementationOnce(respond(openMeteoDaily('2026-10-29')));
    await loadForecast(namur, at('2026-10-30T09:00:00'));

    await expect(loadForecast({ ...namur, latitude: 45.75, longitude: 4.85 }, at('2026-10-30T09:30:00'))).resolves.toBeNull();
  });
});

describe('ville', () => {
  it('cherche les villes en français, avec leur région et leur pays', async () => {
    fetchMock.mockImplementationOnce(
      respond({ results: [{ id: 1, name: 'Namur', latitude: 50.4669, longitude: 4.86746, admin1: 'Wallonie', country: 'Belgique' }] }),
    );

    await expect(searchPlaces('Namur ')).resolves.toEqual([namur]);
    expect(fetchMock.mock.calls[0][0]).toBe('https://geocoding-api.open-meteo.com/v1/search?name=Namur%20&count=8&language=fr&format=json');
  });

  it("sans résultat, la liste est vide", async () => {
    fetchMock.mockImplementationOnce(respond({ generationtime_ms: 0.4 }));
    await expect(searchPlaces('Xyzzy')).resolves.toEqual([]);
  });

  it('retirer la ville retire sa prévision gardée', async () => {
    fetchMock.mockImplementationOnce(respond(openMeteoDaily('2026-10-29')));
    await savePlace(namur);
    await loadForecast(namur, at('2026-10-30T09:00:00'));

    await savePlace(null);

    await expect(readPlace()).resolves.toBeNull();
    await expect(loadForecast(namur, at('2026-10-30T09:30:00'))).resolves.toBeNull();
  });
});
