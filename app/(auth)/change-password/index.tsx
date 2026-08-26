import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { changePassword } from "@/lib/auth";
import { getApiErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/store/auth.store";
import { Alert } from "@/components/ui/Alert";
import { colors } from "@/components/ui/theme";
import Feather from "@expo/vector-icons/Feather";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Required"),
    newPassword: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string().min(1, "Required"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { setUser, user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError("");
    try {
      await changePassword(data.currentPassword, data.newPassword);
      if (user) setUser({ ...user, mustChangePassword: false });
      setSuccess(true);
      setTimeout(() => router.replace("/(app)/dashboard"), 1500);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to change password"));
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Feather name="lock" size={28} color={colors.indigo[600]} />
          </View>
          <Text style={styles.title}>Change Password</Text>
          <Text style={styles.subtitle}>
            {user?.mustChangePassword
              ? "You must change your temporary password before continuing."
              : "Update your account password."}
          </Text>
        </View>

        <View style={styles.card}>
          {error ? <Alert message={error} type="error" /> : null}
          {success ? (
            <Alert message="Password changed! Redirecting…" type="success" />
          ) : null}

          <View style={styles.form}>
            {(
              ["currentPassword", "newPassword", "confirmPassword"] as const
            ).map((field) => {
              const labels = {
                currentPassword: "Current Password",
                newPassword: "New Password",
                confirmPassword: "Confirm New Password",
              };
              const shows = {
                currentPassword: showCurrent,
                newPassword: showNew,
                confirmPassword: showConfirm,
              };
              const setShows = {
                currentPassword: setShowCurrent,
                newPassword: setShowNew,
                confirmPassword: setShowConfirm,
              };
              return (
                <View key={field}>
                  <Text style={styles.inputLabel}>{labels[field]}</Text>
                  <Controller
                    control={control}
                    name={field}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View
                        style={[
                          styles.inputRow,
                          errors[field] && styles.inputRowError,
                        ]}
                      >
                        <View style={styles.inputPrefix}>
                          <Feather
                            name="lock"
                            size={16}
                            color={colors.indigo[500]}
                          />
                        </View>
                        <TextInput
                          style={styles.textInput}
                          placeholder="••••••••"
                          placeholderTextColor={colors.gray[400]}
                          secureTextEntry={!shows[field]}
                          onBlur={onBlur}
                          onChangeText={onChange}
                          value={value}
                        />
                        <TouchableOpacity
                          style={styles.inputSuffix}
                          onPress={() => setShows[field]((v) => !v)}
                          hitSlop={8}
                        >
                          <Feather
                            name={shows[field] ? "eye-off" : "eye"}
                            size={16}
                            color={colors.gray[400]}
                          />
                        </TouchableOpacity>
                      </View>
                    )}
                  />
                  {errors[field] && (
                    <Text style={styles.fieldError}>
                      {errors[field]?.message}
                    </Text>
                  )}
                </View>
              );
            })}

            <TouchableOpacity
              style={[
                styles.submitBtn,
                isSubmitting && styles.submitBtnDisabled,
              ]}
              onPress={handleSubmit(onSubmit)}
              activeOpacity={0.85}
              disabled={isSubmitting}
            >
              <Text style={styles.submitBtnLabel}>
                {isSubmitting ? "Saving…" : "Change Password"}
              </Text>
            </TouchableOpacity>

            {!user?.mustChangePassword && (
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelLabel}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.gray[50] },
  container: {
    flexGrow: 1,
    padding: 24,
    gap: 24,
    justifyContent: "center",
    paddingBottom: 40,
  },
  header: { alignItems: "center", gap: 10 },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.indigo[50],
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 22, fontWeight: "800", color: colors.gray[900] },
  subtitle: {
    fontSize: 13,
    color: colors.gray[500],
    textAlign: "center",
    lineHeight: 18,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.gray[100],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  form: { gap: 16 },
  inputLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.gray[900],
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.indigo[200],
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#FAFAFE",
  },
  inputRowError: { borderColor: colors.red[500] },
  inputPrefix: {
    width: 44,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: colors.indigo[100],
  },
  inputSuffix: {
    width: 44,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  textInput: {
    flex: 1,
    height: 52,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.gray[900],
  },
  fieldError: {
    fontSize: 12,
    color: colors.red[500],
    marginTop: 4,
    marginLeft: 4,
  },
  submitBtn: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    height: 56,
    backgroundColor: colors.indigo[600],
    marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.3,
  },
  cancelBtn: { alignItems: "center", paddingVertical: 8 },
  cancelLabel: { fontSize: 14, color: colors.gray[500], fontWeight: "600" },
});
