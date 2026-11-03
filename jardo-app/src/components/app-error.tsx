import Ionicons from '@expo/vector-icons/Ionicons';
import type { ErrorBoundaryProps } from 'expo-router';
import { Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { NewerDatabaseError } from '@/data/migrations';
import { createStyles, useTheme } from '@/theme';

/** Ce que l'écran d'erreur dit, selon l'erreur qui a arrêté l'app. */
export function describeAppError(error: Error): { title: string; message: string } {
  if (error instanceof NewerDatabaseError) {
    return {
      title: 'Cette version de Jardo est trop ancienne',
      message:
        "Le jardin enregistré sur ce téléphone vient d'une version plus récente de l'app. Installez la dernière " +
        "version pour le retrouver : rien n'a été effacé.",
    };
  }
  // Sur le web, la base ne s'ouvre que dans un onglet à la fois (verrou OPFS d'expo-sqlite). L'erreur
  // traverse le worker de la base, qui n'en garde que le texte.
  if (error.name === 'NoModificationAllowedError' || error.message.includes('NoModificationAllowedError')) {
    return {
      title: 'Jardo est déjà ouvert dans un autre onglet',
      message: "Le jardin ne s'ouvre que dans un onglet à la fois. Fermez l'autre onglet, puis réessayez.",
    };
  }
  return { title: "Jardo n'a pas pu continuer", message: error.message };
}

/**
 * L'`ErrorBoundary` de la racine : une erreur que rien n'a rattrapée, à commencer par l'ouverture
 * de la base, s'affiche ici au lieu d'un écran figé. Expo Router cache alors l'écran de démarrage.
 */
export function AppError({ error, retry }: ErrorBoundaryProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { title, message } = describeAppError(error);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}>
      <Ionicons aria-hidden name="alert-circle-outline" size={48} color={colors.danger} />
      <View style={styles.text}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.message}>{message}</Text>
      </View>
      <Button title="Réessayer" icon="refresh" onPress={Platform.OS === 'web' ? reload : () => void retry()} />
    </ScrollView>
  );
}

// Sur le web, le worker de la base reste inutilisable après un échec d'ouverture : seule une page
// neuve en ouvre un autre.
const reload = () => window.location.reload();

const useStyles = createStyles(({ colors, typography, spacing }) => ({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, paddingHorizontal: spacing.lg },
  text: { gap: spacing.sm, maxWidth: 360 },
  title: { ...typography.section, color: colors.text, textAlign: 'center' },
  message: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
}));
