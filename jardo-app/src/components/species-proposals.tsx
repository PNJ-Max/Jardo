import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';

import { useSetProposalDismissed } from '@/api/proposal-queries';
import { useDeleteTask, useSaveTask } from '@/api/queries';
import type { JournalEntryKind, Plant } from '@/api/types';
import { KindIcon } from '@/components/pictograms';
import { useShowUndo } from '@/components/undo';
import { Button, Group, SectionTitle } from '@/components/ui';
import type { DateOnly } from '@/domain/dates';
import type { ReminderProposal } from '@/domain/reminder-proposals';
import type { Species } from '@/domain/species';
import { notify } from '@/lib/confirm';
import { lowerFirst } from '@/lib/garden';
import { proposalStart, proposalTask, proposalTitle, speciesWithArticle } from '@/lib/species';
import { createStyles, useTheme } from '@/theme';

const proposalLabel = (proposal: ReminderProposal, on: DateOnly) =>
  `${proposalTitle(proposal)}, ${proposalStart(proposal, on)}`;

function ProposalRow({ proposal, on, children }: { proposal: ReminderProposal; on: DateOnly; children: ReactNode }) {
  const styles = useStyles();

  return (
    <View style={styles.row}>
      <View style={styles.tile}>
        <KindIcon kind={proposal.kind} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{proposalTitle(proposal)}</Text>
        <Text style={styles.start}>{proposalStart(proposal, on)}</Text>
      </View>
      {children}
    </View>
  );
}

type FormProposalsProps = {
  proposals: ReminderProposal[];
  on: DateOnly;
  accepted: JournalEntryKind[];
  onChange: (accepted: JournalEntryKind[]) => void;
};

/** Dans le formulaire : rien n'est coché d'office, les rappels cochés sont créés avec la plante. */
export function FormProposals({ proposals, on, accepted, onChange }: FormProposalsProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  if (proposals.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionTitle>Rappels proposés</SectionTitle>
      <Group>
        {proposals.map((proposal) => (
          <ProposalRow key={proposal.kind} proposal={proposal} on={on}>
            <Switch
              accessibilityLabel={proposalLabel(proposal, on)}
              value={accepted.includes(proposal.kind)}
              onValueChange={(checked) =>
                onChange(checked ? [...accepted, proposal.kind] : accepted.filter((kind) => kind !== proposal.kind))
              }
              // Sans couleur « false », la piste est transparente sur le web : il ne reste qu'un rond.
              trackColor={{ false: colors.textMuted, true: colors.primary }}
            />
          </ProposalRow>
        ))}
      </Group>
    </View>
  );
}

type PlantProposalsProps = { plant: Plant; species: Species; proposals: ReminderProposal[]; on: DateOnly };

/**
 * Sur la fiche : ce qui n'a pas été coché à la création reste à portée, à ajouter d'un toucher, ou
 * à écarter quand il ne convient pas (« Planter » pour un arbre déjà en place).
 */
export function PlantProposals({ plant, species, proposals, on }: PlantProposalsProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const save = useSaveTask();
  const setDismissed = useSetProposalDismissed();
  const remove = useDeleteTask();
  const showUndo = useShowUndo();
  if (proposals.length === 0) return null;

  const add = (proposal: ReminderProposal) =>
    save.mutate(
      { input: proposalTask(proposal, { spaceId: plant.spaceId, zoneId: plant.zoneId, itemId: plant.id }) },
      {
        onSuccess: (task) =>
          showUndo({
            message: `Rappel ajouté : ${lowerFirst(proposalTitle(proposal))}`,
            onUndo: () => remove.mutate(task.id, { onError: (e) => notify("Le rappel n'a pas été retiré", e.message) }),
            action: {
              label: 'Modifier',
              onPress: () => router.push({ pathname: '/task/form', params: { id: String(task.id) } }),
            },
          }),
        onError: (e) => notify("Le rappel n'a pas été ajouté", e.message),
      },
    );

  const dismiss = (proposal: ReminderProposal) =>
    setDismissed.mutate(
      { plantId: plant.id, kind: proposal.kind, dismissed: true },
      {
        onSuccess: () =>
          showUndo({
            message: `Proposition écartée : ${lowerFirst(proposalTitle(proposal))}`,
            onUndo: () => setDismissed.mutate({ plantId: plant.id, kind: proposal.kind, dismissed: false }),
          }),
        onError: (e) => notify("La proposition n'a pas été écartée", e.message),
      },
    );

  return (
    <View style={styles.section}>
      <SectionTitle>Proposé pour {speciesWithArticle(species)}</SectionTitle>
      <Group>
        {proposals.map((proposal) => (
          <ProposalRow key={proposal.kind} proposal={proposal} on={on}>
            <Button
              title="Ajouter"
              variant="secondary"
              accessibleName={`Ajouter : ${proposalLabel(proposal, on)}`}
              disabled={save.isPending}
              onPress={() => add(proposal)}
            />
            <Pressable
              onPress={() => dismiss(proposal)}
              disabled={setDismissed.isPending}
              accessibilityRole="button"
              accessibilityLabel={`Écarter : ${proposalLabel(proposal, on)}`}
              hitSlop={4}
              style={({ pressed }) => [styles.dismiss, pressed && { opacity: 0.6 }]}>
              <Ionicons aria-hidden name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </ProposalRow>
        ))}
      </Group>
    </View>
  );
}

const useStyles = createStyles(({ colors, fonts, typography, spacing, radius }) => ({
  section: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, padding: spacing.sm },
  tile: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tile,
  },
  text: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.bodySemiBold, fontSize: 16, lineHeight: 21, color: colors.text },
  start: { ...typography.caption, color: colors.textMuted },
  dismiss: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -spacing.xs },
}));
