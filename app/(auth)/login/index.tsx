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
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { login } from "@/lib/auth";
import { getApiErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/store/auth.store";
import { Alert } from "@/components/ui/Alert";
import { colors } from "@/components/ui/theme";
import Feather from "@expo/vector-icons/Feather";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});
type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const router = useRouter();
  const { setAuthenticated, setUser } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError("");
    try {
      const user = await login(data.email, data.password);
      setUser(user);
      setAuthenticated(true);
      if (user.mustChangePassword) {
        router.replace("/(auth)/change-password");
      } else {
        router.replace("/(app)/dashboard");
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Login failed"));
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
        {/* Logo block */}
        <View style={styles.logoBlock}>
          <Image
            source={require("../../../assets/finance.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.logoSub}>Sign in to your account</Text>
        </View>

        {/* Form card */}
        <View style={styles.card}>
          {error ? <Alert message={error} type="error" /> : null}

          <View style={styles.form}>
            {/* Email */}
            <View>
              <Text style={styles.inputLabel}>Email</Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View
                    style={[
                      styles.inputRow,
                      errors.email && styles.inputRowError,
                    ]}
                  >
                    <View style={styles.inputPrefix}>
                      <Feather
                        name="mail"
                        size={16}
                        color={colors.indigo[500]}
                      />
                    </View>
                    <TextInput
                      style={styles.textInput}
                      placeholder="admin@example.com"
                      placeholderTextColor={colors.gray[400]}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                  </View>
                )}
              />
              {errors.email && (
                <Text style={styles.fieldError}>{errors.email.message}</Text>
              )}
            </View>

            {/* Password */}
            <View>
              <Text style={styles.inputLabel}>Password</Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View
                    style={[
                      styles.inputRow,
                      errors.password && styles.inputRowError,
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
                      secureTextEntry={!showPassword}
                      autoComplete="current-password"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                    <TouchableOpacity
                      style={styles.inputSuffix}
                      onPress={() => setShowPassword((v) => !v)}
                      hitSlop={8}
                    >
                      <Feather
                        name={showPassword ? "eye-off" : "eye"}
                        size={16}
                        color={colors.gray[400]}
                      />
                    </TouchableOpacity>
                  </View>
                )}
              />
              {errors.password && (
                <Text style={styles.fieldError}>{errors.password.message}</Text>
              )}
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit(onSubmit)}
              activeOpacity={0.85}
              disabled={isSubmitting}
            >
              <Text style={styles.submitBtnLabel}>
                {isSubmitting ? "Signing in…" : "Sign in"}
              </Text>
            </TouchableOpacity>
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

  // Logo
  logoBlock: { alignItems: "center", gap: 8 },
  logo: { width: 160, height: 60 },
  logoSub: {
    fontSize: 13,
    color: colors.gray[400],
    fontWeight: "500",
  },

  // Card
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

  // Input
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
  inputRowError: {
    borderColor: colors.red[500],
  },
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

  // Submit
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    height: 56,
    paddingHorizontal: 20,
    backgroundColor: colors.indigo[600],
    marginTop: 4,
  },
  submitBtnLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.3,
  },
  submitArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
