import React, { useMemo, useState } from "react";
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
import Feather from "@expo/vector-icons/Feather";

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
  PinnedCategory,
} from "@/types/finance";

const fmt = (value: number) =>
  `৳${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

const MONTH_ORDER: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

const parseMonth = (value: string) => {
  const [month, year] = value.split("-");
  return { monthIndex: MONTH_ORDER[month] ?? 0, year: Number(year) || 0 };
};

const sortMonths = <T extends { month: string }>(items: T[]) =>
  [...items].sort((a, b) => {
    const aDate = parseMonth(a.month);
    const bDate = parseMonth(b.month);
    if (aDate.year !== bDate.year) return aDate.year - bDate.year;
    return aDate.monthIndex - bDate.monthIndex;
  });

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
  Transfer: colors.teal[400],
};

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
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onPress && (
        <TouchableOpacity
          onPress={onPress}
          hitSlop={8}
          style={styles.sectionActionBtn}
        >
          <Text style={styles.sectionAction}>{actionLabel}</Text>
          <Feather name="chevron-right" size={14} color={colors.teal[500]} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.quickAction}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.quickIcon}>
        <Feather name={icon} size={19} color={colors.teal[600]} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function AccountCard({ account }: { account: AccountBalance }) {
  const iconName = ACCOUNT_TYPE_ICONS[account.accountType] ?? "circle";
  const accentColor = account.color ?? colors.teal[500];
  const balanceColor =
    account.currentBalance >= 0 ? colors.gray[900] : colors.red[500];
  return (
    <View style={styles.accountRow}>
      <View
        style={[
          styles.accountIconWrap,
          { backgroundColor: `${accentColor}18` },
        ]}
      >
        <Feather name={iconName} size={17} color={accentColor} />
      </View>
      <View style={styles.accountInfo}>
        <Text style={styles.accountName} numberOfLines={1}>
          {account.name}
        </Text>
        <Text style={styles.accountType}>
          {account.accountType.replace("_", " ")}
        </Text>
      </View>
      <Text style={[styles.accountBalance, { color: balanceColor }]}>
        {fmt(account.currentBalance)}
      </Text>
    </View>
  );
}

function LoanRow({ loan }: { loan: ActiveLoan }) {
  const isOverdue = loan.dueDate && new Date(loan.dueDate) < new Date();
  const directionColor =
    loan.direction === "Gave" ? colors.green[600] : colors.red[600];
  const directionLabel = loan.direction === "Gave" ? "Lent" : "Borrowed";
  return (
    <View style={styles.loanRow}>
      <View
        style={[
          styles.loanDirectionBadge,
          { backgroundColor: `${directionColor}15` },
        ]}
      >
        <Text style={[styles.loanDirectionText, { color: directionColor }]}>
          {directionLabel}
        </Text>
      </View>
      <View style={styles.loanInfo}>
        <Text style={styles.loanPerson} numberOfLines={1}>
          {loan.personName}
        </Text>
        {isOverdue && <Text style={styles.loanOverdue}>Overdue</Text>}
      </View>
      <View style={styles.loanAmounts}>
        <Text style={styles.loanOutstanding}>
          {fmt(Number(loan.outstanding))}
        </Text>
        <Text style={styles.loanTotal}>of {fmt(Number(loan.amount))}</Text>
      </View>
    </View>
  );
}

function TxnRow({ txn }: { txn: RecentTransaction }) {
  const amountColor = TXN_TYPE_COLOR[txn.type] ?? colors.gray[700];
  const prefix =
    txn.type === "Income" ? "+" : txn.type === "Expense" ? "-" : "";
  const label =
    txn.description ??
    txn.category?.name ??
    (txn.type === "Transfer"
      ? `${txn.fromAccount?.name ?? ""} → ${txn.toAccount?.name ?? ""}`
      : txn.type);
  const iconColor = txn.category?.color ?? colors.teal[200];
  return (
    <View style={styles.transactionRow}>
      <View
        style={[styles.transactionIcon, { backgroundColor: `${iconColor}22` }]}
      >
        <Text style={styles.transactionEmoji}>
          {txn.category?.icon ?? "💸"}
        </Text>
      </View>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.transactionMeta}>
          {txn.txnMonth}
          {txn.fromAccount?.name ? ` · ${txn.fromAccount.name}` : ""}
        </Text>
      </View>
      <Text style={[styles.transactionAmount, { color: amountColor }]}>
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
  const percentage = maxTotal > 0 ? Math.min(item.total / maxTotal, 1) : 0;
  return (
    <View style={styles.categoryRow}>
      <View style={styles.categoryHeader}>
        <View style={styles.categoryNameWrap}>
          <Text style={styles.categoryEmoji}>{item.icon}</Text>
          <Text style={styles.categoryName} numberOfLines={1}>
            {item.categoryName}
          </Text>
        </View>
        <Text style={styles.categoryAmount}>{fmt(item.total)}</Text>
      </View>
      <View style={styles.categoryTrack}>
        <View
          style={[
            styles.categoryFill,
            {
              width: `${Math.round(percentage * 100)}%`,
              backgroundColor: item.color ?? colors.teal[500],
            },
          ]}
        />
      </View>
    </View>
  );
}

function MonthlyChart({
  data,
}: {
  data: Array<{
    month: string;
    income: number;
    expense: number;
    savings: number;
  }>;
}) {
  const sortedData = useMemo(() => sortMonths(data), [data]);
  const maxValue = useMemo(
    () =>
      Math.max(...sortedData.flatMap((item) => [item.income, item.expense]), 1),
    [sortedData],
  );

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <View>
          <Text style={styles.chartTitle}>Money flow</Text>
          <Text style={styles.chartSubtitle}>Income vs expense</Text>
        </View>
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: colors.teal[400] }]}
            />
            <Text style={styles.legendText}>Income</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: colors.red[400] }]}
            />
            <Text style={styles.legendText}>Expense</Text>
          </View>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chartScroll}
      >
        <View style={styles.chartArea}>
          <View style={styles.chartGrid}>
            <View style={styles.chartGridLine} />
            <View style={styles.chartGridLine} />
            <View style={styles.chartGridLine} />
            <View style={styles.chartGridLine} />
          </View>
          <View style={styles.barsContainer}>
            {sortedData.map((item) => {
              const incomeHeight = Math.max((item.income / maxValue) * 150, 4);
              const expenseHeight = Math.max(
                (item.expense / maxValue) * 150,
                4,
              );
              const monthLabel = item.month.split("-")[0];
              return (
                <View key={item.month} style={styles.chartColumn}>
                  <View style={styles.barGroup}>
                    <View
                      style={[
                        styles.bar,
                        styles.incomeBar,
                        { height: incomeHeight },
                      ]}
                    />
                    <View
                      style={[
                        styles.bar,
                        styles.expenseBar,
                        { height: expenseHeight },
                      ]}
                    />
                  </View>
                  <Text style={styles.chartMonth}>{monthLabel}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function PinnedCategoryCard({ item }: { item: PinnedCategory }) {
  const color = item.color ?? colors.teal[500];
  return (
    <TouchableOpacity
      style={[styles.pinnedCard, { borderColor: `${color}30` }]}
      activeOpacity={0.8}
    >
      <View style={[styles.pinnedIcon, { backgroundColor: `${color}15` }]}>
        <Text style={styles.pinnedEmoji}>{item.icon ?? "📌"}</Text>
      </View>
      <Text style={styles.pinnedName} numberOfLines={1}>
        {item.categoryName}
      </Text>
      <Text style={[styles.pinnedTotal, { color }]}>
        {fmt(item.monthlyTotal)}
      </Text>
      <Text style={styles.pinnedLabel}>this month</Text>
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, setAuthenticated, setUser } = useAuthStore();
  const [month] = useState<string | undefined>(undefined);

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
      <View style={styles.center}>
        <Spinner />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={[styles.center, { padding: 24 }]}>
        <Alert
          message={getApiErrorMessage(error, "Failed to load dashboard")}
          type="error"
        />
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryLabel}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const greeting = user?.firstName ? `Hi, ${user.firstName} 👋` : "Dashboard";
  const visibleAccounts = data.accounts.slice(0, 3);
  const visibleLoans = data.activeLoans.slice(0, 3);
  const visibleCategories = data.categoryBreakdown.slice(0, 5);
  const maxCategoryTotal = Math.max(
    ...visibleCategories.map((item) => item.total),
    1,
  );
  const totalBalance = data.accounts
    .filter((a) => a.includeInNetWorth !== false)
    .reduce((sum, a) => sum + a.currentBalance, 0);
  const savingsIsPositive = data.monthMetrics.savings >= 0;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top, paddingBottom: insets.bottom + 110 },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      {/* HERO */}
      <View style={styles.hero}>
        <View style={styles.heroHeader}>
          <View>
            <Text style={styles.heroEyebrow}>FINANCIAL OVERVIEW</Text>
            <Text style={styles.heroGreeting}>{greeting}</Text>
          </View>
          <TouchableOpacity
            onPress={handleLogout}
            style={styles.logoutButton}
            hitSlop={8}
          >
            <Feather name="log-out" size={17} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
        </View>

        <View style={styles.netWorthBlock}>
          <Text style={styles.netWorthLabel}>Net worth</Text>
          <Text style={styles.netWorthValue}>{fmt(data.netWorth)}</Text>
          <View style={styles.netWorthTrend}>
            <View style={styles.trendIcon}>
              <Feather
                name={savingsIsPositive ? "trending-up" : "trending-down"}
                size={12}
                color={savingsIsPositive ? "#99F6E4" : "#FCA5A5"}
              />
            </View>
            <Text
              style={[
                styles.trendText,
                { color: savingsIsPositive ? "#CCFBF1" : "#FECACA" },
              ]}
            >
              {fmt(Math.abs(data.monthMetrics.savings))}{" "}
              {savingsIsPositive ? "saved" : "loss"} this month
            </Text>
          </View>
        </View>

        <View style={styles.metricsCard}>
          <View style={styles.metric}>
            <View
              style={[
                styles.metricIcon,
                { backgroundColor: "rgba(153,246,228,0.14)" },
              ]}
            >
              <Feather name="arrow-down-left" size={13} color="#99F6E4" />
            </View>
            <Text style={styles.metricLabel}>Income</Text>
            <Text style={[styles.metricValue, { color: "#99F6E4" }]}>
              {fmt(data.monthMetrics.income)}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <View
              style={[
                styles.metricIcon,
                { backgroundColor: "rgba(252,165,165,0.14)" },
              ]}
            >
              <Feather name="arrow-up-right" size={13} color="#FCA5A5" />
            </View>
            <Text style={styles.metricLabel}>Expense</Text>
            <Text style={[styles.metricValue, { color: "#FCA5A5" }]}>
              {fmt(data.monthMetrics.expense)}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <View
              style={[
                styles.metricIcon,
                { backgroundColor: "rgba(165,243,252,0.14)" },
              ]}
            >
              <Feather name="pie-chart" size={13} color="#A5F3FC" />
            </View>
            <Text style={styles.metricLabel}>Savings</Text>
            <Text
              style={[
                styles.metricValue,
                { color: savingsIsPositive ? "#A5F3FC" : "#FCA5A5" },
              ]}
            >
              {fmt(data.monthMetrics.savings)}
            </Text>
          </View>
        </View>

        <View style={styles.heroFooter}>
          <View style={styles.monthBadge}>
            <View style={styles.monthDot} />
            <Text style={styles.monthText}>{data.month}</Text>
          </View>
          <Text style={styles.accountCount}>
            {data.accounts.length} accounts
          </Text>
        </View>
      </View>

      {/* QUICK ACTIONS */}
      <View style={styles.section}>
        <SectionHeader title="Quick actions" />
        <View style={styles.quickActionsCard}>
          <QuickAction
            icon="plus-circle"
            label="Income"
            onPress={() =>
              router.push({
                pathname: "/(app)/transactions/form",
                params: { type: "Income" },
              })
            }
          />
          <QuickAction
            icon="minus-circle"
            label="Expense"
            onPress={() =>
              router.push({
                pathname: "/(app)/transactions/form",
                params: { type: "Expense" },
              })
            }
          />
          <QuickAction
            icon="repeat"
            label="Transfer"
            onPress={() =>
              router.push({
                pathname: "/(app)/transactions/form",
                params: { type: "Transfer" },
              })
            }
          />
          <QuickAction
            icon="plus-square"
            label="Import"
            onPress={() => router.push("/(app)/import")}
          />
        </View>
      </View>

      {/* PINNED CATEGORIES */}
      <View style={styles.section}>
        <SectionHeader
          title="Pinned categories"
          onPress={() => router.push("/(app)/categories")}
          actionLabel="Manage"
        />
        {data.pinnedCategories.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pinnedRow}
          >
            {data.pinnedCategories.map((item) => (
              <PinnedCategoryCard key={item.categoryId} item={item} />
            ))}
          </ScrollView>
        ) : (
          <TouchableOpacity
            style={styles.pinnedEmptyState}
            onPress={() => router.push("/(app)/categories")}
            activeOpacity={0.75}
          >
            <Feather name="bookmark" size={18} color={colors.teal[400]} />
            <Text style={styles.pinnedEmptyText}>
              Pin categories to track them here
            </Text>
            <View style={styles.pinnedEmptyAction}>
              <Text style={styles.pinnedEmptyActionText}>
                Manage categories
              </Text>
              <Feather name="arrow-right" size={13} color={colors.teal[600]} />
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* ACCOUNTS */}
      {data.accounts.length > 0 && (
        <View style={styles.section}>
          <SectionHeader
            title="Accounts"
            onPress={() => router.push("/(app)/accounts")}
          />
          <View style={styles.totalBalanceRow}>
            <View>
              <Text style={styles.totalBalanceLabel}>Total balance</Text>
              <Text style={styles.totalBalanceValue}>{fmt(totalBalance)}</Text>
            </View>
            <View style={styles.accountCountBadge}>
              <Feather name="layers" size={13} color={colors.teal[600]} />
              <Text style={styles.accountCountBadgeText}>
                {data.accounts.length}
              </Text>
            </View>
          </View>
          <View style={styles.card}>
            {visibleAccounts.map((account, index) => (
              <React.Fragment key={account.id}>
                <AccountCard account={account} />
                {index < visibleAccounts.length - 1 && (
                  <View style={styles.divider} />
                )}
              </React.Fragment>
            ))}
            {data.accounts.length > 3 && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.viewMoreRow}
                  onPress={() => router.push("/(app)/accounts")}
                >
                  <Text style={styles.viewMoreText}>
                    View {data.accounts.length - 3} more accounts
                  </Text>
                  <Feather
                    name="arrow-right"
                    size={15}
                    color={colors.teal[500]}
                  />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}

      {/* MONTHLY CHART */}
      {data.monthlyBreakdown?.length > 0 && (
        <View style={styles.section}>
          <MonthlyChart data={data.monthlyBreakdown} />
        </View>
      )}

      {/* SPENDING */}
      {visibleCategories.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title={`Spending · ${data.month}`} />
          <View style={styles.spendingSummary}>
            <View>
              <Text style={styles.spendingLabel}>Total expenses</Text>
              <Text style={styles.spendingTotal}>
                {fmt(data.monthMetrics.expense)}
              </Text>
            </View>
            <View style={styles.spendingIcon}>
              <Feather name="pie-chart" size={20} color={colors.teal[600]} />
            </View>
          </View>
          <View style={styles.card}>
            {visibleCategories.map((item) => (
              <CategoryBar
                key={item.categoryId ?? "uncategorized"}
                item={item}
                maxTotal={maxCategoryTotal}
              />
            ))}
          </View>
        </View>
      )}

      {/* LOANS */}
      <View style={styles.section}>
        <SectionHeader
          title="Loans"
          onPress={() => router.push("/(app)/loans")}
        />
        <View style={styles.loanSummaryRow}>
          <View
            style={[styles.loanSummaryCard, { borderColor: colors.teal[100] }]}
          >
            <View
              style={[
                styles.loanSummaryIcon,
                { backgroundColor: colors.teal[50] },
              ]}
            >
              <Feather
                name="arrow-down-left"
                size={15}
                color={colors.teal[600]}
              />
            </View>
            <Text style={styles.loanSummaryLabel}>Owed to me</Text>
            <Text
              style={[styles.loanSummaryValue, { color: colors.teal[700] }]}
            >
              {fmt(data.loanSummary.owedToMe)}
            </Text>
            <Text style={styles.loanSummaryCount}>
              {data.loanSummary.activeGave} active
            </Text>
          </View>
          <View
            style={[styles.loanSummaryCard, { borderColor: colors.red[200] }]}
          >
            <View
              style={[
                styles.loanSummaryIcon,
                { backgroundColor: colors.red[50] },
              ]}
            >
              <Feather
                name="arrow-up-right"
                size={15}
                color={colors.red[500]}
              />
            </View>
            <Text style={styles.loanSummaryLabel}>I owe</Text>
            <Text style={[styles.loanSummaryValue, { color: colors.red[500] }]}>
              {fmt(data.loanSummary.iOwe)}
            </Text>
            <Text style={styles.loanSummaryCount}>
              {data.loanSummary.activeReceived} active
            </Text>
          </View>
        </View>

        <View style={styles.loanNetCard}>
          <View>
            <Text style={styles.loanNetLabel}>Net loan position</Text>
            <Text
              style={[
                styles.loanNetValue,
                {
                  color:
                    data.loanSummary.net >= 0
                      ? colors.teal[600]
                      : colors.red[500],
                },
              ]}
            >
              {data.loanSummary.net >= 0 ? "+" : "-"}
              {fmt(Math.abs(data.loanSummary.net))}
            </Text>
          </View>
          <Feather
            name={data.loanSummary.net >= 0 ? "trending-up" : "trending-down"}
            size={22}
            color={
              data.loanSummary.net >= 0 ? colors.teal[600] : colors.red[500]
            }
          />
        </View>

        {data.loanSummary.overdueCount > 0 && (
          <View style={styles.overdueAlert}>
            <View style={styles.overdueIcon}>
              <Feather name="alert-circle" size={15} color={colors.red[600]} />
            </View>
            <Text style={styles.overdueText}>
              {data.loanSummary.overdueCount} overdue loan
              {data.loanSummary.overdueCount > 1 ? "s" : ""}
            </Text>
          </View>
        )}

        {visibleLoans.length > 0 && (
          <View style={[styles.card, { marginTop: 10 }]}>
            {visibleLoans.map((loan, index) => (
              <React.Fragment key={loan.id}>
                <LoanRow loan={loan} />
                {index < visibleLoans.length - 1 && (
                  <View style={styles.divider} />
                )}
              </React.Fragment>
            ))}
            {data.activeLoans.length > 3 && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.viewMoreRow}
                  onPress={() => router.push("/(app)/loans")}
                >
                  <Text style={styles.viewMoreText}>
                    View {data.activeLoans.length - 3} more loans
                  </Text>
                  <Feather
                    name="arrow-right"
                    size={15}
                    color={colors.teal[500]}
                  />
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>

      {/* RECENT TRANSACTIONS */}
      {data.recentTransactions.length > 0 && (
        <View style={styles.section}>
          <SectionHeader
            title="Recent transactions"
            onPress={() => router.push("/(app)/transactions")}
          />
          <View style={styles.card}>
            {data.recentTransactions.slice(0, 6).map((txn, index) => (
              <React.Fragment key={txn.id}>
                <TxnRow txn={txn} />
                {index < Math.min(data.recentTransactions.length, 6) - 1 && (
                  <View style={styles.divider} />
                )}
              </React.Fragment>
            ))}
            {data.recentTransactions.length > 6 && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.viewMoreRow}
                  onPress={() => router.push("/(app)/transactions")}
                >
                  <Text style={styles.viewMoreText}>View all transactions</Text>
                  <Feather
                    name="arrow-right"
                    size={15}
                    color={colors.teal[500]}
                  />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  content: { paddingBottom: 100 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.gray[50],
  },

  /* Hero */
  hero: {
    backgroundColor: colors.teal[700],
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
    gap: 18,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(204,251,241,0.7)",
    letterSpacing: 1.5,
  },
  heroGreeting: {
    marginTop: 4,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  logoutButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  netWorthBlock: { gap: 4 },
  netWorthLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(204,251,241,0.7)",
  },
  netWorthValue: {
    fontSize: 38,
    lineHeight: 44,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  netWorthTrend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  trendIcon: {
    width: 21,
    height: 21,
    borderRadius: 7,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  trendText: { fontSize: 11, fontWeight: "700" },

  metricsCard: {
    flexDirection: "row",
    borderRadius: 17,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  metric: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 5,
    alignItems: "center",
  },
  metricIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 10,
    color: "rgba(204,251,241,0.6)",
    fontWeight: "600",
  },
  metricValue: { fontSize: 13, fontWeight: "800", marginTop: 3 },
  metricDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.10)" },

  heroFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthBadge: { flexDirection: "row", alignItems: "center", gap: 7 },
  monthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#99F6E4",
  },
  monthText: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(204,251,241,0.8)",
  },
  accountCount: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(204,251,241,0.55)",
  },

  /* Sections */
  section: { marginTop: 22, paddingHorizontal: 16, gap: 10 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "800",
    color: colors.gray[900],
  },
  sectionActionBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  sectionAction: { fontSize: 13, color: colors.teal[600], fontWeight: "700" },

  /* Card */
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.gray[100],
    overflow: "hidden",
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray[100],
    marginHorizontal: 14,
  },

  /* Quick Actions */
  quickActionsCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.gray[100],
    paddingVertical: 13,
    paddingHorizontal: 7,
  },
  quickAction: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  quickIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: colors.teal[50],
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: { fontSize: 11, fontWeight: "700", color: colors.gray[700] },

  /* Total Balance */
  totalBalanceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  totalBalanceLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.gray[500],
  },
  totalBalanceValue: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.gray[900],
    marginTop: 2,
  },
  accountCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.teal[50],
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  accountCountBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.teal[700],
  },

  /* Account */
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 11,
  },
  accountIconWrap: {
    width: 39,
    height: 39,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  accountInfo: { flex: 1 },
  accountName: { fontSize: 14, fontWeight: "800", color: colors.gray[900] },
  accountType: {
    fontSize: 11,
    color: colors.gray[400],
    marginTop: 2,
    textTransform: "capitalize",
  },
  accountBalance: { fontSize: 14, fontWeight: "900" },
  viewMoreRow: {
    minHeight: 45,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  viewMoreText: { fontSize: 12, fontWeight: "700", color: colors.teal[600] },

  /* Chart */
  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.gray[100],
    overflow: "hidden",
    paddingTop: 16,
    paddingBottom: 12,
  },
  chartHeader: { paddingHorizontal: 15, gap: 12 },
  chartTitle: { fontSize: 16, fontWeight: "800", color: colors.gray[900] },
  chartSubtitle: { fontSize: 11, color: colors.gray[400], marginTop: 2 },
  chartLegend: { flexDirection: "row", gap: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 10, color: colors.gray[500], fontWeight: "600" },
  chartScroll: { paddingHorizontal: 15, paddingTop: 14 },
  chartArea: { width: 560, height: 195, position: "relative" },
  chartGrid: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 4,
    height: 150,
    justifyContent: "space-between",
  },
  chartGridLine: {
    height: 1,
    backgroundColor: colors.gray[100],
    width: "100%",
  },
  barsContainer: {
    height: 190,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    paddingHorizontal: 5,
  },
  chartColumn: {
    width: 39,
    height: 190,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  barGroup: {
    height: 154,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
  },
  bar: {
    width: 10,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    minHeight: 4,
  },
  incomeBar: { backgroundColor: colors.teal[400] },
  expenseBar: { backgroundColor: colors.red[400] },
  chartMonth: {
    fontSize: 9,
    fontWeight: "600",
    color: colors.gray[400],
    marginTop: 7,
  },

  /* Spending */
  spendingSummary: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.gray[100],
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  spendingLabel: { fontSize: 11, fontWeight: "600", color: colors.gray[500] },
  spendingTotal: {
    fontSize: 23,
    fontWeight: "900",
    color: colors.gray[900],
    marginTop: 3,
  },
  spendingIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: colors.teal[50],
    alignItems: "center",
    justifyContent: "center",
  },

  /* Category */
  categoryRow: { paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryNameWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryEmoji: { fontSize: 15 },
  categoryName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: colors.gray[800],
  },
  categoryAmount: { fontSize: 13, fontWeight: "800", color: colors.gray[900] },
  categoryTrack: {
    height: 6,
    borderRadius: 4,
    backgroundColor: colors.teal[50],
    overflow: "hidden",
  },
  categoryFill: { height: 6, borderRadius: 4, minWidth: 4 },

  /* Loans */
  loanSummaryRow: { flexDirection: "row", gap: 10 },
  loanSummaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    gap: 6,
  },
  loanSummaryIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  loanSummaryLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.gray[500],
  },
  loanSummaryValue: { fontSize: 18, fontWeight: "900" },
  loanSummaryCount: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.gray[400],
  },
  loanNetCard: {
    marginTop: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray[100],
    paddingHorizontal: 15,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  loanNetLabel: { fontSize: 11, fontWeight: "600", color: colors.gray[500] },
  loanNetValue: { fontSize: 20, fontWeight: "900", marginTop: 2 },
  overdueAlert: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.red[50],
    borderRadius: 12,
    padding: 11,
    borderWidth: 1,
    borderColor: colors.red[100],
  },
  overdueIcon: {
    width: 27,
    height: 27,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  overdueText: { fontSize: 12, color: colors.red[600], fontWeight: "700" },

  /* Loan Row */
  loanRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 9,
  },
  loanDirectionBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  loanDirectionText: { fontSize: 10, fontWeight: "800" },
  loanInfo: { flex: 1 },
  loanPerson: { fontSize: 14, fontWeight: "800", color: colors.gray[900] },
  loanOverdue: {
    fontSize: 10,
    color: colors.red[500],
    fontWeight: "700",
    marginTop: 2,
  },
  loanAmounts: { alignItems: "flex-end" },
  loanOutstanding: { fontSize: 14, fontWeight: "900", color: colors.gray[900] },
  loanTotal: { fontSize: 10, color: colors.gray[400], marginTop: 2 },

  /* Transactions */
  transactionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 11,
  },
  transactionIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  transactionEmoji: { fontSize: 17 },
  transactionInfo: { flex: 1 },
  transactionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.gray[900],
  },
  transactionMeta: { fontSize: 10, color: colors.gray[400], marginTop: 3 },
  transactionAmount: { fontSize: 14, fontWeight: "900" },

  /* Retry */
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.teal[600],
    borderRadius: 12,
  },
  retryLabel: { color: "#FFFFFF", fontWeight: "800" },

  /* Pinned */
  pinnedRow: { gap: 10, paddingRight: 16 },
  pinnedCard: {
    width: 135,
    minHeight: 135,
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    borderWidth: 1.5,
    padding: 13,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  pinnedIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  pinnedEmoji: { fontSize: 20 },
  pinnedName: {
    width: "100%",
    textAlign: "center",
    fontSize: 12,
    fontWeight: "800",
    color: colors.gray[800],
  },
  pinnedTotal: { fontSize: 16, fontWeight: "900", marginTop: 2 },
  pinnedLabel: { fontSize: 10, fontWeight: "600", color: colors.gray[400] },
  pinnedEmptyState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: colors.teal[100],
    borderStyle: "dashed",
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 6,
  },
  pinnedEmptyText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray[400],
    textAlign: "center",
  },
  pinnedEmptyAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  pinnedEmptyActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.teal[600],
  },
});
