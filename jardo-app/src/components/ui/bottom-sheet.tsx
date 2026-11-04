import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, View, type ViewStyle } from 'react-native';
import Animated, { SlideInDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createStyles } from '@/theme';

type BottomSheetProps = {
  visible: boolean;
  /** Le voile, et le retour d'Android : la feuille se ferme sans quitter l'écran dessous. */
  onClose: () => void;
  style?: ViewStyle;
  children: ReactNode;
};

/** Une feuille qui monte du bas, sur un voile. */
export function BottomSheet({ visible, onClose, style, children }: BottomSheetProps) {
  const styles = useStyles();
  const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType={reduceMotion ? 'none' : 'fade'}
      onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'web' ? undefined : 'padding'}>
        <Pressable style={styles.dismiss} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer" />
        <Animated.View
          entering={reduceMotion ? undefined : SlideInDown.duration(260)}
          style={[styles.sheet, { paddingBottom: insets.bottom + 16 }, style]}>
          <View style={styles.handle} />
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const useStyles = createStyles(({ colors, spacing }) => ({
  // Le voile assombrit l'écran dans les deux thèmes, comme les ombres.
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  dismiss: { flex: 1 },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.md,
    // Aux grandes polices, la feuille défile plutôt que de sortir de l'écran.
    maxHeight: '92%',
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border },
}));
