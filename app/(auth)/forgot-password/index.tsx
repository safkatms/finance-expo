import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { forgotPassword } from "@/lib/auth";
import { getApiErrorMessage } from "@/lib/api-error";
import { Alert } from "@/components/ui/Alert";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { colors } from "@/components/ui/theme";
import Feather from "@expo/vector-icons/Feather";

const schema = z.object({
  email: z.string().email("Invalid email"),
});
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError("");
    try {
      await forgotPassword(data);
      setSent(true);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to send reset email"));
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
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.gray[700]} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Forgot password?</Text>
          <Text style={styles.subtitle}>
            Enter your email and we'll send a reset link.
          </Text>
        </View>

        <View style={styles.card}>
          {error ? <Alert message={error} type="error" /> : null}
          {sent ? (
            <Alert
              message="Reset link sent! Check your inbox."
              type="success"
            />
          ) : (
            <View style={styles.form}>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Email"
                    placeholder="you@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={errors.email?.message}
                  />
                )}
              />
              <Button loading={isSubmitting} onPress={handleSubmit(onSubmit)}>
                Send reset link
              </Button>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.gray[50] },
  container: { flexGrow: 1, padding: 24, gap: 24, paddingBottom: 40 },
  back: { width: 40, height: 40, justifyContent: "center" },
  header: { gap: 6 },
  title: { fontSize: 24, fontWeight: "800", color: colors.gray[900] },
  subtitle: { fontSize: 14, color: colors.gray[500] },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.gray[100],
    gap: 16,
  },
  form: { gap: 16 },
});
