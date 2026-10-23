import { fireEvent, screen } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';

import SpaceScreen from '@/app/space/[id]';
import { addDays } from '@/domain/dates';
import { today } from '@/lib/dates';

import { createTestServices, renderScreen } from '../../test/render';

/** Le potager, son carré 4 et ses laitues ; une tâche sur tout l'espace, une sur les laitues. */
async function setup() {
  const services = await createTestServices();
  const potager = await services.spaces.create({ name: 'Potager', kind: 'VegetableGarden' });
  const carre = await services.zones.create(potager.id, { name: 'Carré 4' });
  const laitues = await services.plants.create({
    name: 'Laitues',
    quantity: 12,
    quantityUnit: 'Plants',
    spaceId: potager.id,
    zoneId: carre.id,
  });
  await services.tasks.create({
    kind: 'Other',
    title: 'Désherber les allées',
    recurrence: 'Once',
    startDate: addDays(today(), -4),
    spaceId: potager.id,
  });
  await services.tasks.create({
    kind: 'Watering',
    recurrence: 'EveryNDays',
    intervalDays: 3,
    startDate: today(),
    spaceId: potager.id,
    itemId: laitues.id,
  });

  jest.mocked(useLocalSearchParams).mockReturnValue({ id: potager.id });
  return services;
}

describe('fiche espace', () => {
  it('replie les tâches de ses zones et éléments sous les siennes, en nommant leur cible', async () => {
    await renderScreen(<SpaceScreen />, await setup());

    expect(await screen.findByText('Désherber les allées')).toBeOnTheScreen();
    expect(screen.getByText('Ajouter une tâche à cet espace')).toBeOnTheScreen();
    expect(screen.queryByText('Arroser')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByText('Tâches des zones et des éléments'));

    expect(screen.getByText('Arroser')).toBeOnTheScreen();
    expect(screen.getByText('Laitues · Carré 4 · Potager')).toBeOnTheScreen();
  });

  it("montre zones et plantes dans l'onglet Contenu", async () => {
    await renderScreen(<SpaceScreen />, await setup());

    await fireEvent.press(await screen.findByRole('tab', { name: 'Contenu' }));

    expect(await screen.findByText('Laitues')).toBeOnTheScreen();
    expect(screen.getAllByText('Carré 4').length).toBeGreaterThan(0);
    expect(screen.getByText('Ajouter une zone')).toBeOnTheScreen();
  });
});
