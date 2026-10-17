import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from './client';
import type {
  Observation,
  ObservationInput,
  Plant,
  PlantInput,
  WateringInput,
  WateringLog,
  Zone,
  ZoneInput,
  ZoneWateringResult,
} from './types';

// Clés de cache. Elles sont hiérarchiques : invalider ['plants'] invalide aussi
// ['plants', 3] et ['plants', { zoneId: 2 }].
export const keys = {
  needed: ['watering', 'needed'] as const,
  zones: ['zones'] as const,
  zone: (id: number) => ['zones', id] as const,
  plants: ['plants'] as const,
  plantList: (filter: { zoneId?: number; includeArchived?: boolean }) => ['plants', filter] as const,
  plant: (id: number) => ['plants', id] as const,
  waterings: (plantId: number) => ['waterings', plantId] as const,
  observations: (plantId: number) => ['observations', plantId] as const,
};

/**
 * Le voyant d'arrosage se répercute partout : liste « à arroser », compteurs des zones,
 * fiches plantes. Après toute écriture, on recharge donc ces trois familles plutôt que
 * d'essayer de deviner lesquelles sont concernées. À cette taille, la simplicité gagne.
 */
function useInvalidateGarden() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['watering'] }),
      queryClient.invalidateQueries({ queryKey: keys.zones }),
      queryClient.invalidateQueries({ queryKey: keys.plants }),
      queryClient.invalidateQueries({ queryKey: ['waterings'] }),
      queryClient.invalidateQueries({ queryKey: ['observations'] }),
    ]);
}

// --- Lectures ---------------------------------------------------------------

export const usePlantsNeedingWater = () =>
  useQuery({ queryKey: keys.needed, queryFn: () => api<Plant[]>('/api/watering/needed') });

export const useZones = () => useQuery({ queryKey: keys.zones, queryFn: () => api<Zone[]>('/api/zones') });

export const useZone = (id: number) =>
  useQuery({ queryKey: keys.zone(id), queryFn: () => api<Zone>(`/api/zones/${id}`) });

export function usePlants(filter: { zoneId?: number; includeArchived?: boolean } = {}) {
  // Query string construite à la main : URLSearchParams est incomplet sous React Native.
  const params: string[] = [];
  if (filter.zoneId) params.push(`zoneId=${filter.zoneId}`);
  if (filter.includeArchived) params.push('includeArchived=true');
  const query = params.length ? `?${params.join('&')}` : '';

  return useQuery({ queryKey: keys.plantList(filter), queryFn: () => api<Plant[]>(`/api/plants${query}`) });
}

export const usePlant = (id: number) =>
  useQuery({ queryKey: keys.plant(id), queryFn: () => api<Plant>(`/api/plants/${id}`) });

export const useWaterings = (plantId: number) =>
  useQuery({
    queryKey: keys.waterings(plantId),
    queryFn: () => api<WateringLog[]>(`/api/plants/${plantId}/waterings`),
  });

export const useObservations = (plantId: number) =>
  useQuery({
    queryKey: keys.observations(plantId),
    queryFn: () => api<Observation[]>(`/api/plants/${plantId}/observations`),
  });

// --- Arrosage ---------------------------------------------------------------

/**
 * Arroser une plante, avec mise à jour optimiste : la plante quitte la liste
 * « à arroser » immédiatement, sans attendre l'API. Si l'API refuse, on restaure
 * la liste d'avant. C'est le geste le plus fréquent de l'app, il doit être instantané.
 */
export function useWaterPlant() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateGarden();

  return useMutation({
    mutationFn: ({ plantId, input }: { plantId: number; input?: WateringInput }) =>
      api<WateringLog>(`/api/plants/${plantId}/waterings`, { method: 'POST', body: input ?? {} }),

    onMutate: async ({ plantId }) => {
      await queryClient.cancelQueries({ queryKey: keys.needed });
      const previous = queryClient.getQueryData<Plant[]>(keys.needed);
      queryClient.setQueryData<Plant[]>(keys.needed, (old) => old?.filter((p) => p.id !== plantId));
      return { previous };
    },
    onError: (_error, _vars, context) => {
      queryClient.setQueryData(keys.needed, context?.previous);
    },
    onSettled: invalidate,
  });
}

export function useWaterZone() {
  const invalidate = useInvalidateGarden();
  return useMutation({
    mutationFn: (zoneId: number) =>
      api<ZoneWateringResult>(`/api/zones/${zoneId}/waterings`, { method: 'POST', body: {} }),
    onSuccess: invalidate,
  });
}

// --- Zones ------------------------------------------------------------------

export function useSaveZone() {
  const invalidate = useInvalidateGarden();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: ZoneInput }) =>
      id
        ? api<Zone>(`/api/zones/${id}`, { method: 'PUT', body: input })
        : api<Zone>('/api/zones', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useDeleteZone() {
  const invalidate = useInvalidateGarden();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/api/zones/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

// --- Plantes ----------------------------------------------------------------

export function useSavePlant() {
  const invalidate = useInvalidateGarden();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: PlantInput }) =>
      id
        ? api<Plant>(`/api/plants/${id}`, { method: 'PUT', body: input })
        : api<Plant>('/api/plants', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useSetPlantArchived() {
  const invalidate = useInvalidateGarden();
  return useMutation({
    mutationFn: ({ id, archived }: { id: number; archived: boolean }) =>
      api<Plant>(`/api/plants/${id}/${archived ? 'archive' : 'unarchive'}`, { method: 'POST' }),
    onSuccess: invalidate,
  });
}

export function useDeletePlant() {
  const invalidate = useInvalidateGarden();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/api/plants/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

// --- Observations -----------------------------------------------------------

export function useAddObservation() {
  const invalidate = useInvalidateGarden();
  return useMutation({
    mutationFn: ({ plantId, input }: { plantId: number; input: ObservationInput }) =>
      api<Observation>(`/api/plants/${plantId}/observations`, { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useDeleteObservation() {
  const invalidate = useInvalidateGarden();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/api/observations/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}
