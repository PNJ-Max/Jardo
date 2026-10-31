import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { systemClock } from '@/data/clock';
import { loadForecast, readPlace, refreshAfterMs, savePlace, searchPlaces } from '@/lib/forecast';
import type { Forecast, WeatherPlace } from '@/lib/weather';

// La météo n'a pas de service dans src/data : elle ne touche pas la base (voir lib/forecast.ts).
export const weatherKeys = {
  place: ['weather', 'place'] as const,
  forecast: ['weather', 'forecast'] as const,
};

export function useWeatherPlace() {
  return useQuery({ queryKey: weatherKeys.place, queryFn: readPlace, staleTime: Infinity });
}

export function useSaveWeatherPlace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: savePlace,
    onSuccess: async (_, place) => {
      queryClient.setQueryData(weatherKeys.place, place);
      await queryClient.invalidateQueries({ queryKey: weatherKeys.forecast });
    },
  });
}

export function usePlaceSearch() {
  return useMutation({ mutationFn: searchPlaces });
}

/**
 * La prévision de la ville retenue, ou null : pas de ville, ou aucune prévision gardée et pas de
 * réseau. Relue au retour sur l'app ; `loadForecast` n'appelle le réseau que si la gardée a vieilli.
 */
export function useForecast(): Forecast | null {
  const place = useWeatherPlace().data ?? null;
  const queryClient = useQueryClient();
  const forecast = useQuery({
    queryKey: [...weatherKeys.forecast, place?.latitude, place?.longitude],
    queryFn: () => loadForecast(place as WeatherPlace, systemClock),
    enabled: place !== null,
    staleTime: refreshAfterMs,
  });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') queryClient.invalidateQueries({ queryKey: weatherKeys.forecast });
    });
    return () => subscription.remove();
  }, [queryClient]);

  return place ? (forecast.data ?? null) : null;
}
