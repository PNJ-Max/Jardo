import { Image, PixelRatio, View } from 'react-native';

import type { JournalEntryKind } from '@/api/types';
import { useTheme } from '@/theme';

import { kindMarks, tabMarks, type Mark, type TabName } from './drawings';
import { usePictogramRenderer } from './renderer';

export type { TabName } from './drawings';

/** Décoratif : le texte voisin nomme toujours ce que le pictogramme montre. */
function Pictogram({ id, marks, size }: { id: string; marks: () => Mark[]; size: number }) {
  const render = usePictogramRenderer();
  const style = { width: size, height: size };
  if (!render) return <View style={style} />;
  return (
    <Image
      source={{ uri: render(id, marks, PixelRatio.getPixelSizeForLayoutSize(size)) }}
      style={style}
      fadeDuration={0}
      aria-hidden
    />
  );
}

export function KindIcon({ kind, size = 32 }: { kind: JournalEntryKind; size?: number }) {
  const { scheme } = useTheme();
  return <Pictogram id={`${kind}:${scheme}`} marks={() => kindMarks(kind, scheme)} size={size} />;
}

/** L'onglet actif est rempli de `lawn`. */
export function TabIcon({ name, color, focused, size }: { name: TabName; color: string; focused: boolean; size: number }) {
  const { colors } = useTheme();
  const fill = focused ? colors.lawn : undefined;
  return <Pictogram id={`tab-${name}:${color}:${fill ?? ''}`} marks={() => tabMarks(name, color, fill)} size={size} />;
}
