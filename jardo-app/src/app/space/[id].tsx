import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDeleteSpace, useSetSpaceArchived, useSpace, useZones } from '@/api/queries';
import type { Id, Space, SpaceKind, Zone } from '@/api/types';
import { ArchivedBadge } from '@/components/items';
import { ItemsSection } from '@/components/items-section';
import { DetailScreen, JournalSection, ManageSection, TasksSection, useDetailStyles } from '@/components/sections';
import { Button, Empty, ErrorView, Loading, SectionTitle } from '@/components/ui';
import { SpaceVignette } from '@/components/vignettes/space-vignette';
import { AddZoneTile, ZoneTile } from '@/components/vignettes/zone-tile';
import { confirm, notify } from '@/lib/confirm';
import { spaceKinds } from '@/lib/garden';
import { goBack } from '@/lib/navigation';
import { createStyles, useTheme } from '@/theme';

export default function SpaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const space = useSpace(id);

  if (space.isPending) return <Loading />;
  if (space.error) return <ErrorView error={space.error} onRetry={space.refetch} />;
  return <SpaceDetail space={space.data} />;
}

function SpaceDetail({ space }: { space: Space }) {
  const styles = useDetailStyles();
  const ownStyles = useStyles();
  const zones = useZones(space.id);
  const archive = useSetSpaceArchived();
  const remove = useDeleteSpace();
  const target = { spaceId: space.id, label: space.name };

  const toggleArchive = () =>
    archive.mutate(
      { id: space.id, archived: !space.isArchived },
      { onError: (e) => notify("L'espace n'a pas été modifié", e.message) },
    );

  const deleteSpace = async () => {
    const ok = await confirm(
      `Supprimer « ${space.name} » ?`,
      'Ses zones, ses tâches et son journal seront supprimés. Un espace qui contient encore des éléments ne peut pas être supprimé.',
    );
    if (ok) {
      remove.mutate(space.id, { onSuccess: goBack, onError: (e) => notify("L'espace n'a pas été supprimé", e.message) });
    }
  };

  return (
    <DetailScreen
      cover={<SpaceCover kind={space.kind} />}
      header={
        <>
          <View style={styles.headerText}>
            <Text style={ownStyles.name} accessibilityRole="header">
              {space.name}
            </Text>
            <Text style={styles.subtitle}>{spaceSummary(space)}</Text>
          </View>
          {space.isArchived && <ArchivedBadge />}
        </>
      }
      tabs={[
        { key: 'tasks', label: 'Tâches', render: () => <TasksSection target={target} /> },
        {
          key: 'contents',
          label: 'Contenu',
          render: () =>
            space.zoneCount === 0 && space.itemCount === 0 ? (
              <EmptySpace space={space} />
            ) : (
              <>
                <ZonesSection spaceId={space.id} zones={zones} />
                <ItemsSection scope={{ spaceId: space.id, spaceKind: space.kind }} zones={zones.data} />
              </>
            ),
        },
        { key: 'journal', label: 'Journal', render: () => <JournalSection target={target} /> },
        {
          key: 'info',
          label: 'Infos',
          render: () => (
            <>
              <Text style={space.description ? styles.description : styles.subtitle}>
                {space.description ?? 'Pas de description.'}
              </Text>
              <ManageSection
                onEdit={() => router.push({ pathname: '/space/form', params: { id: String(space.id) } })}
                archive={{ archived: space.isArchived, onToggle: toggleArchive, loading: archive.isPending }}
                onDelete={deleteSpace}
                deleting={remove.isPending}
              />
            </>
          ),
        },
      ]}
    />
  );
}

const coverHeight = 232;

/** La vignette du type d'espace sur le ciel du jour, à la place de la barre de navigation. */
function SpaceCover({ kind }: { kind: SpaceKind }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ height: coverHeight }}>
      <SpaceVignette kind={kind} width={width} height={coverHeight} padding={16} paddingTop={insets.top + 24} sky />
      <Pressable
        onPress={goBack}
        accessibilityRole="button"
        accessibilityLabel="Retour"
        hitSlop={8}
        style={({ pressed }) => [styles.back, { top: insets.top + 14 }, pressed && { opacity: 0.7 }]}>
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </Pressable>
    </View>
  );
}

/** « Potager · 3 zones · 12 éléments » ; le type n'est pas répété quand il sert de nom. */
function spaceSummary(space: Space) {
  const kind = spaceKinds[space.kind].label;
  return [
    kind !== space.name ? kind : null,
    space.zoneCount > 0 ? `${space.zoneCount} ${space.zoneCount > 1 ? 'zones' : 'zone'}` : null,
    `${space.itemCount} ${space.itemCount > 1 ? 'éléments' : 'élément'}`,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Ni zone ni élément : on propose d'y mettre quelque chose, ou de le découper d'abord. */
function EmptySpace({ space }: { space: Space }) {
  const params = { spaceId: String(space.id) };
  const firewood = space.kind === 'Firewood';

  return (
    <Empty
      title={firewood ? 'Pas encore de bois ici' : "Rien n'y pousse encore"}
      hint={
        firewood
          ? "Ajoutez un tas de bois, ou découpez d'abord l'espace en zones (abri, bûcher…)."
          : "Ajoutez une plante, ou découpez d'abord l'espace en zones (carrés, rangs, planches…)."
      }>
      <Button
        title={firewood ? 'Ajouter un tas de bois' : 'Ajouter une plante'}
        icon="add"
        onPress={() => router.push({ pathname: firewood ? '/wood-pile/form' : '/plant/form', params })}
      />
      <Button title="Ajouter une zone" variant="secondary" onPress={() => router.push({ pathname: '/zone/form', params })} />
    </Empty>
  );
}

function ZonesSection({ spaceId, zones }: { spaceId: Id; zones: ReturnType<typeof useZones> }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const addZone = () => router.push({ pathname: '/zone/form', params: { spaceId: String(spaceId) } });

  if (zones.isPending) return <ActivityIndicator color={colors.primary} />;
  if (zones.error) return <Text style={styles.error}>{zones.error.message}</Text>;

  const tiles: (Zone | 'add')[] = [...zones.data, 'add'];
  const rows = Array.from({ length: Math.ceil(tiles.length / 2) }, (_, i) => tiles.slice(i * 2, i * 2 + 2));

  return (
    <View style={styles.section}>
      <SectionTitle>Zones</SectionTitle>
      {zones.data.length === 0 && <Text style={styles.empty}>Pas de zone : l&apos;espace n&apos;est pas découpé.</Text>}
      {rows.map((row, i) => (
        <View key={i} style={styles.row}>
          {row.map((tile) =>
            tile === 'add' ? (
              <AddZoneTile key="add" onPress={addZone} />
            ) : (
              <ZoneTile
                key={tile.id}
                name={tile.name}
                caption={`${tile.itemCount} ${tile.itemCount > 1 ? 'éléments' : 'élément'}`}
                seed={tile.id}
                plants={tile.itemCount}
                onPress={() => router.push(`/zone/${tile.id}`)}
              />
            ),
          )}
          {row.length === 1 && <View style={styles.spacer} />}
        </View>
      ))}
    </View>
  );
}

const useStyles = createStyles(({ colors, typography, spacing }) => ({
  name: { ...typography.display, color: colors.text },
  back: {
    position: 'absolute',
    left: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  section: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm + 2 },
  spacer: { flex: 1 },
  empty: { ...typography.body, color: colors.textMuted },
  error: { ...typography.body, color: colors.danger },
}));
