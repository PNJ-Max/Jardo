import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import SpaceFormScreen from '@/app/space/form';

import { createTestServices, renderScreen } from '../../test/render';

async function fillAndSubmit(name: string) {
  await fireEvent.changeText(screen.getByPlaceholderText('Potager du bas'), name);
  await fireEvent.press(screen.getByText('Verger'));
  await fireEvent.press(screen.getByText('Enregistrer'));
}

describe("formulaire d'espace", () => {
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

  it("referme le formulaire une fois l'espace enregistré", async () => {
    const { services } = await renderScreen(<SpaceFormScreen />);

    await fillAndSubmit('  Verger du haut ');

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    await expect(services.spaces.getAll()).resolves.toMatchObject([
      { name: 'Verger du haut', kind: 'Orchard', description: null },
    ]);
  });

  it("n'enregistre rien sans nom ni type", async () => {
    const { services } = await renderScreen(<SpaceFormScreen />);

    await fireEvent.press(screen.getByText('Enregistrer'));

    await expect(services.spaces.getAll()).resolves.toEqual([]);
  });
});
