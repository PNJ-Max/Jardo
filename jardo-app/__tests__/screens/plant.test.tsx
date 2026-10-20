import { fireEvent, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';

import PlantScreen from '@/app/plant/[id]';

import { mockApi } from '../../test/api';
import { plant, task } from '../../test/fixtures';
import { renderScreen } from '../../test/render';

const onPlant = task({ id: 1, title: 'Pincer les fleurs', kind: 'Pruning', status: 'Ok', itemId: 6, itemName: 'Laitues', zoneId: 4, zoneName: 'Carré 4' });
const onZone = task({ id: 2, title: 'Arroser le carré', status: 'DueSoon', zoneId: 4, zoneName: 'Carré 4' });
const onSpace = task({ id: 3, title: 'Désherber les allées', kind: 'Other', status: 'Overdue', daysOverdue: 4 });

function setup(tasks = [onPlant, onZone, onSpace]) {
  jest.mocked(useLocalSearchParams).mockReturnValue({ id: '6' });
  return mockApi({
    'GET /api/plants/6': { body: plant() },
    'GET /api/tasks?itemId=6': { body: tasks },
    'GET /api/journal?itemId=6': { body: [] },
  });
}

describe('fiche plante', () => {
  it("garde l'en-tête visible et ouvre l'onglet Tâches", async () => {
    setup();
    await renderScreen(<PlantScreen />);

    expect(await screen.findByText('Laitues')).toBeOnTheScreen();
    expect(screen.getByText('Carré 4 · Potager')).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Tâches', selected: true })).toBeOnTheScreen();
    expect(await screen.findByText('Pincer les fleurs')).toBeOnTheScreen();
  });

  it('range à part, repliées, les tâches de la zone et de l\'espace', async () => {
    setup();
    await renderScreen(<PlantScreen />);

    expect(await screen.findByText('Valent aussi pour cette plante')).toBeOnTheScreen();
    expect(screen.getByText('Carré 4')).toBeOnTheScreen();
    expect(screen.getByText(/1 aujourd'hui/)).toBeOnTheScreen();
    expect(screen.getByText(/1 en retard/)).toBeOnTheScreen();
    expect(screen.queryByText('Arroser le carré')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByText('Carré 4'));

    expect(screen.getByText('Arroser le carré')).toBeOnTheScreen();
    expect(screen.queryByText('Désherber les allées')).not.toBeOnTheScreen();
  });

  it('crée une nouvelle tâche sur la plante, pas sur sa zone', async () => {
    setup([onZone]);
    await renderScreen(<PlantScreen />);

    expect(await screen.findByText('Aucune tâche pour cette plante.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Ajouter une tâche à cette plante'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/task/form',
      params: expect.objectContaining({ itemId: '6', itemKind: 'Plant', zoneId: '4', spaceId: '1' }),
    });
  });

  it('montre les détails et les actions dans l\'onglet Infos', async () => {
    setup();
    await renderScreen(<PlantScreen />);

    await fireEvent.press(await screen.findByRole('tab', { name: 'Infos' }));

    expect(screen.getByText(/Variété :/)).toBeOnTheScreen();
    expect(screen.getByText('Modifier')).toBeOnTheScreen();
    expect(screen.queryByText('Pincer les fleurs')).not.toBeOnTheScreen();
  });

  it("ne charge le journal qu'à l'ouverture de son onglet", async () => {
    const calls = setup();
    await renderScreen(<PlantScreen />);
    await screen.findByText('Pincer les fleurs');
    expect(calls.some((call) => call.path.startsWith('/api/journal'))).toBe(false);

    await fireEvent.press(screen.getByRole('tab', { name: 'Journal' }));

    expect(await screen.findByText("Rien de noté pour l'instant.")).toBeOnTheScreen();
  });
});
