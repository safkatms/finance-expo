import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { colors } from "@/components/ui/theme";
import { MONTH_NAMES, WEEK_DAY_NAMES, fmt } from "./format";
import type { SavingsOverview, SavingsPlan } from "@/types/finance";

/** Plan configuration and management — no analytics beyond lifetime history. */
export function PlanTab({
  year,
  plan,
  lifetime,
  onEdit,
}: {
  year: number;
  plan: SavingsPlan;
  lifetime: SavingsOverview["lifetime"];
  onEdit: () => void;
}) {
  const isManual = plan.mode === "manual";
  const perMonth = plan.monthTargets.length > 0;

  return (
    <>
      {/* Mode */}
      <View style={s.card}>
        <View style={s.modeRow}>
          <View style={[s.iconWrap, { backgroundColor: colors.teal[50] }]}>
            <Feather name={isManual ? "edit-3" : "zap"} size={16} color={colors.teal[600]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>{isManual ? "Manual" : "Auto"} · {year}</Text>
            <Text style={s.sub}>
              {isManual
                ? "You add or withdraw savings yourself, per account."
                : "Income minus expenses, updated as you add transactions."}
            </Text>
          </View>
        </View>
      </View>

      {/* Targets */}
      <Text style={s.sectionLabel}>Targets</Text>
      <View style={s.card}>
        {perMonth ? (
          <Row label="Months" value={`${plan.monthTargets.length} targeted`} />
        ) : (
          <Row label="Monthly" value={plan.monthlyTarget !== null ? fmt(plan.monthlyTarget) : "Not set"} />
        )}
        {perMonth &&
          plan.monthTargets.map((t) => (
            <Row key={t.month} label={`  ${MONTH_NAMES[t.month - 1]}`} value={fmt(t.target)} indent />
          ))}
        <Row
          label="Weekly"
          value={plan.weeklyTarget !== null ? fmt(plan.weeklyTarget) : "Not set"}
        />
        {plan.weeklyTarget !== null && (
          <Row label="  Week starts on" value={WEEK_DAY_NAMES[plan.weekStartsOn] ?? "Mon"} indent />
        )}
        <Row label="Yearly" value={plan.yearlyTarget !== null ? fmt(plan.yearlyTarget) : "Not set"} last />
      </View>

      {plan.notes ? (
        <>
          <Text style={s.sectionLabel}>Notes</Text>
          <View style={s.card}>
            <Text style={s.notes}>{plan.notes}</Text>
          </View>
        </>
      ) : null}

      <TouchableOpacity style={s.editBtn} onPress={onEdit} activeOpacity={0.8}>
        <Feather name="edit-2" size={15} color="#fff" />
        <Text style={s.editLabel}>Edit plan</Text>
      </TouchableOpacity>

      {/* Lifetime */}
      <Text style={s.sectionLabel}>Lifetime savings</Text>
      <View style={s.card}>
        <Row
          label="Total"
          value={fmt(lifetime.total)}
          valueColor={lifetime.total >= 0 ? colors.green[600] : colors.red[500]}
          bold
        />
        {lifetime.byYear.map((y, i) => (
          <Row
            key={y.year}
            label={`${y.year} · ${y.mode === "auto" ? "Auto" : "Manual"}`}
            value={fmt(y.saved)}
            last={i === lifetime.byYear.length - 1}
          />
        ))}
      </View>

      <Text style={s.footnote}>
        Savings are tracked only — account balances don't change unless you record a real transaction.
      </Text>
    </>
  );
}

function Row({
  label,
  value,
  valueColor,
  bold,
  indent,
  last,
}: {
  label: string;
  value: string;
  valueColor?: string;
  bold?: boolean;
  indent?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[s.row, !last && s.rowDivider]}>
      <Text style={[s.rowLabel, indent && { color: colors.gray[400] }, bold && { fontWeight: "800" }]}>
        {label}
      </Text>
      <Text style={[s.rowValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray[100],
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  modeRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 14, fontWeight: "700", color: colors.gray[900] },
  sub: { fontSize: 12, color: colors.gray[500] },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.gray[400],
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginLeft: 4,
    marginTop: 4,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.gray[50] },
  rowLabel: { fontSize: 13, color: colors.gray[700], fontWeight: "600" },
  rowValue: { fontSize: 13, fontWeight: "700", color: colors.gray[900] },
  notes: { fontSize: 13, color: colors.gray[700], paddingVertical: 8 },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.teal[600],
    borderRadius: 12,
    paddingVertical: 12,
  },
  editLabel: { color: "#fff", fontWeight: "700", fontSize: 14 },
  footnote: { fontSize: 11, color: colors.gray[400], textAlign: "center", marginTop: 4 },
});
