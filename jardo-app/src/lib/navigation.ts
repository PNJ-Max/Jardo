import { router, type Href } from 'expo-router';

import { useSpaces } from '@/api/queries';

import { targetHref } from './garden';

/**
 * Retour à l'écran précédent. Sur le web, on peut arriver directement sur un
 * formulaire par son URL : il n'y a alors pas d'historique, et router.back()
 * ne ferait rien. On retombe dans ce cas sur l'accueil.
 */
export function goBack() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/');
  }
}

type Target = { spaceId: number; zoneId: number | null; itemId: number | null };

/** L'écran qui montre la cible d'une tâche ou d'une intervention (voir targetHref). */
export function useTargetHref(): (target: Target) => Href {
  const spaces = useSpaces();
  return (target) => targetHref(target, spaces.data?.find((space) => space.id === target.spaceId)?.kind);
}
