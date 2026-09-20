import React, { useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  FlatList,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";

import { PageHeader } from "@/components/ui/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { colors } from "@/components/ui/theme";
import { getApiErrorMessage } from "@/lib/api-error";
import { updateProfile } from "@/lib/api/users.api";
import { useAuthStore } from "@/store/auth.store";
import type { User } from "@/types/finance";

const TIMEZONES = [
  { value: "Asia/Dhaka", label: "Asia/Dhaka" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata" },
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "America/New_York" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles" },
  { value: "Europe/London", label: "Europe/London" },
  { value: "Europe/Paris", label: "Europe/Paris" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo" },
  { value: "Asia/Singapore", label: "Asia/Singapore" },
  { value: "Australia/Sydney", label: "Australia/Sydney" },
];

const LOCALES = [
  { value: "en-BD", label: "en-BD (Bangladesh)" },
  { value: "en-US", label: "en-US (United States)" },
  { value: "en-GB", label: "en-GB (United Kingdom)" },
  { value: "bn-BD", label: "bn-BD (Bengali)" },
];

const CURRENCIES = [
  { value: "BDT", label: "BDT — Bangladeshi Taka" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "INR", label: "INR — Indian Rupee" },
  { value: "SGD", label: "SGD — Singapore Dollar" },
  { value: "AUD", label: "AUD — Australian Dollar" },
];

const DATE_FORMATS = [
  { value: "dd/MM/yyyy", label: "dd/MM/yyyy" },
  { value: "MM/dd/yyyy", label: "MM/dd/yyyy" },
  { value: "yyyy-MM-dd", label: "yyyy-MM-dd" },
  { value: "dd-MM-yyyy", label: "dd-MM-yyyy" },
  { value: "d MMM yyyy", label: "d MMM yyyy" },
];

const schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  timezone: z.string().optional(),
  locale: z.string().optional(),
  currency: z.string().optional(),
  dateFormat: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function ChipGroup({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={s.chipRow}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[s.chip, value === opt.value && s.chipSelected]}
          onPress={() => onChange(opt.value)}
        >
          <Text
            style={[s.chipLabel, value === opt.value && s.chipLabelSelected]}
          >
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
function DropdownField({
  options,
  value,
  onChange,
  placeholder = "Select…",
}: {
  options: { value: string; label: string }[];
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <>
      <TouchableOpacity
        style={s.dropdownTrigger}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[s.dropdownValue, !selected && { color: colors.gray[400] }]}
        >
          {selected ? selected.label : placeholder}
        </Text>
        <Feather name="chevron-down" size={16} color={colors.gray[400]} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        />
        <View style={s.modalSheet}>
          <View style={s.modalHandle} />
          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            ItemSeparatorComponent={() => <View style={s.modalSeparator} />}
            renderItem={({ item }) => {
              const isSelected = item.value === value;
              return (
                <TouchableOpacity
                  style={s.modalOption}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      s.modalOptionText,
                      isSelected && s.modalOptionTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {isSelected && (
                    <Feather name="check" size={16} color={colors.teal[600]} />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
    </>
  );
}
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { user, setUser } = useAuthStore();

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      timezone: "Asia/Dhaka",
      locale: "en-BD",
      currency: "BDT",
      dateFormat: "dd/MM/yyyy",
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        phone: user.phone ?? "",
        timezone: user.timezone ?? "Asia/Dhaka",
        locale: user.locale ?? "en-BD",
        currency: user.currency ?? "BDT",
        dateFormat: user.dateFormat ?? "dd/MM/yyyy",
      });
    }
  }, [user, reset]);

  const updateMut = useMutation({
    mutationFn: (data: FormData) =>
      updateProfile({
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || undefined,
        timezone: data.timezone,
        locale: data.locale,
        currency: data.currency,
        dateFormat: data.dateFormat,
      }),
    onSuccess: (updated) => {
      // update auth store so header reflects new name immediately
      setUser(updated as unknown as typeof user);
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      router.back();
    },
    onError: (err) =>
      setError("root", {
        message: getApiErrorMessage(err, "Failed to update profile"),
      }),
  });

  return (
    <KeyboardAvoidingView
      style={[s.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <PageHeader
        title="Edit profile"
        variant="teal"
        rightTextAction={{
          label: updateMut.isPending ? "Saving…" : "Save",
          onPress: handleSubmit((d) => updateMut.mutate(d)),
          disabled: updateMut.isPending,
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
        {updateMut.isError && (
          <Alert
            message={getApiErrorMessage(
              updateMut.error,
              "Failed to update profile",
            )}
            type="error"
          />
        )}

        {/* Email — read only */}
        <View style={s.field}>
          <Text style={s.label}>Email</Text>
          <View style={[s.inputRow, s.inputRowDisabled]}>
            <View style={s.inputPrefix}>
              <Feather name="mail" size={15} color={colors.gray[300]} />
            </View>
            <Text style={s.disabledText}>{user?.email}</Text>
          </View>
          <Text style={s.fieldHint}>Email cannot be changed</Text>
        </View>

        {/* First name */}
        <View style={s.field}>
          <Text style={s.label}>First name *</Text>
          <Controller
            control={control}
            name="firstName"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={[s.inputRow, errors.firstName && s.inputRowError]}>
                <View style={s.inputPrefix}>
                  <Feather name="user" size={15} color={colors.teal[500]} />
                </View>
                <TextInput
                  style={s.textInput}
                  placeholder="John"
                  placeholderTextColor={colors.gray[400]}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              </View>
            )}
          />
          {errors.firstName && (
            <Text style={s.fieldError}>{errors.firstName.message}</Text>
          )}
        </View>

        {/* Last name */}
        <View style={s.field}>
          <Text style={s.label}>Last name *</Text>
          <Controller
            control={control}
            name="lastName"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={[s.inputRow, errors.lastName && s.inputRowError]}>
                <View style={s.inputPrefix}>
                  <Feather name="user" size={15} color={colors.teal[500]} />
                </View>
                <TextInput
                  style={s.textInput}
                  placeholder="Doe"
                  placeholderTextColor={colors.gray[400]}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              </View>
            )}
          />
          {errors.lastName && (
            <Text style={s.fieldError}>{errors.lastName.message}</Text>
          )}
        </View>

        {/* Phone */}
        <View style={s.field}>
          <Text style={s.label}>Phone</Text>
          <Controller
            control={control}
            name="phone"
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

        {/* Timezone */}
        <View style={s.field}>
          <Text style={s.label}>Timezone</Text>
          <Controller
            control={control}
            name="timezone"
            render={({ field: { onChange, value } }) => (
              <DropdownField
                options={TIMEZONES}
                value={value}
                onChange={onChange}
                placeholder="Select timezone…"
              />
            )}
          />
        </View>

        {/* Locale */}
        <View style={s.field}>
          <Text style={s.label}>Locale</Text>
          <Controller
            control={control}
            name="locale"
            render={({ field: { onChange, value } }) => (
              <DropdownField
                options={LOCALES}
                value={value}
                onChange={onChange}
                placeholder="Select locale…"
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
            render={({ field: { onChange, value } }) => (
              <DropdownField
                options={CURRENCIES}
                value={value}
                onChange={onChange}
                placeholder="Select currency…"
              />
            )}
          />
        </View>

        {/* Date format */}
        <View style={s.field}>
          <Text style={s.label}>Date format</Text>
          <Controller
            control={control}
            name="dateFormat"
            render={({ field: { onChange, value } }) => (
              <DropdownField
                options={DATE_FORMATS}
                value={value}
                onChange={onChange}
                placeholder="Select date format…"
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
  inputRowDisabled: {
    borderColor: colors.gray[100],
    backgroundColor: colors.gray[50],
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
  textInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 12,
    fontSize: 15,
    color: colors.gray[900],
  },
  disabledText: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: 15,
    color: colors.gray[400],
  },

  fieldError: { fontSize: 12, color: colors.red[500], marginLeft: 4 },
  fieldHint: { fontSize: 11, color: colors.gray[400], marginLeft: 4 },

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
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: colors.teal[100],
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
  },
  dropdownValue: {
    fontSize: 15,
    color: colors.gray[900],
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "60%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray[200],
    alignSelf: "center",
    marginBottom: 16,
  },
  modalSeparator: {
    height: 1,
    backgroundColor: colors.gray[100],
    marginHorizontal: 4,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  modalOptionText: {
    fontSize: 15,
    color: colors.gray[700],
    fontWeight: "500",
  },
  modalOptionTextSelected: {
    color: colors.teal[700],
    fontWeight: "700",
  },
});
