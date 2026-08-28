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
import { createLoan } from "@/lib/api/loans.api";
import { getAccountsWithNetWorth } from "@/lib/api/accounts.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { colors } from "@/components/ui/theme";
import { Alert } from "@/components/ui/Alert";
import Feather from "@expo/vector-icons/Feather";

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

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

export default function LoanFormScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: accountsData } = useQuery({
    queryKey: ["accounts"],
    queryFn: getAccountsWithNetWorth,
  });
  const accounts = accountsData?.accounts ?? [];

  const {
    control,
    handleSubmit,
    formState: { errors },
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
        <Text style={s.headerTitle}>Record Loan</Text>
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
          <Controller
            control={control}
            name="loanDate"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={[s.inputRow, errors.loanDate && s.inputRowError]}>
                <View style={s.inputPrefix}>
                  <Feather name="calendar" size={15} color={colors.teal[500]} />
                </View>
                <TextInput
                  style={s.textInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.gray[400]}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              </View>
            )}
          />
          {errors.loanDate && (
            <Text style={s.fieldError}>{errors.loanDate.message}</Text>
          )}
        </View>

        {/* Due Date */}
        <View style={s.field}>
          <Text style={s.label}>Due Date</Text>
          <Controller
            control={control}
            name="dueDate"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={s.inputRow}>
                <View style={s.inputPrefix}>
                  <Feather name="clock" size={15} color={colors.teal[500]} />
                </View>
                <TextInput
                  style={s.textInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.gray[400]}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              </View>
            )}
          />
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
});
