import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen } from '@testing-library/react-native';

import TodayScreen from '@/app/(tabs)/today';
import type { Services } from '@/data/services';
import { addDays } from '@/domain/dates';
import { today } from '@/lib/dates';
import { describeWeather, type DayForecast } from '@/lib/weather';

import { createTestServices, pictogramsOnScreen, renderScreen } from '../../test/render';
import { goOffline, keepForecast, openMeteoDaily } from '../../test/weather';

const rain = "Il a plu 8 mm hier : l'arrosage peut attendre.";
const spokenToday = 'Météo du jour : averses, de 6 à 12 degrés, 2 millimètres de pluie.';

/** La prévision d'Open-Meteo telle que l'app la garde : 8,4 mm hier, averses aujourd'hui. */
function days(): DayForecast[] {
  const { daily } = openMeteoDaily(addDays(today(), -1));
  return daily.time.map((date, index) => ({
    date,
    code: daily.weather_code[index]!,
    min: daily.temperature_2m_min[index],
    max: daily.temperature_2m_max[index],
    rainMm: daily.precipitation_sum[index]!,
  }));
}

/** Un arrosage dû aujourd'hui au potager, un autre dans la serre. */
async function addWaterings(services: Services) {
  for (const [name, kind] of [['Potager', 'VegetableGarden'], ['Serre', 'Greenhouse']] as const) {
    const space = await services.spaces.create({ name, kind });
    await services.tasks.create({ kind: 'Watering', recurrence: 'EveryNDays', intervalDays: 2, startDate: today(), spaceId: space.id });
  }
}

beforeEach(async () => {
  goOffline();
  await AsyncStorage.clear();
});

describe("écran Aujourd'hui, météo", () => {
  it("sans ville choisie, rien de la météo ne s'affiche et le réseau n'est pas appelé", async () => {
    const services = await createTestServices();
    await addWaterings(services);
    await renderScreen(<TodayScreen />, services);

    expect(await screen.findByText('Potager')).toBeOnTheScreen();
    expect(screen.queryByLabelText(/^Météo du jour/)).not.toBeOnTheScreen();
    expect(screen.queryByText(rain)).not.toBeOnTheScreen();
    expect(pictogramsOnScreen().filter((key) => key.startsWith('weather-'))).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("montre le temps du jour dans le ciel, lisible par le lecteur d'écran", async () => {
    await keepForecast({ fetchedAt: new Date().toISOString(), days: days() });
    await renderScreen(<TodayScreen />);

    expect(await screen.findByLabelText(spokenToday)).toBeOnTheScreen();
    expect(screen.getByText('Averses · 6° à 12° · 2 mm')).toBeOnTheScreen();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('met un pictogramme sur chaque jour de la semaine, nommé par son onglet', async () => {
    await keepForecast({ fetchedAt: new Date().toISOString(), days: days() });
    await renderScreen(<TodayScreen />);

    expect(await screen.findByRole('tab', { name: "Aujourd'hui, rien de prévu, averses, de 6 à 12 degrés, 2 millimètres de pluie" })).toBeOnTheScreen();
    const week = days().slice(1).map((day) => `weather-${describeWeather(day.code).kind}:light`);
    expect(pictogramsOnScreen().filter((key) => key.startsWith('weather-'))).toEqual(['weather-Rain:light', ...week]);
  });

  it("note la pluie d'hier sur les arrosages en plein air, pas dans la serre", async () => {
    const services = await createTestServices();
    await addWaterings(services);
    await keepForecast({ fetchedAt: new Date().toISOString(), days: days() });
    await renderScreen(<TodayScreen />, services);

    expect(await screen.findByText(rain)).toBeOnTheScreen();
    expect(screen.getAllByText(rain)).toHaveLength(1);
    expect(screen.getByText('Serre')).toBeOnTheScreen();
  });

  it("hors ligne, garde la prévision d'hier en disant sa date, sans note d'arrosage", async () => {
    const services = await createTestServices();
    await addWaterings(services);
    const yesterdayNight = new Date();
    yesterdayNight.setDate(yesterdayNight.getDate() - 1);
    yesterdayNight.setHours(0, 30, 0, 0);
    await keepForecast({ fetchedAt: yesterdayNight.toISOString(), days: days() });
    await renderScreen(<TodayScreen />, services);

    expect(await screen.findByLabelText(`${spokenToday} Prévision d'hier.`)).toBeOnTheScreen();
    expect(screen.getByText(/Prévision d'hier/)).toBeOnTheScreen();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(rain)).not.toBeOnTheScreen();
  });
});
