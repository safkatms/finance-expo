import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { getSavingsOverview } from "@/lib/api/savings.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { colors } from "@/components/ui/theme";
import { Spinner } from "@/components/ui/Spinner";
import { ProgressRow } from "./ProgressRow";
import { MONTH_NAMES, currentMonthKey, hasMonthlyTargets, shortDate } from "./format";
import type { SavingsPlan } from "@/types/finance";

/**
 * Target progress, organised Weekly → Monthly → Yearly. Each section only appears when that
 * target is configured. The month chips drive both the weekly list and the monthly card.
 */
export function TargetsTab({
  year,
  plan,
  selectedMonth,
  onSelectMonth,
  onEditPlan,
}: {
  year: number;
  plan: SavingsPlan;
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  onEditPlan: () => void;
}) {
  const [showAllMonths, setShowAllMonths] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["savings", year, "targets", selectedMonth],
    queryFn: () => getSavingsOverview(year, selectedMonth),
  });

  const nowMonth = currentMonthKey();
  const perMonth = plan.monthTargets.length > 0;
  const showWeekly = plan.weeklyTarget !== null;
  const showMonthly = hasMonthlyTargets(plan);
  const showYearly = !!data?.yearly && data.yearly.target !== null;
  const nothingConfigured = !showWeekly && !showMonthly && plan.yearlyTarget === null && !perMonth;

  if (nothingConfigured) {
    return (
      <View style={s.center}>
        <Text style={s.emptyText}>No targets set for {year}</Text>
        <Text style={s.emptySub}>Add a weekly, monthly or yearly target to track your progress.</Text>
        <TouchableOpacity style={s.primaryBtn} onPress={onEditPlan}>
          <Text style={s.primaryBtnLabel}>Set a target</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const monthRow = data?.months.find((m) => m.month === selectedMonth);
  const targetedMonths = data?.months.filter((m) => m.target !== null) ?? [];

  return (
    <>
      {/* Month selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
        {MONTH_NAMES.map((name, i) => {
          const key = `${name}-${year}`;
          const selected = key === selectedMonth;
          const inPlan = !perMonth || plan.monthTargets.some((t) => t.month === i + 1);
          return (
            <TouchableOpacity
              key={key}
              style={[s.chip, selected && s.chipSelected, !inPlan && !selected && { opacity: 0.45 }]}
              onPress={() => onSelectMonth(key)}
            >
              <Text style={[s.chipLabel, selected && s.chipLabelSelected]}>{name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <View style={s.center}><Spinner /></View>
      ) : isError || !data ? (
        <View style={s.center}>
          <Text style={s.errorText}>{getApiErrorMessage(error, "Failed to load targets")}</Text>
          <TouchableOpacity style={s.primaryBtn} onPress={() => refetch()}>
            <Text style={s.primaryBtnLabel}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Weekly */}
          {showWeekly && (
            <Section title={`Weekly · ${selectedMonth}`}>
              {data.weeks.map((w) => (
                <ProgressRow
                  key={w.start}
                  label={`${shortDate(w.start)} – ${shortDate(w.end)}`}
                  sublabel={data.currentWeek?.start === w.start ? "This week" : undefined}
                  saved={w.saved}
                  target={w.target}
                  percent={w.percent}
                  highlight={data.currentWeek?.start === w.start}
                />
              ))}
            </Section>
          )}

          {/* Monthly */}
          {showMonthly && monthRow && (
            <Section title="Monthly">
              {monthRow.target !== null ? (
                <ProgressRow
                  size="lg"
                  label={selectedMonth === nowMonth ? "This month" : selectedMonth}
                  saved={monthRow.saved}
                  target={monthRow.target}
                  percent={data.currentMonth?.percent ?? null}
                />
              ) : (
                <Text style={s.muted}>{selectedMonth} isn't part of this plan's targeted months.</Text>
              )}

              {targetedMonths.length > 1 && (
                <>
                  <TouchableOpacity onPress={() => setShowAllMonths((v) => !v)} hitSlop={8} style={s.toggle}>
                    <Text style={s.link}>{showAllMonths ? "Hide all months" : "Show all months"}</Text>
                  </TouchableOpacity>
                  {showAllMonths &&
                    targetedMonths.map((m) => (
                      <ProgressRow
                        key={m.month}
                        label={m.month}
                        saved={m.saved}
                        target={m.target}
                        percent={m.target ? Math.min(Math.round((m.saved / m.target) * 100), 999) : null}
                        highlight={m.month === selectedMonth}
                        onPress={() => onSelectMonth(m.month)}
                      />
                    ))}
                </>
              )}
            </Section>
          )}

          {/* Yearly */}
          {showYearly && data.yearly && (
            <Section title="Yearly">
              <ProgressRow
                size="lg"
                label={`${year}`}
                sublabel={
                  data.yearly.targetDerived
                    ? perMonth
                      ? "Sum of month targets"
                      : "12 × monthly target"
                    : undefined
                }
                saved={data.yearly.saved}
                target={data.yearly.target}
                percent={data.yearly.percent}
              />
            </Section>
          )}
        </>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.sectionLabel}>{title}</Text>
      <View style={s.card}>{children}</View>
    </View>
  );
}

const s = StyleSheet.create({
  center: { alignItems: "center", gap: 10, paddingVertical: 40, paddingHorizontal: 16 },
  errorText: { fontSize: 14, color: colors.red[500], textAlign: "center" },
  emptyText: { fontSize: 15, color: colors.gray[500], fontWeight: "700" },
  emptySub: { fontSize: 13, color: colors.gray[400], textAlign: "center" },
  primaryBtn: {
    backgroundColor: colors.teal[600],
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  primaryBtnLabel: { color: "#fff", fontWeight: "700", fontSize: 14 },

  chipRow: { gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    backgroundColor: "#fff",
  },
  chipSelected: { borderColor: colors.teal[500], backgroundColor: colors.teal[50] },
  chipLabel: { fontSize: 12, fontWeight: "600", color: colors.gray[600] },
  chipLabelSelected: { color: colors.teal[700] },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.gray[400],
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray[100],
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  muted: { fontSize: 12, color: colors.gray[400], padding: 8 },
  toggle: { paddingHorizontal: 6, paddingVertical: 6 },
  link: { fontSize: 13, fontWeight: "700", color: colors.teal[600] },
});
