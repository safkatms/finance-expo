import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { changePassword } from "@/lib/api/auth.api";
import { colors } from "@/components/ui/theme";
import { getApiErrorMessage } from "@/lib/api-error";
import { Alert } from "@/components/ui/Alert";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Must contain uppercase")
      .regex(/[a-z]/, "Must contain lowercase")
      .regex(/\d/, "Must contain a number")
      .regex(/[@$!%*?&^#]/, "Must contain a special character"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setApiError(null);
    try {
      await changePassword(data.currentPassword, data.newPassword);
      setSuccess(true);
      reset();
    } catch (err) {
      setApiError(getApiErrorMessage(err, "Failed to change password"));
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Feather name="arrow-left" size={22} color={colors.gray[900]} />
        </TouchableOpacity>
        <Text style={styles.title}>Change password</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {success && (
          <Alert message="Password changed successfully" type="success" />
        )}

        {apiError && <Alert message={apiError} type="error" />}

        <View style={styles.card}>
          {/* Current Password */}
          <View style={styles.field}>
            <Text style={styles.label}>Current password</Text>
            <Controller
              control={control}
              name="currentPassword"
              render={({ field: { onChange, value } }) => (
                <View
                  style={[
                    styles.inputWrap,
                    errors.currentPassword && styles.inputError,
                  ]}
                >
                  <Feather
                    name="lock"
                    size={16}
                    color={colors.gray[400]}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    placeholder="Enter current password"
                    placeholderTextColor={colors.gray[400]}
                    secureTextEntry={!showCurrent}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowCurrent((p) => !p)}
                    hitSlop={8}
                  >
                    <Feather
                      name={showCurrent ? "eye-off" : "eye"}
                      size={16}
                      color={colors.gray[400]}
                    />
                  </TouchableOpacity>
                </View>
              )}
            />
            {errors.currentPassword && (
              <Text style={styles.fieldError}>
                {errors.currentPassword.message}
              </Text>
            )}
          </View>

          <View style={styles.divider} />

          {/* New Password */}
          <View style={styles.field}>
            <Text style={styles.label}>New password</Text>
            <Controller
              control={control}
              name="newPassword"
              render={({ field: { onChange, value } }) => (
                <View
                  style={[
                    styles.inputWrap,
                    errors.newPassword && styles.inputError,
                  ]}
                >
                  <Feather
                    name="key"
                    size={16}
                    color={colors.gray[400]}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    placeholder="Enter new password"
                    placeholderTextColor={colors.gray[400]}
                    secureTextEntry={!showNew}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowNew((p) => !p)}
                    hitSlop={8}
                  >
                    <Feather
                      name={showNew ? "eye-off" : "eye"}
                      size={16}
                      color={colors.gray[400]}
                    />
                  </TouchableOpacity>
                </View>
              )}
            />
            {errors.newPassword && (
              <Text style={styles.fieldError}>
                {errors.newPassword.message}
              </Text>
            )}
          </View>

          <View style={styles.divider} />

          {/* Confirm Password */}
          <View style={styles.field}>
            <Text style={styles.label}>Confirm new password</Text>
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, value } }) => (
                <View
                  style={[
                    styles.inputWrap,
                    errors.confirmPassword && styles.inputError,
                  ]}
                >
                  <Feather
                    name="check"
                    size={16}
                    color={colors.gray[400]}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    placeholder="Repeat new password"
                    placeholderTextColor={colors.gray[400]}
                    secureTextEntry={!showConfirm}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirm((p) => !p)}
                    hitSlop={8}
                  >
                    <Feather
                      name={showConfirm ? "eye-off" : "eye"}
                      size={16}
                      color={colors.gray[400]}
                    />
                  </TouchableOpacity>
                </View>
              )}
            />
            {errors.confirmPassword && (
              <Text style={styles.fieldError}>
                {errors.confirmPassword.message}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.hintCard}>
          <Text style={styles.hintTitle}>Password requirements</Text>
          {[
            "At least 8 characters",
            "One uppercase letter",
            "One lowercase letter",
            "One number",
            "One special character (@$!%*?&^#)",
          ].map((hint) => (
            <View key={hint} style={styles.hintRow}>
              <View style={styles.hintDot} />
              <Text style={styles.hintText}>{hint}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Feather name="shield" size={16} color="#fff" />
              <Text style={styles.submitLabel}>Update password</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
  title: { fontSize: 17, fontWeight: "800", color: colors.gray[900] },
  content: { padding: 16, gap: 14 },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.teal[50],
    borderRadius: 12,
    padding: 13,
    borderWidth: 1,
    borderColor: colors.teal[100],
  },
  successIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  successText: { fontSize: 13, fontWeight: "700", color: colors.teal[700] },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.red[50],
    borderRadius: 12,
    padding: 13,
    borderWidth: 1,
    borderColor: colors.red[100],
  },
  errorIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: { fontSize: 13, fontWeight: "700", color: colors.red[600] },
  card: {
    backgroundColor: "#fff",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.gray[100],
    overflow: "hidden",
  },
  field: { padding: 14, gap: 8 },
  divider: { height: 1, backgroundColor: colors.gray[100] },
  label: { fontSize: 12, fontWeight: "700", color: colors.gray[600] },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.gray[50],
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.gray[200],
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 10,
  },
  inputError: { borderColor: colors.red[400] },
  inputIcon: { width: 16 },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.gray[900],
    paddingVertical: 0,
  },
  fieldError: { fontSize: 11, color: colors.red[500], fontWeight: "600" },
  hintCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.gray[100],
    padding: 14,
    gap: 8,
  },
  hintTitle: { fontSize: 12, fontWeight: "800", color: colors.gray[700] },
  hintRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  hintDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.teal[400],
  },
  hintText: { fontSize: 12, color: colors.gray[500], fontWeight: "500" },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.teal[600],
    borderRadius: 14,
    paddingVertical: 15,
  },
  submitDisabled: { opacity: 0.6 },
  submitLabel: { fontSize: 15, fontWeight: "800", color: "#fff" },
});
