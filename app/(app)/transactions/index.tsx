import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  ImageBackground,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { getTransactions, deleteTransaction } from "@/lib/api/transactions.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { Spinner } from "@/components/ui/Spinner";
import { colors } from "@/components/ui/theme";
import type { Transaction, TxnType } from "@/types/finance";
import Feather from "@expo/vector-icons/Feather";

const TYPE_COLORS: Record<TxnType, string> = {
  Income: colors.green[500],
  Expense: colors.red[500],
  Transfer: colors.indigo[400],
};
const TYPE_PREFIX: Record<TxnType, string> = {
  Income: "+",
  Expense: "-",
  Transfer: "",
};
const TYPES = [
  { label: "All", value: "" },
  { label: "Income", value: "Income" },
  { label: "Expense", value: "Expense" },
  { label: "Transfer", value: "Transfer" },
];

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

function shiftMonth(month: string, delta: number): string {
  const parts = month.split("-");
  const mon = parts[0];
  const year = parseInt(parts[1], 10);
  const idx = MONTH_NAMES.indexOf(mon);
  const d = new Date(year, idx + delta, 1);
  return `${MONTH_NAMES[d.getMonth()]}-${d.getFullYear()}`;
}

const fmt = (v: number | string) =>
  `৳${Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

function TxnCard({
  txn,
  onEdit,
  onDelete,
}: {
  txn: Transaction;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const amtColor = TYPE_COLORS[txn.type];
  const prefix = TYPE_PREFIX[txn.type];

  const label =
    txn.description ??
    txn.category?.name ??
    (txn.type === "Transfer"
      ? `${txn.fromAccount?.name ?? ""} → ${txn.toAccount?.name ?? ""}`
      : txn.type);

  const subLabel =
    txn.type === "Income"
      ? `To: ${txn.toAccount?.name ?? "—"}`
      : txn.type === "Expense"
        ? `From: ${txn.fromAccount?.name ?? "—"}`
        : `${txn.fromAccount?.name ?? "—"} → ${txn.toAccount?.name ?? "—"}`;

  return (
    <View style={s.txnCard}>
      <TouchableOpacity
        style={s.txnMain}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}
      >
        <View
          style={[
            s.txnIcon,
            { backgroundColor: (txn.category?.color ?? amtColor) + "18" },
          ]}
        >
          <Text style={s.txnEmoji}>{txn.category?.icon ?? "💸"}</Text>
        </View>
        <View style={s.txnInfo}>
          <Text style={s.txnLabel} numberOfLines={1}>
            {label}
          </Text>
          <Text style={s.txnSub} numberOfLines={1}>
            {new Date(txn.txnDate).toLocaleDateString()} · {subLabel}
          </Text>
        </View>
        <View style={s.txnRight}>
          <Text style={[s.txnAmount, { color: amtColor }]}>
            {prefix}
            {fmt(txn.amount)}
          </Text>
          <View style={[s.typeBadge, { backgroundColor: amtColor + "18" }]}>
            <Text style={[s.typeBadgeText, { color: amtColor }]}>
              {txn.type}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={s.txnExpanded}>
          {txn.note ? (
            <Text style={s.expandedNote}>Note: {txn.note}</Text>
          ) : null}
          {txn.referenceNumber ? (
            <Text style={s.expandedNote}>Ref: {txn.referenceNumber}</Text>
          ) : null}
          <View style={s.actionRow}>
            <TouchableOpacity style={s.actionBtn} onPress={onEdit}>
              <Feather name="edit-2" size={13} color={colors.indigo[600]} />
              <Text style={[s.actionLabel, { color: colors.indigo[600] }]}>
                Edit
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} onPress={onDelete}>
              <Feather name="trash-2" size={13} color={colors.red[500]} />
              <Text style={[s.actionLabel, { color: colors.red[500] }]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();

  const [month, setMonth] = useState(currentMonth());
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ["transactions", { month, type, search, page }],
    queryFn: () =>
      getTransactions({
        month,
        type: type || undefined,
        search: search || undefined,
        page,
        limit: 20,
      }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const confirmDelete = (txn: Transaction) => {
    Alert.alert(
      "Delete Transaction",
      `Delete this ${txn.type} of ${fmt(txn.amount)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMut.mutate(txn.id),
        },
      ],
    );
  };

  const txns = data?.data ?? [];
  const meta = data?.meta;
  const thisMon = currentMonth();

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Feather name="arrow-left" size={22} color={colors.gray[700]} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Transactions</Text>
        <TouchableOpacity
          onPress={() => router.push("/(app)/transactions/form")}
          hitSlop={8}
        >
          <Feather name="plus" size={22} color={colors.indigo[600]} />
        </TouchableOpacity>
      </View>

      {/* Month Selector */}
      <View style={s.monthBar}>
        <TouchableOpacity
          onPress={() => {
            setMonth((m) => shiftMonth(m, -1));
            setPage(1);
          }}
          hitSlop={8}
          style={s.monthArrow}
        >
          <Feather name="chevron-left" size={20} color={colors.indigo[600]} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setMonth(thisMon);
            setPage(1);
          }}
          style={s.monthLabelWrap}
        >
          <Text style={s.monthLabel}>{month}</Text>
          {month !== thisMon && <Text style={s.monthReset}>Tap to reset</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setMonth((m) => shiftMonth(m, 1));
            setPage(1);
          }}
          hitSlop={8}
          style={s.monthArrow}
          disabled={month === thisMon}
        >
          <Feather
            name="chevron-right"
            size={20}
            color={month === thisMon ? colors.gray[300] : colors.indigo[600]}
          />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Feather
          name="search"
          size={15}
          color={colors.gray[400]}
          style={s.searchIcon}
        />
        <TextInput
          style={s.searchInput}
          placeholder="Search transactions…"
          placeholderTextColor={colors.gray[300]}
          value={search}
          onChangeText={(v) => {
            setSearch(v);
            setPage(1);
          }}
          returnKeyType="search"
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
            <Feather name="x" size={15} color={colors.gray[400]} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Type Filter */}
      <View style={s.filterRow}>
        {TYPES.map((t) => (
          <TouchableOpacity
            key={t.value}
            style={[s.filterChip, type === t.value && s.filterChipActive]}
            onPress={() => {
              setType(t.value);
              setPage(1);
            }}
          >
            <Text
              style={[
                s.filterChipLabel,
                type === t.value && s.filterChipLabelActive,
              ]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {isLoading ? (
        <View style={s.center}>
          <Spinner />
        </View>
      ) : isError ? (
        <View style={s.center}>
          <Text style={s.errorText}>
            {getApiErrorMessage(error, "Failed to load")}
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
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
        >
          {/* Hero Banner */}
          <ImageBackground
            source={require("../../../assets/sales-hero.png")}
            style={s.hero}
            imageStyle={s.heroImage}
            resizeMode="cover"
          >
            <View style={s.heroContent}>
              <View style={s.heroHeader}>
                <View style={s.heroIconBadge}>
                  <Feather name="activity" size={20} color="#fff" />
                </View>
                <View style={s.heroTextBlock}>
                  <Text style={s.heroEyebrow}>MONTHLY OVERVIEW</Text>
                  <Text style={s.heroTitle}>Transactions</Text>
                  <Text style={s.heroSub}>{month}</Text>
                </View>
              </View>

              {data?.summary && (
                <View style={s.heroStats}>
                  <View style={s.heroStat}>
                    <Text style={s.heroStatLabel}>Income</Text>
                    <Text style={[s.heroStatValue, { color: "#86EFAC" }]}>
                      {fmt(data.summary.income)}
                    </Text>
                  </View>
                  <View style={s.heroStatDivider} />
                  <View style={s.heroStat}>
                    <Text style={s.heroStatLabel}>Expense</Text>
                    <Text style={[s.heroStatValue, { color: "#FCA5A5" }]}>
                      {fmt(data.summary.expense)}
                    </Text>
                  </View>
                  <View style={s.heroStatDivider} />
                  <View style={s.heroStat}>
                    <Text style={s.heroStatLabel}>Savings</Text>
                    <Text
                      style={[
                        s.heroStatValue,
                        {
                          color:
                            data.summary.savings >= 0 ? "#BAE6FD" : "#FCA5A5",
                        },
                      ]}
                    >
                      {fmt(data.summary.savings)}
                    </Text>
                  </View>
                </View>
              )}

              <View style={s.heroFooter}>
                <View style={s.heroStatus}>
                  <View style={s.heroDot} />
                  <Text style={s.heroStatusText}>
                    {txns.length} transactions shown
                  </Text>
                </View>
                {meta && (
                  <Text style={s.heroTotal}>{meta.totalItems} total</Text>
                )}
              </View>
            </View>
          </ImageBackground>
          {txns.length === 0 ? (
            <View style={s.empty}>
              <Feather name="inbox" size={40} color={colors.gray[300]} />
              <Text style={s.emptyText}>No transactions for {month}</Text>
            </View>
          ) : (
            txns.map((txn) => (
              <TxnCard
                key={txn.id}
                txn={txn}
                onEdit={() =>
                  router.push({
                    pathname: "/(app)/transactions/form",
                    params: { id: txn.id },
                  })
                }
                onDelete={() => confirmDelete(txn)}
              />
            ))
          )}
          {meta && meta.totalPages > 1 && (
            <View style={s.pagination}>
              <TouchableOpacity
                style={[s.pageBtn, page === 1 && s.pageBtnDisabled]}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <Feather
                  name="chevron-left"
                  size={18}
                  color={page === 1 ? colors.gray[300] : colors.indigo[600]}
                />
              </TouchableOpacity>
              <Text style={s.pageLabel}>
                {page} / {meta.totalPages}
              </Text>
              <TouchableOpacity
                style={[
                  s.pageBtn,
                  page === meta.totalPages && s.pageBtnDisabled,
                ]}
                onPress={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
              >
                <Feather
                  name="chevron-right"
                  size={18}
                  color={
                    page === meta.totalPages
                      ? colors.gray[300]
                      : colors.indigo[600]
                  }
                />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: colors.gray[900] },

  monthBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  monthArrow: { padding: 8 },
  monthLabelWrap: { alignItems: "center" },
  monthLabel: { fontSize: 16, fontWeight: "800", color: colors.gray[900] },
  monthReset: { fontSize: 10, color: colors.indigo[400], marginTop: 1 },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[200],
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: colors.gray[900] },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    backgroundColor: "#fff",
  },
  filterChipActive: {
    borderColor: colors.indigo[500],
    backgroundColor: colors.indigo[50],
  },
  filterChipLabel: { fontSize: 13, fontWeight: "600", color: colors.gray[500] },
  filterChipLabelActive: { color: colors.indigo[600] },

  summaryRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.gray[100],
    marginBottom: 6,
    overflow: "hidden",
  },
  summaryItem: { flex: 1, alignItems: "center", paddingVertical: 12 },
  summaryLabel: { fontSize: 11, color: colors.gray[400], fontWeight: "600" },
  summaryValue: { fontSize: 14, fontWeight: "800", marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: colors.gray[100] },

  list: { padding: 16, gap: 10 },
  txnCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.gray[100],
    overflow: "hidden",
  },
  txnMain: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  txnIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  txnEmoji: { fontSize: 17 },
  txnInfo: { flex: 1 },
  txnLabel: { fontSize: 14, fontWeight: "700", color: colors.gray[900] },
  txnSub: { fontSize: 11, color: colors.gray[400], marginTop: 2 },
  txnRight: { alignItems: "flex-end", gap: 4 },
  txnAmount: { fontSize: 14, fontWeight: "800" },
  typeBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  typeBadgeText: { fontSize: 10, fontWeight: "700" },
  txnExpanded: {
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    padding: 14,
    gap: 4,
  },
  expandedNote: { fontSize: 12, color: colors.gray[500] },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.gray[50],
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  actionLabel: { fontSize: 12, fontWeight: "600" },
  empty: { alignItems: "center", gap: 12, paddingTop: 60 },
  emptyText: { fontSize: 15, color: colors.gray[400], fontWeight: "600" },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingTop: 8,
  },
  pageBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  pageBtnDisabled: { borderColor: colors.gray[100] },
  pageLabel: { fontSize: 13, fontWeight: "600", color: colors.gray[600] },
  errorText: { fontSize: 14, color: colors.red[500], textAlign: "center" },
  retryBtn: {
    backgroundColor: colors.indigo[600],
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryLabel: { color: "#fff", fontWeight: "700" },
  hero: { borderRadius: 20, overflow: "hidden", marginBottom: 4 },
  heroImage: { borderRadius: 20 },
  heroContent: { padding: 20, backgroundColor: "rgba(15, 23, 42, 0.18)" },
  heroHeader: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  heroIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTextBlock: { flex: 1, gap: 3 },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.65)",
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  heroTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
  heroSub: { fontSize: 12, color: "rgba(255,255,255,0.7)" },
  heroStats: {
    flexDirection: "row",
    marginTop: 18,
    backgroundColor: "rgba(0,0,0,0.15)",
    borderRadius: 14,
    overflow: "hidden",
  },
  heroStat: { flex: 1, alignItems: "center", paddingVertical: 12 },
  heroStatLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "600",
  },
  heroStatValue: { fontSize: 14, fontWeight: "800", marginTop: 3 },
  heroStatDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.12)" },
  heroFooter: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroStatus: { flexDirection: "row", alignItems: "center", gap: 6 },
  heroDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#86EFAC" },
  heroStatusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.75)",
  },
  heroTotal: { fontSize: 11, color: "rgba(255,255,255,0.6)" },
});
