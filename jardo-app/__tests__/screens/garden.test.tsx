import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import GardenScreen from '@/app/(tabs)/index';

import { mockApi } from '../../test/api';
import { space } from '../../test/fixtures';
import { renderScreen } from '../../test/render';

const routes = (spaces: ReturnType<typeof space>[]) => ({
  'GET /api/garden': { body: { id: 1, name: 'Chez nous' } },
  'GET /api/spaces?includeArchived=true': { body: spaces },
});

describe('écran Jardin', () => {
  it("liste les espaces avec leur contenu et leur pastille de tâches", async () => {
    mockApi(
      routes([
        space({ id: 1, name: 'Potager du bas', zoneCount: 2, itemCount: 5, dueTaskCount: 3 }),
        space({ id: 2, name: 'Verger', kind: 'Orchard', itemCount: 1, dueTaskCount: 1 }),
        space({ id: 3, name: 'Serre', kind: 'Greenhouse', dueTaskCount: 0 }),
      ]),
    );
    await renderScreen(<GardenScreen />);

    expect(await screen.findByText('Chez nous')).toBeOnTheScreen();
    expect(screen.getByText('Potager du bas')).toBeOnTheScreen();
    expect(screen.getByText('Potager · 2 zones · 5 éléments')).toBeOnTheScreen();
    expect(screen.getByText('3 tâches à faire')).toBeOnTheScreen();
    // Le singulier s'accorde, et un espace sans tâche est « À jour ».
    expect(screen.getByText('1 tâche à faire')).toBeOnTheScreen();
    expect(screen.getByText('À jour')).toBeOnTheScreen();
  });

  it("ouvre la fiche d'un espace", async () => {
    mockApi(routes([space({ id: 7, name: 'Verger', kind: 'Orchard' })]));
    await renderScreen(<GardenScreen />);

    await fireEvent.press(await screen.findByText('Verger'));

    expect(router.push).toHaveBeenCalledWith('/space/7');
  });

  it("cache les espaces archivés jusqu'à ce qu'on les demande", async () => {
    mockApi(
      routes([
        space({ id: 1, name: 'Potager' }),
        space({ id: 2, name: 'Ancien verger', kind: 'Orchard', isArchived: true }),
      ]),
    );
    await renderScreen(<GardenScreen />);

    expect(await screen.findByText('Potager')).toBeOnTheScreen();
    expect(screen.queryByText('Ancien verger')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByText('Voir les espaces archivés (1)'));
    expect(screen.getByText('Ancien verger')).toBeOnTheScreen();

    await fireEvent.press(screen.getByText('Masquer les espaces archivés'));
    expect(screen.queryByText('Ancien verger')).not.toBeOnTheScreen();
  });

  it("invite à ajouter un premier espace quand le jardin est vide", async () => {
    mockApi(routes([]));
    await renderScreen(<GardenScreen />);

    expect(await screen.findByText('Votre jardin est vide')).toBeOnTheScreen();
  });
});
