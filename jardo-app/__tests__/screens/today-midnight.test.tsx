import { act, fireEvent, screen } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import TodayScreen from '@/app/(tabs)/today';
import type { Services } from '@/data/services';

import { createTestServices, renderScreen } from '../../test/render';

/** Un arrosage dû le samedi 31 octobre, et l'ail à planter le dimanche 1er novembre. */
async function addTasks(services: Services) {
  const potager = await services.spaces.create({ name: 'Potager', kind: 'VegetableGarden' });
  await services.tasks.create({
    kind: 'Watering',
    recurrence: 'EveryNDays',
    intervalDays: 3,
    startDate: '2026-10-31',
    spaceId: potager.id,
  });
  await services.tasks.create({
    kind: 'Planting',
    title: "Planter l'ail",
    recurrence: 'Once',
    startDate: '2026-11-01',
    spaceId: potager.id,
  });
}

/** Le téléphone revient sur l'app, comme AppState le signale. */
function returnToApp() {
  const listeners = jest
    .mocked(AppState.addEventListener)
    .mock.calls.filter(([type]) => type === 'change')
    .map(([, listener]) => listener as (state: AppStateStatus) => void);
  listeners.forEach((listener) => listener('active'));
}

describe("Aujourd'hui, au changement de jour", () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    jest.setSystemTime(new Date(2026, 9, 31, 23, 59));
  });
  afterEach(() => jest.useRealTimers());

  it("passe au nouveau jour à minuit, échéances relues, même si rien ne se passe sur l'écran", async () => {
    const services = await createTestServices();
    await addTasks(services);
    await renderScreen(<TodayScreen />, services);

    expect(await screen.findByText('Samedi 31 octobre')).toBeOnTheScreen();
    expect(screen.getByText(/^Aujourd'hui/)).toBeOnTheScreen();
    expect(screen.queryByLabelText(/^Fait : Planter l'ail/)).not.toBeOnTheScreen();

    await act(() => jest.advanceTimersByTime(2 * 60_000));

    expect(await screen.findByText('Dimanche 1 novembre')).toBeOnTheScreen();
    expect(await screen.findByLabelText(/^Fait : Planter l'ail/)).toBeOnTheScreen();
    expect(await screen.findByText('en retard de 1 jour')).toBeOnTheScreen();
  });

  it("relit le jour au retour sur l'app, après une nuit en arrière-plan", async () => {
    const services = await createTestServices();
    await addTasks(services);
    await renderScreen(<TodayScreen />, services);
    expect(await screen.findByText('Samedi 31 octobre')).toBeOnTheScreen();

    // En arrière-plan, les minuteurs de l'app ne tournent pas : seule l'heure avance.
    jest.setSystemTime(new Date(2026, 10, 1, 8, 0));
    await act(() => returnToApp());

    expect(await screen.findByText('Dimanche 1 novembre')).toBeOnTheScreen();
    expect(await screen.findByLabelText(/^Fait : Planter l'ail/)).toBeOnTheScreen();
  });

  it("revient sur aujourd'hui quand le jour choisi est passé", async () => {
    const services = await createTestServices();
    await addTasks(services);
    await renderScreen(<TodayScreen />, services);

    await fireEvent.press(await screen.findByRole('tab', { name: /^Dimanche 1 novembre/ }));
    expect(screen.getByText(/^Demain/)).toBeOnTheScreen();

    await act(() => jest.advanceTimersByTime(2 * 60_000));

    expect(await screen.findByText('Dimanche 1 novembre')).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: /^Aujourd'hui/ })).toBeSelected();
    expect(await screen.findByLabelText(/^Fait : Planter l'ail/)).toBeOnTheScreen();
  });
});
