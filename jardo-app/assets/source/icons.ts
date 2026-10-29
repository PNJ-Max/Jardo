/// <reference types="node" />
// Dessine les sources SVG de l'icône et du splash avec le pinceau de la carte : même projection,
// même lumière, mêmes arêtes. Depuis jardo-app/assets : npx -y tsx source/icons.ts

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { createKit, type Palette } from '../../src/map/decor';
import { depth, desaturate, mix, project, solid, type Shape } from '../../src/map/scene';

/** Fond de l'icône adaptative, de l'icône carrée et du favicon : le `primary` clair. */
const ICON_BACKGROUND = '#1B5E20';
/** Le fond sombre de l'app, celui du splash sombre (app.json). */
const SPLASH_DARK_BACKGROUND = '#092328';

type Point = [number, number];
type Vec3 = [number, number, number];

// La tige et les feuilles se dessinent dans le plan vertical face à l'écran, à ses proportions :
// u vers la droite, v vers le haut, en mètres d'écran.
const right: Point = [project(1, 0, 0)[0], project(0, 1, 0)[0]].map((c, _, [a, b]) => c / Math.hypot(a, b)) as Point;
const lift = -project(0, 0, 1)[1] / project(right[0], right[1], 0)[0];
const inPlane = (u: number, v: number, z0: number): Vec3 => [u * right[0], u * right[1], z0 + v / lift];

/** Feuille arrondie à la base et pointue au bout, plus bombée côté ciel. */
function leaf(from: Point, to: Point, bulge: number, z0: number): Vec3[] {
  const [dx, dy] = [to[0] - from[0], to[1] - from[1]];
  const l = Math.hypot(dx, dy);
  const [nx, ny] = [-dy / l, dx / l];
  const side = (k: number) =>
    Array.from({ length: 17 }, (_, i) => {
      const t = i / 16;
      const w = k * bulge * Math.sin(Math.PI * t ** 0.7);
      return inPlane(from[0] + dx * t + nx * w, from[1] + dy * t + ny * w, z0);
    });
  return [...side(-1), ...side(0.75).reverse().slice(1, -1)];
}

type Motif = { shapes: Shape[]; points: Point[] };

/**
 * La pousse en pot : un pot en terre cuite évasé, son bord et sa terre, une tige et deux
 * feuilles. `silhouette` : tout en noir, avec un jour entre le bord et le corps du pot ; l'ombre
 * au sol ne se pose que sur le fond vert de l'icône.
 */
function pottedSprout(pal: Palette, { silhouette = false, shadow = false } = {}): Motif {
  const { p } = createKit(false);
  const ink = '#000000';
  const fill = (c: string) => (silhouette ? ink : c);
  const body = (half: number, z: number): Vec3[] => [[-half, -half, z], [half, -half, z], [half, half, z], [-half, half, z]];
  // Le bord déborde vers l'avant : la silhouette ne garde que les flancs vus du pot, assez bas pour
  // laisser un jour sous le bord.
  const [bottom, top, rimTop] = [1.05, silhouette ? 0.72 : 1.0, 1.26];

  if (shadow) p.layer(p.shadows, () => p.ellipseGround(0.3, -0.25, 0, 0.95, 0.75, pal.shadow, { opacity: 0.18 }));
  p.object(depth(0, 0), () => {
    const b = body(0.36, 0);
    const t = body(0.48, top);
    const sides = [0, 1, 2, 3].map((i) => ({ points: [b[i], b[(i + 1) % 4], t[(i + 1) % 4], t[i]], color: fill(pal.pot) }));
    // Faces du tronc de pyramide, avec le fond et le dessus pour orienter les normales.
    const faces = [...sides, { points: b, color: fill(pal.pot) }, { points: t, color: fill(pal.pot) }];
    if (silhouette) {
      for (const f of solid(sides, [0, 0, top / 2])) if (f.visible) p.polygon(f.points, ink);
    } else {
      p.faces(solid(faces, [0, 0, top / 2]));
    }

    if (silhouette) {
      p.box(-0.58, -0.58, bottom, 0.58, 0.58, rimTop, ink, { flat: true, noEdge: true });
    } else {
      p.box(-0.58, -0.58, bottom, 0.58, 0.58, rimTop, { top: pal.potRim, side: pal.potRim });
      p.rect(-0.47, -0.47, 0.47, 0.47, rimTop + 0.001, pal.soilBed);
    }

    p.line(inPlane(0, -0.1, rimTop), inPlane(0.03, 0.95, rimTop), fill(pal.leafDark), 3.4);
    const small = leaf([-0.02, 0.5], [-0.9, 0.95], 0.26, rimTop);
    const big = leaf([0.03, 0.88], [1.0, 1.45], 0.32, rimTop);
    p.polygon(small, fill(pal.leafLight), silhouette ? {} : { stroke: p.edgeOf(pal.leafLight), strokeWidth: 0.7 });
    p.polygon(big, fill(pal.leaf), silhouette ? {} : { stroke: p.edgeOf(pal.leaf), strokeWidth: 0.7 });
    if (!silhouette) p.line(inPlane(0.12, 0.93, rimTop), inPlane(0.8, 1.33, rimTop), p.edgeOf(pal.leaf), 0.9, 0.7);
  });

  const { shapes } = p.shapes();
  const points: Point[] = shapes
    .filter((s) => s.kind === 'polygon' && s.opacity === undefined)
    .flatMap((s) => (s.kind === 'polygon' ? Array.from({ length: s.points.length / 2 }, (_, i) => [s.points[2 * i], s.points[2 * i + 1]] as Point) : []));
  return { shapes, points };
}

const r = (n: number) => Math.round(n * 1000) / 1000;

function toSvg(shapes: Shape[]) {
  return shapes
    .map((s) => {
      const op = s.opacity !== undefined ? ` opacity="${s.opacity}"` : '';
      if (s.kind === 'polygon') {
        const pts = Array.from({ length: s.points.length / 2 }, (_, i) => `${r(s.points[2 * i])},${r(s.points[2 * i + 1])}`).join(' ');
        const stroke = s.stroke ? ` stroke="${s.stroke}" stroke-width="${s.strokeWidth}" stroke-linejoin="round"` : '';
        return `<polygon points="${pts}" fill="${s.fill ?? 'none'}"${stroke}${op}/>`;
      }
      if (s.kind === 'line') {
        return `<line x1="${r(s.x1)}" y1="${r(s.y1)}" x2="${r(s.x2)}" y2="${r(s.y2)}" stroke="${s.stroke}" stroke-width="${s.strokeWidth}" stroke-linecap="round"${op}/>`;
      }
      if (s.kind === 'circle') return `<circle cx="${r(s.cx)}" cy="${r(s.cy)}" r="${r(s.r)}" fill="${s.fill}"${op}/>`;
      return '';
    })
    .join('\n    ');
}

/** Le motif dans le calque de 108 : centré, contenu dans un cercle de rayon 30. */
function placed({ shapes, points }: Motif) {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const [cx, cy] = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
  const reach = Math.max(...points.map(([x, y]) => Math.hypot(x - cx, y - cy)));
  const k = 30 / reach;
  return `<g transform="translate(54 54) scale(${r(k)}) translate(${r(-cx)} ${r(-cy)})">\n    ${toSvg(shapes)}\n  </g>`;
}

const day = createKit(false).pal;
// La nuit de la carte éteindrait le pot sur le fond sarcelle : le splash sombre garde les teintes
// du jour, à peine passées vers ce fond.
const dusk = Object.fromEntries(
  Object.entries(day).map(([key, color]) => [key, mix(desaturate(color, 0.15), SPLASH_DARK_BACKGROUND, 0.15)]),
) as Palette;

const svg = (viewBox: string, size: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${size}" height="${size}">\n  ${body}\n</svg>\n`;

const icon = placed(pottedSprout(day, { shadow: true }));
const files: Record<string, string> = {
  'icon.svg': svg('18 18 72 72', 1024, `<rect x="18" y="18" width="72" height="72" fill="${ICON_BACKGROUND}"/>\n  ${icon}`),
  'icon-foreground.svg': svg('0 0 108 108', 1024, icon),
  'icon-background.svg': svg('0 0 108 108', 1024, `<rect width="108" height="108" fill="${ICON_BACKGROUND}"/>`),
  'icon-monochrome.svg': svg('0 0 108 108', 1024, placed(pottedSprout(day, { silhouette: true }))),
  'splash-icon.svg': svg('0 0 108 108', 1024, placed(pottedSprout(day))),
  'splash-icon-dark.svg': svg('0 0 108 108', 1024, placed(pottedSprout(dusk))),
  'favicon.svg': svg('24 24 60 60', 48, `<rect x="24" y="24" width="60" height="60" rx="13" fill="${ICON_BACKGROUND}"/>\n  ${icon}`),
};

for (const [name, content] of Object.entries(files)) writeFileSync(join(__dirname, name), content);
