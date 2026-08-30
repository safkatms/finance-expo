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
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { getLoans, deleteLoan } from "@/lib/api/loans.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { Spinner } from "@/components/ui/Spinner";
import { colors } from "@/components/ui/theme";
import type { Loan } from "@/types/finance";
import Feather from "@expo/vector-icons/Feather";
import { PageHeader } from "@/components/ui/PageHeader";

const fmt = (v: number | string) =>
  `৳${Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

const STATUS_COLORS: Record<string, string> = {
  Outstanding: colors.red[500],
  PartiallyPaid: colors.amber[500],
  Settled: colors.green[500],
  WrittenOff: colors.gray[400],
};

const DIRECTIONS = [
  { label: "All", value: "" },
  { label: "Lent", value: "Gave" },
  { label: "Borrowed", value: "Received" },
];

const STATUSES = [
  { label: "All", value: "" },
  { label: "Outstanding", value: "Outstanding" },
  { label: "Partial", value: "PartiallyPaid" },
  { label: "Settled", value: "Settled" },
];

function LoanCard({
  loan,
  onPress,
  onDelete,
}: {
  loan: Loan;
  onPress: () => void;
  onDelete: () => void;
}) {
  const isOverdue =
    loan.dueDate &&
    new Date(loan.dueDate) < new Date() &&
    loan.status !== "Settled" &&
    loan.status !== "WrittenOff";

  const dirColor =
    loan.direction === "Gave" ? colors.green[600] : colors.red[600];
  const dirLabel = loan.direction === "Gave" ? "Lent" : "Borrowed";
  const statusColor = STATUS_COLORS[loan.status] ?? colors.gray[400];

  const paidPct =
    Number(loan.amount) > 0
      ? Math.min(Number(loan.totalPaid) / Number(loan.amount), 1)
      : 0;

  return (
    <TouchableOpacity style={s.loanCard} onPress={onPress} activeOpacity={0.7}>
      <View style={s.loanTop}>
        <View style={[s.dirBadge, { backgroundColor: dirColor + "15" }]}>
          <Text style={[s.dirText, { color: dirColor }]}>{dirLabel}</Text>
        </View>
        <View style={s.loanMeta}>
          <Text style={s.personName} numberOfLines={1}>
            {loan.personName}
          </Text>
          {loan.personPhone && (
            <Text style={s.personPhone}>{loan.personPhone}</Text>
          )}
        </View>
        <View style={s.loanRight}>
          <Text style={s.loanAmount}>{fmt(loan.amount)}</Text>
          <View
            style={[s.statusBadge, { backgroundColor: statusColor + "18" }]}
          >
            <Text style={[s.statusText, { color: statusColor }]}>
              {loan.status}
            </Text>
          </View>
        </View>
      </View>

      {/* Progress bar */}
      {loan.status !== "Settled" && (
        <View style={s.progressWrap}>
          <View style={s.progressBg}>
            <View
              style={[
                s.progressFill,
                {
                  width: `${Math.round(paidPct * 100)}%` as any,
                  backgroundColor: dirColor,
                },
              ]}
            />
          </View>
          <Text style={s.progressLabel}>
            {fmt(loan.totalPaid)} paid · {fmt(loan.outstanding)} left
          </Text>
        </View>
      )}

      <View style={s.loanFooter}>
        <Text style={s.loanDate}>
          {new Date(loan.loanDate).toLocaleDateString()}
        </Text>
        {loan.dueDate && (
          <Text style={[s.dueDate, isOverdue && { color: colors.red[500] }]}>
            Due: {new Date(loan.dueDate).toLocaleDateString()}
            {isOverdue ? " ⚠️" : ""}
          </Text>
        )}
        <TouchableOpacity onPress={onDelete} hitSlop={8}>
          <Feather name="trash-2" size={14} color={colors.red[400]} />
        </TouchableOpacity>
      </View>

      {loan.purpose && (
        <Text style={s.loanPurpose} numberOfLines={1}>
          {loan.purpose}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export default function LoansScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();

  const [direction, setDirection] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ["loans", { direction, status, search, page }],
    queryFn: () =>
      getLoans({
        direction: direction || undefined,
        status: status || undefined,
        search: search || undefined,
        page,
        limit: 20,
      }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteLoan,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loans"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err) =>
      Alert.alert("Error", getApiErrorMessage(err, "Failed to delete loan")),
  });

  const confirmDelete = (loan: Loan) => {
    Alert.alert("Delete Loan", `Delete loan for "${loan.personName}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMut.mutate(loan.id),
      },
    ]);
  };

  const loans = data?.data ?? [];
  const meta = data?.meta;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header matched to Account Theme */}
      <PageHeader
        title="Loans"
        variant="teal"
        rightActions={[
          { icon: "plus", onPress: () => router.push("/(app)/loans/form") },
        ]}
      />

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
          placeholder="Search by person name…"
          placeholderTextColor={colors.gray[300]}
          value={search}
          onChangeText={(v) => {
            setSearch(v);
            setPage(1);
          }}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
            <Feather name="x" size={15} color={colors.gray[400]} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Direction filter */}
      <View style={s.filterRow}>
        {DIRECTIONS.map((d) => (
          <TouchableOpacity
            key={d.value}
            style={[s.filterChip, direction === d.value && s.filterChipActive]}
            onPress={() => {
              setDirection(d.value);
              setPage(1);
            }}
          >
            <Text
              style={[
                s.filterChipLabel,
                direction === d.value && s.filterChipLabelActive,
              ]}
            >
              {d.label}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={s.filterSep} />
        {STATUSES.map((st) => (
          <TouchableOpacity
            key={st.value}
            style={[s.filterChip, status === st.value && s.filterChipActive]}
            onPress={() => {
              setStatus(st.value);
              setPage(1);
            }}
          >
            <Text
              style={[
                s.filterChipLabel,
                status === st.value && s.filterChipLabelActive,
              ]}
            >
              {st.label}
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
            {getApiErrorMessage(error, "Failed to load loans")}
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
          {loans.length === 0 ? (
            <View style={s.empty}>
              <View style={s.emptyIconWrap}>
                <Feather name="users" size={28} color={colors.teal[400]} />
              </View>
              <Text style={s.emptyText}>No loans found</Text>
              <TouchableOpacity
                style={s.emptyBtn}
                onPress={() => router.push("/(app)/loans/form")}
              >
                <Feather name="plus" size={15} color="#fff" />
                <Text style={s.emptyBtnLabel}>Record Loan</Text>
              </TouchableOpacity>
            </View>
          ) : (
            loans.map((loan) => (
              <LoanCard
                key={loan.id}
                loan={loan}
                onPress={() =>
                  router.push({
                    pathname: "/(app)/loans/[id]",
                    params: { id: loan.id },
                  })
                }
                onDelete={() => confirmDelete(loan)}
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
                  color={page === 1 ? colors.gray[300] : colors.teal[600]}
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
                      : colors.teal[600]
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

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
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
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    backgroundColor: "#fff",
  },
  filterChipActive: {
    borderColor: colors.teal[500],
    backgroundColor: colors.teal[50],
  },
  filterChipLabel: { fontSize: 12, fontWeight: "600", color: colors.gray[500] },
  filterChipLabelActive: { color: colors.teal[600] },
  filterSep: { width: 1, backgroundColor: colors.gray[200], marginVertical: 2 },

  list: { padding: 16, gap: 10 },

  loanCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray[100],
    padding: 14,
    gap: 10,
  },
  loanTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  dirBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  dirText: { fontSize: 11, fontWeight: "800" },
  loanMeta: { flex: 1 },
  personName: { fontSize: 15, fontWeight: "800", color: colors.gray[900] },
  personPhone: { fontSize: 11, color: colors.gray[400], marginTop: 2 },
  loanRight: { alignItems: "flex-end", gap: 4 },
  loanAmount: { fontSize: 15, fontWeight: "800", color: colors.gray[900] },
  statusBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  statusText: { fontSize: 10, fontWeight: "700" },

  progressWrap: { gap: 4 },
  progressBg: {
    height: 5,
    backgroundColor: colors.gray[100],
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: { height: 5, borderRadius: 3, minWidth: 4 },
  progressLabel: { fontSize: 11, color: colors.gray[400] },

  loanFooter: { flexDirection: "row", alignItems: "center", gap: 10 },
  loanDate: { fontSize: 11, color: colors.gray[400], flex: 1 },
  dueDate: { fontSize: 11, color: colors.gray[500], fontWeight: "600" },
  loanPurpose: { fontSize: 12, color: colors.gray[500], fontStyle: "italic" },

  // Matched Empty State
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
    borderColor: colors.teal[100],
  },
  pageBtnDisabled: { opacity: 0.4 },
  pageLabel: { fontSize: 13, fontWeight: "600", color: colors.gray[600] },

  errorText: { fontSize: 14, color: colors.red[500], textAlign: "center" },
  retryBtn: {
    backgroundColor: colors.teal[600],
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryLabel: { color: "#fff", fontWeight: "700" },
});
