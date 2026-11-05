import { calculateDueState } from '@/domain/due-date';
import { proposeReminders, type ProposalInput } from '@/domain/reminder-proposals';
import { nextFortnightStart, type Species } from '@/domain/species';
import type { JournalEntryKind } from '@/domain/types';

const tomato: Species = {
  id: 'tomato',
  name: 'Tomate',
  article: 'la',
  aliases: [],
  scientificName: 'Solanum lycopersicum',
  category: 'Vegetable',
  sowIndoors: [{ from: 'Mar1', to: 'Apr1' }],
  plant: [{ from: 'May2', to: 'Jun2' }],
  harvest: [{ from: 'Jul2', to: 'Oct1' }],
  spacingCm: { plants: 50 },
  exposure: 'Sun',
  wateringEveryDays: 3,
  quantityUnit: 'Plants',
  harvestUnit: 'Kilograms',
  tips: [],
};

const appleTree: Species = {
  ...tomato,
  id: 'apple-tree',
  category: 'FruitTree',
  sowIndoors: undefined,
  plant: [{ from: 'Nov1', to: 'Mar1' }],
  harvest: [{ from: 'Aug2', to: 'Oct2' }],
  prune: [{ from: 'Dec1', to: 'Feb2' }],
  wateringEveryDays: undefined,
};

const plant = { id: 'p', zoneId: 'z', sownDate: null, plantedDate: null };

const propose = (overrides: Partial<ProposalInput> = {}) =>
  proposeReminders({ species: tomato, plant, tasks: [], on: '2026-11-04', climate: 'Temperate', ...overrides });

const find = (kind: JournalEntryKind, overrides: Partial<ProposalInput> = {}) =>
  propose(overrides).find((proposal) => proposal.kind === kind);

const onPlant = (kind: JournalEntryKind, isCompleted = false) => ({ kind, zoneId: 'z', itemId: 'p', isCompleted });
const onZone = (kind: JournalEntryKind) => ({ kind, zoneId: 'z', itemId: null, isCompleted: false });
const onSpace = (kind: JournalEntryKind) => ({ kind, zoneId: null, itemId: null, isCompleted: false });

describe('nextFortnightStart', () => {
  it('donne le 1er ou le 16 du mois, cette année tant que le jour n’est pas passé', () => {
    expect(nextFortnightStart('Mar1', '2026-02-20')).toBe('2026-03-01');
    expect(nextFortnightStart('Jul2', '2026-02-20')).toBe('2026-07-16');
    expect(nextFortnightStart('Nov1', '2026-11-01')).toBe('2026-11-01');
  });

  it('passe à l’an prochain une fois le jour passé', () => {
    expect(nextFortnightStart('Nov1', '2026-11-02')).toBe('2027-11-01');
    expect(nextFortnightStart('Mar1', '2026-11-04')).toBe('2027-03-01');
  });
});

describe('proposer : arroser', () => {
  it('tous les N jours du catalogue, à partir d’aujourd’hui', () => {
    expect(find('Watering')).toEqual({
      kind: 'Watering',
      window: null,
      recurrence: 'EveryNDays',
      intervalDays: 3,
      startDate: '2026-11-04',
    });
  });

  it('rien pour une espèce sans rythme : un fruitier installé', () => {
    expect(find('Watering', { species: appleTree })).toBeUndefined();
  });

  it.each([
    ['la plante', onPlant('Watering')],
    ['sa zone', onZone('Watering')],
    ['son espace', onSpace('Watering')],
  ])('rien quand %s est déjà arrosé', (_, task) => {
    expect(find('Watering', { tasks: [task] })).toBeUndefined();
  });

  it('propose quand même si seuls une autre zone ou un autre élément sont arrosés', () => {
    const tasks = [
      { kind: 'Watering' as const, zoneId: 'autre', itemId: null, isCompleted: false },
      { kind: 'Watering' as const, zoneId: 'z', itemId: 'voisine', isCompleted: false },
    ];

    expect(find('Watering', { tasks })).toBeDefined();
  });

  it('propose quand même pour une plante pas encore créée, la parcelle voisine arrosé', () => {
    const tasks = [{ kind: 'Watering' as const, zoneId: 'autre', itemId: null, isCompleted: false }];

    expect(find('Watering', { tasks, plant: { ...plant, id: null } })).toBeDefined();
  });

  it('un arrosage ponctuel déjà fait ne couvre pas la plante', () => {
    expect(find('Watering', { tasks: [onPlant('Watering', true)] })).toBeDefined();
  });

  it('ne tient compte ni des autres interventions ni du climat', () => {
    const watering = find('Watering', { tasks: [onZone('Fertilizing')], climate: 'Mountain' });

    expect(watering?.startDate).toBe('2026-11-04');
  });
});

describe('proposer : semer ou planter', () => {
  it('sans date, une seule fois, au début de la prochaine fenêtre', () => {
    expect(find('Sowing')).toEqual({
      kind: 'Sowing',
      window: 'sowIndoors',
      recurrence: 'Once',
      intervalDays: null,
      startDate: '2027-03-01',
    });
    expect(find('Planting')).toBeUndefined();
  });

  it('dans une fenêtre ouverte, à partir d’aujourd’hui : la tâche ne naît pas en retard', () => {
    expect(find('Planting', { on: '2026-05-20' })).toMatchObject({
      window: 'plant',
      recurrence: 'Once',
      startDate: '2026-05-20',
    });
  });

  it('suit le climat', () => {
    expect(find('Sowing', { climate: 'Mountain' })?.startDate).toBe('2027-04-01');
    expect(find('Sowing', { climate: 'Mediterranean' })?.startDate).toBe('2027-02-01');
  });

  it('semée, propose de la planter, plus de la semer', () => {
    const sown = { plant: { ...plant, sownDate: '2026-03-10' } };

    expect(find('Sowing', sown)).toBeUndefined();
    expect(find('Planting', sown)?.startDate).toBe('2027-05-16');
  });

  it('une tâche de semis, prévue ou faite, compte comme un semis', () => {
    expect(find('Sowing', { tasks: [onPlant('Sowing')] })).toBeUndefined();
    expect(find('Planting', { tasks: [onPlant('Sowing')] })).toBeDefined();
    expect(find('Sowing', { tasks: [onPlant('Sowing', true)] })).toBeUndefined();
  });

  it('plantée, ne propose plus ni semis ni plantation', () => {
    const planted = { plant: { ...plant, plantedDate: '2026-05-20' } };

    expect(find('Sowing', planted)).toBeUndefined();
    expect(find('Planting', planted)).toBeUndefined();
  });

  it('une plantation prévue ou faite suffit aussi', () => {
    expect(find('Sowing', { tasks: [onPlant('Planting')] })).toBeUndefined();
    expect(find('Planting', { tasks: [onPlant('Planting', true)] })).toBeUndefined();
  });

  it('semée sans fenêtre de plantation : rien', () => {
    const carrot: Species = { ...tomato, sowIndoors: undefined, plant: undefined, sowOutdoors: [{ from: 'Mar1', to: 'Jul1' }] };

    expect(find('Sowing', { species: carrot })?.window).toBe('sowOutdoors');
    expect(find('Sowing', { species: carrot, plant: { ...plant, sownDate: '2026-03-10' } })).toBeUndefined();
    expect(find('Planting', { species: carrot, plant: { ...plant, sownDate: '2026-03-10' } })).toBeUndefined();
  });
});

describe('proposer : récolter', () => {
  it('culture de l’année : une seule fois, au début de la prochaine fenêtre', () => {
    expect(find('Harvest')).toEqual({
      kind: 'Harvest',
      window: 'harvest',
      recurrence: 'Once',
      intervalDays: null,
      startDate: '2027-07-16',
    });
  });

  it('dans la fenêtre : à partir d’aujourd’hui', () => {
    expect(find('Harvest', { on: '2026-08-10' })?.startDate).toBe('2026-08-10');
  });

  it('prend la plus proche de plusieurs fenêtres', () => {
    const radish: Species = {
      ...tomato,
      harvest: [
        { from: 'Apr2', to: 'Jun1' },
        { from: 'Sep1', to: 'Oct2' },
      ],
    };

    expect(find('Harvest', { species: radish, on: '2026-07-01' })?.startDate).toBe('2026-09-01');
    expect(find('Harvest', { species: radish, on: '2026-11-01' })?.startDate).toBe('2027-04-16');
  });

  it('rien quand une récolte est prévue, ou que la première a clos la tâche', () => {
    expect(find('Harvest', { tasks: [onPlant('Harvest')] })).toBeUndefined();
    expect(find('Harvest', { tasks: [onPlant('Harvest', true)] })).toBeUndefined();
  });

  it('une tâche ponctuelle faite sur la zone ne ferme rien pour la plante', () => {
    const tasks = [{ kind: 'Harvest' as const, zoneId: 'z', itemId: null, isCompleted: true }];

    expect(find('Harvest', { tasks })).toBeDefined();
  });

  it('rien sans fenêtre de récolte', () => {
    expect(find('Harvest', { species: { ...tomato, harvest: undefined } })).toBeUndefined();
  });
});

describe('proposer : récolter chaque année', () => {
  it.each<[string, Partial<Species>]>([
    ['une vivace', { category: 'Vegetable', perennial: true }],
    ['un fruitier', { category: 'FruitTree' }],
    ['un petit fruit', { category: 'SmallFruit' }],
  ])('%s : chaque année, au début de la prochaine fenêtre', (_, traits) => {
    expect(find('Harvest', { species: { ...tomato, ...traits } })).toEqual({
      kind: 'Harvest',
      window: 'harvest',
      recurrence: 'Yearly',
      intervalDays: null,
      startDate: '2027-07-16',
    });
  });

  it('dans une fenêtre ouverte, la prochaine : le jour anniversaire reste au début de la fenêtre', () => {
    expect(find('Harvest', { species: appleTree, on: '2026-09-10' })?.startDate).toBe('2027-08-16');
  });

  it('une tâche annuelle ainsi créée ne naît pas en retard', () => {
    const { startDate, recurrence } = find('Harvest', { species: appleTree, on: '2026-09-10' })!;

    expect(
      calculateDueState({
        recurrence,
        startDate,
        intervalDays: null,
        lastDoneOn: null,
        openedOn: '2026-09-10',
        postponedUntil: null,
        today: '2026-09-10',
      }).status,
    ).toBe('Ok');
  });

  it('rien quand une récolte est prévue, mais une récolte ponctuelle faite ne suffit pas', () => {
    expect(find('Harvest', { species: appleTree, tasks: [onPlant('Harvest')] })).toBeUndefined();
    expect(find('Harvest', { species: appleTree, tasks: [onPlant('Harvest', true)] })).toBeDefined();
  });
});

describe('proposer : tailler', () => {
  it('fruitier : chaque année, au début de la fenêtre', () => {
    expect(find('Pruning', { species: appleTree })).toEqual({
      kind: 'Pruning',
      window: 'prune',
      recurrence: 'Yearly',
      intervalDays: null,
      startDate: '2026-12-01',
    });
  });

  it('petit fruit aussi, à la plus proche de ses fenêtres', () => {
    const raspberry: Species = {
      ...appleTree,
      category: 'SmallFruit',
      prune: [
        { from: 'Aug1', to: 'Sep1' },
        { from: 'Nov1', to: 'Feb2' },
      ],
    };

    expect(find('Pruning', { species: raspberry, on: '2026-07-01' })?.startDate).toBe('2026-08-01');
  });

  it('ni légume ni aromatique, même avec une fenêtre', () => {
    const herb: Species = { ...tomato, category: 'Herb', prune: [{ from: 'Mar1', to: 'Apr1' }] };

    expect(find('Pruning', { species: herb })).toBeUndefined();
  });

  it('rien sans fenêtre de taille', () => {
    expect(find('Pruning', { species: { ...appleTree, prune: undefined } })).toBeUndefined();
  });

  it('rien quand une taille est déjà prévue', () => {
    expect(find('Pruning', { species: appleTree, tasks: [onPlant('Pruning')] })).toBeUndefined();
    expect(find('Pruning', { species: appleTree, tasks: [onSpace('Pruning')] })).toBeUndefined();
  });
});

describe('proposer : dans l’ordre du tableau', () => {
  it('arroser, semer, récolter', () => {
    expect(propose().map(({ kind }) => kind)).toEqual(['Watering', 'Sowing', 'Harvest']);
  });

  it('planter, récolter, tailler', () => {
    expect(propose({ species: appleTree }).map(({ kind }) => kind)).toEqual(['Planting', 'Harvest', 'Pruning']);
  });
});
