import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';

import SpaceFormScreen from '@/app/space/form';

import { createTestServices, renderScreen } from '../../test/render';

async function fillAndSubmit(name: string) {
  await fireEvent.changeText(screen.getByPlaceholderText('Potager du bas'), name);
  await fireEvent.press(screen.getByText('Verger'));
  await fireEvent.press(screen.getByText("Créer l'espace"));
}

describe("formulaire d'espace", () => {
  beforeEach(() => jest.clearAllMocks());
  beforeEach(() => jest.mocked(useLocalSearchParams).mockReturnValue({}));

  it('présente les cinq types sur leur vignette et marque celui qui est choisi', async () => {
    await renderScreen(<SpaceFormScreen />);

    const kinds = ['Potager', 'Verger', 'Petits fruits', 'Serre', 'Bois de chauffage'];
    for (const kind of kinds) {
      expect(screen.getByRole('radio', { name: kind })).not.toBeSelected();
    }

    await fireEvent.press(screen.getByRole('radio', { name: 'Serre' }));

    expect(screen.getByRole('radio', { name: 'Serre' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'Verger' })).not.toBeSelected();
  });

  it("affiche sous le champ l'erreur de validation, sans la répéter en bas du formulaire", async () => {
    await renderScreen(<SpaceFormScreen />);

    // maxLength borne la saisie au clavier, pas changeText : le service reste juge.
    await fillAndSubmit('a'.repeat(101));

    expect(await screen.findAllByText('Le champ « Nom » ne doit pas dépasser 100 caractères.')).toHaveLength(1);
    expect(router.back).not.toHaveBeenCalled();
  });

  it('affiche en bas du formulaire une règle refusée qui ne vise aucun champ', async () => {
    const services = await createTestServices();
    await services.spaces.create({ name: 'Potager', kind: 'VegetableGarden' });
    await renderScreen(<SpaceFormScreen />, services);

    await fillAndSubmit('Potager');

    expect(await screen.findByText('Un espace nommé « Potager » existe déjà.')).toBeOnTheScreen();
    expect(router.back).not.toHaveBeenCalled();
  });

  it("referme le formulaire une fois l'espace créé", async () => {
    const { services } = await renderScreen(<SpaceFormScreen />);

    expect(screen.getByText('Nouvel espace')).toBeOnTheScreen();
    await fillAndSubmit('  Verger du haut ');

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    await expect(services.spaces.getAll()).resolves.toMatchObject([
      { name: 'Verger du haut', kind: 'Orchard', description: null },
    ]);
  });

  it('modifie un espace existant, avec son type déjà choisi', async () => {
    const services = await createTestServices();
    const serre = await services.spaces.create({ name: 'Serre', kind: 'Greenhouse' });
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: serre.id });
    await renderScreen(<SpaceFormScreen />, services);

    await screen.findByDisplayValue('Serre');
    expect(screen.getByText("Modifier l'espace")).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Serre' })).toBeSelected();
    await fireEvent.changeText(screen.getByDisplayValue('Serre'), 'Grande serre');
    await fireEvent.press(screen.getByText('Enregistrer les modifications'));

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    await expect(services.spaces.getAll()).resolves.toMatchObject([{ name: 'Grande serre', kind: 'Greenhouse' }]);
  });

  it("n'enregistre rien sans nom ni type", async () => {
    const { services } = await renderScreen(<SpaceFormScreen />);

    await fireEvent.press(screen.getByText("Créer l'espace"));

    await expect(services.spaces.getAll()).resolves.toEqual([]);
  });

  it('ferme le formulaire sans rien enregistrer', async () => {
    const { services } = await renderScreen(<SpaceFormScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Fermer' }));

    expect(router.back).toHaveBeenCalled();
    await expect(services.spaces.getAll()).resolves.toEqual([]);
  });
});
