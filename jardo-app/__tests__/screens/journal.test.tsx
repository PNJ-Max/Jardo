import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import JournalScreen from '@/app/(tabs)/journal';
import { today } from '@/lib/dates';

import { createTestServices, pictogramsOnScreen, renderScreen } from '../../test/render';

async function gardenWithTwoEntries() {
  const services = await createTestServices();
  const potager = await services.spaces.create({ name: 'Potager', kind: 'VegetableGarden' });
  await services.journal.create({ date: today(), kind: 'Harvest', note: 'Premières tomates', spaceId: potager.id });
  await services.journal.create({ date: today(), kind: 'Observation', note: 'Pucerons', spaceId: potager.id });
  return services;
}

describe('écran Journal', () => {
  it("illustre chaque filtre d'intervention et chaque entrée de son pictogramme", async () => {
    await renderScreen(<JournalScreen />, await gardenWithTwoEntries());

    expect(await screen.findByText('Pucerons')).toBeOnTheScreen();
    const pictograms = pictogramsOnScreen();
    // Les onze filtres, puis les deux entrées.
    expect(pictograms).toHaveLength(13);
    expect(pictograms.slice(0, 2)).toEqual(['Watering:light', 'Sowing:light']);
    expect(pictograms.slice(-2).sort()).toEqual(['Harvest:light', 'Observation:light']);
  });

  it('filtre par type depuis sa pastille, toujours trouvée par son nom', async () => {
    await renderScreen(<JournalScreen />, await gardenWithTwoEntries());

    expect(await screen.findByText('Pucerons')).toBeOnTheScreen();
    fireEvent.press(screen.getAllByText('Récolte')[0]);

    await waitFor(() => expect(screen.queryByText('Pucerons')).not.toBeOnTheScreen());
    expect(await screen.findByText('Premières tomates')).toBeOnTheScreen();
  });
});
