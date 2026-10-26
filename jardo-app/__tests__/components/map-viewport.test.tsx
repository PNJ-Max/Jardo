import { fireEvent, render, screen } from '@testing-library/react-native';

import { MapViewport } from '@/components/map/map-viewport';
import { countryHouseScene } from '@/map/country-house';

const sizes: unknown[] = [];

jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

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
});
