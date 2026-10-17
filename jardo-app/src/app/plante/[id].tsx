import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  useDeleteObservation,
  useDeletePlant,
  useObservations,
  usePlant,
  useSetPlantArchived,
  useWaterings,
  useWaterPlant,
} from '@/api/queries';
import type { Observation, Plant, WateringLog } from '@/api/types';
import { WateringBadge } from '@/components/plants';
import { Button, Card, ErrorView, Field, Loading, SectionTitle, screenStyles } from '@/components/ui';
import { confirm, notify } from '@/lib/confirm';
import { formatDate, isDateOnly, today } from '@/lib/dates';
import { goBack } from '@/lib/navigation';
import { colors, spacing } from '@/theme';

export default function PlantScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const plant = usePlant(id);

  if (plant.isPending) return <Loading />;
  if (plant.error) return <ErrorView error={plant.error} onRetry={plant.refetch} />;

  return (
    <ScrollView style={screenStyles.screen} contentContainerStyle={screenStyles.list}>
      <Stack.Screen options={{ title: plant.data.name }} />
      <PlantHeader plant={plant.data} />
      {!plant.data.isArchived && <WaterAction plantId={id} />}
      <Journal plantId={id} />
      <ManageActions plant={plant.data} />
    </ScrollView>
  );
}

function PlantHeader({ plant }: { plant: Plant }) {
  return (
    <Card style={{ gap: spacing.sm }}>
      <WateringBadge plant={plant} />
      <InfoLine label="Zone" value={plant.zoneName} onPress={() => router.push(`/zone/${plant.zoneId}`)} />
      {plant.species ? <InfoLine label="Espèce" value={plant.species} /> : null}
      <InfoLine label="Plantée le" value={formatDate(plant.plantedDate)} />
      <InfoLine label="Arrosage" value={`tous les ${plant.wateringIntervalDays} j`} />
      <InfoLine label="Dernier arrosage" value={formatDate(plant.lastWateredAt)} />
      <InfoLine label="Prochain arrosage" value={formatDate(plant.nextWateringDate)} />
    </Card>
  );
}

function InfoLine({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text onPress={onPress} style={[styles.infoValue, onPress && { color: colors.primary }]}>
        {value}
      </Text>
    </View>
  );
}

/**
 * Arroser aujourd'hui en un tap ; une autre date reste possible pour rattraper un
 * oubli. L'API refuse les dates futures et renvoie le message : on l'affiche.
 */
function WaterAction({ plantId }: { plantId: number }) {
  const water = useWaterPlant();
  const [otherDate, setOtherDate] = useState<string | null>(null);

  const submit = (wateredAt?: string) =>
    water.mutate(
      { plantId, input: wateredAt ? { wateredAt } : {} },
      {
        onSuccess: () => setOtherDate(null),
        onError: (e) => notify("L'arrosage n'a pas été enregistré", e.message),
      },
    );

  if (otherDate !== null) {
    const valid = isDateOnly(otherDate);
    return (
      <Card style={{ gap: spacing.sm }}>
        <Field
          label="Date de l'arrosage"
          value={otherDate}
          onChangeText={setOtherDate}
          placeholder="AAAA-MM-JJ"
          error={otherDate && !valid ? 'Format attendu : AAAA-MM-JJ' : undefined}
        />
        <View style={styles.actions}>
          <Button title="Annuler" variant="secondary" style={styles.action} onPress={() => setOtherDate(null)} />
          <Button
            title="Enregistrer"
            style={styles.action}
            disabled={!valid}
            loading={water.isPending}
            onPress={() => submit(otherDate)}
          />
        </View>
      </Card>
    );
  }

  return (
    <View style={{ gap: spacing.xs }}>
      <Button title="Arrosée aujourd'hui" icon="water" loading={water.isPending} onPress={() => submit()} />
      <Text style={styles.link} onPress={() => setOtherDate(today())}>
        Arrosée un autre jour ?
      </Text>
    </View>
  );
}

type JournalEntry =
  | { kind: 'watering'; date: string; key: string; item: WateringLog }
  | { kind: 'observation'; date: string; key: string; item: Observation };

/** Arrosages et observations fusionnés dans une seule chronologie, du plus récent au plus ancien. */
function Journal({ plantId }: { plantId: number }) {
  const waterings = useWaterings(plantId);
  const observations = useObservations(plantId);
  const deleteObservation = useDeleteObservation();

  const error = waterings.error ?? observations.error;
  const entries: JournalEntry[] = [
    ...(waterings.data ?? []).map((w) => ({ kind: 'watering' as const, date: w.wateredAt, key: `w${w.id}`, item: w })),
    ...(observations.data ?? []).map((o) => ({
      kind: 'observation' as const,
      date: o.observedAt,
      key: `o${o.id}`,
      item: o,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const onDelete = async (observation: Observation) => {
    if (!(await confirm("Supprimer l'observation ?", observation.note))) return;
    deleteObservation.mutate(observation.id, { onError: (e) => notify('Suppression impossible', e.message) });
  };

  return (
    <>
      <SectionTitle>Journal</SectionTitle>
      <Button
        title="Ajouter une observation"
        icon="create-outline"
        variant="secondary"
        onPress={() => router.push({ pathname: '/plante/observation', params: { plantId: String(plantId) } })}
      />

      {waterings.isPending || observations.isPending ? (
        <Loading />
      ) : error ? (
        <ErrorView error={error} />
      ) : entries.length === 0 ? (
        <Text style={styles.muted}>Rien dans le journal pour l’instant.</Text>
      ) : (
        entries.map((entry) => (
          <Card key={entry.key} style={styles.entry}>
            <Ionicons
              name={entry.kind === 'watering' ? 'water' : 'document-text-outline'}
              size={20}
              color={entry.kind === 'watering' ? '#1E88E5' : colors.primary}
            />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.entryDate}>{formatDate(entry.date)}</Text>
              {entry.kind === 'watering' ? (
                <Text style={styles.entryText}>Arrosage{entry.item.note ? ` — ${entry.item.note}` : ''}</Text>
              ) : (
                <ObservationText observation={entry.item} />
              )}
            </View>
            {entry.kind === 'observation' && (
              <Pressable onPress={() => onDelete(entry.item)} hitSlop={8} accessibilityLabel="Supprimer">
                <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
              </Pressable>
            )}
          </Card>
        ))
      )}
    </>
  );
}

function ObservationText({ observation }: { observation: Observation }) {
  return (
    <>
      <Text style={styles.entryText}>{observation.note}</Text>
      {observation.heightCm != null && <Text style={styles.muted}>Hauteur : {observation.heightCm} cm</Text>}
      {observation.problemNote ? <Text style={styles.muted}>Problème : {observation.problemNote}</Text> : null}
      {observation.treatment ? <Text style={styles.muted}>Traitement : {observation.treatment}</Text> : null}
    </>
  );
}

function ManageActions({ plant }: { plant: Plant }) {
  const setArchived = useSetPlantArchived();
  const deletePlant = useDeletePlant();

  const onDelete = async () => {
    const ok = await confirm(
      'Supprimer la plante ?',
      `« ${plant.name} » et tout son journal seront supprimés définitivement. Pour la garder en historique, archivez-la plutôt.`,
    );
    if (!ok) return;
    deletePlant.mutate(plant.id, { onSuccess: goBack, onError: (e) => notify('Suppression impossible', e.message) });
  };

  return (
    <>
      <SectionTitle>Gérer</SectionTitle>
      <Button
        title="Modifier"
        icon="create-outline"
        variant="secondary"
        onPress={() => router.push({ pathname: '/plante/form', params: { id: String(plant.id) } })}
      />
      <View style={styles.actions}>
        <Button
          title={plant.isArchived ? 'Désarchiver' : 'Archiver'}
          icon="archive-outline"
          variant="secondary"
          style={styles.action}
          loading={setArchived.isPending}
          onPress={() =>
            setArchived.mutate(
              { id: plant.id, archived: !plant.isArchived },
              { onError: (e) => notify('Action impossible', e.message) },
            )
          }
        />
        <Button
          title="Supprimer"
          icon="trash-outline"
          variant="danger"
          style={styles.action}
          loading={deletePlant.isPending}
          onPress={onDelete}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  infoLine: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  infoLabel: { color: colors.textMuted, fontSize: 15 },
  infoValue: { color: colors.text, fontSize: 15, fontWeight: '500', flexShrink: 1, textAlign: 'right' },
  link: { color: colors.primary, textAlign: 'center', paddingVertical: spacing.xs },
  muted: { color: colors.textMuted },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
  entry: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  entryDate: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  entryText: { fontSize: 15, color: colors.text },
});
