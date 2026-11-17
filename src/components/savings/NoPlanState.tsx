import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { colors } from "@/components/ui/theme";
import { targetSummary } from "./format";
import type { SavingsPlan } from "@/types/finance";

/** Shown when the selected year has no plan: renew the previous one or create a new one. */
export function NoPlanState({
  year,
  previousPlan,
  renewing,
  onRenew,
  onOpenForm,
}: {
  year: number;
  previousPlan: SavingsPlan | null;
  renewing: boolean;
  onRenew: () => void;
  onOpenForm: (params: Record<string, string>) => void;
}) {
  if (previousPlan) {
    return (
      <View style={s.card}>
        <View style={s.top}>
          <View style={[s.iconWrap, { backgroundColor: colors.teal[50] }]}>
            <Feather name="refresh-cw" size={18} color={colors.teal[600]} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.title}>Start your {year} plan</Text>
            <Text style={s.sub}>
              {previousPlan.year}: {previousPlan.mode === "auto" ? "Auto" : "Manual"} · {targetSummary(previousPlan)}
            </Text>
          </View>
        </View>
        <View style={s.btnRow}>
          <TouchableOpacity style={[s.primaryBtn, { flex: 1 }]} onPress={onRenew} disabled={renewing}>
            <Text style={s.primaryBtnLabel}>{renewing ? "Creating…" : "Keep targets"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.outlineBtn, { flex: 1 }]}
            onPress={() => onOpenForm({ year: String(year), renew: "1" })}
          >
            <Text style={s.outlineBtnLabel}>Update targets</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.empty}>
      <View style={s.emptyIconWrap}>
        <Feather name="target" size={28} color={colors.teal[400]} />
      </View>
      <Text style={s.emptyText}>No savings plan for {year}</Text>
      <Text style={s.emptySub}>
        Track savings automatically from your income and expenses, or log them manually.
      </Text>
      <TouchableOpacity style={s.primaryBtn} onPress={() => onOpenForm({ year: String(year) })}>
        <Feather name="plus" size={15} color="#fff" />
        <Text style={s.primaryBtnLabel}>Create plan</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray[100],
    padding: 14,
    gap: 12,
  },
  top: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 14, fontWeight: "700", color: colors.gray[900] },
  sub: { fontSize: 12, color: colors.gray[400] },
  btnRow: { flexDirection: "row", gap: 10 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.teal[600],
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  primaryBtnLabel: { color: "#fff", fontWeight: "700", fontSize: 14 },
  outlineBtn: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.teal[300],
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  outlineBtnLabel: { color: colors.teal[600], fontWeight: "700", fontSize: 14 },
  empty: { alignItems: "center", gap: 12, paddingTop: 60, paddingHorizontal: 16 },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.teal[50],
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.teal[100],
  },
  emptyText: { fontSize: 15, color: colors.gray[500], fontWeight: "700" },
  emptySub: { fontSize: 13, color: colors.gray[400], textAlign: "center" },
});
