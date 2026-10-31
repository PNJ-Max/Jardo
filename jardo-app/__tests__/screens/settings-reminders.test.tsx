import AsyncStorage from '@react-native-async-storage/async-storage';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native';

import SettingsScreen from '@/app/settings';

import { renderScreen } from '../../test/render';

jest.mock('@react-native-community/datetimepicker', () => ({ DateTimePickerAndroid: { open: jest.fn() } }));

const getPermissions = Notifications.getPermissionsAsync as jest.Mock;
const requestPermissions = Notifications.requestPermissionsAsync as jest.Mock;
const denied = { granted: false, status: 'denied', canAskAgain: false };

const stored = async () => JSON.parse((await AsyncStorage.getItem('jardo.reminders'))!);

beforeEach(async () => {
  jest.clearAllMocks();
  getPermissions.mockResolvedValue({ granted: false, status: 'undetermined', canAskAgain: true });
  await AsyncStorage.clear();
});

describe('réglages, rappels', () => {
  it("est désactivé par défaut, sans rien demander à l'ouverture", async () => {
    await renderScreen(<SettingsScreen />);

    expect(await screen.findByRole('switch', { name: 'Rappel du jour' })).not.toBeChecked();
    expect(screen.queryByText('Heure du rappel')).not.toBeOnTheScreen();
    expect(requestPermissions).not.toHaveBeenCalled();
  });

  it("demande la permission à l'activation, après avoir créé le canal, et retient le choix", async () => {
    await renderScreen(<SettingsScreen />);

    await fireEvent(await screen.findByRole('switch', { name: 'Rappel du jour' }), 'valueChange', true);

    expect(await screen.findByLabelText('Heure du rappel : 8 h')).toBeOnTheScreen();
    expect(screen.getByRole('switch', { name: 'Rappel du jour' })).toBeChecked();
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      'reminders',
      expect.objectContaining({ name: 'Rappels du jardin' }),
    );
    const channelCreated = (Notifications.setNotificationChannelAsync as jest.Mock).mock.invocationCallOrder[0];
    expect(channelCreated).toBeLessThan(requestPermissions.mock.invocationCallOrder[0]);
    expect(await stored()).toEqual({ enabled: true, hour: 8, minute: 0 });
  });

  it("change l'heure du rappel", async () => {
    await AsyncStorage.setItem('jardo.reminders', JSON.stringify({ enabled: true, hour: 8, minute: 0 }));
    await renderScreen(<SettingsScreen />);

    await fireEvent.press(await screen.findByLabelText('Heure du rappel : 8 h'));
    const { mode, is24Hour, onValueChange } = (DateTimePickerAndroid.open as jest.Mock).mock.lastCall[0];
    expect([mode, is24Hour]).toEqual(['time', true]);
    await act(async () => onValueChange({}, new Date(2026, 9, 28, 18, 30)));

    expect(await screen.findByLabelText('Heure du rappel : 18 h 30')).toBeOnTheScreen();
    expect(await stored()).toEqual({ enabled: true, hour: 18, minute: 30 });
  });

  it('se désactive', async () => {
    await AsyncStorage.setItem('jardo.reminders', JSON.stringify({ enabled: true, hour: 7, minute: 15 }));
    await renderScreen(<SettingsScreen />);

    await fireEvent(await screen.findByRole('switch', { name: 'Rappel du jour' }), 'valueChange', false);

    await waitFor(() => expect(screen.queryByText('Heure du rappel')).not.toBeOnTheScreen());
    expect(await stored()).toEqual({ enabled: false, hour: 7, minute: 15 });
  });

  it('reste désactivé si la permission est refusée, et propose les réglages du téléphone', async () => {
    requestPermissions.mockResolvedValueOnce(denied);
    getPermissions.mockResolvedValue(denied);
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    await renderScreen(<SettingsScreen />);

    await fireEvent(await screen.findByRole('switch', { name: 'Rappel du jour' }), 'valueChange', true);

    expect(await screen.findByText(/Les notifications de Jardo sont bloquées/)).toBeOnTheScreen();
    expect(screen.getByRole('switch', { name: 'Rappel du jour' })).not.toBeChecked();
    await expect(AsyncStorage.getItem('jardo.reminders')).resolves.toBeNull();

    await fireEvent.press(screen.getByText('Ouvrir les réglages du téléphone'));
    expect(openSettings).toHaveBeenCalled();

    openSettings.mockRestore();
  });

  it('signale des rappels activés dont la permission a été retirée depuis', async () => {
    getPermissions.mockResolvedValueOnce(denied);
    await AsyncStorage.setItem('jardo.reminders', JSON.stringify({ enabled: true, hour: 8, minute: 0 }));
    await renderScreen(<SettingsScreen />);

    expect(await screen.findByText(/Les notifications de Jardo sont bloquées/)).toBeOnTheScreen();
    expect(screen.getByText('Ouvrir les réglages du téléphone')).toBeOnTheScreen();
  });
});
