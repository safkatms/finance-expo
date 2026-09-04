import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { getLoan, recordLoanPayment, updateLoan } from "@/lib/api/loans.api";
import { getAccountsWithNetWorth } from "@/lib/api/accounts.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { Spinner } from "@/components/ui/Spinner";
import { colors } from "@/components/ui/theme";
import Feather from "@expo/vector-icons/Feather";

const fmt = (v: number | string) =>
  `৳${Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

const STATUS_COLORS: Record<string, string> = {
  Outstanding: colors.red[500],
  PartiallyPaid: colors.amber[500],
  Settled: colors.green[500],
  WrittenOff: colors.gray[400],
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function fmtDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function displayFmt(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
function todayISO() {
  return fmtDate(new Date());
}

export default function LoanDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [showPayment, setShowPayment] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(todayISO());
  const [payNote, setPayNote] = useState("");
  const [payAccountId, setPayAccountId] = useState<number | null>(null);
  const [payError, setPayError] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const {
    data: loan,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["loan", id],
    queryFn: () => getLoan(Number(id)),
  });

  const { data: accountsData } = useQuery({
    queryKey: ["accounts"],
    queryFn: getAccountsWithNetWorth,
  });
  const accounts = accountsData?.accounts ?? [];

  const payMut = useMutation({
    mutationFn: () =>
      recordLoanPayment(Number(id), {
        paymentDate: payDate,
        amount: parseFloat(payAmount),
        accountId: payAccountId!,
        note: payNote || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loan", id] });
      qc.invalidateQueries({ queryKey: ["loans"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setShowPayment(false);
      setPayAmount("");
      setPayNote("");
      setPayError("");
    },
    onError: (err) =>
      setPayError(getApiErrorMessage(err, "Failed to record payment")),
  });

  const markWriteOff = () => {
    Alert.alert("Write Off Loan", "Mark this loan as written off?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Write Off",
        style: "destructive",
        onPress: () =>
          updateLoan(Number(id), { status: "WrittenOff" }).then(() => {
            qc.invalidateQueries({ queryKey: ["loan", id] });
            qc.invalidateQueries({ queryKey: ["loans"] });
          }),
      },
    ]);
  };

  const submitPayment = () => {
    if (!payAmount || isNaN(parseFloat(payAmount))) {
      setPayError("Enter a valid amount");
      return;
    }
    if (!payAccountId) {
      setPayError("Select an account");
      return;
    }
    setPayError("");
    payMut.mutate();
  };

  if (isLoading)
    return (
      <View style={s.center}>
        <Spinner />
      </View>
    );
  if (isError || !loan) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>
          {getApiErrorMessage(error, "Failed to load loan")}
        </Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
          <Text style={s.retryLabel}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const dirColor =
    loan.direction === "Gave" ? colors.green[600] : colors.red[600];
  const dirLabel = loan.direction === "Gave" ? "Lent to" : "Borrowed from";
  const statusColor = STATUS_COLORS[loan.status] ?? colors.gray[400];
  const paidPct =
    Number(loan.amount) > 0
      ? Math.min(Number(loan.totalPaid) / Number(loan.amount), 1)
      : 0;
  const isActive =
    loan.status === "Outstanding" || loan.status === "PartiallyPaid";
  const isOverdue =
    loan.dueDate && new Date(loan.dueDate) < new Date() && isActive;

  return (
    <KeyboardAvoidingView
      style={[s.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <View style={s.headerIconBtn}>
            <Feather name="arrow-left" size={18} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Loan Detail</Text>
        {isActive ? (
          <TouchableOpacity onPress={markWriteOff} hitSlop={8}>
            <View style={s.saveBtn}>
              <Text style={s.saveBtnLabel}>Write Off</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 32 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={[
          s.content,
          { paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.heroCard}>
          <View style={s.heroTop}>
            <View style={[s.dirBadge, { backgroundColor: dirColor + "18" }]}>
              <Text style={[s.dirText, { color: dirColor }]}>
                {loan.direction === "Gave" ? "Lent" : "Borrowed"}
              </Text>
            </View>
            <View
              style={[s.statusBadge, { backgroundColor: statusColor + "18" }]}
            >
              <Text style={[s.statusText, { color: statusColor }]}>
                {loan.status}
              </Text>
            </View>
          </View>

          <Text style={s.personName}>{loan.personName}</Text>
          {loan.personPhone && (
            <Text style={s.personPhone}>{loan.personPhone}</Text>
          )}
          <Text style={s.dirLabel}>{dirLabel}</Text>

          <Text style={s.heroAmount}>{fmt(loan.amount)}</Text>

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
            <View style={s.progressLabels}>
              <Text style={s.progressPaid}>Paid: {fmt(loan.totalPaid)}</Text>
              <Text style={s.progressLeft}>Left: {fmt(loan.outstanding)}</Text>
            </View>
          </View>

          <View style={s.metaRow}>
            <View style={s.metaItem}>
              <Text style={s.metaLabel}>Loan Date</Text>
              <Text style={s.metaValue}>
                {new Date(loan.loanDate).toLocaleDateString()}
              </Text>
            </View>
            {loan.dueDate && (
              <View style={s.metaItem}>
                <Text style={s.metaLabel}>Due Date</Text>
                <Text
                  style={[s.metaValue, isOverdue && { color: colors.red[500] }]}
                >
                  {new Date(loan.dueDate).toLocaleDateString()}
                  {isOverdue ? " ⚠️" : ""}
                </Text>
              </View>
            )}
            {loan.account && (
              <View style={s.metaItem}>
                <Text style={s.metaLabel}>Account</Text>
                <Text style={s.metaValue}>{loan.account.name}</Text>
              </View>
            )}
          </View>

          {loan.purpose && (
            <View style={s.purposeWrap}>
              <Text style={s.purposeLabel}>Purpose</Text>
              <Text style={s.purposeText}>{loan.purpose}</Text>
            </View>
          )}
          {loan.notes && (
            <View style={s.purposeWrap}>
              <Text style={s.purposeLabel}>Notes</Text>
              <Text style={s.purposeText}>{loan.notes}</Text>
            </View>
          )}
        </View>

        {isActive && (
          <View style={s.section}>
            <TouchableOpacity
              style={s.payBtn}
              onPress={() => {
                setShowPayment((v) => !v);
                setShowDatePicker(false);
              }}
            >
              <Feather
                name={showPayment ? "x-circle" : "plus-circle"}
                size={16}
                color="#fff"
              />
              <Text style={s.payBtnLabel}>
                {showPayment ? "Cancel" : "Record Payment"}
              </Text>
            </TouchableOpacity>

            {showPayment && (
              <View style={s.payForm}>
                {payError ? <Text style={s.payError}>{payError}</Text> : null}

                <View style={s.field}>
                  <Text style={s.label}>Amount *</Text>
                  <View style={s.inputRow}>
                    <View style={s.inputPrefix}>
                      <Text style={s.currencySymbol}>৳</Text>
                    </View>
                    <TextInput
                      style={s.textInput}
                      placeholder="0"
                      placeholderTextColor={colors.gray[300]}
                      keyboardType="numeric"
                      value={payAmount}
                      onChangeText={setPayAmount}
                    />
                  </View>
                </View>

                <View style={s.field}>
                  <Text style={s.label}>Payment Date *</Text>
                  <TouchableOpacity
                    style={s.inputRow}
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.7}
                  >
                    <View style={s.inputPrefix}>
                      <Feather
                        name="calendar"
                        size={15}
                        color={colors.teal[500]}
                      />
                    </View>
                    <Text style={[s.textInput, s.dateText]}>
                      {displayFmt(payDate)}
                    </Text>
                  </TouchableOpacity>

                  {showDatePicker && Platform.OS === "android" && (
                    <DateTimePicker
                      mode="date"
                      display="default"
                      value={new Date(payDate)}
                      maximumDate={new Date()}
                      onChange={(_, date) => {
                        setShowDatePicker(false);
                        if (date) setPayDate(fmtDate(date));
                      }}
                    />
                  )}
                </View>

                {showDatePicker && Platform.OS === "ios" && (
                  <View style={s.iosPickerWrap}>
                    <View style={s.iosPickerHeader}>
                      <Text style={s.iosPickerTitle}>Select date</Text>
                      <TouchableOpacity
                        onPress={() => setShowDatePicker(false)}
                      >
                        <Text style={s.iosPickerDone}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      mode="date"
                      display="spinner"
                      value={new Date(payDate)}
                      maximumDate={new Date()}
                      onChange={(_, date) => {
                        if (date) setPayDate(fmtDate(date));
                      }}
                      themeVariant="light"
                    />
                  </View>
                )}

                <View style={s.field}>
                  <Text style={s.label}>Account *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={s.chipRow}>
                      {accounts.map((acc) => (
                        <TouchableOpacity
                          key={acc.id}
                          style={[
                            s.chip,
                            payAccountId === acc.id && s.chipSelected,
                          ]}
                          onPress={() => setPayAccountId(acc.id)}
                        >
                          <Text
                            style={[
                              s.chipLabel,
                              payAccountId === acc.id && s.chipLabelSelected,
                            ]}
                          >
                            {acc.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                <View style={s.field}>
                  <Text style={s.label}>Note</Text>
                  <View style={[s.inputRow, s.textareaRow]}>
                    <View style={s.inputPrefixTop}>
                      <Feather
                        name="align-left"
                        size={15}
                        color={colors.teal[500]}
                      />
                    </View>
                    <TextInput
                      style={[s.textInput, s.textarea]}
                      placeholder="Optional note…"
                      placeholderTextColor={colors.gray[300]}
                      multiline
                      numberOfLines={3}
                      value={payNote}
                      onChangeText={setPayNote}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[s.submitBtn, payMut.isPending && s.submitBtnDisabled]}
                  onPress={submitPayment}
                  disabled={payMut.isPending}
                >
                  <Text style={s.submitBtnLabel}>
                    {payMut.isPending ? "Saving…" : "Save Payment"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {loan.payments && loan.payments.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Payment History</Text>
            <View style={s.card}>
              {loan.payments.map((payment, i) => (
                <React.Fragment key={payment.id}>
                  <View style={s.paymentRow}>
                    <View style={s.paymentIcon}>
                      <Feather
                        name="check-circle"
                        size={14}
                        color={colors.green[500]}
                      />
                    </View>
                    <View style={s.paymentInfo}>
                      <Text style={s.paymentDate}>
                        {new Date(payment.paymentDate).toLocaleDateString()}
                      </Text>
                      {payment.note && (
                        <Text style={s.paymentNote}>{payment.note}</Text>
                      )}
                    </View>
                    <Text style={s.paymentAmount}>{fmt(payment.amount)}</Text>
                  </View>
                  {i < loan.payments!.length - 1 && <View style={s.divider} />}
                </React.Fragment>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
  saveBtn: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  saveBtnLabel: { fontSize: 13, fontWeight: "700", color: "#fff" },

  content: { padding: 16, gap: 16 },

  heroCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.gray[100],
    padding: 18,
    gap: 10,
  },
  heroTop: { flexDirection: "row", gap: 8 },
  dirBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  dirText: { fontSize: 12, fontWeight: "800" },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: "700" },
  personName: { fontSize: 22, fontWeight: "800", color: colors.gray[900] },
  personPhone: { fontSize: 13, color: colors.gray[400] },
  dirLabel: { fontSize: 12, color: colors.gray[500], fontWeight: "600" },
  heroAmount: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.gray[900],
    letterSpacing: -0.5,
  },

  progressWrap: { gap: 6 },
  progressBg: {
    height: 8,
    backgroundColor: colors.gray[100],
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: { height: 8, borderRadius: 4, minWidth: 4 },
  progressLabels: { flexDirection: "row", justifyContent: "space-between" },
  progressPaid: { fontSize: 12, color: colors.gray[500] },
  progressLeft: { fontSize: 12, color: colors.gray[500] },

  metaRow: { flexDirection: "row", gap: 16, flexWrap: "wrap" },
  metaItem: { gap: 2 },
  metaLabel: {
    fontSize: 10,
    color: colors.gray[400],
    fontWeight: "600",
    textTransform: "uppercase",
  },
  metaValue: { fontSize: 13, fontWeight: "700", color: colors.gray[800] },

  purposeWrap: { gap: 4 },
  purposeLabel: {
    fontSize: 11,
    color: colors.gray[400],
    fontWeight: "600",
    textTransform: "uppercase",
  },
  purposeText: { fontSize: 13, color: colors.gray[700] },

  section: { gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.gray[900] },

  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.teal[600],
    borderRadius: 14,
    paddingVertical: 14,
  },
  payBtnLabel: { fontSize: 15, fontWeight: "700", color: "#fff" },

  payForm: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray[100],
    padding: 16,
    gap: 14,
  },
  payError: { fontSize: 13, color: colors.red[500], fontWeight: "600" },
  field: { gap: 6 },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gray[600],
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: 2,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: colors.teal[100],
    borderRadius: 14,
    overflow: "hidden",
  },
  inputPrefix: {
    width: 44,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: colors.teal[50],
  },
  inputPrefixTop: {
    width: 44,
    paddingTop: 14,
    alignItems: "center",
    alignSelf: "flex-start",
  },
  textInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 12,
    fontSize: 15,
    color: colors.gray[900],
  },
  dateText: { lineHeight: 50 },
  textareaRow: { alignItems: "flex-start" },
  textarea: { height: 88, paddingTop: 14, textAlignVertical: "top" },
  currencySymbol: { fontSize: 16, fontWeight: "700", color: colors.teal[500] },

  chipRow: { flexDirection: "row", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    backgroundColor: "#fff",
  },
  chipSelected: {
    borderColor: colors.teal[500],
    backgroundColor: colors.teal[50],
  },
  chipLabel: { fontSize: 13, fontWeight: "600", color: colors.gray[600] },
  chipLabelSelected: { color: colors.teal[600] },

  submitBtn: {
    backgroundColor: colors.green[600],
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnLabel: { fontSize: 15, fontWeight: "700", color: "#fff" },

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
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  paymentIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.green[50],
    alignItems: "center",
    justifyContent: "center",
  },
  paymentInfo: { flex: 1 },
  paymentDate: { fontSize: 14, fontWeight: "700", color: colors.gray[900] },
  paymentNote: { fontSize: 12, color: colors.gray[400], marginTop: 2 },
  paymentAmount: { fontSize: 15, fontWeight: "800", color: colors.green[600] },

  errorText: { fontSize: 14, color: colors.red[500], textAlign: "center" },
  retryBtn: {
    backgroundColor: colors.teal[600],
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryLabel: { color: "#fff", fontWeight: "700" },

  iosPickerWrap: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.teal[50],
    overflow: "hidden",
  },
  iosPickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  iosPickerTitle: { fontSize: 14, fontWeight: "600", color: colors.gray[700] },
  iosPickerDone: { fontSize: 14, fontWeight: "700", color: colors.teal[600] },
});
