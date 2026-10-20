import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import TodayScreen from '@/app/(tabs)/today';
import type { GardenTask } from '@/api/types';

import { mockApi, problem } from '../../test/api';
import { task } from '../../test/fixtures';
import { renderScreen } from '../../test/render';

const dueUrl = 'GET /api/tasks/due?horizon=Week';

const overdue = task({ id: 1, title: 'Arroser les tomates', status: 'Overdue', daysOverdue: 2, itemName: 'Tomates' });
const dueToday = task({ id: 2, kind: 'Pruning', status: 'DueSoon', spaceName: 'Verger' });
const thisWeek = task({ id: 3, kind: 'Treatment', status: 'Ok', nextDueDate: '2026-10-24', spaceName: 'Serre' });

const entry = { id: 77, date: '2026-10-20', kind: 'Watering' };

/** Une réponse que le test libère quand il le décide, pour observer l'écran pendant l'attente. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

describe('écran Aujourd\'hui', () => {
  it('range les tâches en retard, du jour et de la semaine dans leurs sections', async () => {
    mockApi({ [dueUrl]: { body: [overdue, dueToday, thisWeek] } });
    await renderScreen(<TodayScreen />);

    expect(await screen.findByText('En retard')).toBeOnTheScreen();
    expect(screen.getByText("Aujourd'hui")).toBeOnTheScreen();
    expect(screen.getByText('Cette semaine')).toBeOnTheScreen();

    expect(screen.getByText('Arroser les tomates')).toBeOnTheScreen();
    expect(screen.getByText('En retard de 2 j')).toBeOnTheScreen();
    expect(screen.getByText('Tailler')).toBeOnTheScreen();
    expect(screen.getByText('Traiter')).toBeOnTheScreen();
    // Le voyant vient du serveur : « Prochain : » reprend nextDueDate sans recalcul.
    expect(screen.getByText(/Prochain : /)).toBeOnTheScreen();
  });

  it('n\'affiche pas les sections vides', async () => {
    mockApi({ [dueUrl]: { body: [dueToday] } });
    await renderScreen(<TodayScreen />);

    expect(await screen.findByText("Aujourd'hui")).toBeOnTheScreen();
    expect(screen.queryByText('En retard')).not.toBeOnTheScreen();
    expect(screen.queryByText('Cette semaine')).not.toBeOnTheScreen();
  });

  it('dit « rien aujourd\'hui » avant de montrer les tâches de la semaine', async () => {
    mockApi({ [dueUrl]: { body: [thisWeek] } });
    await renderScreen(<TodayScreen />);

    expect(await screen.findByText("Rien à faire aujourd'hui 🌱")).toBeOnTheScreen();
    expect(screen.getByText('Cette semaine')).toBeOnTheScreen();
  });

  it('montre l\'état vide quand il n\'y a aucune tâche', async () => {
    mockApi({ [dueUrl]: { body: [] } });
    await renderScreen(<TodayScreen />);

    expect(await screen.findByText("Rien à faire aujourd'hui 🌱")).toBeOnTheScreen();
    expect(screen.getByText("Ni cette semaine, d'ailleurs.")).toBeOnTheScreen();
  });

  it('affiche l\'erreur de l\'API et permet de réessayer', async () => {
    let attempts = 0;
    mockApi({
      [dueUrl]: () => (++attempts === 1 ? { status: 500, body: { detail: 'Base indisponible' } } : { body: [dueToday] }),
    });
    await renderScreen(<TodayScreen />);

    expect(await screen.findByText('Base indisponible')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Réessayer'));
    expect(await screen.findByText('Tailler')).toBeOnTheScreen();
  });

  describe('« Fait »', () => {
    const doneLabel = /^Fait : Arroser les tomates/;

    function setup(done: Parameters<typeof mockApi>[0][string]) {
      let tasks: GardenTask[] = [overdue, dueToday];
      const calls = mockApi({
        [dueUrl]: () => ({ body: tasks }),
        'POST /api/tasks/1/done': done,
        'DELETE /api/journal/77': () => {
          tasks = [overdue, dueToday];
          return { status: 204 };
        },
      });
      return { calls, serverMarksDone: () => (tasks = [dueToday]) };
    }

    it('retire la tâche aussitôt, avant la réponse de l\'API', async () => {
      const reply = deferred<{ body: unknown }>();
      setup(() => reply.promise);
      await renderScreen(<TodayScreen />);

      await fireEvent.press(await screen.findByLabelText(doneLabel));

      await waitFor(() => expect(screen.queryByText('Arroser les tomates')).not.toBeOnTheScreen());
      expect(screen.queryByText('En retard')).not.toBeOnTheScreen();
      expect(screen.getByText('Tailler')).toBeOnTheScreen();

      reply.resolve({ body: { task: { ...overdue, status: 'Ok' }, entry } });
      expect(await screen.findByText(/^Noté/)).toBeOnTheScreen();
    });

    it('propose d\'annuler, ce qui supprime l\'entrée notée et ramène la tâche', async () => {
      const { calls, serverMarksDone } = setup(() => {
        serverMarksDone();
        return { body: { task: { ...overdue, status: 'Ok' }, entry } };
      });
      await renderScreen(<TodayScreen />);

      await fireEvent.press(await screen.findByLabelText(doneLabel));

      expect(await screen.findByText('Noté : Arroser les tomates · Tomates')).toBeOnTheScreen();
      expect(screen.queryByText('Arroser les tomates')).not.toBeOnTheScreen();

      await fireEvent.press(screen.getByText('Annuler'));

      expect(await screen.findByText('Arroser les tomates')).toBeOnTheScreen();
      expect(calls).toContainEqual({ method: 'DELETE', path: '/api/journal/77', body: undefined });
      expect(screen.queryByText(/^Noté/)).not.toBeOnTheScreen();
    });

    it('remet la tâche et prévient quand l\'API refuse', async () => {
      const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      setup(() => problem(400, {}));
      await renderScreen(<TodayScreen />);

      await fireEvent.press(await screen.findByLabelText(doneLabel));

      await waitFor(() => expect(alert).toHaveBeenCalledWith("La tâche n'a pas été notée", expect.any(String)));
      expect(await screen.findByText('Arroser les tomates')).toBeOnTheScreen();
      expect(screen.queryByText(/^Noté/)).not.toBeOnTheScreen();
    });
  });
});
