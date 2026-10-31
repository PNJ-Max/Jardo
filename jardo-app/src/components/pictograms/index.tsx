import { Image, PixelRatio, View } from 'react-native';

import type { JournalEntryKind } from '@/api/types';
import type { WeatherKind } from '@/lib/weather';
import { useTheme } from '@/theme';

import { doneMarks, kindMarks, tabMarks, weatherMarks, type DoneGlyph, type Mark, type TabName } from './drawings';
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

/** Les teintes de la barre d'onglets : l'onglet actif est en `primary`, rempli de `lawn`. */
export function TabIcon({ name, focused, size }: { name: TabName; focused: boolean; size: number }) {
  const { scheme, colors } = useTheme();
  const color = focused ? colors.primary : colors.textMuted;
  const fill = focused ? colors.lawn : undefined;
  return <Pictogram id={`tab-${name}:${scheme}:${focused}`} marks={() => tabMarks(name, color, fill)} size={size} />;
}

export function WeatherIcon({ kind, size = 32 }: { kind: WeatherKind; size?: number }) {
  const { scheme } = useTheme();
  return <Pictogram id={`weather-${kind}:${scheme}`} marks={() => weatherMarks(kind, scheme)} size={size} />;
}

export function DoneIcon({ glyph, color, size }: { glyph: DoneGlyph; color: string; size: number }) {
  return <Pictogram id={`done-${glyph}:${color}`} marks={() => doneMarks(glyph, color)} size={size} />;
}
