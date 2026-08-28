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
  deleteAccount,
  getAccountsWithNetWorth,
  reorderAccounts,
  setDefaultAccount,
  toggleNetWorth,
} from "@/lib/api/accounts.api";

import { getApiErrorMessage } from "@/lib/api-error";
import { Spinner } from "@/components/ui/Spinner";
import { colors } from "@/components/ui/theme";
import type { Account } from "@/types/finance";
import Feather from "@expo/vector-icons/Feather";

const ACCOUNT_TYPE_ICONS: Record<
  string,
  React.ComponentProps<typeof Feather>["name"]
> = {
  bank: "home",
  mobile_banking: "smartphone",
  cash: "dollar-sign",
  card: "credit-card",
  investment: "trending-up",
  other: "circle",
};

const fmt = (v: string | number) =>
  `৳${Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

function AccountCard({
  account,
  index,
  totalAccounts,
  reorderPending,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
  onSetDefault,
  onToggleNetWorth,
}: {
  account: Account;
  index: number;
  totalAccounts: number;
  reorderPending: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  onToggleNetWorth: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const iconName = ACCOUNT_TYPE_ICONS[account.accountType] ?? "circle";
  const accentColor = account.color ?? colors.teal[500];
  const isFirst = index === 0;
  const isLast = index === totalAccounts - 1;

  return (
    <View style={s.accountCard}>
      <TouchableOpacity
        style={s.accountMain}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}
      >
        <View
          style={[
            s.accountIconWrap,
            {
              backgroundColor: `${accentColor}18`,
              borderColor: `${accentColor}35`,
            },
          ]}
        >
          {account.icon ? (
            <Text style={s.accountEmoji}>{account.icon}</Text>
          ) : (
            <Feather name={iconName} size={16} color={accentColor} />
          )}
        </View>

        <View style={s.accountInfo}>
          <View style={s.accountNameRow}>
            <Text style={s.accountName} numberOfLines={1}>
              {account.name}
            </Text>
            {account.isDefault && (
              <View style={s.defaultBadge}>
                <Text style={s.defaultBadgeText}>Default</Text>
              </View>
            )}
          </View>
          <Text style={s.accountMeta}>
            {account.accountType.replace("_", " ")}
            {account.institution ? ` · ${account.institution}` : ""}
          </Text>
        </View>

        <View style={s.accountRight}>
          <Text style={s.accountBalance}>{fmt(account.currentBalance)}</Text>
          <Feather
            name={expanded ? "chevron-up" : "chevron-down"}
            size={14}
            color={colors.gray[400]}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={s.accountActions}>
          <View style={s.accountDetails}>
            <Text style={s.detailItem}>
              Opening: {fmt(account.openingBalance)}
            </Text>
            <Text style={s.detailItem}>
              Net worth: {account.includeInNetWorth ? "Included" : "Excluded"}
            </Text>
            {account.notes ? (
              <Text style={s.detailItem}>Note: {account.notes}</Text>
            ) : null}
          </View>

          <View style={s.reorderRow}>
            <View>
              <Text style={s.reorderLabel}>Display order</Text>
              <Text style={s.reorderHint}>Move this account up or down</Text>
            </View>
            <View style={s.reorderButtons}>
              <TouchableOpacity
                style={[
                  s.reorderButton,
                  (isFirst || reorderPending) && s.reorderButtonDisabled,
                ]}
                disabled={isFirst || reorderPending}
                onPress={onMoveUp}
                activeOpacity={0.7}
              >
                <Feather
                  name="chevron-up"
                  size={18}
                  color={
                    isFirst || reorderPending
                      ? colors.gray[300]
                      : colors.teal[600]
                  }
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  s.reorderButton,
                  (isLast || reorderPending) && s.reorderButtonDisabled,
                ]}
                disabled={isLast || reorderPending}
                onPress={onMoveDown}
                activeOpacity={0.7}
              >
                <Feather
                  name="chevron-down"
                  size={18}
                  color={
                    isLast || reorderPending
                      ? colors.gray[300]
                      : colors.teal[600]
                  }
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.actionRow}>
            <TouchableOpacity style={s.actionBtn} onPress={onEdit}>
              <Feather name="edit-2" size={14} color={colors.teal[600]} />
              <Text style={[s.actionLabel, { color: colors.teal[600] }]}>
                Edit
              </Text>
            </TouchableOpacity>

            {!account.isDefault && (
              <TouchableOpacity style={s.actionBtn} onPress={onSetDefault}>
                <Feather name="star" size={14} color={colors.amber[500]} />
                <Text style={[s.actionLabel, { color: colors.amber[500] }]}>
                  Set default
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={s.actionBtn} onPress={onToggleNetWorth}>
              <Feather
                name={account.includeInNetWorth ? "eye-off" : "eye"}
                size={14}
                color={colors.gray[500]}
              />
              <Text style={[s.actionLabel, { color: colors.gray[500] }]}>
                {account.includeInNetWorth ? "Exclude NW" : "Include NW"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.actionBtn} onPress={onDelete}>
              <Feather name="trash-2" size={14} color={colors.red[500]} />
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

export default function AccountsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ["accounts"],
    queryFn: getAccountsWithNetWorth,
  });

  const deleteMut = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
    onError: (error) =>
      Alert.alert(
        "Error",
        getApiErrorMessage(error, "Failed to delete account"),
      ),
  });

  const defaultMut = useMutation({
    mutationFn: setDefaultAccount,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
    onError: (error) =>
      Alert.alert(
        "Error",
        getApiErrorMessage(error, "Failed to set default account"),
      ),
  });

  const netWorthMut = useMutation({
    mutationFn: toggleNetWorth,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
    onError: (error) =>
      Alert.alert(
        "Error",
        getApiErrorMessage(error, "Failed to update net worth setting"),
      ),
  });

  const reorderMut = useMutation({
    mutationFn: reorderAccounts,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
    onError: (error) =>
      Alert.alert(
        "Error",
        getApiErrorMessage(error, "Failed to reorder accounts"),
      ),
  });

  const confirmDelete = (account: Account) => {
    Alert.alert(
      "Delete Account",
      `Delete "${account.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMut.mutate(account.id),
        },
      ],
    );
  };

  const moveAccount = (index: number, direction: "up" | "down") => {
    if (!data?.accounts || reorderMut.isPending) return;
    const accounts = [...data.accounts];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= accounts.length) return;
    [accounts[index], accounts[newIndex]] = [
      accounts[newIndex],
      accounts[index],
    ];
    reorderMut.mutate(
      accounts.map((account, i) => ({ id: account.id, displayOrder: i })),
    );
  };

  const accounts = data?.accounts ?? [];
  const netWorth = data?.netWorth ?? 0;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <View style={s.headerIconBtn}>
            <Feather name="arrow-left" size={18} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Accounts</Text>
        <TouchableOpacity
          onPress={() => router.push("/(app)/accounts/form")}
          hitSlop={8}
        >
          <View style={s.addBtn}>
            <Feather name="plus" size={18} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={s.center}>
          <Spinner />
        </View>
      ) : isError ? (
        <View style={s.center}>
          <Text style={s.errorText}>
            {getApiErrorMessage(error, "Failed to load accounts")}
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
          {/* Net Worth Hero */}
          {accounts.length > 0 && (
            <View style={s.netWorthHero}>
              <View style={s.netWorthTopRow}>
                <View style={s.netWorthIconBadge}>
                  <Feather name="trending-up" size={22} color="#fff" />
                </View>
                <View style={s.netWorthTextBlock}>
                  <Text style={s.netWorthEyebrow}>FINANCIAL OVERVIEW</Text>
                  <Text style={s.netWorthLabel}>Net worth</Text>
                  <Text style={s.netWorthSub}>
                    {accounts.filter((a) => a.includeInNetWorth).length}{" "}
                    accounts included
                  </Text>
                </View>
              </View>

              <Text style={s.netWorthValue}>{fmt(netWorth)}</Text>

              <View style={s.netWorthFooter}>
                <View style={s.netWorthStatus}>
                  <View style={s.netWorthDot} />
                  <Text style={s.netWorthStatusText}>Current total</Text>
                </View>
                <Text style={s.netWorthAccountCount}>
                  {accounts.length} accounts
                </Text>
              </View>
            </View>
          )}

          {/* Account List */}
          {accounts.length === 0 ? (
            <View style={s.empty}>
              <View style={s.emptyIconWrap}>
                <Feather
                  name="credit-card"
                  size={28}
                  color={colors.teal[400]}
                />
              </View>
              <Text style={s.emptyText}>No accounts yet</Text>
              <TouchableOpacity
                style={s.emptyBtn}
                onPress={() => router.push("/(app)/accounts/form")}
              >
                <Feather name="plus" size={15} color="#fff" />
                <Text style={s.emptyBtnLabel}>Add account</Text>
              </TouchableOpacity>
            </View>
          ) : (
            accounts.map((account, index) => (
              <AccountCard
                key={account.id}
                account={account}
                index={index}
                totalAccounts={accounts.length}
                reorderPending={reorderMut.isPending}
                onMoveUp={() => moveAccount(index, "up")}
                onMoveDown={() => moveAccount(index, "down")}
                onEdit={() =>
                  router.push({
                    pathname: "/(app)/accounts/form",
                    params: { id: account.id },
                  })
                }
                onDelete={() => confirmDelete(account)}
                onSetDefault={() => defaultMut.mutate(account.id)}
                onToggleNetWorth={() => netWorthMut.mutate(account.id)}
              />
            ))
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
    backgroundColor: colors.teal[700],
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#fff" },
  headerIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  list: { padding: 16, gap: 10 },

  /* Net Worth Hero */
  netWorthHero: {
    backgroundColor: colors.teal[700],
    borderRadius: 20,
    padding: 20,
    gap: 4,
  },
  netWorthTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  netWorthIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  netWorthTextBlock: { flex: 1, gap: 3 },
  netWorthEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(204,251,241,0.7)",
    letterSpacing: 1.4,
  },
  netWorthLabel: { fontSize: 20, fontWeight: "800", color: "#fff" },
  netWorthSub: { fontSize: 12, color: "rgba(204,251,241,0.75)" },
  netWorthValue: {
    marginTop: 16,
    fontSize: 34,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.5,
  },
  netWorthFooter: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  netWorthStatus: { flexDirection: "row", alignItems: "center", gap: 6 },
  netWorthDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#99F6E4",
  },
  netWorthStatusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(204,251,241,0.8)",
  },
  netWorthAccountCount: { fontSize: 11, color: "rgba(204,251,241,0.6)" },

  /* Account Card */
  accountCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray[100],
    overflow: "hidden",
  },
  accountMain: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  accountIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  accountEmoji: { fontSize: 22, lineHeight: 26 },
  accountInfo: { flex: 1 },
  accountNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  accountName: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "700",
    color: colors.gray[900],
  },
  defaultBadge: {
    backgroundColor: colors.teal[50],
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.teal[100],
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.teal[700],
  },
  accountMeta: {
    fontSize: 12,
    color: colors.gray[400],
    marginTop: 2,
    textTransform: "capitalize",
  },
  accountRight: { alignItems: "flex-end", gap: 4 },
  accountBalance: { fontSize: 15, fontWeight: "800", color: colors.gray[900] },

  accountActions: {
    borderTopWidth: 1,
    borderTopColor: colors.teal[50],
    backgroundColor: colors.gray[50],
    padding: 14,
    gap: 12,
  },
  accountDetails: { gap: 4 },
  detailItem: { fontSize: 12, color: colors.gray[500] },

  reorderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  reorderLabel: { fontSize: 12, fontWeight: "600", color: colors.gray[600] },
  reorderHint: { fontSize: 10, color: colors.gray[400], marginTop: 2 },
  reorderButtons: { flexDirection: "row", gap: 6 },
  reorderButton: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.teal[100],
    alignItems: "center",
    justifyContent: "center",
  },
  reorderButtonDisabled: { opacity: 0.4 },

  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.teal[100],
  },
  actionLabel: { fontSize: 12, fontWeight: "600" },

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

  errorText: { fontSize: 14, color: colors.red[500], textAlign: "center" },
  retryBtn: {
    backgroundColor: colors.teal[600],
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryLabel: { color: "#fff", fontWeight: "700" },
});
