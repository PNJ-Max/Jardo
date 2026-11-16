// Rôles et contrastes de chaque jeton : docs/charte-graphique.md.

export type ColorScheme = 'light' | 'dark';

export type Colors = {
  background: string;
  card: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  /** Texte et icônes posés sur `primary`, `water`, `danger` ou `soil`. */
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
  /** Fond des champs remplis et du bouton fermer. */
  surfaceSunken: string;
  /** Tuile des pictogrammes et type choisi. */
  tile: string;
  /** « À faire aujourd'hui » hors arrosage : la seule teinte de terre assez contrastée pour du texte. */
  soil: string;
  /** Fond du voyant `soil`. */
  soilTint: string;
  /** Décor uniquement : lueur des fenêtres (« Fait », focus, lucioles). */
  glow: string;
  /** Décor uniquement : sol des vignettes, onglet actif. */
  lawn: string;
  /** Haut du ciel d'Aujourd'hui, fondu vers `background`. */
  skyTop: string;
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
    surfaceSunken: '#EAF2E8',
    tile: '#E4F0DE',
    soil: '#694B34',
    soilTint: '#F2EADF',
    glow: '#F6C76E',
    lawn: '#B3D6A9',
    skyTop: '#D3EAEE',
  },
  // Lanterne : un fond presque noir, éclairé par la lueur des fenêtres de la carte. Les aplats y sont
  // clairs : le texte posé dessus est le fond, et non du blanc.
  dark: {
    background: '#0B0E13',
    card: '#171B22',
    border: '#2C323C',
    text: '#F4EFE4',
    textMuted: '#B0AB9D',
    primary: '#F4C76F',
    primaryText: '#0B0E13',
    leaf: '#B08A3E',
    leafPale: '#2C323C',
    success: '#8FD3A5',
    successTint: '#16302A',
    water: '#8CC4E8',
    waterTint: '#15303F',
    danger: '#FF8F7F',
    dangerTint: '#40201C',
    surfaceSunken: '#11141A',
    tile: '#232832',
    soil: '#DCC3A2',
    soilTint: '#332B22',
    glow: '#F4C76F',
    lawn: '#3A3220',
    skyTop: '#05070B',
  },
};
