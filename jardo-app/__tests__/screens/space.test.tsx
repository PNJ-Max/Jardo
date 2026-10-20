import { fireEvent, screen } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';

import SpaceScreen from '@/app/space/[id]';

import { mockApi } from '../../test/api';
import { plant, space, task } from '../../test/fixtures';
import { renderScreen } from '../../test/render';

const onSpace = task({ id: 1, title: 'Désherber les allées', kind: 'Other', status: 'Overdue', daysOverdue: 4 });
const onItem = task({ id: 2, status: 'DueSoon', zoneId: 4, zoneName: 'Carré 4', itemId: 6, itemName: 'Laitues', itemKind: 'Plant' });
const zone = { id: 4, spaceId: 1, name: 'Carré 4', description: null, createdAt: '2026-01-01T00:00:00Z', itemCount: 1 };

function setup() {
  jest.mocked(useLocalSearchParams).mockReturnValue({ id: '1' });
  mockApi({
    'GET /api/spaces/1': { body: space({ zoneCount: 1, itemCount: 1 }) },
    'GET /api/spaces/1/zones': { body: [zone] },
    'GET /api/tasks?spaceId=1': { body: [onSpace, onItem] },
    'GET /api/plants?spaceId=1&includeArchived=true': { body: [plant()] },
  });
}

describe('fiche espace', () => {
  it("replie les tâches de ses zones et éléments sous les siennes, en nommant leur cible", async () => {
    setup();
    await renderScreen(<SpaceScreen />);

    expect(await screen.findByText('Désherber les allées')).toBeOnTheScreen();
    expect(screen.getByText('Ajouter une tâche à cet espace')).toBeOnTheScreen();
    expect(screen.queryByText('Arroser')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByText('Tâches des zones et des éléments'));

    expect(screen.getByText('Arroser')).toBeOnTheScreen();
    expect(screen.getByText('Laitues · Carré 4 · Potager')).toBeOnTheScreen();
  });

  it("montre zones et plantes dans l'onglet Contenu", async () => {
    setup();
    await renderScreen(<SpaceScreen />);

    await fireEvent.press(await screen.findByRole('tab', { name: 'Contenu' }));

    expect(await screen.findByText('Laitues')).toBeOnTheScreen();
    expect(screen.getAllByText('Carré 4').length).toBeGreaterThan(0);
    expect(screen.getByText('Ajouter une zone')).toBeOnTheScreen();
  });
});
