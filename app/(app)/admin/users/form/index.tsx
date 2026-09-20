// (app)/admin/users/form.tsx
import React, { useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";

import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { colors } from "@/components/ui/theme";
import { getApiErrorMessage } from "@/lib/api-error";
import { createUser, updateUser, getUserById } from "@/lib/api/users.api";

const ROLES = [
  { value: "user", label: "User" },
  { value: "admin", label: "Admin" },
];

const schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
  role: z.enum(["user", "admin"]).default("user"),
});

type FormData = z.infer<typeof schema>;

export default function UserFormScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const [otpModal, setOtpModal] = React.useState<{
    visible: boolean;
    password: string;
    name: string;
  }>({ visible: false, password: "", name: "" });

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["admin", "user", id],
    queryFn: () => getUserById(Number(id)),
    enabled: isEdit,
  });

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
      email: "",
      phone: "",
      role: "user",
    },
  });

  useEffect(() => {
    if (existing) {
      reset({
        firstName: existing.firstName,
        lastName: existing.lastName,
        email: existing.email,
        phone: existing.phone ?? "",
        role: (existing.role as "user" | "admin") ?? "user",
      });
    }
  }, [existing, reset]);

  const createMut = useMutation({
    mutationFn: (data: FormData) =>
      createUser({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || undefined,
        role: data.role,
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      setOtpModal({
        visible: true,
        password: res.temporaryPassword,
        name: `${res.user.firstName} ${res.user.lastName}`,
      });
    },
    onError: (err) =>
      setError("root", {
        message: getApiErrorMessage(err, "Failed to create user"),
      }),
  });

  const updateMut = useMutation({
    mutationFn: (data: FormData) =>
      updateUser(Number(id), {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || undefined,
        role: data.role,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      router.back();
    },
    onError: (err) =>
      setError("root", {
        message: getApiErrorMessage(err, "Failed to update user"),
      }),
  });

  const isPending = createMut.isPending || updateMut.isPending;

  const onSubmit = (data: FormData) => {
    if (isEdit) updateMut.mutate(data);
    else createMut.mutate(data);
  };

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
      <PageHeader
        title={isEdit ? "Edit user" : "New user"}
        variant="teal"
        rightTextAction={{
          label: isPending ? "Saving…" : "Save",
          onPress: handleSubmit(onSubmit),
          disabled: isPending,
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
        {(createMut.isError || updateMut.isError) && (
          <Alert
            message={getApiErrorMessage(
              createMut.error ?? updateMut.error,
              "Failed to save",
            )}
            type="error"
          />
        )}

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

        {/* Email */}
        <View style={s.field}>
          <Text style={s.label}>Email *</Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={[s.inputRow, errors.email && s.inputRowError]}>
                <View style={s.inputPrefix}>
                  <Feather name="mail" size={15} color={colors.teal[500]} />
                </View>
                <TextInput
                  style={s.textInput}
                  placeholder="john@example.com"
                  placeholderTextColor={colors.gray[400]}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  editable={!isEdit}
                />
              </View>
            )}
          />
          {errors.email && (
            <Text style={s.fieldError}>{errors.email.message}</Text>
          )}
          {isEdit && (
            <Text style={s.fieldHint}>
              Email cannot be changed after creation
            </Text>
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

        {/* Role */}
        <View style={s.field}>
          <Text style={s.label}>Role *</Text>
          <Controller
            control={control}
            name="role"
            render={({ field: { onChange, value } }) => (
              <View style={s.chipRow}>
                {ROLES.map((r) => (
                  <TouchableOpacity
                    key={r.value}
                    style={[s.chip, value === r.value && s.chipSelected]}
                    onPress={() => onChange(r.value)}
                  >
                    <Feather
                      name={r.value === "admin" ? "shield" : "user"}
                      size={13}
                      color={
                        value === r.value ? colors.teal[700] : colors.gray[500]
                      }
                    />
                    <Text
                      style={[
                        s.chipLabel,
                        value === r.value && s.chipLabelSelected,
                      ]}
                    >
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          />
        </View>

        {!isEdit && (
          <View style={s.infoBox}>
            <Feather name="info" size={14} color={colors.teal[600]} />
            <Text style={s.infoText}>
              A secure one-time password will be generated and shown after
              saving. Share it with the user securely.
            </Text>
          </View>
        )}
      </ScrollView>

      <OtpRevealModal
        visible={otpModal.visible}
        password={otpModal.password}
        userName={otpModal.name}
        onClose={() => {
          setOtpModal((s) => ({ ...s, visible: false }));
          router.back();
        }}
      />
    </KeyboardAvoidingView>
  );
}

// local alias — TouchableOpacity isn't imported at top level in this template
import { TouchableOpacity } from "react-native";
import { OtpRevealModal } from "@/components/ui/OtpRevealModal";

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
  textInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 12,
    fontSize: 15,
    color: colors.gray[900],
  },

  fieldError: { fontSize: 12, color: colors.red[500], marginLeft: 4 },
  fieldHint: { fontSize: 11, color: colors.gray[400], marginLeft: 4 },

  chipRow: { flexDirection: "row", gap: 10 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    backgroundColor: "#fff",
  },
  chipSelected: {
    borderColor: colors.teal[500],
    backgroundColor: colors.teal[50],
  },
  chipLabel: { fontSize: 14, fontWeight: "600", color: colors.gray[600] },
  chipLabelSelected: { color: colors.teal[700] },

  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: colors.teal[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.teal[100],
    padding: 14,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.teal[700],
    lineHeight: 19,
  },
});
