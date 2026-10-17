// Jetons de la charte graphique : rôles et contrastes dans docs/charte-graphique.md.
// Aucune couleur n'est codée en dur ailleurs dans l'app.

import type { WateringStatus } from '@/api/types';

export const colors = {
  background: '#FCF9EA',
  card: '#FFFFFF',
  border: '#E7E2CC',
  text: '#2F3A28',
  textMuted: '#6B7360',
  primary: '#9E5B28',
  primaryText: '#FFFFFF',
  // Couleurs de la palette d'origine : trop claires pour du texte, réservées au décor.
  terracotta: '#DB9558',
  sage: '#97A87A',
  sagePale: '#A8BBA3',
  success: '#4E6040',
  successTint: '#E6EDDD',
  water: '#3F6B85',
  waterTint: '#E1ECF2',
  danger: '#A33A2A',
  dangerTint: '#F6E0DA',
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24 };

export const radius = 12;

/**
 * Le voyant : une couleur ET un libellé, pour ne jamais compter sur la couleur seule.
 * `color` reste lisible en texte sur `background` comme sur le fond de l'écran.
 */
export const wateringStyle: Record<WateringStatus, { color: string; background: string; label: string }> = {
  Ok: { color: colors.success, background: colors.successTint, label: 'OK' },
  DueSoon: { color: colors.water, background: colors.waterTint, label: "Aujourd'hui" },
  Overdue: { color: colors.danger, background: colors.dangerTint, label: 'En retard' },
};
