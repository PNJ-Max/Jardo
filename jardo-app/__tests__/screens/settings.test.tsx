import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen } from '@testing-library/react-native';

import SettingsScreen from '@/app/settings';

import { createTestServices, renderScreen } from '../../test/render';

async function setup() {
  const services = await createTestServices();
  await services.garden.update({ name: 'Jardin des Tilleuls' });
  return services;
}

describe('réglages', () => {
  it('renomme le jardin', async () => {
    const services = await setup();
    await renderScreen(<SettingsScreen />, services);

    expect(screen.queryByText('Enregistrer le nom')).not.toBeOnTheScreen();
    await fireEvent.changeText(await screen.findByDisplayValue('Jardin des Tilleuls'), '  Jardin de Maxime ');
    await fireEvent.press(screen.getByText('Enregistrer le nom'));

    expect(await screen.findByText('Nom enregistré.')).toBeOnTheScreen();
    await expect(services.garden.get()).resolves.toMatchObject({ name: 'Jardin de Maxime' });
    expect(screen.queryByText('Enregistrer le nom')).not.toBeOnTheScreen();
  });

  it("affiche sous le champ l'erreur de validation du service", async () => {
    await renderScreen(<SettingsScreen />, await setup());

    // maxLength borne la saisie au clavier, pas changeText : le service reste juge.
    await fireEvent.changeText(await screen.findByDisplayValue('Jardin des Tilleuls'), 'a'.repeat(101));
    await fireEvent.press(screen.getByText('Enregistrer le nom'));

    expect(await screen.findByText('Le champ « Nom » ne doit pas dépasser 100 caractères.')).toBeOnTheScreen();
  });

  it("mémorise l'apparence choisie sur l'appareil", async () => {
    await renderScreen(<SettingsScreen />);

    await fireEvent.press(await screen.findByText('Sombre'));

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('jardo.themePreference', 'dark');
  });

  it("donne la version de l'app", async () => {
    await renderScreen(<SettingsScreen />);

    expect(await screen.findByText(/^Version /)).toBeOnTheScreen();
  });
});
