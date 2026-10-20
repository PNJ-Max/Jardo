import { useState } from 'react';

/**
 * État du « tirer pour rafraîchir ». `isRefetching` de TanStack Query ne convient pas : il
 * passe aussi à vrai lors des rechargements en arrière-plan (après un « Fait », par exemple),
 * et la roue de chargement apparaîtrait sans que l'utilisateur ait rien demandé.
 */
export function usePullToRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  return { refreshing, onRefresh };
}
