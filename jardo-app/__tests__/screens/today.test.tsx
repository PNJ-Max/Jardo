import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import TodayScreen from '@/app/(tabs)/today';
import { longDay } from '@/components/today';
import { businessRule } from '@/data/problem';
import type { Services } from '@/data/services';
import { addDays } from '@/domain/dates';
import { formatDate, today } from '@/lib/dates';
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
  it("dit la date et combien de choses attendent, dont combien en retard", async () => {
    const services = await createTestServices();
    await addOverdue(services);
    await addDueToday(services);
    await addThisWeek(services);
    await renderScreen(<TodayScreen />, services);

    expect(await screen.findByText(longDay(today()))).toBeOnTheScreen();
    expect(screen.getByText('2 choses à faire au jardin, dont 1 en retard')).toBeOnTheScreen();
  });

  it("met les retards à part, les plus en retard d'abord, en disant de combien", async () => {
    const services = await createTestServices();
    const { spaceId } = await addOverdue(services);
    await services.tasks.create({ kind: 'Sowing', recurrence: 'Once', startDate: inDays(-1), spaceId });
    await renderScreen(<TodayScreen />, services);

    expect(await screen.findByText(/^En retard/)).toHaveStyle({ color: palettes.light.danger });
    expect(screen.getAllByText(/^en retard de/).map((node) => node.props.children)).toEqual([
      'en retard de 2 jours',
      'en retard de 1 jour',
    ]);
    expect(screen.getByText(/^Tomates · Potager,/)).toBeOnTheScreen();
    expect(screen.queryByText(/^Aujourd'hui/)).not.toBeOnTheScreen();
  });

  it("range aujourd'hui par espace, le plus chargé d'abord et l'arrosage en tête, avec la cible et le rythme", async () => {
    const services = await createTestServices();
    await addDueToday(services);
    const potager = await services.spaces.create({ name: 'Potager', kind: 'VegetableGarden' });
    const carre = await services.zones.create(potager.id, { name: 'Carré 1' });
    await services.tasks.create({ kind: 'Pruning', recurrence: 'Once', startDate: today(), spaceId: potager.id });
    await services.tasks.create({
      kind: 'Watering',
      recurrence: 'EveryNDays',
      intervalDays: 3,
      startDate: today(),
      spaceId: potager.id,
      zoneId: carre.id,
    });
    await renderScreen(<TodayScreen />, services);

    expect(await screen.findByText(/^Aujourd'hui/)).toBeOnTheScreen();
    expect(screen.getAllByText(/^(Potager|Verger)$/).map((node) => node.props.children)).toEqual(['Potager', 'Verger']);
    expect(pictogramsOnScreen().filter((key) => !key.startsWith('done-'))).toEqual([
      'Watering:light',
      'Pruning:light',
      'Pruning:light',
    ]);
    expect(screen.getByText('Carré 1, tous les 3 jours')).toBeOnTheScreen();
    expect(screen.getAllByText('Une seule fois')).toHaveLength(2);
    // La section donne l'échéance : la ligne ne la répète pas.
    expect(screen.queryByText("À faire aujourd'hui")).not.toBeOnTheScreen();
    expect(screen.queryByText('Traiter')).not.toBeOnTheScreen();
  });

  it('montre la semaine, et ce qui est prévu le jour touché', async () => {
    const services = await createTestServices();
    await addOverdue(services);
    await addDueToday(services);
    await addThisWeek(services);
    await renderScreen(<TodayScreen />, services);

    const days = await screen.findAllByRole('tab');
    expect(days).toHaveLength(7);
    expect(days[0]).toHaveAccessibleName("Aujourd'hui, du retard");
    expect(days[0]).toBeSelected();
    expect(days[1]).toHaveAccessibleName(`${longDay(inDays(1))}, rien de prévu`);
    expect(days[4]).toHaveAccessibleName(`${longDay(inDays(4))}, quelque chose de prévu`);
    expect(screen.queryByText('Traiter')).not.toBeOnTheScreen();

    await fireEvent.press(days[4]);

    expect(screen.getByRole('tab', { selected: true })).toHaveAccessibleName(`${longDay(inDays(4))}, quelque chose de prévu`);
    expect(screen.getByText(new RegExp(`^${longDay(inDays(4))}`))).toBeOnTheScreen();
    expect(screen.getByText('Traiter')).toBeOnTheScreen();
    expect(screen.queryByText('Tailler')).not.toBeOnTheScreen();
    // Les retards restent en tête, quel que soit le jour.
    expect(screen.getByText('Arroser les tomates')).toBeOnTheScreen();

    await fireEvent.press(days[1]);
    expect(screen.getByText(/^Demain/)).toBeOnTheScreen();
    expect(screen.getByText('Rien de prévu ce jour-là.')).toBeOnTheScreen();
  });

  it('replie « Dans le mois » sur une ligne qui nomme les tâches annuelles et ponctuelles, et la déplie', async () => {
    const services = await createTestServices();
    const verger = await services.spaces.create({ name: 'Verger', kind: 'Orchard' });
    await services.tasks.create({
      kind: 'Pruning',
      title: 'Tailler les pommiers',
      recurrence: 'Yearly',
      startDate: inDays(12),
      spaceId: verger.id,
    });
    await services.tasks.create({ kind: 'Treatment', recurrence: 'Once', startDate: inDays(20), spaceId: verger.id });
    await services.tasks.create({ kind: 'Watering', recurrence: 'EveryNDays', intervalDays: 3, startDate: inDays(2), spaceId: verger.id });
    await renderScreen(<TodayScreen />, services);

    const line = await screen.findByRole('button', { name: /Tailler les pommiers, traiter \(Verger\)/ });
    expect(line).toBeCollapsed();
    expect(screen.queryByText('Tailler les pommiers')).not.toBeOnTheScreen();

    await fireEvent.press(line);

    expect(line).toBeExpanded();
    expect(screen.getByText('Tailler les pommiers')).toBeOnTheScreen();
    expect(screen.getByText(`Verger, ${formatDate(inDays(12))}`)).toBeOnTheScreen();
    expect(screen.getByText('Traiter')).toBeOnTheScreen();
    expect(screen.queryByText('Arroser')).not.toBeOnTheScreen();
  });

  it("dit qu'il n'y a rien à faire aujourd'hui, puis ce qui vient demain", async () => {
    const services = await createTestServices();
    const serre = await services.spaces.create({ name: 'Serre', kind: 'Greenhouse' });
    await services.tasks.create({ kind: 'Watering', title: 'Arroser la serre', recurrence: 'Once', startDate: inDays(1), spaceId: serre.id });
    await renderScreen(<TodayScreen />, services);

    expect(await screen.findByText("Rien à faire aujourd'hui")).toBeOnTheScreen();
    expect(screen.getByText("Tout est fait pour aujourd'hui. Demain : arroser la serre, Serre.")).toBeOnTheScreen();
    expect(screen.getByText(/^Demain/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Fait : Arroser la serre, Serre' })).toBeOnTheScreen();
  });

  it("montre l'état vide quand il n'y a aucune tâche", async () => {
    await renderScreen(<TodayScreen />);

    expect(await screen.findByText("Rien à faire aujourd'hui")).toBeOnTheScreen();
    expect(screen.getByText("Tout est fait pour aujourd'hui.")).toBeOnTheScreen();
    expect(screen.queryByText(/^Demain/)).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Ouvrir le jardin' }));
    expect(router.push).toHaveBeenCalledWith('/');
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

  it("affiche l'erreur de lecture et permet de réessayer", async () => {
    const services = await createTestServices();
    await addDueToday(services);
    jest.spyOn(services.tasks, 'getDue').mockRejectedValueOnce(new Error('Base indisponible'));
    await renderScreen(<TodayScreen />, services);

    expect(await screen.findByText('Base indisponible')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Réessayer' }));
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
      expect(screen.queryByText(/^En retard/)).not.toBeOnTheScreen();
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

    it("note en avance une tâche d'un autre jour, et l'annulation la ramène", async () => {
      const services = await createTestServices();
      await addThisWeek(services);
      await renderScreen(<TodayScreen />, services);

      await fireEvent.press((await screen.findAllByRole('tab'))[4]);
      await fireEvent.press(screen.getByLabelText(/^Fait : Traiter/));
      await letRowFold();

      expect(await screen.findByText('Noté au journal : traiter, Serre')).toBeOnTheScreen();
      await waitFor(() => expect(screen.queryByLabelText(/^Fait : Traiter/)).not.toBeOnTheScreen());

      await fireEvent.press(screen.getByText('Annuler'));

      expect(await screen.findByLabelText(/^Fait : Traiter/)).toBeOnTheScreen();
      await expect(services.journal.getAll()).resolves.toEqual([]);
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
