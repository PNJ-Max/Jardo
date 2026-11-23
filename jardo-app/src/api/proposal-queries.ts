import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Id, JournalEntryKind } from './types';

// Les rappels proposés qu'on a écartés sur la fiche d'une plante. Rangés dans AsyncStorage, comme
// le thème ou l'heure du rappel : pas de migration de la base, et rien dans la sauvegarde. Perdu
// avec le téléphone, un choix fait seulement revenir la proposition ; aucune tâche n'en dépend.

const storageKey = 'jardo.dismissedProposals';
const queryKey = ['proposals', 'dismissed'] as const;

/** Par plante, les types d'intervention dont la proposition est écartée. */
export type DismissedProposals = Partial<Record<Id, JournalEntryKind[]>>;

async function readDismissed(): Promise<DismissedProposals> {
  const stored = await AsyncStorage.getItem(storageKey).catch(() => null);
  try {
    const parsed: unknown = stored === null ? {} : JSON.parse(stored);
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as DismissedProposals) : {};
  } catch {
    return {};
  }
}

export function useDismissedProposals() {
  return useQuery({ queryKey, queryFn: readDismissed, staleTime: Infinity });
}

/** Écarte une proposition sur une plante, ou la remet (« Annuler »). */
export function useSetProposalDismissed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ plantId, kind, dismissed }: { plantId: Id; kind: JournalEntryKind; dismissed: boolean }) => {
      const current = await readDismissed();
      const others = (current[plantId] ?? []).filter((other) => other !== kind);
      const kinds = dismissed ? [...others, kind] : others;
      const next = { ...current, [plantId]: kinds.length > 0 ? kinds : undefined };
      await AsyncStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    },
    onSuccess: (next) => queryClient.setQueryData(queryKey, next),
  });
}
