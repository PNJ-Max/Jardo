import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createStyles } from '@/theme';

const undoDelayMs = 5000;

/** Au-dessus de la barre d'onglets, qui mesure 49 points hors marge de sécurité. */
const tabBarHeight = 49;

type Undo = {
  message: string;
  onUndo: () => void;
  /** Une seconde action à côté d'« Annuler », qui ferme le message. */
  action?: { label: string; onPress: () => void };
};

const ShowUndoContext = createContext<(undo: Undo) => void>(() => {});

/**
 * Message « Annuler » affiché quelques secondes en bas de l'écran. Il vit au-dessus de la
 * navigation : il reste visible quand l'action vient d'une modale qui se ferme. Un nouveau message
 * remplace le précédent, qui ne peut alors plus être annulé.
 */
export function UndoProvider({ children }: { children: ReactNode }) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<(Undo & { key: number }) | null>(null);
  const show = useCallback(
    (undo: Undo) => setCurrent((previous) => ({ ...undo, key: (previous?.key ?? 0) + 1 })),
    [],
  );

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => setCurrent(null), undoDelayMs);
    return () => clearTimeout(timer);
  }, [current]);

  const close = (then?: () => void) => {
    then?.();
    setCurrent(null);
  };

  return (
    <ShowUndoContext.Provider value={show}>
      {children}
      {current && (
        <Animated.View
          // Une clé par message : celui qui en remplace un autre monte à son tour.
          key={current.key}
          entering={FadeInDown.duration(300)}
          accessibilityLiveRegion="polite"
          style={[styles.bar, { bottom: insets.bottom + tabBarHeight + 8 }]}>
          <Text style={styles.message} numberOfLines={2}>
            {current.message}
          </Text>
          <View style={styles.actions}>
            {current.action && <UndoAction label={current.action.label} onPress={() => close(current.action?.onPress)} />}
            <UndoAction label="Annuler" onPress={() => close(current.onUndo)} />
          </View>
        </Animated.View>
      )}
    </ShowUndoContext.Provider>
  );
}

function UndoAction({ label, onPress }: { label: string; onPress: () => void }) {
  const styles = useStyles();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      hitSlop={8}
      style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}>
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

export const useShowUndo = () => useContext(ShowUndoContext);

// Le message s'inverse sur l'écran : le fond prend la couleur du texte, pour se détacher des surfaces.
const useStyles = createStyles(({ colors, fonts, typography, spacing, radius }) => ({
  bar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.text,
    boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
  },
  // Assez large pour une ligne lisible ; au-delà, les actions passent dessous, à droite.
  message: { ...typography.body, fontFamily: fonts.bodyMedium, flexGrow: 1, flexShrink: 1, flexBasis: 180, color: colors.background, paddingVertical: spacing.sm },
  actions: { flexDirection: 'row', marginLeft: 'auto' },
  action: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
  actionText: { ...typography.body, fontFamily: fonts.heading, color: colors.background, textDecorationLine: 'underline' },
}));
