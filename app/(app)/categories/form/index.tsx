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
import { PageHeader } from "@/components/ui/PageHeader";

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
    formState: { errors, isSubmitting },
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
      <PageHeader
        title={isEdit ? "Edit category" : "New category"}
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
          <Text style={s.label}>Name *</Text>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={[s.inputRow, errors.name && s.inputRowError]}>
                <View style={s.inputPrefix}>
                  <Feather name="tag" size={15} color={colors.teal[500]} />
                </View>
                <TextInput
                  style={s.textInput}
                  placeholder="e.g. Groceries"
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

        {/* Applicable Type */}
        <View style={s.field}>
          <Text style={s.label}>Applicable type</Text>
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
              <View style={s.inputRow}>
                <View style={s.inputPrefix}>
                  <Feather name="smile" size={15} color={colors.teal[500]} />
                </View>
                <TextInput
                  style={s.textInput}
                  placeholder="e.g. 🛒"
                  placeholderTextColor={colors.gray[400]}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              </View>
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
              <View style={s.inputRow}>
                <View style={s.inputPrefix}>
                  <Feather name="droplet" size={15} color={colors.teal[500]} />
                </View>
                <TextInput
                  style={s.textInput}
                  placeholder="#0D9488"
                  placeholderTextColor={colors.gray[400]}
                  autoCapitalize="none"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
                {value ? (
                  <View style={[s.colorPreview, { backgroundColor: value }]} />
                ) : null}
              </View>
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
              <View style={[s.inputRow, s.textareaRow]}>
                <View style={s.inputPrefixTop}>
                  <Feather
                    name="align-left"
                    size={15}
                    color={colors.teal[500]}
                  />
                </View>
                <TextInput
                  style={[s.textInput, s.textarea]}
                  placeholder="Optional description…"
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
  colorPreview: {
    width: 22,
    height: 22,
    borderRadius: 6,
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  fieldError: { fontSize: 12, color: colors.red[500], marginLeft: 4 },
  chipRow: { flexDirection: "row", gap: 8 },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    backgroundColor: "#fff",
  },
  chipSelected: {
    borderColor: colors.teal[500],
    backgroundColor: colors.teal[50],
  },
  chipLabel: { fontSize: 13, fontWeight: "600", color: colors.gray[500] },
  chipLabelSelected: { color: colors.teal[700] },
});
