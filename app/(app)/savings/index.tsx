import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import {
  getSavingsOverview,
  getSavingsEntries,
  deleteSavingsEntry,
  renewSavingsPlan,
} from "@/lib/api/savings.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { Spinner } from "@/components/ui/Spinner";
import { colors } from "@/components/ui/theme";
import { PageHeader } from "@/components/ui/PageHeader";
import { SegmentedTabs } from "@/components/savings/SegmentedTabs";
import { OverviewTab } from "@/components/savings/OverviewTab";
import { ActivityTab } from "@/components/savings/ActivityTab";
import { TargetsTab } from "@/components/savings/TargetsTab";
import { PlanTab } from "@/components/savings/PlanTab";
import { NoPlanState } from "@/components/savings/NoPlanState";
import { currentMonthKey, fmt } from "@/components/savings/format";
import type { SavingsEntry } from "@/types/finance";

type Tab = "overview" | "activity" | "targets" | "plan";

export default function SavingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const [year, setYear] = useState(new Date().getFullYear());
  const [tab, setTab] = useState<Tab>("overview");
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["savings", year],
    queryFn: () => getSavingsOverview(year),
  });

  const plan = data?.plan ?? null;
  const isManual = plan?.mode === "manual";

  const entriesQuery = useQuery({
    queryKey: ["savings-entries", year],
    queryFn: () => getSavingsEntries({ year }),
    enabled: isManual,
  });
  const entries = entriesQuery.data ?? [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["savings"] });
    qc.invalidateQueries({ queryKey: ["savings-entries"] });
  };

  const deleteEntryMut = useMutation({
    mutationFn: deleteSavingsEntry,
    onSuccess: invalidate,
    onError: (err) => Alert.alert("Error", getApiErrorMessage(err, "Failed to delete")),
  });

  const renewMut = useMutation({
    mutationFn: () => renewSavingsPlan({ year, keepTargets: true }),
    onSuccess: invalidate,
    onError: (err) => Alert.alert("Error", getApiErrorMessage(err, "Failed to create plan")),
  });

  const confirmDeleteEntry = (e: SavingsEntry) => {
    const label = e.type === "deposit" ? "deposit" : "withdrawal";
    Alert.alert("Delete entry", `Delete this ${fmt(e.amount)} ${label}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteEntryMut.mutate(e.id) },
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["savings"] }),
        qc.invalidateQueries({ queryKey: ["savings-entries"] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const openPlanForm = (params: Record<string, string>) =>
    router.push({ pathname: "/(app)/savings/plan" as any, params });

  const addEntry = () =>
    router.push({ pathname: "/(app)/savings/entry" as any, params: { year: String(year) } });

  const editPlan = () => plan && openPlanForm({ id: String(plan.id), year: String(year) });

  const changeYear = (next: number) => {
    setYear(next);
    setSelectedMonth(null);
  };

  const defaultMonth = year === new Date().getFullYear() ? currentMonthKey() : `Dec-${year}`;
  const month = selectedMonth ?? defaultMonth;

  const openTargets = (m?: string) => {
    if (m) setSelectedMonth(m);
    setTab("targets");
  };

  // Activity only exists in manual mode (auto mode has no entries)
  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    ...(isManual ? [{ key: "activity" as Tab, label: "Activity" }] : []),
    { key: "targets", label: "Targets" },
    { key: "plan", label: "Plan" },
  ];
  const activeTab: Tab = tab === "activity" && !isManual ? "overview" : tab;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <PageHeader
        title="Savings"
        variant="teal"
        rightActions={isManual ? [{ icon: "plus" as const, onPress: addEntry }] : []}
      />

      {/* Year navigator */}
      <View style={s.yearNav}>
        <TouchableOpacity onPress={() => changeYear(year - 1)} hitSlop={8} style={s.yearBtn}>
          <Feather name="chevron-left" size={20} color={colors.teal[700]} />
        </TouchableOpacity>
        <Text style={s.yearLabel}>{year}</Text>
        <TouchableOpacity onPress={() => changeYear(year + 1)} hitSlop={8} style={s.yearBtn}>
          <Feather name="chevron-right" size={20} color={colors.teal[700]} />
        </TouchableOpacity>
      </View>

      {data?.hasPlan && <SegmentedTabs tabs={tabs} value={activeTab} onChange={setTab} />}

      {isLoading ? (
        <View style={s.center}><Spinner /></View>
      ) : isError ? (
        <View style={s.center}>
          <Text style={s.errorText}>{getApiErrorMessage(error, "Failed to load savings")}</Text>
          <TouchableOpacity style={s.primaryBtn} onPress={() => refetch()}>
            <Text style={s.primaryBtnLabel}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.teal[600]]}
              tintColor={colors.teal[600]}
            />
          }
        >
          {!data?.hasPlan || !plan ? (
            <NoPlanState
              year={year}
              previousPlan={data?.previousPlan ?? null}
              renewing={renewMut.isPending}
              onRenew={() => renewMut.mutate()}
              onOpenForm={openPlanForm}
            />
          ) : activeTab === "overview" ? (
            <OverviewTab
              year={year}
              plan={plan}
              data={data}
              entries={entries}
              onOpenTargets={openTargets}
              onOpenActivity={() => setTab("activity")}
              onAddEntry={addEntry}
            />
          ) : activeTab === "activity" ? (
            <ActivityTab
              year={year}
              entries={entries}
              isLoading={entriesQuery.isLoading}
              isError={entriesQuery.isError}
              error={entriesQuery.error}
              onRetry={() => entriesQuery.refetch()}
              onDelete={confirmDeleteEntry}
              onAddEntry={addEntry}
            />
          ) : activeTab === "targets" ? (
            <TargetsTab
              year={year}
              plan={plan}
              selectedMonth={month}
              onSelectMonth={setSelectedMonth}
              onEditPlan={editPlan}
            />
          ) : (
            <PlanTab year={year} plan={plan} lifetime={data.lifetime} onEdit={editPlan} />
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },

  yearNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 20,
    backgroundColor: "#fff",
  },
  yearBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  yearLabel: { fontSize: 16, fontWeight: "700", color: colors.gray[800], minWidth: 90, textAlign: "center" },

  list: { padding: 16, gap: 12 },

  errorText: { fontSize: 14, color: colors.red[500], textAlign: "center" },
  primaryBtn: {
    backgroundColor: colors.teal[600],
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  primaryBtnLabel: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
