import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen } from '@testing-library/react-native';

import SettingsScreen from '@/app/settings';
import { readBackup } from '@/data/backup';
import { pickBackupFile, saveBackupFile } from '@/lib/backup-file';
import { confirm } from '@/lib/confirm';
import { today } from '@/lib/dates';

import { createTestServices, renderScreen } from '../../test/render';

jest.mock('@/lib/backup-file', () => ({ saveBackupFile: jest.fn(), pickBackupFile: jest.fn() }));
jest.mock('@/lib/confirm', () => ({ confirm: jest.fn() }));

/** Le fichier qu'exporterait un autre téléphone. */
async function neighbourFile() {
  const services = await createTestServices();
  await services.garden.update({ name: 'Jardin du voisin' });
  await services.spaces.create({ name: 'Verger du voisin', kind: 'Orchard' });
  return JSON.stringify(await services.backup.export());
}

async function setup() {
  const services = await createTestServices();
  await services.garden.update({ name: 'Jardin des Tilleuls' });
  return services;
}

describe('réglages', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renomme le jardin', async () => {
    const services = await setup();
    await renderScreen(<SettingsScreen />, services);

    expect(screen.queryByText('Enregistrer le nom')).not.toBeOnTheScreen();
    await fireEvent.changeText(await screen.findByDisplayValue('Jardin des Tilleuls'), '  Jardin de Maxime ');
    await fireEvent.press(screen.getByRole('button', { name: 'Enregistrer le nom' }));

    expect(await screen.findByText('Nom enregistré.')).toBeOnTheScreen();
    await expect(services.garden.get()).resolves.toMatchObject({ name: 'Jardin de Maxime' });
    expect(screen.queryByText('Enregistrer le nom')).not.toBeOnTheScreen();
  });

  it("dit les dates de référence tant qu'aucun climat n'est choisi, et donne les repères de chacun", async () => {
    await renderScreen(<SettingsScreen />, await setup());

    expect(await screen.findByRole('header', { name: 'Climat du jardin' })).toBeOnTheScreen();
    expect(await screen.findByText(/En attendant, les dates sont celles d'un climat tempéré/)).toBeOnTheScreen();
    const climateName = /^(Méditerranéen|Doux|Tempéré|Frais|Montagne)\./;
    expect(screen.getAllByRole('radio', { name: climateName })).toHaveLength(5);
    expect(screen.queryByRole('radio', { name: climateName, checked: true })).not.toBeOnTheScreen();
    for (const landmark of ['Provence, Languedoc', 'Bretagne', 'Bassin parisien', 'Massif central', 'Au-dessus de 800 m']) {
      expect(screen.getByText(new RegExp(landmark))).toBeOnTheScreen();
    }
  });

  it('enregistre le climat choisi et le coche', async () => {
    const services = await setup();
    await renderScreen(<SettingsScreen />, services);

    await fireEvent.press(await screen.findByRole('radio', { name: /^Montagne\. .*800 m/ }));

    expect(await screen.findByRole('radio', { name: /^Montagne\./, checked: true })).toBeOnTheScreen();
    expect(screen.getByText(/suivent ce climat/)).toBeOnTheScreen();
    expect(screen.queryByText(/En attendant/)).not.toBeOnTheScreen();
    await expect(services.garden.get()).resolves.toMatchObject({ climate: 'Mountain' });

    await fireEvent.press(screen.getByRole('radio', { name: /^Frais\./ }));

    expect(await screen.findByRole('radio', { name: /^Frais\./, checked: true })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: /^Montagne\./, checked: false })).toBeOnTheScreen();
    await expect(services.garden.get()).resolves.toMatchObject({ climate: 'Cool' });
  });

  it("affiche l'erreur si le climat ne s'enregistre pas", async () => {
    const services = await setup();
    jest.spyOn(services.garden, 'setClimate').mockRejectedValue(new Error('Base indisponible'));
    await renderScreen(<SettingsScreen />, services);

    await fireEvent.press(await screen.findByRole('radio', { name: /^Doux\./ }));

    expect(await screen.findByText(/Base indisponible/)).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: /^Doux\./, checked: false })).toBeOnTheScreen();
  });

  it("affiche sous le champ l'erreur de validation du service", async () => {
    await renderScreen(<SettingsScreen />, await setup());

    // maxLength borne la saisie au clavier, pas changeText : le service reste juge.
    await fireEvent.changeText(await screen.findByDisplayValue('Jardin des Tilleuls'), 'a'.repeat(101));
    await fireEvent.press(screen.getByRole('button', { name: 'Enregistrer le nom' }));

    expect(await screen.findByText('Le champ « Nom » ne doit pas dépasser 100 caractères.')).toBeOnTheScreen();
  });

  it("mémorise l'apparence choisie sur l'appareil", async () => {
    await renderScreen(<SettingsScreen />);

    await fireEvent.press(await screen.findByText('Sombre'));

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('jardo.themePreference', 'dark');
  });

  it('exporte tout le jardin dans un fichier', async () => {
    await renderScreen(<SettingsScreen />, await setup());

    expect(await screen.findByText(/Le fichier exporté contient tout le jardin/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Exporter mon jardin' }));

    const name = `jardo-${today()}.json`;
    expect(await screen.findByText(`Fichier exporté : ${name}.`)).toBeOnTheScreen();
    const [savedName, content] = jest.mocked(saveBackupFile).mock.calls[0];
    expect(savedName).toBe(name);
    expect(readBackup(content).tables.gardens[0].name).toBe('Jardin des Tilleuls');
  });

  it('importe un jardin après confirmation, en remplaçant le jardin actuel', async () => {
    const services = await setup();
    jest.mocked(pickBackupFile).mockResolvedValue(await neighbourFile());
    jest.mocked(confirm).mockResolvedValue(true);
    await renderScreen(<SettingsScreen />, services);

    await fireEvent.press(await screen.findByRole('button', { name: 'Importer un jardin' }));

    expect(await screen.findByText('Jardin importé.')).toBeOnTheScreen();
    expect(confirm).toHaveBeenCalledWith(
      'Remplacer le jardin actuel ?',
      expect.stringContaining('Le fichier contient le jardin « Jardin du voisin »'),
      'Remplacer',
    );
    expect(screen.getByDisplayValue('Jardin du voisin')).toBeOnTheScreen();
    await expect(services.spaces.getAll()).resolves.toEqual([expect.objectContaining({ name: 'Verger du voisin' })]);
  });

  it('coche le climat du jardin importé', async () => {
    const services = await setup();
    const neighbour = await createTestServices();
    await neighbour.garden.setClimate('Mediterranean');
    jest.mocked(pickBackupFile).mockResolvedValue(JSON.stringify(await neighbour.backup.export()));
    jest.mocked(confirm).mockResolvedValue(true);
    await renderScreen(<SettingsScreen />, services);

    await fireEvent.press(await screen.findByRole('button', { name: 'Importer un jardin' }));

    expect(await screen.findByRole('radio', { name: /^Méditerranéen\./, checked: true })).toBeOnTheScreen();
  });

  it('ne remplace rien si la confirmation est refusée', async () => {
    const services = await setup();
    jest.mocked(pickBackupFile).mockResolvedValue(await neighbourFile());
    jest.mocked(confirm).mockResolvedValue(false);
    await renderScreen(<SettingsScreen />, services);

    await fireEvent.press(await screen.findByRole('button', { name: 'Importer un jardin' }));

    expect(confirm).toHaveBeenCalled();
    await expect(services.garden.get()).resolves.toMatchObject({ name: 'Jardin des Tilleuls' });
    expect(screen.queryByText('Jardin importé.')).not.toBeOnTheScreen();
  });

  it('refuse un fichier abîmé sans rien modifier, et dit pourquoi', async () => {
    const services = await setup();
    jest.mocked(pickBackupFile).mockResolvedValue('{ "format": "jardo", ');
    await renderScreen(<SettingsScreen />, services);

    await fireEvent.press(await screen.findByRole('button', { name: 'Importer un jardin' }));

    expect(await screen.findByText(/^Import impossible, rien n'a été modifié\. .*pas du JSON valide/)).toBeOnTheScreen();
    expect(confirm).not.toHaveBeenCalled();
    await expect(services.garden.get()).resolves.toMatchObject({ name: 'Jardin des Tilleuls' });
  });

  it("donne la version de l'app", async () => {
    await renderScreen(<SettingsScreen />);

    expect(await screen.findByText(/^Version /)).toBeOnTheScreen();
  });
});
