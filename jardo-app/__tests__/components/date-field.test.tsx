import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { DateField } from '@/components/ui';

jest.mock('@react-native-community/datetimepicker', () => ({ DateTimePickerAndroid: { open: jest.fn() } }));

const open = DateTimePickerAndroid.open as jest.Mock;

describe('DateField', () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    jest.setSystemTime(new Date(2026, 9, 20, 10));
  });
  afterEach(() => jest.useRealTimers());

  it('interdit les jours futurs au calendrier quand noFuture est demandé', async () => {
    await render(<DateField label="Date" value="2026-10-02" noFuture onChange={jest.fn()} />);

    await fireEvent.press(screen.getByLabelText('Date : 2 octobre 2026'));

    const { maximumDate } = open.mock.lastCall[0];
    expect([maximumDate.getFullYear(), maximumDate.getMonth(), maximumDate.getDate()]).toEqual([2026, 9, 20]);
  });

  it('laisse choisir une date future sans noFuture (une échéance, par exemple)', async () => {
    await render(<DateField label="Date" value="2026-10-02" onChange={jest.fn()} />);

    await fireEvent.press(screen.getByLabelText('Date : 2 octobre 2026'));

    expect(open.mock.lastCall[0].maximumDate).toBeUndefined();
  });

  it('rend le jour choisi en YYYY-MM-DD', async () => {
    const onChange = jest.fn();
    await render(<DateField label="Date" value="2026-10-02" onChange={onChange} />);

    await fireEvent.press(screen.getByLabelText('Date : 2 octobre 2026'));
    open.mock.lastCall[0].onValueChange({}, new Date(2026, 2, 5, 23, 59));

    expect(onChange).toHaveBeenCalledWith('2026-03-05');
  });

  it('efface une date optionnelle', async () => {
    const onChange = jest.fn();
    await render(<DateField label="Récolte" optional value="2026-10-02" onChange={onChange} />);

    await fireEvent.press(screen.getByLabelText('Effacer : Récolte'));

    expect(onChange).toHaveBeenCalledWith(null);
  });
});
