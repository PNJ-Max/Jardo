import type { Db } from './db';

// Le schéma de la base, repris de GardenDbContext. Une migration publiée ne se modifie plus : on
// en ajoute une à la fin. Son rang dans la liste est la version (PRAGMA user_version) qu'elle
// donne à la base.
//
// Conventions : identifiants UUID en texte, jours "YYYY-MM-DD", instants ISO 8601 UTC, booléens
// en 0 ou 1. Les tables sont STRICT : SQLite refuse une valeur du mauvais type au lieu de la
// garder telle quelle. Une clé primaire TEXT accepte NULL sans NOT NULL, une bizarrerie
// historique de SQLite.
export const migrations: readonly string[] = [
  `
CREATE TABLE gardens (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  map_layout TEXT,
  created_at TEXT NOT NULL
) STRICT;

CREATE TABLE spaces (
  id TEXT PRIMARY KEY NOT NULL,
  garden_id TEXT NOT NULL REFERENCES gardens (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  description TEXT,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  UNIQUE (garden_id, name)
) STRICT;

-- Un espace ne se supprime que vide d'éléments : ses zones partent avec lui.
CREATE TABLE zones (
  id TEXT PRIMARY KEY NOT NULL,
  space_id TEXT NOT NULL REFERENCES spaces (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (space_id, name)
) STRICT;

-- Plantes et tas de bois dans une seule table, comme le TPH d'EF Core : les colonnes propres à
-- un type restent nulles pour l'autre. RESTRICT : supprimer un espace ou une zone ne doit jamais
-- emporter un élément et son historique.
CREATE TABLE garden_items (
  id TEXT PRIMARY KEY NOT NULL,
  item_type TEXT NOT NULL,
  space_id TEXT NOT NULL REFERENCES spaces (id) ON DELETE RESTRICT,
  zone_id TEXT REFERENCES zones (id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  species TEXT,
  variety TEXT,
  quantity REAL,
  quantity_unit TEXT,
  sown_date TEXT,
  planted_date TEXT,
  wood_species TEXT,
  initial_steres REAL,
  log_length_cm INTEGER,
  cut_date TEXT,
  drying_months INTEGER
) STRICT;

CREATE INDEX ix_garden_items_space_id_is_archived ON garden_items (space_id, is_archived);
CREATE INDEX ix_garden_items_zone_id ON garden_items (zone_id);

-- Cascade sans risque pour l'historique d'un élément : ses entrées sont toujours dans son espace
-- et sa zone, et ceux-ci ne se suppriment que vides d'éléments.
CREATE TABLE journal_entries (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL,
  date TEXT NOT NULL,
  space_id TEXT NOT NULL REFERENCES spaces (id) ON DELETE CASCADE,
  zone_id TEXT REFERENCES zones (id) ON DELETE CASCADE,
  item_id TEXT REFERENCES garden_items (id) ON DELETE CASCADE,
  note TEXT,
  quantity REAL,
  quantity_unit TEXT,
  height_cm INTEGER,
  problem TEXT,
  treatment TEXT,
  created_at TEXT NOT NULL
) STRICT;

CREATE INDEX ix_journal_entries_space_id_date ON journal_entries (space_id, date DESC);
CREATE INDEX ix_journal_entries_zone_id ON journal_entries (zone_id);
CREATE INDEX ix_journal_entries_item_id ON journal_entries (item_id);

-- Mêmes cascades que le journal, sûres pour la même raison.
CREATE TABLE garden_tasks (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL,
  recurrence TEXT NOT NULL,
  start_date TEXT NOT NULL,
  interval_days INTEGER,
  title TEXT,
  space_id TEXT NOT NULL REFERENCES spaces (id) ON DELETE CASCADE,
  zone_id TEXT REFERENCES zones (id) ON DELETE CASCADE,
  item_id TEXT REFERENCES garden_items (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
) STRICT;

CREATE INDEX ix_garden_tasks_space_id ON garden_tasks (space_id);
CREATE INDEX ix_garden_tasks_zone_id ON garden_tasks (zone_id);
CREATE INDEX ix_garden_tasks_item_id ON garden_tasks (item_id);

-- Supprimer le jardin, un espace ou une zone libère l'emplacement sans toucher à rien d'autre.
CREATE TABLE garden_map_slots (
  id TEXT PRIMARY KEY NOT NULL,
  garden_id TEXT NOT NULL REFERENCES gardens (id) ON DELETE CASCADE,
  slot_key TEXT NOT NULL,
  space_id TEXT NOT NULL REFERENCES spaces (id) ON DELETE CASCADE,
  zone_id TEXT REFERENCES zones (id) ON DELETE CASCADE,
  UNIQUE (garden_id, slot_key)
) STRICT;

CREATE INDEX ix_garden_map_slots_space_id ON garden_map_slots (space_id);
CREATE INDEX ix_garden_map_slots_zone_id ON garden_map_slots (zone_id);

-- Le jardin unique du MVP fait partie du schéma. Son identifiant est un UUID v4 tiré au hasard
-- (SQLite n'a pas de fonction uuid()) : deux installations n'ont jamais le même jardin, ce qu'une
-- future synchronisation exige.
INSERT INTO gardens (id, name, created_at) VALUES (
  lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
    substr(lower(hex(randomblob(2))), 2) || '-' ||
    substr('89ab', 1 + abs(random()) % 4, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
    lower(hex(randomblob(6))),
  'Mon jardin',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);
`,
  `
-- « Reporter » : l'échéance d'une tâche ne tombe pas avant ce jour.
ALTER TABLE garden_tasks ADD COLUMN postponed_until TEXT;
`,
];

/** Amène la base à la dernière version, une migration par transaction. */
export async function migrate(db: Db, scripts: readonly string[] = migrations): Promise<void> {
  const current = (await db.first<{ user_version: number }>('PRAGMA user_version'))?.user_version ?? 0;
  if (current > scripts.length) {
    throw new Error(
      `La base est en version ${current}, plus récente que cette version de l'app (${scripts.length}).`,
    );
  }

  for (let version = current + 1; version <= scripts.length; version++) {
    await db.transaction(async () => {
      await db.exec(scripts[version - 1]);
      await db.exec(`PRAGMA user_version = ${version}`);
    });
  }
}
