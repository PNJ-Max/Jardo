import { router } from 'expo-router';
import { Text, useWindowDimensions } from 'react-native';

import { MapPreview } from '@/components/map/map-preview';
import { SetupPage } from '@/components/setup';
import { Button } from '@/components/ui';
import { countryHouse } from '@/data/garden-layouts';
import { createStyles } from '@/theme';

/** L'accueil du premier lancement : ce que la carte apporte, et deux étapes pour la dessiner. */
export default function SetupWelcomeScreen() {
  const styles = useStyles();
  const { width } = useWindowDimensions();

  return (
    <SetupPage
      hero={<MapPreview layout={countryHouse} width={width} height={Math.round(Math.min(width, 520) * 0.72)} />}
      title="Votre jardin, dessiné"
      intro="Jardo dessine votre jardin vu d'en haut : le potager, le verger, la serre, le bois. La carte devient votre accueil, et chaque espace s'y ouvre d'un toucher."
      footer={<Button title="Dessiner mon jardin" icon="brush-outline" onPress={() => router.push('/setup/model')} />}>
      <Text style={styles.note}>Deux étapes, et tout se change ensuite dans Réglages.</Text>
    </SetupPage>
  );
}

const useStyles = createStyles(({ colors, typography, spacing }) => ({
  note: { ...typography.body, color: colors.text, paddingHorizontal: spacing.md },
}));
