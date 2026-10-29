import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { useReducedMotion } from 'react-native-reanimated';

import TodayScreen from '@/app/(tabs)/today';
import { businessRule } from '@/data/problem';
import type { Services } from '@/data/services';
import { addDays } from '@/domain/dates';
import { formatDate, today } from '@/lib/dates';

import { createTestServices, renderScreen } from '../../test/render';

const inDays = (days: number) => addDays(today(), days);

/**
 * Le potager : un arrosage du Carré 1 dû aujourd'hui, un arrosage des tomates en retard de deux
 * jours, et une taille du jour qui n'est pas un arrosage.
 */
async function addPotager(services: Services) {
  const potager = await services.spaces.create({ name: 'Potager', kind: 'VegetableGarden' });
  const carre = await services.zones.create(potager.id, { name: 'Carré 1' });
  const tomates = await services.plants.create({ name: 'Tomates', quantity: 3, quantityUnit: 'Plants', spaceId: potager.id });
  const carreWatering = await services.tasks.create({
    kind: 'Watering',
    title: 'Arroser le carré',
    recurrence: 'EveryNDays',
    intervalDays: 3,
    startDate: today(),
    spaceId: potager.id,
    zoneId: carre.id,
  });
  const tomatoWatering = await services.tasks.create({
    kind: 'Watering',
    title: 'Arroser les tomates',
    recurrence: 'EveryNDays',
    intervalDays: 10,
    startDate: inDays(-2),
    spaceId: potager.id,
    itemId: tomates.id,
  });
  await services.tasks.create({ kind: 'Pruning', recurrence: 'Once', startDate: today(), spaceId: potager.id });
  return { potager, carre, tomates, carreWatering, tomatoWatering };
}

// Les lignes célèbrent puis se replient avant que l'écriture parte : le test fait passer ce temps.
beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());
const letRowFold = () => act(() => jest.advanceTimersByTime(1200));

describe("la feuille d'une tâche d'Aujourd'hui", () => {
  it('s\'ouvre au toucher de la ligne : le rythme, la dernière fois, puis les actions', async () => {
    const services = await createTestServices();
    const { potager, tomates } = await addPotager(services);
    await services.journal.create({ date: inDays(-12), kind: 'Watering', spaceId: potager.id, itemId: tomates.id });
    await renderScreen(<TodayScreen />, services);

    await fireEvent.press(await screen.findByText('Arroser les tomates'));

    expect(screen.getByRole('header', { name: 'Arroser les tomates' })).toBeOnTheScreen();
    expect(screen.getByText('Tomates · Potager')).toBeOnTheScreen();
    expect(screen.getByText('Tous les 10 jours')).toBeOnTheScreen();
    expect(screen.getByText(`Il y a 12 jours, ${formatDate(inDays(-12))}`)).toBeOnTheScreen();
    expect(screen.queryByText('Dernière récolte')).not.toBeOnTheScreen();
    expect(screen.getByText("Fait aujourd'hui")).toBeOnTheScreen();
    for (const name of [/Fait un autre jour, avec une note/, /Ouvrir la fiche/]) {
      expect(screen.getByRole('button', { name })).toBeOnTheScreen();
    }
  });

  it("dit d'une tâche jamais faite qu'elle ne l'a pas encore été", async () => {
    const services = await createTestServices();
    await addPotager(services);
    await renderScreen(<TodayScreen />, services);

    await fireEvent.press(await screen.findByText('Arroser le carré'));

    expect(screen.getByText('Pas encore faite')).toBeOnTheScreen();
  });

  it('donne la dernière quantité récoltée pour une récolte', async () => {
    const services = await createTestServices();
    const { potager, tomates } = await addPotager(services);
    await services.tasks.create({ kind: 'Harvest', recurrence: 'EveryNDays', intervalDays: 7, startDate: today(), spaceId: potager.id, itemId: tomates.id });
    await services.journal.create({ date: inDays(-7), kind: 'Harvest', quantity: 2.5, quantityUnit: 'Kilograms', spaceId: potager.id, itemId: tomates.id });
    await renderScreen(<TodayScreen />, services);

    await fireEvent.press(await screen.findByText('Récolter'));

    expect(await screen.findByText('Dernière récolte')).toBeOnTheScreen();
    expect(screen.getByText(`2,5 kg, ${formatDate(inDays(-7))}`)).toBeOnTheScreen();
  });

  it("« Fait aujourd'hui » ferme la feuille et note la tâche comme le bouton, avec annulation", async () => {
    const services = await createTestServices();
    await addPotager(services);
    await renderScreen(<TodayScreen />, services);

    await fireEvent.press(await screen.findByText('Arroser les tomates'));
    await fireEvent.press(screen.getByText("Fait aujourd'hui"));

    expect(screen.queryByText("Fait aujourd'hui")).not.toBeOnTheScreen();
    expect(screen.getByLabelText(/^Fait : Arroser les tomates/)).toBeDisabled();
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);

    await letRowFold();

    expect(await screen.findByText('Noté au journal : arroser les tomates, Tomates')).toBeOnTheScreen();
    await waitFor(() => expect(screen.queryByText('Arroser les tomates')).not.toBeOnTheScreen());
    await fireEvent.press(screen.getByText('Annuler'));
    expect(await screen.findByText('Arroser les tomates')).toBeOnTheScreen();
    await expect(services.journal.getAll()).resolves.toEqual([]);
  });

  it("ouvre l'écran « Fait » précisé, ou la fiche de la cible", async () => {
    const services = await createTestServices();
    const { tomates, tomatoWatering } = await addPotager(services);
    await renderScreen(<TodayScreen />, services);

    await fireEvent.press(await screen.findByText('Arroser les tomates'));
    await fireEvent.press(screen.getByRole('button', { name: /Fait un autre jour, avec une note/ }));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/task/done', params: { id: String(tomatoWatering.id) } });
    expect(screen.queryByRole('button', { name: /Ouvrir la fiche/ })).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByText('Arroser les tomates'));
    await fireEvent.press(screen.getByRole('button', { name: /Ouvrir la fiche/ }));
    expect(router.push).toHaveBeenCalledWith(`/plant/${tomates.id}`);
    await expect(services.journal.getAll()).resolves.toEqual([]);
  });

  it("remplace l'appui long sur « Fait »", async () => {
    const services = await createTestServices();
    await addPotager(services);
    await renderScreen(<TodayScreen />, services);

    const done = await screen.findByLabelText(/^Fait : Arroser les tomates/);
    expect(done).not.toHaveProp('onLongPress', expect.any(Function));
    expect(done).not.toHaveProp('accessibilityHint', expect.any(String));
  });

  it('se ferme sans rien noter', async () => {
    const services = await createTestServices();
    await addPotager(services);
    await renderScreen(<TodayScreen />, services);

    await fireEvent.press(await screen.findByText('Arroser les tomates'));
    await fireEvent.press(screen.getByRole('button', { name: 'Fermer' }));

    expect(screen.queryByText("Fait aujourd'hui")).not.toBeOnTheScreen();
    await letRowFold();
    await expect(services.journal.getAll()).resolves.toEqual([]);
  });
});

describe('« Tout arroser »', () => {
  const button = 'Tout arroser : Potager, 2 arrosages';
  const noted = "Noté au journal : arroser tout l'espace, Potager";

  it("note un seul arrosage sur l'espace, qui vaut pour sa zone et ses éléments, retards compris", async () => {
    const services = await createTestServices();
    const { potager } = await addPotager(services);
    await renderScreen(<TodayScreen />, services);

    await fireEvent.press(await screen.findByRole('button', { name: button }));

    // Les deux lignes célèbrent ensemble, en retard comme du jour, avant l'écriture.
    expect(screen.getAllByText('Noté')).toHaveLength(2);
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
    await expect(services.journal.getAll()).resolves.toEqual([]);

    await letRowFold();

    expect(await screen.findByText(noted)).toBeOnTheScreen();
    await waitFor(() => expect(screen.queryByText('Arroser les tomates')).not.toBeOnTheScreen());
    expect(screen.queryByText('Arroser le carré')).not.toBeOnTheScreen();
    expect(screen.queryByText(/^En retard/)).not.toBeOnTheScreen();
    expect(screen.getByText('Tailler')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Tout arroser/ })).not.toBeOnTheScreen();

    const entries = await services.journal.getAll();
    expect(entries).toEqual([
      expect.objectContaining({ kind: 'Watering', date: today(), spaceId: potager.id, zoneId: null, itemId: null }),
    ]);
    const due = await services.tasks.getDue('Today');
    expect(due.map((task) => task.kind)).toEqual(['Pruning']);
  });

  it('se défait par « Annuler » : les arrosages reviennent', async () => {
    const services = await createTestServices();
    await addPotager(services);
    await renderScreen(<TodayScreen />, services);

    await fireEvent.press(await screen.findByRole('button', { name: button }));
    await letRowFold();
    await fireEvent.press(await screen.findByText('Annuler'));

    expect(await screen.findByText('Arroser les tomates')).toBeOnTheScreen();
    expect(await screen.findByText('Arroser le carré')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: button })).toBeEnabled();
    await expect(services.journal.getAll()).resolves.toEqual([]);
  });

  it("note aussitôt quand le téléphone réduit les animations", async () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    try {
      const services = await createTestServices();
      await addPotager(services);
      await renderScreen(<TodayScreen />, services);

      await fireEvent.press(await screen.findByRole('button', { name: button }));

      expect(await screen.findByText(noted)).toBeOnTheScreen();
    } finally {
      jest.mocked(useReducedMotion).mockReturnValue(false);
    }
  });

  it("remet les arrosages et prévient quand l'écriture est refusée", async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const services = await createTestServices();
    await addPotager(services);
    jest.spyOn(services.journal, 'create').mockRejectedValueOnce(businessRule('Refusé.'));
    await renderScreen(<TodayScreen />, services);

    await fireEvent.press(await screen.findByRole('button', { name: button }));
    await letRowFold();

    await waitFor(() => expect(alert).toHaveBeenCalledWith("L'arrosage n'a pas été noté", 'Refusé.'));
    expect(await screen.findByText('Arroser les tomates')).toBeOnTheScreen();
    await waitFor(() => expect(screen.getByRole('button', { name: button })).toBeEnabled());
    expect(screen.queryAllByText('Noté')).toEqual([]);
  });

  it("n'est pas proposé pour un seul arrosage dû", async () => {
    const services = await createTestServices();
    const { tomatoWatering } = await addPotager(services);
    await services.tasks.delete(tomatoWatering.id);
    await renderScreen(<TodayScreen />, services);

    expect(await screen.findByText('Arroser le carré')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Tout arroser/ })).not.toBeOnTheScreen();
  });
});

describe('glisser une ligne à droite', () => {
  // Le geste tourne en worklet ; « Fait » revient au thread JS par une microtâche, que les faux
  // minuteurs retiennent.
  const swipe = (id: string, translationX: number, velocityX = 0) =>
    act(() => {
      fireGestureHandler(getByGestureTestId(`swipe:${id}`), [
        { state: State.BEGAN, translationX: 0 },
        { state: State.ACTIVE, translationX: translationX / 2 },
        { state: State.ACTIVE, translationX },
        { state: State.END, translationX, velocityX },
      ]);
      jest.runAllTicks();
    });

  it('fait la tâche comme le bouton : même animation, même retour haptique, même annulation', async () => {
    const services = await createTestServices();
    const { tomatoWatering } = await addPotager(services);
    await renderScreen(<TodayScreen />, services);
    await screen.findByText('Arroser les tomates');

    await swipe(tomatoWatering.id, 160);

    expect(screen.getByLabelText(/^Fait : Arroser les tomates/)).toBeDisabled();
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    await letRowFold();

    expect(await screen.findByText('Noté au journal : arroser les tomates, Tomates')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Annuler'));
    expect(await screen.findByText('Arroser les tomates')).toBeOnTheScreen();
    await expect(services.journal.getAll()).resolves.toEqual([]);
  });

  it('suffit à être vif, à défaut d\'être long', async () => {
    const services = await createTestServices();
    const { tomatoWatering } = await addPotager(services);
    await renderScreen(<TodayScreen />, services);
    await screen.findByText('Arroser les tomates');

    await swipe(tomatoWatering.id, 60, 1200);

    expect(screen.getByLabelText(/^Fait : Arroser les tomates/)).toBeDisabled();
  });

  it('ne fait rien quand la ligne est lâchée avant le seuil', async () => {
    const services = await createTestServices();
    const { tomatoWatering } = await addPotager(services);
    await renderScreen(<TodayScreen />, services);
    await screen.findByText('Arroser les tomates');

    await swipe(tomatoWatering.id, 60);
    await letRowFold();

    expect(screen.getByLabelText(/^Fait : Arroser les tomates/)).toBeEnabled();
    await expect(services.journal.getAll()).resolves.toEqual([]);
  });
});
