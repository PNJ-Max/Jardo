import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';

import PlantScreen from '@/app/plant/[id]';
import PlantFormScreen from '@/app/plant/form';
import type { Services } from '@/data/services';
import type { SpaceKind } from '@/domain/types';

import { createTestServices, pictogramsOnScreen, renderScreen } from '../../test/render';

async function openNewPlant(kind: SpaceKind = 'VegetableGarden') {
  const services = await createTestServices();
  const space = await services.spaces.create({ name: 'Le jardin', kind });
  jest.mocked(useLocalSearchParams).mockReturnValue({ spaceId: space.id });
  await renderScreen(<PlantFormScreen />, services);
  await screen.findByRole('button', { name: /^Espèce : / });
  return services;
}

async function openExistingPlant(values: { species: string | null; speciesId: string | null }) {
  const services = await createTestServices();
  const space = await services.spaces.create({ name: 'Le jardin', kind: 'VegetableGarden' });
  const plant = await services.plants.create({
    name: 'Mes plants',
    quantity: 3,
    quantityUnit: 'SquareMeters',
    spaceId: space.id,
    ...values,
  });
  jest.mocked(useLocalSearchParams).mockReturnValue({ id: plant.id });
  await renderScreen(<PlantFormScreen />, services);
  await screen.findByRole('button', { name: /^Espèce : / });
  return services;
}

const sheet = () => screen.container.queryAll((node) => node.type === 'Modal')[0];

const openSheet = () => fireEvent.press(screen.getByRole('button', { name: /^Espèce : / }));

const search = (text: string) => fireEvent.changeText(screen.getByLabelText('Rechercher une espèce'), text);

const choose = async (name: RegExp) => fireEvent.press(await screen.findByRole('button', { name }));

/** Ouvre la feuille, cherche et choisit la première ligne dont le nom commence ainsi. */
async function pick(query: string, name: string) {
  await openSheet();
  await search(query);
  await choose(new RegExp(`^${name},`));
}

const nameField = () => screen.getByLabelText('Nom');

const speciesNames = () =>
  screen
    .getAllByRole('button')
    .map((row) => row.props.accessibilityLabel as string | undefined)
    .filter((label): label is string => !!label?.includes(', '))
    .map((label) => label.split(',')[0]);

async function saved(services: Services) {
  await waitFor(async () => expect(await services.plants.getAll()).toHaveLength(1));
  return (await services.plants.getAll())[0];
}

describe('choisir l’espèce : les suggestions', () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
  });
  afterEach(() => jest.useRealTimers());

  it("début novembre, propose ce qu'on peut planter maintenant, puis le reste du potager de A à Z", async () => {
    jest.setSystemTime(new Date(2026, 10, 4, 9));
    await openNewPlant();
    await openSheet();

    expect(await screen.findByRole('header', { name: 'En ce moment' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Pour le potager' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^Ail, À planter jusqu'à / })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Tomate, Semis sous abri de mars à mi-avril' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Pommier/ })).not.toBeOnTheScreen();

    const names = speciesNames();
    expect(names.indexOf('Ail')).toBeLessThan(names.indexOf('Aubergine'));
    expect(names.filter((name) => name === 'Ail')).toHaveLength(1);
  });

  it('suit la date : fin mai, la tomate est en ce moment et l’ail ne l’est plus', async () => {
    jest.setSystemTime(new Date(2026, 4, 20, 9));
    await openNewPlant();
    await openSheet();

    await screen.findByRole('header', { name: 'En ce moment' });
    const names = speciesNames();
    const firstOfTheGarden = names.findIndex((name, index) => index > 0 && name.localeCompare(names[index - 1], 'fr') < 0);

    expect(names.indexOf('Tomate')).toBeLessThan(firstOfTheGarden);
    expect(names.indexOf('Ail')).toBeGreaterThanOrEqual(firstOfTheGarden);
  });

  it('suggère selon le type d’espace : un verger voit les fruitiers, et la recherche couvre le reste', async () => {
    jest.setSystemTime(new Date(2026, 10, 4, 9));
    await openNewPlant('Orchard');
    await openSheet();

    expect(await screen.findByRole('button', { name: /^Pommier, / })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Tomate, / })).not.toBeOnTheScreen();

    await search('tomate');

    expect(await screen.findByRole('button', { name: /^Tomate, / })).toBeOnTheScreen();
  });
});

describe('choisir l’espèce : la recherche', () => {
  it.each(['mache', 'MÂCHE', 'Mâche', '  mâche '])('trouve la mâche en tapant « %s »', async (query) => {
    await openNewPlant();
    await openSheet();
    await search(query);

    expect(await screen.findByRole('button', { name: /^Mâche, / })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Tomate, / })).not.toBeOnTheScreen();
  });

  it('trouve par synonyme, annonce le nombre de résultats et montre leur pictogramme', async () => {
    await openNewPlant();
    await openSheet();
    await search('salade');

    const count = await screen.findByText('4 espèces trouvées');
    expect(count.props.accessibilityLiveRegion).toBe('polite');
    expect(speciesNames().sort()).toEqual(['Chicorée', 'Laitue', 'Mâche', 'Roquette']);
    expect(pictogramsOnScreen().filter((id) => id.startsWith('category-Vegetable'))).toHaveLength(4);
  });

  it('dit quand le catalogue ne connaît pas, et garde la saisie libre', async () => {
    await openNewPlant();
    await openSheet();
    await search('kiwano');

    expect(await screen.findByText('Aucune espèce au catalogue')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Utiliser « kiwano » sans fiche' })).toBeOnTheScreen();
  });
});

describe('choisir l’espèce : le formulaire', () => {
  it('remplit le nom vide et l’unité restée par défaut', async () => {
    const services = await openNewPlant();

    await pick('carotte', 'Carotte');

    expect(nameField().props.value).toBe('Carotte');
    expect(screen.getByRole('radio', { name: 'rangs', selected: true })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Espèce : Carotte' })).toBeOnTheScreen();
    expect(pictogramsOnScreen()).toContain('category-Vegetable:light');

    await fireEvent.press(screen.getByRole('button', { name: 'Créer la plante' }));

    expect(await saved(services)).toMatchObject({
      name: 'Carotte',
      species: 'Carotte',
      speciesId: 'carrot',
      quantityUnit: 'Rows',
    });
  });

  it('n’écrase ni un nom saisi, ni une unité choisie, ni la variété', async () => {
    const services = await openNewPlant();
    await fireEvent.changeText(nameField(), 'Carottes du fond');
    await fireEvent.changeText(screen.getByLabelText('Variété'), 'Nantaise');
    await fireEvent.press(screen.getByRole('radio', { name: 'm²' }));

    await pick('carotte', 'Carotte');
    await fireEvent.press(screen.getByRole('button', { name: 'Créer la plante' }));

    expect(await saved(services)).toMatchObject({
      name: 'Carottes du fond',
      variety: 'Nantaise',
      quantityUnit: 'SquareMeters',
      speciesId: 'carrot',
    });
  });

  it('garde une unité rechoisie à sa valeur par défaut : le geste compte, pas la valeur', async () => {
    await openNewPlant();
    await fireEvent.press(screen.getByRole('radio', { name: 'pieds' }));

    await pick('carotte', 'Carotte');

    expect(screen.getByRole('radio', { name: 'pieds', selected: true })).toBeOnTheScreen();
  });

  it('en changeant d’espèce, remplace ce que le catalogue avait rempli, pas ce qu’on a retouché', async () => {
    await openNewPlant();

    await pick('carotte', 'Carotte');
    await pick('tomate', 'Tomate');

    expect(nameField().props.value).toBe('Tomate');
    expect(screen.getByRole('radio', { name: 'pieds', selected: true })).toBeOnTheScreen();

    await fireEvent.changeText(nameField(), 'Tomates du mur');
    await pick('carotte', 'Carotte');

    expect(nameField().props.value).toBe('Tomates du mur');
  });

  it('à la modification, garde l’unité enregistrée et l’espèce liée', async () => {
    const services = await openExistingPlant({ species: 'Tomate', speciesId: 'tomato' });

    expect(screen.getByRole('radio', { name: 'm²', selected: true })).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Variété'), 'Cœur de bœuf');
    await fireEvent.press(screen.getByRole('button', { name: 'Enregistrer les modifications' }));

    await waitFor(async () => expect((await saved(services)).variety).toBe('Cœur de bœuf'));
    expect(await saved(services)).toMatchObject({ species: 'Tomate', speciesId: 'tomato', quantityUnit: 'SquareMeters' });
  });

  it('marque l’espèce choisie dans la feuille', async () => {
    await openExistingPlant({ species: 'Tomate', speciesId: 'tomato' });
    await openSheet();

    expect(await screen.findByRole('button', { name: /^Tomate, /, selected: true })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^Carotte, /, selected: false })).toBeOnTheScreen();
  });

  it('retire l’espèce choisie : le texte et le lien, et le nom reste', async () => {
    const services = await openExistingPlant({ species: 'Tomate', speciesId: 'tomato' });
    await openSheet();

    await choose(/^Sans espèce$/);

    expect(screen.getByRole('button', { name: 'Espèce : Choisir une espèce' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Sans espèce' })).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Enregistrer les modifications' }));

    await waitFor(async () => expect((await saved(services)).species).toBeNull());
    expect(await saved(services)).toMatchObject({ name: 'Mes plants', speciesId: null });
  });

  it('ne propose pas de retirer quand il n’y a rien à retirer', async () => {
    await openNewPlant();
    await openSheet();

    await screen.findByRole('header', { name: 'Pour le potager' });
    expect(screen.queryByRole('button', { name: 'Sans espèce' })).not.toBeOnTheScreen();
  });

  it('accepte une saisie libre : le texte sans lien, et rien n’est prérempli', async () => {
    const services = await openNewPlant();
    await fireEvent.changeText(nameField(), 'Curiosités');
    await openSheet();
    await search('  tomate ananas ');

    await choose(/^Utiliser « tomate ananas » sans fiche$/);
    await fireEvent.press(screen.getByRole('button', { name: 'Créer la plante' }));

    expect(await saved(services)).toMatchObject({
      name: 'Curiosités',
      species: 'tomate ananas',
      speciesId: null,
      quantityUnit: 'Plants',
    });
  });

  it('une saisie libre remplace une espèce du catalogue, et son lien avec', async () => {
    const services = await openExistingPlant({ species: 'Tomate', speciesId: 'tomato' });
    await openSheet();
    await search('tomate ananas');

    await choose(/^Utiliser « tomate ananas » sans fiche$/);
    await fireEvent.press(screen.getByRole('button', { name: 'Enregistrer les modifications' }));

    await waitFor(async () => expect((await saved(services)).speciesId).toBeNull());
    expect((await saved(services)).species).toBe('tomate ananas');
  });

  it('une plante sans fiche se modifie sans espèce liée, et son texte reste affiché', async () => {
    await openExistingPlant({ species: 'Lactuca sativa', speciesId: null });

    expect(screen.getByRole('button', { name: 'Espèce : Lactuca sativa' })).toBeOnTheScreen();
    expect(pictogramsOnScreen().filter((id) => id.startsWith('category-'))).toEqual([]);
  });

  it('l’espèce choisie se lit ensuite sur la fiche de la plante', async () => {
    const services = await openNewPlant();

    await pick('tomate', 'Tomate');
    await fireEvent.press(screen.getByRole('button', { name: 'Créer la plante' }));
    const plant = await saved(services);
    await screen.unmount();

    jest.mocked(useLocalSearchParams).mockReturnValue({ id: plant.id });
    await renderScreen(<PlantScreen />, services);

    expect(await screen.findByText('Tomate · 1 pied')).toBeOnTheScreen();
  });
});

describe('la feuille de l’espèce', () => {
  it('se ferme au retour d’Android sans quitter le formulaire ni changer la saisie', async () => {
    await openNewPlant();
    await openSheet();
    await screen.findByLabelText('Rechercher une espèce');

    await fireEvent(sheet(), 'requestClose');

    expect(screen.queryByLabelText('Rechercher une espèce')).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Créer la plante' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Espèce : Choisir une espèce' })).toBeOnTheScreen();
  });

  it('repart d’une recherche vide à la réouverture', async () => {
    await openNewPlant();
    await openSheet();
    await search('tomate');
    await fireEvent(sheet(), 'requestClose');

    await openSheet();

    expect(screen.getByLabelText('Rechercher une espèce').props.value).toBe('');
  });

  it('nomme la recherche et se ferme par un bouton de 48 dp', async () => {
    await openNewPlant();
    await openSheet();

    const header = await screen.findByRole('header', { name: 'Espèce' });
    expect(header).toBeOnTheScreen();
    const [, close] = within(sheet()).getAllByRole('button', { name: 'Fermer' });
    expect(close).toHaveStyle({ width: 48, height: 48 });

    await fireEvent.press(close);

    expect(screen.queryByLabelText('Rechercher une espèce')).not.toBeOnTheScreen();
  });
});
