import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import GardenScreen from '@/app/(tabs)/index';
import { createServices, type Services } from '@/data/services';
import type { SpaceKind } from '@/domain/types';
import { today } from '@/lib/dates';

import { createTestDb } from '../../test/db';
import { createTestServices, renderScreen } from '../../test/render';

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

async function setup() {
  const services = await createTestServices();
  await services.garden.update({ name: 'Chez nous' });
  return services;
}

const addSpace = (services: Services, name: string, kind: SpaceKind = 'VegetableGarden') =>
  services.spaces.create({ name, kind });

/** Des tâches du jour sur un espace : elles comptent dans sa pastille. */
async function addDueTasks(services: Services, spaceId: string, count: number) {
  for (let i = 0; i < count; i++) {
    await services.tasks.create({ kind: 'Other', title: `Tâche ${i + 1}`, recurrence: 'Once', startDate: today(), spaceId });
  }
}

describe('écran Jardin sans carte', () => {
  it('liste les espaces avec leur contenu et leur pastille de tâches', async () => {
    const services = await setup();
    const potager = await addSpace(services, 'Potager du bas');
    for (const name of ['Carré 1', 'Carré 2']) await services.zones.create(potager.id, { name });
    for (const name of ['Tomates', 'Basilic', 'Carottes', 'Radis', 'Laitues']) {
      await services.plants.create({ name, quantity: 1, quantityUnit: 'Plants', spaceId: potager.id });
    }
    await addDueTasks(services, potager.id, 3);
    const verger = await addSpace(services, 'Verger', 'Orchard');
    await services.plants.create({ name: 'Pommier', quantity: 1, quantityUnit: 'Plants', spaceId: verger.id });
    await addDueTasks(services, verger.id, 1);
    await addSpace(services, 'Serre', 'Greenhouse');
    await renderScreen(<GardenScreen />, services);

    expect(await screen.findByText('Chez nous')).toBeOnTheScreen();
    expect(screen.getByText('Potager du bas')).toBeOnTheScreen();
    expect(screen.getByText('Potager · 2 zones · 5 éléments')).toBeOnTheScreen();
    expect(screen.getByText('3 tâches à faire')).toBeOnTheScreen();
    // Le singulier s'accorde, et un espace sans tâche est « À jour ».
    expect(screen.getByText('1 tâche à faire')).toBeOnTheScreen();
    expect(screen.getByText('À jour')).toBeOnTheScreen();
  });

  it("ouvre la fiche d'un espace", async () => {
    const services = await setup();
    const verger = await addSpace(services, 'Verger', 'Orchard');
    await renderScreen(<GardenScreen />, services);

    await fireEvent.press(await screen.findByText('Verger'));

    expect(router.push).toHaveBeenCalledWith(`/space/${verger.id}`);
  });

  it("cache les espaces archivés jusqu'à ce qu'on les demande", async () => {
    const services = await setup();
    await addSpace(services, 'Potager');
    const ancien = await addSpace(services, 'Ancien verger', 'Orchard');
    await services.spaces.setArchived(ancien.id, true);
    await renderScreen(<GardenScreen />, services);

    expect(await screen.findByText('Potager')).toBeOnTheScreen();
    expect(screen.queryByText('Ancien verger')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByText('Voir les espaces archivés (1)'));
    expect(screen.getByText('Ancien verger')).toBeOnTheScreen();

    await fireEvent.press(screen.getByText('Masquer les espaces archivés'));
    expect(screen.queryByText('Ancien verger')).not.toBeOnTheScreen();
  });

  it('invite à ajouter un premier espace quand le jardin est vide', async () => {
    await renderScreen(<GardenScreen />, await setup());

    expect(await screen.findByText('Votre jardin est vide')).toBeOnTheScreen();
  });
});

describe('écran Jardin avec carte', () => {
  /** Le potager et son carré 1 sur la carte, son carré 5 hors carte ; le verger posé, la serre non. */
  async function withMap() {
    const services = await setup();
    const potager = await addSpace(services, 'Potager');
    const carre1 = await services.zones.create(potager.id, { name: 'Carré 1' });
    const carre5 = await services.zones.create(potager.id, { name: 'Carré 5' });
    const verger = await addSpace(services, 'Verger', 'Orchard');
    const serre = await addSpace(services, 'Serre', 'Greenhouse');
    const tunnel = await addSpace(services, 'Tunnel', 'Greenhouse');
    await services.spaces.setArchived(tunnel.id, true);
    await services.gardenMap.replace({
      layout: 'country-house',
      slots: [
        { slotKey: 'bed-1', spaceId: potager.id, zoneId: carre1.id },
        { slotKey: 'orchard', spaceId: verger.id },
        { slotKey: 'vegetable', spaceId: potager.id },
      ],
    });
    return { services, carre1, carre5, verger, serre };
  }

  it("ouvre l'espace ou la zone de l'emplacement touché", async () => {
    const { services, carre1, verger } = await withMap();
    await renderScreen(<GardenScreen />, services);

    await fireEvent.press(await screen.findByText('Verger'));
    expect(router.push).toHaveBeenCalledWith(`/space/${verger.id}`);

    await fireEvent.press(screen.getByText('Carré 1'));
    expect(router.push).toHaveBeenCalledWith(`/zone/${carre1.id}`);
  });

  it('liste hors carte les espaces actifs et les carrés sans emplacement', async () => {
    const { services, carre5, serre } = await withMap();
    await renderScreen(<GardenScreen />, services);

    expect(await screen.findByText('Hors carte')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Ouvrir Serre' }));
    expect(router.push).toHaveBeenCalledWith(`/space/${serre.id}`);

    await fireEvent.press(await screen.findByRole('button', { name: 'Ouvrir Carré 5, Potager' }));
    expect(router.push).toHaveBeenCalledWith(`/zone/${carre5.id}`);
    // L'espace archivé n'est ni sur la carte ni hors carte : la liste le montre à la demande.
    expect(screen.queryByText('Tunnel')).not.toBeOnTheScreen();
  });

  it('bascule vers la liste des espaces, puis revient à la carte', async () => {
    const { services } = await withMap();
    await renderScreen(<GardenScreen />, services);

    await fireEvent.press(await screen.findByRole('button', { name: 'Afficher la liste des espaces' }));
    expect(await screen.findByText('Chez nous')).toBeOnTheScreen();
    expect(screen.queryByText('Hors carte')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Afficher la carte' }));
    expect(await screen.findByText('Hors carte')).toBeOnTheScreen();
  });

  it("garde la liste pour un modèle que l'app ne sait pas dessiner", async () => {
    // Une base écrite par une version plus récente de l'app : le service n'accepterait pas ce modèle.
    const db = await createTestDb();
    const services = createServices(db);
    await services.garden.update({ name: 'Chez nous' });
    await addSpace(services, 'Potager');
    await db.run("UPDATE gardens SET map_layout = 'loft'");
    await renderScreen(<GardenScreen />, services);

    expect(await screen.findByText('Chez nous')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Afficher la liste des espaces' })).not.toBeOnTheScreen();
  });
});
