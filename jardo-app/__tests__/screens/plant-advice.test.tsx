import { act, fireEvent, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';

import PlantScreen from '@/app/plant/[id]';
import SettingsScreen from '@/app/settings';
import { SpeciesAdvice } from '@/components/species-advice';
import { createServices } from '@/data/services';
import { findSpecies } from '@/data/species';
import type { Species } from '@/domain/species';

import { createTestDb } from '../../test/db';
import { pictogramsOnScreen, renderScreen } from '../../test/render';

const known = (id: string) => findSpecies(id) as Species;

/** Fige le jour de l'horloge, celui que lit `useToday`. */
const on = (year: number, month: number, day: number) => jest.setSystemTime(new Date(year, month - 1, day, 12));

async function renderPlant({ speciesId, unknownSpeciesId }: { speciesId?: string; unknownSpeciesId?: string }) {
  const db = await createTestDb();
  const services = createServices(db);
  const potager = await services.spaces.create({ name: 'Potager', kind: 'VegetableGarden' });
  const plant = await services.plants.create({ name: 'Mes plants', species: 'Texte libre', speciesId, spaceId: potager.id });
  if (unknownSpeciesId) await db.run('UPDATE garden_items SET species_id = ? WHERE id = ?', [unknownSpeciesId, plant.id]);
  jest.mocked(useLocalSearchParams).mockReturnValue({ id: plant.id });

  await renderScreen(<PlantScreen />, services);
  await screen.findByText('Mes plants');
}

async function openAdvice(speciesId: string) {
  await renderPlant({ speciesId });
  await fireEvent.press(screen.getByRole('tab', { name: 'Conseils' }));
}

describe('onglet Conseils de la fiche plante', () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    on(2026, 6, 1);
  });
  afterEach(() => jest.useRealTimers());

  it("n'existe pas pour une plante sans espèce du catalogue", async () => {
    await renderPlant({});

    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.queryByRole('tab', { name: 'Conseils' })).not.toBeOnTheScreen();
  });

  it('prend place entre Journal et Infos pour une plante liée, sans voler le premier onglet', async () => {
    await renderPlant({ speciesId: 'tomato' });

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4);
    expect(tabs[1]).toBe(screen.getByRole('tab', { name: 'Journal' }));
    expect(tabs[2]).toBe(screen.getByRole('tab', { name: 'Conseils' }));
    expect(tabs[3]).toBe(screen.getByRole('tab', { name: 'Infos' }));
    expect(screen.getByRole('tab', { name: 'Tâches', selected: true })).toBeOnTheScreen();
  });

  it("n'apparaît pas, sans plantage, pour un identifiant absent du catalogue", async () => {
    await renderPlant({ unknownSpeciesId: 'retired-species' });

    expect(screen.getByText(/Texte libre/)).toBeOnTheScreen();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.queryByRole('tab', { name: 'Conseils' })).not.toBeOnTheScreen();
  });

  it("retombe sur le premier onglet quand l'espèce est retirée alors que Conseils est ouvert", async () => {
    const services = createServices(await createTestDb());
    const potager = await services.spaces.create({ name: 'Potager', kind: 'VegetableGarden' });
    const input = { name: 'Mes plants', spaceId: potager.id };
    const plant = await services.plants.create({ ...input, species: 'Tomate', speciesId: 'tomato' });
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: plant.id });
    const { queryClient } = await renderScreen(<PlantScreen />, services);
    await fireEvent.press(await screen.findByRole('tab', { name: 'Conseils' }));
    expect(await screen.findByText('Bon à savoir')).toBeOnTheScreen();

    await services.plants.update(plant.id, { ...input, species: null, speciesId: null });
    await act(() => queryClient.invalidateQueries());

    expect(await screen.findByRole('tab', { name: 'Tâches', selected: true })).toBeOnTheScreen();
    expect(screen.queryByRole('tab', { name: 'Conseils' })).not.toBeOnTheScreen();
    expect(screen.queryByText('Bon à savoir')).not.toBeOnTheScreen();
  });

  it("montre l'espèce, le résumé du calendrier, le bon à savoir et les conseils d'un légume", async () => {
    await openAdvice('tomato');

    expect(screen.getByText('Tomate')).toBeOnTheScreen();
    expect(screen.getByText('Légume · Solanum lycopersicum')).toBeOnTheScreen();
    expect(
      screen.getByLabelText(
        'Semis sous abri : de début mars à mi-avril. Plantation : de mi-mai à fin juin. Récolte : de mi-juillet à mi-octobre.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText(/Dates pour un climat tempéré/)).toBeOnTheScreen();
    expect(screen.getByText('Exposition : Plein soleil')).toBeOnTheScreen();
    expect(screen.getByText('Espacement : 50 cm entre plants, 80 cm entre rangs')).toBeOnTheScreen();
    expect(screen.getByText(/^Arrosage : Tous les 3 jours par temps sec/)).toBeOnTheScreen();
    for (const tip of known('tomato').tips) expect(screen.getByText(tip)).toBeOnTheScreen();
  });

  it('pose le pictogramme de la catégorie et celui de chaque fenêtre', async () => {
    await openAdvice('tomato');

    expect(pictogramsOnScreen()).toEqual(
      expect.arrayContaining(['category-Vegetable:light', 'Sowing:light', 'Planting:light', 'Harvest:light']),
    );
  });

  it("dit « en ce moment » ce qu'on peut faire le jour donné", async () => {
    await openAdvice('tomato');

    expect(screen.getByText("Planter jusqu'à fin juin")).toBeOnTheScreen();
    expect(screen.queryByText(/^Récolter/)).not.toBeOnTheScreen();
  });

  it("le dit aussi à cheval sur le Nouvel An, fenêtres multiples, pour un fruitier sans rythme d'arrosage", async () => {
    on(2027, 1, 10);
    await openAdvice('apple-tree');

    expect(screen.getByText("Planter jusqu'à mi-mars")).toBeOnTheScreen();
    expect(screen.getByText("Tailler jusqu'à mi-mars")).toBeOnTheScreen();
    expect(screen.getByText('Espacement : 4 m entre arbres')).toBeOnTheScreen();
    expect(screen.queryByText(/^Arrosage/)).not.toBeOnTheScreen();
  });

  it('le dit franchement quand aucune fenêtre ne couvre le jour', async () => {
    on(2026, 11, 4);
    await openAdvice('tomato');

    expect(screen.getByText('Rien au calendrier de cette espèce en ce moment.')).toBeOnTheScreen();
  });

  it('suit le climat donné', async () => {
    await renderScreen(<SpeciesAdvice species={known('tomato')} climate="Mountain" />);

    expect(screen.getByLabelText(/Plantation : de mi-juin à fin juillet/)).toBeOnTheScreen();
    expect(screen.getByText(/Dates pour un climat de montagne/)).toBeOnTheScreen();
    expect(screen.getByText('Rien au calendrier de cette espèce en ce moment.')).toBeOnTheScreen();
  });

  it('décale le calendrier de la fiche dès que le climat du jardin change dans Réglages', async () => {
    const services = createServices(await createTestDb());
    const potager = await services.spaces.create({ name: 'Potager', kind: 'VegetableGarden' });
    const plant = await services.plants.create({ name: 'Mes plants', species: 'Tomate', speciesId: 'tomato', spaceId: potager.id });
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: plant.id });
    await renderScreen(
      <>
        <PlantScreen />
        <SettingsScreen />
      </>,
      services,
    );
    await fireEvent.press(await screen.findByRole('tab', { name: 'Conseils' }));
    expect(screen.getByLabelText(/Plantation : de mi-mai à fin juin/)).toBeOnTheScreen();
    expect(screen.getByText("Planter jusqu'à fin juin")).toBeOnTheScreen();

    await fireEvent.press(await screen.findByRole('radio', { name: /^Montagne\./ }));

    expect(await screen.findByLabelText(/Plantation : de mi-juin à fin juillet/)).toBeOnTheScreen();
    expect(screen.getByText(/Dates pour un climat de montagne/)).toBeOnTheScreen();
    expect(screen.getByText('Rien au calendrier de cette espèce en ce moment.')).toBeOnTheScreen();
  });

  it('suit le climat enregistré du jardin en ouvrant la fiche', async () => {
    const services = createServices(await createTestDb());
    await services.garden.setClimate('Mediterranean');
    const potager = await services.spaces.create({ name: 'Potager', kind: 'VegetableGarden' });
    const plant = await services.plants.create({ name: 'Mes plants', species: 'Tomate', speciesId: 'tomato', spaceId: potager.id });
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: plant.id });
    await renderScreen(<PlantScreen />, services);

    await fireEvent.press(await screen.findByRole('tab', { name: 'Conseils' }));

    expect(await screen.findByText(/Dates pour un climat méditerranéen/)).toBeOnTheScreen();
    expect(screen.getByLabelText(/Plantation : de mi-avril à fin mai/)).toBeOnTheScreen();
  });

  it('« Changer » mène à Réglages', async () => {
    await openAdvice('tomato');

    await fireEvent.press(screen.getByRole('link', { name: 'Changer le climat du jardin' }));

    expect(router.push).toHaveBeenCalledWith('/settings');
  });
});
