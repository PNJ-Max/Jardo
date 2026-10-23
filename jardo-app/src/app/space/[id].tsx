import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';

import { useDeleteSpace, useSetSpaceArchived, useSpace, useZones } from '@/api/queries';
import type { Id, Space } from '@/api/types';
import { ArchivedBadge, Chevron } from '@/components/items';
import { ItemsSection } from '@/components/items-section';
import { DetailScreen, JournalSection, ManageSection, TasksSection, useDetailStyles } from '@/components/sections';
import { SpaceKindIcon } from '@/components/spaces';
import { Button, Card, ErrorView, Loading, SectionTitle } from '@/components/ui';
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
      header={
        <>
          <View style={styles.headerRow}>
            <SpaceKindIcon kind={space.kind} size={48} />
            <View style={styles.headerText}>
              <Text style={styles.title}>{space.name}</Text>
              <Text style={styles.subtitle}>{spaceSummary(space)}</Text>
            </View>
          </View>
          {space.isArchived && <ArchivedBadge />}
        </>
      }
      tabs={[
        { key: 'tasks', label: 'Tâches', render: () => <TasksSection target={target} /> },
        {
          key: 'contents',
          label: 'Contenu',
          render: () => (
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

function ZonesSection({ spaceId, zones }: { spaceId: Id; zones: ReturnType<typeof useZones> }) {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <View style={styles.section}>
      <SectionTitle>Zones</SectionTitle>
      {zones.isPending ? (
        <ActivityIndicator color={colors.primary} />
      ) : zones.error ? (
        <Text style={styles.error}>{zones.error.message}</Text>
      ) : zones.data.length === 0 ? (
        <Text style={styles.empty}>Pas de zone : l&apos;espace n&apos;est pas découpé.</Text>
      ) : (
        zones.data.map((zone) => (
          <Card key={zone.id} onPress={() => router.push(`/zone/${zone.id}`)} style={styles.zone}>
            <View style={styles.zoneText}>
              <Text style={styles.zoneName}>{zone.name}</Text>
              <Text style={styles.zoneCount}>
                {zone.itemCount} {zone.itemCount > 1 ? 'éléments' : 'élément'}
              </Text>
            </View>
            <Chevron />
          </Card>
        ))
      )}
      <Button
        title="Ajouter une zone"
        icon="add"
        variant="secondary"
        onPress={() => router.push({ pathname: '/zone/form', params: { spaceId: String(spaceId) } })}
      />
    </View>
  );
}

const useStyles = createStyles(({ colors, fonts, typography, spacing }) => ({
  section: { gap: spacing.sm },
  empty: { ...typography.body, color: colors.textMuted },
  error: { ...typography.body, color: colors.danger },
  zone: { flexDirection: 'row', alignItems: 'center' },
  zoneText: { flex: 1, gap: 2 },
  zoneName: { ...typography.body, fontFamily: fonts.bodySemiBold, color: colors.text },
  zoneCount: { ...typography.caption, color: colors.textMuted },
}));
