import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, queryString } from './client';
import type {
  CompleteTaskInput,
  DueHorizon,
  Garden,
  GardenTask,
  JournalEntry,
  JournalEntryInput,
  JournalEntryKind,
  Plant,
  PlantInput,
  Space,
  SpaceInput,
  TaskInput,
  WoodPile,
  WoodPileInput,
  Zone,
  ZoneInput,
} from './types';

export type TargetFilter = { spaceId?: number; zoneId?: number; itemId?: number };
export type JournalFilter = TargetFilter & { kinds?: JournalEntryKind[] };
type ItemFilter = { spaceId?: number; zoneId?: number; includeArchived?: boolean };

// Clés de cache hiérarchiques : invalider ['tasks'] invalide aussi ['tasks', 'due', 'Week'].
// Chaque famille porte le nom d'une ressource de l'API.
export const keys = {
  garden: ['garden'] as const,
  spaces: ['spaces'] as const,
  spaceList: (includeArchived: boolean) => ['spaces', 'list', { includeArchived }] as const,
  space: (id: number) => ['spaces', id] as const,
  zones: ['zones'] as const,
  spaceZones: (spaceId: number) => ['zones', 'space', spaceId] as const,
  zone: (id: number) => ['zones', id] as const,
  plants: ['plants'] as const,
  plantList: (filter: ItemFilter) => ['plants', 'list', filter] as const,
  plant: (id: number) => ['plants', id] as const,
  woodPiles: ['woodPiles'] as const,
  woodPileList: (filter: ItemFilter) => ['woodPiles', 'list', filter] as const,
  woodPile: (id: number) => ['woodPiles', id] as const,
  journal: ['journal'] as const,
  journalList: (filter: JournalFilter) => ['journal', 'list', filter] as const,
  entry: (id: number) => ['journal', id] as const,
  tasks: ['tasks'] as const,
  taskList: (filter: TargetFilter) => ['tasks', 'list', filter] as const,
  dueTasks: ['tasks', 'due'] as const,
  dueTaskList: (horizon: DueHorizon) => ['tasks', 'due', horizon] as const,
  task: (id: number) => ['tasks', id] as const,
};

type Family = 'spaces' | 'zones' | 'plants' | 'woodPiles' | 'journal' | 'tasks';

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
 * le stock des tas de bois : tout est recalculé par l'API à la lecture.
 */
const afterJournalWrite: Family[] = ['journal', 'tasks', 'spaces', 'woodPiles'];

const afterTaskWrite: Family[] = ['tasks', 'spaces'];

/**
 * Espaces, zones et éléments : leurs noms et leurs compteurs apparaissent partout (journal,
 * tâches, autres listes), et un déplacement change les cibles. On recharge tout le jardin.
 */
const afterStructureWrite: Family[] = ['spaces', 'zones', 'plants', 'woodPiles', 'journal', 'tasks'];

// --- Jardin et espaces --------------------------------------------------------

export const useGarden = () => useQuery({ queryKey: keys.garden, queryFn: () => api<Garden>('/api/garden') });

export const useSpaces = (includeArchived = false) =>
  useQuery({
    queryKey: keys.spaceList(includeArchived),
    queryFn: () => api<Space[]>(`/api/spaces${queryString({ includeArchived })}`),
  });

export const useSpace = (id: number) =>
  useQuery({ queryKey: keys.space(id), queryFn: () => api<Space>(`/api/spaces/${id}`) });

export function useSaveSpace() {
  const invalidate = useInvalidate(afterStructureWrite);
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: SpaceInput }) =>
      id
        ? api<Space>(`/api/spaces/${id}`, { method: 'PUT', body: input })
        : api<Space>('/api/spaces', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useSetSpaceArchived() {
  const invalidate = useInvalidate(afterStructureWrite);
  return useMutation({
    mutationFn: ({ id, archived }: { id: number; archived: boolean }) =>
      api<Space>(`/api/spaces/${id}/${archived ? 'archive' : 'unarchive'}`, { method: 'POST' }),
    onSuccess: invalidate,
  });
}

export function useDeleteSpace() {
  const invalidate = useInvalidate(afterStructureWrite);
  return useMutation({
    mutationFn: (id: number) => api<void>(`/api/spaces/${id}`, { method: 'DELETE' }),
    onSuccess: () => void invalidate(),
  });
}

// --- Zones --------------------------------------------------------------------

export const useZones = (spaceId: number) =>
  useQuery({ queryKey: keys.spaceZones(spaceId), queryFn: () => api<Zone[]>(`/api/spaces/${spaceId}/zones`) });

export const useZone = (id: number) =>
  useQuery({ queryKey: keys.zone(id), queryFn: () => api<Zone>(`/api/zones/${id}`) });

export function useSaveZone() {
  const invalidate = useInvalidate(afterStructureWrite);
  return useMutation({
    mutationFn: ({ id, spaceId, input }: { id?: number; spaceId?: number; input: ZoneInput }) =>
      id
        ? api<Zone>(`/api/zones/${id}`, { method: 'PUT', body: input })
        : api<Zone>(`/api/spaces/${spaceId}/zones`, { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useDeleteZone() {
  const invalidate = useInvalidate(afterStructureWrite);
  return useMutation({
    mutationFn: (id: number) => api<void>(`/api/zones/${id}`, { method: 'DELETE' }),
    onSuccess: () => void invalidate(),
  });
}

// --- Plantes ------------------------------------------------------------------

export const usePlants = (filter: ItemFilter = {}) =>
  useQuery({
    queryKey: keys.plantList(filter),
    queryFn: () => api<Plant[]>(`/api/plants${queryString(filter)}`),
  });

export const usePlant = (id: number) =>
  useQuery({ queryKey: keys.plant(id), queryFn: () => api<Plant>(`/api/plants/${id}`) });

export function useSavePlant() {
  const invalidate = useInvalidate(afterStructureWrite);
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: PlantInput }) =>
      id
        ? api<Plant>(`/api/plants/${id}`, { method: 'PUT', body: input })
        : api<Plant>('/api/plants', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useSetPlantArchived() {
  const invalidate = useInvalidate(afterStructureWrite);
  return useMutation({
    mutationFn: ({ id, archived }: { id: number; archived: boolean }) =>
      api<Plant>(`/api/plants/${id}/${archived ? 'archive' : 'unarchive'}`, { method: 'POST' }),
    onSuccess: invalidate,
  });
}

export function useDeletePlant() {
  const invalidate = useInvalidate(afterStructureWrite);
  return useMutation({
    mutationFn: (id: number) => api<void>(`/api/plants/${id}`, { method: 'DELETE' }),
    onSuccess: () => void invalidate(),
  });
}

// --- Tas de bois --------------------------------------------------------------

export const useWoodPiles = (filter: ItemFilter = {}) =>
  useQuery({
    queryKey: keys.woodPileList(filter),
    queryFn: () => api<WoodPile[]>(`/api/wood-piles${queryString(filter)}`),
  });

export const useWoodPile = (id: number) =>
  useQuery({ queryKey: keys.woodPile(id), queryFn: () => api<WoodPile>(`/api/wood-piles/${id}`) });

export function useSaveWoodPile() {
  const invalidate = useInvalidate(afterStructureWrite);
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: WoodPileInput }) =>
      id
        ? api<WoodPile>(`/api/wood-piles/${id}`, { method: 'PUT', body: input })
        : api<WoodPile>('/api/wood-piles', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useSetWoodPileArchived() {
  const invalidate = useInvalidate(afterStructureWrite);
  return useMutation({
    mutationFn: ({ id, archived }: { id: number; archived: boolean }) =>
      api<WoodPile>(`/api/wood-piles/${id}/${archived ? 'archive' : 'unarchive'}`, { method: 'POST' }),
    onSuccess: invalidate,
  });
}

export function useDeleteWoodPile() {
  const invalidate = useInvalidate(afterStructureWrite);
  return useMutation({
    mutationFn: (id: number) => api<void>(`/api/wood-piles/${id}`, { method: 'DELETE' }),
    onSuccess: () => void invalidate(),
  });
}

// --- Journal ------------------------------------------------------------------

/** Du plus récent au plus ancien, trié par l'API. */
export const useJournal = (filter: JournalFilter = {}) =>
  useQuery({
    queryKey: keys.journalList(filter),
    queryFn: () =>
      api<JournalEntry[]>(
        `/api/journal${queryString({ spaceId: filter.spaceId, zoneId: filter.zoneId, itemId: filter.itemId, kind: filter.kinds })}`,
      ),
  });

export const useJournalEntry = (id: number) =>
  useQuery({ queryKey: keys.entry(id), queryFn: () => api<JournalEntry>(`/api/journal/${id}`) });

export function useSaveJournalEntry() {
  const invalidate = useInvalidate(afterJournalWrite);
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: JournalEntryInput }) =>
      id
        ? api<JournalEntry>(`/api/journal/${id}`, { method: 'PUT', body: input })
        : api<JournalEntry>('/api/journal', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useDeleteJournalEntry() {
  const invalidate = useInvalidate(afterJournalWrite);
  return useMutation({
    mutationFn: (id: number) => api<void>(`/api/journal/${id}`, { method: 'DELETE' }),
    onSuccess: () => void invalidate(),
  });
}

// --- Tâches -------------------------------------------------------------------

/** Les tâches d'une cible, celles de sa zone et de son espace comprises. */
export const useTasks = (filter: TargetFilter = {}) =>
  useQuery({
    queryKey: keys.taskList(filter),
    queryFn: () => api<GardenTask[]>(`/api/tasks${queryString(filter)}`),
  });

/**
 * Les tâches dues de tout le jardin, les plus en retard d'abord. `Week` ajoute les sept
 * prochains jours aux retards et à aujourd'hui.
 */
export const useDueTasks = (horizon: DueHorizon) =>
  useQuery({
    queryKey: keys.dueTaskList(horizon),
    queryFn: () => api<GardenTask[]>(`/api/tasks/due${queryString({ horizon })}`),
  });

export const useTask = (id: number) =>
  useQuery({ queryKey: keys.task(id), queryFn: () => api<GardenTask>(`/api/tasks/${id}`) });

export function useSaveTask() {
  const invalidate = useInvalidate(afterTaskWrite);
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: TaskInput }) =>
      id
        ? api<GardenTask>(`/api/tasks/${id}`, { method: 'PUT', body: input })
        : api<GardenTask>('/api/tasks', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useDeleteTask() {
  const invalidate = useInvalidate(afterTaskWrite);
  return useMutation({
    mutationFn: (id: number) => api<void>(`/api/tasks/${id}`, { method: 'DELETE' }),
    onSuccess: () => void invalidate(),
  });
}

/**
 * « Fait » note l'intervention au journal. La tâche quitte aussitôt les listes de tâches dues,
 * sans attendre l'API ; si elle refuse, les listes d'avant sont restaurées. Le rechargement qui
 * suit la replace là où sa nouvelle échéance la met (cette semaine, par exemple).
 */
export function useCompleteTask() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidate(afterJournalWrite);

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input?: CompleteTaskInput }) =>
      api<GardenTask>(`/api/tasks/${id}/done`, { method: 'POST', body: input ?? {} }),

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
