import {
  createPicture,
  PaintStyle,
  Skia,
  StrokeCap,
  StrokeJoin,
  TileMode,
  type SkCanvas,
  type SkPicture,
} from '@shopify/react-native-skia';

import { PICTOGRAM_SIZE, type Mark } from './drawings';

// Chaque dessin est enregistré une fois en SkPicture, puis rendu une fois par taille en pixels dans
// une image PNG : une ligne de liste n'affiche qu'une <Image>, sans canvas ni surface GPU à elle.
const pictures = new Map<string, SkPicture>();
const images = new Map<string, string>();

/** L'image du pictogramme `key`, dessiné par `marks` au premier appel, en `pixels` de côté. */
export function pictogramUri(key: string, marks: () => Mark[], pixels: number): string {
  const imageKey = `${key}@${pixels}`;
  const cached = images.get(imageKey);
  if (cached) return cached;

  let picture = pictures.get(key);
  if (!picture) {
    const drawing = marks();
    picture = createPicture((canvas) => draw(canvas, drawing), Skia.XYWHRect(0, 0, PICTOGRAM_SIZE, PICTOGRAM_SIZE));
    pictures.set(key, picture);
  }

  const surface = Skia.Surface.Make(pixels, pixels);
  if (!surface) throw new Error(`Surface de ${pixels} px impossible pour le pictogramme ${key}`);
  const canvas = surface.getCanvas();
  canvas.scale(pixels / PICTOGRAM_SIZE, pixels / PICTOGRAM_SIZE);
  canvas.drawPicture(picture);
  surface.flush();
  const uri = `data:image/png;base64,${surface.makeImageSnapshot().encodeToBase64()}`;
  images.set(imageKey, uri);
  return uri;
}

function draw(canvas: SkCanvas, marks: Mark[]) {
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setStrokeJoin(StrokeJoin.Round);
  paint.setStrokeCap(StrokeCap.Round);

  for (const mark of marks) {
    if (mark.kind === 'glow') {
      const color = (alpha: number) => {
        const c = Skia.Color(mark.color);
        c[3] = alpha;
        return c;
      };
      const glow = Skia.Paint();
      glow.setAntiAlias(true);
      glow.setShader(
        Skia.Shader.MakeRadialGradient({ x: mark.cx, y: mark.cy }, mark.r, [color(0.45), color(0.15), color(0)], [0, 0.5, 1], TileMode.Clamp),
      );
      canvas.drawCircle(mark.cx, mark.cy, mark.r, glow);
      continue;
    }

    const path = Skia.Path.MakeFromSVGString(mark.d);
    if (!path) throw new Error(`Chemin de pictogramme invalide : ${mark.d}`);
    if (mark.fill) {
      paint.setStyle(PaintStyle.Fill);
      paint.setColor(Skia.Color(mark.fill));
      paint.setAlphaf(mark.opacity ?? 1);
      canvas.drawPath(path, paint);
    }
    if (mark.stroke) {
      paint.setStyle(PaintStyle.Stroke);
      paint.setStrokeWidth(mark.width ?? 1);
      paint.setColor(Skia.Color(mark.stroke));
      paint.setAlphaf(mark.opacity ?? 1);
      canvas.drawPath(path, paint);
    }
  }
}
