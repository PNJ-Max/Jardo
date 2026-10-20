import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import SpaceFormScreen from '@/app/space/form';

import { mockApi, problem } from '../../test/api';
import { renderScreen } from '../../test/render';

async function fillAndSubmit(name: string) {
  await fireEvent.changeText(screen.getByPlaceholderText('Potager du bas'), name);
  await fireEvent.press(screen.getByText('Verger'));
  await fireEvent.press(screen.getByText('Enregistrer'));
}

describe("formulaire d'espace", () => {
  it("affiche sous le champ l'erreur de validation renvoyée par l'API", async () => {
    const calls = mockApi({
      'POST /api/spaces': problem(400, { Name: ['Un espace de ce nom existe déjà.'] }),
    });
    await renderScreen(<SpaceFormScreen />);

    await fillAndSubmit('Potager');

    expect(await screen.findByText('Un espace de ce nom existe déjà.')).toBeOnTheScreen();
    expect(calls[0].body).toEqual({ name: 'Potager', kind: 'Orchard', description: null });
    expect(router.back).not.toHaveBeenCalled();
  });

  it('ne répète pas une erreur de champ en bas du formulaire', async () => {
    mockApi({ 'POST /api/spaces': problem(400, { Kind: ['Type inconnu.'] }) });
    await renderScreen(<SpaceFormScreen />);

    await fillAndSubmit('Potager');

    expect(await screen.findAllByText('Type inconnu.')).toHaveLength(1);
  });

  it('affiche en bas du formulaire une erreur qui ne vise aucun champ', async () => {
    mockApi({ 'POST /api/spaces': { status: 500, body: { detail: 'Base indisponible' } } });
    await renderScreen(<SpaceFormScreen />);

    await fillAndSubmit('Potager');

    expect(await screen.findByText('Base indisponible')).toBeOnTheScreen();
  });

  it("referme le formulaire une fois l'espace enregistré", async () => {
    mockApi({ 'POST /api/spaces': { status: 201, body: { id: 9 } } });
    await renderScreen(<SpaceFormScreen />);

    await fillAndSubmit('Potager');

    await waitFor(() => expect(router.back).toHaveBeenCalled());
  });

  it("n'envoie rien sans nom ni type", async () => {
    const calls = mockApi({});
    await renderScreen(<SpaceFormScreen />);

    await fireEvent.press(screen.getByText('Enregistrer'));

    expect(calls).toHaveLength(0);
  });
});
