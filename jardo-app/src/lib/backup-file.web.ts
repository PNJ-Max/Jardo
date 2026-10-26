import * as DocumentPicker from 'expo-document-picker';

// Sur le web, la feuille de partage ne partage pas un fichier local (doc d'expo-sharing) et
// expo-file-system n'existe pas : l'export se télécharge, l'import se lit depuis le File du navigateur.

export async function saveBackupFile(name: string, content: string): Promise<void> {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  // Pas tout de suite : le téléchargement lit l'URL après le clic.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Le texte du fichier choisi, null si l'utilisateur renonce (le navigateur ne le signale pas toujours). */
export async function pickBackupFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', base64: false });
  if (result.canceled) return null;
  return result.assets[0].file!.text();
}
