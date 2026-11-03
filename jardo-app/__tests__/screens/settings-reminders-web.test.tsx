import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';

import SettingsScreen from '@/app/settings';
import { Reminders } from '@/components/reminders';

import { renderScreen } from '../../test/render';

// Metro prend notifications.web.ts dans le navigateur ; Jest tourne en natif, on le lui impose.
jest.mock('@/lib/notifications', () => jest.requireActual('@/lib/notifications.web'));

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

describe('rappels sur le web', () => {
  it("Réglages n'en parle pas", async () => {
    await renderScreen(<SettingsScreen />);

    expect(await screen.findByText('Météo')).toBeOnTheScreen();
    expect(screen.queryByText('Rappels')).not.toBeOnTheScreen();
    expect(screen.queryByRole('switch', { name: 'Rappel du jour' })).not.toBeOnTheScreen();
  });

  it('ne programme rien, même avec des rappels activés sur un autre appareil', async () => {
    await AsyncStorage.setItem('jardo.reminders', JSON.stringify({ enabled: true, hour: 8, minute: 0 }));
    await renderScreen(<Reminders />);

    expect(screen.toJSON()).toBeNull();
    expect(Notifications.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(Notifications.addNotificationResponseReceivedListener).not.toHaveBeenCalled();
  });
});
