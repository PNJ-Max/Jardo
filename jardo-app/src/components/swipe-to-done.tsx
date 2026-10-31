import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { DoneIcon } from '@/components/pictograms';
import { createStyles, useTheme } from '@/theme';

/** Au-delà, lâcher la ligne fait l'action ; un geste vif suffit à partir de `flickMin`. */
const actionThreshold = 112;
const flickMin = 48;
const flickVelocity = 800;

// Le dessous ne se voit qu'en glissant : les lecteurs d'écran passent par le bouton et la feuille.
const hiddenFromReaders = { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;

type SwipeToDoneProps = {
  /** Identifie le geste dans les tests (`getByGestureTestId`). */
  testId: string;
  enabled: boolean;
  onDone: () => void;
  /** « Reporter à demain », vers la gauche. Absent, la ligne ne glisse que vers la droite. */
  onPostpone?: () => void;
  /**
   * Au début et à la fin d'un glissement. Sur le web, le clic qui termine le glissement arrive
   * encore jusqu'à la ligne : elle s'en sert pour l'ignorer.
   */
  onSwiping: () => void;
  children: ReactNode;
};

/**
 * Glisser la ligne vers la droite découvre « Fait », vers la gauche « Demain » ; la lâcher au-delà
 * du seuil fait l'action, comme la feuille de la tâche. Le geste cède au défilement vertical. Le
 * bouton « Fait » et la feuille en sont l'alternative au toucher.
 */
export function SwipeToDone({ testId, enabled, onDone, onPostpone, onSwiping, children }: SwipeToDoneProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const offset = useSharedValue(0);
  const canPostpone = onPostpone !== undefined;

  const pan = Gesture.Pan()
    .withTestId(testId)
    .enabled(enabled)
    .activeOffsetX(canPostpone ? [-16, 16] : 16)
    .failOffsetY([-12, 12])
    .onStart(() => {
      scheduleOnRN(onSwiping);
    })
    .onUpdate((event) => {
      offset.set(canPostpone ? event.translationX : Math.max(0, event.translationX));
    })
    .onEnd((event) => {
      scheduleOnRN(onSwiping);
      const passed = (direction: 1 | -1) => {
        const distance = event.translationX * direction;
        return distance > actionThreshold || (distance > flickMin && event.velocityX * direction > flickVelocity);
      };
      if (passed(1)) scheduleOnRN(onDone);
      else if (onPostpone && passed(-1)) scheduleOnRN(onPostpone);
    })
    .onFinalize(() => {
      offset.set(withTiming(0, { duration: 220 }));
    });

  if (!canPostpone) pan.failOffsetX(-16);

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));
  const revealStyle = (direction: 1 | -1) => {
    'worklet';
    const progress = interpolate(offset.get() * direction, [0, actionThreshold], [0, 1], 'clamp');
    return { opacity: progress, transform: [{ scale: interpolate(progress, [0, 1], [0.7, 1]) }] };
  };
  const doneStyle = useAnimatedStyle(() => ({ opacity: offset.get() > 0 ? 1 : 0 }));
  const doneRevealStyle = useAnimatedStyle(() => revealStyle(1));
  const postponeStyle = useAnimatedStyle(() => ({ opacity: offset.get() < 0 ? 1 : 0 }));
  const postponeRevealStyle = useAnimatedStyle(() => revealStyle(-1));

  return (
    <View>
      <Animated.View style={[styles.under, styles.doneUnder, doneStyle]} {...hiddenFromReaders}>
        <Animated.View style={[styles.reveal, doneRevealStyle]}>
          <DoneIcon glyph="sprout" color={colors.primaryText} size={20} />
          <Text style={styles.revealText}>Fait</Text>
        </Animated.View>
      </Animated.View>
      {canPostpone && (
        <Animated.View style={[styles.under, styles.postponeUnder, postponeStyle]} {...hiddenFromReaders}>
          <Animated.View style={[styles.reveal, postponeRevealStyle]}>
            <Text style={styles.revealText}>Demain</Text>
            <Ionicons name="arrow-redo-outline" size={20} color={colors.primaryText} />
          </Animated.View>
        </Animated.View>
      )}
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.row, rowStyle]}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}

const useStyles = createStyles(({ colors, fonts, typography, spacing }) => ({
  under: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center' },
  doneUnder: { alignItems: 'flex-start', paddingLeft: spacing.lg, backgroundColor: colors.primary },
  // La terre, pas le vert : reporter n'est pas faire.
  postponeUnder: { alignItems: 'flex-end', paddingRight: spacing.lg, backgroundColor: colors.soil },
  reveal: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  revealText: { ...typography.body, fontFamily: fonts.heading, color: colors.primaryText },
  row: { backgroundColor: colors.card },
}));
