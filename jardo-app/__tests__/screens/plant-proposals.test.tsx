import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';

import EntryFormScreen from '@/app/entry/form';
import PlantScreen from '@/app/plant/[id]';
import PlantFormScreen from '@/app/plant/form';
import TaskDoneScreen from '@/app/task/done';
import ZoneScreen from '@/app/zone/[id]';
import type { TaskInput } from '@/api/types';
import { createServices, type Services } from '@/data/services';

import { fixedClock } from '../../test/garden-data';
import { createTestDb } from '../../test/db';
import { renderScreen } from '../../test/render';

const day = '2026-11-04';

/** Un potager et sa parcelle, sur l'horloge du jour fixé : celle des services et celle de `useToday`. */
async function garden() {
  const services = createServices(await createTestDb(), fixedClock(day));
  const potager = await services.spaces.create({ name: 'Potager', kind: 'VegetableGarden' });
  const parcelle = await services.zones.create(potager.id, { name: 'Parcelle 1' });
  return { services, potager, parcelle };
}

const watering = (spaceId: string, zoneId: string | null = null): TaskInput => ({
  kind: 'Watering',
  recurrence: 'EveryNDays',
  intervalDays: 2,
  startDate: day,
  spaceId,
  zoneId,
});

const proposalSwitch = (name: string) => screen.findByRole('switch', { name });

async function openNewPlant(services: Services, spaceId: string, zoneId?: string) {
  jest.mocked(useLocalSearchParams).mockReturnValue({ spaceId, ...(zoneId ? { zoneId } : {}) });
  await renderScreen(<PlantFormScreen />, services);
  await screen.findByRole('button', { name: /^Espèce : / });
}

async function pickSpecies(query: string, name: string) {
  await fireEvent.press(screen.getByRole('button', { name: /^Espèce : / }));
  await fireEvent.changeText(screen.getByLabelText('Rechercher une espèce'), query);
  await fireEvent.press(await screen.findByRole('button', { name: new RegExp(`^${name},`) }));
}

async function openPlant(services: Services, id: string) {
  jest.mocked(useLocalSearchParams).mockReturnValue({ id });
  return renderScreen(<PlantScreen />, services);
}

const add = (name: string) => screen.findByRole('button', { name: `Ajouter : ${name}` });

describe('rappels proposés', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    jest.setSystemTime(new Date(2026, 10, 4, 12));
  });
  afterEach(() => jest.useRealTimers());

  describe('dans le formulaire', () => {
    it('n’apparaît que quand une espèce du catalogue est choisie, sans rien cocher', async () => {
      const { services, potager } = await garden();
      await openNewPlant(services, potager.id);

      expect(screen.queryByRole('header', { name: 'Rappels proposés' })).not.toBeOnTheScreen();
      await pickSpecies('tomate', 'Tomate');

      expect(await screen.findByRole('header', { name: 'Rappels proposés' })).toBeOnTheScreen();
      expect(screen.getByText('Arroser tous les 3 jours')).toBeOnTheScreen();
      expect(screen.getByText("à partir d'aujourd'hui")).toBeOnTheScreen();
      expect(await proposalSwitch("Arroser tous les 3 jours, à partir d'aujourd'hui")).not.toBeChecked();
      expect(await proposalSwitch('Semer sous abri, à partir de début mars 2027')).not.toBeChecked();
      expect(await proposalSwitch('Récolter, à partir de mi-juillet 2027')).not.toBeChecked();
    });

    it('ne crée rien de ce qui n’est pas coché', async () => {
      const { services, potager } = await garden();
      await openNewPlant(services, potager.id);
      await pickSpecies('tomate', 'Tomate');
      await proposalSwitch("Arroser tous les 3 jours, à partir d'aujourd'hui");

      await fireEvent.press(screen.getByRole('button', { name: 'Créer la plante' }));

      await waitFor(() => expect(router.back).toHaveBeenCalled());
      await expect(services.tasks.getAll()).resolves.toEqual([]);
    });

    it('crée les rappels cochés avec la plante, tels qu’ils se lisent', async () => {
      const { services, potager, parcelle } = await garden();
      await openNewPlant(services, potager.id, parcelle.id);
      await pickSpecies('tomate', 'Tomate');

      await fireEvent(await proposalSwitch("Arroser tous les 3 jours, à partir d'aujourd'hui"), 'valueChange', true);
      await fireEvent(await proposalSwitch('Semer sous abri, à partir de début mars 2027'), 'valueChange', true);
      await fireEvent.press(screen.getByRole('button', { name: 'Créer la plante' }));

      await waitFor(() => expect(router.back).toHaveBeenCalled());
      const [plant] = await services.plants.getAll();
      const tasks = await services.tasks.getAll({ itemId: plant.id });
      expect(tasks.map(({ kind, title, recurrence, intervalDays, startDate, zoneId, itemId }) => ({ kind, title, recurrence, intervalDays, startDate, zoneId, itemId }))).toEqual(
        expect.arrayContaining([
          { kind: 'Watering', title: null, recurrence: 'EveryNDays', intervalDays: 3, startDate: day, zoneId: parcelle.id, itemId: plant.id },
          { kind: 'Sowing', title: 'Semer sous abri', recurrence: 'Once', intervalDays: null, startDate: '2027-03-01', zoneId: parcelle.id, itemId: plant.id },
        ]),
      );
      expect(tasks).toHaveLength(2);
    });

    it('l’arrosage d’une autre zone ne couvre pas la plante, et la proposition suit la zone choisie', async () => {
      const { services, potager, parcelle } = await garden();
      const autre = await services.zones.create(potager.id, { name: 'Parcelle 2' });
      await services.tasks.create(watering(potager.id, autre.id));
      await openNewPlant(services, potager.id, parcelle.id);
      await pickSpecies('tomate', 'Tomate');

      expect(await proposalSwitch("Arroser tous les 3 jours, à partir d'aujourd'hui")).toBeOnTheScreen();

      await fireEvent.press(screen.getByText('Parcelle 2'));

      await waitFor(() =>
        expect(screen.queryByRole('switch', { name: "Arroser tous les 3 jours, à partir d'aujourd'hui" })).not.toBeOnTheScreen(),
      );
    });

    it('ne propose pas d’arroser une plante que son espace arrose déjà', async () => {
      const { services, potager } = await garden();
      await services.tasks.create(watering(potager.id));
      await openNewPlant(services, potager.id);
      await pickSpecies('tomate', 'Tomate');

      expect(await proposalSwitch('Récolter, à partir de mi-juillet 2027')).toBeOnTheScreen();
      expect(screen.queryByText('Arroser tous les 3 jours')).not.toBeOnTheScreen();
    });

    it('changer d’espèce retire ce qui était coché : l’accord portait sur une autre ligne', async () => {
      const { services, potager } = await garden();
      await openNewPlant(services, potager.id);
      await pickSpecies('tomate', 'Tomate');
      await fireEvent(await proposalSwitch("Arroser tous les 3 jours, à partir d'aujourd'hui"), 'valueChange', true);

      await pickSpecies('courgette', 'Courgette');
      await fireEvent.press(screen.getByRole('button', { name: 'Créer la plante' }));

      await waitFor(() => expect(router.back).toHaveBeenCalled());
      await expect(services.tasks.getAll()).resolves.toEqual([]);
    });

    it('à la modification, propose ce qui manque encore', async () => {
      const { services, potager } = await garden();
      const plant = await services.plants.create({ name: 'Tomates', speciesId: 'tomato', spaceId: potager.id });
      await services.tasks.create({ ...watering(potager.id), intervalDays: 3, itemId: plant.id });
      jest.mocked(useLocalSearchParams).mockReturnValue({ id: plant.id });
      await renderScreen(<PlantFormScreen />, services);

      await fireEvent(await proposalSwitch('Récolter, à partir de mi-juillet 2027'), 'valueChange', true);
      expect(screen.queryByText('Arroser tous les 3 jours')).not.toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'Enregistrer les modifications' }));

      await waitFor(() => expect(router.back).toHaveBeenCalled());
      const tasks = await services.tasks.getAll({ itemId: plant.id });
      expect(tasks.map((task) => task.kind).sort()).toEqual(['Harvest', 'Watering']);
    });

    it('une date de plantation retire la proposition de semer', async () => {
      const { services, potager } = await garden();
      const plant = await services.plants.create({ name: 'Tomates', speciesId: 'tomato', plantedDate: '2026-05-20', spaceId: potager.id });
      jest.mocked(useLocalSearchParams).mockReturnValue({ id: plant.id });
      await renderScreen(<PlantFormScreen />, services);

      await proposalSwitch('Récolter, à partir de mi-juillet 2027');
      expect(screen.queryByText('Semer sous abri')).not.toBeOnTheScreen();
    });

    it('rien pour une saisie libre', async () => {
      const { services, potager } = await garden();
      const plant = await services.plants.create({ name: 'Mystère', species: 'Inconnue', spaceId: potager.id });
      jest.mocked(useLocalSearchParams).mockReturnValue({ id: plant.id });
      await renderScreen(<PlantFormScreen />, services);

      await screen.findByRole('button', { name: /^Espèce : / });
      await waitFor(() => expect(screen.queryByRole('header', { name: 'Rappels proposés' })).not.toBeOnTheScreen());
    });
  });

  describe('sur la fiche', () => {
    it('un onglet vide montre les propositions, sous « Proposé pour la tomate »', async () => {
      const { services, potager } = await garden();
      const plant = await services.plants.create({ name: 'Mes plants', speciesId: 'tomato', spaceId: potager.id });
      await openPlant(services, plant.id);

      expect(await screen.findByRole('header', { name: 'Proposé pour la tomate' })).toBeOnTheScreen();
      expect(screen.queryByText('Aucune tâche pour cette plante.')).not.toBeOnTheScreen();
      expect(await add("Arroser tous les 3 jours, à partir d'aujourd'hui")).toBeOnTheScreen();
      expect(await add('Semer sous abri, à partir de début mars 2027')).toBeOnTheScreen();
      expect(await add('Récolter, à partir de mi-juillet 2027')).toBeOnTheScreen();
    });

    it('accorde l’article à l’espèce', async () => {
      const { services, potager } = await garden();
      const plant = await services.plants.create({ name: 'Mes plants', speciesId: 'garlic', spaceId: potager.id });
      await openPlant(services, plant.id);

      expect(await screen.findByRole('header', { name: "Proposé pour l'ail" })).toBeOnTheScreen();
    });

    it('« Ajouter » crée la tâche, retire la ligne et annonce « Rappel ajouté » avec « Modifier »', async () => {
      const { services, potager } = await garden();
      const plant = await services.plants.create({ name: 'Mes plants', speciesId: 'tomato', spaceId: potager.id });
      await openPlant(services, plant.id);

      await fireEvent.press(await add("Arroser tous les 3 jours, à partir d'aujourd'hui"));

      expect(await screen.findByText('Rappel ajouté : arroser tous les 3 jours')).toBeOnTheScreen();
      await waitFor(() => expect(screen.queryByText('Arroser tous les 3 jours')).not.toBeOnTheScreen());
      const [task] = await services.tasks.getAll({ itemId: plant.id });
      expect(task).toMatchObject({ kind: 'Watering', recurrence: 'EveryNDays', intervalDays: 3, startDate: day });

      await fireEvent.press(screen.getByText('Modifier'));
      expect(router.push).toHaveBeenCalledWith({ pathname: '/task/form', params: { id: task.id } });
    });

    it('« Annuler » retire la tâche et rend la proposition', async () => {
      const { services, potager } = await garden();
      const plant = await services.plants.create({ name: 'Mes plants', speciesId: 'tomato', spaceId: potager.id });
      await openPlant(services, plant.id);

      await fireEvent.press(await add("Arroser tous les 3 jours, à partir d'aujourd'hui"));
      await fireEvent.press(await screen.findByText('Annuler'));

      expect(await add("Arroser tous les 3 jours, à partir d'aujourd'hui")).toBeOnTheScreen();
      await expect(services.tasks.getAll({ itemId: plant.id })).resolves.toEqual([]);
    });

    it('garde les tâches au-dessus des propositions', async () => {
      const { services, potager } = await garden();
      const plant = await services.plants.create({ name: 'Mes plants', speciesId: 'tomato', spaceId: potager.id });
      await services.tasks.create({ ...watering(potager.id), itemId: plant.id });
      await openPlant(services, plant.id);

      expect(await screen.findByRole('header', { name: 'Proposé pour la tomate' })).toBeOnTheScreen();
      expect(screen.getByText('Arroser')).toBeOnTheScreen();
      expect(screen.queryByText('Arroser tous les 3 jours')).not.toBeOnTheScreen();
    });

    it.each(['zone', 'espace'])('une plante arrosée par ce qui la contient (%s) n’a pas de proposition d’arrosage', async (level) => {
      const { services, potager, parcelle } = await garden();
      const plant = await services.plants.create({ name: 'Mes plants', speciesId: 'tomato', spaceId: potager.id, zoneId: parcelle.id });
      await services.tasks.create(watering(potager.id, level === 'zone' ? parcelle.id : null));
      await openPlant(services, plant.id);

      expect(await add('Récolter, à partir de mi-juillet 2027')).toBeOnTheScreen();
      expect(screen.queryByText('Arroser tous les 3 jours')).not.toBeOnTheScreen();
    });

    it('propose de tailler et de récolter chaque année un fruitier, sans l’arroser', async () => {
      const { services } = await garden();
      const verger = await services.spaces.create({ name: 'Verger', kind: 'Orchard' });
      const plant = await services.plants.create({ name: 'Mon pommier', speciesId: 'apple-tree', plantedDate: '2020-03-01', spaceId: verger.id });
      await openPlant(services, plant.id);

      expect(await screen.findByRole('header', { name: 'Proposé pour le pommier' })).toBeOnTheScreen();
      expect(screen.getByText('Récolter chaque année')).toBeOnTheScreen();
      expect(screen.getByText('Tailler chaque année')).toBeOnTheScreen();
      expect(screen.queryByText(/^Arroser/)).not.toBeOnTheScreen();
      expect(screen.queryByText('Planter')).not.toBeOnTheScreen();
    });

    it('rien pour une plante sans espèce du catalogue, ni pour une plante archivée', async () => {
      const { services, potager } = await garden();
      const free = await services.plants.create({ name: 'Mystère', species: 'Inconnue', spaceId: potager.id });
      const archived = await services.plants.create({ name: 'Passée', speciesId: 'tomato', spaceId: potager.id });
      await services.plants.setArchived(archived.id, true);

      const first = await openPlant(services, free.id);
      expect(await screen.findByText('Aucune tâche pour cette plante.')).toBeOnTheScreen();
      expect(screen.queryByRole('header', { name: /^Proposé pour/ })).not.toBeOnTheScreen();
      await first.unmount();

      await openPlant(services, archived.id);
      expect(await screen.findByText('Aucune tâche pour cette plante.')).toBeOnTheScreen();
      expect(screen.queryByRole('header', { name: /^Proposé pour/ })).not.toBeOnTheScreen();
    });

    it('une zone ou un espace n’a pas de propositions : seule la fiche de la plante en montre', async () => {
      const { services, potager, parcelle } = await garden();
      await services.plants.create({ name: 'Mes plants', speciesId: 'tomato', spaceId: potager.id, zoneId: parcelle.id });
      jest.mocked(useLocalSearchParams).mockReturnValue({ id: parcelle.id });
      await renderScreen(<ZoneScreen />, services);

      await screen.findByText('Parcelle 1');
      expect(screen.queryByRole('header', { name: /^Proposé pour/ })).not.toBeOnTheScreen();
    });
  });

  describe('l’unité de récolte par défaut', () => {
    async function harvestPlant(speciesId: string | undefined = 'zucchini') {
      const { services, potager } = await garden();
      const plant = await services.plants.create({ name: 'Mes plants', speciesId, spaceId: potager.id });
      return { services, potager, plant };
    }

    const noteHarvest = (services: Services, spaceId: string, itemId: string, quantityUnit: 'Grams' | 'Kilograms') =>
      services.journal.create({ kind: 'Harvest', date: day, quantity: 2, quantityUnit, spaceId, itemId });

    async function openEntry(services: Services, spaceId: string, itemId: string) {
      jest.mocked(useLocalSearchParams).mockReturnValue({ spaceId, itemId, label: 'Mes plants' });
      await renderScreen(<EntryFormScreen />, services);
      await fireEvent.press(await screen.findByText('Récolte'));
    }

    const unitChip = (label: string) => screen.getByRole('radio', { name: label });

    it('coche dans le formulaire l’unité de l’espèce', async () => {
      const { services, potager, plant } = await harvestPlant();
      await openEntry(services, potager.id, plant.id);

      expect(unitChip('pièces')).toBeChecked();
    });

    it('le formulaire d’intervention prend celle de l’espèce', async () => {
      const { services, potager, plant } = await harvestPlant();
      await openEntry(services, potager.id, plant.id);

      await fireEvent.changeText(screen.getByLabelText('Quantité récoltée'), '3');
      await fireEvent.press(screen.getByRole('button', { name: "Noter l'intervention" }));

      await waitFor(() => expect(router.back).toHaveBeenCalled());
      await expect(services.journal.getAll()).resolves.toMatchObject([{ quantity: 3, quantityUnit: 'Pieces' }]);
    });

    it('la dernière récolte de la plante passe avant l’espèce', async () => {
      const { services, potager, plant } = await harvestPlant();
      await noteHarvest(services, potager.id, plant.id, 'Grams');
      await openEntry(services, potager.id, plant.id);

      await fireEvent.changeText(screen.getByLabelText('Quantité récoltée'), '3');
      await fireEvent.press(screen.getByRole('button', { name: "Noter l'intervention" }));

      await waitFor(() => expect(router.back).toHaveBeenCalled());
      const entries = await services.journal.getAll();
      expect(entries.map((entry) => entry.quantityUnit)).toEqual(['Grams', 'Grams']);
    });

    it('sans plante visée, reste aux kilos', async () => {
      const { services, potager } = await harvestPlant();
      jest.mocked(useLocalSearchParams).mockReturnValue({ spaceId: potager.id, label: 'Potager' });
      await renderScreen(<EntryFormScreen />, services);
      await fireEvent.press(await screen.findByText('Récolte'));

      await fireEvent.changeText(screen.getByLabelText('Quantité récoltée'), '3');
      await fireEvent.press(screen.getByRole('button', { name: "Noter l'intervention" }));

      await waitFor(() => expect(router.back).toHaveBeenCalled());
      await expect(services.journal.getAll()).resolves.toMatchObject([{ quantityUnit: 'Kilograms' }]);
    });

    it('le « Fait » précisé d’une récolte prend la même unité et note la quantité', async () => {
      const { services, potager, plant } = await harvestPlant();
      const task = await services.tasks.create({
        kind: 'Harvest',
        recurrence: 'Once',
        startDate: day,
        spaceId: potager.id,
        itemId: plant.id,
      });
      jest.mocked(useLocalSearchParams).mockReturnValue({ id: task.id });
      await renderScreen(<TaskDoneScreen />, services);

      await fireEvent.changeText(await screen.findByLabelText('Quantité récoltée'), '4');
      await fireEvent.press(screen.getByRole('button', { name: 'Noter comme fait' }));

      await waitFor(() => expect(router.back).toHaveBeenCalled());
      await expect(services.journal.getAll()).resolves.toMatchObject([{ kind: 'Harvest', quantity: 4, quantityUnit: 'Pieces' }]);
      await expect(services.tasks.getById(task.id)).resolves.toMatchObject({ isCompleted: true });
    });

    it('le « Fait » précisé d’une autre tâche ne demande pas de quantité', async () => {
      const { services, potager, plant } = await harvestPlant();
      const task = await services.tasks.create({ ...watering(potager.id), itemId: plant.id });
      jest.mocked(useLocalSearchParams).mockReturnValue({ id: task.id });
      await renderScreen(<TaskDoneScreen />, services);

      await screen.findByRole('button', { name: 'Noter comme fait' });
      expect(screen.queryByLabelText('Quantité récoltée')).not.toBeOnTheScreen();
    });

    it('laisse choisir une autre unité', async () => {
      const { services, potager, plant } = await harvestPlant();
      await openEntry(services, potager.id, plant.id);

      await fireEvent.changeText(screen.getByLabelText('Quantité récoltée'), '3');
      await fireEvent.press(unitChip('g'));
      await fireEvent.press(screen.getByRole('button', { name: "Noter l'intervention" }));

      await waitFor(() => expect(router.back).toHaveBeenCalled());
      await expect(services.journal.getAll()).resolves.toMatchObject([{ quantityUnit: 'Grams' }]);
    });
  });
});
