import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { MapViewport } from '@/components/map/map-viewport';
import { countryHouseScene } from '@/map/country-house';
import type { SlotKey } from '@/map/layouts';
import { BOUNCE_LEAD } from '@/map/motion';

const sizes: unknown[] = [];

jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => ({ ...require('react-native-reanimated/mock'), useReducedMotion: jest.fn(() => false) }));

// Skia ne tourne pas sous Jest : la scène ne retient que la taille qu'on lui donne.
jest.mock('@/components/map/skia-scene', () => ({
  SkiaScene: ({ size }: { size: unknown }) => {
    sizes.push(size);
    return null;
  },
}));

const layout = (width: number, height: number) => ({ nativeEvent: { layout: { x: 0, y: 0, width, height } } });

describe('MapViewport', () => {
  it("garde sa taille quand l'écran caché mesure 0 × 0 (web, display: none)", async () => {
    await render(
      <MapViewport
        scene={countryHouseScene('light')}
        labels={{}}
        free={[]}
        selected={null}
        onSelect={jest.fn()}
        recenter={0}
      />,
    );
    const [frame] = screen.container.queryAll((node) => node.props.collapsable === false && !!node.props.onLayout);

    await fireEvent(frame, 'layout', layout(420, 747));
    await fireEvent(frame, 'layout', layout(0, 0));

    expect(sizes.at(-1)).toEqual({ width: 420, height: 747 });
  });

  describe("lecteur d'écran", () => {
    const renderLabelled = async (labels: Partial<Record<SlotKey, string>>) => {
      await render(
        <MapViewport scene={countryHouseScene('light')} labels={labels} free={[]} selected={null} onSelect={jest.fn()} recenter={0} />,
      );
      const [frame] = screen.container.queryAll((node) => node.props.collapsable === false && !!node.props.onLayout);
      await fireEvent(frame, 'layout', layout(420, 747));
      return frame;
    };

    it("nomme l'étiquette d'un espace, avec une cible de 48 dp au moins", async () => {
      await renderLabelled({ orchard: 'Verger' });

      const label = screen.getByRole('button', { name: 'Ouvrir Verger' });
      const { top, bottom } = label.props.hitSlop;
      expect(top + bottom + 26).toBeGreaterThanOrEqual(48);
    });

    it('cache le dessin de la carte, dont le nom des emplacements est dit par les étiquettes', async () => {
      const frame = await renderLabelled({ orchard: 'Verger' });

      expect(frame).toHaveProp('aria-hidden', true);
    });

    it("laisse hors d'atteinte l'étiquette d'une parcelle tant que la carte n'est pas assez zoomée", async () => {
      await renderLabelled({ orchard: 'Verger', 'bed-1': 'Parcelle 1' });

      expect(screen.getByRole('button', { name: 'Ouvrir Verger' })).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'Ouvrir Parcelle 1' })).not.toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Ouvrir Parcelle 1', includeHiddenElements: true })).toHaveProp('tabIndex', -1);
    });
  });

  describe('toucher un emplacement', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    const renderWithLabel = async (onSelect: jest.Mock) => {
      await render(
        <MapViewport
          scene={countryHouseScene('light')}
          labels={{ orchard: 'Verger' }}
          free={[]}
          selected={null}
          onSelect={onSelect}
          recenter={0}
        />,
      );
      const [frame] = screen.container.queryAll((node) => node.props.collapsable === false && !!node.props.onLayout);
      await fireEvent(frame, 'layout', layout(420, 747));
    };

    it("rebondit puis ouvre l'emplacement au sommet du rebond", async () => {
      const onSelect = jest.fn();
      await renderWithLabel(onSelect);

      await fireEvent.press(screen.getByLabelText('Ouvrir Verger'));
      expect(onSelect).not.toHaveBeenCalled();

      await act(() => jest.advanceTimersByTime(BOUNCE_LEAD));
      expect(onSelect).toHaveBeenCalledWith('orchard');
    });

    it("ouvre l'emplacement sans attendre quand l'appareil réduit les animations", async () => {
      jest.mocked(useReducedMotion).mockReturnValue(true);
      const onSelect = jest.fn();
      await renderWithLabel(onSelect);

      await fireEvent.press(screen.getByLabelText('Ouvrir Verger'));

      expect(onSelect).toHaveBeenCalledWith('orchard');
    });
  });
});
