import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { goBack } from '@/lib/navigation';
import { createStyles, useTheme } from '@/theme';

import { Button } from './button';
import { FormError } from './form';
import { ErrorView, Loading } from './states';

type FormPageProps = { title: string; children: ReactNode };

/** Titre en `display` et bouton fermer rond : l'en-tête des formulaires, qui s'ouvrent en modale sans barre de navigation. */
export function FormPage({ title, children }: FormPageProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.page}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Fermer"
          hitSlop={8}
          style={({ pressed }) => [styles.close, pressed && { opacity: 0.7 }]}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
      </View>
      {children}
    </View>
  );
}

/** Ce que le formulaire modifie se charge encore, ou n'a pas pu l'être : on peut quand même le fermer. */
export function FormPending({ title, error, onRetry }: { title: string; error: Error | null; onRetry: () => void }) {
  return <FormPage title={title}>{error ? <ErrorView error={error} onRetry={onRetry} /> : <Loading />}</FormPage>;
}

type FormScreenProps = {
  title: string;
  /** Dit ce que le bouton fait : « Créer l'espace », « Enregistrer les modifications »… */
  submitLabel: string;
  onSubmit: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** Refus du service ; l'erreur d'un champ s'affiche, elle, sous ce champ. */
  error?: Error | null;
  children: ReactNode;
};

/** Les champs défilent ; le bouton principal reste ancré en bas, à portée du pouce. */
export function FormScreen({ title, submitLabel, onSubmit, loading, disabled, error = null, children }: FormScreenProps) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  return (
    <FormPage title={title}>
      <KeyboardAvoidingView style={styles.body} behavior={Platform.OS === 'web' ? undefined : 'padding'}>
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.fields}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          {children}
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <FormError error={error} />
          <Button title={submitLabel} onPress={onSubmit} loading={loading} disabled={disabled} />
        </View>
      </KeyboardAvoidingView>
    </FormPage>
  );
}

const useStyles = createStyles(({ colors, typography, spacing }) => ({
  page: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { ...typography.display, color: colors.text, flex: 1 },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSunken,
  },
  body: { flex: 1 },
  fields: { padding: spacing.md, gap: spacing.md },
  footer: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm + 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
}));
