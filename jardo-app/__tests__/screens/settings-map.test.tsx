import { fireEvent, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';

import GardenMapScreen from '@/app/garden-map';
import SettingsScreen from '@/app/settings';
import type { Services } from '@/data/services';

import { createTestServices, renderScreen } from '../../test/render';

// Un groupe de choix n'est pas « accessible » (charte) : on le trouve par son libellé. Les pastilles
// d'un espace portent souvent le même nom que son emplacement.
const slot = (name: string) =>
  within(screen.getAllByLabelText(name).find((element) => element.props.accessibilityRole === 'radiogroup')!);

/** Un jardin sans carte : un potager et ses deux parcelles, un verger, une serre. */
async function gardenWithoutMap() {
  const services = await createTestServices();
  const potager = await services.spaces.create({ name: 'Potager du bas', kind: 'VegetableGarden' });
  const parcelles = [];
  for (const name of ['Parcelle A', 'Parcelle B']) parcelles.push(await services.zones.create(potager.id, { name }));
  const verger = await services.spaces.create({ name: 'Verger', kind: 'Orchard' });
  const serre = await services.spaces.create({ name: 'Serre tunnel', kind: 'Greenhouse' });
  return { services, potager, parcelles, verger, serre };
}

const slotsOf = async (services: Services) =>
  (await services.gardenMap.get()).slots.map((s) => [s.slotKey, s.zoneName ?? s.spaceName]);

describe('réglages, carte du jardin', () => {
  beforeEach(() => jest.clearAllMocks());

  it("relance l'assistant sur un jardin vide", async () => {
    await renderScreen(<SettingsScreen />);

    expect(await screen.findByText("Pas encore de carte. L'assistant la dessine et crée les espaces de votre jardin.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: "Lancer l'assistant" }));

    expect(router.push).toHaveBeenCalledWith('/setup');
  });

  it('propose de configurer la carte d’un jardin qui a des espaces', async () => {
    const { services } = await gardenWithoutMap();
    await renderScreen(<SettingsScreen />, services);

    expect(await screen.findByText('Pas encore de carte : choisissez un modèle et placez-y vos espaces.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Configurer la carte' }));

    expect(router.push).toHaveBeenCalledWith('/garden-map');
  });

  it('place les espaces existants sur un modèle, en partant d’une suggestion', async () => {
    const { services } = await gardenWithoutMap();
    await renderScreen(<GardenMapScreen />, services);

    // Chaque espace est proposé sur l'emplacement de son type, les parcelles sur ceux du potager.
    await screen.findByText('Emplacements');
    expect(slot('Verger').getByRole('radio', { name: 'Verger' })).toBeChecked();
    expect(slot('Potager').getByRole('radio', { name: 'Potager du bas' })).toBeChecked();
    expect(await slot('Parcelle 1 du potager').findByRole('radio', { name: 'Parcelle A' })).toBeChecked();
    expect(slot('Parcelle 2 du potager').getByRole('radio', { name: 'Parcelle B' })).toBeChecked();
    expect(slot('Petits fruits').getByRole('radio', { name: 'Libre' })).toBeChecked();
    // Ni petits fruits ni bois de chauffage dans ce jardin.
    expect(screen.getAllByText('Aucun espace de ce type dans le jardin.')).toHaveLength(2);

    // Une zone n'a qu'une parcelle : posée sur la quatrième, elle quitte la première.
    await fireEvent.press(slot('Parcelle 4 du potager').getByRole('radio', { name: 'Parcelle A' }));
    expect(slot('Parcelle 1 du potager').getByRole('radio', { name: 'Libre' })).toBeChecked();

    await fireEvent.press(slot('Serre').getByRole('radio', { name: 'Libre' }));
    await fireEvent.press(screen.getByRole('radio', { name: /^Maison mitoyenne/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Enregistrer la carte' }));

    expect(router.back).toHaveBeenCalled();
    expect((await services.gardenMap.get()).layout).toBe('terraced-long');
    await expect(slotsOf(services)).resolves.toEqual([
      ['bed-2', 'Parcelle B'],
      ['bed-4', 'Parcelle A'],
      ['orchard', 'Verger'],
      ['vegetable', 'Potager du bas'],
    ]);
  });

  it("change le modèle et le placement d'une carte en place ; les espaces retirés restent hors carte", async () => {
    const { services, potager, verger } = await gardenWithoutMap();
    await services.gardenMap.replace({
      layout: 'terraced-long',
      slots: [
        { slotKey: 'vegetable', spaceId: potager.id },
        { slotKey: 'orchard', spaceId: verger.id },
      ],
    });
    await renderScreen(<SettingsScreen />, services);

    expect(await screen.findByText('Maison mitoyenne : 2 emplacements occupés sur 9.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Modifier la carte' }));
    expect(router.push).toHaveBeenCalledWith('/garden-map');

    await renderScreen(<GardenMapScreen />, services);

    // Le placement en place, sans suggestion : la serre et les parcelles restent libres.
    expect(await screen.findByRole('radio', { name: /^Maison mitoyenne/ })).toBeChecked();
    expect(slot('Serre').getByRole('radio', { name: 'Libre' })).toBeChecked();
    expect(slot('Parcelle 1 du potager').getByRole('radio', { name: 'Libre' })).toBeChecked();

    await fireEvent.press(screen.getByRole('radio', { name: /^Maison de campagne/ }));
    await fireEvent.press(slot('Verger').getByRole('radio', { name: 'Libre' }));
    await fireEvent.press(slot('Serre').getByRole('radio', { name: 'Serre tunnel' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Enregistrer la carte' }));

    expect(router.back).toHaveBeenCalled();
    expect((await services.gardenMap.get()).layout).toBe('country-house');
    await expect(slotsOf(services)).resolves.toEqual([
      ['greenhouse', 'Serre tunnel'],
      ['vegetable', 'Potager du bas'],
    ]);
  });
});
