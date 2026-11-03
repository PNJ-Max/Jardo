import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { systemClock, type Clock } from '@/data/clock';
import { getNotificationPermission, replaceReminders, requestNotificationPermission } from '@/lib/notifications';
import { defaultReminderSettings, planReminders, type ReminderSettings } from '@/lib/reminders';

import { keys, useDueTasks } from './queries';

// Les rappels sont une préférence de l'appareil, comme le thème et la ville de la météo : rangés
// dans AsyncStorage, hors de la base et de la sauvegarde du jardin.

const storageKey = 'jardo.reminders';

export const reminderKeys = {
  settings: ['reminders', 'settings'] as const,
  permission: ['reminders', 'permission'] as const,
};

async function readSettings(): Promise<ReminderSettings> {
  const stored = await AsyncStorage.getItem(storageKey).catch(() => null);
  try {
    return stored === null ? defaultReminderSettings : { ...defaultReminderSettings, ...JSON.parse(stored) };
  } catch {
    return defaultReminderSettings;
  }
}

const saveSettings = (settings: ReminderSettings) => AsyncStorage.setItem(storageKey, JSON.stringify(settings));

export function useReminderSettings() {
  return useQuery({ queryKey: reminderKeys.settings, queryFn: readSettings, staleTime: Infinity });
}

export function useSaveReminderSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveSettings,
    onSuccess: (_, settings) => queryClient.setQueryData(reminderKeys.settings, settings),
  });
}

/** La permission des notifications, relue au retour sur l'app : on a pu la changer dans les réglages du téléphone. */
export function useNotificationPermission() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') queryClient.invalidateQueries({ queryKey: reminderKeys.permission });
    });
    return () => subscription.remove();
  }, [queryClient]);

  return useQuery({ queryKey: reminderKeys.permission, queryFn: getNotificationPermission });
}

/** Demande la permission au moment où l'on active les rappels ; ne les active que si elle est donnée. */
export function useEnableReminders() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: ReminderSettings) => {
      const permission = await requestNotificationPermission();
      if (permission === 'granted') {
        const enabled = { ...settings, enabled: true };
        await saveSettings(enabled);
        queryClient.setQueryData(reminderKeys.settings, enabled);
      }
      queryClient.setQueryData(reminderKeys.permission, permission);
      return permission;
    },
  });
}

/**
 * Tient les rappels programmés à jour. Toute écriture qui change les tâches dues invalide
 * ['tasks'] : la liste relue ici reprogramme d'elle-même. Le retour sur l'app reprogramme aussi,
 * le jour a pu changer.
 */
export function useReminderScheduling(clock: Clock = systemClock) {
  const settings = useReminderSettings().data;
  const due = useDueTasks('Month', settings?.enabled === true);
  const queryClient = useQueryClient();
  const [returns, setReturns] = useState(0);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      setReturns((count) => count + 1);
      queryClient.invalidateQueries({ queryKey: keys.dueTasks });
    });
    return () => subscription.remove();
  }, [queryClient]);

  useEffect(() => {
    if (!settings) return;
    if (!settings.enabled) void replaceReminders([]);
    else if (due.data) void replaceReminders(planReminders(due.data, clock(), settings));
  }, [settings, due.data, returns, clock]);
}
