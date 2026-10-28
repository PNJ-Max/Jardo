import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import TodayScreen from '@/app/(tabs)/today';
import { businessRule } from '@/data/problem';
import type { Services } from '@/data/services';
import { addDays } from '@/domain/dates';
import { today } from '@/lib/dates';
import { palettes } from '@/theme/colors';

import { createTestServices, pictogramsOnScreen, renderScreen } from '../../test/render';

const inDays = (days: number) => addDays(today(), days);

/** En retard de deux jours, sur les tomates du potager ; « Fait » la renvoie à dix jours, hors de la semaine. */
async function addOverdue(services: Services) {
  const potager = await services.spaces.create({ name: 'Potager', kind: 'VegetableGarden' });
  const tomates = await services.plants.create({ name: 'Tomates', quantity: 3, quantityUnit: 'Plants', spaceId: potager.id });
  return services.tasks.create({
    kind: 'Watering',
    title: 'Arroser les tomates',
    recurrence: 'EveryNDays',
    intervalDays: 10,
    startDate: inDays(-2),
    spaceId: potager.id,
    itemId: tomates.id,
  });
}

async function addDueToday(services: Services) {
  const verger = await services.spaces.create({ name: 'Verger', kind: 'Orchard' });
  return services.tasks.create({ kind: 'Pruning', recurrence: 'Once', startDate: today(), spaceId: verger.id });
}

async function addThisWeek(services: Services) {
  const serre = await services.spaces.create({ name: 'Serre', kind: 'Greenhouse' });
  return services.tasks.create({ kind: 'Treatment', recurrence: 'Once', startDate: inDays(4), spaceId: serre.id });
}

/** Une promesse que le test libère quand il le décide, pour observer l'écran pendant l'attente. */
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

describe("écran Aujourd'hui", () => {
  it('range les tâches en retard, du jour et de la semaine dans leurs sections', async () => {
    const services = await createTestServices();
    await addOverdue(services);
    await addDueToday(services);
    await addThisWeek(services);
    await renderScreen(<TodayScreen />, services);

    expect(await screen.findByText('En retard')).toBeOnTheScreen();
    expect(screen.getByText("Aujourd'hui")).toBeOnTheScreen();
    expect(screen.getByText('Cette semaine')).toBeOnTheScreen();

    expect(screen.getByText('Arroser les tomates')).toBeOnTheScreen();
    expect(screen.getByText('En retard de 2 j')).toBeOnTheScreen();
    expect(screen.getByText('Tailler')).toBeOnTheScreen();
    expect(screen.getByText('Traiter')).toBeOnTheScreen();
    // Le voyant vient du domaine : « Prochain : » reprend nextDueDate sans recalcul.
    expect(screen.getByText(/Prochain : /)).toBeOnTheScreen();
  });

  it("colore le voyant du jour en terre, et en bleu pour l'arrosage", async () => {
    const services = await createTestServices();
    await addDueToday(services);
    const potager = await services.spaces.create({ name: 'Potager', kind: 'VegetableGarden' });
    await services.tasks.create({ kind: 'Watering', recurrence: 'Once', startDate: today(), spaceId: potager.id });
    await renderScreen(<TodayScreen />, services);

    expect(await screen.findByText("À faire aujourd'hui")).toHaveStyle({ color: palettes.light.soil });
    expect(screen.getByText("À arroser aujourd'hui")).toHaveStyle({ color: palettes.light.water });
  });

  it("pose le pictogramme de l'intervention sur la ligne, sans rien changer à ce qui est lu", async () => {
    const services = await createTestServices();
    await addOverdue(services);
    await addDueToday(services);
    await renderScreen(<TodayScreen />, services);

    expect(await screen.findByText('Tailler')).toBeOnTheScreen();
    expect(pictogramsOnScreen().filter((key) => !key.startsWith('done-'))).toEqual(['Watering:light', 'Pruning:light']);
    expect(screen.getByRole('button', { name: 'Fait : Arroser les tomates, Tomates · Potager' })).toBeOnTheScreen();
  });

  it("n'affiche pas les sections vides", async () => {
    const services = await createTestServices();
    await addDueToday(services);
    await renderScreen(<TodayScreen />, services);

    expect(await screen.findByText("Aujourd'hui")).toBeOnTheScreen();
    expect(screen.queryByText('En retard')).not.toBeOnTheScreen();
    expect(screen.queryByText('Cette semaine')).not.toBeOnTheScreen();
  });

  it("dit « rien aujourd'hui » avant de montrer les tâches de la semaine", async () => {
    const services = await createTestServices();
    await addThisWeek(services);
    await renderScreen(<TodayScreen />, services);

    expect(await screen.findByText("Rien à faire aujourd'hui 🌱")).toBeOnTheScreen();
    expect(screen.getByText('Cette semaine')).toBeOnTheScreen();
  });

  it("montre l'état vide quand il n'y a aucune tâche", async () => {
    await renderScreen(<TodayScreen />);

    expect(await screen.findByText("Rien à faire aujourd'hui 🌱")).toBeOnTheScreen();
    expect(screen.getByText("Ni cette semaine, d'ailleurs.")).toBeOnTheScreen();
  });

  it("affiche l'erreur de lecture et permet de réessayer", async () => {
    const services = await createTestServices();
    await addDueToday(services);
    jest.spyOn(services.tasks, 'getDue').mockRejectedValueOnce(new Error('Base indisponible'));
    await renderScreen(<TodayScreen />, services);

    expect(await screen.findByText('Base indisponible')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Réessayer'));
    expect(await screen.findByText('Tailler')).toBeOnTheScreen();
  });

  describe('« Fait »', () => {
    const doneLabel = /^Fait : Arroser les tomates/;
    const noted = 'Noté au journal : arroser les tomates, Tomates';

    // La ligne célèbre puis se replie avant que la tâche soit notée : le test fait passer ce temps.
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());
    const letRowFold = () => act(() => jest.advanceTimersByTime(1200));

    async function setup() {
      const services = await createTestServices();
      await addOverdue(services);
      await addDueToday(services);
      return services;
    }

    it("garde la ligne le temps de l'animation, puis la retire avant la fin de l'écriture", async () => {
      const services = await setup();
      const gate = deferred();
      const complete = services.tasks.complete;
      jest.spyOn(services.tasks, 'complete').mockImplementationOnce(async (...args) => {
        await gate.promise;
        return complete(...args);
      });
      await renderScreen(<TodayScreen />, services);

      await fireEvent.press(await screen.findByLabelText(doneLabel));

      expect(screen.getByText('Arroser les tomates')).toBeOnTheScreen();
      expect(screen.getByLabelText(doneLabel)).toBeDisabled();
      expect(screen.getByText('Noté')).toBeOnTheScreen();
      expect(services.tasks.complete).not.toHaveBeenCalled();

      await letRowFold();

      await waitFor(() => expect(screen.queryByText('Arroser les tomates')).not.toBeOnTheScreen());
      expect(screen.queryByText('En retard')).not.toBeOnTheScreen();
      expect(screen.getByText('Tailler')).toBeOnTheScreen();

      gate.resolve();
      expect(await screen.findByText(noted)).toBeOnTheScreen();
    });

    it('note la tâche aussitôt quand le téléphone réduit les animations', async () => {
      jest.mocked(useReducedMotion).mockReturnValue(true);
      try {
        const services = await setup();
        await renderScreen(<TodayScreen />, services);

        await fireEvent.press(await screen.findByLabelText(doneLabel));

        await waitFor(() => expect(screen.queryByText('Arroser les tomates')).not.toBeOnTheScreen());
        expect(await screen.findByText(noted)).toBeOnTheScreen();
      } finally {
        jest.mocked(useReducedMotion).mockReturnValue(false);
      }
    });

    it('donne un retour haptique léger au toucher', async () => {
      const services = await setup();
      await renderScreen(<TodayScreen />, services);

      await fireEvent.press(await screen.findByLabelText(doneLabel));

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it("propose d'annuler, ce qui supprime l'entrée notée et ramène la tâche", async () => {
      const services = await setup();
      await renderScreen(<TodayScreen />, services);

      await fireEvent.press(await screen.findByLabelText(doneLabel));
      await letRowFold();

      expect(await screen.findByText(noted)).toBeOnTheScreen();
      await waitFor(() => expect(screen.queryByText('Arroser les tomates')).not.toBeOnTheScreen());
      await expect(services.journal.getAll()).resolves.toHaveLength(1);

      await fireEvent.press(screen.getByText('Annuler'));

      expect(await screen.findByText('Arroser les tomates')).toBeOnTheScreen();
      await expect(services.journal.getAll()).resolves.toEqual([]);
      expect(screen.queryByText(/^Noté/)).not.toBeOnTheScreen();
    });

    it("ouvre l'entrée notée pour y ajouter une note, sans rien annuler", async () => {
      const services = await setup();
      await renderScreen(<TodayScreen />, services);

      await fireEvent.press(await screen.findByLabelText(doneLabel));
      await letRowFold();
      await fireEvent.press(await screen.findByText('Ajouter une note'));

      const [entry] = await services.journal.getAll();
      expect(router.push).toHaveBeenCalledWith({ pathname: '/entry/form', params: { id: String(entry.id) } });
      expect(screen.queryByText(noted)).not.toBeOnTheScreen();
      await waitFor(() => expect(screen.queryByText('Arroser les tomates')).not.toBeOnTheScreen());
      await expect(services.journal.getAll()).resolves.toHaveLength(1);
    });

    it("remet la tâche et prévient quand l'écriture est refusée", async () => {
      const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const services = await setup();
      jest.spyOn(services.tasks, 'complete').mockRejectedValueOnce(businessRule('Refusé.'));
      await renderScreen(<TodayScreen />, services);

      await fireEvent.press(await screen.findByLabelText(doneLabel));
      await letRowFold();

      await waitFor(() => expect(alert).toHaveBeenCalledWith("La tâche n'a pas été notée", 'Refusé.'));
      expect(await screen.findByText('Arroser les tomates')).toBeOnTheScreen();
      await waitFor(() => expect(screen.getByLabelText(doneLabel)).toBeEnabled());
      expect(screen.queryByText(/^Noté/)).not.toBeOnTheScreen();
    });
  });
});
