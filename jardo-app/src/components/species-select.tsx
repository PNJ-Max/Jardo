import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Keyboard, Pressable, ScrollView, Text, View } from 'react-native';

import { useSpace } from '@/api/queries';
import type { Id } from '@/api/types';
import { CategoryIcon } from '@/components/pictograms';
import { BottomSheet, Field, FieldMessage, SectionTitle, useFieldStyles, type IconName } from '@/components/ui';
import { findSpecies, speciesCatalog } from '@/data/species';
import {
  nextPlantingWindow,
  referenceClimate,
  searchSpecies,
  speciesSuggestions,
  type Species,
} from '@/domain/species';
import { plantingHint, suggestionsTitle } from '@/lib/species';
import { useToday } from '@/lib/use-today';
import { createStyles, useTheme } from '@/theme';

type SpeciesSelectProps = {
  spaceId: Id;
  /** Le texte affiché : le nom d'une fiche, ou une saisie libre. */
  species: string;
  speciesId: string | null;
  onSelect: (species: Species) => void;
  /** Une saisie libre, sans fiche ; un texte vide retire l'espèce. */
  onFreeText: (text: string) => void;
  error?: string;
};

/** L'espèce d'une plante : un champ à toucher, qui ouvre une feuille de recherche dans le catalogue. */
export function SpeciesSelect({ spaceId, species, speciesId, onSelect, onFreeText, error }: SpeciesSelectProps) {
  const { colors } = useTheme();
  const fieldStyles = useFieldStyles();
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const known = speciesId ? findSpecies(speciesId) : undefined;
  const close = () => setOpen(false);

  return (
    <View style={fieldStyles.field}>
      <Text style={fieldStyles.label}>Espèce</Text>
      <Pressable
        onPress={() => {
          // Le clavier du champ précédent cacherait les suggestions.
          Keyboard.dismiss();
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Espèce : ${species || 'Choisir une espèce'}`}
        style={({ pressed }) => [
          fieldStyles.input,
          styles.input,
          error ? fieldStyles.inputError : null,
          pressed && { opacity: 0.7 },
        ]}>
        {known ? (
          <CategoryIcon category={known.category} />
        ) : (
          <Ionicons aria-hidden name="leaf-outline" size={20} color={colors.primary} />
        )}
        <Text style={[species ? styles.value : styles.placeholder, styles.text]}>{species || 'Choisir une espèce'}</Text>
      </Pressable>
      <FieldMessage error={error} />
      <BottomSheet visible={open} onClose={close} style={styles.sheet}>
        <SpeciesSearch
          spaceId={spaceId}
          selectedId={speciesId}
          removable={!!species}
          onClose={close}
          onSelect={(chosen) => {
            onSelect(chosen);
            close();
          }}
          onFreeText={(text) => {
            onFreeText(text);
            close();
          }}
        />
      </BottomSheet>
    </View>
  );
}

type SpeciesSearchProps = {
  spaceId: Id;
  selectedId: string | null;
  removable: boolean;
  onClose: () => void;
  onSelect: (species: Species) => void;
  onFreeText: (text: string) => void;
};

function SpeciesSearch({ spaceId, selectedId, removable, onClose, onSelect, onFreeText }: SpeciesSearchProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const [query, setQuery] = useState('');
  const text = query.trim();
  const day = useToday();
  const kind = useSpace(spaceId).data?.kind;

  // En attendant le climat du jardin (étude, PR 7), celui pour lequel les fiches sont écrites.
  const suggestions = kind && speciesSuggestions(speciesCatalog, kind, day, referenceClimate);
  const results = searchSpecies(speciesCatalog, text);

  const rows = (list: readonly Species[]) =>
    list.map((species) => {
      const window = nextPlantingWindow(species, day, referenceClimate);
      return (
        <SpeciesRow
          key={species.id}
          species={species}
          hint={window && plantingHint(window)}
          selected={species.id === selectedId}
          onPress={() => onSelect(species)}
        />
      );
    });

  return (
    <>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          Espèce
        </Text>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fermer"
          style={({ pressed }) => [styles.close, pressed && { opacity: 0.7 }]}>
          <Ionicons aria-hidden name="close" size={24} color={colors.text} />
        </Pressable>
      </View>
      <Field
        label="Rechercher une espèce"
        hideLabel
        value={query}
        onChangeText={setQuery}
        placeholder="Rechercher : tomate, salade…"
        maxLength={100}
        returnKeyType="search"
      />
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        {text ? (
          <>
            <Text accessibilityLiveRegion="polite" style={styles.count}>
              {resultCount(results.length)}
            </Text>
            {rows(results)}
            <SearchAction icon="create-outline" label={`Utiliser « ${text} » sans fiche`} onPress={() => onFreeText(text)} />
          </>
        ) : (
          <>
            {removable && <SearchAction icon="close-circle-outline" label="Sans espèce" onPress={() => onFreeText('')} />}
            {!!suggestions?.now.length && (
              <>
                <SectionTitle>En ce moment</SectionTitle>
                {rows(suggestions.now)}
              </>
            )}
            {kind && !!suggestions?.others.length && (
              <>
                <SectionTitle>{suggestionsTitle(kind)}</SectionTitle>
                {rows(suggestions.others)}
              </>
            )}
          </>
        )}
      </ScrollView>
    </>
  );
}

const resultCount = (count: number) => {
  if (count === 0) return 'Aucune espèce au catalogue';
  return count === 1 ? '1 espèce trouvée' : `${count} espèces trouvées`;
};

type SpeciesRowProps = { species: Species; hint?: string; selected: boolean; onPress: () => void };

function SpeciesRow({ species, hint, selected, onPress }: SpeciesRowProps) {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={hint ? `${species.name}, ${hint}` : species.name}
      aria-selected={selected}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={styles.tile}>
        <CategoryIcon category={species.category} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.name}>{species.name}</Text>
        {hint && <Text style={styles.hint}>{hint}</Text>}
      </View>
      {selected && <Ionicons aria-hidden name="checkmark" size={22} color={colors.primary} />}
    </Pressable>
  );
}

function SearchAction({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={styles.actionIcon}>
        <Ionicons aria-hidden name={icon} size={22} color={colors.primary} />
      </View>
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

const useStyles = createStyles(({ colors, fonts, typography, spacing, radius }) => ({
  input: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  text: { flex: 1 },
  value: { ...typography.body, color: colors.text },
  placeholder: { ...typography.body, color: colors.textMuted },
  // Une hauteur stable : la feuille ne saute pas à chaque lettre, et cède la place au clavier.
  sheet: { flex: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  title: { ...typography.section, color: colors.text },
  close: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  list: { flex: 1 },
  listContent: { gap: spacing.xs, paddingBottom: spacing.sm },
  count: { ...typography.caption, color: colors.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 4, borderRadius: radius.md },
  rowPressed: { backgroundColor: colors.surfaceSunken },
  tile: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tile,
  },
  rowText: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.bodySemiBold, fontSize: 16, lineHeight: 21, color: colors.text },
  hint: { ...typography.caption, color: colors.textMuted },
  actionIcon: { width: 44, alignItems: 'center' },
  actionText: { ...typography.body, fontFamily: fonts.bodySemiBold, color: colors.primary, flex: 1 },
}));
