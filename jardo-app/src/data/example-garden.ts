import { randomUUID } from 'expo-crypto';

import { addDays, yearOf, type DateOnly } from '@/domain/dates';
import type {
  JournalEntryKind,
  MeasureUnit,
  QuantityUnit,
  SpaceKind,
  TaskRecurrence,
} from '@/domain/types';

import type { Db, SqlValue } from './db';

type Space = { id: string };
type Zone = { id: string };
type Item = { id: string; zoneId: string | null };

/**
 * Remplit la base avec le jardin d'exemple de DbSeeder, en développement seulement : un potager en
 * carrés, un verger, des petits fruits par rang, une serre et un espace bois de chauffage avec
 * trois tas ; quelques semaines de journal et des tâches. Les dates sont relatives à `today` pour
 * qu'il y ait toujours des tâches à jour, à faire aujourd'hui et en retard. Sans effet si le
 * jardin a déjà des espaces.
 */
export async function seedExampleGarden(db: Db, today: DateOnly, now: string): Promise<void> {
  if (await db.first('SELECT 1 FROM spaces LIMIT 1')) return;

  const garden = await db.first<{ id: string }>('SELECT id FROM gardens');
  if (!garden) throw new Error('Le jardin manque : la base n\'est pas migrée.');

  const ago = (days: number) => addDays(today, -days);

  const insert = (table: string, row: Record<string, SqlValue>) => {
    const columns = Object.keys(row);
    return db.run(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
      Object.values(row),
    );
  };

  await db.transaction(async () => {
    await db.run('UPDATE gardens SET name = ?, map_layout = ? WHERE id = ?', [
      'Jardin des Tilleuls',
      // La serre tunnel, archivée, reste hors carte.
      'terraced-long',
      garden.id,
    ]);

    const newSpace = async (name: string, kind: SpaceKind, description: string, isArchived = false) => {
      const id = randomUUID();
      await insert('spaces', {
        id,
        garden_id: garden.id,
        name,
        kind,
        description,
        is_archived: isArchived ? 1 : 0,
        created_at: now,
      });
      return { id };
    };

    const potager = await newSpace('Potager', 'VegetableGarden', 'Quatre carrés en planches de douglas, plein sud.');
    const verger = await newSpace('Verger', 'Orchard', 'Fond du terrain, en pente douce vers le ruisseau.');
    const petitsFruits = await newSpace('Petits fruits', 'SmallFruit', 'Le long de la clôture est, deux rangs palissés.');
    const bois = await newSpace('Bois de chauffage', 'Firewood', 'Abri ouvert contre le mur nord du garage.');
    const serre = await newSpace('Serre', 'Greenhouse', 'Serre en polycarbonate de 12 m², contre le garage.');
    await newSpace('Serre tunnel', 'Greenhouse', 'Bâche déchirée par la grêle de juin, démontée.', true);

    const newZone = async (space: Space, name: string, description: string | null = null): Promise<Zone> => {
      const id = randomUUID();
      await insert('zones', { id, space_id: space.id, name, description, created_at: now });
      return { id };
    };

    const carre1 = await newZone(potager, 'Carré 1', 'Solanacées.');
    const carre2 = await newZone(potager, 'Carré 2', 'Racines.');
    const carre3 = await newZone(potager, 'Carré 3', 'Cucurbitacées, paillage épais.');
    const carre4 = await newZone(potager, 'Carré 4', 'Feuilles et poireaux.');
    const rang1 = await newZone(petitsFruits, 'Rang 1', 'Framboisiers.');
    const rang2 = await newZone(petitsFruits, 'Rang 2', 'Groseilliers et cassissiers.');
    const tablette = await newZone(serre, 'Tablette', 'Semis et jeunes plants.');
    const bac = await newZone(serre, 'Bac de pleine terre');

    const slots: [string, Space, Zone?][] = [
      ['orchard', verger],
      ['small-fruit', petitsFruits],
      ['vegetable', potager],
      ['bed-1', potager, carre1],
      ['bed-2', potager, carre2],
      ['bed-3', potager, carre3],
      ['bed-4', potager, carre4],
      ['greenhouse', serre],
      ['firewood', bois],
    ];
    for (const [slotKey, space, zone] of slots) {
      await insert('garden_map_slots', {
        id: randomUUID(),
        garden_id: garden.id,
        slot_key: slotKey,
        space_id: space.id,
        zone_id: zone?.id ?? null,
      });
    }

    const newPlant = async (
      space: Space,
      zone: Zone | null,
      name: string,
      species: string,
      variety: string | null,
      quantity: number,
      unit: QuantityUnit,
      sownDaysAgo: number | null,
      plantedDaysAgo: number | null,
      isArchived = false,
    ): Promise<Item> => {
      const id = randomUUID();
      await insert('garden_items', {
        id,
        item_type: 'Plant',
        space_id: space.id,
        zone_id: zone?.id ?? null,
        name,
        is_archived: isArchived ? 1 : 0,
        created_at: now,
        species,
        variety,
        quantity,
        quantity_unit: unit,
        sown_date: sownDaysAgo === null ? null : ago(sownDaysAgo),
        planted_date: plantedDaysAgo === null ? null : ago(plantedDaysAgo),
      });
      return { id, zoneId: zone?.id ?? null };
    };

    const tomates = await newPlant(potager, carre1, 'Tomates', 'Solanum lycopersicum', 'Cœur de bœuf', 6, 'Plants', 100, 45);
    const basilic = await newPlant(potager, carre1, 'Basilic', 'Ocimum basilicum', 'Grand vert', 4, 'Plants', null, 30);
    const carottes = await newPlant(potager, carre2, 'Carottes', 'Daucus carota', 'Nantaise', 2, 'Rows', 60, null);
    // Culture finie : archivée, elle reste dans l'historique du carré 2.
    const radis = await newPlant(potager, carre2, 'Radis de printemps', 'Raphanus sativus', 'National', 1, 'Rows', 150, null, true);
    const courgettes = await newPlant(potager, carre3, 'Courgettes', 'Cucurbita pepo', 'Black Beauty', 2, 'Plants', null, 40);
    const laitues = await newPlant(potager, carre4, 'Laitues', 'Lactuca sativa', 'Batavia blonde', 12, 'Plants', null, 20);
    await newPlant(potager, carre4, 'Poireaux', 'Allium porrum', 'Bleu de Solaise', 1.5, 'SquareMeters', 120, 50);
    const rhubarbe = await newPlant(potager, null, 'Rhubarbe', 'Rheum rhabarbarum', null, 1, 'Plants', null, 900);

    // Trois arbres identiques suivis ensemble ; les autres arbres du verger sont suivis seuls.
    const pommiers = await newPlant(verger, null, 'Pommiers', 'Malus domestica', 'Golden', 3, 'Plants', null, 1200);
    const poirier = await newPlant(verger, null, 'Poirier', 'Pyrus communis', 'Conférence', 1, 'Plants', null, 1100);
    const cerisier = await newPlant(verger, null, 'Cerisier', 'Prunus avium', 'Burlat', 1, 'Plants', null, 800);
    const prunier = await newPlant(verger, null, 'Prunier', 'Prunus domestica', 'Reine-Claude dorée', 1, 'Plants', null, 10);

    const framboisiers = await newPlant(petitsFruits, rang1, 'Framboisiers', 'Rubus idaeus', 'Heritage', 8, 'Plants', null, 400);
    const groseilliers = await newPlant(petitsFruits, rang2, 'Groseilliers', 'Ribes rubrum', 'Jonkheer van Tets', 3, 'Plants', null, 3);
    await newPlant(petitsFruits, rang2, 'Cassissiers', 'Ribes nigrum', 'Noir de Bourgogne', 2, 'Plants', null, 600);

    const piments = await newPlant(serre, tablette, 'Piments', 'Capsicum annuum', 'Espelette', 12, 'Plants', 15, null);
    const concombres = await newPlant(serre, bac, 'Concombres', 'Cucumis sativus', 'Marketmore', 3, 'Plants', null, 35);
    await newPlant(serre, bac, 'Aubergines', 'Solanum melongena', 'Violette de Barbentane', 2, 'Plants', null, 10);

    const newWoodPile = async (
      name: string,
      species: string,
      steres: number,
      logLengthCm: number,
      cutDaysAgo: number,
      dryingMonths: number,
      isArchived = false,
    ): Promise<Item> => {
      const id = randomUUID();
      await insert('garden_items', {
        id,
        item_type: 'WoodPile',
        space_id: bois.id,
        zone_id: null,
        name,
        is_archived: isArchived ? 1 : 0,
        created_at: now,
        wood_species: species,
        initial_steres: steres,
        log_length_cm: logLengthCm,
        cut_date: ago(cutDaysAgo),
        drying_months: dryingMonths,
      });
      return { id, zoneId: null };
    };

    // Chêne coupé il y a trente mois et sec depuis six ; hêtre coupé il y a cinq mois, encore en séchage.
    const chene = await newWoodPile('Chêne du fond', 'Chêne', 8, 50, 900, 24);
    const hetre = await newWoodPile("Hêtre de l'année", 'Hêtre', 6, 33, 150, 18);
    const bouleau = await newWoodPile('Bouleau', 'Bouleau', 3, 33, 1000, 12, true);

    type Target = { space: Space; zone?: Zone; item?: Item };
    type EntryDetails = {
      note?: string;
      quantity?: number;
      unit?: MeasureUnit;
      heightCm?: number;
      problem?: string;
      treatment?: string;
    };

    // Une entrée sur un élément est aussi dans sa zone, comme dans DbSeeder.
    const zoneOf = ({ zone, item }: Target) => zone?.id ?? item?.zoneId ?? null;

    const entry = (kind: JournalEntryKind, daysAgo: number, target: Target, details: EntryDetails = {}) =>
      insert('journal_entries', {
        id: randomUUID(),
        kind,
        date: ago(daysAgo),
        space_id: target.space.id,
        zone_id: zoneOf(target),
        item_id: target.item?.id ?? null,
        note: details.note ?? null,
        quantity: details.quantity ?? null,
        quantity_unit: details.unit ?? null,
        height_cm: details.heightCm ?? null,
        problem: details.problem ?? null,
        treatment: details.treatment ?? null,
        created_at: now,
      });

    // Arrosages : la plupart sont notés sur une zone ou un espace et valent pour leurs plantes.
    // Les derniers de chaque cible fixent l'état des tâches d'arrosage, donné plus bas.
    const waterings: [number, Target, string?][] = [
      [25, { space: potager }, 'Grand arrosage de tout le potager au jet.'],
      [14, { space: potager, zone: carre1 }],
      [12, { space: potager }, 'Tout le potager, après trois jours de canicule.'],
      [11, { space: potager, zone: carre1 }],
      [10, { space: potager, zone: carre2 }],
      [9, { space: serre, zone: bac }],
      [8, { space: potager, zone: carre1 }],
      [7, { space: serre, zone: tablette }],
      [6, { space: potager, zone: carre1 }, 'Paillage ajouté au pied des tomates.'],
      [6, { space: potager, zone: carre2 }],
      [4, { space: potager, zone: carre1 }],
      [0, { space: potager, item: basilic }],
      [3, { space: potager, zone: carre2 }],
      [5, { space: potager, item: courgettes }],
      [1, { space: potager, zone: carre4 }],
      [3, { space: potager, item: rhubarbe }],
      [20, { space: verger }, 'Arrosage de reprise après la sécheresse.'],
      [10, { space: verger, item: poirier }],
      [14, { space: verger, item: cerisier }],
      [2, { space: petitsFruits, zone: rang1 }],
      [9, { space: petitsFruits, zone: rang2 }],
      [1, { space: serre, zone: tablette }],
      [5, { space: serre, zone: bac }],
      [1, { space: serre, item: concombres }],
    ];
    for (const [daysAgo, target, note] of waterings) {
      await entry('Watering', daysAgo, target, { note });
    }

    await entry('Sowing', 60, { space: potager, item: carottes }, { note: 'Deux rangs, graines en ruban.' });
    await entry('Planting', 45, { space: potager, item: tomates }, { note: 'Six pieds, tuteurs en spirale.' });
    await entry('Harvest', 40, { space: verger, item: cerisier }, {
      note: 'Une partie laissée aux merles.',
      quantity: 6,
      unit: 'Kilograms',
    });
    await entry('Pruning', 35, { space: verger }, {
      note: 'Taille en vert de tous les arbres : gourmands et branches qui se croisent.',
    });
    await entry('Fertilizing', 30, { space: potager, zone: carre3 }, {
      note: 'Deux seaux de compost mûr avant le paillage.',
    });
    await entry('Harvest', 25, { space: potager, item: radis }, {
      note: 'Fin de la planche, radis creux pour les derniers.',
      quantity: 30,
      unit: 'Pieces',
    });
    await entry('Pruning', 21, { space: petitsFruits, item: framboisiers }, {
      note: 'Cannes qui ont fructifié coupées au ras du sol.',
    });
    await entry('Planting', 20, { space: potager, item: laitues }, {
      note: 'Douze plants repiqués, filet contre les oiseaux.',
    });
    await entry('Other', 18, { space: potager }, { note: 'Désherbage des allées et tonte des abords.' });
    await entry('Sowing', 15, { space: serre, item: piments }, { note: 'Douze godets sur la tablette chauffante.' });
    await entry('Observation', 15, { space: verger, item: pommiers }, {
      note: 'Belle charge cette année, quelques fruits éclaircis.',
    });
    await entry('Observation', 10, { space: potager, item: tomates }, {
      note: 'Premières fleurs sur le pied du fond.',
      heightCm: 45,
    });
    await entry('Planting', 10, { space: verger, item: prunier }, { note: 'Scion de deux ans, tuteuré face au vent.' });
    await entry('Harvest', 6, { space: potager, item: courgettes }, {
      note: 'Les premières, cueillies à 20 cm.',
      quantity: 3.2,
      unit: 'Kilograms',
    });
    await entry('Harvest', 4, { space: petitsFruits, item: framboisiers }, { quantity: 650, unit: 'Grams' });
    await entry('Observation', 3, { space: potager, item: tomates }, {
      note: 'Belle croissance, premiers fruits verts.',
      heightCm: 72,
    });
    await entry('Planting', 3, { space: petitsFruits, item: groseilliers }, { note: 'Trois pieds en racines nues.' });
    await entry('Observation', 2, { space: potager, item: courgettes }, {
      note: 'Taches blanches sur les feuilles les plus basses.',
      problem: "Oïdium probable, favorisé par l'humidité du matin.",
    });
    await entry('Treatment', 1, { space: potager, item: courgettes }, {
      note: 'Feuilles atteintes retirées.',
      problem: 'Oïdium',
      treatment: 'Purin de prêle pulvérisé en fin de journée.',
    });
    await entry('Observation', 1, { space: petitsFruits, item: groseilliers }, {
      note: 'Reprise correcte, premières feuilles.',
      heightCm: 35,
    });
    await entry('Harvest', 1, { space: potager, item: tomates }, {
      note: 'Premières cœur de bœuf.',
      quantity: 2.5,
      unit: 'Kilograms',
    });

    // Stock du chêne : 8 stères au départ, 2 apportés, 5,5 brûlés, soit 4,5 stères restants.
    const steres = (quantity: number, note?: string): EntryDetails => ({ note, quantity, unit: 'Steres' });
    await entry('WoodSupply', 120, { space: bois, item: chene }, steres(2, 'Deux stères repris au tas de la haie.'));
    await entry('WoodConsumption', 60, { space: bois, item: chene }, steres(1));
    await entry('WoodConsumption', 45, { space: bois, item: chene }, steres(1.5));
    await entry('WoodConsumption', 30, { space: bois, item: chene }, steres(1));
    await entry('WoodConsumption', 14, { space: bois, item: chene }, steres(1.5, 'Semaine de gel.'));
    await entry('WoodConsumption', 5, { space: bois, item: chene }, steres(0.5));
    // Le bouleau, épuisé, est archivé.
    await entry('WoodConsumption', 200, { space: bois, item: bouleau }, steres(1.5));
    await entry('WoodConsumption', 170, { space: bois, item: bouleau }, steres(1.5, "Dernières bûches de l'hiver."));

    type TaskDetails = { intervalDays?: number; title?: string; createdDaysAgo?: number };

    const task = (
      kind: JournalEntryKind,
      recurrence: TaskRecurrence,
      startDate: DateOnly,
      target: Target,
      { intervalDays, title, createdDaysAgo = 0 }: TaskDetails = {},
    ) =>
      insert('garden_tasks', {
        id: randomUUID(),
        kind,
        recurrence,
        start_date: startDate,
        interval_days: intervalDays ?? null,
        title: title ?? null,
        space_id: target.space.id,
        zone_id: zoneOf(target),
        item_id: target.item?.id ?? null,
        created_at: new Date(Date.parse(now) - createdDaysAgo * 86_400_000).toISOString(),
      });

    const wateringTask = (target: Target, everyDays = 1, startedDaysAgo = 60, title?: string) =>
      task('Watering', 'EveryNDays', ago(startedDaysAgo), target, { intervalDays: everyDays, title });

    // L'état de chaque tâche, d'après le journal ci-dessus, est donné en commentaire.
    // En retard de 2 jours : le carré 1 a été arrosé il y a 4 jours.
    await wateringTask({ space: potager, item: tomates }, 2, 45);
    // À jour : arrosé ce matin, malgré le carré arrosé il y a 4 jours.
    await wateringTask({ space: potager, item: basilic }, 2, 30);
    // À faire aujourd'hui.
    await wateringTask({ space: potager, item: carottes }, 3);
    // En retard de 2 jours.
    await wateringTask({ space: potager, item: courgettes }, 3, 40);
    // Tout le carré 4, tous les jours : à faire aujourd'hui.
    await wateringTask({ space: potager, zone: carre4 }, 1, 20, 'Laitues et poireaux');
    // À jour, prochain arrosage dans 4 jours.
    await wateringTask({ space: potager, item: rhubarbe }, 7);
    // En retard de 6 jours : l'arrosage de tout le verger date de 20 jours.
    await wateringTask({ space: verger, item: pommiers }, 14);
    // En retard de 3 jours : la tâche part d'une semaine après la plantation, et l'arrosage du
    // verger, plus ancien, n'y change rien.
    await wateringTask({ space: verger, item: prunier }, 7, 3, 'Arrosage de reprise');
    // En retard de 2 jours.
    await wateringTask({ space: petitsFruits, zone: rang2 }, 7);
    // À faire aujourd'hui.
    await wateringTask({ space: serre, zone: tablette }, 1, 15);
    // En retard de 3 jours : l'arrosage des seuls concombres, hier, n'arrose pas le bac.
    await wateringTask({ space: serre, zone: bac }, 2, 35);
    // En retard de 4 jours.
    await task('Other', 'EveryNDays', ago(60), { space: potager }, { intervalDays: 14, title: 'Désherber les allées' });
    // À jour presque toute l'année : la taille en vert d'il y a 35 jours compte, même en retard,
    // pour le dernier 1er février passé ; elle ne fait pas celui qui vient.
    await task('Pruning', 'Yearly', `${yearOf(today)}-02-01`, { space: verger }, { title: "Taille d'hiver" });
    // En retard de 10 jours : jamais faite.
    await task('Fertilizing', 'Yearly', ago(10), { space: petitsFruits }, { title: 'Compost au pied des arbustes' });
    // À jour, prévue dans 6 jours : le traitement d'hier, antérieur à la tâche, ne la fait pas.
    await task('Treatment', 'Once', addDays(today, 6), { space: potager, item: courgettes }, {
      title: 'Renouveler le purin de prêle',
    });
    // Faite en avance : prévue dans 2 jours, plantés il y a 3 jours.
    await task('Planting', 'Once', addDays(today, 2), { space: petitsFruits, item: groseilliers }, {
      title: 'Planter les groseilliers',
      createdDaysAgo: 10,
    });
    // Prévue dans 3 jours : le hêtre est encore en séchage, à l'air libre.
    await task('Other', 'Once', addDays(today, 3), { space: bois, item: hetre }, {
      title: "Rentrer le hêtre sous l'abri",
    });
  });
}
