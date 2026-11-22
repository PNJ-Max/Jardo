import { AppState, type NativeEventSubscription } from 'react-native';

const pending = new Map<ReturnType<typeof setTimeout>, () => void>();
let subscription: NativeEventSubscription | null = null;

function forget(timer: ReturnType<typeof setTimeout>) {
  pending.delete(timer);
  if (pending.size > 0) return;
  subscription?.remove();
  subscription = null;
}

function writeNow() {
  pending.forEach((write, timer) => {
    clearTimeout(timer);
    forget(timer);
    write();
  });
}

/**
 * Une écriture retardée le temps d'une animation. Android suspend les minuteurs d'une app qui
 * quitte le premier plan et peut la fermer avant leur échéance : les écritures en attente partent
 * alors tout de suite.
 */
export function writeAfter(ms: number, write: () => void) {
  const timer = setTimeout(() => {
    forget(timer);
    write();
  }, ms);
  pending.set(timer, write);
  subscription ??= AppState.addEventListener('change', (state) => {
    if (state !== 'active') writeNow();
  });
}
