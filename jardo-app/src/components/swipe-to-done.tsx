import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { DoneIcon } from '@/components/pictograms';
import { createStyles, useTheme } from '@/theme';

/** Au-delà, lâcher la ligne la fait ; un geste vif suffit à partir de `flickMin`. */
const doneThreshold = 112;
const flickMin = 48;
const flickVelocity = 800;

type SwipeToDoneProps = {
  /** Identifie le geste dans les tests (`getByGestureTestId`). */
  testId: string;
  enabled: boolean;
  onDone: () => void;
  children: ReactNode;
};

/**
 * Glisser la ligne vers la droite découvre « Fait » ; la lâcher au-delà du seuil la fait, comme le
 * bouton. Le geste ne démarre que vers la droite et cède au défilement vertical. Le bouton
 * « Fait » et la feuille de la tâche en sont l'alternative au toucher.
 */
export function SwipeToDone({ testId, enabled, onDone, children }: SwipeToDoneProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const offset = useSharedValue(0);

  const pan = Gesture.Pan()
    .withTestId(testId)
    .enabled(enabled)
    .activeOffsetX(16)
    .failOffsetX(-16)
    .failOffsetY([-12, 12])
    .onUpdate((event) => {
      offset.set(Math.max(0, event.translationX));
    })
    .onEnd((event) => {
      const done =
        event.translationX > doneThreshold || (event.translationX > flickMin && event.velocityX > flickVelocity);
      if (done) scheduleOnRN(onDone);
    })
    .onFinalize(() => {
      offset.set(withTiming(0, { duration: 220 }));
    });

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));
  const revealStyle = useAnimatedStyle(() => {
    const progress = interpolate(offset.get(), [0, doneThreshold], [0, 1], 'clamp');
    return { opacity: progress, transform: [{ scale: interpolate(progress, [0, 1], [0.7, 1]) }] };
  });

  return (
    <View>
      <View style={styles.under}>
        <Animated.View style={[styles.reveal, revealStyle]}>
          <DoneIcon glyph="sprout" color={colors.primaryText} size={20} />
          <Text style={styles.revealText}>Fait</Text>
        </Animated.View>
      </View>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.row, rowStyle]}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}

const useStyles = createStyles(({ colors, fonts, typography, spacing }) => ({
  under: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', paddingLeft: spacing.lg, backgroundColor: colors.primary },
  reveal: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  revealText: { ...typography.body, fontFamily: fonts.heading, color: colors.primaryText },
  row: { backgroundColor: colors.card },
}));
