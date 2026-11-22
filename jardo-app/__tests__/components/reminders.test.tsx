import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { AppState, Pressable, Text, type AppStateStatus } from 'react-native';

import {
  useCompleteTask,
  useDeleteTask,
  usePostponeTask,
  useSaveJournalEntry,
  useSaveTask,
  useWaterSpace,
} from '@/api/queries';
import type { Id } from '@/api/types';
import { Reminders } from '@/components/reminders';
import type { Services } from '@/data/services';
import { addDays } from '@/domain/dates';
import { toDateOnly } from '@/lib/dates';
import { reminderDays } from '@/lib/reminders';

import { createTestServices, renderScreen } from '../../test/render';

const schedule = Notifications.scheduleNotificationAsync as jest.Mock;
const cancelAll = Notifications.cancelAllScheduledNotificationsAsync as jest.Mock;

const today = '2026-10-28';
const due = "1 chose au jardin aujourd'hui : arroser (Potager).";

/** Les rappels programmés depuis le dernier remplacement : le jour et la phrase. */
function programmed() {
  const since = Math.max(0, ...cancelAll.mock.invocationCallOrder);
  return schedule.mock.calls
    .filter((_, index) => schedule.mock.invocationCallOrder[index] > since)
    .map(([request]) => ({ day: toDateOnly(request.trigger.date), body: request.content.body as string }));
}

/** Un rappel par jour de `from` à la fin des deux semaines, avec la même phrase. */
const daily = (from: number, body: string) =>
  Array.from({ length: reminderDays - from }, (_, index) => ({ day: addDays(today, from + index), body }));

type Garden = { services: Services; potager: Id; verger: Id; watering: Id };

/** Un arrosage du potager tous les trois jours, à faire depuis hier : il n'est jamais en retard. */
async function createGarden(): Promise<Garden> {
  const services = await createTestServices();
  const potager = await services.spaces.create({ name: 'Potager', kind: 'VegetableGarden' });
  const verger = await services.spaces.create({ name: 'Verger', kind: 'Orchard' });
  const watering = await services.tasks.create({
    kind: 'Watering',
    recurrence: 'EveryNDays',
    intervalDays: 3,
    startDate: addDays(today, -1),
    spaceId: potager.id,
  });
  return { services, potager: potager.id, verger: verger.id, watering: watering.id };
}

function Write({ useWrite, garden }: { useWrite: (garden: Garden) => () => void; garden: Garden }) {
  const write = useWrite(garden);
  return (
    <Pressable onPress={write}>
      <Text>Écrire</Text>
    </Pressable>
  );
}

beforeEach(async () => {
  jest.clearAllMocks();
  jest.useFakeTimers({ advanceTimers: true, now: new Date(2026, 9, 28, 7) });
  await AsyncStorage.clear();
  await AsyncStorage.setItem('jardo.reminders', JSON.stringify({ enabled: true, hour: 8, minute: 0 }));
});
afterEach(() => jest.useRealTimers());

describe('programmation des rappels', () => {
  it("programme les deux semaines à l'heure choisie, sur le canal des rappels, vers Aujourd'hui", async () => {
    const { services } = await createGarden();
    await renderScreen(<Reminders />, services);

    await waitFor(() => expect(programmed()).toEqual(daily(0, due)));
    expect(schedule).toHaveBeenCalledWith({
      content: { body: due, data: { href: '/today' } },
      trigger: { type: 'date', date: new Date(2026, 9, 28, 8, 0), channelId: 'reminders' },
    });
  });

  it('ne programme rien et ne demande rien quand les rappels sont désactivés', async () => {
    await AsyncStorage.clear();
    const { services } = await createGarden();
    await renderScreen(<Reminders />, services);

    await waitFor(() => expect(cancelAll).toHaveBeenCalled());
    expect(schedule).not.toHaveBeenCalled();
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it.each<[string, (garden: Garden) => () => void, { day: string; body: string }[]]>([
    [
      'Fait',
      ({ watering }) => {
        const complete = useCompleteTask();
        return () => complete.mutate({ id: watering });
      },
      daily(3, due),
    ],
    [
      'Reporter',
      ({ watering }) => {
        const postpone = usePostponeTask();
        return () => postpone.mutate({ id: watering, until: addDays(today, 2) });
      },
      daily(2, due),
    ],
    [
      'Tout arroser',
      ({ potager }) => {
        const water = useWaterSpace();
        return () => water.mutate({ spaceId: potager, date: today });
      },
      daily(3, due),
    ],
    [
      'une intervention notée au journal',
      ({ potager }) => {
        const save = useSaveJournalEntry();
        return () => save.mutate({ input: { date: today, kind: 'Watering', spaceId: potager } });
      },
      daily(3, due),
    ],
    [
      "la création d'une tâche",
      ({ verger }) => {
        const save = useSaveTask();
        return () => save.mutate({ input: { kind: 'Pruning', recurrence: 'Once', startDate: today, spaceId: verger } });
      },
      [
        { day: today, body: "2 choses au jardin aujourd'hui : arroser (Potager), tailler (Verger)." },
        ...daily(1, "2 choses au jardin aujourd'hui, dont 1 en retard : tailler (Verger), arroser (Potager)."),
      ],
    ],
    [
      "la suppression d'une tâche",
      ({ watering }) => {
        const remove = useDeleteTask();
        return () => remove.mutate(watering);
      },
      [],
    ],
  ])('reprogramme après %s', async (_name, useWrite, expected) => {
    const garden = await createGarden();
    await renderScreen(
      <>
        <Reminders />
        <Write useWrite={useWrite} garden={garden} />
      </>,
      garden.services,
    );
    await waitFor(() => expect(programmed()).toEqual(daily(0, due)));

    await fireEvent.press(screen.getByText('Écrire'));

    await waitFor(() => expect(programmed()).toEqual(expected));
  });

  it("reprogramme au retour sur l'app, à partir du nouveau jour", async () => {
    const { services } = await createGarden();
    await renderScreen(<Reminders />, services);
    await waitFor(() => expect(programmed()).toEqual(daily(0, due)));

    // Le mock d'AppState de React Native garde les écouteurs inscrits.
    const listeners = (AppState.addEventListener as jest.Mock).mock.calls.map(([, listener]) => listener);
    jest.setSystemTime(new Date(2026, 9, 29, 7));
    await act(async () => listeners.forEach((listener: (state: AppStateStatus) => void) => listener('active')));

    await waitFor(() => expect(programmed()).toEqual(daily(1, due).concat({ day: addDays(today, reminderDays), body: due })));
  });
});

describe('toucher un rappel', () => {
  const response = { notification: { request: { content: { data: { href: '/today' } } } } };

  it("ouvre Aujourd'hui", async () => {
    await renderScreen(<Reminders />);
    const [[listener]] = (Notifications.addNotificationResponseReceivedListener as jest.Mock).mock.calls;

    await act(async () => listener(response));

    expect(router.navigate).toHaveBeenCalledWith('/today');
  });

  // expo-notifications fait une « réponse » de tout intent qui porte `google.message_id`, ses extras
  // devenant `data` : n'importe quelle app, ou une page web par un lien intent://, en choisit le contenu.
  it.each(['https://exemple.test/', 'tel:+3200000000', '/settings', '/space/../settings', 42, null])(
    "n'ouvre rien d'autre qu'Aujourd'hui, même si la réponse le demande (%s)",
    async (href) => {
      await renderScreen(<Reminders />);
      const [[listener]] = (Notifications.addNotificationResponseReceivedListener as jest.Mock).mock.calls;

      await act(async () => listener({ notification: { request: { content: { data: { href } } } } }));

      expect(router.navigate).not.toHaveBeenCalled();
    },
  );

  it("ouvre Aujourd'hui quand le rappel a lancé l'app", async () => {
    (Notifications.getLastNotificationResponse as jest.Mock).mockReturnValueOnce(response);

    await renderScreen(<Reminders />);

    expect(router.navigate).toHaveBeenCalledWith('/today');
    expect(Notifications.clearLastNotificationResponse).toHaveBeenCalled();
  });
});
