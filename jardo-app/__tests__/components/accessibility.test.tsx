import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { SpaceKindSelect } from '@/components/space-kind-select';
import { Button, Card, ChipSelect, DateField, Fab, Field, SectionTitle, Tabs } from '@/components/ui';

jest.mock('@react-native-community/datetimepicker', () => ({ DateTimePickerAndroid: { open: jest.fn() } }));

describe('Button', () => {
  it('se présente comme un bouton, nommé par son titre', async () => {
    const onPress = jest.fn();
    await render(<Button title="Enregistrer" icon="checkmark" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("garde son nom et se dit occupé pendant le chargement, quand l'indicateur remplace le texte", async () => {
    await render(<Button title="Enregistrer" loading onPress={jest.fn()} />);

    const button = screen.getByRole('button', { name: 'Enregistrer' });
    expect(button).toBeBusy();
    expect(button).toBeDisabled();
  });

  it('annonce son état désactivé', async () => {
    await render(<Button title="Enregistrer" disabled onPress={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled();
  });

  it('annonce que ce qu\'il replie est ouvert ou fermé', async () => {
    const { rerender } = await render(<Button title="Voir les archivés" expanded={false} onPress={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Voir les archivés' })).toBeCollapsed();

    await rerender(<Button title="Voir les archivés" expanded onPress={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Voir les archivés' })).toBeExpanded();
  });
});

describe('boutons à icône seule', () => {
  it("le bouton flottant dit ce qu'il ajoute", async () => {
    await render(<Fab onPress={jest.fn()} label="Ajouter un espace" />);

    expect(screen.getByRole('button', { name: 'Ajouter un espace' })).toBeOnTheScreen();
  });

  it('le bouton flottant se nomme « Ajouter » par défaut', async () => {
    await render(<Fab onPress={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Ajouter' })).toBeOnTheScreen();
  });

  it('« Effacer » une date facultative est un bouton nommé par le champ', async () => {
    await render(<DateField label="Récolte" value="2026-10-02" optional onChange={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Effacer : Récolte' })).toBeOnTheScreen();
  });
});

describe('Card', () => {
  it('une carte touchable est un bouton, une carte seule non', async () => {
    await render(
      <>
        <Card onPress={jest.fn()}>
          <Text>Potager</Text>
        </Card>
        <Card>
          <Text>À propos</Text>
        </Card>
      </>,
    );

    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Potager' })).toBeOnTheScreen();
  });
});

describe('titres', () => {
  it('un titre de section a le rôle header', async () => {
    await render(<SectionTitle count={2}>En retard</SectionTitle>);

    expect(screen.getByRole('header')).toHaveTextContent('En retard 2');
  });
});

describe('ChipSelect', () => {
  const options = [
    { value: 'all', label: 'Toutes' },
    { value: 'Harvest', label: 'Récolte' },
  ];

  it('forme un groupe de choix nommé, dont la pastille choisie est annoncée', async () => {
    await render(<ChipSelect label="Intervention" options={options} value="Harvest" onChange={jest.fn()} />);

    expect(screen.getByLabelText('Intervention')).toHaveProp('accessibilityRole', 'radiogroup');
    expect(screen.getByRole('radio', { name: 'Récolte', selected: true })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Toutes', selected: false })).toBeOnTheScreen();
  });

  it('annonce aussi la pastille choisie comme cochée, ce que lit TalkBack pour un bouton radio', async () => {
    await render(<ChipSelect label="Intervention" options={options} value="all" onChange={jest.fn()} />);

    expect(screen.getByRole('radio', { name: 'Toutes' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Récolte' })).not.toBeChecked();
  });

  it('nomme une pastille par son texte, pas par son pictogramme', async () => {
    await render(
      <ChipSelect
        label="Intervention"
        scrollable
        options={[{ value: 'Harvest', label: 'Récolte', icon: <Text>glyphe</Text> }]}
        value={undefined}
        onChange={jest.fn()}
      />,
    );

    expect(screen.getByRole('radio', { name: 'Récolte' })).toBeOnTheScreen();
  });

  it('change de choix au toucher', async () => {
    const onChange = jest.fn();
    await render(<ChipSelect label="Intervention" options={options} value="all" onChange={onChange} />);

    await fireEvent.press(screen.getByRole('radio', { name: 'Récolte' }));

    expect(onChange).toHaveBeenCalledWith('Harvest');
  });
});

describe('SpaceKindSelect', () => {
  it("annonce le type d'espace choisi", async () => {
    await render(<SpaceKindSelect value="Orchard" onChange={jest.fn()} />);

    expect(screen.getByLabelText('Type')).toHaveProp('accessibilityRole', 'radiogroup');
    expect(screen.getByRole('radio', { name: 'Verger', selected: true })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Potager', selected: false })).toBeOnTheScreen();
  });

  it("annonce l'erreur du champ quand elle apparaît", async () => {
    await render(<SpaceKindSelect value={undefined} onChange={jest.fn()} error="Le type est requis." />);

    expect(screen.getByText('Le type est requis.')).toHaveProp('accessibilityLiveRegion', 'polite');
  });
});

describe('Field', () => {
  it('nomme le champ par son libellé', async () => {
    await render(<Field label="Nom du jardin" value="" onChangeText={jest.fn()} />);

    expect(screen.getByLabelText('Nom du jardin')).toBeOnTheScreen();
  });

  it("lit l'erreur avec le champ et l'annonce à son apparition", async () => {
    await render(<Field label="Nom" value="" onChangeText={jest.fn()} error="Le nom est requis." hint="Un nom court." />);

    expect(screen.getByLabelText('Nom')).toHaveProp('accessibilityHint', 'Le nom est requis.');
    expect(screen.getByText('Le nom est requis.')).toHaveProp('accessibilityLiveRegion', 'polite');
  });

  it("lit l'indication quand il n'y a pas d'erreur", async () => {
    await render(<Field label="Nom" value="" onChangeText={jest.fn()} hint="Un nom court." />);

    expect(screen.getByLabelText('Nom')).toHaveProp('accessibilityHint', 'Un nom court.');
  });
});

describe('Tabs', () => {
  it("annonce l'onglet actif", async () => {
    await render(
      <Tabs
        tabs={[
          { key: 'tasks', label: 'Tâches' },
          { key: 'journal', label: 'Journal' },
        ]}
        value="journal"
        onChange={jest.fn()}
      />,
    );

    expect(screen.getByRole('tab', { name: 'Journal', selected: true })).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Tâches', selected: false })).toBeOnTheScreen();
  });
});
