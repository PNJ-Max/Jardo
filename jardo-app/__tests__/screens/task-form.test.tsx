import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';

import TaskFormScreen from '@/app/task/form';
import { today } from '@/lib/dates';

import { createTestServices, renderScreen } from '../../test/render';

async function setup() {
  const services = await createTestServices();
  const potager = await services.spaces.create({ name: 'Potager', kind: 'VegetableGarden' });
  return { services, potager };
}

describe('formulaire de tâche', () => {
  it('crée une tâche récurrente', async () => {
    const { services, potager } = await setup();
    jest.mocked(useLocalSearchParams).mockReturnValue({ spaceId: potager.id, label: 'Potager' });
    await renderScreen(<TaskFormScreen />, services);

    expect(screen.getByText('Nouvelle tâche')).toBeOnTheScreen();
    await fireEvent.press(await screen.findByText('Arroser'));
    await fireEvent.press(screen.getByRole('button', { name: 'Créer la tâche' }));

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    await expect(services.tasks.getAll()).resolves.toMatchObject([
      { kind: 'Watering', recurrence: 'EveryNDays', intervalDays: 3, startDate: today() },
    ]);
  });

  it("montre sous le champ un rythme hors limites et n'enregistre rien", async () => {
    const { services, potager } = await setup();
    jest.mocked(useLocalSearchParams).mockReturnValue({ spaceId: potager.id, label: 'Potager' });
    await renderScreen(<TaskFormScreen />, services);

    await fireEvent.press(await screen.findByText('Arroser'));
    await fireEvent.changeText(screen.getByDisplayValue('3'), '400');

    expect(screen.getByText('Entre 1 et 365 jours')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Créer la tâche' }));
    await expect(services.tasks.getAll()).resolves.toEqual([]);
  });

  it('modifie une tâche existante, qu’on peut aussi supprimer', async () => {
    const { services, potager } = await setup();
    const task = await services.tasks.create({
      kind: 'Watering',
      recurrence: 'EveryNDays',
      intervalDays: 3,
      startDate: today(),
      spaceId: potager.id,
    });
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: task.id });
    await renderScreen(<TaskFormScreen />, services);

    await screen.findByDisplayValue('3');
    expect(screen.getByText('Modifier la tâche')).toBeOnTheScreen();
    expect(screen.getByText('Supprimer')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByDisplayValue('3'), '5');
    await fireEvent.press(screen.getByRole('button', { name: 'Enregistrer les modifications' }));

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    await expect(services.tasks.getAll()).resolves.toMatchObject([{ intervalDays: 5 }]);
  });
});
