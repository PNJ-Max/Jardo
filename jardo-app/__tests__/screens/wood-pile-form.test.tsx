import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';

import WoodPileFormScreen from '@/app/wood-pile/form';

import { createTestServices, renderScreen } from '../../test/render';

async function setup() {
  const services = await createTestServices();
  const bois = await services.spaces.create({ name: 'Bois', kind: 'Firewood' });
  jest.mocked(useLocalSearchParams).mockReturnValue({ spaceId: bois.id });
  await renderScreen(<WoodPileFormScreen />, services);
  return services;
}

async function fill(logLength: string) {
  await fireEvent.changeText(screen.getByPlaceholderText('Chêne 2026'), 'Chêne');
  // Le volume est le seul champ vide sans texte indicatif.
  const volume = screen.getAllByDisplayValue('').find((input) => !input.props.placeholder)!;
  await fireEvent.changeText(volume, '4,5');
  await fireEvent.changeText(screen.getByPlaceholderText('Optionnel'), logLength);
  await fireEvent.press(screen.getByText('Enregistrer'));
}

describe('formulaire de tas de bois', () => {
  it('affiche sous le champ la règle refusée par le service', async () => {
    const services = await setup();

    await fill('5');

    expect(
      await screen.findAllByText('Le champ « Longueur des bûches » doit être compris entre 10 et 200 (nombre entier).'),
    ).toHaveLength(1);
    await expect(services.woodPiles.getAll()).resolves.toEqual([]);
  });

  it('enregistre le tas dans la base locale', async () => {
    const services = await setup();

    await fill('33');

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    await expect(services.woodPiles.getAll()).resolves.toMatchObject([
      { name: 'Chêne', initialSteres: 4.5, logLengthCm: 33, remainingSteres: 4.5 },
    ]);
  });
});
