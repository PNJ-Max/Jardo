import { router } from 'expo-router';

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
