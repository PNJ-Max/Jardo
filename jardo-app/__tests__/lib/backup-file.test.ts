import * as DocumentPicker from 'expo-document-picker';

import { maxBackupBytes } from '@/data/backup';
import { pickBackupFile } from '@/lib/backup-file';
import { pickBackupFile as pickBackupFileOnWeb } from '@/lib/backup-file.web';

const mockChosen = { size: 0, text: jest.fn(async () => '{"format":"jardo"}') };

jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn() }));
jest.mock('expo-file-system', () => ({
  Paths: { cache: 'cache' },
  File: class {
    get size() {
      return mockChosen.size;
    }
    text() {
      return mockChosen.text();
    }
  },
}));

const refused = { problem: { title: 'Fichier refusé', detail: expect.stringMatching(/trop gros/) } };

beforeEach(() => {
  mockChosen.text.mockClear();
  jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///cache/jardo.json', name: 'jardo.json', lastModified: 0, file: mockChosen as unknown as File }],
  });
});

describe.each([
  ['sur le téléphone', pickBackupFile],
  ['sur le web', pickBackupFileOnWeb],
])('fichier de sauvegarde, %s', (_, pick) => {
  it('refuse un fichier trop gros sans le lire', async () => {
    mockChosen.size = maxBackupBytes + 1;

    await expect(pick()).rejects.toMatchObject(refused);
    expect(mockChosen.text).not.toHaveBeenCalled();
  });

  it('lit un fichier à la taille limite', async () => {
    mockChosen.size = maxBackupBytes;

    await expect(pick()).resolves.toBe('{"format":"jardo"}');
  });

  it('ne lit rien si l’utilisateur renonce', async () => {
    jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({ canceled: true, assets: null });

    await expect(pick()).resolves.toBeNull();
    expect(mockChosen.text).not.toHaveBeenCalled();
  });
});
