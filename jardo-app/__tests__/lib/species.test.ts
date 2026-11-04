import { findSpecies, speciesCatalog } from '@/data/species';
import { activeWindows, fortnights, yearCalendar, type Climate, type Species } from '@/domain/species';
import { calendarSummary, formatActiveWindow, formatFortnight, formatRange, formatSpacing, formatWatering } from '@/lib/species';

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
    expect(formatRange({ from: 'Mar1', to: 'Apr1' })).toBe('de début mars à début avril');
    expect(formatRange({ from: 'Mar2', to: 'Mar2' })).toBe('fin mars');
  });

  it("résume le calendrier pour le lecteur d'écran", () => {
    expect(summaryOf(known('tomato'))).toBe(
      'Semis sous abri : de début mars à début avril. Plantation : de fin mai à fin juin. Récolte : de fin juillet à début octobre.',
    );
  });

  it('résume en une seule plage celle qui chevauche le Nouvel An', () => {
    expect(summaryOf(known('leek'))).toContain('Récolte : de début septembre à début mars.');
  });

  it('suit le climat', () => {
    expect(summaryOf(known('tomato'), 'Mountain')).toContain('Plantation : de fin juin à fin juillet.');
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
