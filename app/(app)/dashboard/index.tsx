import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { getDashboard } from "@/lib/api/dashboard.api";
import { logout } from "@/lib/auth";
import { useAuthStore } from "@/store/auth.store";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { getApiErrorMessage } from "@/lib/api-error";
import { colors } from "@/components/ui/theme";
import type {
  AccountBalance,
  ActiveLoan,
  RecentTransaction,
  CategoryBreakdownItem,
} from "@/types/finance";
import Feather from "@expo/vector-icons/Feather";

const fmt = (v: number) =>
  `৳${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

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

const TXN_TYPE_COLOR: Record<string, string> = {
  Income: colors.green[500],
  Expense: colors.red[500],
  Transfer: colors.indigo[400],
};

// ── Sub-components ────────────────────────────────────────────

function SectionHeader({
  title,
  onPress,
  actionLabel = "See all",
}: {
  title: string;
  onPress?: () => void;
  actionLabel?: string;
}) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title}</Text>
      {onPress && (
        <TouchableOpacity onPress={onPress} hitSlop={8}>
          <Text style={s.sectionAction}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function MetricCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string;
  color: string;
  icon: React.ComponentProps<typeof Feather>["name"];
}) {
  return (
    <View style={s.metricCard}>
      <View style={[s.metricIcon, { backgroundColor: color + "18" }]}>
        <Feather name={icon} size={15} color={color} />
      </View>
      <Text style={s.metricLabel}>{label}</Text>
      <Text style={[s.metricValue, { color }]}>{value}</Text>
    </View>
  );
}

function AccountCard({ account }: { account: AccountBalance }) {
  const iconName = ACCOUNT_TYPE_ICONS[account.accountType] ?? "circle";
  const balColor =
    account.currentBalance >= 0 ? colors.gray[900] : colors.red[500];
  return (
    <View style={s.accountCard}>
      <View
        style={[
          s.accountIconWrap,
          { backgroundColor: (account.color ?? colors.indigo[500]) + "18" },
        ]}
      >
        <Feather
          name={iconName}
          size={16}
          color={account.color ?? colors.indigo[500]}
        />
      </View>
      <View style={s.accountInfo}>
        <Text style={s.accountName} numberOfLines={1}>
          {account.name}
        </Text>
        <Text style={s.accountType}>
          {account.accountType.replace("_", " ")}
        </Text>
      </View>
      <Text style={[s.accountBalance, { color: balColor }]}>
        {fmt(account.currentBalance)}
      </Text>
    </View>
  );
}

function LoanRow({ loan }: { loan: ActiveLoan }) {
  const isOverdue = loan.dueDate && new Date(loan.dueDate) < new Date();
  const dirColor =
    loan.direction === "Gave" ? colors.green[600] : colors.red[600];
  const dirLabel = loan.direction === "Gave" ? "Lent" : "Borrowed";
  return (
    <View style={s.loanRow}>
      <View style={[s.loanDirBadge, { backgroundColor: dirColor + "15" }]}>
        <Text style={[s.loanDirText, { color: dirColor }]}>{dirLabel}</Text>
      </View>
      <View style={s.loanInfo}>
        <Text style={s.loanPerson} numberOfLines={1}>
          {loan.personName}
        </Text>
        {isOverdue && <Text style={s.loanOverdue}>Overdue</Text>}
      </View>
      <View style={s.loanAmounts}>
        <Text style={s.loanOutstanding}>{fmt(Number(loan.outstanding))}</Text>
        <Text style={s.loanTotal}>of {fmt(Number(loan.amount))}</Text>
      </View>
    </View>
  );
}

function TxnRow({ txn }: { txn: RecentTransaction }) {
  const amtColor = TXN_TYPE_COLOR[txn.type] ?? colors.gray[700];
  const prefix =
    txn.type === "Income" ? "+" : txn.type === "Expense" ? "-" : "";
  const label =
    txn.description ??
    txn.category?.name ??
    (txn.type === "Transfer"
      ? `${txn.fromAccount?.name ?? ""} → ${txn.toAccount?.name ?? ""}`
      : txn.type);

  return (
    <View style={s.txnRow}>
      <View
        style={[
          s.txnIconWrap,
          { backgroundColor: (txn.category?.color ?? colors.gray[300]) + "22" },
        ]}
      >
        <Text style={s.txnEmoji}>{txn.category?.icon ?? "💸"}</Text>
      </View>
      <View style={s.txnInfo}>
        <Text style={s.txnLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={s.txnDate}>{txn.txnMonth}</Text>
      </View>
      <Text style={[s.txnAmount, { color: amtColor }]}>
        {prefix}
        {fmt(Number(txn.amount))}
      </Text>
    </View>
  );
}

function CategoryBar({
  item,
  maxTotal,
}: {
  item: CategoryBreakdownItem;
  maxTotal: number;
}) {
  const pct = maxTotal > 0 ? item.total / maxTotal : 0;
  return (
    <View style={s.catRow}>
      <View style={s.catLabelRow}>
        <Text style={s.catEmoji}>{item.icon}</Text>
        <Text style={s.catName} numberOfLines={1}>
          {item.categoryName}
        </Text>
        <Text style={s.catAmount}>{fmt(item.total)}</Text>
      </View>
      <View style={s.catBarBg}>
        <View
          style={[
            s.catBarFill,
            {
              width: `${Math.round(pct * 100)}%` as any,
              backgroundColor: item.color ?? colors.indigo[400],
            },
          ]}
        />
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, setAuthenticated, setUser } = useAuthStore();
  const [month] = useState<string | undefined>(undefined); // future: month picker

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ["dashboard", month],
    queryFn: () => getDashboard(month),
  });

  const handleLogout = async () => {
    await logout();
    setAuthenticated(false);
    setUser(null);
    router.replace("/(auth)/login");
  };

  if (isLoading) {
    return (
      <View style={s.center}>
        <Spinner />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={[s.center, { padding: 24 }]}>
        <Alert
          message={getApiErrorMessage(error, "Failed to load dashboard")}
          type="error"
        />
        <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
          <Text style={s.retryLabel}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const maxCatTotal = Math.max(
    ...data.categoryBreakdown.map((c) => c.total),
    1,
  );
  const greeting = user?.firstName ? `Hi, ${user.firstName}` : "Dashboard";

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={[
        s.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      {/* Header */}
      <View style={s.topBar}>
        <View>
          <Text style={s.greeting}>{greeting}</Text>
          <Text style={s.monthLabel}>{data.month}</Text>
        </View>
        <TouchableOpacity
          onPress={handleLogout}
          style={s.logoutBtn}
          hitSlop={8}
        >
          <Feather name="log-out" size={18} color={colors.gray[500]} />
        </TouchableOpacity>
      </View>

      {/* Net Worth */}
      <View style={s.netWorthCard}>
        <Text style={s.netWorthLabel}>Net Worth</Text>
        <Text style={s.netWorthValue}>{fmt(data.netWorth)}</Text>
        <View style={s.netWorthRow}>
          <Text style={s.netWorthSub}>
            All-time savings: {fmt(data.allTimeTotals.totalSavings)}
          </Text>
        </View>
      </View>

      {/* Month Metrics */}
      <View style={s.metricsRow}>
        <MetricCard
          label="Income"
          value={fmt(data.monthMetrics.income)}
          color={colors.green[600]}
          icon="arrow-down-circle"
        />
        <MetricCard
          label="Expense"
          value={fmt(data.monthMetrics.expense)}
          color={colors.red[500]}
          icon="arrow-up-circle"
        />
        <MetricCard
          label="Savings"
          value={fmt(data.monthMetrics.savings)}
          color={colors.indigo[600]}
          icon="activity"
        />
      </View>

      {/* Accounts */}
      {data.accounts.length > 0 && (
        <View style={s.section}>
          <SectionHeader
            title="Accounts"
            onPress={() => router.push("/(app)/accounts")}
          />
          <View style={s.card}>
            {data.accounts.map((acc, i) => (
              <React.Fragment key={acc.id}>
                <AccountCard account={acc} />
                {i < data.accounts.length - 1 && <View style={s.divider} />}
              </React.Fragment>
            ))}
          </View>
        </View>
      )}

      {/* Loan Summary */}
      <View style={s.section}>
        <SectionHeader
          title="Loans"
          onPress={() => router.push("/(app)/loans")}
        />
        <View style={s.loanSummaryRow}>
          <View style={[s.loanSummaryCard, { borderColor: colors.green[200] }]}>
            <Text style={s.loanSummaryLabel}>Owed to Me</Text>
            <Text style={[s.loanSummaryValue, { color: colors.green[600] }]}>
              {fmt(data.loanSummary.owedToMe)}
            </Text>
            <Text style={s.loanSummaryCount}>
              {data.loanSummary.activeGave} active
            </Text>
          </View>
          <View style={[s.loanSummaryCard, { borderColor: colors.red[200] }]}>
            <Text style={s.loanSummaryLabel}>I Owe</Text>
            <Text style={[s.loanSummaryValue, { color: colors.red[500] }]}>
              {fmt(data.loanSummary.iOwe)}
            </Text>
            <Text style={s.loanSummaryCount}>
              {data.loanSummary.activeReceived} active
            </Text>
          </View>
        </View>
        {data.loanSummary.overdueCount > 0 && (
          <View style={s.overdueAlert}>
            <Feather name="alert-circle" size={14} color={colors.red[600]} />
            <Text style={s.overdueText}>
              {data.loanSummary.overdueCount} overdue loan
              {data.loanSummary.overdueCount > 1 ? "s" : ""}
            </Text>
          </View>
        )}
        {data.activeLoans.length > 0 && (
          <View style={[s.card, { marginTop: 10 }]}>
            {data.activeLoans.map((loan, i) => (
              <React.Fragment key={loan.id}>
                <LoanRow loan={loan} />
                {i < data.activeLoans.length - 1 && <View style={s.divider} />}
              </React.Fragment>
            ))}
          </View>
        )}
      </View>

      {/* Category Breakdown */}
      {data.categoryBreakdown.length > 0 && (
        <View style={s.section}>
          <SectionHeader title={`Expenses — ${data.month}`} />
          <View style={s.card}>
            {data.categoryBreakdown.map((item) => (
              <CategoryBar
                key={item.categoryId ?? "uncategorized"}
                item={item}
                maxTotal={maxCatTotal}
              />
            ))}
          </View>
        </View>
      )}

      {/* Recent Transactions */}
      {data.recentTransactions.length > 0 && (
        <View style={s.section}>
          <SectionHeader
            title="Recent Transactions"
            onPress={() => router.push("/(app)/transactions")}
          />
          <View style={s.card}>
            {data.recentTransactions.map((txn, i) => (
              <React.Fragment key={txn.id}>
                <TxnRow txn={txn} />
                {i < data.recentTransactions.length - 1 && (
                  <View style={s.divider} />
                )}
              </React.Fragment>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  content: { paddingHorizontal: 16, gap: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Header
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  greeting: { fontSize: 22, fontWeight: "800", color: colors.gray[900] },
  monthLabel: { fontSize: 13, color: colors.gray[400], marginTop: 2 },
  logoutBtn: { padding: 8 },

  // Net Worth
  netWorthCard: {
    backgroundColor: colors.indigo[600],
    borderRadius: 20,
    padding: 22,
    gap: 4,
  },
  netWorthLabel: { fontSize: 13, color: colors.indigo[200], fontWeight: "600" },
  netWorthValue: { fontSize: 32, fontWeight: "800", color: "#fff" },
  netWorthRow: { flexDirection: "row", marginTop: 4 },
  netWorthSub: { fontSize: 12, color: colors.indigo[200] },

  // Metrics
  metricsRow: { flexDirection: "row", gap: 10 },
  metricCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  metricLabel: { fontSize: 11, color: colors.gray[500], fontWeight: "600" },
  metricValue: { fontSize: 14, fontWeight: "800" },

  // Section
  section: { gap: 10 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.gray[900] },
  sectionAction: { fontSize: 13, color: colors.indigo[500], fontWeight: "600" },

  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray[100],
    overflow: "hidden",
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray[100],
    marginHorizontal: 16,
  },

  // Account
  accountCard: {
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
  },
  accountInfo: { flex: 1 },
  accountName: { fontSize: 14, fontWeight: "700", color: colors.gray[900] },
  accountType: {
    fontSize: 11,
    color: colors.gray[400],
    marginTop: 1,
    textTransform: "capitalize",
  },
  accountBalance: { fontSize: 15, fontWeight: "800" },

  // Loan summary
  loanSummaryRow: { flexDirection: "row", gap: 10 },
  loanSummaryCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    gap: 4,
  },
  loanSummaryLabel: {
    fontSize: 11,
    color: colors.gray[500],
    fontWeight: "600",
  },
  loanSummaryValue: { fontSize: 18, fontWeight: "800" },
  loanSummaryCount: { fontSize: 11, color: colors.gray[400] },
  overdueAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.red[50],
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.red[100],
  },
  overdueText: { fontSize: 13, color: colors.red[600], fontWeight: "600" },

  // Loan row
  loanRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  loanDirBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  loanDirText: { fontSize: 11, fontWeight: "700" },
  loanInfo: { flex: 1 },
  loanPerson: { fontSize: 14, fontWeight: "700", color: colors.gray[900] },
  loanOverdue: {
    fontSize: 11,
    color: colors.red[500],
    fontWeight: "600",
    marginTop: 2,
  },
  loanAmounts: { alignItems: "flex-end" },
  loanOutstanding: { fontSize: 14, fontWeight: "800", color: colors.gray[900] },
  loanTotal: { fontSize: 11, color: colors.gray[400] },

  // Txn row
  txnRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  txnIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  txnEmoji: { fontSize: 16 },
  txnInfo: { flex: 1 },
  txnLabel: { fontSize: 14, fontWeight: "600", color: colors.gray[900] },
  txnDate: { fontSize: 11, color: colors.gray[400], marginTop: 2 },
  txnAmount: { fontSize: 14, fontWeight: "800" },

  // Category bar
  catRow: { padding: 14, gap: 8 },
  catLabelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  catEmoji: { fontSize: 15 },
  catName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: colors.gray[800],
  },
  catAmount: { fontSize: 13, fontWeight: "700", color: colors.gray[900] },
  catBarBg: { height: 6, backgroundColor: colors.gray[100], borderRadius: 3 },
  catBarFill: { height: 6, borderRadius: 3, minWidth: 4 },

  // Misc
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.indigo[600],
    borderRadius: 12,
  },
  retryLabel: { color: "#fff", fontWeight: "700" },
});
