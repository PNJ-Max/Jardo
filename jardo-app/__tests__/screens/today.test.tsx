import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import TodayScreen from '@/app/(tabs)/today';
import { businessRule } from '@/data/problem';
import type { Services } from '@/data/services';
import { addDays } from '@/domain/dates';
import { today } from '@/lib/dates';
import { palettes } from '@/theme/colors';

import { createTestServices, renderScreen } from '../../test/render';

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

    async function setup() {
      const services = await createTestServices();
      await addOverdue(services);
      await addDueToday(services);
      return services;
    }

    it("retire la tâche aussitôt, avant la fin de l'écriture", async () => {
      const services = await setup();
      const gate = deferred();
      const complete = services.tasks.complete;
      jest.spyOn(services.tasks, 'complete').mockImplementationOnce(async (...args) => {
        await gate.promise;
        return complete(...args);
      });
      await renderScreen(<TodayScreen />, services);

      await fireEvent.press(await screen.findByLabelText(doneLabel));

      await waitFor(() => expect(screen.queryByText('Arroser les tomates')).not.toBeOnTheScreen());
      expect(screen.queryByText('En retard')).not.toBeOnTheScreen();
      expect(screen.getByText('Tailler')).toBeOnTheScreen();

      gate.resolve();
      expect(await screen.findByText(/^Noté/)).toBeOnTheScreen();
    });

    it("propose d'annuler, ce qui supprime l'entrée notée et ramène la tâche", async () => {
      const services = await setup();
      await renderScreen(<TodayScreen />, services);

      await fireEvent.press(await screen.findByLabelText(doneLabel));

      expect(await screen.findByText('Noté : Arroser les tomates · Tomates')).toBeOnTheScreen();
      expect(screen.queryByText('Arroser les tomates')).not.toBeOnTheScreen();
      await expect(services.journal.getAll()).resolves.toHaveLength(1);

      await fireEvent.press(screen.getByText('Annuler'));

      expect(await screen.findByText('Arroser les tomates')).toBeOnTheScreen();
      await expect(services.journal.getAll()).resolves.toEqual([]);
      expect(screen.queryByText(/^Noté/)).not.toBeOnTheScreen();
    });

    it("remet la tâche et prévient quand l'écriture est refusée", async () => {
      const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const services = await setup();
      jest.spyOn(services.tasks, 'complete').mockRejectedValueOnce(businessRule('Refusé.'));
      await renderScreen(<TodayScreen />, services);

      await fireEvent.press(await screen.findByLabelText(doneLabel));

      await waitFor(() => expect(alert).toHaveBeenCalledWith("La tâche n'a pas été notée", 'Refusé.'));
      expect(await screen.findByText('Arroser les tomates')).toBeOnTheScreen();
      expect(screen.queryByText(/^Noté/)).not.toBeOnTheScreen();
    });
  });
});
