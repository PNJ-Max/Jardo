import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen } from '@testing-library/react-native';

import SettingsScreen from '@/app/settings';

import { mockApi, problem } from '../../test/api';
import { renderScreen } from '../../test/render';

const garden = { id: 1, name: 'Jardin des Tilleuls', createdAt: '2026-01-01T00:00:00Z' };

describe('réglages', () => {
  it('renomme le jardin', async () => {
    const calls = mockApi({
      'GET /api/garden': { body: garden },
      'PUT /api/garden': ({ body }) => ({ body: { ...garden, ...(body as object) } }),
    });
    await renderScreen(<SettingsScreen />);

    expect(screen.queryByText('Enregistrer le nom')).not.toBeOnTheScreen();
    await fireEvent.changeText(await screen.findByDisplayValue('Jardin des Tilleuls'), '  Jardin de Maxime ');
    await fireEvent.press(screen.getByText('Enregistrer le nom'));

    expect(await screen.findByText('Nom enregistré.')).toBeOnTheScreen();
    expect(calls).toContainEqual({ method: 'PUT', path: '/api/garden', body: { name: 'Jardin de Maxime' } });
    expect(screen.queryByText('Enregistrer le nom')).not.toBeOnTheScreen();
  });

  it("affiche sous le champ l'erreur de validation de l'API", async () => {
    mockApi({
      'GET /api/garden': { body: garden },
      'PUT /api/garden': problem(400, { Name: ['Le nom est trop long.'] }),
    });
    await renderScreen(<SettingsScreen />);

    await fireEvent.changeText(await screen.findByDisplayValue('Jardin des Tilleuls'), 'Autre nom');
    await fireEvent.press(screen.getByText('Enregistrer le nom'));

    expect(await screen.findByText('Le nom est trop long.')).toBeOnTheScreen();
  });

  it("mémorise l'apparence choisie sur l'appareil", async () => {
    mockApi({ 'GET /api/garden': { body: garden } });
    await renderScreen(<SettingsScreen />);

    await fireEvent.press(await screen.findByText('Sombre'));

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('jardo.themePreference', 'dark');
  });

  it("donne la version de l'app", async () => {
    mockApi({ 'GET /api/garden': { body: garden } });
    await renderScreen(<SettingsScreen />);

    expect(await screen.findByText(/^Version /)).toBeOnTheScreen();
  });
});
