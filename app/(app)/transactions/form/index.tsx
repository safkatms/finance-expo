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

function todayISO() {
  return new Date().toISOString().split("T")[0];
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

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["transaction", id],
    queryFn: () => getTransaction(Number(id)),
    enabled: isEdit,
  });

  const { data: accountsData } = useQuery({
    queryKey: ["accounts"],
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
  }, [existing]);

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
      qc.invalidateQueries({ queryKey: ["accounts"] });
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
          <Feather name="x" size={22} color={colors.gray[700]} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {isEdit ? "Edit Transaction" : "New Transaction"}
        </Text>
        <TouchableOpacity
          onPress={handleSubmit((d) => saveMut.mutate(d))}
          hitSlop={8}
          disabled={saveMut.isPending}
        >
          <Text style={s.saveBtn}>
            {saveMut.isPending ? "Saving…" : "Save"}
          </Text>
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
                              : colors.indigo[500],
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
          <Controller
            control={control}
            name="txnDate"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[s.input, errors.txnDate && s.inputError]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.gray[300]}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.txnDate && (
            <Text style={s.fieldError}>{errors.txnDate.message}</Text>
          )}
        </View>

        {/* Amount */}
        <View style={s.field}>
          <Text style={s.label}>Amount *</Text>
          <Controller
            control={control}
            name="amount"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[s.input, errors.amount && s.inputError]}
                placeholder="0"
                placeholderTextColor={colors.gray[300]}
                keyboardType="numeric"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
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
              <TextInput
                style={s.input}
                placeholder="e.g. Monthly salary"
                placeholderTextColor={colors.gray[300]}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
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
              <TextInput
                style={[s.input, s.textarea]}
                placeholder="Optional note…"
                placeholderTextColor={colors.gray[300]}
                multiline
                numberOfLines={3}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
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
              <TextInput
                style={s.input}
                placeholder="e.g. TXN-001"
                placeholderTextColor={colors.gray[300]}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
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
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: colors.gray[900] },
  saveBtn: { fontSize: 15, fontWeight: "700", color: colors.indigo[600] },
  content: { padding: 16, gap: 20 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: "700", color: colors.gray[700] },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.gray[900],
  },
  inputError: { borderColor: colors.red[500] },
  textarea: { height: 80, textAlignVertical: "top" },
  fieldError: { fontSize: 12, color: colors.red[500], marginLeft: 2 },
  typeRow: { flexDirection: "row", gap: 8 },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
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
    borderColor: colors.indigo[500],
    backgroundColor: colors.indigo[50],
  },
  chipLabel: { fontSize: 13, fontWeight: "600", color: colors.gray[600] },
  chipLabelSelected: { color: colors.indigo[600] },
});
