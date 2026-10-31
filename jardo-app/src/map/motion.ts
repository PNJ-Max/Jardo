// Animations de la carte (docs/etude-carte-potager.md, étape 5) : balancement des feuillages,
// lucioles et rebond au toucher. Fonctions pures du temps, appelées à chaque image sur le thread
// UI. Le temps vaut null quand l'appareil réduit les animations : tout reste au repos.

import type { Point } from './scene';

/** Horloge des animations, en millisecondes ; null : animations réduites. */
export type MotionTime = number | null;

/** Balancement d'un feuillage : cisaillement horizontal autour de son pied. */
export type Sway = {
  pivot: Point;
  /** Cisaillement maximal. */
  amplitude: number;
  phase: number;
  /** Période de l'oscillation principale, en ms. */
  period: number;
};

const TAU = Math.PI * 2;
/** Les rafales passent sur la scène de gauche à droite. */
const GUST_PERIOD = 11000;
const GUST_WAVE = 0.004;

/** Valeur reproductible dans [0, 1[, propre à un point de la scène. */
function hash([x, y]: Point, salt = 0) {
  'worklet';
  const v = Math.sin(x * 12.9898 + y * 78.233 + salt * 37.719) * 43758.5453;
  return v - Math.floor(v);
}

/** Le balancement d'un feuillage dont le pied est en `pivot` : phase et période propres. */
export function swayOf(pivot: Point, amplitude: number): Sway {
  return { pivot, amplitude, phase: hash(pivot) * TAU, period: 3600 + hash(pivot, 1) * 2200 };
}

/** Cisaillement du feuillage à l'instant `time`, dans [-amplitude, amplitude]. */
export function swayAt({ pivot, amplitude, phase, period }: Sway, time: MotionTime) {
  'worklet';
  if (time === null) return 0;
  const gust = 0.7 + 0.3 * Math.sin((TAU * time) / GUST_PERIOD - pivot[0] * GUST_WAVE);
  const swing = 0.75 * Math.sin((TAU * time) / period + phase) + 0.25 * Math.sin((TAU * 2.3 * time) / period + 1.7 * phase);
  return amplitude * gust * swing;
}

/** Écart maximal d'une luciole à sa place, en pixels de scène. */
export const FIREFLY_DRIFT = 12;
/** Opacité d'une luciole au repos : son dessin tel quel. */
export const FIREFLY_REST = 1;

export type FireflyPose = { x: number; y: number; opacity: number };

/** Position et éclat d'une luciole qui flotte autour de sa place et s'allume par intermittence. */
export function fireflyAt(spot: Point, time: MotionTime): FireflyPose {
  'worklet';
  if (time === null) return { x: spot[0], y: spot[1], opacity: FIREFLY_REST };
  const phase = hash(spot) * TAU;
  const s = time / 1000;
  const x = spot[0] + FIREFLY_DRIFT * (0.7 * Math.sin(s * 0.9 + phase) + 0.3 * Math.sin(s * 2.1 + 2 * phase));
  const y = spot[1] + FIREFLY_DRIFT * (0.6 * Math.sin(s * 0.7 + 3 * phase) + 0.4 * Math.cos(s * 1.6 + phase));
  const glow = 0.5 + 0.5 * Math.sin(s * (1.6 + hash(spot, 2)) + phase);
  return { x, y, opacity: 0.15 + 0.85 * glow * glow };
}

/** Montée du rebond : la navigation part au sommet, sans retard perceptible. */
export const BOUNCE_LEAD = 90;
/** Durée totale du rebond, en ms. */
export const BOUNCE_DURATION = 380;
const BOUNCE_LIFT = 0.06;

/** Échelle de l'emplacement touché, `elapsed` ms après le toucher. */
export function bounceAt(elapsed: MotionTime) {
  'worklet';
  if (elapsed === null || elapsed <= 0 || elapsed >= BOUNCE_DURATION) return 1;
  if (elapsed < BOUNCE_LEAD) return 1 + BOUNCE_LIFT * Math.sin(((Math.PI / 2) * elapsed) / BOUNCE_LEAD);
  const v = (elapsed - BOUNCE_LEAD) / (BOUNCE_DURATION - BOUNCE_LEAD);
  return 1 + BOUNCE_LIFT * Math.cos(v * 1.5 * Math.PI) * (1 - v) * (1 - v);
}
