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
import {
  createTransaction,
  updateTransaction,
  getTransaction,
} from "@/lib/api/transactions.api";
import { getAccounts } from "@/lib/api/accounts.api";
import { getCategories } from "@/lib/api/categories.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { colors } from "@/components/ui/theme";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import type { Account, Category } from "@/types/finance";
import Feather from "@expo/vector-icons/Feather";

const TYPES = ["Income", "Expense", "Transfer"] as const;

const schema = z
  .object({
    txnDate: z.string().min(1, "Date is required"),
    type: z.enum(["Income", "Expense", "Transfer"]),
    amount: z.string().min(1, "Amount is required"),
    categoryId: z.number().optional(),
    fromAccountId: z.number().optional(),
    toAccountId: z.number().optional(),
    description: z.string().optional(),
    note: z.string().optional(),
    referenceNumber: z.string().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.type === "Income" && !d.toAccountId) {
      ctx.addIssue({
        code: "custom",
        path: ["toAccountId"],
        message: "Required for Income",
      });
    }
    if (d.type === "Expense" && !d.fromAccountId) {
      ctx.addIssue({
        code: "custom",
        path: ["fromAccountId"],
        message: "Required for Expense",
      });
    }
    if (d.type === "Transfer") {
      if (!d.fromAccountId)
        ctx.addIssue({
          code: "custom",
          path: ["fromAccountId"],
          message: "Required for Transfer",
        });
      if (!d.toAccountId)
        ctx.addIssue({
          code: "custom",
          path: ["toAccountId"],
          message: "Required for Transfer",
        });
    }
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

function AccountPicker({
  label,
  accounts,
  value,
  onChange,
  error,
}: {
  label: string;
  accounts: Account[];
  value?: number;
  onChange: (id: number) => void;
  error?: string;
}) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={s.chipRow}>
          {accounts.map((acc) => (
            <TouchableOpacity
              key={acc.id}
              style={[s.chip, value === acc.id && s.chipSelected]}
              onPress={() => onChange(acc.id)}
            >
              <Text
                style={[s.chipLabel, value === acc.id && s.chipLabelSelected]}
              >
                {acc.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      {error && <Text style={s.fieldError}>{error}</Text>}
    </View>
  );
}

function CategoryPicker({
  categories,
  value,
  onChange,
  txnType,
}: {
  categories: Category[];
  value?: number;
  onChange: (id: number | undefined) => void;
  txnType: string;
}) {
  const filtered = categories.filter(
    (c) => !c.applicableType || c.applicableType === txnType,
  );
  return (
    <View style={s.field}>
      <Text style={s.label}>Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={s.chipRow}>
          <TouchableOpacity
            style={[s.chip, !value && s.chipSelected]}
            onPress={() => onChange(undefined)}
          >
            <Text style={[s.chipLabel, !value && s.chipLabelSelected]}>
              None
            </Text>
          </TouchableOpacity>
          {filtered.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[s.chip, value === cat.id && s.chipSelected]}
              onPress={() => onChange(cat.id)}
            >
              <Text
                style={[s.chipLabel, value === cat.id && s.chipLabelSelected]}
              >
                {cat.icon ? `${cat.icon} ` : ""}
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

export default function TransactionFormScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { id, type } = useLocalSearchParams<{
    id?: string;
    type?: "Income" | "Expense" | "Transfer";
  }>();
  const isEdit = !!id;
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["transaction", id],
    queryFn: () => getTransaction(Number(id)),
    enabled: isEdit,
  });

  const { data: accountsData } = useQuery({
    queryKey: ["accounts-list"],
    queryFn: getAccounts,
  });
  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const accounts = Array.isArray(accountsData)
    ? accountsData
    : ((accountsData as any)?.accounts ?? []);
  const categories = categoriesData ?? [];

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      txnDate: todayISO(),
      type:
        type === "Income" || type === "Expense" || type === "Transfer"
          ? type
          : "Expense",
      amount: "",
      description: "",
      note: "",
      referenceNumber: "",
    },
  });

  const txnType = watch("type");
  const txnDate = watch("txnDate");

  useEffect(() => {
    if (existing) {
      reset({
        txnDate: existing.txnDate.split("T")[0],
        type: existing.type,
        amount: String(existing.amount),
        categoryId: existing.categoryId ?? undefined,
        fromAccountId: existing.fromAccountId ?? undefined,
        toAccountId: existing.toAccountId ?? undefined,
        description: existing.description ?? "",
        note: existing.note ?? "",
        referenceNumber: existing.referenceNumber ?? "",
      });
    }
  }, [existing, reset]);

  const saveMut = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        txnDate: data.txnDate,
        type: data.type,
        amount: parseFloat(data.amount),
        categoryId: data.categoryId,
        fromAccountId: data.fromAccountId,
        toAccountId: data.toAccountId,
        description: data.description || undefined,
        note: data.note || undefined,
        referenceNumber: data.referenceNumber || undefined,
      };
      return isEdit
        ? updateTransaction(Number(id), payload)
        : createTransaction(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["accounts-list"] });
      router.back();
    },
  });

  if (isEdit && loadingExisting) {
    return (
      <View style={s.center}>
        <Spinner />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[s.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <View style={s.headerIconBtn}>
            <Feather name="x" size={18} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {isEdit ? "Edit transaction" : "New transaction"}
        </Text>
        <TouchableOpacity
          onPress={handleSubmit((d) => saveMut.mutate(d))}
          hitSlop={8}
          disabled={saveMut.isPending}
        >
          <View style={s.saveBtn}>
            <Text style={s.saveBtnLabel}>
              {saveMut.isPending ? "Saving…" : "Save"}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

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

        {/* Type */}
        <View style={s.field}>
          <Text style={s.label}>Type *</Text>
          <Controller
            control={control}
            name="type"
            render={({ field: { onChange, value } }) => (
              <View style={s.typeRow}>
                {TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      s.typeBtn,
                      value === t && {
                        backgroundColor:
                          t === "Income"
                            ? colors.green[500]
                            : t === "Expense"
                              ? colors.red[500]
                              : colors.teal[500],
                        borderColor: "transparent",
                      },
                    ]}
                    onPress={() => {
                      onChange(t);
                      setValue("fromAccountId", undefined);
                      setValue("toAccountId", undefined);
                      setValue("categoryId", undefined);
                    }}
                  >
                    <Text
                      style={[s.typeBtnLabel, value === t && { color: "#fff" }]}
                    >
                      {t}
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
            style={[s.inputRow, errors.txnDate && s.inputRowError]}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <View style={s.inputPrefix}>
              <Feather name="calendar" size={15} color={colors.teal[500]} />
            </View>
            <Text
              style={[
                s.textInput,
                s.dateText,
                !txnDate && { color: colors.gray[400] },
              ]}
            >
              {txnDate ? displayFmt(txnDate) : "Select date"}
            </Text>
          </TouchableOpacity>
          {errors.txnDate && (
            <Text style={s.fieldError}>{errors.txnDate.message}</Text>
          )}

          {showDatePicker && Platform.OS === "android" && (
            <DateTimePicker
              mode="date"
              display="default"
              value={txnDate ? new Date(txnDate) : new Date()}
              maximumDate={new Date()}
              onChange={(_, date) => {
                setShowDatePicker(false);
                if (date)
                  setValue("txnDate", fmt(date), { shouldValidate: true });
              }}
            />
          )}
        </View>

        {/* iOS date picker inline */}
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
              value={txnDate ? new Date(txnDate) : new Date()}
              maximumDate={new Date()}
              onChange={(_, date) => {
                if (date)
                  setValue("txnDate", fmt(date), { shouldValidate: true });
              }}
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
          {errors.amount && (
            <Text style={s.fieldError}>{errors.amount.message}</Text>
          )}
        </View>

        {/* From Account */}
        {(txnType === "Expense" || txnType === "Transfer") && (
          <Controller
            control={control}
            name="fromAccountId"
            render={({ field: { onChange, value } }) => (
              <AccountPicker
                label={txnType === "Transfer" ? "From Account *" : "Account *"}
                accounts={accounts}
                value={value}
                onChange={onChange}
                error={errors.fromAccountId?.message}
              />
            )}
          />
        )}

        {/* To Account */}
        {(txnType === "Income" || txnType === "Transfer") && (
          <Controller
            control={control}
            name="toAccountId"
            render={({ field: { onChange, value } }) => (
              <AccountPicker
                label={txnType === "Transfer" ? "To Account *" : "Account *"}
                accounts={accounts}
                value={value}
                onChange={onChange}
                error={errors.toAccountId?.message}
              />
            )}
          />
        )}

        {/* Category */}
        {txnType !== "Transfer" && (
          <Controller
            control={control}
            name="categoryId"
            render={({ field: { onChange, value } }) => (
              <CategoryPicker
                categories={categories}
                value={value}
                onChange={onChange}
                txnType={txnType}
              />
            )}
          />
        )}

        {/* Description */}
        <View style={s.field}>
          <Text style={s.label}>Description</Text>
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={[s.inputRow, errors.description && s.inputRowError]}>
                <View style={s.inputPrefix}>
                  <Feather name="edit-3" size={15} color={colors.teal[500]} />
                </View>
                <TextInput
                  style={s.textInput}
                  placeholder="e.g. Monthly salary"
                  placeholderTextColor={colors.gray[400]}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              </View>
            )}
          />
        </View>

        {/* Reference */}
        <View style={s.field}>
          <Text style={s.label}>Reference Number</Text>
          <Controller
            control={control}
            name="referenceNumber"
            render={({ field: { onChange, onBlur, value } }) => (
              <View
                style={[s.inputRow, errors.referenceNumber && s.inputRowError]}
              >
                <View style={s.inputPrefix}>
                  <Feather name="hash" size={15} color={colors.teal[500]} />
                </View>
                <TextInput
                  style={s.textInput}
                  placeholder="e.g. TXN-001"
                  placeholderTextColor={colors.gray[400]}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              </View>
            )}
          />
        </View>

        {/* Note */}
        <View style={s.field}>
          <Text style={s.label}>Note</Text>
          <Controller
            control={control}
            name="note"
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
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray[50] },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

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
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  saveBtnLabel: { fontSize: 14, fontWeight: "700", color: "#fff" },

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
