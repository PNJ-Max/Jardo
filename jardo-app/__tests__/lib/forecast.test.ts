import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Clock } from '@/data/clock';
import { loadForecast, readPlace, requestTimeoutMs, savePlace, searchPlaces } from '@/lib/forecast';
import { forecastAge, todayWeather } from '@/lib/weather';

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

  it("abandonne un réseau qui ne répond pas, et rend la prévision gardée", async () => {
    fetchMock.mockImplementationOnce(respond(openMeteoDaily('2026-10-29')));
    await loadForecast(namur, at('2026-10-30T09:00:00'));
    // Une connexion qui pend : seule l'annulation y met fin.
    fetchMock.mockImplementationOnce(
      (_url: string, { signal }: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('Annulée.')))),
    );
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    try {
      const loading = loadForecast(namur, at('2026-10-31T08:00:00'));
      await jest.advanceTimersByTimeAsync(requestTimeoutMs);

      await expect(loading).resolves.toMatchObject({ fetchedAt: new Date('2026-10-30T09:00:00').toISOString() });
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('réponse inattendue du réseau', () => {
  const clock = at('2026-10-30T09:00:00');
  const answered = async (change: (body: any) => void) => {
    const body = openMeteoDaily('2026-10-29');
    change(body);
    fetchMock.mockImplementationOnce(respond(body));
    return (await loadForecast(namur, clock))!;
  };

  it.each([
    ['un code de temps __proto__', (body: any) => (body.daily.weather_code[1] = '__proto__')],
    ['un code de temps constructor', (body: any) => (body.daily.weather_code[1] = 'constructor')],
    ['une température en texte', (body: any) => (body.daily.temperature_2m_min[1] = 'x')],
    ['une température infinie', (body: any) => (body.daily.temperature_2m_max[1] = Infinity)],
    ['une date qui n’est pas un texte', (body: any) => (body.daily.time[1] = 12)],
  ])('omet le jour qui porte %s', async (_, change) => {
    const forecast = await answered(change);

    expect(forecast.days).toHaveLength(7);
    expect(() => todayWeather(forecast, clock)).not.toThrow();
    expect(JSON.parse((await AsyncStorage.getItem('jardo.forecast'))!).days).toHaveLength(7);
  });

  it('compte sans pluie un cumul qui n’est pas un nombre', async () => {
    const forecast = await answered((body) => (body.daily.precipitation_sum[1] = { mm: 8 }));

    expect(forecast.days[1].rainMm).toBe(0);
  });

  it('ne garde pas plus que les huit jours demandés', async () => {
    const forecast = await answered((body) => {
      body.daily.time = Array.from({ length: 5000 }, () => '2026-10-30');
      body.daily.weather_code = body.daily.time.map(() => 0);
      body.daily.temperature_2m_min = body.daily.time.map(() => 1);
      body.daily.temperature_2m_max = body.daily.time.map(() => 2);
      body.daily.precipitation_sum = body.daily.time.map(() => 0);
    });

    expect(forecast.days).toHaveLength(8);
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

  it('écarte une ville illisible, sans perdre les autres', async () => {
    fetchMock.mockImplementationOnce(
      respond({
        results: [
          { name: 'Piège', latitude: '1&past_days=92', longitude: 2 },
          { name: 'Hors du globe', latitude: 95, longitude: 2 },
          { name: 'Sans longitude', latitude: 1 },
          { name: { fr: 'Objet' }, latitude: 1, longitude: 2 },
          null,
          { name: 'Namur', latitude: 50.4669, longitude: 4.86746, admin1: 3, country: 'Belgique' },
        ],
      }),
    );

    await expect(searchPlaces('x')).resolves.toEqual([{ ...namur, region: null }]);
  });

  it.each([[{ results: { length: 2 } }], [{ results: 'Namur' }], [null]])('ne voit aucune ville dans la réponse %j', async (body) => {
    fetchMock.mockImplementationOnce(respond(body));

    await expect(searchPlaces('x')).resolves.toEqual([]);
  });

  it('ne garde pas plus de villes que demandé', async () => {
    fetchMock.mockImplementationOnce(respond({ results: Array.from({ length: 5000 }, () => ({ name: 'Namur', latitude: 50, longitude: 4 })) }));

    await expect(searchPlaces('x')).resolves.toHaveLength(8);
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
