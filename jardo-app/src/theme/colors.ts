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
  /** Décor uniquement (illustrations, pastilles de fond) : jamais pour du texte. */
  leaf: string;
  leafPale: string;
  success: string;
  successTint: string;
  water: string;
  waterTint: string;
  danger: string;
  dangerTint: string;
};

export const palettes: Record<ColorScheme, Colors> = {
  light: {
    background: '#F6FAF6',
    card: '#FFFFFF',
    border: '#D7EAD8',
    text: '#173B1A',
    textMuted: '#4D6B50',
    primary: '#1B5E20',
    primaryText: '#FFFFFF',
    leaf: '#66BB6A',
    leafPale: '#A5D6A7',
    success: '#1B5E20',
    successTint: '#E8F5E9',
    water: '#2F6690',
    waterTint: '#E3EEF6',
    danger: '#A33A2A',
    dangerTint: '#F6E0DA',
  },
  // Les aplats y sont clairs : le texte posé dessus est le fond sarcelle, et non du blanc.
  dark: {
    background: '#092328',
    card: '#0F3A3C',
    border: '#12544F',
    text: '#E8F5E9',
    textMuted: '#8BBB92',
    primary: '#8BBB92',
    primaryText: '#092328',
    leaf: '#2A835F',
    leafPale: '#12544F',
    success: '#8BBB92',
    successTint: '#123F3E',
    water: '#7FB0CC',
    waterTint: '#133B4C',
    danger: '#E8826F',
    dangerTint: '#4A2620',
  },
};
