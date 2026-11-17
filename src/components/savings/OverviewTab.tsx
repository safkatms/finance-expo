import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { colors } from "@/components/ui/theme";
import { ProgressBar } from "./ProgressBar";
import { ProgressRow } from "./ProgressRow";
import { EntryRow } from "./EntryRow";
import { currentMonthKey, fmt, remainingLabel, shortDate } from "./format";
import type { SavingsEntry, SavingsOverview, SavingsPlan } from "@/types/finance";

/**
 * Landing view: where do I stand? One summary, the current month/week, the 3 latest entries.
 * Weekly/monthly breakdowns and full history live in the Targets and Activity tabs.
 */
export function OverviewTab({
  year,
  plan,
  data,
  entries,
  onOpenTargets,
  onOpenActivity,
  onAddEntry,
}: {
  year: number;
  plan: SavingsPlan;
  data: SavingsOverview;
  entries: SavingsEntry[];
  onOpenTargets: (month?: string) => void;
  onOpenActivity: () => void;
  onAddEntry: () => void;
}) {
  const isManual = plan.mode === "manual";
  const yearly = data.yearly!;
  const cm = data.currentMonth!;
  const nowMonth = currentMonthKey();

  // Same scope as yearly.saved: with per-month targets only targeted months count
  const scoped = plan.monthTargets.length > 0 ? data.months.filter((m) => m.target !== null) : data.months;
  const sum = (key: "deposits" | "withdrawals" | "income" | "expense") =>
    scoped.reduce((t, m) => t + m[key], 0);

  const remaining = remainingLabel(yearly.saved, yearly.target);
  const week = plan.weeklyTarget !== null ? data.currentWeek : null;

  return (
    <>
      {/* Summary */}
      <View style={s.hero}>
        <View style={s.heroTop}>
          <Text style={s.heroKey}>Saved in {year}</Text>
          <View style={s.badge}>
            <Feather name={isManual ? "edit-3" : "zap"} size={11} color="#fff" />
            <Text style={s.badgeLabel}>{isManual ? "Manual" : "Auto"}</Text>
          </View>
        </View>
        <Text style={s.heroValue}>{fmt(yearly.saved)}</Text>

        {yearly.target !== null && yearly.percent !== null ? (
          <View style={{ gap: 6 }}>
            <ProgressBar pct={yearly.percent} color="#fff" track="rgba(255,255,255,0.2)" height={8} />
            <View style={s.heroMetaRow}>
              <Text style={s.heroMeta}>
                {yearly.percent}% of {fmt(yearly.target)}
              </Text>
              {remaining && <Text style={s.heroMeta}>{remaining}</Text>}
            </View>
          </View>
        ) : (
          <Text style={s.heroMeta}>No yearly target</Text>
        )}

        <Text style={s.heroCompact}>
          {isManual
            ? `Deposited ${fmt(sum("deposits"))}  ·  Withdrawn ${fmt(sum("withdrawals"))}`
            : `Income ${fmt(sum("income"))}  ·  Expense ${fmt(sum("expense"))}`}
        </Text>
      </View>

      {/* Current period */}
      <View style={s.card}>
        <ProgressRow
          label={cm.month === nowMonth ? "This month" : cm.month}
          saved={cm.saved}
          target={cm.target}
          percent={cm.percent}
          onPress={() => onOpenTargets(cm.month)}
        />
        {week && (
          <>
            <View style={s.divider} />
            <ProgressRow
              label="This week"
              sublabel={`${shortDate(week.start)} – ${shortDate(week.end)}`}
              saved={week.saved}
              target={week.target}
              percent={week.percent}
              onPress={() => onOpenTargets(cm.month)}
            />
          </>
        )}
      </View>

      {/* Recent activity (manual mode only — auto mode has no entries) */}
      {isManual && (
        <View style={s.card}>
          <View style={s.headRow}>
            <Text style={s.sectionTitle}>Recent activity</Text>
            {entries.length > 0 ? (
              <TouchableOpacity onPress={onOpenActivity} hitSlop={8}>
                <Text style={s.link}>View all</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={onAddEntry} hitSlop={8}>
                <Text style={s.link}>+ Add</Text>
              </TouchableOpacity>
            )}
          </View>
          {entries.length === 0 ? (
            <Text style={s.empty}>No entries yet for {year}.</Text>
          ) : (
            entries.slice(0, 3).map((e) => <EntryRow key={e.id} entry={e} />)
          )}
        </View>
      )}
    </>
  );
}

const s = StyleSheet.create({
  hero: { backgroundColor: colors.teal[700], borderRadius: 18, padding: 18, gap: 12 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroKey: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.75)",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  heroValue: { fontSize: 32, fontWeight: "800", color: "#fff" },
  heroMetaRow: { flexDirection: "row", justifyContent: "space-between" },
  heroMeta: { fontSize: 12, color: "rgba(255,255,255,0.85)" },
  heroCompact: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.75)" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeLabel: { fontSize: 11, fontWeight: "700", color: "#fff" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray[100],
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  divider: { height: 1, backgroundColor: colors.gray[100], marginHorizontal: 6 },
  headRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingTop: 6,
  },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: colors.gray[800] },
  link: { fontSize: 13, fontWeight: "700", color: colors.teal[600] },
  empty: { fontSize: 12, color: colors.gray[400], padding: 6 },
});
