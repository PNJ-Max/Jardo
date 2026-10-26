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
    surfaceSunken: '#0C2E32',
    tile: '#164441',
    soil: '#D9B98F',
    soilTint: '#3A2F24',
    glow: '#F4C76F',
    lawn: '#1D4A41',
    skyTop: '#03141A',
  },
};
