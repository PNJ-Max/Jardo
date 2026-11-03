import { fireEvent, render, screen } from '@testing-library/react-native';

import { AppError } from '@/components/app-error';
import { NewerDatabaseError } from '@/data/migrations';

describe("l'écran d'erreur de l'app", () => {
  it('dit que la démo web est déjà ouverte ailleurs quand la base est verrouillée', async () => {
    // Le texte que le worker d'expo-sqlite renvoie quand un autre onglet tient la base.
    const error = new Error(
      "NoModificationAllowedError: Failed to execute 'createSyncAccessHandle' on 'FileSystemFileHandle': Access Handles cannot be created if there is another open Access Handle or Writable stream associated with the same file.",
    );
    await render(<AppError error={error} retry={jest.fn()} />);

    expect(screen.getByRole('header', { name: 'Jardo est déjà ouvert dans un autre onglet' })).toBeOnTheScreen();
    expect(screen.getByText(/Fermez l'autre onglet/)).toBeOnTheScreen();
  });

  it("dit d'installer la dernière version quand la base est plus récente que l'app", async () => {
    await render(<AppError error={new NewerDatabaseError(4, 2)} retry={jest.fn()} />);

    expect(screen.getByRole('header', { name: 'Cette version de Jardo est trop ancienne' })).toBeOnTheScreen();
    expect(screen.getByText(/rien n'a été effacé/)).toBeOnTheScreen();
  });

  it("affiche toute autre erreur telle quelle, et propose de réessayer", async () => {
    const retry = jest.fn(async () => {});
    await render(<AppError error={new Error('Disque plein.')} retry={retry} />);

    expect(screen.getByRole('header', { name: "Jardo n'a pas pu continuer" })).toBeOnTheScreen();
    expect(screen.getByText('Disque plein.')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Réessayer' }));
    expect(retry).toHaveBeenCalled();
  });
});
