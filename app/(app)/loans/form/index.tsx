import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { createLoan } from "@/lib/api/loans.api";
import { getAccountsWithNetWorth } from "@/lib/api/accounts.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { colors } from "@/components/ui/theme";
import { Alert } from "@/components/ui/Alert";
import Feather from "@expo/vector-icons/Feather";
import { PageHeader } from "@/components/ui/PageHeader";

const schema = z.object({
  loanDate: z.string().min(1, "Date required"),
  direction: z.enum(["Gave", "Received"]),
  personName: z.string().min(1, "Person name required"),
  personPhone: z.string().optional(),
  amount: z.string().min(1, "Amount required"),
  accountId: z.number({ required_error: "Account required" }),
  dueDate: z.string().optional(),
  purpose: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function fmt(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function displayFmt(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
function todayISO() {
  return fmt(new Date());
}

type ActiveField = "loanDate" | "dueDate" | null;

export default function LoanFormScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const [activeField, setActiveField] = useState<ActiveField>(null);

  const { data: accountsData } = useQuery({
    queryKey: ["accounts"],
    queryFn: getAccountsWithNetWorth,
  });
  const accounts = accountsData?.accounts ?? [];

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      loanDate: todayISO(),
      direction: "Gave",
      personName: "",
      personPhone: "",
      amount: "",
      dueDate: "",
      purpose: "",
      notes: "",
    },
  });

  const loanDate = watch("loanDate");
  const dueDate = watch("dueDate");

  const saveMut = useMutation({
    mutationFn: (data: FormData) =>
      createLoan({
        loanDate: data.loanDate,
        direction: data.direction,
        personName: data.personName,
        personPhone: data.personPhone || undefined,
        amount: parseFloat(data.amount),
        accountId: data.accountId,
        dueDate: data.dueDate || undefined,
        purpose: data.purpose || undefined,
        notes: data.notes || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loans"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      router.back();
    },
  });

  const closePicker = () => setActiveField(null);

  const handleDateChange = (date?: Date) => {
    if (Platform.OS === "android") setActiveField(null);
    if (date && activeField) {
      setValue(activeField, fmt(date), { shouldValidate: true });
    }
  };

  return (
    <KeyboardAvoidingView
      style={[s.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <PageHeader
        title={"New loan"}
        variant="teal"
        rightTextAction={{
          label: saveMut.isPending ? "Saving…" : "Save",
          onPress: handleSubmit((d) => saveMut.mutate(d)),
          disabled: isSubmitting || saveMut.isPending,
        }}
      />

      <ScrollView
        contentContainerStyle={[
          s.content,
          { paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {saveMut.isError && (
          <Alert
            message={getApiErrorMessage(saveMut.error, "Failed to save")}
            type="error"
          />
        )}

        {/* Direction */}
        <View style={s.field}>
          <Text style={s.label}>Direction *</Text>
          <Controller
            control={control}
            name="direction"
            render={({ field: { onChange, value } }) => (
              <View style={s.dirRow}>
                {(["Gave", "Received"] as const).map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      s.dirBtn,
                      value === d && {
                        backgroundColor:
                          d === "Gave" ? colors.green[500] : colors.red[500],
                        borderColor: "transparent",
                      },
                    ]}
                    onPress={() => onChange(d)}
                  >
                    <Feather
                      name={d === "Gave" ? "arrow-up-right" : "arrow-down-left"}
                      size={16}
                      color={value === d ? "#fff" : colors.gray[500]}
                    />
                    <Text
                      style={[s.dirBtnLabel, value === d && { color: "#fff" }]}
                    >
                      {d === "Gave" ? "I Lent" : "I Borrowed"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          />
        </View>

        {/* Person Name */}
        <View style={s.field}>
          <Text style={s.label}>Person Name *</Text>
          <Controller
            control={control}
            name="personName"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={[s.inputRow, errors.personName && s.inputRowError]}>
                <View style={s.inputPrefix}>
                  <Feather name="user" size={15} color={colors.teal[500]} />
                </View>
                <TextInput
                  style={s.textInput}
                  placeholder="e.g. Rahim"
                  placeholderTextColor={colors.gray[400]}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              </View>
            )}
          />
          {errors.personName && (
            <Text style={s.fieldError}>{errors.personName.message}</Text>
          )}
        </View>

        {/* Phone */}
        <View style={s.field}>
          <Text style={s.label}>Phone</Text>
          <Controller
            control={control}
            name="personPhone"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={s.inputRow}>
                <View style={s.inputPrefix}>
                  <Feather name="phone" size={15} color={colors.teal[500]} />
                </View>
                <TextInput
                  style={s.textInput}
                  placeholder="+8801700000000"
                  placeholderTextColor={colors.gray[400]}
                  keyboardType="phone-pad"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              </View>
            )}
          />
        </View>

        {/* Amount */}
        <View style={s.field}>
          <Text style={s.label}>Amount *</Text>
          <Controller
            control={control}
            name="amount"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={[s.inputRow, errors.amount && s.inputRowError]}>
                <View style={s.inputPrefix}>
                  <Text style={s.currencySymbol}>৳</Text>
                </View>
                <TextInput
                  style={s.textInput}
                  placeholder="0"
                  placeholderTextColor={colors.gray[400]}
                  keyboardType="numeric"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              </View>
            )}
          />
          {errors.amount && (
            <Text style={s.fieldError}>{errors.amount.message}</Text>
          )}
        </View>

        {/* Loan Date */}
        <View style={s.field}>
          <Text style={s.label}>Loan Date *</Text>
          <TouchableOpacity
            style={[s.inputRow, errors.loanDate && s.inputRowError]}
            onPress={() => setActiveField("loanDate")}
            activeOpacity={0.7}
          >
            <View style={s.inputPrefix}>
              <Feather name="calendar" size={15} color={colors.teal[500]} />
            </View>
            <Text
              style={[
                s.textInput,
                s.dateText,
                !loanDate && { color: colors.gray[400] },
              ]}
            >
              {loanDate ? displayFmt(loanDate) : "Select date"}
            </Text>
          </TouchableOpacity>
          {errors.loanDate && (
            <Text style={s.fieldError}>{errors.loanDate.message}</Text>
          )}

          {activeField === "loanDate" && Platform.OS === "android" && (
            <DateTimePicker
              mode="date"
              display="default"
              value={loanDate ? new Date(loanDate) : new Date()}
              maximumDate={new Date()}
              onChange={(_, date) => handleDateChange(date)}
            />
          )}
        </View>

        {activeField === "loanDate" && Platform.OS === "ios" && (
          <View style={s.iosPickerWrap}>
            <View style={s.iosPickerHeader}>
              <Text style={s.iosPickerTitle}>Select date</Text>
              <TouchableOpacity onPress={closePicker}>
                <Text style={s.iosPickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              mode="date"
              display="spinner"
              value={loanDate ? new Date(loanDate) : new Date()}
              maximumDate={new Date()}
              onChange={(_, date) => handleDateChange(date)}
              themeVariant="light"
            />
          </View>
        )}

        {/* Due Date */}
        <View style={s.field}>
          <Text style={s.label}>Due Date</Text>
          <TouchableOpacity
            style={s.inputRow}
            onPress={() => setActiveField("dueDate")}
            activeOpacity={0.7}
          >
            <View style={s.inputPrefix}>
              <Feather name="clock" size={15} color={colors.teal[500]} />
            </View>
            <Text
              style={[
                s.textInput,
                s.dateText,
                !dueDate && { color: colors.gray[400] },
              ]}
            >
              {dueDate ? displayFmt(dueDate) : "Select date"}
            </Text>
          </TouchableOpacity>

          {activeField === "dueDate" && Platform.OS === "android" && (
            <DateTimePicker
              mode="date"
              display="default"
              value={dueDate ? new Date(dueDate) : new Date()}
              onChange={(_, date) => handleDateChange(date)}
            />
          )}
        </View>

        {activeField === "dueDate" && Platform.OS === "ios" && (
          <View style={s.iosPickerWrap}>
            <View style={s.iosPickerHeader}>
              <Text style={s.iosPickerTitle}>Select due date</Text>
              <TouchableOpacity onPress={closePicker}>
                <Text style={s.iosPickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              mode="date"
              display="spinner"
              value={dueDate ? new Date(dueDate) : new Date()}
              onChange={(_, date) => handleDateChange(date)}
              themeVariant="light"
            />
          </View>
        )}

        {/* Account */}
        <View style={s.field}>
          <Text style={s.label}>Account *</Text>
          <Controller
            control={control}
            name="accountId"
            render={({ field: { onChange, value } }) => (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={s.chipRow}>
                  {accounts.map((acc) => (
                    <TouchableOpacity
                      key={acc.id}
                      style={[s.chip, value === acc.id && s.chipSelected]}
                      onPress={() => onChange(acc.id)}
                    >
                      <Text
                        style={[
                          s.chipLabel,
                          value === acc.id && s.chipLabelSelected,
                        ]}
                      >
                        {acc.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
          />
          {errors.accountId && (
            <Text style={s.fieldError}>{errors.accountId.message}</Text>
          )}
        </View>

        {/* Purpose */}
        <View style={s.field}>
          <Text style={s.label}>Purpose</Text>
          <Controller
            control={control}
            name="purpose"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={s.inputRow}>
                <View style={s.inputPrefix}>
                  <Feather name="target" size={15} color={colors.teal[500]} />
                </View>
                <TextInput
                  style={s.textInput}
                  placeholder="e.g. Medical expenses"
                  placeholderTextColor={colors.gray[400]}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              </View>
            )}
          />
        </View>

        {/* Notes */}
        <View style={s.field}>
          <Text style={s.label}>Notes</Text>
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, onBlur, value } }) => (
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
                  placeholder="Optional notes…"
                  placeholderTextColor={colors.gray[400]}
                  multiline
                  numberOfLines={3}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              </View>
            )}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },

  content: { padding: 16, gap: 20 },

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
  inputRowError: { borderColor: colors.red[400] },
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
  fieldError: { fontSize: 12, color: colors.red[500], marginLeft: 4 },

  dirRow: { flexDirection: "row", gap: 10 },
  dirBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    backgroundColor: "#fff",
  },
  dirBtnLabel: { fontSize: 14, fontWeight: "700", color: colors.gray[500] },

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
  chipLabelSelected: { color: colors.teal[700] },

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
