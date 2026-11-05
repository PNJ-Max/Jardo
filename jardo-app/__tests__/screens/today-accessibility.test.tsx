import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { Dimensions, StyleSheet } from 'react-native';

import TodayScreen from '@/app/(tabs)/today';
import type { Services } from '@/data/services';
import { addDays } from '@/domain/dates';
import { today } from '@/lib/dates';

import { createTestServices, renderScreen } from '../../test/render';

const inDays = (days: number) => addDays(today(), days);

/** Un arrosage dû aujourd'hui et un autre en retard au potager (donc « Tout arroser »), et une taille dans le mois. */
async function addGarden(services: Services) {
  const potager = await services.spaces.create({ name: 'Potager', kind: 'VegetableGarden' });
  const parcelle = await services.zones.create(potager.id, { name: 'Parcelle 1' });
  const verger = await services.spaces.create({ name: 'Verger', kind: 'Orchard' });
  await services.tasks.create({
    kind: 'Watering',
    title: 'Arroser la parcelle',
    recurrence: 'EveryNDays',
    intervalDays: 3,
    startDate: today(),
    spaceId: potager.id,
    zoneId: parcelle.id,
  });
  await services.tasks.create({
    kind: 'Watering',
    title: 'Arroser les semis',
    recurrence: 'EveryNDays',
    intervalDays: 10,
    startDate: today(),
    spaceId: potager.id,
  });
  await services.tasks.create({
    kind: 'Watering',
    title: 'Arroser les tomates',
    recurrence: 'EveryNDays',
    intervalDays: 10,
    startDate: inDays(-2),
    spaceId: potager.id,
  });
  await services.tasks.create({
    kind: 'Pruning',
    title: 'Tailler les pommiers',
    recurrence: 'Yearly',
    startDate: inDays(12),
    spaceId: verger.id,
  });
}

const row = (title: string) => screen.findByRole('button', { name: new RegExp(`^${title}`) });
const actionEvent = (actionName: string) => ({ nativeEvent: { actionName } });

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());
const letRowFold = () => act(() => jest.advanceTimersByTime(1200));

describe("Aujourd'hui, lecteur d'écran", () => {
  it('nomme chaque ligne par son titre et sa cible, sans bouton imbriqué', async () => {
    const services = await createTestServices();
    await addGarden(services);
    await renderScreen(<TodayScreen />, services);

    const line = await row('Arroser les tomates');

    expect(line).toHaveAccessibleName(/Arroser les tomates.*en retard de 2 jours/);
    expect(line).toHaveProp('accessibilityHint', expect.stringContaining('Ouvre la feuille de la tâche'));
    expect(within(line).queryByRole('button')).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^Fait : Arroser les tomates/ })).toBeOnTheScreen();
  });

  it("propose « Fait » et « Reporter à demain » sur la ligne d'une tâche due", async () => {
    const services = await createTestServices();
    await addGarden(services);
    await renderScreen(<TodayScreen />, services);

    expect((await row('Arroser les tomates')).props.accessibilityActions).toEqual([
      { name: 'done', label: 'Fait' },
      { name: 'postpone', label: 'Reporter à demain' },
    ]);
  });

  it('ne propose pas de report pour une tâche pas encore due', async () => {
    const services = await createTestServices();
    await addGarden(services);
    await renderScreen(<TodayScreen />, services);

    await fireEvent.press(await screen.findByRole('button', { name: /Tailler les pommiers/, expanded: false }));

    const line = screen.getAllByRole('button', { name: /Tailler les pommiers/ }).find((button) => button.props.accessibilityHint);
    expect(line?.props.accessibilityActions).toEqual([{ name: 'done', label: 'Fait' }]);
  });

  it("note la tâche par l'action « Fait », comme le glissement", async () => {
    const services = await createTestServices();
    await addGarden(services);
    await renderScreen(<TodayScreen />, services);

    await fireEvent(await row('Arroser les tomates'), 'accessibilityAction', actionEvent('done'));
    await letRowFold();

    expect(await screen.findByText(/^Noté au journal : arroser les tomates/)).toBeOnTheScreen();
    await expect(services.journal.getAll()).resolves.toEqual([expect.objectContaining({ kind: 'Watering', date: today() })]);
  });

  it("reporte la tâche par l'action « Reporter à demain »", async () => {
    const services = await createTestServices();
    await addGarden(services);
    await renderScreen(<TodayScreen />, services);

    await fireEvent(await row('Arroser les tomates'), 'accessibilityAction', actionEvent('postpone'));
    await letRowFold();

    expect(await screen.findByText(/^Reporté à demain : arroser les tomates/)).toBeOnTheScreen();
    await waitFor(() => expect(screen.queryByRole('button', { name: /^Arroser les tomates/ })).not.toBeOnTheScreen());
    await expect(services.journal.getAll()).resolves.toEqual([]);
  });

  it('cache le dessous du glissement aux lecteurs, qui passent par les actions et le bouton', async () => {
    const services = await createTestServices();
    await addGarden(services);
    await renderScreen(<TodayScreen />, services);
    await row('Arroser les tomates');

    expect(screen.queryByText('Demain')).not.toBeOnTheScreen();
    expect(screen.getAllByText('Demain', { includeHiddenElements: true }).length).toBeGreaterThan(0);
  });

  it('nomme les actions de la feuille par leur rôle', async () => {
    const services = await createTestServices();
    await addGarden(services);
    await renderScreen(<TodayScreen />, services);

    await fireEvent.press(await row('Arroser les tomates'));

    for (const name of ["Fait aujourd'hui", /Reporter à demain/, /Fait un autre jour/, /Ouvrir la fiche/, 'Fermer']) {
      expect(screen.getByRole('button', { name })).toBeOnTheScreen();
    }
    expect(screen.getByRole('header', { name: 'Arroser les tomates' })).toBeOnTheScreen();
  });

  it("nomme l'espace comme un lien qui dit son nombre de tâches, et « Tout arroser » comme un bouton", async () => {
    const services = await createTestServices();
    await addGarden(services);
    await renderScreen(<TodayScreen />, services);

    expect(await screen.findByRole('link', { name: 'Potager, 2 tâches' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Tout arroser : Potager, 3 arrosages' })).toHaveProp(
      'accessibilityHint',
      expect.stringContaining('un seul arrosage'),
    );
  });

  it('annonce le jour choisi et le groupe replié', async () => {
    const services = await createTestServices();
    await addGarden(services);
    await renderScreen(<TodayScreen />, services);

    const days = await screen.findAllByRole('tab');
    expect(days[0]).toBeSelected();
    expect(days[1]).not.toBeSelected();
    await fireEvent.press(days[1]);
    expect(screen.getByRole('tab', { selected: true })).toBe(days[1]);

    const month = screen.getByRole('button', { name: /Tailler les pommiers/, expanded: false });
    await fireEvent.press(month);
    expect(month).toBeExpanded();
    await fireEvent.press(month);
    expect(month).toBeCollapsed();
  });

  describe('grandes polices', () => {
    const window = Dimensions.get('window');
    afterEach(() => act(() => Dimensions.set({ window })));

    async function doneButtonLayout(fontScale: number) {
      Dimensions.set({ window: { ...window, fontScale } });
      const services = await createTestServices();
      await addGarden(services);
      await renderScreen(<TodayScreen />, services);
      const line = await row('Arroser les tomates');
      return StyleSheet.flatten(line.parent?.props.style).flexDirection;
    }

    it('garde « Fait » à droite du titre à la taille par défaut', async () => {
      await expect(doneButtonLayout(1)).resolves.toBe('row');
    });

    it('passe « Fait » sous le texte quand la police est agrandie, faute de place pour le titre', async () => {
      await expect(doneButtonLayout(2)).resolves.toBe('column');
    });
  });
});
