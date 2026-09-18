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
import {
  getBudgetSummary,
  deleteBudget,
  copyBudget,
} from "@/lib/api/budget.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { Spinner } from "@/components/ui/Spinner";
import { colors } from "@/components/ui/theme";
import { PageHeader } from "@/components/ui/PageHeader";
import type { BudgetItem } from "@/types/finance";
import Feather from "@expo/vector-icons/Feather";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function currentMonth() {
  const d = new Date();
  return `${MONTH_NAMES[d.getMonth()]}-${d.getFullYear()}`;
}

function shiftMonth(m: string, delta: number): string {
  const parts = m.split("-");
  const idx = MONTH_NAMES.indexOf(parts[0]);
  const d = new Date(parseInt(parts[1], 10), idx + delta, 1);
  return `${MONTH_NAMES[d.getMonth()]}-${d.getFullYear()}`;
}

function fmt(v: number) {
  return `৳${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  const clamped = Math.min(pct, 100);
  const barColor =
    pct >= 100 ? colors.red[500] : pct >= 80 ? colors.amber[500] : color;
  return (
    <View style={pb.bg}>
      <View
        style={[
          pb.fill,
          { width: `${clamped}%` as any, backgroundColor: barColor },
        ]}
      />
    </View>
  );
}
const pb = StyleSheet.create({
  bg: {
    height: 6,
    backgroundColor: colors.gray[100],
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: { height: 6, borderRadius: 4, minWidth: 4 },
});

function BudgetCard({
  item,
  onEdit,
  onDelete,
  onPress,
}: {
  item: BudgetItem;
  onEdit: () => void;
  onDelete: () => void;
  onPress?: () => void;
}) {
  const isOverall = !item.categoryId;
  const isUnbudgeted = item.budgeted === 0;
  const accentColor = item.categoryColor ?? colors.teal[500];
  const overColor =
    item.percentUsed >= 100
      ? colors.red[500]
      : item.percentUsed >= 80
        ? colors.amber[600]
        : colors.green[600];

  return (
    <TouchableOpacity
      style={[s.card, isUnbudgeted && s.cardUnbudgeted]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={s.cardTop}>
        <View style={[s.iconWrap, { backgroundColor: accentColor + "18" }]}>
          {isOverall ? (
            <Feather name="layers" size={16} color={accentColor} />
          ) : item.categoryIcon ? (
            <Text style={{ fontSize: 16 }}>{item.categoryIcon}</Text>
          ) : (
            <Feather name="tag" size={16} color={accentColor} />
          )}
        </View>

        <View style={s.cardMeta}>
          <View style={s.cardTitleRow}>
            <Text style={s.cardTitle}>
              {isOverall ? "Overall Budget" : (item.categoryName ?? "Category")}
            </Text>
            {isUnbudgeted && (
              <View style={s.unbudgetedBadge}>
                <Text style={s.unbudgetedBadgeLabel}>No budget</Text>
              </View>
            )}
          </View>
          <Text style={s.cardSub}>
            {isUnbudgeted
              ? `${fmt(item.spent)} spent · no budget set`
              : `${fmt(item.spent)} spent of ${fmt(item.budgeted)}`}
          </Text>
        </View>

        <View style={s.cardRight}>
          <Text style={[s.remainLabel, { color: colors.red[500] }]}>
            {isUnbudgeted
              ? `-${fmt(item.spent)}`
              : item.remaining >= 0
                ? fmt(item.remaining)
                : `-${fmt(Math.abs(item.remaining))}`}
          </Text>
          <Text style={s.remainSub}>
            {isUnbudgeted ? "over" : item.remaining >= 0 ? "left" : "over"}
          </Text>
        </View>
      </View>

      {!isUnbudgeted && (
        <>
          <ProgressBar pct={item.percentUsed} color={accentColor} />
          <View style={s.cardFooter}>
            <Text style={[s.pctLabel, { color: overColor }]}>
              {item.percentUsed}% used
            </Text>
            <View style={s.cardActions}>
              <TouchableOpacity
                onPress={onEdit}
                hitSlop={8}
                style={s.actionBtn}
              >
                <Feather name="edit-2" size={13} color={colors.teal[600]} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onDelete}
                hitSlop={8}
                style={s.actionBtn}
              >
                <Feather name="trash-2" size={13} color={colors.red[400]} />
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}

export default function BudgetScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const [month, setMonth] = useState(currentMonth());

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ["budgets", month],
    queryFn: () => getBudgetSummary(month),
  });

  const deleteMut = useMutation({
    mutationFn: deleteBudget,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budgets"] }),
    onError: (err) =>
      Alert.alert("Error", getApiErrorMessage(err, "Failed to delete")),
  });

  const copyMut = useMutation({
    mutationFn: copyBudget,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["budgets"] });
      Alert.alert(
        "Done",
        `Copied ${res.copied} budget(s)${res.skipped ? `, skipped ${res.skipped}` : ""}.`,
      );
    },
    onError: (err) =>
      Alert.alert("Error", getApiErrorMessage(err, "Nothing to copy")),
  });

  const confirmDelete = (item: BudgetItem) => {
    const label = item.categoryName ?? "Overall Budget";
    Alert.alert("Delete Budget", `Delete "${label}" budget?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMut.mutate(item.id),
      },
    ]);
  };

  const confirmCopy = () => {
    const from = shiftMonth(month, -1);
    Alert.alert("Copy Budgets", `Copy all budgets from ${from} to ${month}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Copy",
        onPress: () => copyMut.mutate({ fromMonth: from, toMonth: month }),
      },
    ]);
  };

  const summary = data;
  const overallItem = summary?.items.find((i) => !i.categoryId);
  const budgetedCategoryItems =
    summary?.items.filter((i) => !!i.categoryId && i.budgeted > 0) ?? [];
  const loanItem = summary?.items.find((i) => i.categoryId === -1);
  const unbudgetedCategoryItems =
    summary?.items.filter(
      (i) => !!i.categoryId && i.budgeted === 0 && i.categoryId !== -1,
    ) ?? [];
  const isEmpty = !isLoading && summary?.items.length === 0;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <PageHeader
        title="Budget"
        variant="teal"
        rightActions={[
          {
            icon: "plus",
            onPress: () => router.push("/(app)/budgets/form" as any),
          },
        ]}
      />

      {/* Month navigator */}
      <View style={s.monthNav}>
        <TouchableOpacity
          onPress={() => setMonth(shiftMonth(month, -1))}
          hitSlop={8}
          style={s.monthBtn}
        >
          <Feather name="chevron-left" size={20} color={colors.teal[700]} />
        </TouchableOpacity>
        <Text style={s.monthLabel}>{month}</Text>
        <TouchableOpacity
          onPress={() => setMonth(shiftMonth(month, 1))}
          hitSlop={8}
          style={s.monthBtn}
        >
          <Feather name="chevron-right" size={20} color={colors.teal[700]} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={s.center}>
          <Spinner />
        </View>
      ) : isError ? (
        <View style={s.center}>
          <Text style={s.errorText}>
            {getApiErrorMessage(error, "Failed to load budgets")}
          </Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
            <Text style={s.retryLabel}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            s.list,
            { paddingBottom: insets.bottom + 24 },
          ]}
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
          {/* Summary card */}
          {summary && summary.items.length > 0 && (
            <View style={s.summaryCard}>
              <View style={s.summaryRow}>
                <View style={s.summaryItem}>
                  <Text style={s.summaryValue}>
                    {fmt(summary.totalBudgeted)}
                  </Text>
                  <Text style={s.summaryKey}>Budgeted</Text>
                </View>
                <View style={s.summarySep} />
                <View style={s.summaryItem}>
                  <Text style={[s.summaryValue, { color: colors.red[500] }]}>
                    {fmt(summary.totalSpent)}
                  </Text>
                  <Text style={s.summaryKey}>Spent</Text>
                </View>
                <View style={s.summarySep} />
                <View style={s.summaryItem}>
                  <Text
                    style={[
                      s.summaryValue,
                      {
                        color:
                          summary.totalRemaining >= 0
                            ? colors.green[600]
                            : colors.red[500],
                      },
                    ]}
                  >
                    {summary.totalRemaining >= 0
                      ? fmt(summary.totalRemaining)
                      : `-${fmt(Math.abs(summary.totalRemaining))}`}
                  </Text>
                  <Text style={s.summaryKey}>Remaining</Text>
                </View>
              </View>
              <View style={s.summaryBarWrap}>
                <ProgressBar
                  pct={summary.percentUsed}
                  color={colors.teal[500]}
                />
                <Text style={s.summaryPct}>
                  {summary.percentUsed}% of budget used
                </Text>
              </View>
            </View>
          )}

          {isEmpty ? (
            <View style={s.empty}>
              <View style={s.emptyIconWrap}>
                <Feather name="pie-chart" size={28} color={colors.teal[400]} />
              </View>
              <Text style={s.emptyText}>No budgets for {month}</Text>
              <View style={s.emptyActions}>
                <TouchableOpacity
                  style={s.emptyBtn}
                  onPress={() => router.push("/(app)/budgets/form" as any)}
                >
                  <Feather name="plus" size={15} color="#fff" />
                  <Text style={s.emptyBtnLabel}>Add Budget</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.emptyBtnOutline}
                  onPress={confirmCopy}
                  disabled={copyMut.isPending}
                >
                  <Feather name="copy" size={15} color={colors.teal[600]} />
                  <Text style={s.emptyBtnOutlineLabel}>
                    Copy from {shiftMonth(month, -1)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {/* Overall budget */}
              {overallItem && (
                <>
                  <Text style={s.sectionLabel}>Overall</Text>
                  <BudgetCard
                    item={overallItem}
                    onEdit={() =>
                      router.push({
                        pathname: "/(app)/budgets/form" as any,
                        params: { id: overallItem.id, month },
                      })
                    }
                    onDelete={() => confirmDelete(overallItem)}
                  />
                </>
              )}

              {/* Budgeted categories */}
              {budgetedCategoryItems.length > 0 && (
                <>
                  <Text style={s.sectionLabel}>By Category</Text>
                  {budgetedCategoryItems.map((item) => (
                    <BudgetCard
                      key={item.id}
                      item={item}
                      onEdit={() =>
                        router.push({
                          pathname: "/(app)/budgets/form" as any,
                          params: { id: item.id, month },
                        })
                      }
                      onDelete={() => confirmDelete(item)}
                      onPress={() =>
                        router.push({
                          pathname: "/(app)/transactions" as any,
                          params: {
                            month,
                            categoryId: item.categoryId,
                            type: "Expense",
                          },
                        })
                      }
                    />
                  ))}
                </>
              )}

              {/* Unbudgeted categories with spend */}
              {unbudgetedCategoryItems.length > 0 && (
                <>
                  <Text style={s.sectionLabel}>Unbudgeted Spend</Text>
                  {unbudgetedCategoryItems.map((item) => (
                    <BudgetCard
                      key={`unbudgeted-${item.categoryId}`}
                      item={item}
                      onEdit={() => {}}
                      onDelete={() => {}}
                      onPress={() =>
                        router.push({
                          pathname: "/(app)/transactions" as any,
                          params: {
                            month,
                            categoryId: item.categoryId,
                            type: "Expense",
                          },
                        })
                      }
                    />
                  ))}
                </>
              )}
              {loanItem && (
                <>
                  <Text style={s.sectionLabel}>Loan Expenses</Text>
                  <BudgetCard
                    key="loan"
                    item={loanItem}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    onPress={() =>
                      router.push({
                        pathname: "/(app)/transactions" as any,
                        params: {
                          month,
                          type: "Expense",
                          nullCategory: "true",
                        },
                      })
                    }
                  />
                </>
              )}

              {/* Copy from prev month
              <TouchableOpacity
                style={s.copyBtn}
                onPress={confirmCopy}
                disabled={copyMut.isPending}
              >
                <Feather name="copy" size={14} color={colors.teal[600]} />
                <Text style={s.copyBtnLabel}>
                  {copyMut.isPending
                    ? "Copying…"
                    : `Copy from ${shiftMonth(month, -1)}`}
                </Text>
              </TouchableOpacity> */}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },

  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  monthBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.gray[800],
    minWidth: 90,
    textAlign: "center",
  },

  list: { padding: 16, gap: 10 },

  summaryCard: {
    backgroundColor: colors.teal[700],
    borderRadius: 18,
    padding: 18,
    gap: 14,
  },
  summaryRow: { flexDirection: "row", alignItems: "center" },
  summaryItem: { flex: 1, alignItems: "center", gap: 2 },
  summaryValue: { fontSize: 16, fontWeight: "800", color: "#fff" },
  summaryKey: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "600",
  },
  summarySep: {
    width: 1,
    height: 36,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  summaryBarWrap: { gap: 6 },
  summaryPct: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    textAlign: "right",
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.gray[400],
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 4,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray[100],
    padding: 14,
    gap: 10,
  },
  cardUnbudgeted: {
    borderColor: colors.red[100],
    backgroundColor: colors.red[50],
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardMeta: { flex: 1, gap: 2 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: colors.gray[900] },
  cardSub: { fontSize: 12, color: colors.gray[400] },
  cardRight: { alignItems: "flex-end", gap: 1 },
  remainLabel: { fontSize: 15, fontWeight: "800" },
  remainSub: { fontSize: 10, color: colors.gray[400], fontWeight: "600" },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pctLabel: { fontSize: 12, fontWeight: "700" },
  cardActions: { flexDirection: "row", gap: 8 },
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

  unbudgetedBadge: {
    backgroundColor: colors.red[100],
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  unbudgetedBadgeLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.red[500],
  },

  empty: { alignItems: "center", gap: 14, paddingTop: 60 },
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
  emptyText: { fontSize: 15, color: colors.gray[400], fontWeight: "600" },
  emptyActions: { gap: 10, alignItems: "center" },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.teal[600],
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emptyBtnLabel: { color: "#fff", fontWeight: "700", fontSize: 14 },
  emptyBtnOutline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.teal[300],
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emptyBtnOutlineLabel: {
    color: colors.teal[600],
    fontWeight: "700",
    fontSize: 14,
  },

  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.teal[100],
    backgroundColor: colors.teal[50],
    marginTop: 4,
  },
  copyBtnLabel: { fontSize: 13, fontWeight: "700", color: colors.teal[600] },

  errorText: { fontSize: 14, color: colors.red[500], textAlign: "center" },
  retryBtn: {
    backgroundColor: colors.teal[600],
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryLabel: { color: "#fff", fontWeight: "700" },
});
