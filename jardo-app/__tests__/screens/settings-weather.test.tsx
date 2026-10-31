import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen } from '@testing-library/react-native';

import SettingsScreen from '@/app/settings';

import { renderScreen } from '../../test/render';
import { goOffline, namur, respond } from '../../test/weather';

const fetchMock = global.fetch as jest.Mock;

const lyon = { name: 'Lyon', latitude: 45.74846, longitude: 4.84671, admin1: 'Auvergne-Rhône-Alpes', country: 'France' };
const lyonCanada = { name: 'Lyon', latitude: 45.38, longitude: -71.85, admin1: 'Québec', country: 'Canada' };

beforeEach(async () => {
  goOffline();
  await AsyncStorage.clear();
});

describe('réglages, météo', () => {
  it('cherche une ville, la retient sur le téléphone et la montre', async () => {
    fetchMock.mockImplementationOnce(respond({ results: [lyon, lyonCanada] }));
    await renderScreen(<SettingsScreen />);

    await fireEvent.changeText(await screen.findByLabelText('Ville'), 'Lyon');
    await fireEvent.press(screen.getByText('Chercher la ville'));
    await fireEvent.press(await screen.findByRole('button', { name: 'Lyon, Auvergne-Rhône-Alpes, France' }));

    expect(JSON.parse((await AsyncStorage.getItem('jardo.weatherPlace'))!)).toEqual({
      name: 'Lyon',
      region: 'Auvergne-Rhône-Alpes',
      country: 'France',
      latitude: 45.74846,
      longitude: 4.84671,
    });
    expect(await screen.findByText('Retirer')).toBeOnTheScreen();
    expect(screen.getByText('Auvergne-Rhône-Alpes, France')).toBeOnTheScreen();
    expect(screen.queryByText('Québec, Canada')).not.toBeOnTheScreen();
    expect(screen.getByLabelText('Changer de ville')).toHaveDisplayValue('');
  });

  it('retire la ville retenue', async () => {
    await AsyncStorage.setItem('jardo.weatherPlace', JSON.stringify(namur));
    await renderScreen(<SettingsScreen />);

    expect(await screen.findByText('Namur')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Retirer'));

    expect(await screen.findByLabelText('Ville')).toBeOnTheScreen();
    expect(screen.queryByText('Namur')).not.toBeOnTheScreen();
    await expect(AsyncStorage.getItem('jardo.weatherPlace')).resolves.toBeNull();
  });

  it('dit quand aucune ville ne correspond, et quand le réseau manque', async () => {
    fetchMock.mockImplementationOnce(respond({}));
    await renderScreen(<SettingsScreen />);

    await fireEvent.changeText(await screen.findByLabelText('Ville'), 'Xyzzy');
    await fireEvent(screen.getByLabelText('Ville'), 'submitEditing');
    expect(await screen.findByText('Aucune ville trouvée pour « Xyzzy ».')).toBeOnTheScreen();

    await fireEvent.press(screen.getByText('Chercher la ville'));
    expect(await screen.findByText('Recherche impossible. Vérifiez la connexion, puis réessayez.')).toBeOnTheScreen();
  });
});
