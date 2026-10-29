import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';

import EntryFormScreen from '@/app/entry/form';
import { addDays } from '@/domain/dates';
import { today } from '@/lib/dates';

import { createTestServices, renderScreen } from '../../test/render';

jest.mock('@react-native-community/datetimepicker', () => ({ DateTimePickerAndroid: { open: jest.fn() } }));

async function setup() {
  const services = await createTestServices();
  const potager = await services.spaces.create({ name: 'Potager', kind: 'VegetableGarden' });
  return { services, potager };
}

describe("formulaire d'intervention", () => {
  beforeEach(() => jest.clearAllMocks());

  it("note l'intervention du jour au journal", async () => {
    const { services, potager } = await setup();
    jest.mocked(useLocalSearchParams).mockReturnValue({ spaceId: potager.id, label: 'Potager' });
    await renderScreen(<EntryFormScreen />, services);

    expect(screen.getByText('Noter une intervention')).toBeOnTheScreen();
    await fireEvent.press(await screen.findByText('Arrosage'));
    await fireEvent.press(screen.getByText("Noter l'intervention"));

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    await expect(services.journal.getAll()).resolves.toMatchObject([{ kind: 'Watering', date: today() }]);
  });

  it('refuse une date future et montre la règle sans fermer le formulaire', async () => {
    const { services, potager } = await setup();
    jest.mocked(useLocalSearchParams).mockReturnValue({ spaceId: potager.id, label: 'Potager' });
    await renderScreen(<EntryFormScreen />, services);
    const future = addDays(today(), 3);
    const [year, month, day] = future.split('-').map(Number);

    await fireEvent.press(await screen.findByText('Arrosage'));
    // Le calendrier natif borne déjà le choix ; le service reste juge d'une date qui lui parviendrait.
    await fireEvent.press(screen.getByLabelText(/^Date : /));
    await act(async () => {
      jest.mocked(DateTimePickerAndroid.open).mock.lastCall![0].onValueChange!({} as never, new Date(year, month - 1, day));
    });
    await fireEvent.press(screen.getByText("Noter l'intervention"));

    expect(
      await screen.findByText(`La date ${future} est dans le futur : le journal ne note que ce qui a été fait.`),
    ).toBeOnTheScreen();
    expect(router.back).not.toHaveBeenCalled();
    await expect(services.journal.getAll()).resolves.toEqual([]);
  });

  it('corrige une intervention existante', async () => {
    const { services, potager } = await setup();
    const entry = await services.journal.create({ kind: 'Watering', date: today(), spaceId: potager.id });
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: entry.id });
    await renderScreen(<EntryFormScreen />, services);

    await screen.findByDisplayValue('');
    expect(screen.getByText("Corriger l'intervention")).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('Optionnel'), 'Au goutte-à-goutte');
    await fireEvent.press(screen.getByText('Enregistrer les modifications'));

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    await expect(services.journal.getAll()).resolves.toMatchObject([{ note: 'Au goutte-à-goutte' }]);
  });
});
