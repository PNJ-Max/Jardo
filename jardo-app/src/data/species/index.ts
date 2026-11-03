import type { Species } from '@/domain/species';

import { fruitTrees } from './fruit-trees';
import { herbs } from './herbs';
import { smallFruits } from './small-fruits';
import { vegetables } from './vegetables';

/** Le catalogue d'espèces, livré avec l'app : une mise à jour change les fiches, jamais les données. */
export const speciesCatalog: readonly Species[] = [...vegetables, ...herbs, ...fruitTrees, ...smallFruits];

export const findSpecies = (id: string) => speciesCatalog.find((species) => species.id === id);
