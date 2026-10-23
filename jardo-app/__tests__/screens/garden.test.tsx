import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import type { GardenMap } from '@/api/types';
import GardenScreen from '@/app/(tabs)/index';

import { mockApi } from '../../test/api';
import { space, zone } from '../../test/fixtures';
import { renderScreen } from '../../test/render';

// Skia ne tourne pas sous Jest : la carte n'en garde que les étiquettes, qui ouvrent leur emplacement.
jest.mock('@/components/map/map-viewport', () => {
  const { Pressable, Text } = require('react-native');
  return {
    MapViewport: ({ labels, onSelect }: { labels: Record<string, string>; onSelect: (key: string) => void }) =>
      Object.entries(labels).map(([key, text]) => (
        <Pressable key={key} onPress={() => onSelect(key)}>
          <Text>{text}</Text>
        </Pressable>
      )),
  };
});

const routes = (spaces: ReturnType<typeof space>[], map: GardenMap = { layout: null, slots: [] }) => ({
  'GET /api/garden/map': { body: map },
  'GET /api/garden': { body: { id: 1, name: 'Chez nous' } },
  'GET /api/spaces?includeArchived=true': { body: spaces },
});

describe('écran Jardin sans carte', () => {
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

describe('écran Jardin avec carte', () => {
  const potager = space({ id: 1, name: 'Potager', zoneCount: 2 });
  const verger = space({ id: 2, name: 'Verger', kind: 'Orchard' });
  const serre = space({ id: 3, name: 'Serre', kind: 'Greenhouse' });
  const map: GardenMap = {
    layout: 'country-house',
    slots: [
      { slotKey: 'bed-1', spaceId: 1, spaceName: 'Potager', spaceKind: 'VegetableGarden', zoneId: 11, zoneName: 'Carré 1' },
      { slotKey: 'orchard', spaceId: 2, spaceName: 'Verger', spaceKind: 'Orchard', zoneId: null, zoneName: null },
      { slotKey: 'vegetable', spaceId: 1, spaceName: 'Potager', spaceKind: 'VegetableGarden', zoneId: null, zoneName: null },
    ],
  };
  const withMap = () =>
    mockApi({
      ...routes([potager, verger, serre, space({ id: 4, name: 'Tunnel', kind: 'Greenhouse', isArchived: true })], map),
      'GET /api/spaces/1/zones': {
        body: [zone({ id: 11, spaceId: 1, name: 'Carré 1' }), zone({ id: 12, spaceId: 1, name: 'Carré 5' })],
      },
    });

  it('ouvre l’espace ou la zone de l’emplacement touché', async () => {
    withMap();
    await renderScreen(<GardenScreen />);

    await fireEvent.press(await screen.findByText('Verger'));
    expect(router.push).toHaveBeenCalledWith('/space/2');

    await fireEvent.press(screen.getByText('Carré 1'));
    expect(router.push).toHaveBeenCalledWith('/zone/11');
  });

  it('liste hors carte les espaces actifs et les carrés sans emplacement', async () => {
    withMap();
    await renderScreen(<GardenScreen />);

    expect(await screen.findByText('Hors carte')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Ouvrir Serre' }));
    expect(router.push).toHaveBeenCalledWith('/space/3');

    await fireEvent.press(await screen.findByRole('button', { name: 'Ouvrir Carré 5, Potager' }));
    expect(router.push).toHaveBeenCalledWith('/zone/12');
    // L'espace archivé n'est ni sur la carte ni hors carte : la liste le montre à la demande.
    expect(screen.queryByText('Tunnel')).not.toBeOnTheScreen();
  });

  it('bascule vers la liste des espaces, puis revient à la carte', async () => {
    withMap();
    await renderScreen(<GardenScreen />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Afficher la liste des espaces' }));
    expect(await screen.findByText('Chez nous')).toBeOnTheScreen();
    expect(screen.queryByText('Hors carte')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Afficher la carte' }));
    expect(await screen.findByText('Hors carte')).toBeOnTheScreen();
  });

  it('garde la liste pour un modèle que l’app ne sait pas dessiner', async () => {
    mockApi(routes([potager], { layout: 'loft', slots: [] }));
    await renderScreen(<GardenScreen />);

    expect(await screen.findByText('Chez nous')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Afficher la liste des espaces' })).not.toBeOnTheScreen();
  });
});
