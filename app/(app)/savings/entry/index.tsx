import React, { useEffect, useState } from "react";
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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import Feather from "@expo/vector-icons/Feather";
import { createSavingsEntry } from "@/lib/api/savings.api";
import { getAccounts } from "@/lib/api/accounts.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { colors } from "@/components/ui/theme";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { PageHeader } from "@/components/ui/PageHeader";

const schema = z.object({
  type: z.enum(["deposit", "withdraw"]),
  entryDate: z.string().min(1, "Date is required"),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, "Enter a valid amount"),
  accountId: z.number({ required_error: "Select an account" }),
  note: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toISO(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function displayFmt(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
function fromISO(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export default function SavingsEntryFormScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ year?: string }>();

  // Entries must fall inside the plan's year; never in the future
  const today = new Date();
  const year = params.year ? Number(params.year) : today.getFullYear();
  const minDate = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  const maxDate = yearEnd < today ? yearEnd : today;
  const defaultDate = toISO(maxDate < minDate ? minDate : maxDate);

  const [showDatePicker, setShowDatePicker] = useState(false);

  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ["accounts-list"],
    queryFn: getAccounts,
  });

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: "deposit", entryDate: defaultDate, amount: "", accountId: undefined, note: "" },
  });

  // Preselect the default account
  useEffect(() => {
    if (!watch("accountId") && accounts.length) {
      const def = accounts.find((a) => a.isDefault) ?? accounts[0];
      setValue("accountId", def.id);
    }
  }, [accounts.length]);

  const type = watch("type");
  const entryDate = watch("entryDate");

  const saveMut = useMutation({
    mutationFn: (d: FormData) =>
      createSavingsEntry({
        entryDate: d.entryDate,
        type: d.type,
        amount: parseFloat(d.amount),
        accountId: d.accountId,
        note: d.note || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["savings"] });
      qc.invalidateQueries({ queryKey: ["savings-entries"] });
      router.back();
    },
  });

  const onDateChange = (date?: Date) => {
    if (date) setValue("entryDate", toISO(date), { shouldValidate: true });
  };

  return (
    <KeyboardAvoidingView
      style={[s.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <PageHeader
        title={type === "deposit" ? "Add to savings" : "Withdraw savings"}
        variant="teal"
        backIcon="x"
        rightTextAction={{
          label: saveMut.isPending ? "Saving…" : "Save",
          onPress: handleSubmit((d) => saveMut.mutate(d)),
          disabled: isSubmitting || saveMut.isPending,
        }}
      />

      {accountsLoading ? (
        <View style={s.center}><Spinner /></View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {saveMut.isError && (
            <Alert message={getApiErrorMessage(saveMut.error, "Failed to save")} type="error" />
          )}

          {/* Type */}
          <View style={s.field}>
            <Text style={s.label}>Type *</Text>
            <Controller
              control={control}
              name="type"
              render={({ field: { onChange, value } }) => (
                <View style={s.typeRow}>
                  {(["deposit", "withdraw"] as const).map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        s.typeBtn,
                        value === t && {
                          backgroundColor: t === "deposit" ? colors.green[500] : colors.red[500],
                          borderColor: "transparent",
                        },
                      ]}
                      onPress={() => onChange(t)}
                    >
                      <Text style={[s.typeBtnLabel, value === t && { color: "#fff" }]}>
                        {t === "deposit" ? "Deposit" : "Withdraw"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            />
          </View>

          {/* Date */}
          <View style={s.field}>
            <Text style={s.label}>Date *</Text>
            <TouchableOpacity
              style={[s.inputRow, errors.entryDate && s.inputRowError]}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <View style={s.inputPrefix}>
                <Feather name="calendar" size={15} color={colors.teal[500]} />
              </View>
              <Text style={[s.textInput, s.dateText]}>{displayFmt(entryDate)}</Text>
            </TouchableOpacity>
            {showDatePicker && Platform.OS === "android" && (
              <DateTimePicker
                mode="date"
                display="default"
                value={fromISO(entryDate)}
                minimumDate={minDate}
                maximumDate={maxDate}
                onChange={(_, date) => {
                  setShowDatePicker(false);
                  onDateChange(date);
                }}
              />
            )}
          </View>
          {showDatePicker && Platform.OS === "ios" && (
            <View style={s.iosPickerWrap}>
              <View style={s.iosPickerHeader}>
                <Text style={s.iosPickerTitle}>Select date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={s.iosPickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                mode="date"
                display="spinner"
                value={fromISO(entryDate)}
                minimumDate={minDate}
                maximumDate={maxDate}
                onChange={(_, date) => onDateChange(date)}
                themeVariant="light"
              />
            </View>
          )}

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
            {errors.amount && <Text style={s.fieldError}>{errors.amount.message}</Text>}
          </View>

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
                        <Text style={[s.chipLabel, value === acc.id && s.chipLabelSelected]}>
                          {acc.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )}
            />
            {errors.accountId && <Text style={s.fieldError}>{errors.accountId.message}</Text>}
            <Text style={s.hint}>
              Tracking only — the account balance won't change.
            </Text>
          </View>

          {/* Note */}
          <View style={s.field}>
            <Text style={s.label}>Note</Text>
            <Controller
              control={control}
              name="note"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={[s.inputRow, s.textareaRow]}>
                  <TextInput
                    style={[s.textInput, s.textarea]}
                    placeholder="Optional note…"
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
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
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
  hint: { fontSize: 12, color: colors.gray[500], marginLeft: 2 },

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
  textInput: { flex: 1, height: 50, paddingHorizontal: 12, fontSize: 15, color: colors.gray[900] },
  dateText: { lineHeight: 50 },
  textareaRow: { alignItems: "flex-start" },
  textarea: { height: 88, paddingTop: 14, textAlignVertical: "top" },
  currencySymbol: { fontSize: 16, fontWeight: "700", color: colors.teal[500] },
  fieldError: { fontSize: 12, color: colors.red[500], marginLeft: 4 },

  typeRow: { flexDirection: "row", gap: 8 },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    backgroundColor: "#fff",
    alignItems: "center",
  },
  typeBtnLabel: { fontSize: 13, fontWeight: "700", color: colors.gray[500] },

  chipRow: { flexDirection: "row", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    backgroundColor: "#fff",
  },
  chipSelected: { borderColor: colors.teal[500], backgroundColor: colors.teal[50] },
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
