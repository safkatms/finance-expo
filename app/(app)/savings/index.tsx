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
import type { SavingsEntry, SavingsPlan } from "@/types/finance";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function currentMonth() {
  const d = new Date();
  return `${MONTH_NAMES[d.getMonth()]}-${d.getFullYear()}`;
}

function fmt(v: number) {
  const abs = `৳${Math.abs(v).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return v < 0 ? `-${abs}` : abs;
}

function displayDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function targetSummary(plan: SavingsPlan) {
  const parts: string[] = [];
  if (plan.monthlyTarget !== null) parts.push(`${fmt(plan.monthlyTarget)}/month`);
  if (plan.yearlyTarget !== null) parts.push(`${fmt(plan.yearlyTarget)}/year`);
  return parts.length ? parts.join(" · ") : "No target";
}

function ProgressBar({ pct, color, track }: { pct: number; color: string; track?: string }) {
  const clamped = Math.max(0, Math.min(pct, 100));
  return (
    <View style={[pb.bg, track ? { backgroundColor: track } : null]}>
      <View style={[pb.fill, { width: `${clamped}%` as any, backgroundColor: color }]} />
    </View>
  );
}
const pb = StyleSheet.create({
  bg: { height: 6, backgroundColor: colors.gray[100], borderRadius: 4, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4 },
});

function progressColor(pct: number) {
  return pct >= 100 ? colors.green[500] : pct >= 50 ? colors.teal[500] : colors.amber[500];
}

export default function SavingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const [year, setYear] = useState(new Date().getFullYear());

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ["savings", year],
    queryFn: () => getSavingsOverview(year),
  });

  const plan = data?.plan ?? null;
  const isManual = plan?.mode === "manual";

  const { data: entries = [] } = useQuery({
    queryKey: ["savings-entries", year],
    queryFn: () => getSavingsEntries({ year }),
    enabled: isManual,
  });

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

  const openPlanForm = (params: Record<string, string>) =>
    router.push({ pathname: "/(app)/savings/plan" as any, params });

  const headerActions = plan
    ? [
        ...(isManual
          ? [{
              icon: "plus" as const,
              onPress: () =>
                router.push({ pathname: "/(app)/savings/entry" as any, params: { year: String(year) } }),
            }]
          : []),
        { icon: "edit-2" as const, onPress: () => openPlanForm({ id: String(plan.id), year: String(year) }) },
      ]
    : [];

  const nowMonth = currentMonth();
  const cm = data?.currentMonth;
  const yearly = data?.yearly;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <PageHeader title="Savings" variant="teal" rightActions={headerActions} />

      {/* Year navigator */}
      <View style={s.yearNav}>
        <TouchableOpacity onPress={() => setYear(year - 1)} hitSlop={8} style={s.yearBtn}>
          <Feather name="chevron-left" size={20} color={colors.teal[700]} />
        </TouchableOpacity>
        <Text style={s.yearLabel}>{year}</Text>
        <TouchableOpacity onPress={() => setYear(year + 1)} hitSlop={8} style={s.yearBtn}>
          <Feather name="chevron-right" size={20} color={colors.teal[700]} />
        </TouchableOpacity>
      </View>

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
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[colors.teal[600]]}
              tintColor={colors.teal[600]}
            />
          }
        >
          {!data?.hasPlan ? (
            <>
              {data?.previousPlan ? (
                <View style={s.card}>
                  <View style={s.cardTop}>
                    <View style={[s.iconWrap, { backgroundColor: colors.teal[50] }]}>
                      <Feather name="refresh-cw" size={18} color={colors.teal[600]} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={s.cardTitle}>Start your {year} plan</Text>
                      <Text style={s.cardSub}>
                        {data.previousPlan.year}: {data.previousPlan.mode === "auto" ? "Auto" : "Manual"} · {targetSummary(data.previousPlan)}
                      </Text>
                    </View>
                  </View>
                  <View style={s.btnRow}>
                    <TouchableOpacity
                      style={[s.primaryBtn, { flex: 1 }]}
                      onPress={() => renewMut.mutate()}
                      disabled={renewMut.isPending}
                    >
                      <Text style={s.primaryBtnLabel}>
                        {renewMut.isPending ? "Creating…" : "Keep targets"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.outlineBtn, { flex: 1 }]}
                      onPress={() => openPlanForm({ year: String(year), renew: "1" })}
                    >
                      <Text style={s.outlineBtnLabel}>Update targets</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={s.empty}>
                  <View style={s.emptyIconWrap}>
                    <Feather name="target" size={28} color={colors.teal[400]} />
                  </View>
                  <Text style={s.emptyText}>No savings plan for {year}</Text>
                  <Text style={s.emptySub}>
                    Track savings automatically from your income and expenses, or log them manually.
                  </Text>
                  <TouchableOpacity style={s.primaryBtn} onPress={() => openPlanForm({ year: String(year) })}>
                    <Feather name="plus" size={15} color="#fff" />
                    <Text style={s.primaryBtnLabel}>Create plan</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : (
            plan && cm && yearly && (
              <>
                {/* This month */}
                <View style={s.heroCard}>
                  <View style={s.heroTop}>
                    <Text style={s.heroKey}>{cm.month === nowMonth ? "This month" : cm.month}</Text>
                    <View style={s.modeBadge}>
                      <Feather name={isManual ? "edit-3" : "zap"} size={11} color="#fff" />
                      <Text style={s.modeBadgeLabel}>{isManual ? "Manual" : "Auto"}</Text>
                    </View>
                  </View>
                  <Text style={s.heroValue}>{fmt(cm.saved)}</Text>
                  {cm.target !== null && cm.percent !== null && (
                    <View style={{ gap: 6 }}>
                      <ProgressBar pct={cm.percent} color="#fff" track="rgba(255,255,255,0.2)" />
                      <Text style={s.heroSub}>
                        {cm.percent}% of {fmt(cm.target)} monthly target
                      </Text>
                    </View>
                  )}
                  <View style={s.heroRow}>
                    {isManual ? (
                      <>
                        <HeroStat label="Deposited" value={fmt(cm.deposits)} />
                        <HeroStat label="Withdrawn" value={fmt(cm.withdrawals)} />
                      </>
                    ) : (
                      <>
                        <HeroStat label="Income" value={fmt(cm.income)} />
                        <HeroStat label="Expense" value={fmt(cm.expense)} />
                        {cm.expectedSavings !== null && (
                          <HeroStat label="Expected (budget)" value={fmt(cm.expectedSavings)} />
                        )}
                      </>
                    )}
                  </View>
                </View>

                {/* Yearly */}
                <View style={s.card}>
                  <View style={s.rowBetween}>
                    <Text style={s.cardTitle}>{year} progress</Text>
                    <Text style={[s.cardValue, { color: yearly.saved >= 0 ? colors.green[600] : colors.red[500] }]}>
                      {fmt(yearly.saved)}
                    </Text>
                  </View>
                  {yearly.target !== null && yearly.percent !== null ? (
                    <>
                      <ProgressBar pct={yearly.percent} color={progressColor(yearly.percent)} />
                      <Text style={s.cardSub}>
                        {yearly.percent}% of {fmt(yearly.target)}
                        {yearly.targetDerived ? " (12 × monthly target)" : " yearly target"}
                      </Text>
                    </>
                  ) : (
                    <Text style={s.cardSub}>No target set</Text>
                  )}
                  <Text style={s.cardHint}>Targets: {targetSummary(plan)}</Text>
                </View>

                {/* Lifetime */}
                <View style={s.card}>
                  <View style={s.rowBetween}>
                    <Text style={s.cardTitle}>Lifetime savings</Text>
                    <Text style={[s.cardValue, { color: (data?.lifetime.total ?? 0) >= 0 ? colors.green[600] : colors.red[500] }]}>
                      {fmt(data?.lifetime.total ?? 0)}
                    </Text>
                  </View>
                  {data?.lifetime.byYear.map((y) => (
                    <View key={y.year} style={s.rowBetween}>
                      <Text style={s.cardSub}>{y.year} · {y.mode === "auto" ? "Auto" : "Manual"}</Text>
                      <Text style={s.smallValue}>{fmt(y.saved)}</Text>
                    </View>
                  ))}
                </View>

                {/* Months */}
                <Text style={s.sectionLabel}>Monthly</Text>
                <View style={s.card}>
                  {data?.months.map((m) => {
                    const hit = plan.monthlyTarget !== null && m.saved >= plan.monthlyTarget;
                    const isNow = m.month === nowMonth;
                    return (
                      <View key={m.month} style={[s.monthRow, isNow && s.monthRowNow]}>
                        <View style={{ flex: 1, gap: 1 }}>
                          <Text style={[s.monthName, isNow && { color: colors.teal[700] }]}>{m.month}</Text>
                          <Text style={s.monthSub}>
                            {isManual
                              ? `+${fmt(m.deposits)}  −${fmt(m.withdrawals)}`
                              : `In ${fmt(m.income)} · Out ${fmt(m.expense)}`}
                          </Text>
                        </View>
                        {hit && <Feather name="check-circle" size={14} color={colors.green[500]} />}
                        <Text style={[s.monthValue, { color: m.saved < 0 ? colors.red[500] : colors.gray[900] }]}>
                          {fmt(m.saved)}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {/* Manual entries */}
                {isManual && (
                  <>
                    <View style={s.rowBetween}>
                      <Text style={s.sectionLabel}>Entries</Text>
                      <TouchableOpacity
                        onPress={() =>
                          router.push({ pathname: "/(app)/savings/entry" as any, params: { year: String(year) } })
                        }
                        hitSlop={8}
                      >
                        <Text style={s.linkLabel}>+ Add</Text>
                      </TouchableOpacity>
                    </View>
                    {entries.length === 0 ? (
                      <Text style={s.cardSub}>No entries yet for {year}.</Text>
                    ) : (
                      entries.map((e) => {
                        const isDeposit = e.type === "deposit";
                        return (
                          <View key={e.id} style={[s.card, s.entryCard]}>
                            <View style={[s.iconWrap, { backgroundColor: isDeposit ? colors.green[50] : colors.red[50] }]}>
                              <Feather
                                name={isDeposit ? "arrow-down-circle" : "arrow-up-circle"}
                                size={18}
                                color={isDeposit ? colors.green[600] : colors.red[500]}
                              />
                            </View>
                            <View style={{ flex: 1, gap: 2 }}>
                              <Text style={s.cardTitle}>
                                {isDeposit ? "Deposit" : "Withdraw"} · {e.account?.name ?? "Account"}
                              </Text>
                              <Text style={s.cardSub}>
                                {displayDate(e.entryDate)}{e.note ? ` · ${e.note}` : ""}
                              </Text>
                            </View>
                            <Text style={[s.smallValue, { color: isDeposit ? colors.green[600] : colors.red[500] }]}>
                              {isDeposit ? "+" : "−"}{fmt(e.amount)}
                            </Text>
                            <TouchableOpacity onPress={() => confirmDeleteEntry(e)} hitSlop={8} style={s.actionBtn}>
                              <Feather name="trash-2" size={13} color={colors.red[400]} />
                            </TouchableOpacity>
                          </View>
                        );
                      })
                    )}
                  </>
                )}

                <Text style={s.footnote}>
                  Savings are tracked only — account balances don't change unless you record a real transaction.
                </Text>
              </>
            )
          )}
        </ScrollView>
      )}
    </View>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={s.heroStatValue}>{value}</Text>
      <Text style={s.heroStatKey}>{label}</Text>
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
    paddingVertical: 12,
    gap: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  yearBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  yearLabel: { fontSize: 16, fontWeight: "700", color: colors.gray[800], minWidth: 90, textAlign: "center" },

  list: { padding: 16, gap: 10 },

  heroCard: { backgroundColor: colors.teal[700], borderRadius: 18, padding: 18, gap: 12 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroKey: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: 0.6 },
  heroValue: { fontSize: 28, fontWeight: "800", color: "#fff" },
  heroSub: { fontSize: 11, color: "rgba(255,255,255,0.8)", textAlign: "right" },
  heroRow: { flexDirection: "row", gap: 8, paddingTop: 4 },
  heroStatValue: { fontSize: 14, fontWeight: "800", color: "#fff" },
  heroStatKey: { fontSize: 10, fontWeight: "600", color: "rgba(255,255,255,0.7)" },
  modeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  modeBadgeLabel: { fontSize: 11, fontWeight: "700", color: "#fff" },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.gray[400],
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 4,
  },
  linkLabel: { fontSize: 13, fontWeight: "700", color: colors.teal[600], marginTop: 4 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray[100],
    padding: 14,
    gap: 10,
  },
  entryCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 14, fontWeight: "700", color: colors.gray[900] },
  cardSub: { fontSize: 12, color: colors.gray[400] },
  cardHint: { fontSize: 11, color: colors.gray[500], fontWeight: "600" },
  cardValue: { fontSize: 16, fontWeight: "800" },
  smallValue: { fontSize: 13, fontWeight: "700", color: colors.gray[800] },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  monthRowNow: { backgroundColor: colors.teal[50] },
  monthName: { fontSize: 13, fontWeight: "700", color: colors.gray[800] },
  monthSub: { fontSize: 11, color: colors.gray[400] },
  monthValue: { fontSize: 13, fontWeight: "800", minWidth: 80, textAlign: "right" },

  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.gray[50],
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.gray[100],
  },

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

  footnote: { fontSize: 11, color: colors.gray[400], textAlign: "center", marginTop: 8 },
  errorText: { fontSize: 14, color: colors.red[500], textAlign: "center" },
});
