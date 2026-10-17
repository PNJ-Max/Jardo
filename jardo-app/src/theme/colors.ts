// Rôles et contrastes de chaque jeton : docs/charte-graphique.md.

export type ColorScheme = 'light' | 'dark';

export type Colors = {
  background: string;
  card: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  /** Texte et icônes posés sur `primary`, `water` ou `danger`. */
  primaryText: string;
  terracotta: string;
  sage: string;
  sagePale: string;
  success: string;
  successTint: string;
  water: string;
  waterTint: string;
  danger: string;
  dangerTint: string;
};

// Couleurs de la palette d'origine : trop claires pour du texte, réservées au décor.
const decor = {
  terracotta: '#DB9558',
  sage: '#97A87A',
  sagePale: '#A8BBA3',
};

export const palettes: Record<ColorScheme, Colors> = {
  light: {
    background: '#FCF9EA',
    card: '#FFFFFF',
    border: '#E7E2CC',
    text: '#2F3A28',
    textMuted: '#6B7360',
    primary: '#9E5B28',
    primaryText: '#FFFFFF',
    ...decor,
    success: '#4E6040',
    successTint: '#E6EDDD',
    water: '#3F6B85',
    waterTint: '#E1ECF2',
    danger: '#A33A2A',
    dangerTint: '#F6E0DA',
  },
  dark: {
    background: '#1C211A',
    card: '#262C23',
    border: '#3A4234',
    text: '#EEEADB',
    textMuted: '#A9AE9C',
    primary: '#DB9558',
    primaryText: '#2A1A0E',
    ...decor,
    success: '#A8BBA3',
    successTint: '#2F3A2A',
    water: '#7FB0CC',
    waterTint: '#22323B',
    danger: '#E8826F',
    dangerTint: '#3D2622',
  },
};
