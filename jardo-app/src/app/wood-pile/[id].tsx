import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { useDeleteWoodPile, useSetWoodPileArchived, useWoodPile } from '@/api/queries';
import type { WoodPile } from '@/api/types';
import { ArchivedBadge, DryingBadge } from '@/components/items';
import { DetailScreen, Fact, JournalSection, ManageSection, TasksSection, useDetailStyles } from '@/components/sections';
import { ErrorView, Loading } from '@/components/ui';
import { confirm, notify } from '@/lib/confirm';
import { formatLongDate } from '@/lib/dates';
import { steres, targetLabel } from '@/lib/garden';
import { goBack } from '@/lib/navigation';

export default function WoodPileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pile = useWoodPile(id);

  if (pile.isPending) return <Loading />;
  if (pile.error) return <ErrorView error={pile.error} onRetry={pile.refetch} />;
  return <WoodPileDetail pile={pile.data} />;
}

function WoodPileDetail({ pile }: { pile: WoodPile }) {
  const styles = useDetailStyles();
  const archive = useSetWoodPileArchived();
  const remove = useDeleteWoodPile();
  const target = {
    spaceId: pile.spaceId,
    zoneId: pile.zoneId,
    itemId: pile.id,
    itemKind: 'WoodPile' as const,
    label: targetLabel({ itemName: pile.name, zoneName: pile.zoneName, spaceName: pile.spaceName }),
  };

  const toggleArchive = () =>
    archive.mutate(
      { id: pile.id, archived: !pile.isArchived },
      { onError: (e) => notify("Le tas n'a pas été modifié", e.message) },
    );

  const deletePile = async () => {
    const ok = await confirm(`Supprimer « ${pile.name} » ?`, 'Ses tâches et son journal seront supprimés.');
    if (ok) {
      remove.mutate(pile.id, { onSuccess: goBack, onError: (e) => notify("Le tas n'a pas été supprimé", e.message) });
    }
  };

  return (
    <DetailScreen
      header={
        <>
          <View style={styles.headerText}>
            <Text style={styles.title}>{pile.name}</Text>
            <Text style={styles.subtitle}>{[pile.zoneName, pile.spaceName].filter(Boolean).join(' · ')}</Text>
          </View>
          <Text style={styles.fact}>
            {[pile.woodSpecies, `Reste ${steres(pile.remainingSteres)}`].filter(Boolean).join(' · ')}
          </Text>
          {pile.isArchived ? <ArchivedBadge /> : <DryingBadge pile={pile} />}
        </>
      }
      tabs={[
        { key: 'tasks', label: 'Tâches', render: () => <TasksSection target={target} /> },
        { key: 'journal', label: 'Journal', render: () => <JournalSection target={target} /> },
        {
          key: 'info',
          label: 'Infos',
          render: () => (
            <>
              <View style={styles.facts}>
                <Fact label="Stock restant" value={steres(pile.remainingSteres)} />
                <Fact label="Volume initial" value={steres(pile.initialSteres)} />
                <Fact label="Essence" value={pile.woodSpecies} />
                <Fact label="Bûches" value={pile.logLengthCm ? `${pile.logLengthCm} cm` : null} />
                <Fact label="Coupé le" value={formatLongDate(pile.cutDate)} />
                <Fact label="Prêt à brûler le" value={formatLongDate(pile.readyOn)} />
              </View>
              <ManageSection
                onEdit={() => router.push({ pathname: '/wood-pile/form', params: { id: String(pile.id) } })}
                archive={{ archived: pile.isArchived, onToggle: toggleArchive, loading: archive.isPending }}
                onDelete={deletePile}
                deleting={remove.isPending}
              />
            </>
          ),
        },
      ]}
    />
  );
}
