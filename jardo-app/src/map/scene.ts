// Gabarit commun des dessins de la carte : projection de l'étude (docs/etude-carte-potager.md),
// éclairage et primitives. Les coordonnées du monde sont en mètres : x en travers du jardin,
// y de la maison vers le fond, z vers le haut.

import { swayOf, type Sway } from './motion';

export type Point = [number, number];
type Vec3 = [number, number, number];

export type Shape =
  | { kind: 'polygon'; points: number[]; fill?: string; stroke?: string; strokeWidth?: number; opacity?: number }
  | { kind: 'circle'; cx: number; cy: number; r: number; fill: string; stroke?: string; strokeWidth?: number; opacity?: number }
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; stroke: string; strokeWidth: number; opacity?: number }
  /** Halo lumineux de nuit : dégradé radial du centre vers la transparence. */
  | { kind: 'glow'; cx: number; cy: number; rx: number; ry: number; color: string; opacity: number };

export type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

/**
 * Tranche de la scène, dans l'ordre d'affichage : un décor fixe, ou un objet animé qui se
 * balance (`sway`) ou rebondit avec les emplacements qu'il dessine (`tags`).
 */
export type ScenePart = { shapes: Shape[]; sway?: Sway; tags?: string[] };

/** Feuillage qui se balance : pied en (x, y), hauteur et écart du sommet, en mètres. */
export type SwaySpec = { x: number; y: number; height: number; reach: number };

/** Pixels de scène par mètre. */
export const UNIT = 30;
const THETA = (20 * Math.PI) / 180;
const PHI = (50 * Math.PI) / 180;
const C = Math.cos(THETA);
const S = Math.sin(THETA);
const SP = Math.sin(PHI);
const CP = Math.cos(PHI);
const TO_CAMERA: Vec3 = [-S * CP, C * CP, SP];

export function project(x: number, y: number, z: number): Point {
  return [(x * C + y * S) * UNIT, ((-x * S + y * C) * SP - z * CP) * UNIT];
}

/** Point au sol (z = 0) sous un point de l'écran. */
export function unproject([sx, sy]: Point): Point {
  const a = sx / UNIT;
  const b = sy / (UNIT * SP);
  return [a * C - b * S, a * S + b * C];
}

/** Profondeur d'un point au sol : plus elle est grande, plus il est proche de l'observateur. */
export function depth(x: number, y: number) {
  return -x * S + y * C;
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const normalize = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const LIGHT = normalize([-0.25, 0.55, 0.8]);
const TOP_LIGHT = 0.62 + 0.38 * LIGHT[2];

export function isVisible(normal: Vec3) {
  return dot(normal, TO_CAMERA) > 1e-4;
}

/** Ombre portée au sol d'un point à la hauteur 1. */
export const SHADOW_DIRECTION: Point = [-LIGHT[0] / LIGHT[2], -LIGHT[1] / LIGHT[2]];

// ---------- Couleurs ----------

const toRgb = (hex: string): Vec3 => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (c: Vec3) =>
  '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

export function mix(a: string, b: string, t: number) {
  const A = toRgb(a);
  const B = toRgb(b);
  return toHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

export function desaturate(color: string, amount: number) {
  const [r, g, b] = toRgb(color);
  const l = 0.3 * r + 0.59 * g + 0.11 * b;
  return toHex([r + (l - r) * amount, g + (l - g) * amount, b + (l - b) * amount]);
}

// ---------- Volumes ----------

export type Face = { points: Vec3[]; color: string; tag?: string };
type SolidFace = Face & { normal: Vec3; visible: boolean };

function newellNormal(points: Vec3[]): Vec3 {
  let nx = 0;
  let ny = 0;
  let nz = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    nx += (a[1] - b[1]) * (a[2] + b[2]);
    ny += (a[2] - b[2]) * (a[0] + b[0]);
    nz += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return normalize([nx, ny, nz]);
}

/** Faces d'un volume convexe : normale orientée vers l'extérieur, visibilité selon la caméra. */
export function solid(faces: Face[], center: Vec3): SolidFace[] {
  return faces.map((face) => {
    let normal = newellNormal(face.points);
    const m = face.points.reduce<Vec3>(
      (acc, p) => [acc[0] + p[0] / face.points.length, acc[1] + p[1] / face.points.length, acc[2] + p[2] / face.points.length],
      [0, 0, 0],
    );
    if (dot(normal, [m[0] - center[0], m[1] - center[1], m[2] - center[2]]) < 0) {
      normal = [-normal[0], -normal[1], -normal[2]];
    }
    return { ...face, normal, visible: isVisible(normal) };
  });
}

export function boxFaces(
  x0: number, y0: number, z0: number, x1: number, y1: number, z1: number,
  colors: string | { top: string; side: string },
): Face[] {
  const c = typeof colors === 'string' ? { top: colors, side: colors } : colors;
  return [
    { points: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], color: c.top },
    { points: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], color: c.side },
    { points: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], color: c.side },
    { points: [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]], color: c.side },
    { points: [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], color: c.side },
  ];
}

function convexHull(points: Point[]): Point[] {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Point, a: Point, b: Point) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Point[] = [];
  const upper: Point[] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

/** Silhouette à l'écran d'un volume posé au sol : enveloppe de son emprise et de son sommet. */
export function silhouette(footprint: Point[], height: number): Point[] {
  return convexHull(footprint.flatMap(([x, y]) => [project(x, y, 0), project(x, y, height)]));
}

/** Point dans un polygone (règle pair-impair). */
export function contains(polygon: Point[], [x, y]: Point) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// ---------- Dessin ----------

/**
 * Accumule les formes d'une scène. Les objets en volume sont triés par profondeur pour que
 * les plus proches recouvrent les plus lointains ; le sol, les ombres et les lumières sont
 * des couches à part.
 */
export class Painter {
  private objects: { depth: number; order: number; shapes: Shape[]; sway?: Sway; tags: string[] }[] = [];
  private current: Shape[] = [];
  private tags: string[] = [];
  private bounds: Bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  readonly ground: Shape[] = [];
  readonly shadows: Shape[] = [];
  readonly lights: Shape[] = [];

  constructor(
    /** Teinte vers laquelle s'assombrissent les faces à l'ombre. */
    private readonly shade: string,
    private readonly edge: string,
  ) {}

  /** Les formes dessinées dans `draw` forment un objet, placé à la profondeur donnée. */
  object(depthValue: number, draw: () => void, order = 0, sway?: SwaySpec) {
    const previous = this.current;
    this.current = [];
    draw();
    this.objects.push({
      depth: depthValue,
      order,
      shapes: this.current,
      // Le sommet, à la hauteur `height`, s'écarte au plus de `reach` à l'écran.
      sway: sway && swayOf(project(sway.x, sway.y, 0), sway.reach / (sway.height * CP)),
      tags: this.tags,
    });
    this.current = previous;
  }

  /** Les objets dessinés dans `draw` portent l'étiquette `tag`, en plus de celles qui l'entourent. */
  within(tag: string, draw: () => void) {
    const previous = this.tags;
    this.tags = [...previous, tag];
    draw();
    this.tags = previous;
  }

  /** Les formes dessinées dans `draw` vont dans une couche donnée. */
  layer(target: Shape[], draw: () => void) {
    const previous = this.current;
    this.current = target;
    draw();
    this.current = previous;
  }

  private sorted() {
    return this.objects.slice().sort((a, b) => a.depth - b.depth || a.order - b.order);
  }

  shapes(): { shapes: Shape[]; bounds: Bounds } {
    return {
      shapes: [...this.ground, ...this.shadows, ...this.sorted().flatMap((o) => o.shapes), ...this.lights],
      bounds: this.bounds,
    };
  }

  /** La scène en tranches : le décor fixe entre deux objets animés tient dans une seule tranche. */
  parts(): { parts: ScenePart[]; bounds: Bounds } {
    const parts: ScenePart[] = [];
    let still: Shape[] = [...this.ground, ...this.shadows];
    for (const { shapes, sway, tags } of this.sorted()) {
      if (!sway && tags.length === 0) {
        still.push(...shapes);
        continue;
      }
      if (still.length > 0) parts.push({ shapes: still });
      still = [];
      parts.push({ shapes, ...(sway && { sway }), ...(tags.length > 0 && { tags }) });
    }
    still.push(...this.lights);
    if (still.length > 0) parts.push({ shapes: still });
    return { parts, bounds: this.bounds };
  }

  private grow([x, y]: Point, r = 0) {
    const b = this.bounds;
    b.minX = Math.min(b.minX, x - r);
    b.minY = Math.min(b.minY, y - r);
    b.maxX = Math.max(b.maxX, x + r);
    b.maxY = Math.max(b.maxY, y + r);
  }

  private flat(points: Vec3[]) {
    return points.flatMap(([x, y, z]) => {
      const p = project(x, y, z);
      this.grow(p);
      return p;
    });
  }

  shadeFace(color: string, normal: Vec3) {
    const k = Math.min(1, (0.62 + 0.38 * Math.max(0, dot(normal, LIGHT))) / TOP_LIGHT);
    return mix(color, this.shade, 1 - k);
  }

  edgeOf(fill: string) {
    return mix(fill, this.edge, 0.32);
  }

  faces(faces: SolidFace[], options: { flat?: boolean; noEdge?: boolean; opacity?: number } = {}) {
    for (const f of faces) {
      if (!f.visible) continue;
      const fill = options.flat ? f.color : this.shadeFace(f.color, f.normal);
      this.current.push({
        kind: 'polygon',
        points: this.flat(f.points),
        fill,
        stroke: options.noEdge ? undefined : this.edgeOf(fill),
        strokeWidth: 0.7,
        opacity: options.opacity,
      });
    }
  }

  box(
    x0: number, y0: number, z0: number, x1: number, y1: number, z1: number,
    colors: string | { top: string; side: string },
    options?: { flat?: boolean; noEdge?: boolean },
  ) {
    this.faces(solid(boxFaces(x0, y0, z0, x1, y1, z1, colors), [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]), options);
  }

  polygon(points: Vec3[], fill: string | undefined, extra: { stroke?: string; strokeWidth?: number; opacity?: number } = {}) {
    this.current.push({ kind: 'polygon', points: this.flat(points), fill, ...extra });
  }

  rect(x0: number, y0: number, x1: number, y1: number, z: number, fill: string, extra?: { stroke?: string; strokeWidth?: number; opacity?: number }) {
    this.polygon([[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], fill, extra);
  }

  line(a: Vec3, b: Vec3, stroke: string, strokeWidth = 0.7, opacity?: number) {
    const [x1, y1, x2, y2] = this.flat([a, b]);
    this.current.push({ kind: 'line', x1, y1, x2, y2, stroke, strokeWidth, opacity });
  }

  sphere(x: number, y: number, z: number, r: number, fill: string, extra: { opacity?: number; edge?: boolean } = {}) {
    const [cx, cy] = project(x, y, z);
    this.grow([cx, cy], r * UNIT);
    this.current.push({
      kind: 'circle', cx, cy, r: r * UNIT, fill, opacity: extra.opacity,
      ...(extra.edge ? { stroke: this.edgeOf(fill), strokeWidth: 0.6 } : {}),
    });
  }

  leafBall(x: number, y: number, z: number, r: number, fill: string) {
    this.sphere(x, y, z, r, fill, { edge: true });
  }

  /** Ellipse sur un plan : image affine d'un cercle, approchée par un polygone. */
  ellipseOn(o: Vec3, u: Vec3, v: Vec3, fill: string, extra?: { stroke?: string; strokeWidth?: number; opacity?: number }, segments = 20) {
    const points: Vec3[] = [];
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      points.push([
        o[0] + (u[0] - o[0]) * cos + (v[0] - o[0]) * sin,
        o[1] + (u[1] - o[1]) * cos + (v[1] - o[1]) * sin,
        o[2] + (u[2] - o[2]) * cos + (v[2] - o[2]) * sin,
      ]);
    }
    this.polygon(points, fill, extra);
  }

  ellipseGround(x: number, y: number, z: number, rx: number, ry: number, fill: string, extra?: { opacity?: number; stroke?: string; strokeWidth?: number }) {
    this.ellipseOn([x, y, z], [x + rx, y, z], [x, y + ry, z], fill, extra);
  }

  /** Disque vertical face à l'observateur (bout de bûche, roue). */
  ellipseFront(x: number, y: number, z: number, r: number, fill: string, extra?: { stroke?: string; strokeWidth?: number; opacity?: number }) {
    this.ellipseOn([x, y, z], [x + r, y, z], [x, y, z + r], fill, extra, 14);
  }

  /** Ombre portée au sol d'un volume de cette emprise et de cette hauteur. */
  shadowHull(footprint: Point[], height: number, color: string, opacity: number) {
    const points = footprint.concat(
      footprint.map(([x, y]): Point => [x + SHADOW_DIRECTION[0] * height, y + SHADOW_DIRECTION[1] * height]),
    );
    const hull = convexHull(points.map(([x, y]) => project(x, y, 0)));
    this.current.push({ kind: 'polygon', points: hull.flat(), fill: color, opacity });
  }

  glow(x: number, y: number, z: number, r: number, color: string, opacity = 1, flatten = 1) {
    const [cx, cy] = project(x, y, z);
    this.current.push({ kind: 'glow', cx, cy, rx: r * UNIT, ry: r * UNIT * flatten, color, opacity });
  }
}
