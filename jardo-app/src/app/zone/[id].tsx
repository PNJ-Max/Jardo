import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useDeleteZone, usePlants, useWaterZone, useZone } from '@/api/queries';
import { PlantRow } from '@/components/plants';
import { Button, ErrorView, Loading, SectionTitle, screenStyles } from '@/components/ui';
import { confirm, notify } from '@/lib/confirm';
import { goBack } from '@/lib/navigation';
import { colors, spacing } from '@/theme';

export default function ZoneScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const zone = useZone(id);
  const plants = usePlants({ zoneId: id });
  const waterZone = useWaterZone();
  const deleteZone = useDeleteZone();

  if (zone.isPending) return <Loading />;
  if (zone.error) return <ErrorView error={zone.error} onRetry={zone.refetch} />;

  const onWaterAll = () =>
    waterZone.mutate(id, {
      onSuccess: (result) =>
        notify('Zone arrosée', `${result.plantsWatered} plante(s) arrosée(s) dans « ${result.zoneName} ».`),
      onError: (e) => notify("L'arrosage n'a pas été enregistré", e.message),
    });

  const onDelete = async () => {
    if (!(await confirm('Supprimer la zone ?', `« ${zone.data.name} » sera supprimée définitivement.`))) return;

    // L'API refuse de supprimer une zone qui contient encore des plantes, et renvoie
    // un message explicite : on l'affiche tel quel plutôt que de le dupliquer ici.
    deleteZone.mutate(id, {
      onSuccess: goBack,
      onError: (e) => notify('Suppression impossible', e.message),
    });
  };

  return (
    <ScrollView style={screenStyles.screen} contentContainerStyle={screenStyles.list}>
      <Stack.Screen options={{ title: zone.data.name }} />

      {zone.data.description ? <Text style={styles.description}>{zone.data.description}</Text> : null}

      <Button
        title="Arroser toute la zone"
        icon="water"
        onPress={onWaterAll}
        loading={waterZone.isPending}
        disabled={zone.data.plantCount === 0}
      />

      <SectionTitle>Plantes ({zone.data.plantCount})</SectionTitle>
      {plants.isPending ? (
        <Loading />
      ) : plants.error ? (
        <ErrorView error={plants.error} onRetry={plants.refetch} />
      ) : plants.data.length === 0 ? (
        <Text style={styles.muted}>Aucune plante dans cette zone.</Text>
      ) : (
        plants.data.map((plant) => <PlantRow key={plant.id} plant={plant} hideZone />)
      )}

      <Button
        title="Ajouter une plante"
        icon="add"
        variant="secondary"
        onPress={() => router.push({ pathname: '/plante/form', params: { zoneId: String(id) } })}
      />

      <SectionTitle>Gérer</SectionTitle>
      <View style={styles.actions}>
        <Button
          title="Modifier"
          icon="create-outline"
          variant="secondary"
          style={styles.action}
          onPress={() => router.push({ pathname: '/zone/form', params: { id: String(id) } })}
        />
        <Button
          title="Supprimer"
          icon="trash-outline"
          variant="danger"
          style={styles.action}
          loading={deleteZone.isPending}
          onPress={onDelete}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  description: { fontSize: 15, color: colors.textMuted },
  muted: { color: colors.textMuted },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
});
