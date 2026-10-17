// Palette volontairement minimale : la vraie charte viendra plus tard.
// Toutes les couleurs de l'app passent par ici, pour pouvoir la changer en un endroit.

import type { WateringStatus } from '@/api/types';

export const colors = {
  primary: '#2E7D32',
  primaryText: '#FFFFFF',
  background: '#F6F7F4',
  card: '#FFFFFF',
  border: '#E2E5DE',
  text: '#1B1F1A',
  textMuted: '#667063',
  danger: '#C62828',
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24 };

export const radius = 12;

/** Le voyant : une couleur ET un libellé, pour ne jamais compter sur la couleur seule. */
export const wateringStyle: Record<WateringStatus, { color: string; label: string }> = {
  Ok: { color: '#2E7D32', label: 'OK' },
  DueSoon: { color: '#EF6C00', label: "Aujourd'hui" },
  Overdue: { color: '#C62828', label: 'En retard' },
};
