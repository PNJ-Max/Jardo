import { palettes, type Colors, type ColorScheme } from '@/theme/colors';

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

type Pair = [foreground: keyof Colors, background: keyof Colors];

// Texte et icônes posés sur des fonds : seuil AA du texte courant.
const textPairs: Pair[] = [
  ['text', 'surfaceSunken'],
  ['textMuted', 'surfaceSunken'],
  ['textMuted', 'skyTop'],
  ['primary', 'tile'],
  ['primary', 'lawn'],
  ['soil', 'background'],
  ['soil', 'card'],
  ['soil', 'soilTint'],
];

describe.each<ColorScheme>(['light', 'dark'])('palette %s', (scheme) => {
  it.each(textPairs)('%s sur %s atteint 4,5:1', (foreground, background) => {
    expect(contrast(palettes[scheme][foreground], palettes[scheme][background])).toBeGreaterThanOrEqual(4.5);
  });
});
