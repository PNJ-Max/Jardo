import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createStyles } from '@/theme';

const undoDelayMs = 5000;

/** Au-dessus de la barre d'onglets, qui mesure 49 points hors marge de sécurité. */
const tabBarHeight = 49;

type Undo = { message: string; onUndo: () => void };

const ShowUndoContext = createContext<(undo: Undo) => void>(() => {});

/**
 * Message « Annuler » affiché quelques secondes en bas de l'écran. Il vit au-dessus de la
 * navigation : il reste visible quand l'action vient d'une modale qui se ferme. Un nouveau message
 * remplace le précédent, qui ne peut alors plus être annulé.
 */
export function UndoProvider({ children }: { children: ReactNode }) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<Undo | null>(null);

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => setCurrent(null), undoDelayMs);
    return () => clearTimeout(timer);
  }, [current]);

  const undo = () => {
    current?.onUndo();
    setCurrent(null);
  };

  return (
    <ShowUndoContext.Provider value={setCurrent}>
      {children}
      {current && (
        <View
          accessibilityLiveRegion="polite"
          style={[styles.bar, { bottom: insets.bottom + tabBarHeight + 8 }]}>
          <Text style={styles.message} numberOfLines={2}>
            {current.message}
          </Text>
          <Pressable
            onPress={undo}
            accessibilityRole="button"
            hitSlop={8}
            style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}>
            <Text style={styles.actionText}>Annuler</Text>
          </Pressable>
        </View>
      )}
    </ShowUndoContext.Provider>
  );
}

export const useShowUndo = () => useContext(ShowUndoContext);

const useStyles = createStyles(({ colors, fonts, typography, spacing, radius }) => ({
  bar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
  },
  message: { ...typography.body, flex: 1, color: colors.text },
  action: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
  actionText: { ...typography.body, fontFamily: fonts.bodySemiBold, color: colors.primary },
}));
