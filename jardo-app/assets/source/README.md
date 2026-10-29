# Sources des icônes

La pousse en pot, dessinée par `icons.ts` avec le pinceau de la carte (`src/map/scene.ts` et la
palette de `src/map/decor.ts`) : même projection, même lumière, mêmes arêtes que les vignettes.
Les SVG de ce dossier sont produits par ce script : on retouche `icons.ts`, jamais les SVG.

Grille des icônes adaptatives Android : calque de 108 unités, 72 visibles, zone de sécurité de 66
(cercle de rayon 33 centré en 54,54). Le motif tient dans un cercle de rayon 30.

| Source | Asset produit |
|---|---|
| `icon.svg` | `images/icon.png` (1024, carré plein, fond `primary` `#1B5E20`) |
| `icon-foreground.svg` | `images/android-icon-foreground.png` (avec l'ombre au sol) |
| `icon-background.svg` | `images/android-icon-background.png` |
| `icon-monochrome.svg` | `images/android-icon-monochrome.png` (silhouette, jour sous le bord du pot) |
| `splash-icon.svg` | `images/splash-icon.png` (sur `#F6FAF6`) |
| `splash-icon-dark.svg` | `images/splash-icon-dark.png` (sur `#092328`, teintes du jour passées vers ce fond) |
| `favicon.svg` | `images/favicon.png` (48) |

Régénération, depuis `jardo-app/assets/` (la taille de sortie vient des attributs `width`/`height` de chaque SVG) :

```bash
npx -y tsx source/icons.ts
R="npx -y @resvg/resvg-js-cli@2.6.2-beta.1 --no-system-font"
$R source/icon.svg images/icon.png
$R source/icon-foreground.svg images/android-icon-foreground.png
$R source/icon-background.svg images/android-icon-background.png
$R source/icon-monochrome.svg images/android-icon-monochrome.png
$R source/splash-icon.svg images/splash-icon.png
$R source/splash-icon-dark.svg images/splash-icon-dark.png
$R source/favicon.svg images/favicon.png
```

`apercu.png` montre l'icône sous les masques des lanceurs, en monochrome, à 48 dp, et les deux
splashs.
