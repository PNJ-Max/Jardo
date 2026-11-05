import { findSpecies, speciesCatalog } from '@/data/species';
import type { ReminderProposal } from '@/domain/reminder-proposals';
import {
  activeWindows,
  fortnights,
  yearCalendar,
  type Climate,
  type FortnightRange,
  type PlantingKind,
  type PlantingWindow,
  type Species,
} from '@/domain/species';
import {
  calendarSummary,
  formatActiveWindow,
  formatFortnight,
  formatRange,
  formatSpacing,
  formatWatering,
  plantingHint,
  proposalStart,
  proposalTask,
  proposalTitle,
  speciesWithArticle,
  suggestionsTitle,
} from '@/lib/species';

const proposal = (overrides: Partial<ReminderProposal>): ReminderProposal => ({
  kind: 'Harvest',
  window: 'harvest',
  recurrence: 'Once',
  intervalDays: null,
  startDate: '2026-11-04',
  ...overrides,
});

describe('rappels proposés', () => {
  it('écrit l’espèce avec son article', () => {
    const named = (id: string) => speciesWithArticle(findSpecies(id) as Species);

    expect(named('tomato')).toBe('la tomate');
    expect(named('garlic')).toBe("l'ail");
    expect(named('apple-tree')).toBe('le pommier');
    expect(named('brussels-sprouts')).toBe('le chou de Bruxelles');
  });

  it.each([
    ['Arroser tous les 3 jours', { kind: 'Watering', window: null, recurrence: 'EveryNDays', intervalDays: 3 }],
    ['Semer sous abri', { kind: 'Sowing', window: 'sowIndoors' }],
    ['Semer en place', { kind: 'Sowing', window: 'sowOutdoors' }],
    ['Planter', { kind: 'Planting', window: 'plant' }],
    ['Récolter', {}],
    ['Récolter chaque année', { recurrence: 'Yearly' }],
    ['Tailler chaque année', { kind: 'Pruning', window: 'prune', recurrence: 'Yearly' }],
  ] as const)('dit « %s »', (title, overrides) => {
    expect(proposalTitle(proposal(overrides))).toBe(title);
  });

  it.each([
    ['2026-11-04', "à partir d'aujourd'hui"],
    ['2026-12-01', 'à partir de début décembre'],
    ['2026-11-16', 'à partir de mi-novembre'],
    ['2027-03-01', 'à partir de début mars 2027'],
    ['2027-07-16', 'à partir de mi-juillet 2027'],
    ['2027-04-01', "à partir de début avril 2027"],
  ])('date %s : « %s »', (startDate, text) => {
    expect(proposalStart(proposal({ startDate }), '2026-11-04')).toBe(text);
  });

  it('crée la tâche sur la plante, et un semis dit lequel dans son titre', () => {
    const target = { spaceId: 's', zoneId: 'z', itemId: 'p' };

    expect(proposalTask(proposal({ recurrence: 'Yearly', startDate: '2027-08-16' }), target)).toEqual({
      kind: 'Harvest',
      title: null,
      recurrence: 'Yearly',
      intervalDays: null,
      startDate: '2027-08-16',
      ...target,
    });
    expect(proposalTask(proposal({ kind: 'Sowing', window: 'sowOutdoors' }), target).title).toBe('Semer en place');
  });
});

const hint = (window: Partial<PlantingWindow>) =>
  plantingHint({ kind: 'plant', range: { from: 'Oct2', to: 'Nov2' }, opensIn: 0, ...window });

describe('ce qui vient pour une espèce', () => {
  it("une fenêtre ouverte dit jusqu'à quand", () => {
    expect(hint({})).toBe("À planter jusqu'à fin novembre");
    expect(hint({ kind: 'sowOutdoors', range: { from: 'Oct1', to: 'Nov1' } })).toBe("À semer jusqu'à mi-novembre");
    expect(hint({ kind: 'sowIndoors' })).toBe("À semer sous abri jusqu'à fin novembre");
  });

  it("une fenêtre qui s'ouvre à la prochaine quinzaine dit à partir de quand", () => {
    expect(hint({ range: { from: 'Nov2', to: 'Dec1' }, opensIn: 1 })).toBe('À planter à partir de mi-novembre');
    expect(hint({ range: { from: 'Apr1', to: 'May2' }, opensIn: 1 })).toBe("À planter à partir d'avril");
  });

  it('une fenêtre plus lointaine dit sa période', () => {
    const later = (kind: PlantingKind, from: FortnightRange['from'], to: FortnightRange['to']) =>
      hint({ kind, range: { from, to }, opensIn: 6 });

    expect(later('sowIndoors', 'Feb1', 'Mar2')).toBe('Semis sous abri de février à mars');
    expect(later('sowOutdoors', 'Apr1', 'May2')).toBe("Semis en place d'avril à mai");
    expect(later('plant', 'Apr2', 'May1')).toBe('Plantation de mi-avril à mi-mai');
    expect(later('plant', 'Aug1', 'Oct2')).toBe("Plantation d'août à octobre");
    expect(later('plant', 'Mar1', 'Mar2')).toBe('Plantation en mars');
    expect(later('plant', 'Mar1', 'Mar1')).toBe('Plantation début mars');
    expect(later('plant', 'Mar2', 'Mar2')).toBe('Plantation fin mars');
  });
});

describe('le titre des suggestions', () => {
  it("nomme le type d'espace", () => {
    expect(suggestionsTitle('VegetableGarden')).toBe('Pour le potager');
    expect(suggestionsTitle('Greenhouse')).toBe('Pour la serre');
    expect(suggestionsTitle('Orchard')).toBe('Pour le verger');
    expect(suggestionsTitle('SmallFruit')).toBe('Pour les petits fruits');
  });
});

const known = (id: string) => findSpecies(id) as Species;
const summaryOf = (species: Species, climate: Climate = 'Temperate') =>
  calendarSummary(yearCalendar(species, '2026-11-04', climate).rows);

describe('textes du catalogue', () => {
  it('nomme les quinzaines comme un calendrier de jardin', () => {
    expect(formatFortnight('Jan1')).toBe('début janvier');
    expect(formatFortnight('Aug2')).toBe('fin août');
    expect(new Set(fortnights.map(formatFortnight)).size).toBe(24);
  });

  it("dit une plage, ou sa quinzaine quand elle n'en couvre qu'une", () => {
    expect(formatRange({ from: 'Mar1', to: 'Apr1' })).toBe('de début mars à mi-avril');
    expect(formatRange({ from: 'Mar2', to: 'Mar2' })).toBe('fin mars');
  });

  it("résume le calendrier pour le lecteur d'écran", () => {
    expect(summaryOf(known('tomato'))).toBe(
      'Semis sous abri : de début mars à mi-avril. Plantation : de mi-mai à fin juin. Récolte : de mi-juillet à mi-octobre.',
    );
  });

  it('résume en une seule plage celle qui chevauche le Nouvel An', () => {
    expect(summaryOf(known('leek'))).toContain('Récolte : de début septembre à mi-mars.');
  });

  it('suit le climat', () => {
    expect(summaryOf(known('tomato'), 'Mountain')).toContain('Plantation : de mi-juin à fin juillet.');
  });

  it('enchaîne les plages multiples', () => {
    const twice: Species = {
      ...known('tomato'),
      harvest: [
        { from: 'Jun1', to: 'Jun2' },
        { from: 'Sep1', to: 'Sep1' },
      ],
    };
    expect(summaryOf(twice)).toContain('Récolte : de début juin à fin juin, puis début septembre.');
  });

  it("dit ce qu'on peut faire et jusqu'à quand", () => {
    const [window] = activeWindows(known('tomato'), '2026-06-01', 'Temperate');
    expect(formatActiveWindow(window)).toBe("Planter jusqu'à fin juin");
  });

  it('nomme une quinzaine selon sa place : le 15 du mois est une mi-mois, au début comme à la fin', () => {
    expect(formatRange({ from: 'Mar2', to: 'Apr1' })).toBe('de mi-mars à mi-avril');
    expect(formatRange({ from: 'Mar1', to: 'Apr2' })).toBe('de début mars à fin avril');
    expect(formatActiveWindow({ kind: 'plant', range: { from: 'Oct2', to: 'Dec1' } })).toBe("Planter jusqu'à mi-décembre");
    expect(plantingHint({ kind: 'plant', range: { from: 'Oct2', to: 'Dec1' }, opensIn: 0 })).toBe("À planter jusqu'à mi-décembre");
  });

  it('donne les espacements en centimètres, puis en mètres', () => {
    expect(formatSpacing(known('tomato'))).toBe('50 cm entre plants, 80 cm entre rangs');
    expect(formatSpacing(known('apple-tree'))).toBe('4 m entre arbres');
    expect(formatSpacing({ ...known('raspberry'), spacingCm: { plants: 50, rows: 150 } })).toBe(
      '50 cm entre plants, 1,5 m entre rangs',
    );
  });

  it("dit le rythme d'arrosage et rappelle les premières semaines", () => {
    expect(formatWatering(3)).toBe('Tous les 3 jours par temps sec, plus souvent les premières semaines');
  });

  it.each(speciesCatalog.map((species) => [species.id, species] as const))('%s a un calendrier résumé', (_, species) => {
    expect(summaryOf(species)).toMatch(/^[A-ZÉ].* : .*\.$/);
  });
});
