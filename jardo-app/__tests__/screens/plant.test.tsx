import { fireEvent, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';

import PlantScreen from '@/app/plant/[id]';
import { addDays } from '@/domain/dates';
import { today } from '@/lib/dates';

import { createTestServices, renderScreen } from '../../test/render';

const inDays = (days: number) => addDays(today(), days);

/** Les laitues de la parcelle 4, avec une tâche à elles, une de leur parcelle et une de tout le potager. */
async function setup({ onlyZoneTask = false } = {}) {
  const services = await createTestServices();
  const potager = await services.spaces.create({ name: 'Potager', kind: 'VegetableGarden' });
  const parcelle = await services.zones.create(potager.id, { name: 'Parcelle 4' });
  const laitues = await services.plants.create({
    name: 'Laitues',
    species: 'Lactuca sativa',
    variety: 'Batavia blonde',
    quantity: 12,
    quantityUnit: 'Plants',
    plantedDate: inDays(-30),
    spaceId: potager.id,
    zoneId: parcelle.id,
  });

  if (!onlyZoneTask) {
    await services.tasks.create({
      kind: 'Pruning',
      title: 'Pincer les fleurs',
      recurrence: 'Once',
      startDate: inDays(10),
      spaceId: potager.id,
      itemId: laitues.id,
    });
    await services.tasks.create({
      kind: 'Other',
      title: 'Désherber les allées',
      recurrence: 'Once',
      startDate: inDays(-4),
      spaceId: potager.id,
    });
  }
  await services.tasks.create({
    kind: 'Watering',
    title: 'Arroser la parcelle',
    recurrence: 'Once',
    startDate: today(),
    spaceId: potager.id,
    zoneId: parcelle.id,
  });

  jest.mocked(useLocalSearchParams).mockReturnValue({ id: laitues.id });
  return { services, potager, parcelle, laitues };
}

describe('fiche plante', () => {
  it("garde l'en-tête visible et ouvre l'onglet Tâches", async () => {
    const { services } = await setup();
    await renderScreen(<PlantScreen />, services);

    expect(await screen.findByText('Laitues')).toBeOnTheScreen();
    expect(screen.getByText('Parcelle 4 · Potager')).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Tâches', selected: true })).toBeOnTheScreen();
    expect(await screen.findByText('Pincer les fleurs')).toBeOnTheScreen();
  });

  it('note « Fait » aussitôt, et la ligne reste sur la fiche avec sa nouvelle échéance', async () => {
    const { services } = await setup();
    await renderScreen(<PlantScreen />, services);

    await fireEvent.press(await screen.findByLabelText(/^Fait : Pincer les fleurs/));

    expect(await screen.findByText('Noté au journal : pincer les fleurs, Laitues')).toBeOnTheScreen();
    expect(await screen.findByText(/^Faite le /)).toBeOnTheScreen();
    expect(screen.getByText('Pincer les fleurs')).toBeOnTheScreen();
    await expect(services.journal.getAll()).resolves.toHaveLength(1);
  });

  it("range à part, repliées, les tâches de la zone et de l'espace", async () => {
    const { services } = await setup();
    await renderScreen(<PlantScreen />, services);

    expect(await screen.findByText('Valent aussi pour cette plante')).toBeOnTheScreen();
    expect(screen.getByText('Parcelle 4')).toBeOnTheScreen();
    expect(screen.getByText(/1 aujourd'hui/)).toBeOnTheScreen();
    expect(screen.getByText(/1 en retard/)).toBeOnTheScreen();
    expect(screen.queryByText('Arroser la parcelle')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByText('Parcelle 4'));

    expect(screen.getByText('Arroser la parcelle')).toBeOnTheScreen();
    expect(screen.queryByText('Désherber les allées')).not.toBeOnTheScreen();
  });

  it('crée une nouvelle tâche sur la plante, pas sur sa zone', async () => {
    const { services, potager, parcelle, laitues } = await setup({ onlyZoneTask: true });
    await renderScreen(<PlantScreen />, services);

    expect(await screen.findByText('Aucune tâche pour cette plante.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Ajouter une tâche à cette plante' }));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/task/form',
      params: expect.objectContaining({ itemId: laitues.id, itemKind: 'Plant', zoneId: parcelle.id, spaceId: potager.id }),
    });
  });

  it("montre les détails et les actions dans l'onglet Infos", async () => {
    const { services } = await setup();
    await renderScreen(<PlantScreen />, services);

    await fireEvent.press(await screen.findByRole('tab', { name: 'Infos' }));

    expect(screen.getByText(/Variété :/)).toBeOnTheScreen();
    expect(screen.getByText('Modifier')).toBeOnTheScreen();
    expect(screen.queryByText('Pincer les fleurs')).not.toBeOnTheScreen();
  });

  it("ne charge le journal qu'à l'ouverture de son onglet", async () => {
    const { services } = await setup();
    const readJournal = jest.spyOn(services.journal, 'getAll');
    await renderScreen(<PlantScreen />, services);
    await screen.findByText('Pincer les fleurs');
    expect(readJournal).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('tab', { name: 'Journal' }));

    expect(await screen.findByText("Rien de noté pour l'instant.")).toBeOnTheScreen();
  });
});
