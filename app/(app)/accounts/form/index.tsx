import React, { useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  createAccount,
  updateAccount,
  getAccount,
} from "@/lib/api/accounts.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { colors } from "@/components/ui/theme";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import Feather from "@expo/vector-icons/Feather";

const ACCOUNT_TYPES = [
  { value: "bank", label: "Bank" },
  { value: "mobile_banking", label: "Mobile Banking" },
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "investment", label: "Investment" },
  { value: "other", label: "Other" },
];
const ACCOUNT_ICONS = [
  "🏦",
  "💳",
  "💵",
  "💰",
  "🪙",
  "📱",
  "💼",
  "📈",
  "🏠",
  "🚗",
  "✈️",
  "🛒",
  "🎓",
  "🏥",
  "🏢",
  "💎",
  "📊",
  "🔐",
  "🎯",
  "⭐",
];
const ACCOUNT_COLORS = [
  "#4F46E5", // Indigo
  "#2563EB", // Blue
  "#0EA5E9", // Sky
  "#06B6D4", // Cyan
  "#10B981", // Emerald
  "#22C55E", // Green
  "#84CC16", // Lime
  "#EAB308", // Yellow
  "#F59E0B", // Amber
  "#F97316", // Orange
  "#EF4444", // Red
  "#EC4899", // Pink
  "#D946EF", // Fuchsia
  "#8B5CF6", // Violet
  "#64748B", // Slate
  "#334155", // Dark Slate
];
const schema = z.object({
  name: z.string().min(1, "Name is required"),
  accountType: z.string().min(1, "Type is required"),
  institution: z.string().optional(),
  openingBalance: z.string().optional(),
  currency: z.string().default("BDT"),
  color: z.string().optional(),
  icon: z.string().optional(),
  notes: z.string().optional(),
  includeInNetWorth: z.boolean().default(true),
});

type FormData = z.infer<typeof schema>;

export default function AccountFormScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["account", id],
    queryFn: () => getAccount(Number(id)),
    enabled: isEdit,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      accountType: "bank",
      institution: "",
      openingBalance: "0",
      currency: "BDT",
      color: "#4F46E5",
      icon: "🏦",
      notes: "",
      includeInNetWorth: true,
    },
  });

  useEffect(() => {
    if (existing) {
      reset({
        name: existing.name,
        accountType: existing.accountType,
        institution: existing.institution ?? "",
        openingBalance: String(existing.openingBalance ?? 0),
        currency: existing.currency,
        color: existing.color ?? "",
        icon: existing.icon ?? "🏦",
        notes: existing.notes ?? "",
        includeInNetWorth: existing.includeInNetWorth,
      });
    }
  }, [existing, reset]);

  const saveMut = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        name: data.name,
        accountType: data.accountType,
        institution: data.institution || undefined,
        openingBalance: data.openingBalance
          ? parseFloat(data.openingBalance)
          : 0,
        color: data.color || undefined,
        notes: data.notes || undefined,
        includeInNetWorth: data.includeInNetWorth,
        icon: data.icon || undefined,
      };
      return isEdit
        ? updateAccount(Number(id), payload)
        : createAccount(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      router.back();
    },
    onError: (err) => {
      setError("root", { message: getApiErrorMessage(err, "Failed to save") });
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
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Feather name="x" size={22} color={colors.gray[700]} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {isEdit ? "Edit Account" : "New Account"}
        </Text>
        <TouchableOpacity
          onPress={handleSubmit((d) => saveMut.mutate(d))}
          hitSlop={8}
          disabled={isSubmitting || saveMut.isPending}
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

        {/* Name */}
        <View style={s.field}>
          <Text style={s.label}>Account Name *</Text>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[s.input, errors.name && s.inputError]}
                placeholder="e.g. BRAC Bank Savings"
                placeholderTextColor={colors.gray[300]}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.name && (
            <Text style={s.fieldError}>{errors.name.message}</Text>
          )}
        </View>

        {/* Account Type */}
        <View style={s.field}>
          <Text style={s.label}>Account Type *</Text>
          <Controller
            control={control}
            name="accountType"
            render={({ field: { onChange, value } }) => (
              <View style={s.chipRow}>
                {ACCOUNT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[s.chip, value === type.value && s.chipSelected]}
                    onPress={() => onChange(type.value)}
                  >
                    <Text
                      style={[
                        s.chipLabel,
                        value === type.value && s.chipLabelSelected,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          />
        </View>
        {/* Account Icon */}
        <View style={s.field}>
          <Text style={s.label}>Account Icon</Text>

          <Controller
            control={control}
            name="icon"
            render={({ field: { onChange, value } }) => (
              <View style={s.iconPicker}>
                {ACCOUNT_ICONS.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    onPress={() => onChange(icon)}
                    style={[
                      s.iconOption,
                      value === icon && s.iconOptionSelected,
                    ]}
                  >
                    <Text style={s.iconText}>{icon}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          />
        </View>
        {/* Institution */}
        <View style={s.field}>
          <Text style={s.label}>Institution</Text>
          <Controller
            control={control}
            name="institution"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={s.input}
                placeholder="e.g. BRAC Bank"
                placeholderTextColor={colors.gray[300]}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
        </View>

        {/* Opening Balance */}
        <View style={s.field}>
          <Text style={s.label}>Opening Balance</Text>
          <Controller
            control={control}
            name="openingBalance"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={s.input}
                placeholder="0"
                placeholderTextColor={colors.gray[300]}
                keyboardType="numeric"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
        </View>

        {/* Currency */}
        <View style={s.field}>
          <Text style={s.label}>Currency</Text>
          <Controller
            control={control}
            name="currency"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={s.input}
                placeholder="BDT"
                placeholderTextColor={colors.gray[300]}
                autoCapitalize="characters"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
        </View>

        {/* Account Color */}
        <View style={s.field}>
          <Text style={s.label}>Account Color</Text>

          <Controller
            control={control}
            name="color"
            render={({ field: { onChange, value } }) => (
              <View style={s.colorPicker}>
                {ACCOUNT_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    onPress={() => onChange(color)}
                    style={[
                      s.colorOption,
                      { backgroundColor: color },
                      value === color && s.colorOptionSelected,
                    ]}
                  >
                    {value === color && (
                      <Feather name="check" size={18} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
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

        {/* Include in Net Worth */}
        <View style={s.switchRow}>
          <View>
            <Text style={s.label}>Include in Net Worth</Text>
            <Text style={s.switchSub}>
              Counts this account toward your net worth total
            </Text>
          </View>
          <Controller
            control={control}
            name="includeInNetWorth"
            render={({ field: { onChange, value } }) => (
              <Switch
                value={value}
                onValueChange={onChange}
                trackColor={{
                  false: colors.gray[200],
                  true: colors.indigo[500],
                }}
                thumbColor="#fff"
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

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
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

  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  switchSub: { fontSize: 12, color: colors.gray[400], marginTop: 2 },
  iconPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  iconOption: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: colors.gray[200],
  },

  iconOptionSelected: {
    borderColor: colors.indigo[500],
    backgroundColor: colors.indigo[50],
  },

  iconText: {
    fontSize: 26,
  },
  colorPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  colorOption: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  colorOptionSelected: {
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
});
