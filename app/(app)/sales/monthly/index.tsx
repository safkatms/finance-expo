import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ImageBackground,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import { api } from "@/lib/axios";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { getApiErrorMessage } from "@/lib/api-error";
import { colors } from "@/components/ui/theme";
import type { PaginatedResponse } from "@/types/api";

interface MonthlySummary {
  month: string;
  sales: number;
  profit: number;
  payments: number;
  returned: number;
  due: number;
}

const fmt = (v: number) =>
  `৳${v.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
const LIMIT = 6;

type MetricConfig = {
  label: string;
  value: string;
  color: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  iconBg: string;
  iconColor: string;
};

function IconBadge({
  name,
  bg,
  color,
}: {
  name: React.ComponentProps<typeof Feather>["name"];
  bg: string;
  color: string;
}) {
  return (
    <View style={[styles.iconBadge, { backgroundColor: bg }]}>
      <Feather name={name} size={15} color={color} />
    </View>
  );
}

export default function MonthlyScreen() {
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["sales", "summary", "monthly", "paginated", page],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<MonthlySummary>>(
        `/sales/summary/monthly/paginated?page=${page}&limit=${LIMIT}`,
      );
      return res.data;
    },
    placeholderData: (prev) => prev,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const fmtMonth = (m: string) => {
    const [year, month] = m.split("-");
    const name = new Date(Number(year), Number(month) - 1).toLocaleString(
      "en-US",
      { month: "long" },
    );
    return { name, key: m };
  };

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Monthly Summary</Text>
      </View>

      {isLoading && !data ? (
        <Spinner fullScreen />
      ) : error ? (
        <View style={{ padding: 20 }}>
          <Alert message={getApiErrorMessage(error)} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.indigo[600]]}
            />
          }
        >
          {/* Hero */}
          <ImageBackground
            source={require("../../../../assets/month-hero.png")}
            style={styles.hero}
            imageStyle={styles.heroImage}
            resizeMode="cover"
          >
            <View style={styles.heroContent}>
              <View style={styles.heroLeft}>
                <View style={styles.heroIconBadge}>
                  <Feather name="calendar" size={22} color="#fff" />
                </View>
                <View style={styles.heroTextBlock}>
                  <Text style={styles.heroEyebrow}>Sales</Text>
                  <Text style={styles.heroTitle}>Monthly Summary</Text>
                  <Text style={styles.heroSub}>
                    {meta
                      ? `${meta.totalItems} month${meta.totalItems !== 1 ? "s" : ""} on record`
                      : "Loading..."}
                  </Text>
                </View>
              </View>
            </View>
          </ImageBackground>

          {/* Month cards */}
          {rows.map((m) => {
            const cleared = m.due <= 0;
            const { name, key } = fmtMonth(m.month);

            const metrics: MetricConfig[] = [
              {
                label: "Aggregate Sales",
                value: fmt(m.sales),
                color: colors.gray[900],
                icon: "bar-chart-2",
                iconBg: "#EEF2FF",
                iconColor: colors.indigo[500],
              },
              {
                label: "Profit (30%)",
                value: fmt(m.profit),
                color: colors.indigo[600],
                icon: "percent",
                iconBg: "#EEF2FF",
                iconColor: colors.indigo[500],
              },
              {
                label: "Total Paid",
                value: fmt(m.payments),
                color: colors.green[600],
                icon: "download",
                iconBg: "#ECFDF5",
                iconColor: colors.green[600],
              },
              {
                label: "Total Returns",
                value: fmt(m.returned),
                color: colors.orange[500],
                icon: "rotate-ccw",
                iconBg: "#FFF7ED",
                iconColor: colors.orange[500],
              },
            ];

            return (
              <View
                key={m.month}
                style={styles.card}
                // activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <IconBadge
                      name="calendar"
                      bg={cleared ? "#ECFDF5" : "#EEF2FF"}
                      color={cleared ? colors.green[600] : colors.indigo[500]}
                    />
                    <View>
                      <Text style={styles.cardMonthName}>{name}</Text>
                      <Text style={styles.cardMonthKey}>{key}</Text>
                    </View>
                  </View>
                  <View style={styles.cardHeaderRight}>
                    <View
                      style={[
                        styles.badge,
                        cleared ? styles.badgeGreen : styles.badgeRed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          cleared ? styles.badgeTextGreen : styles.badgeTextRed,
                        ]}
                      >
                        {cleared
                          ? `Cleared: ${fmt(Math.abs(m.due))}`
                          : `Due ${fmt(m.due)}`}
                      </Text>
                    </View>
                    {/* <Feather
                      name="chevron-right"
                      size={16}
                      color={colors.indigo[400]}
                    /> */}
                  </View>
                </View>

                <View style={styles.cardBody}>
                  {metrics.map(
                    ({ label, value, color, icon, iconBg, iconColor }, i) => (
                      <View
                        key={label}
                        style={[
                          styles.rowWrapper,
                          i < metrics.length - 1 && styles.rowBorder,
                        ]}
                      >
                        <View style={styles.row}>
                          <View style={styles.rowLeft}>
                            <IconBadge
                              name={icon}
                              bg={iconBg}
                              color={iconColor}
                            />
                            <Text style={styles.rowLabel}>{label}</Text>
                          </View>
                          <Text style={[styles.rowValue, { color }]}>
                            {value}
                          </Text>
                        </View>
                      </View>
                    ),
                  )}
                </View>
              </View>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <View style={styles.paginationRow}>
              <TouchableOpacity
                style={styles.pageBtn}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                activeOpacity={0.7}
              >
                <Feather
                  name="chevron-left"
                  size={16}
                  color={page === 1 ? colors.gray[400] : colors.gray[700]}
                />
                <Text
                  style={[
                    styles.pageBtnText,
                    page === 1 && styles.pageBtnDisabled,
                  ]}
                >
                  Prev
                </Text>
              </TouchableOpacity>
              <Text style={styles.pageIndicator}>
                <Text style={styles.pageNum}>{page}</Text>
                {" of "}
                {totalPages}
              </Text>
              <TouchableOpacity
                style={styles.pageBtn}
                onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.pageBtnText,
                    page === totalPages && styles.pageBtnDisabled,
                  ]}
                >
                  Next
                </Text>
                <Feather
                  name="chevron-right"
                  size={16}
                  color={
                    page === totalPages ? colors.gray[400] : colors.gray[700]
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  headerTitle: { fontSize: 17, fontWeight: "800", color: colors.gray[900] },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 32 },

  // Hero
  hero: {
    borderRadius: 20,
    minHeight: 160,
    padding: 20,
    overflow: "hidden",
    justifyContent: "center",
  },
  heroImage: { borderRadius: 20 },
  heroContent: { flexDirection: "row", alignItems: "center" },
  heroLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    flex: 1,
  },
  heroIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTextBlock: { flex: 1, gap: 4, justifyContent: "center" },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.6)",
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  heroTitle: { fontSize: 22, fontWeight: "800", color: "#fff" },
  heroSub: { fontSize: 13, color: "rgba(255,255,255,0.65)" },

  // Icon badge
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.gray[100],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardHeaderRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardMonthName: { fontSize: 14, fontWeight: "800", color: colors.gray[900] },
  cardMonthKey: { fontSize: 11, color: colors.gray[400], marginTop: 2 },

  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeGreen: { backgroundColor: colors.green[50] },
  badgeRed: { backgroundColor: colors.red[50] },
  badgeText: { fontSize: 11, fontWeight: "700" },
  badgeTextGreen: { color: colors.green[600] },
  badgeTextRed: { color: colors.red[500] },

  cardBody: { paddingHorizontal: 16, paddingVertical: 4 },
  rowWrapper: {},
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.gray[100] },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    gap: 8,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowLabel: { fontSize: 13, color: colors.gray[500] },
  rowValue: { fontSize: 13, fontWeight: "700" },

  // Pagination
  paginationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.gray[100],
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pageBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  pageBtnText: { fontSize: 13, fontWeight: "700", color: colors.gray[500] },
  pageBtnDisabled: { color: colors.gray[400] },
  pageIndicator: { fontSize: 13, color: colors.gray[400] },
  pageNum: { fontWeight: "800", color: colors.gray[900] },
});
