import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { addDays, type DateOnly } from '@/domain/dates';

import { parseDateOnly, today } from './dates';

/**
 * Le jour du téléphone, qui change à minuit et au retour sur l'app : un écran ouvert la veille ne
 * reste pas sur la veille. Une seconde de marge après minuit, pour lire le nouveau jour à coup sûr.
 */
export function useToday(): DateOnly {
  const [day, setDay] = useState(today);

  useEffect(() => {
    const refresh = () => setDay(today());
    const untilMidnight = parseDateOnly(addDays(day, 1)).getTime() - Date.now();
    const timer = setTimeout(refresh, Math.max(untilMidnight, 0) + 1000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [day]);

  return day;
}
