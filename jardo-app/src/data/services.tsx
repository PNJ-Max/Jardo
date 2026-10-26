import { createContext, useContext, type ReactNode } from 'react';

import { createBackupService } from './backup';
import { systemClock, type Clock } from './clock';
import type { Db } from './db';
import { createGardenService } from './garden';
import { createGardenMapService } from './garden-map';
import { createJournalService } from './journal';
import { createPlantService } from './plants';
import { createSpaceService } from './spaces';
import { createTaskService } from './tasks';
import { createWoodPileService } from './wood-piles';
import { createZoneService } from './zones';

/** Tous les services, sur une même base : une seule instance par connexion, pour que la file des transactions protège. */
export function createServices(db: Db, clock: Clock = systemClock) {
  return {
    garden: createGardenService(db),
    gardenMap: createGardenMapService(db),
    spaces: createSpaceService(db, clock),
    zones: createZoneService(db, clock),
    plants: createPlantService(db, clock),
    woodPiles: createWoodPileService(db, clock),
    journal: createJournalService(db, clock),
    tasks: createTaskService(db, clock),
    backup: createBackupService(db, clock),
  };
}

export type Services = ReturnType<typeof createServices>;

const ServicesContext = createContext<Services | null>(null);

export function ServicesProvider({ services, children }: { services: Services; children: ReactNode }) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices(): Services {
  const services = useContext(ServicesContext);
  if (!services) throw new Error('useServices doit être appelé sous un ServicesProvider.');
  return services;
}
