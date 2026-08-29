import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useQuery } from "@tanstack/react-query";
import Feather from "@expo/vector-icons/Feather";
import { colors } from "@/components/ui/theme";
import type { Account } from "@/types/finance";
import {
  getAccountStatement,
  openAccountStatementPdf,
} from "@/lib/api/reports.api";

interface Props {
  account: Account;
  visible: boolean;
  onClose: () => void;
}

const QUICK_RANGES = [
  { label: "This month", getRange: () => thisMonth() },
  { label: "Last 3 months", getRange: () => lastNMonths(3) },
  { label: "Last 6 months", getRange: () => lastNMonths(6) },
  { label: "This year", getRange: () => thisYear() },
  { label: "All time", getRange: () => ({ from: "", to: "" }) },
  { label: "Custom", getRange: () => null },
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function fmt(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function displayFmt(iso: string) {
  if (!iso) return "Select";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
function thisMonth() {
  const now = new Date();
  return {
    from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}
function lastNMonths(n: number) {
  const now = new Date();
  return {
    from: fmt(new Date(now.getFullYear(), now.getMonth() - (n - 1), 1)),
    to: fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}
function thisYear() {
  const y = new Date().getFullYear();
  return { from: `${y}-01-01`, to: `${y}-12-31` };
}
function fmtAmount(n: number) {
  return n.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function AccountStatementModal({ account, visible, onClose }: Props) {
  const [selectedRange, setSelectedRange] = useState(1);
  const [customFrom, setCustomFrom] = useState(
    fmt(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
  );
  const [customTo, setCustomTo] = useState(fmt(new Date()));
  const [pickerTarget, setPickerTarget] = useState<"from" | "to" | null>(null);
  const [openingPdf, setOpeningPdf] = useState(false);

  const isCustom = selectedRange === QUICK_RANGES.length - 1;
  const customValid =
    !isCustom || (!!customFrom && !!customTo && customFrom <= customTo);

  const range = isCustom
    ? { from: customFrom, to: customTo }
    : (QUICK_RANGES[selectedRange].getRange() ?? { from: "", to: "" });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["account-statement", account.id, range.from, range.to],
    queryFn: () =>
      getAccountStatement({
        accountId: account.id,
        fromDate: range.from || undefined,
        toDate: range.to || undefined,
      }),
    enabled: visible && (!isCustom || customValid),
  });

  const handlePickerChange = (_: any, date?: Date) => {
    if (Platform.OS === "android") setPickerTarget(null);
    if (!date || !pickerTarget) return;
    if (pickerTarget === "from") setCustomFrom(fmt(date));
    else setCustomTo(fmt(date));
  };

  const handleDownloadPdf = async () => {
    setOpeningPdf(true);
    try {
      await openAccountStatementPdf({
        accountId: account.id,
        fromDate: range.from || undefined,
        toDate: range.to || undefined,
      });
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : String(e));
    } finally {
      setOpeningPdf(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={s.root}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.headerTitle}>Account Statement</Text>
            <Text style={s.headerSub}>{account.name}</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <View style={s.closeBtn}>
              <Feather name="x" size={18} color={colors.teal[700]} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Range picker */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Date range</Text>
          <View style={s.chipRow}>
            {QUICK_RANGES.map((r, i) => (
              <TouchableOpacity
                key={r.label}
                style={[s.chip, selectedRange === i && s.chipActive]}
                onPress={() => setSelectedRange(i)}
              >
                <Text
                  style={[s.chipText, selectedRange === i && s.chipTextActive]}
                >
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {isCustom && (
            <View style={s.customRow}>
              <TouchableOpacity
                style={s.datePicker}
                onPress={() => setPickerTarget("from")}
              >
                <Feather name="calendar" size={14} color={colors.teal[600]} />
                <View>
                  <Text style={s.datePickerLabel}>From</Text>
                  <Text style={s.datePickerValue}>
                    {displayFmt(customFrom)}
                  </Text>
                </View>
              </TouchableOpacity>

              <Feather name="arrow-right" size={14} color={colors.gray[400]} />

              <TouchableOpacity
                style={s.datePicker}
                onPress={() => setPickerTarget("to")}
              >
                <Feather name="calendar" size={14} color={colors.teal[600]} />
                <View>
                  <Text style={s.datePickerLabel}>To</Text>
                  <Text style={s.datePickerValue}>{displayFmt(customTo)}</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Inline iOS picker */}
        {isCustom && pickerTarget && Platform.OS === "ios" && (
          <View style={s.iosPickerWrap}>
            <View style={s.iosPickerHeader}>
              <Text style={s.iosPickerTitle}>
                Select {pickerTarget === "from" ? "start" : "end"} date
              </Text>
              <TouchableOpacity onPress={() => setPickerTarget(null)}>
                <Text style={s.iosPickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              mode="date"
              display="spinner"
              value={new Date(pickerTarget === "from" ? customFrom : customTo)}
              onChange={handlePickerChange}
              maximumDate={
                pickerTarget === "from" ? new Date(customTo) : new Date()
              }
              minimumDate={
                pickerTarget === "to" ? new Date(customFrom) : undefined
              }
              themeVariant="light"
            />
          </View>
        )}

        {/* Android picker */}
        {isCustom && pickerTarget && Platform.OS === "android" && (
          <DateTimePicker
            mode="date"
            display="default"
            value={new Date(pickerTarget === "from" ? customFrom : customTo)}
            onChange={handlePickerChange}
            maximumDate={
              pickerTarget === "from" ? new Date(customTo) : new Date()
            }
            minimumDate={
              pickerTarget === "to" ? new Date(customFrom) : undefined
            }
          />
        )}

        {/* Summary */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Summary</Text>
          {isCustom && !customValid ? (
            <View style={s.loadingBox}>
              <Text style={s.hintText}>Select a valid date range above</Text>
            </View>
          ) : isLoading ? (
            <View style={s.loadingBox}>
              <ActivityIndicator color={colors.teal[500]} />
            </View>
          ) : isError ? (
            <View style={s.loadingBox}>
              <Text style={s.errorText}>Failed to load statement</Text>
            </View>
          ) : data ? (
            <View style={s.summaryGrid}>
              <SummaryCard
                label="Opening"
                value={fmtAmount(data.openingBalance)}
                color={colors.gray[700]}
              />
              <SummaryCard
                label="Total Credit"
                value={fmtAmount(data.totalCredit)}
                color="#16a34a"
              />
              <SummaryCard
                label="Total Debit"
                value={fmtAmount(data.totalDebit)}
                color="#dc2626"
              />
              <SummaryCard
                label="Closing"
                value={fmtAmount(data.closingBalance)}
                color={colors.teal[700]}
              />
            </View>
          ) : null}
        </View>

        {data && (
          <View style={s.rowCountBox}>
            <Feather name="list" size={14} color={colors.gray[500]} />
            <Text style={s.rowCountText}>
              {data.rows.length} transaction{data.rows.length !== 1 ? "s" : ""}
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={s.footer}>
          <TouchableOpacity
            style={[
              s.pdfBtn,
              (isLoading || openingPdf || (isCustom && !customValid)) &&
                s.pdfBtnDisabled,
            ]}
            onPress={handleDownloadPdf}
            disabled={isLoading || openingPdf || (isCustom && !customValid)}
          >
            {openingPdf ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Feather name="download" size={16} color="#fff" />
            )}
            <Text style={s.pdfBtnText}>
              {openingPdf ? "Opening…" : "Download PDF"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={s.summaryCard}>
      <Text style={s.summaryLabel}>{label}</Text>
      <Text style={[s.summaryValue, { color }]}>৳{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: colors.teal[50],
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: colors.gray[900] },
  headerSub: { fontSize: 13, color: colors.gray[500], marginTop: 2 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.teal[50],
    alignItems: "center",
    justifyContent: "center",
  },

  section: { paddingHorizontal: 20, paddingTop: 20, gap: 10 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.gray[500],
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    backgroundColor: "#fff",
  },
  chipActive: {
    borderColor: colors.teal[500],
    backgroundColor: colors.teal[50],
  },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.gray[600] },
  chipTextActive: { color: colors.teal[700] },

  customRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  datePicker: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: colors.teal[100],
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  datePickerLabel: { fontSize: 10, fontWeight: "600", color: colors.gray[400] },
  datePickerValue: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.gray[900],
    marginTop: 1,
  },

  iosPickerWrap: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    marginTop: 8,
  },
  iosPickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  iosPickerTitle: { fontSize: 14, fontWeight: "600", color: colors.gray[700] },
  iosPickerDone: { fontSize: 14, fontWeight: "700", color: colors.teal[600] },

  loadingBox: {
    height: 90,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.teal[50],
  },
  hintText: { fontSize: 13, color: colors.gray[400] },
  errorText: { fontSize: 13, color: colors.red[500] },

  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  summaryCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.teal[50],
    padding: 14,
    gap: 4,
  },
  summaryLabel: { fontSize: 11, fontWeight: "600", color: colors.gray[500] },
  summaryValue: { fontSize: 15, fontWeight: "700" },

  rowCountBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  rowCountText: { fontSize: 13, color: colors.gray[500] },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  pdfBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.teal[600],
    borderRadius: 14,
    paddingVertical: 14,
  },
  pdfBtnDisabled: { opacity: 0.6 },
  pdfBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
