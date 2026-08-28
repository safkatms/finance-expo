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
import * as DocumentPicker from "expo-document-picker";
import {
  importAccounts,
  importLoans,
  importMonthly,
  importLoanPayments,
  getImportHistory,
  ImportResult,
  ImportJob,
} from "@/lib/api/import.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { Spinner } from "@/components/ui/Spinner";
import { colors } from "@/components/ui/theme";
import Feather from "@expo/vector-icons/Feather";

type ImportType = "accounts" | "loans" | "monthly" | "loan-payments";

interface ImportConfig {
  key: ImportType;
  label: string;
  description: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  color: string;
  order: number;
}

const IMPORTS: ImportConfig[] = [
  {
    key: "accounts",
    label: "Accounts",
    description: 'Sheet: "Accounts" · Columns: Account Name, Opening Balance',
    icon: "credit-card",
    color: colors.indigo[600],
    order: 1,
  },
  {
    key: "loans",
    label: "Loans",
    description: 'Sheet: "Loans" · Import accounts first',
    icon: "users",
    color: colors.green[600],
    order: 2,
  },
  {
    key: "monthly",
    label: "Monthly Transactions",
    description:
      "Sheets named MMM-YYYY (e.g. Aug-2026) · Import accounts first",
    icon: "list",
    color: colors.indigo[400],
    order: 3,
  },
  {
    key: "loan-payments",
    label: "Loan Payments",
    description: 'Sheet: "Loan Payments" · Import loans first',
    icon: "check-circle",
    color: colors.amber[500],
    order: 4,
  },
];

const IMPORT_FNS: Record<ImportType, (f: any) => Promise<ImportResult>> = {
  accounts: importAccounts,
  loans: importLoans,
  monthly: importMonthly,
  "loan-payments": importLoanPayments,
};

const STATUS_COLORS: Record<string, string> = {
  completed: colors.green[500],
  partial: colors.amber[500],
  failed: colors.red[500],
};

function ResultCard({
  result,
  label,
}: {
  result: ImportResult;
  label: string;
}) {
  return (
    <View style={s.resultCard}>
      <View style={s.resultHeader}>
        <Feather name="check-circle" size={18} color={colors.green[500]} />
        <Text style={s.resultTitle}>{label} — Import Complete</Text>
      </View>
      <View style={s.resultStats}>
        <View style={[s.resultStat, { backgroundColor: colors.green[50] }]}>
          <Text style={[s.resultStatValue, { color: colors.green[600] }]}>
            {result.rowsOk}
          </Text>
          <Text style={s.resultStatLabel}>Imported</Text>
        </View>
        <View style={[s.resultStat, { backgroundColor: colors.amber[50] }]}>
          <Text style={[s.resultStatValue, { color: colors.amber[600] }]}>
            {result.rowsSkipped}
          </Text>
          <Text style={s.resultStatLabel}>Skipped</Text>
        </View>
        <View style={[s.resultStat, { backgroundColor: colors.red[50] }]}>
          <Text style={[s.resultStatValue, { color: colors.red[500] }]}>
            {result.rowsFailed}
          </Text>
          <Text style={s.resultStatLabel}>Failed</Text>
        </View>
      </View>
      {result.errors.length > 0 && (
        <View style={s.errorsWrap}>
          <Text style={s.errorsTitle}>Errors:</Text>
          {result.errors.slice(0, 5).map((e, i) => (
            <Text key={i} style={s.errorLine}>
              • {e}
            </Text>
          ))}
          {result.errors.length > 5 && (
            <Text style={s.errorLine}>
              …and {result.errors.length - 5} more
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

function HistoryRow({ job }: { job: ImportJob }) {
  const statusColor = STATUS_COLORS[job.status] ?? colors.gray[400];
  const typeLabel =
    IMPORTS.find((i) => job.type?.toLowerCase().includes(i.key))?.label ??
    job.type;
  return (
    <View style={s.historyRow}>
      <View style={[s.historyDot, { backgroundColor: statusColor }]} />
      <View style={s.historyInfo}>
        <Text style={s.historyType}>{typeLabel}</Text>
        <Text style={s.historyDate}>
          {new Date(job.createdAt).toLocaleDateString()} ·{" "}
          {new Date(job.createdAt).toLocaleTimeString()}
        </Text>
      </View>
      <View style={s.historyStats}>
        <Text style={[s.historyOk, { color: colors.green[600] }]}>
          {job.rowsOk} ok
        </Text>
        {job.rowsFailed > 0 && (
          <Text style={[s.historyOk, { color: colors.red[500] }]}>
            {job.rowsFailed} failed
          </Text>
        )}
      </View>
    </View>
  );
}

export default function ImportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();

  const [results, setResults] = useState<
    Partial<Record<ImportType, ImportResult>>
  >({});
  const [loading, setLoading] = useState<ImportType | null>(null);

  const {
    data: history,
    isLoading: historyLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["import-history"],
    queryFn: getImportHistory,
  });

  const pickAndImport = async (config: ImportConfig) => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        copyToCacheDirectory: true,
      });

      if (picked.canceled || !picked.assets?.[0]) return;

      const asset = picked.assets[0];
      setLoading(config.key);

      const result = await IMPORT_FNS[config.key]({
        uri: asset.uri,
        name: asset.name ?? "import.xlsx",
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      setResults((prev) => ({ ...prev, [config.key]: result }));
      qc.invalidateQueries({ queryKey: ["import-history"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["loans"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err) {
      Alert.alert(
        "Import Failed",
        getApiErrorMessage(err, "Failed to import file"),
      );
    } finally {
      setLoading(null);
    }
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Feather name="arrow-left" size={22} color={colors.gray[700]} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Import Data</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          s.content,
          { paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        {/* Info banner */}
        <View style={s.infoBanner}>
          <Feather name="info" size={15} color={colors.indigo[600]} />
          <Text style={s.infoText}>
            Import order matters: Accounts → Loans → Transactions → Loan
            Payments
          </Text>
        </View>

        {/* Import cards */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Upload Excel Files</Text>
          {IMPORTS.map((config) => {
            const isLoading = loading === config.key;
            const result = results[config.key];
            return (
              <View key={config.key}>
                <View style={s.importCard}>
                  <View
                    style={[
                      s.importIconWrap,
                      { backgroundColor: config.color + "15" },
                    ]}
                  >
                    <Text style={s.importOrder}>{config.order}</Text>
                  </View>
                  <View style={s.importInfo}>
                    <Text style={s.importLabel}>{config.label}</Text>
                    <Text style={s.importDesc}>{config.description}</Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      s.uploadBtn,
                      { backgroundColor: config.color },
                      isLoading && s.uploadBtnDisabled,
                    ]}
                    onPress={() => pickAndImport(config)}
                    disabled={isLoading || !!loading}
                  >
                    {isLoading ? (
                      <Spinner size="small" color="#fff" />
                    ) : (
                      <Feather name="upload" size={16} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>
                {result && <ResultCard result={result} label={config.label} />}
              </View>
            );
          })}
        </View>

        {/* History */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Import History</Text>
          {historyLoading ? (
            <View style={s.center}>
              <Spinner />
            </View>
          ) : !history || history.length === 0 ? (
            <View style={s.empty}>
              <Feather name="inbox" size={32} color={colors.gray[300]} />
              <Text style={s.emptyText}>No imports yet</Text>
            </View>
          ) : (
            <View style={s.card}>
              {history.map((job, i) => (
                <React.Fragment key={job.id}>
                  <HistoryRow job={job} />
                  {i < history.length - 1 && <View style={s.divider} />}
                </React.Fragment>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  center: { justifyContent: "center", alignItems: "center", padding: 24 },
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
  content: { padding: 16, gap: 20 },

  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: colors.indigo[50],
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.indigo[100],
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.indigo[700],
    lineHeight: 18,
  },

  section: { gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.gray[900] },

  importCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.gray[100],
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  importIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  importOrder: { fontSize: 16, fontWeight: "800", color: colors.gray[700] },
  importInfo: { flex: 1 },
  importLabel: { fontSize: 14, fontWeight: "700", color: colors.gray[900] },
  importDesc: {
    fontSize: 11,
    color: colors.gray[400],
    marginTop: 2,
    lineHeight: 15,
  },
  uploadBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadBtnDisabled: { opacity: 0.5 },

  resultCard: {
    backgroundColor: colors.green[50],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.green[200],
    padding: 14,
    gap: 10,
    marginTop: 6,
  },
  resultHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  resultTitle: { fontSize: 13, fontWeight: "700", color: colors.green[700] },
  resultStats: { flexDirection: "row", gap: 8 },
  resultStat: {
    flex: 1,
    alignItems: "center",
    borderRadius: 10,
    paddingVertical: 8,
  },
  resultStatValue: { fontSize: 20, fontWeight: "800" },
  resultStatLabel: {
    fontSize: 10,
    color: colors.gray[500],
    fontWeight: "600",
    marginTop: 2,
  },
  errorsWrap: { gap: 4 },
  errorsTitle: { fontSize: 12, fontWeight: "700", color: colors.red[600] },
  errorLine: { fontSize: 11, color: colors.red[500] },

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
    marginHorizontal: 14,
  },

  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  historyDot: { width: 8, height: 8, borderRadius: 4 },
  historyInfo: { flex: 1 },
  historyType: { fontSize: 13, fontWeight: "700", color: colors.gray[900] },
  historyDate: { fontSize: 11, color: colors.gray[400], marginTop: 2 },
  historyStats: { alignItems: "flex-end", gap: 2 },
  historyOk: { fontSize: 12, fontWeight: "700" },

  empty: { alignItems: "center", gap: 8, paddingVertical: 24 },
  emptyText: { fontSize: 14, color: colors.gray[400], fontWeight: "600" },
});
