import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

export function AccountStatementModal({ account, visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [selectedRange, setSelectedRange] = useState(0);
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
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose} />
      <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
        {/* Handle */}
        <View style={s.handle} />

        {/* Sheet Header */}
        <View style={s.sheetHeader}>
          <View>
            <Text style={s.sheetTitle}>Account Statement</Text>
            <Text style={s.sheetSub}>{account.name}</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <View style={s.closeBtn}>
              <Feather name="x" size={16} color={colors.teal[700]} />
            </View>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Range chips */}
          <Text style={s.sectionLabel}>DATE RANGE</Text>
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
          <Text style={s.sectionLabel}>SUMMARY</Text>
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
            <>
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
              <View style={s.rowCountBox}>
                <Feather name="list" size={14} color={colors.gray[500]} />
                <Text style={s.rowCountText}>
                  {data.rows.length} transaction
                  {data.rows.length !== 1 ? "s" : ""}
                </Text>
              </View>
            </>
          ) : null}
        </ScrollView>

        {/* Download button */}
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
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray[200],
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  sheetTitle: { fontSize: 17, fontWeight: "800", color: colors.gray[900] },
  sheetSub: { fontSize: 13, color: colors.gray[500], marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.teal[50],
    alignItems: "center",
    justifyContent: "center",
  },

  sectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.gray[400],
    letterSpacing: 1.2,
    marginTop: 18,
    marginBottom: 8,
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
    marginTop: 10,
  },
  datePicker: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.gray[50],
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

  loadingBox: {
    height: 90,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.gray[50],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  hintText: { fontSize: 13, color: colors.gray[400] },
  errorText: { fontSize: 13, color: colors.red[500] },

  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  summaryCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: colors.gray[50],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.gray[100],
    padding: 14,
    gap: 4,
  },
  summaryLabel: { fontSize: 11, fontWeight: "600", color: colors.gray[500] },
  summaryValue: { fontSize: 15, fontWeight: "700" },

  rowCountBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 12,
    paddingBottom: 4,
  },
  rowCountText: { fontSize: 13, color: colors.gray[500] },

  pdfBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.teal[600],
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 16,
  },
  pdfBtnDisabled: { opacity: 0.6 },
  pdfBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
