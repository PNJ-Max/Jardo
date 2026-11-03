import { Stack } from 'expo-router';

/** L'assistant de la carte : une pile à part, que le retour d'Android remonte étape par étape. */
export default function SetupLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
