import type { ReactNode } from 'react';
import { Text, useWindowDimensions, View, type ViewStyle } from 'react-native';

import { calendarBrush, CategoryIcon, KindIcon } from '@/components/pictograms';
import { Fact } from '@/components/sections';
import { Group, SectionTitle } from '@/components/ui';
import type { DateOnly } from '@/domain/dates';
import {
  activeWindows,
  fortnights,
  referenceClimate,
  yearCalendar,
  type CalendarBand,
  type Climate,
  type Species,
} from '@/domain/species';
import {
  calendarSummary,
  categoryLabels,
  climateNames,
  exposureLabels,
  formatActiveWindow,
  formatSpacing,
  formatWatering,
  windowKindLabels,
} from '@/lib/species';
import { useToday } from '@/lib/use-today';
import { createStyles, useTheme } from '@/theme';

const monthInitials = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const maxCalendarScale = 1.3;

const percentOfYear = (fortnightCount: number) => `${(fortnightCount / fortnights.length) * 100}%` as const;

/** L'onglet Conseils d'une plante liée au catalogue. `climate` attend le réglage du jardin. */
export function SpeciesAdvice({ species, climate = referenceClimate }: { species: Species; climate?: Climate }) {
  const styles = useStyles();
  const today = useToday();
  const active = activeWindows(species, today, climate);
  const facts = [
    { label: 'Exposition', value: exposureLabels[species.exposure] },
    { label: 'Espacement', value: formatSpacing(species) },
    ...(species.wateringEveryDays ? [{ label: 'Arrosage', value: formatWatering(species.wateringEveryDays) }] : []),
  ];

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <View style={styles.tile}>
          <CategoryIcon category={species.category} />
        </View>
        <View style={styles.headingText}>
          <Text style={styles.name}>{species.name}</Text>
          <Text style={styles.muted}>
            {categoryLabels[species.category]} · {species.scientificName}
          </Text>
        </View>
      </View>

      <SectionTitle>Calendrier</SectionTitle>
      <YearCalendarView species={species} on={today} climate={climate} />

      <SectionTitle>En ce moment</SectionTitle>
      {active.length === 0 ? (
        <Text style={styles.muted}>Rien au calendrier de cette espèce en ce moment.</Text>
      ) : (
        <Group>
          {active.map((window) => (
            <View key={`${window.kind}-${window.range.from}`} style={[styles.row, styles.activeRow]}>
              <KindIcon kind={windowKindLabels[window.kind].icon} size={28} />
              <Text style={styles.rowText}>{formatActiveWindow(window)}</Text>
            </View>
          ))}
        </Group>
      )}

      <SectionTitle>Bon à savoir</SectionTitle>
      <Group>
        {facts.map(({ label, value }) => (
          <View key={label} style={styles.row}>
            <Fact label={label} value={value} />
          </View>
        ))}
      </Group>

      <SectionTitle>Conseils</SectionTitle>
      <Group>
        {species.tips.map((tip) => (
          <Text key={tip} style={[styles.rowText, styles.row]}>
            {tip}
          </Text>
        ))}
      </Group>
    </View>
  );
}

/**
 * Le calendrier est fait de vues plutôt que de Skia : des bandes en pourcentage de la largeur, des
 * libellés qui suivent la taille de police, et rien à attendre du moteur de dessin sur le web.
 */
function YearCalendarView({ species, on, climate }: { species: Species; on: DateOnly; climate: Climate }) {
  const styles = useStyles();
  const { scheme } = useTheme();
  const stacked = useWindowDimensions().fontScale > maxCalendarScale;
  const { rows, current } = yearCalendar(species, on, climate);
  const { ink, tones } = calendarBrush(scheme);
  const currentMonth = Math.floor(current / 2);

  return (
    <Group>
      <View style={styles.calendar}>
        <View accessible accessibilityRole="image" accessibilityLabel={calendarSummary(rows)}>
          <View style={styles.calendarRow}>
            {!stacked && <View style={styles.rowLabel} />}
            <Track style={styles.months}>
              {monthInitials.map((initial, month) => (
                <Text
                  key={month}
                  maxFontSizeMultiplier={maxCalendarScale}
                  style={[styles.month, month === currentMonth && styles.monthCurrent]}>
                  {initial}
                </Text>
              ))}
            </Track>
          </View>
          {rows.map(({ kind, bands }) => (
            <View key={kind} style={stacked ? styles.calendarRowStacked : styles.calendarRow}>
              <View style={[styles.rowLabel, stacked && styles.rowLabelStacked]}>
                <KindIcon kind={windowKindLabels[kind].icon} size={24} />
                <Text style={styles.rowLabelText}>{windowKindLabels[kind].label}</Text>
              </View>
              <Track current={current} style={styles.track}>
                {bands.map((band) => (
                  <Band key={band.start} band={band} color={tones[kind]} ink={ink} />
                ))}
              </Track>
            </View>
          ))}
        </View>
        <View style={styles.legend}>
          <View style={styles.legendMark} />
          <Text style={styles.muted}>Aujourd&apos;hui · Dates pour un {climateNames[climate]}</Text>
        </View>
      </View>
    </Group>
  );
}

/** Une ligne de l'année : un mois sur deux teinté et, s'il est donné, le trait de la quinzaine du jour par-dessus. */
function Track({ current, style, children }: { current?: number; style: ViewStyle; children: ReactNode }) {
  const styles = useStyles();

  return (
    <View style={[styles.trackFrame, style]}>
      {monthInitials.map((_, month) =>
        month % 2 === 1 ? (
          <View key={month} style={[styles.monthTint, { left: percentOfYear(month * 2), width: percentOfYear(2) }]} />
        ) : null,
      )}
      {children}
      {current !== undefined && <View style={[styles.currentMark, { left: percentOfYear(current + 0.5) }]} />}
    </View>
  );
}

function Band({ band: { start, length, wraps }, color, ink }: { band: CalendarBand; color: string; ink: string }) {
  const styles = useStyles();
  const fromYearStart = wraps && start === 0;
  const toYearEnd = wraps && start + length === fortnights.length;

  return (
    <View
      style={[
        styles.band,
        { left: percentOfYear(start), width: percentOfYear(length), backgroundColor: color, borderColor: ink },
        fromYearStart && styles.bandOpenStart,
        toYearEnd && styles.bandOpenEnd,
      ]}
    />
  );
}

const bandHeight = 16;

const useStyles = createStyles(({ colors, fonts, typography, spacing, radius }) => ({
  section: { gap: spacing.sm },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tile: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headingText: { flex: 1 },
  name: { ...typography.subtitle, color: colors.text },
  muted: { ...typography.caption, color: colors.textMuted },
  calendar: { padding: spacing.sm + 4, gap: spacing.sm },
  calendarRow: { flexDirection: 'row', alignItems: 'stretch' },
  calendarRowStacked: { gap: spacing.xs },
  rowLabel: {
    width: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 2,
    paddingRight: spacing.xs,
  },
  rowLabelStacked: { width: 'auto', paddingRight: 0, paddingTop: spacing.sm },
  rowLabelText: { ...typography.caption, lineHeight: 15, fontFamily: fonts.bodyMedium, color: colors.text, flexShrink: 1 },
  trackFrame: { flex: 1 },
  months: { flexDirection: 'row', minHeight: 24 },
  month: { ...typography.caption, flex: 1, textAlign: 'center', color: colors.textMuted },
  monthCurrent: { fontFamily: fonts.heading, color: colors.primary },
  monthTint: { position: 'absolute', top: 0, bottom: 0, backgroundColor: colors.surfaceSunken },
  track: { minHeight: 36 },
  band: {
    position: 'absolute',
    top: '50%',
    marginTop: -bandHeight / 2,
    height: bandHeight,
    borderWidth: 1.5,
    borderRadius: bandHeight / 2,
  },
  bandOpenStart: { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 },
  bandOpenEnd: { borderTopRightRadius: 0, borderBottomRightRadius: 0 },
  currentMark: { position: 'absolute', top: 0, bottom: 0, width: 2, marginLeft: -1, backgroundColor: colors.primary },
  legend: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendMark: { width: 2, height: 14, backgroundColor: colors.primary },
  row: { paddingHorizontal: spacing.sm + 4, paddingVertical: spacing.sm },
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowText: { ...typography.body, color: colors.text, flexShrink: 1 },
}));
