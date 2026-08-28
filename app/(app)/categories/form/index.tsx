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
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getCategories,
  createCategory,
  updateCategory,
} from "@/lib/api/categories.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { colors } from "@/components/ui/theme";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import Feather from "@expo/vector-icons/Feather";

const APPLICABLE_TYPES = [
  { label: "Any", value: "" },
  { label: "Income", value: "Income" },
  { label: "Expense", value: "Expense" },
];

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  applicableType: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function CategoryFormScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const { data: categories, isLoading: loadingCats } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const existing = isEdit
    ? (categories ?? []).find((c) => c.id === Number(id))
    : undefined;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      applicableType: "",
      color: "",
      icon: "",
      description: "",
    },
  });

  useEffect(() => {
    if (existing) {
      reset({
        name: existing.name,
        applicableType: existing.applicableType ?? "",
        color: existing.color ?? "",
        icon: existing.icon ?? "",
        description: existing.description ?? "",
      });
    }
  }, [existing]);

  const saveMut = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        name: data.name,
        applicableType: (data.applicableType || undefined) as any,
        color: data.color || undefined,
        icon: data.icon || undefined,
        description: data.description || undefined,
      };
      return isEdit
        ? updateCategory(Number(id), payload)
        : createCategory(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      router.back();
    },
  });

  if (isEdit && loadingCats) {
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
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Feather name="x" size={22} color={colors.gray[700]} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {isEdit ? "Edit Category" : "New Category"}
        </Text>
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

        {/* Name */}
        <View style={s.field}>
          <Text style={s.label}>Name *</Text>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[s.input, errors.name && s.inputError]}
                placeholder="e.g. Groceries"
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

        {/* Applicable Type */}
        <View style={s.field}>
          <Text style={s.label}>Applicable Type</Text>
          <Controller
            control={control}
            name="applicableType"
            render={({ field: { onChange, value } }) => (
              <View style={s.chipRow}>
                {APPLICABLE_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.value}
                    style={[s.chip, value === t.value && s.chipSelected]}
                    onPress={() => onChange(t.value)}
                  >
                    <Text
                      style={[
                        s.chipLabel,
                        value === t.value && s.chipLabelSelected,
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          />
        </View>

        {/* Icon */}
        <View style={s.field}>
          <Text style={s.label}>Icon (emoji)</Text>
          <Controller
            control={control}
            name="icon"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={s.input}
                placeholder="e.g. 🛒"
                placeholderTextColor={colors.gray[300]}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
        </View>

        {/* Color */}
        <View style={s.field}>
          <Text style={s.label}>Color (hex)</Text>
          <Controller
            control={control}
            name="color"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={s.input}
                placeholder="#E65100"
                placeholderTextColor={colors.gray[300]}
                autoCapitalize="none"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
        </View>

        {/* Description */}
        <View style={s.field}>
          <Text style={s.label}>Description</Text>
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[s.input, s.textarea]}
                placeholder="Optional description…"
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
  chipRow: { flexDirection: "row", gap: 8 },
  chip: {
    paddingHorizontal: 16,
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
