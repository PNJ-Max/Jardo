import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { Alert, type AlertButton } from 'react-native';

import ZoneFormScreen from '@/app/zone/form';

import { createTestServices, renderScreen } from '../../test/render';

type Guard = (event: { data: { action: object } }) => void;

/** La garde telle que le dernier rendu du formulaire l'a posée. */
const guard = () => {
  const [prevent, callback] = jest.mocked(usePreventRemove).mock.lastCall! as unknown as [boolean, Guard];
  return { prevent, leave: (action: object) => callback({ data: { action } }) };
};

describe('quitter un formulaire', () => {
  const dispatch = jest.fn();
  const goingBack = { type: 'GO_BACK' };

  async function openNewZone() {
    const services = await createTestServices();
    const potager = await services.spaces.create({ name: 'Potager', kind: 'VegetableGarden' });
    jest.mocked(useLocalSearchParams).mockReturnValue({ spaceId: potager.id });
    jest.mocked(useNavigation).mockReturnValue({ dispatch } as never);
    await renderScreen(<ZoneFormScreen />, services);
    return services;
  }

  beforeEach(() => {
    dispatch.mockClear();
    jest.spyOn(Alert, 'alert').mockClear();
  });

  it("ne demande rien tant que rien n'a été saisi", async () => {
    await openNewZone();
    expect(guard().prevent).toBe(false);
  });

  it('demande confirmation après une saisie, et ne quitte que si on abandonne', async () => {
    await openNewZone();
    await fireEvent.changeText(screen.getByLabelText(/^Nom/), 'Parcelle 1');
    expect(guard().prevent).toBe(true);

    await act(() => guard().leave(goingBack));
    const [title, , buttons] = jest.mocked(Alert.alert).mock.lastCall!;
    expect(title).toBe('Abandonner la saisie ?');
    expect(dispatch).not.toHaveBeenCalled();

    await act(() => (buttons as AlertButton[]).find((button) => button.text === 'Abandonner')!.onPress!());
    expect(dispatch).toHaveBeenCalledWith(goingBack);
  });

  it('quitte sans rien demander une fois la saisie enregistrée', async () => {
    const services = await openNewZone();
    // Le retour du routeur atteint la garde après coup, comme sur le web.
    jest.mocked(router.back).mockImplementationOnce(() => void Promise.resolve().then(() => guard().leave(goingBack)));
    await fireEvent.changeText(screen.getByLabelText(/^Nom/), 'Parcelle 1');

    await fireEvent.press(screen.getByRole('button', { name: /^Créer/ }));

    await waitFor(() => expect(dispatch).toHaveBeenCalledWith(goingBack));
    expect(Alert.alert).not.toHaveBeenCalled();
    const [potager] = await services.spaces.getAll();
    await expect(services.zones.getBySpace(potager.id)).resolves.toMatchObject([{ name: 'Parcelle 1' }]);
  });
});
