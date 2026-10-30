import type { GardenTask } from '@/api/types';
import type { Clock } from '@/data/clock';
import type { SpaceGroup } from '@/lib/today';
import {
  describeWeather,
  forecastAge,
  isSunny,
  rainNote,
  rainNoteApplies,
  spokenWeather,
  todayWeather,
  weatherSummary,
  type DayForecast,
  type Forecast,
} from '@/lib/weather';

const at = (iso: string): Clock => () => new Date(iso);
const morning = at('2026-10-30T09:00:00');

function forecast(days: Partial<DayForecast>[], fetchedAt = '2026-10-30T08:00:00'): Forecast {
  return {
    latitude: 50.47,
    longitude: 4.87,
    fetchedAt: new Date(fetchedAt).toISOString(),
    days: days.map((day, index) => ({ date: `2026-10-${29 + index}`, min: 8, max: 14, rainMm: 0, code: 3, ...day })),
  };
}

describe('codes météo', () => {
  it.each([
    [0, 'Clear', 'Ensoleillé'],
    [2, 'PartlyCloudy', 'Éclaircies'],
    [3, 'Cloudy', 'Couvert'],
    [45, 'Fog', 'Brouillard'],
    [53, 'Rain', 'Bruine'],
    [65, 'Rain', 'Forte pluie'],
    [81, 'Rain', 'Averses'],
    [73, 'Snow', 'Neige'],
    [86, 'Snow', 'Fortes averses de neige'],
    [99, 'Storm', 'Orage et forte grêle'],
  ])('le code %i est %s, « %s »', (code, kind, label) => {
    expect(describeWeather(code)).toEqual({ kind, label });
  });

  it('un code inconnu reste affichable', () => {
    expect(describeWeather(42)).toEqual({ kind: 'Cloudy', label: 'Temps variable' });
  });

  it('le soleil ne se montre que les jours clairs', () => {
    expect(['Clear', 'PartlyCloudy', 'Cloudy', 'Rain'].map((kind) => isSunny(kind as never))).toEqual([true, true, false, false]);
  });
});

describe('phrase du jour', () => {
  const showers: DayForecast = { date: '2026-10-30', min: 7.6, max: 13.5, rainMm: 6.2, code: 81 };

  it('dit le temps, les températures arrondies et la pluie', () => {
    expect(weatherSummary(showers)).toBe('Averses · 8° à 14° · 6 mm');
    expect(spokenWeather(showers)).toBe('Averses, de 8 à 14 degrés, 6 millimètres de pluie');
  });

  it("tait la pluie sous le millimètre, et n'écrit pas « -0° »", () => {
    expect(weatherSummary({ ...showers, code: 51, min: -0.4, max: 3, rainMm: 0.4 })).toBe('Bruine légère · 0° à 3°');
  });

  it("prend le jour de l'horloge dans la prévision", () => {
    const weather = todayWeather(forecast([{ code: 0 }, { code: 81, rainMm: 6 }]), morning);

    expect(weather).toEqual({
      kind: 'Rain',
      summary: 'Averses · 8° à 14° · 6 mm',
      spoken: 'Météo du jour : averses, de 8 à 14 degrés, 6 millimètres de pluie.',
      age: null,
    });
  });

  it("ne dit rien si la prévision gardée ne va pas jusqu'à aujourd'hui", () => {
    expect(todayWeather(forecast([{}, {}]), at('2026-11-02T09:00:00'))).toBeNull();
  });
});

describe("âge d'une prévision gardée", () => {
  it('ne dit rien les six premières heures', () => {
    expect(forecastAge(forecast([], '2026-10-30T03:30:00'), morning)).toBeNull();
  });

  it("dit l'heure, puis la veille, puis le jour", () => {
    expect(forecastAge(forecast([], '2026-10-30T07:10:00'), at('2026-10-30T18:00:00'))).toBe('Prévision de 7 h');
    expect(forecastAge(forecast([], '2026-10-29T20:00:00'), morning)).toBe("Prévision d'hier");
    expect(forecastAge(forecast([], '2026-10-27T20:00:00'), morning)).toBe('Prévision du mardi 27 octobre');
  });

  it("l'ajoute à ce que lit le lecteur d'écran", () => {
    const weather = todayWeather(forecast([{}, {}], '2026-10-29T20:00:00'), morning);
    expect(weather?.spoken).toBe("Météo du jour : couvert, de 8 à 14 degrés. Prévision d'hier.");
  });
});

describe("note d'arrosage", () => {
  it("dit la pluie d'hier à partir de 5 mm", () => {
    expect(rainNote(forecast([{ rainMm: 8.2 }, {}]), morning)).toBe("Il a plu 8 mm hier : l'arrosage peut attendre.");
    expect(rainNote(forecast([{ rainMm: 4.4 }, {}]), morning)).toBeNull();
    expect(rainNote(forecast([{ rainMm: 4.6 }, {}]), morning)).toBe("Il a plu 5 mm hier : l'arrosage peut attendre.");
  });

  it("dit la pluie prévue aujourd'hui, et les deux ensemble", () => {
    expect(rainNote(forecast([{}, { rainMm: 6 }]), morning)).toBe("6 mm de pluie prévus aujourd'hui : l'arrosage peut attendre.");
    expect(rainNote(forecast([{ rainMm: 12 }, { rainMm: 5 }]), morning)).toBe(
      "Il a plu 12 mm hier et 5 mm sont prévus aujourd'hui : l'arrosage peut attendre.",
    );
  });

  it("se tait sur une prévision d'un autre jour : la pluie d'hier n'y était qu'annoncée", () => {
    expect(rainNote(forecast([{ rainMm: 8 }, { rainMm: 8 }], '2026-10-29T20:00:00'), morning)).toBeNull();
  });

  it("ne vaut que pour les espaces en plein air qui ont un arrosage", () => {
    const group = (spaceKind: SpaceGroup['spaceKind'], kinds: GardenTask['kind'][]): SpaceGroup => ({
      spaceId: 's',
      spaceName: 'Espace',
      spaceKind,
      tasks: kinds.map((kind) => ({ kind }) as GardenTask),
    });

    expect(rainNoteApplies(group('VegetableGarden', ['Pruning', 'Watering']))).toBe(true);
    expect(rainNoteApplies(group('VegetableGarden', ['Pruning']))).toBe(false);
    expect(rainNoteApplies(group('Greenhouse', ['Watering']))).toBe(false);
  });
});
