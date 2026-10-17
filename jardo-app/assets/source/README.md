# Sources des icônes

Dessins sur la grille des icônes adaptatives Android : calque de 108 unités, 72 visibles,
zone de sécurité de 66 (cercle de rayon 33 centré en 54,54). Le motif tient dans un cercle de rayon 30.

| Source | Asset produit |
|---|---|
| `icon.svg` | `images/icon.png` (1024, carré plein) |
| `icon-foreground.svg` | `images/android-icon-foreground.png`, `images/splash-icon.png` |
| `icon-background.svg` | `images/android-icon-background.png` |
| `icon-monochrome.svg` | `images/android-icon-monochrome.png` |
| `splash-icon-dark.svg` | `images/splash-icon-dark.png` |
| `favicon.svg` | `images/favicon.png` (48) |

Le motif est dupliqué dans `icon.svg`, `icon-foreground.svg`, `splash-icon-dark.svg` et `favicon.svg` :
toute retouche se reporte dans les quatre fichiers.

Régénération, depuis `jardo-app/assets/` (la taille de sortie vient des attributs `width`/`height` de chaque SVG) :

```bash
R="npx -y @resvg/resvg-js-cli@2.6.2-beta.1 --no-system-font"
$R source/icon.svg images/icon.png
$R source/icon-foreground.svg images/android-icon-foreground.png
$R source/icon-background.svg images/android-icon-background.png
$R source/icon-monochrome.svg images/android-icon-monochrome.png
$R source/icon-foreground.svg images/splash-icon.png
$R source/splash-icon-dark.svg images/splash-icon-dark.png
$R source/favicon.svg images/favicon.png
```
