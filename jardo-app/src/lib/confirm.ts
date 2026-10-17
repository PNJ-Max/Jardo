import { Alert, Platform } from 'react-native';

/**
 * Demande de confirmation avant une action destructrice.
 *
 * Alert.alert ne fait rien dans un navigateur : sur le web on passe donc par
 * window.confirm, sur téléphone par la boîte de dialogue native.
 */
export function confirm(title: string, message: string, confirmLabel = 'Supprimer'): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

/** Message d'erreur simple, même contrainte web / natif que ci-dessus. */
export function notify(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}
