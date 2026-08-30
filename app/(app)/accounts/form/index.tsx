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
import { PageHeader } from "@/components/ui/PageHeader";

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
  "#0D9488",
  "#0F766E",
  "#0EA5E9",
  "#06B6D4",
  "#10B981",
  "#22C55E",
  "#84CC16",
  "#EAB308",
  "#F59E0B",
  "#F97316",
  "#EF4444",
  "#EC4899",
  "#D946EF",
  "#8B5CF6",
  "#64748B",
  "#334155",
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
      color: "#0D9488",
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
      <PageHeader
        title={isEdit ? "Edit account" : "New account"}
        variant="teal"
        // backIcon="x"
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

        {/* Name */}
        <View style={s.field}>
          <Text style={s.label}>Account name *</Text>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={[s.inputRow, errors.name && s.inputRowError]}>
                <View style={s.inputPrefix}>
                  <Feather
                    name="credit-card"
                    size={15}
                    color={colors.teal[500]}
                  />
                </View>
                <TextInput
                  style={s.textInput}
                  placeholder="e.g. BRAC Bank Savings"
                  placeholderTextColor={colors.gray[400]}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              </View>
            )}
          />
          {errors.name && (
            <Text style={s.fieldError}>{errors.name.message}</Text>
          )}
        </View>

        {/* Account Type */}
        <View style={s.field}>
          <Text style={s.label}>Account type *</Text>
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
          <Text style={s.label}>Account icon</Text>
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
              <View style={s.inputRow}>
                <View style={s.inputPrefix}>
                  <Feather name="home" size={15} color={colors.teal[500]} />
                </View>
                <TextInput
                  style={s.textInput}
                  placeholder="e.g. BRAC Bank"
                  placeholderTextColor={colors.gray[400]}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              </View>
            )}
          />
        </View>

        {/* Opening Balance */}
        <View style={s.field}>
          <Text style={s.label}>Opening balance</Text>
          <Controller
            control={control}
            name="openingBalance"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={s.inputRow}>
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
        </View>

        {/* Currency */}
        <View style={s.field}>
          <Text style={s.label}>Currency</Text>
          <Controller
            control={control}
            name="currency"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={s.inputRow}>
                <View style={s.inputPrefix}>
                  <Feather name="globe" size={15} color={colors.teal[500]} />
                </View>
                <TextInput
                  style={s.textInput}
                  placeholder="BDT"
                  placeholderTextColor={colors.gray[400]}
                  autoCapitalize="characters"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              </View>
            )}
          />
        </View>

        {/* Account Color */}
        <View style={s.field}>
          <Text style={s.label}>Account color</Text>
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
                      <Feather name="check" size={16} color="#fff" />
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
              <View style={[s.inputRow, s.textareaRow]}>
                <View style={s.inputPrefixTop}>
                  <Feather
                    name="file-text"
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

        {/* Include in Net Worth */}
        <View style={s.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.switchLabel}>Include in net worth</Text>
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
                trackColor={{ false: colors.gray[200], true: colors.teal[400] }}
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
    borderColor: colors.teal[500],
    backgroundColor: colors.teal[50],
  },
  chipLabel: { fontSize: 13, fontWeight: "600", color: colors.gray[600] },
  chipLabelSelected: { color: colors.teal[700] },

  iconPicker: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  iconOption: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: colors.teal[100],
  },
  iconOptionSelected: {
    borderColor: colors.teal[500],
    backgroundColor: colors.teal[50],
  },
  iconText: { fontSize: 26 },

  colorPicker: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },

  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1.5,
    borderColor: colors.teal[100],
  },
  switchLabel: { fontSize: 14, fontWeight: "700", color: colors.gray[800] },
  switchSub: { fontSize: 12, color: colors.gray[400], marginTop: 2 },
});
