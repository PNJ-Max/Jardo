// Les pictogrammes, en données : des chemins SVG dans un carré de 32, peints dans la palette du
// décor de la carte (docs/direction-visuelle.md, « Pictogrammes »). Le rendu est dans picture.ts.

import type { JournalEntryKind } from '@/api/types';
import { createKit, WINDOW_LIT, type Palette } from '@/map/decor';
import { desaturate, mix } from '@/map/scene';
import type { ColorScheme } from '@/theme';

export const PICTOGRAM_SIZE = 32;

export type Mark =
  | { kind?: 'path'; d: string; fill?: string; stroke?: string; width?: number; opacity?: number }
  /** Halo de nuit, comme celui des fenêtres allumées de la carte. */
  | { kind: 'glow'; cx: number; cy: number; r: number; color: string };

const INK: Record<ColorScheme, string> = { light: '#2E4A31', dark: '#CFE3D1' };
const INK_WIDTH = 1.6;

const day = createKit(false).pal;
// La nuit de la carte est trop profonde pour un objet de 32 posé sur une tuile sombre : ses
// remplissages s'y éteignaient. Même teinte nocturne, moins appuyée.
const dusk = (c: string) => mix(desaturate(c, 0.2), '#0A2B31', 0.3);
const palettes: Record<ColorScheme, Palette> = {
  light: day,
  dark: Object.fromEntries(Object.entries(day).map(([k, v]) => [k, dusk(v)])) as Palette,
};

export const circle = (cx: number, cy: number, r: number) => ellipse(cx, cy, r, r);
export const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
  `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;
export const rect = (x0: number, y0: number, x1: number, y1: number, r = 0) =>
  r === 0
    ? `M${x0} ${y0}H${x1}V${y1}H${x0}Z`
    : `M${x0 + r} ${y0}H${x1 - r}Q${x1} ${y0} ${x1} ${y0 + r}V${y1 - r}Q${x1} ${y1} ${x1 - r} ${y1}` +
      `H${x0 + r}Q${x0} ${y1} ${x0} ${y1 - r}V${y0 + r}Q${x0} ${y0} ${x0 + r} ${y0}Z`;
const drop = (x: number, y: number) =>
  `M${x} ${y - 1.5}C${x + 1.1} ${y - 0.1} ${x + 1} ${y + 1.2} ${x} ${y + 1.2}C${x - 1} ${y + 1.2} ${x - 1.1} ${y - 0.1} ${x} ${y - 1.5}Z`;

type Brush = {
  pal: Palette;
  isNight: boolean;
  /** Une forme remplie, ses détails, puis son contour à l'encre par-dessus. */
  object: (d: string, fill: string, details?: Mark[], width?: number) => Mark[];
  flat: (d: string, fill: string, opacity?: number) => Mark;
  /** Un trait seul, à l'encre par défaut. */
  line: (d: string, width?: number, color?: string) => Mark;
  /** Le reflet d'une surface tournée vers la lumière de la carte, venue d'en haut à gauche. */
  lit: (color: string) => string;
  /** L'ombre au sol sous l'objet, comme sur la carte. */
  ground: (cx: number, rx: number) => Mark;
};

function brush(scheme: ColorScheme): Brush {
  const ink = INK[scheme];
  const pal = palettes[scheme];
  return {
    pal,
    isNight: scheme === 'dark',
    object: (d, fill, details = [], width = INK_WIDTH) => [{ d, fill }, ...details, { d, stroke: ink, width }],
    flat: (d, fill, opacity) => ({ d, fill, opacity }),
    line: (d, width = INK_WIDTH, color = ink) => ({ d, stroke: color, width }),
    lit: (color) => mix(color, '#FFFFFF', scheme === 'dark' ? 0.18 : 0.4),
    ground: (cx, rx) => ({ d: ellipse(cx, 28.2, rx, 1.7), fill: day.shadow, opacity: scheme === 'dark' ? 0.45 : 0.16 }),
  };
}

const kindDrawings: Record<JournalEntryKind, (b: Brush) => Mark[]> = {
  Watering: ({ pal, object, flat, line, lit, ground }) => [
    ground(15.5, 10),
    line('M10.6 13C10.6 7.2 18 7.2 18 13'),
    ...object('M19.4 20.6L26.2 12.2L27.8 13.5L20.1 24.2Z', pal.can),
    ...object('M25.1 11.4L28.4 9.5L29.7 12.6L26.8 14.1Z', pal.canDark),
    ...object('M8.4 13H19.6L20.4 25.6Q20.5 27 19.1 27H8.9Q7.5 27 7.6 25.6Z', pal.can, [
      flat('M8.2 17H19.8L19.9 19H8.1Z', pal.canDark),
      flat('M10 14.6H11.6L11.9 16.2H10Z', lit(pal.can)),
      flat('M10 19.8H11.9L12.2 25.2H10.2Z', lit(pal.can)),
    ]),
    ...object(drop(28.6, 17.4), pal.water, [], 1.1),
    ...object(drop(26.2, 20), pal.water, [], 1.1),
  ],

  Sowing: ({ pal, object, flat, line, ground }) => [
    ground(16, 10),
    ...object('M8.6 9H23.4L24.4 26.2Q24.5 27 23.7 27H8.3Q7.5 27 7.6 26.2Z', pal.logEnd, [
      flat(rect(10.8, 12.6, 21.2, 23.4, 1.6), pal.wall),
      ...object('M16 16.6C14.2 15.6 12.6 15.9 12.2 14.4C13.9 13.8 15.4 14.6 16 16.6Z', pal.leaf, [], 0.9),
      ...object('M16 16.6C16.6 14.4 18.2 13.6 19.8 14.2C19.4 15.8 17.8 16 16 16.6Z', pal.leafDark, [], 0.9),
      ...object('M16 22.4C13.4 22.4 12.9 20.6 13.4 19.2C13.9 17.6 15 16.8 16 16.8C17 16.8 18.1 17.6 18.6 19.2C19.1 20.6 18.6 22.4 16 22.4Z', pal.berry, [], 1),
    ]),
    ...object(rect(8.1, 5.4, 23.9, 9.2, 0.8), pal.mulch, [
      line('M11.2 6.3V8.3', 0.8),
      line('M14.4 6.3V8.3', 0.8),
      line('M17.6 6.3V8.3', 0.8),
      line('M20.8 6.3V8.3', 0.8),
    ]),
    ...object(ellipse(27, 25.6, 1.1, 0.8), pal.bark, [], 1),
    ...object(ellipse(28.6, 22.8, 1, 0.75), pal.bark, [], 1),
  ],

  Planting: ({ pal, object, flat, line, ground }) => [
    ground(16, 9.5),
    ...object('M7.4 20.6C7.4 18.4 24.6 18.4 24.6 20.6C24.6 25 21 28 16 28C11 28 7.4 25 7.4 20.6Z', pal.soilBed, [
      flat(ellipse(16, 20.7, 8.4, 2.2), pal.mulch),
      line('M12.4 23.6Q12 25.4 10.6 26.2', 0.9, pal.logEnd),
      line('M19.6 23.8Q20.4 25.4 21.8 25.8', 0.9, pal.logEnd),
      line('M16 24V26.6', 0.9, pal.logEnd),
    ]),
    line('M16 20.6V11.8'),
    ...object('M16 16.6C11.4 16.6 8.6 13.6 8.6 10.2C12.8 10.2 16 12.6 16 16.6Z', pal.leaf),
    ...object('M16 13C16 8.8 19 5.8 23.6 5.8C23.6 10.2 20.4 13 16 13Z', pal.crop),
  ],

  Pruning: ({ pal, object, line, ground }) => [
    ground(14.5, 10),
    ...object('M16.8 15.2C13.6 15.6 9.2 17 5 19.4L5.8 21.6C10 19.7 14.2 18.5 17.6 17.9Z', pal.apple),
    ...object('M17.6 14.4C20.2 13.2 23.6 12.8 26.2 13.6C23.4 15.6 20.6 17.2 18.6 17.6Z', pal.stone),
    ...object('M17 15.6C18.8 10.6 22.8 6.8 27.6 5C27.2 9.4 24.4 13.8 19.6 17.2Z', pal.metal),
    ...object('M17.2 16.4C14.2 18.6 10.4 22.4 6.6 26.8L8.6 28.2C12.2 24.6 15.8 21.4 18.8 18.2Z', pal.pepper),
    line('M10.4 19.4Q11.4 20.8 10 22.4', 1.2),
    ...object(circle(18, 16.8, 1.7), pal.tyre),
  ],

  Treatment: ({ pal, object, flat, line, lit, ground }) => [
    ground(15, 9.5),
    line('M21.6 22C26 22 26.6 16.4 25.3 12.8', 1.4),
    line('M24.8 13.2L28 6.8', 2.2),
    ...object(circle(29.6, 3.8, 0.9), pal.water, [], 0.9),
    ...object(circle(27.1, 3, 0.7), pal.water, [], 0.9),
    ...object(circle(30.4, 6.6, 0.7), pal.water, [], 0.9),
    line('M15 10V5.6'),
    ...object(rect(11.4, 4, 18.6, 6, 1), pal.tyre),
    ...object('M8 14C8 11.2 10.2 10 13 10H17C19.8 10 22 11.2 22 14V25.2C22 26.4 21.2 27 20 27H10C8.8 27 8 26.4 8 25.2Z', pal.flower, [
      flat(rect(10, 13.4, 11.6, 16.4), lit(pal.flower)),
      flat(rect(8, 17.4, 22, 21.2), pal.frame),
      flat('M12.6 20.4C12.6 18.6 14.4 17.9 17.4 18.1C17.2 20 15.4 20.8 12.6 20.4Z', pal.leafDark),
      flat(rect(10, 22.4, 11.6, 25), lit(pal.flower)),
    ]),
  ],

  Fertilizing: ({ pal, object, flat, line, lit, ground }) => [
    ground(16, 10.5),
    ...object('M9.2 10.5H22.8C24.6 16 24.8 21.6 23.8 27H8.2C7.2 21.6 7.4 16 9.2 10.5Z', pal.shed, [
      flat('M10.4 12.6H11.8C11.2 16 11.2 21 11.6 25H10C9.6 21 9.8 16 10.4 12.6Z', lit(pal.shed)),
      flat(rect(12.4, 15.2, 21.6, 22.6, 1.2), pal.frame),
      flat('M14 21.4C14 18 16.4 16.4 20.2 16.4C20.2 19.8 17.8 21.4 14 21.4Z', pal.leaf),
      line('M14.6 20.8L18.4 17.6', 0.9),
    ]),
    ...object('M8.8 10.8L10.2 6.6H21.8L23.2 10.8Z', pal.shedPlank),
    ...object('M20.6 27C21.2 24.6 23 23.4 25 23.4C27 23.4 28.6 24.8 29.2 27Z', pal.mulch, [
      flat(circle(23.4, 25.4, 0.65), pal.bark),
      flat(circle(25.6, 24.6, 0.65), pal.bark),
      flat(circle(27.2, 26, 0.65), pal.bark),
      flat(circle(24.8, 26.3, 0.6), pal.bark),
    ]),
  ],

  Harvest: ({ pal, object, flat, line, lit, ground }) => {
    const tomato = (x: number, y: number, r: number) =>
      object(circle(x, y, r), pal.tomato, [
        flat(circle(x - r * 0.4, y - r * 0.35, r * 0.28), lit(pal.tomato)),
        flat(`M${x - 1.7} ${y - r + 0.7}Q${x} ${y - r - 0.9} ${x + 1.7} ${y - r + 0.7}Q${x} ${y - r + 1.6} ${x - 1.7} ${y - r + 0.7}Z`, pal.leafDark),
      ]);
    return [
      ground(16, 10.5),
      line('M9.6 18C9.6 7.4 22.4 7.4 22.4 18', 3.6),
      line('M9.6 18C9.6 7.4 22.4 7.4 22.4 18', 1.8, pal.wood),
      ...tomato(16, 14.4, 3.3),
      ...tomato(11.6, 16.4, 3.4),
      ...tomato(20.4, 16.2, 3.5),
      ...object('M6 18.5H26L23.4 27H8.6Z', pal.wood, [
        line('M7.2 21.6H24.8', 0.9, pal.woodDark),
        line('M8 24.4H24', 0.9, pal.woodDark),
        line('M11.2 18.5L11.8 27', 0.9, pal.woodDark),
        line('M16 18.5V27', 0.9, pal.woodDark),
        line('M20.8 18.5L20.2 27', 0.9, pal.woodDark),
      ]),
      ...object(rect(5, 17, 27, 19.6, 1.2), pal.logSide),
    ];
  },

  Observation: ({ pal, object, flat, line, ground }) => [
    ground(16, 10),
    ...object('M4.6 25C4 14.5 11.5 6 25.5 5.5C26 17 18 25.5 4.6 25Z', pal.leaf, [
      line('M5.6 24L22.4 8.8', 1.1, pal.leafDark),
      line('M9.8 19.8L9.4 14.6', 0.9, pal.leafDark),
      line('M9.8 19.8L14.8 20', 0.9, pal.leafDark),
      line('M14.6 15.4L14.6 10.6', 0.9, pal.leafDark),
    ]),
    flat(circle(18.6, 17.4, 5.8), pal.glassHi, 0.8),
    line(circle(18.6, 17.4, 5.8), 2.2),
    line('M15.2 15.8Q15.9 13.7 18 13', 1.2, '#FFFFFF'),
    ...object('M23.3 20.7L28.8 26.1L26.9 28L21.4 22.6Z', pal.woodDark),
  ],

  WoodSupply: ({ pal, object, flat, line, lit, ground }) => {
    const log = (x: number, y: number) => object(circle(x, y, 2.7), pal.logEnd, [line(circle(x, y, 1.2), 0.9, pal.logRing)]);
    return [
      ground(16, 11.5),
      line('M20 18.4L29 15.4', 3.6),
      line('M20 18.4L29 15.4', 1.8, pal.woodDark),
      line('M19.4 20L20.4 26.8', 3.4),
      line('M19.4 20L20.4 26.8', 1.6, pal.woodDark),
      ...log(14.3, 9.2),
      ...log(11.6, 13.4),
      ...log(17, 13.4),
      ...object('M4.5 14.5H23.5L20.5 21.5H8.5Z', pal.barrow, [flat('M6 15.7H22L21.6 16.7H6.4Z', lit(pal.barrow))]),
      ...object(circle(9.6, 23.6, 3.4), pal.tyre, [flat(circle(9.6, 23.6, 1.1), pal.metal)]),
    ];
  },

  WoodConsumption: ({ pal, isNight, object, line, ground }) => [
    // Le feu éclaire : la flamme garde ses couleurs de jour, et luit la nuit comme les fenêtres.
    ...(isNight ? [{ kind: 'glow' as const, cx: 16, cy: 15, r: 13, color: WINDOW_LIT }] : []),
    ground(15.5, 10.5),
    ...object('M7 21.5H24.2V26.5H7Q5.6 26.5 5.6 24Q5.6 21.5 7 21.5Z', pal.bark, [
      line('M9 23.2H17', 0.9, pal.woodDark),
      line('M12 25H21', 0.9, pal.woodDark),
    ]),
    ...object(ellipse(24.2, 24, 1.9, 2.5), pal.logEnd, [line(ellipse(24.2, 24, 0.8, 1.1), 0.9, pal.logRing)]),
    ...object(
      'M16 21C11.2 21 9.8 17 12 13.2C12.6 15.2 13.8 16 14.6 16C13.8 12 15.8 8.4 19 5.6C18.8 9.4 22.6 11.6 22.6 16C22.6 19.2 20 21 16 21Z',
      day.tomato,
    ),
    ...object(
      'M16 20.6C14 20.6 13.3 18.8 14.2 17.2C15 15.8 15.8 15 16.4 13C17.6 15 19.4 16.4 19 18.6C18.7 19.9 17.6 20.6 16 20.6Z',
      WINDOW_LIT,
      [],
      1,
    ),
  ],

  Other: ({ pal, object, flat, ground }) => [
    ground(16, 10),
    ...object(rect(7.4, 5, 22.6, 27, 1.6), pal.roof, [
      flat(rect(7.4, 5, 10.6, 27, 1.6), pal.roofLine),
      flat(rect(12.6, 9, 19.4, 13, 0.8), pal.wall),
      flat(rect(19.6, 5, 21, 27), pal.tyre),
    ]),
    ...object('M24.6 8.6H28V23.4L26.3 27.6L24.6 23.4Z', pal.flower, [
      flat('M24.6 23.4H28L26.3 27.6Z', pal.logEnd),
      flat('M25.7 26.1H26.9L26.3 27.6Z', pal.tyre),
    ]),
    ...object(rect(24.6, 5.6, 28, 8.6, 0.6), pal.berry),
  ],
};

export function kindMarks(kind: JournalEntryKind, scheme: ColorScheme): Mark[] {
  return kindDrawings[kind](brush(scheme));
}

export type TabName = 'garden' | 'today' | 'journal';

const tabDrawings: Record<TabName, { filled: string[]; lines: string[] }> = {
  garden: {
    filled: ['M4.5 27V16.2L11.5 10L18.5 16.2V27Z', circle(24.5, 13.5, 4.5)],
    lines: ['M9.8 27V21.6H13.2V27', 'M24.5 18V27', 'M3 27H29'],
  },
  today: {
    filled: ['M8.5 22A7.5 7.5 0 0 1 23.5 22Z'],
    lines: ['M3.5 22H28.5', 'M8 26.5H24', 'M16 8.5V11.5', 'M8.6 14.6L6.5 12.5', 'M23.4 14.6L25.5 12.5'],
  },
  journal: {
    filled: ['M16 9.5C12.5 7.6 8 7.2 4 8.2V25.2C8 24.2 12.5 24.6 16 26.5C19.5 24.6 24 24.2 28 25.2V8.2C24 7.2 19.5 7.6 16 9.5Z'],
    lines: [
      'M16 9.5V26.5',
      'M7.5 13C9.5 12.7 11.5 12.9 13 13.5',
      'M7.5 17C9.5 16.7 11.5 16.9 13 17.5',
      'M19 20.5C19 16.6 21.2 14.4 25 14.2C25 18 22.8 20.5 19 20.5Z',
      'M19 20.5L22.4 17',
    ],
  },
};

/** Les pictogrammes de la barre d'onglets : un trait à la couleur de l'onglet, rempli quand il est actif. */
export function tabMarks(name: TabName, color: string, fill?: string): Mark[] {
  const { filled, lines } = tabDrawings[name];
  return [
    ...filled.map((d): Mark => ({ d, fill, stroke: color, width: 2 })),
    ...lines.map((d): Mark => ({ d, stroke: color, width: 2 })),
  ];
}
