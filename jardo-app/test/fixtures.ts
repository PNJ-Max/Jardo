import type { GardenTask, Space } from '@/api/types';

export const space = (overrides: Partial<Space> = {}): Space => ({
  id: 1,
  name: 'Potager',
  description: null,
  kind: 'VegetableGarden',
  isArchived: false,
  createdAt: '2026-01-01T00:00:00Z',
  zoneCount: 0,
  itemCount: 0,
  dueTaskCount: 0,
  ...overrides,
});

export const task = (overrides: Partial<GardenTask> = {}): GardenTask => ({
  id: 1,
  kind: 'Watering',
  title: null,
  recurrence: 'EveryNDays',
  intervalDays: 3,
  startDate: '2026-01-01',
  createdAt: '2026-01-01T00:00:00Z',
  spaceId: 1,
  spaceName: 'Potager',
  zoneId: null,
  zoneName: null,
  itemId: null,
  itemName: null,
  itemKind: null,
  lastDoneOn: null,
  nextDueDate: '2026-10-20',
  status: 'DueSoon',
  daysOverdue: 0,
  isCompleted: false,
  ...overrides,
});
