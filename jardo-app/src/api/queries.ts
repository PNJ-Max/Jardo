import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';

import { useServices } from '@/data/services';
import { pickBackupFile, saveBackupFile } from '@/lib/backup-file';
import { toDateOnly } from '@/lib/dates';

import type {
  CompleteTaskInput,
  DueHorizon,
  GardenBackup,
  GardenInput,
  GardenTask,
  Id,
  JournalEntryInput,
  JournalEntryKind,
  PlantInput,
  SpaceInput,
  TaskInput,
  WoodPileInput,
  ZoneInput,
} from './types';

export type TargetFilter = { spaceId?: Id; zoneId?: Id; itemId?: Id };
export type JournalFilter = TargetFilter & { kinds?: JournalEntryKind[] };
type ItemFilter = { spaceId?: Id; zoneId?: Id; includeArchived?: boolean };

// Clés de cache hiérarchiques : invalider ['tasks'] invalide aussi ['tasks', 'due', 'Week'].
// Chaque famille porte le nom d'une ressource, celle d'un service de src/data.
export const keys = {
  garden: ['garden'] as const,
  gardenMap: ['gardenMap'] as const,
  spaces: ['spaces'] as const,
  spaceList: (includeArchived: boolean) => ['spaces', 'list', { includeArchived }] as const,
  space: (id: Id) => ['spaces', id] as const,
  zones: ['zones'] as const,
  spaceZones: (spaceId: Id) => ['zones', 'space', spaceId] as const,
  zone: (id: Id) => ['zones', id] as const,
  plants: ['plants'] as const,
  plantList: (filter: ItemFilter) => ['plants', 'list', filter] as const,
  plant: (id: Id) => ['plants', id] as const,
  woodPiles: ['woodPiles'] as const,
  woodPileList: (filter: ItemFilter) => ['woodPiles', 'list', filter] as const,
  woodPile: (id: Id) => ['woodPiles', id] as const,
  journal: ['journal'] as const,
  journalList: (filter: JournalFilter) => ['journal', 'list', filter] as const,
  entry: (id: Id) => ['journal', id] as const,
  tasks: ['tasks'] as const,
  taskList: (filter: TargetFilter) => ['tasks', 'list', filter] as const,
  dueTasks: ['tasks', 'due'] as const,
  dueTaskList: (horizon: DueHorizon) => ['tasks', 'due', horizon] as const,
  task: (id: Id) => ['tasks', id] as const,
};

type Family = 'gardenMap' | 'spaces' | 'zones' | 'plants' | 'woodPiles' | 'journal' | 'tasks';

/**
 * Les enregistrements attendent le rechargement : de retour sur l'écran précédent, tout est
 * déjà à jour. Les suppressions, non : l'écran de la ressource supprimée doit se fermer tout de
 * suite, sans attendre la relecture d'une ressource qui n'existe plus.
 */
function useInvalidate(families: Family[]) {
  const queryClient = useQueryClient();
  return () => Promise.all(families.map((family) => queryClient.invalidateQueries({ queryKey: [family] })));
}

/**
 * Une intervention notée change les échéances des tâches, donc les compteurs des espaces, et
 * le stock des tas de bois : tout est recalculé par les services à la lecture.
 */
const afterJournalWrite: Family[] = ['journal', 'tasks', 'spaces', 'woodPiles'];

const afterTaskWrite: Family[] = ['tasks', 'spaces'];

/**
 * Espaces, zones et éléments : leurs noms et leurs compteurs apparaissent partout (journal,
 * tâches, autres listes, carte), et un déplacement change les cibles. Archiver, supprimer ou
 * changer le type d'un espace le retire aussi de la carte. On recharge tout le jardin.
 */
const afterStructureWrite: Family[] = ['gardenMap', 'spaces', 'zones', 'plants', 'woodPiles', 'journal', 'tasks'];

// --- Jardin et espaces --------------------------------------------------------

export function useGarden() {
  const { garden } = useServices();
  return useQuery({ queryKey: keys.garden, queryFn: () => garden.get() });
}

/** Seul le nom du jardin change, et le service le renvoie : pas de relecture. */
export function useSaveGarden() {
  const { garden } = useServices();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GardenInput) => garden.update(input),
    onSuccess: (saved) => queryClient.setQueryData(keys.garden, saved),
  });
}

// --- Sauvegarde ---------------------------------------------------------------

/** Tout le jardin dans un fichier JSON, ouvert dans la feuille de partage (téléchargé sur le web). */
export function useExportGarden() {
  const { backup } = useServices();
  return useMutation({
    mutationFn: async () => {
      const file = await backup.export();
      const name = `jardo-${toDateOnly(new Date(file.exportedAt))}.json`;
      await saveBackupFile(name, JSON.stringify(file, null, 2));
      return name;
    },
  });
}

/** Choisit un fichier et le vérifie en entier, sans rien écrire. Null si l'utilisateur renonce. */
export function useReadBackupFile() {
  const { backup } = useServices();
  return useMutation({
    mutationFn: async (): Promise<GardenBackup | null> => {
      const text = await pickBackupFile();
      return text === null ? null : backup.read(text);
    },
  });
}

/** Tout le jardin est remplacé : chaque écran relit. */
export function useImportGarden() {
  const { backup } = useServices();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: GardenBackup) => backup.replace(file),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useGardenMap() {
  const { gardenMap } = useServices();
  return useQuery({ queryKey: keys.gardenMap, queryFn: () => gardenMap.get() });
}

export function useSpaces(includeArchived = false) {
  const { spaces } = useServices();
  return useQuery({ queryKey: keys.spaceList(includeArchived), queryFn: () => spaces.getAll(includeArchived) });
}

export function useSpace(id: Id) {
  const { spaces } = useServices();
  return useQuery({ queryKey: keys.space(id), queryFn: () => spaces.getById(id) });
}

export function useSaveSpace() {
  const { spaces } = useServices();
  const invalidate = useInvalidate(afterStructureWrite);
  return useMutation({
    mutationFn: ({ id, input }: { id?: Id; input: SpaceInput }) => (id ? spaces.update(id, input) : spaces.create(input)),
    onSuccess: invalidate,
  });
}

export function useSetSpaceArchived() {
  const { spaces } = useServices();
  const invalidate = useInvalidate(afterStructureWrite);
  return useMutation({
    mutationFn: ({ id, archived }: { id: Id; archived: boolean }) => spaces.setArchived(id, archived),
    onSuccess: invalidate,
  });
}

export function useDeleteSpace() {
  const { spaces } = useServices();
  const invalidate = useInvalidate(afterStructureWrite);
  return useMutation({
    mutationFn: (id: Id) => spaces.delete(id),
    onSuccess: () => void invalidate(),
  });
}

// --- Zones --------------------------------------------------------------------

export function useZones(spaceId: Id) {
  const { zones } = useServices();
  return useQuery({ queryKey: keys.spaceZones(spaceId), queryFn: () => zones.getBySpace(spaceId) });
}

/** Les zones de plusieurs espaces, dans le même cache que `useZones`. */
export function useZonesOf(spaceIds: Id[]) {
  const { zones } = useServices();
  return useQueries({
    queries: spaceIds.map((spaceId) => ({
      queryKey: keys.spaceZones(spaceId),
      queryFn: () => zones.getBySpace(spaceId),
    })),
    combine: (results) => results.flatMap((result) => result.data ?? []),
  });
}

export function useZone(id: Id) {
  const { zones } = useServices();
  return useQuery({ queryKey: keys.zone(id), queryFn: () => zones.getById(id) });
}

export function useSaveZone() {
  const { zones } = useServices();
  const invalidate = useInvalidate(afterStructureWrite);
  return useMutation({
    mutationFn: ({ id, spaceId, input }: { id?: Id; spaceId?: Id; input: ZoneInput }) =>
      id ? zones.update(id, input) : zones.create(spaceId!, input),
    onSuccess: invalidate,
  });
}

export function useDeleteZone() {
  const { zones } = useServices();
  const invalidate = useInvalidate(afterStructureWrite);
  return useMutation({
    mutationFn: (id: Id) => zones.delete(id),
    onSuccess: () => void invalidate(),
  });
}

// --- Plantes ------------------------------------------------------------------

export function usePlants(filter: ItemFilter = {}) {
  const { plants } = useServices();
  return useQuery({ queryKey: keys.plantList(filter), queryFn: () => plants.getAll(filter) });
}

export function usePlant(id: Id) {
  const { plants } = useServices();
  return useQuery({ queryKey: keys.plant(id), queryFn: () => plants.getById(id) });
}

export function useSavePlant() {
  const { plants } = useServices();
  const invalidate = useInvalidate(afterStructureWrite);
  return useMutation({
    mutationFn: ({ id, input }: { id?: Id; input: PlantInput }) => (id ? plants.update(id, input) : plants.create(input)),
    onSuccess: invalidate,
  });
}

export function useSetPlantArchived() {
  const { plants } = useServices();
  const invalidate = useInvalidate(afterStructureWrite);
  return useMutation({
    mutationFn: ({ id, archived }: { id: Id; archived: boolean }) => plants.setArchived(id, archived),
    onSuccess: invalidate,
  });
}

export function useDeletePlant() {
  const { plants } = useServices();
  const invalidate = useInvalidate(afterStructureWrite);
  return useMutation({
    mutationFn: (id: Id) => plants.delete(id),
    onSuccess: () => void invalidate(),
  });
}

// --- Tas de bois --------------------------------------------------------------

export function useWoodPiles(filter: ItemFilter = {}) {
  const { woodPiles } = useServices();
  return useQuery({ queryKey: keys.woodPileList(filter), queryFn: () => woodPiles.getAll(filter) });
}

export function useWoodPile(id: Id) {
  const { woodPiles } = useServices();
  return useQuery({ queryKey: keys.woodPile(id), queryFn: () => woodPiles.getById(id) });
}

export function useSaveWoodPile() {
  const { woodPiles } = useServices();
  const invalidate = useInvalidate(afterStructureWrite);
  return useMutation({
    mutationFn: ({ id, input }: { id?: Id; input: WoodPileInput }) =>
      id ? woodPiles.update(id, input) : woodPiles.create(input),
    onSuccess: invalidate,
  });
}

export function useSetWoodPileArchived() {
  const { woodPiles } = useServices();
  const invalidate = useInvalidate(afterStructureWrite);
  return useMutation({
    mutationFn: ({ id, archived }: { id: Id; archived: boolean }) => woodPiles.setArchived(id, archived),
    onSuccess: invalidate,
  });
}

export function useDeleteWoodPile() {
  const { woodPiles } = useServices();
  const invalidate = useInvalidate(afterStructureWrite);
  return useMutation({
    mutationFn: (id: Id) => woodPiles.delete(id),
    onSuccess: () => void invalidate(),
  });
}

// --- Journal ------------------------------------------------------------------

/** Du plus récent au plus ancien, trié par le service. */
export function useJournal(filter: JournalFilter = {}) {
  const { journal } = useServices();
  return useQuery({ queryKey: keys.journalList(filter), queryFn: () => journal.getAll(filter) });
}

export function useJournalEntry(id: Id) {
  const { journal } = useServices();
  return useQuery({ queryKey: keys.entry(id), queryFn: () => journal.getById(id) });
}

export function useSaveJournalEntry() {
  const { journal } = useServices();
  const invalidate = useInvalidate(afterJournalWrite);
  return useMutation({
    mutationFn: ({ id, input }: { id?: Id; input: JournalEntryInput }) =>
      id ? journal.update(id, input) : journal.create(input),
    onSuccess: invalidate,
  });
}

export function useDeleteJournalEntry() {
  const { journal } = useServices();
  const invalidate = useInvalidate(afterJournalWrite);
  return useMutation({
    mutationFn: (id: Id) => journal.delete(id),
    onSuccess: () => void invalidate(),
  });
}

// --- Tâches -------------------------------------------------------------------

/** Les tâches d'une cible, celles de sa zone et de son espace comprises. */
export function useTasks(filter: TargetFilter = {}) {
  const { tasks } = useServices();
  return useQuery({ queryKey: keys.taskList(filter), queryFn: () => tasks.getAll(filter) });
}

/**
 * Les tâches dues de tout le jardin, les plus en retard d'abord. `Week` ajoute les sept
 * prochains jours aux retards et à aujourd'hui.
 */
export function useDueTasks(horizon: DueHorizon) {
  const { tasks } = useServices();
  return useQuery({ queryKey: keys.dueTaskList(horizon), queryFn: () => tasks.getDue(horizon) });
}

export function useTask(id: Id) {
  const { tasks } = useServices();
  return useQuery({ queryKey: keys.task(id), queryFn: () => tasks.getById(id) });
}

export function useSaveTask() {
  const { tasks } = useServices();
  const invalidate = useInvalidate(afterTaskWrite);
  return useMutation({
    mutationFn: ({ id, input }: { id?: Id; input: TaskInput }) => (id ? tasks.update(id, input) : tasks.create(input)),
    onSuccess: invalidate,
  });
}

export function useDeleteTask() {
  const { tasks } = useServices();
  const invalidate = useInvalidate(afterTaskWrite);
  return useMutation({
    mutationFn: (id: Id) => tasks.delete(id),
    onSuccess: () => void invalidate(),
  });
}

/**
 * « Fait » note l'intervention au journal. La tâche quitte aussitôt les listes de tâches dues,
 * sans attendre l'écriture ; si elle est refusée, les listes d'avant sont restaurées. Le
 * rechargement qui suit la replace là où sa nouvelle échéance la met (cette semaine, par
 * exemple). Supprimer l'entrée renvoyée annule le « Fait ».
 */
export function useCompleteTask() {
  const { tasks } = useServices();
  const queryClient = useQueryClient();
  const invalidate = useInvalidate(afterJournalWrite);

  return useMutation({
    mutationFn: ({ id, input }: { id: Id; input?: CompleteTaskInput }) => tasks.complete(id, input),

    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: keys.dueTasks });
      const previous = queryClient.getQueriesData<GardenTask[]>({ queryKey: keys.dueTasks });
      queryClient.setQueriesData<GardenTask[]>({ queryKey: keys.dueTasks }, (old) =>
        old?.filter((task) => task.id !== id),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      context?.previous.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data));
    },
    onSettled: invalidate,
  });
}
