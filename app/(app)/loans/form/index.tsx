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
          <Feather name="x" size={22} color={colors.gray[700]} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Record Loan</Text>
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
                      size={15}
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
              <TextInput
                style={[s.input, errors.personName && s.inputError]}
                placeholder="e.g. Rahim"
                placeholderTextColor={colors.gray[300]}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
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
              <TextInput
                style={s.input}
                placeholder="+8801700000000"
                placeholderTextColor={colors.gray[300]}
                keyboardType="phone-pad"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
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

        {/* Loan Date */}
        <View style={s.field}>
          <Text style={s.label}>Loan Date *</Text>
          <Controller
            control={control}
            name="loanDate"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={s.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.gray[300]}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
        </View>

        {/* Due Date */}
        <View style={s.field}>
          <Text style={s.label}>Due Date</Text>
          <Controller
            control={control}
            name="dueDate"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={s.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.gray[300]}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
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
              <TextInput
                style={s.input}
                placeholder="e.g. Medical expenses"
                placeholderTextColor={colors.gray[300]}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
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
              <TextInput
                style={[s.input, s.textarea]}
                placeholder="Optional notes…"
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
    borderColor: colors.indigo[500],
    backgroundColor: colors.indigo[50],
  },
  chipLabel: { fontSize: 13, fontWeight: "600", color: colors.gray[600] },
  chipLabelSelected: { color: colors.indigo[600] },
});
