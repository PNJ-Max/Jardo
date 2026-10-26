import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Écrit le fichier dans le cache de l'app et l'ouvre dans la feuille de partage du téléphone. */
export async function saveBackupFile(name: string, content: string): Promise<void> {
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Exporter mon jardin' });
}

/**
 * Le texte du fichier choisi, null si l'utilisateur renonce. Tout type de fichier est proposé : un
 * export reçu par une messagerie perd parfois son type JSON, et la lecture refuse ce qui n'en est pas un.
 */
export async function pickBackupFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
  if (result.canceled) return null;
  return new File(result.assets[0].uri).text();
}
